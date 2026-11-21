import { useEffect, useRef, useState } from "react";
import type { ScreenName } from "../App";
import type { HubConfig, SceneConfig } from "../config";
import { COPY } from "../copy";
import { useCalendar } from "../ha/calendar";
import { startScene } from "../ha/scenes";
import { useTodo } from "../ha/todo";
import { useWeather } from "../ha/weather";
import { todayView } from "../lib/events";
import { formatClock, formatShortDate, formatTime } from "../lib/time";
import { useNow } from "../lib/useNow";
import { useEntities } from "../ha/entities";
import { GarageTile } from "../ui/GarageTile";
import { type CelebrationKind, celebrate } from "../ui/Celebration";
import { Cart, Check, ChevronRight, SceneIcon, SunriseRising, WeatherIcon } from "../ui/icons";
import { Screen } from "./Screen";
import "./Home.css";

const MAX_TIMED = 4;
const MAX_ALL_DAY = 2;

type TileState = "idle" | "starting" | "running" | "done" | "error";

/** The signature moment for a scene, from its icon: sunrise is Morning, moon is Good Night. */
function sceneKind(scene: SceneConfig): { kind: CelebrationKind | null; greeting: string } {
  if (scene.icon === "sunrise") return { kind: "morning", greeting: "Good morning" };
  if (scene.icon === "moon") return { kind: "night", greeting: "Good night" };
  return { kind: null, greeting: "Done" };
}

/**
 * Scene tile. A tap runs the script; once Home Assistant accepts it, the signature moment
 * plays (sunrise glow, or dusk and stars), the tile pulses gently while the script runs, and
 * only when Home Assistant reports it finished does it say "Good morning" with a check.
 * A failure shows "Couldn't finish" with a small nod, without the celebration.
 */
function SceneTile({ scene }: { scene: SceneConfig }) {
  const states = useEntities();
  // Not in Home Assistant yet: a quiet, inactive tile instead of an error on tap.
  const missing = states !== null && !states[scene.entity_id];
  const [state, setState] = useState<TileState>("idle");
  const ref = useRef<HTMLButtonElement>(null);
  const timer = useRef<number>(undefined);
  const { kind, greeting } = sceneKind(scene);
  useEffect(() => () => clearTimeout(timer.current), []);

  const settle = (s: TileState, ms: number) => {
    setState(s);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), ms);
  };

  const press = async () => {
    if (missing || state === "starting" || state === "running") return;
    clearTimeout(timer.current);
    setState("starting");
    try {
      const run = await startScene(scene.entity_id);
      setState("running");
      if (kind && ref.current) {
        const r = ref.current.getBoundingClientRect();
        celebrate(kind, r.left + r.width / 2, r.top + r.height / 2);
      }
      await run.finished;
      settle("done", 2600);
    } catch (err) {
      console.error(`Scene ${scene.entity_id} failed`, err);
      settle("error", 2600);
    }
  };

  const busy = state === "starting" || state === "running";
  const label = missing ? scene.label : state === "done" ? greeting : state === "error" ? "Couldn\u2019t finish" : scene.label;
  const icon =
    state === "done" ? <Check size={32} strokeWidth={2} /> :
    kind === "morning" ? <SunriseRising size={32} /> :
    <SceneIcon name={scene.icon} size={32} />;

  return (
    <button ref={ref} type="button" onClick={press} disabled={missing || busy}
      className={`glass tile scene-tile scene-${kind ?? "other"} tile-${state} ${missing ? "tile-missing" : ""}`}
      aria-label={missing ? `${scene.label}, not set up` : busy ? `${scene.label}, running` : label}>
      <span className="tile-icon">{icon}</span>
      <span className="tile-text">
        <span className="tile-label">{label}</span>
        {missing && <span className="tile-state">Not set up</span>}
      </span>
    </button>
  );
}

/** `morph` names the element for the view transition into (or back from) its screen. */
const morphStyle = (on?: boolean) => (on ? { viewTransitionName: "hero" } : undefined);

function GroceriesTile({ count, onOpen, morph }: { count: number; onOpen: () => void; morph?: boolean }) {
  return (
    <button type="button" className="glass tile" onClick={onOpen} style={morphStyle(morph)}
      aria-label={count ? `Grocery list, ${count} ${count === 1 ? "item" : "items"}` : "Grocery list"}>
      <span className="tile-top">
        <span className="tile-icon"><Cart size={32} /></span>
        {count > 0 && <span className="white-glass tile-badge">{count}</span>}
      </span>
      <span className="tile-label">Groceries</span>
    </button>
  );
}

function TodayPanel({ config, now, onOpen, morph }: { config: HubConfig; now: Date; onOpen: () => void; morph?: boolean }) {
  const { events, loaded } = useCalendar(config.calendars);
  const view = todayView(events, now);
  const allDay = view.allDay.slice(0, MAX_ALL_DAY);
  const timed = view.timed.slice(0, MAX_TIMED);
  const more = view.allDay.length - allDay.length + view.timed.length - timed.length;
  const empty = loaded && !view.allDay.length && !view.timed.length;

  return (
    <button type="button" className="today" onClick={onOpen} aria-label="Today, open calendar" style={morphStyle(morph)}>
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

export function Home({ config, go, hero }: { config: HubConfig; go: (s: ScreenName) => void; hero?: string | null }) {
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
            {config.statusTiles.map((t) => <GarageTile key={t.id} tile={t} />)}
            <GroceriesTile count={unchecked} onOpen={() => go("groceries")} morph={hero === "groceries"} />
          </div>
        </div>
        <TodayPanel config={config} now={now} onOpen={() => go("calendar")} morph={hero === "calendar"} />
      </div>
    </Screen>
  );
}
