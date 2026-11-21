export type SceneConfig = {
  id: string;
  label: string;
  icon: string;
  entity_id: string;
};

/** A read-only status tile, e.g. the garage door. Shows state; tapping does nothing. */
export type StatusTileConfig = {
  id: string;
  label: string;
  icon: string;
  /** A cover (open/closed/opening/closing) or a door binary_sensor (on = open). */
  entity_id: string;
};

export type VoiceConfig = {
  /** URL of the parse-groceries Supabase Edge Function. */
  functionUrl: string;
  /** Supabase publishable key. Public by design: the function is protected by CORS and limits. */
  publishableKey: string;
  maxSeconds: number;
  silenceStopSeconds: number;
};

export type HubConfig = {
  room: string;
  autoReturnSeconds: number;
  weather: string;
  calendars: string[];
  groceryList: string;
  voice: VoiceConfig | null;
  scenes: SceneConfig[];
  statusTiles: StatusTileConfig[];
};

const DEFAULTS: HubConfig = {
  room: "scullery",
  autoReturnSeconds: 60,
  weather: "weather.home",
  calendars: [],
  groceryList: "todo.shopping_list",
  voice: null,
  scenes: [],
  statusTiles: [],
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
