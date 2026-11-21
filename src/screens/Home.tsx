import type { HubConfig } from "../config";
import { useWeather } from "../ha/weather";
import { formatClock, formatShortDate } from "../lib/time";
import { useNow } from "../lib/useNow";
import { Screen } from "./Screen";
import "./Home.css";

// Phase 1 placeholder: date line, weather and clock only, using the design's exact
// type and spacing. Tiles and the Today panel arrive in Phase 2.

function CloudIcon() {
  // Taken from the design. The other conditions get their own icons in Phase 2;
  // until then no icon is shown for them rather than a wrong one.
  return (
    <svg aria-hidden="true" width="38" height="38" viewBox="0 0 40 40">
      <g transform="translate(0 2)" fill="currentColor">
        <circle cx="14" cy="24" r="6" />
        <circle cx="22" cy="19" r="8" />
        <circle cx="29" cy="25" r="5" />
        <rect x="14" y="24" width="15" height="6" />
      </g>
    </svg>
  );
}

export function Home({ config }: { config: HubConfig }) {
  const now = useNow();
  const weather = useWeather(config.weather);
  return (
    <Screen className="home">
      <div className="home-left">
        <div className="home-dateline">
          <span>{formatShortDate(now)}</span>
          {weather && weather.temperature !== null && (
            <span className="home-weather">
              {weather.condition === "cloudy" && (
                <span className="home-weather-icon">
                  <CloudIcon />
                </span>
              )}
              <span>{weather.temperature}°</span>
            </span>
          )}
        </div>
        <div className="home-clock">{formatClock(now)}</div>
      </div>
    </Screen>
  );
}
