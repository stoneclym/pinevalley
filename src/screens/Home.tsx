import type { ScreenName } from "../App";
import type { HubConfig, SceneConfig } from "../config";
import { COPY } from "../copy";
import { useCalendar } from "../ha/calendar";
import { useSceneRun } from "../ha/useSceneRun";
import { useMultiTap } from "../lib/useMultiTap";
import { useTodo } from "../ha/todo";
import { useWeather } from "../ha/weather";
import { todayView } from "../lib/events";
import { formatClock, formatShortDate, formatTime } from "../lib/time";
import { useNow } from "../lib/useNow";
import { GarageTile } from "../ui/GarageTile";
import { showBanner } from "../ui/Banner";
import { PersonDots, personInfo, TimelineDot } from "../ui/PersonMarks";
import { MOCK } from "../ha/connection";
import { type PickupKind, reminderFor, todayInNewYork } from "../lib/pickup";
import { Cart, ChevronRight, Moon, Recycle, SceneIcon, SunriseRising, Trash, WeatherIcon } from "../ui/icons";
import { Screen } from "./Screen";
import "./Home.css";

const MAX_TIMED = 4;
const MAX_ALL_DAY = 2;


/** Each scene's moment, from its icon: sunrise is Morning, moon is Good Night. */
function sceneKind(scene: SceneConfig): { kind: "morning" | "night" | null; greeting: string } {
  if (scene.icon === "sunrise") return { kind: "morning", greeting: "Good Morning!" };
  if (scene.icon === "moon") return { kind: "night", greeting: "Good Night!" };
  return { kind: null, greeting: `${scene.label} done` };
}

/**
 * Scene tile. Everything stays inside the tile: while the script runs, Morning's sun rises
 * and turns gold, Good Night's moon turns purple, and the icon breathes gently. When Home
 * Assistant reports the script finished, the icon returns to normal and a glass banner drops
 * from the top ("Good Morning!"). A failure shows "Couldn't finish" with a small nod.
 */
function SceneTile({ scene }: { scene: SceneConfig }) {
  const { kind, greeting } = sceneKind(scene);
  const { state, missing, busy, press } = useSceneRun(scene, () =>
    showBanner(greeting, kind === "night" ? <Moon size={24} /> : kind === "morning" ? <SunriseRising size={24} /> : undefined),
  );
  const label = !missing && state === "error" ? "Couldn\u2019t finish" : scene.label;
  const icon = kind === "morning" ? <SunriseRising size={32} /> : <SceneIcon name={scene.icon} size={32} />;

  return (
    <button type="button" onClick={press} disabled={missing || busy}
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

/** Demo only: `?today=YYYY-MM-DD` pretends it's that date for the pickup reminder. */
function pickupToday(now: Date): string {
  const forced = MOCK ? new URLSearchParams(location.search).get("today") : null;
  return forced && /^\d{4}-\d{2}-\d{2}$/.test(forced) ? forced : todayInNewYork(now);
}

/** Pinned the day before a pickup: soft bronze accent, never counted as the next event. */
function PickupCard({ kinds }: { kinds: PickupKind[] }) {
  const both = kinds.includes("trash") && kinds.includes("recycling");
  const text = both ? "Trash & recycling pickup tomorrow" : kinds.includes("recycling") ? "Recycling pickup tomorrow" : "Trash pickup tomorrow";
  return (
    <span className="pickup-card">
      <span className="pickup-bar" />
      <span className="pickup-icons">
        {kinds.includes("trash") && <Trash size={22} />}
        {kinds.includes("recycling") && <Recycle size={22} />}
      </span>
      <span className="pickup-text">{text}</span>
    </span>
  );
}

function TodayPanel({ config, now, onOpen }: { config: HubConfig; now: Date; onOpen: () => void }) {
  const { events, loaded } = useCalendar(config.calendars);
  const view = todayView(events, now);
  const allDay = view.allDay.slice(0, MAX_ALL_DAY);
  const timed = view.timed.slice(0, MAX_TIMED);
  const more = view.allDay.length - allDay.length + view.timed.length - timed.length;
  const pickup = reminderFor(pickupToday(now), config.pickup);
  const empty = loaded && !view.allDay.length && !view.timed.length && !pickup.length;

  return (
    <button type="button" className="today" onClick={onOpen} aria-label="Today, open calendar">
      <span className="today-head">
        <span className="today-title">Today</span>
        <span className="today-link">Calendar<ChevronRight size={18} /></span>
      </span>

      {pickup.length > 0 && <PickupCard kinds={pickup} />}

      {allDay.map((e) => {
        const p = personInfo(e, config.people);
        return (
          <span key={e.id} className="today-allday">
            <span className="caps-sm">All day</span>
            <PersonDots colors={p.colors} />
            <span className="today-allday-title">{p.title}</span>
          </span>
        );
      })}

      {timed.length > 0 && (
        <span className="timeline">
          {timed.map((e) => {
            const isNext = e === view.next;
            const p = personInfo(e, config.people);
            return (
              <span key={e.id} className={`tl-event ${isNext ? "tl-next" : ""}`}>
                <TimelineDot colors={p.colors} next={isNext} />
                <span className="tl-time">
                  {formatTime(e.start)}
                  {isNext && <span className="caps-sm tl-next-label">Next</span>}
                </span>
                <span className="tl-title">{p.title}</span>
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

export function Home({ config, go, onSwitch }: { config: HubConfig; go: (s: ScreenName) => void; onSwitch?: () => void }) {
  // Tap the date 5 times to switch to the StandBy screen (and back).
  const tapDate = useMultiTap(5, () => onSwitch?.());
  const now = useNow();
  const weather = useWeather(config.weather);
  const { items } = useTodo(config.groceryList);
  const unchecked = items.filter((i) => i.status !== "completed").length;

  return (
    <Screen className="home">
      <div className="home-row">
        <div className="home-left">
          <div className="home-dateline" onClick={tapDate}>
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
            <GroceriesTile count={unchecked} onOpen={() => go("groceries")} />
          </div>
        </div>
        <TodayPanel config={config} now={now} onOpen={() => go("calendar")} />
      </div>
    </Screen>
  );
}
