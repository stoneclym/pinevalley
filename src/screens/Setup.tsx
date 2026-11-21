import { useEffect, useState } from "react";
import type { HubConfig } from "../config";
import { currentUserName, haUrl, MOCK } from "../ha/connection";
import { useEntities } from "../ha/entities";
import { WEATHER_CONDITIONS, WeatherIcon } from "../ui/icons";
import { Screen } from "./Screen";
import "./Setup.css";

const DOMAINS: { domain: string; title: string }[] = [
  { domain: "weather", title: "Weather" },
  { domain: "calendar", title: "Calendars" },
  { domain: "todo", title: "To-do lists" },
  { domain: "scene", title: "Scenes" },
  { domain: "script", title: "Scripts" },
  { domain: "cover", title: "Covers (garage doors)" },
];

/** Every entity ID config.json refers to, to mark which ones exist. */
function configuredIds(c: HubConfig): Set<string> {
  return new Set([
    c.weather, c.groceryList, ...c.calendars,
    ...c.scenes.map((s) => s.entity_id), ...c.statusTiles.map((t) => t.entity_id),
  ]);
}

/** Hidden page (#/setup) that lists entity IDs to copy into config.json. */
export function Setup({ config }: { config: HubConfig }) {
  const ents = useEntities();
  const [user, setUser] = useState("…");
  useEffect(() => {
    currentUserName().then(setUser, () => setUser("Not signed in"));
  }, []);

  const wanted = configuredIds(config);
  const all = ents ? Object.values(ents) : [];
  const missing = [...wanted].filter((id) => ents && !ents[id]);

  return (
    <Screen className="setup">
      <header className="setup-header">
        <a className="setup-back glass" href="#/">
          ‹ Home
        </a>
        <h1>Setup</h1>
        <span className="setup-user">
          {MOCK ? "Sample data" : `${haUrl() ?? "No Home Assistant address"} · ${user}`} · {all.length} entities
        </span>
      </header>

      {missing.length > 0 && (
        <p className="setup-warning">
          In config.json but not found: {missing.join(", ")}
        </p>
      )}

      <div className="setup-grid selectable">
        {DOMAINS.map(({ domain, title }) => {
          const list = all
            .filter((e) => e.entity_id.startsWith(domain + "."))
            .sort((a, b) => a.entity_id.localeCompare(b.entity_id));
          return (
            <section key={domain} className="setup-card glass">
              <h2>{title}</h2>
              {ents === null && <p className="setup-empty">Loading…</p>}
              {ents !== null && list.length === 0 && <p className="setup-empty">None visible</p>}
              <ul>
                {list.map((e) => (
                  <li key={e.entity_id}>
                    <code>{e.entity_id}</code>
                    <span>
                      {String(e.attributes.friendly_name ?? "")}
                      {wanted.has(e.entity_id) && <b> · in config</b>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <section className="setup-card glass">
          <h2>Weather icons</h2>
          <div className="setup-weather">
            {WEATHER_CONDITIONS.map((c) => (
              <span key={c}><WeatherIcon condition={c} /><small>{c}</small></span>
            ))}
          </div>
        </section>
      </div>
    </Screen>
  );
}
