import type { ReactElement } from "react";
import type { ScreenName } from "../App";
import type { HubConfig, SceneConfig } from "../config";
import { useEntities } from "../ha/entities";
import { useSceneRun } from "../ha/useSceneRun";
import { useWeather } from "../ha/weather";
import { subsolarPoint, sunHeight, terminatorLat } from "../lib/sun";
import { formatClock, formatShortDate, shortWeekday } from "../lib/time";
import { useMultiTap } from "../lib/useMultiTap";
import { useNow } from "../lib/useNow";
import { Alert, Check, LocationArrow, SceneIcon, WeatherIcon } from "../ui/icons";
import LAND from "../standby/land.json";
import "./StandBy.css";

// Where the land grid sits on the 1180 × 820 canvas.
const MAP = { left: 32, top: 92, dx: 19.6, dy: 18.2 };
const lonToX = (lon: number) => MAP.left + ((lon - LAND.lonStart) / LAND.lonStep) * MAP.dx;
const latToY = (lat: number) => MAP.top + ((LAND.latStart - lat) / LAND.latStep) * MAP.dy;

/** Mix the night and day dot colors by how high the sun is (a soft twilight band). */
function dotColor(h: number): string {
  const t = Math.max(0, Math.min(1, (h + 0.06) / 0.14));
  const night = [58, 55, 51];
  const day = [233, 226, 214];
  const c = night.map((n, i) => Math.round(n + (day[i] - n) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/**
 * The dotted world map: land dots lit where it's daytime right now, the day/night line,
 * and a marker for home. Redrawn every minute, so the daylight moves through the day.
 */
function WorldMap({ now, home }: { now: Date; home: { lat: number; lon: number } | null }) {
  const sub = subsolarPoint(now);
  const dots: ReactElement[] = [];
  LAND.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== "1") continue;
      const lon = LAND.lonStart + c * LAND.lonStep;
      const lat = LAND.latStart - r * LAND.latStep;
      dots.push(<circle key={`${r}-${c}`} cx={MAP.left + c * MAP.dx} cy={MAP.top + r * MAP.dy} r={6.3} fill={dotColor(sunHeight(lat, lon, sub))} />);
    }
  });
  const lonEnd = LAND.lonStart + (LAND.cols - 1) * LAND.lonStep;
  const line: string[] = [];
  for (let lon = LAND.lonStart - 4; lon <= lonEnd + 4; lon += 2) {
    const lat = Math.max(-74, Math.min(86, terminatorLat(lon, sub)));
    line.push(`${lonToX(lon).toFixed(1)},${latToY(lat).toFixed(1)}`);
  }
  return (
    <svg className="sb-map" viewBox="0 0 1180 820" aria-hidden="true">
      {dots}
      <polyline points={line.join(" ")} fill="none" stroke="rgba(240, 232, 220, .34)" strokeWidth="2" strokeLinecap="round" />
      {home && <circle cx={lonToX(home.lon)} cy={latToY(home.lat)} r="15" fill="#8a6326" stroke="#77736c" strokeWidth="3" />}
    </svg>
  );
}

/** Round scene button: running until Home Assistant says the script finished, then a check. */
function SceneButton({ scene }: { scene: SceneConfig }) {
  const { state, missing, busy, press } = useSceneRun(scene);
  const label = !missing && state === "error" ? "Couldn’t finish" : scene.label;
  return (
    <button type="button" className={`sb-btn sb-scene sb-${state} ${missing ? "sb-missing" : ""}`} onClick={press}
      disabled={missing || busy} aria-label={missing ? `${scene.label}, not set up` : busy ? `${scene.label}, running` : label}>
      <span className="sb-circle">
        <span className="sb-icon">
          {state === "done" ? <Check size={34} strokeWidth={2} /> : state === "error" ? <Alert size={34} /> : <SceneIcon name={scene.icon} size={34} />}
        </span>
      </span>
      <span className="sb-label">{label}</span>
    </button>
  );
}

/**
 * The alternate home screen, after Apple's StandBy world clock: a dark dotted world map whose
 * daylight follows the sun, the date and weather, home's name, a big clock, and round buttons
 * for the Calendar and three scenes. Tap the date 5 times to switch back.
 */
export function StandBy({ config, go, onSwitch }: { config: HubConfig; go: (s: ScreenName) => void; onSwitch: () => void }) {
  const now = useNow();
  const weather = useWeather(config.weather);
  const states = useEntities();
  const tapDate = useMultiTap(5, onSwitch);

  // Home's name and position: config.json first, then Home Assistant's home zone.
  const zone = states?.["zone.home"];
  const home = config.standby.location ??
    (zone && typeof zone.attributes.latitude === "number"
      ? { name: String(zone.attributes.friendly_name ?? "Home"), lat: zone.attributes.latitude as number, lon: zone.attributes.longitude as number }
      : null);

  return (
    <div className="standby">
      <WorldMap now={now} home={home} />

      <div className="sb-dateline" onClick={tapDate}>
        <span>{formatShortDate(now)}</span>
        {weather && weather.temperature !== null && (
          <span className="sb-weather">
            <WeatherIcon condition={weather.condition} size={34} />
            <span>{weather.temperature}°</span>
          </span>
        )}
      </div>

      <div className="sb-clockblock">
        {home && (
          <div className="sb-place">
            <LocationArrow size={30} />
            <span>{home.name}</span>
          </div>
        )}
        <div className="sb-clock">{formatClock(now)}</div>
      </div>

      <div className="sb-buttons">
        <button type="button" className="sb-btn" onClick={() => go("calendar")} aria-label="Calendar">
          <span className="sb-circle sb-cal">
            <span className="sb-cal-wd">{shortWeekday(now)}</span>
            <span className="sb-cal-day">{now.getDate()}</span>
          </span>
          <span className="sb-label">Calendar</span>
        </button>
        {config.standby.scenes.map((s) => <SceneButton key={s.id} scene={s} />)}
      </div>
    </div>
  );
}
