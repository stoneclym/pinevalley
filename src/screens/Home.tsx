import { useEffect, useRef, useState } from "react";
import type { ScreenName } from "../App";
import type { HubConfig, SceneConfig } from "../config";
import { COPY } from "../copy";
import { useCalendar } from "../ha/calendar";
import { runScene } from "../ha/scenes";
import { useTodo } from "../ha/todo";
import { useWeather } from "../ha/weather";
import { todayView } from "../lib/events";
import { formatClock, formatShortDate, formatTime } from "../lib/time";
import { useNow } from "../lib/useNow";
import { Alert, Cart, Check, ChevronRight, SceneIcon, WeatherIcon } from "../ui/icons";
import { Screen } from "./Screen";
import "./Home.css";

const MAX_TIMED = 4;
const MAX_ALL_DAY = 2;

type TileState = "idle" | "running" | "done" | "error";

function SceneTile({ scene }: { scene: SceneConfig }) {
  const [state, setState] = useState<TileState>("idle");
  const timer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const press = async () => {
    if (state === "running") return;
    clearTimeout(timer.current);
    setState("running");
    try {
      await runScene(scene.entity_id);
      setState("done");
    } catch (err) {
      console.error(`Scene ${scene.entity_id} failed`, err);
      setState("error");
    }
    timer.current = window.setTimeout(() => setState("idle"), 1500);
  };

  return (
    <button type="button" className={`glass tile tile-${state}`} onClick={press}
      aria-label={state === "error" ? `${scene.label} didn't run` : scene.label}>
      <span className="tile-icon">
        {state === "done" ? <Check size={32} strokeWidth={2} /> : state === "error" ? <Alert size={32} /> : <SceneIcon name={scene.icon} size={32} />}
      </span>
      <span className="tile-label">{state === "error" ? "Didn't run" : scene.label}</span>
    </button>
  );
}

function GroceriesTile({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button type="button" className="glass tile" onClick={onOpen}
      aria-label={count ? `Grocery list, ${count} ${count === 1 ? "item" : "items"}` : "Grocery list"}>
      <span className="tile-top">
        <span className="tile-icon"><Cart size={32} /></span>
        {count > 0 && <span className="white-glass tile-badge">{count}</span>}
      </span>
      <span className="tile-label">Groceries</span>
    </button>
  );
}

function TodayPanel({ config, now, onOpen }: { config: HubConfig; now: Date; onOpen: () => void }) {
  const { events, loaded } = useCalendar(config.calendars);
  const view = todayView(events, now);
  const allDay = view.allDay.slice(0, MAX_ALL_DAY);
  const timed = view.timed.slice(0, MAX_TIMED);
  const more = view.allDay.length - allDay.length + view.timed.length - timed.length;
  const empty = loaded && !view.allDay.length && !view.timed.length;

  return (
    <button type="button" className="today" onClick={onOpen} aria-label="Today, open calendar">
      <span className="today-head">
        <span className="today-title">Today</span>
        <span className="today-link">Calendar<ChevronRight size={18} /></span>
      </span>

      {allDay.map((e) => (
        <span key={e.id} className="today-allday">
          <span className="caps-sm">All day</span>
          <span className="today-allday-title">{e.title}</span>
        </span>
      ))}

      {timed.length > 0 && (
        <span className="timeline">
          {timed.map((e) => {
            const isNext = e === view.next;
            return (
              <span key={e.id} className={`tl-event ${isNext ? "tl-next" : ""}`}>
                <span className={isNext ? "tl-dot-filled" : "tl-dot"} />
                <span className="tl-time">
                  {formatTime(e.start)}
                  {isNext && <span className="caps-sm tl-next-label">Next</span>}
                </span>
                <span className="tl-title">{e.title}</span>
                {e.location && <span className="tl-location">{e.location}</span>}
              </span>
            );
          })}
        </span>
      )}

      {more > 0 && <span className="today-more">+{more} more</span>}
      {empty && COPY.nothingToday && <span className="quiet today-empty">{COPY.nothingToday}</span>}
    </button>
  );
}

export function Home({ config, go }: { config: HubConfig; go: (s: ScreenName) => void }) {
  const now = useNow();
  const weather = useWeather(config.weather);
  const { items } = useTodo(config.groceryList);
  const unchecked = items.filter((i) => i.status !== "completed").length;

  return (
    <Screen className="home">
      <div className="home-row">
        <div className="home-left">
          <div className="home-dateline">
            <span>{formatShortDate(now)}</span>
            {weather && weather.temperature !== null && (
              <span className="home-weather">
                <span className="home-weather-icon"><WeatherIcon condition={weather.condition} /></span>
                <span>{weather.temperature}°</span>
              </span>
            )}
          </div>
          <div className="home-clock">{formatClock(now)}</div>
          <div className="tiles">
            {config.scenes.map((s) => <SceneTile key={s.id} scene={s} />)}
            <GroceriesTile count={unchecked} onOpen={() => go("groceries")} />
          </div>
        </div>
        <TodayPanel config={config} now={now} onOpen={() => go("calendar")} />
      </div>
    </Screen>
  );
}
