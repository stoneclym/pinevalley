export type SceneConfig = {
  id: string;
  label: string;
  icon: string;
  entity_id: string;
};

export type HubConfig = {
  room: string;
  autoReturnSeconds: number;
  weather: string;
  calendars: string[];
  groceryList: string;
  scenes: SceneConfig[];
};

const DEFAULTS: HubConfig = {
  room: "scullery",
  autoReturnSeconds: 60,
  weather: "weather.home",
  calendars: [],
  groceryList: "todo.shopping_list",
  scenes: [],
};

/** Loads config.json from next to index.html. Never holds secrets: entity IDs only. */
export async function loadConfig(): Promise<HubConfig> {
  try {
    const res = await fetch("./config.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`config.json: HTTP ${res.status}`);
    return { ...DEFAULTS, ...(await res.json()) };
  } catch (err) {
    console.error("Could not load config.json, using defaults", err);
    return DEFAULTS;
  }
}
