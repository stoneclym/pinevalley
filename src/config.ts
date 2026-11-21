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
  /** Home Assistant base URL, e.g. https://home.example.com:8123. Empty: use VITE_HA_URL. */
  haUrl?: string;
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

let current: HubConfig = DEFAULTS;
/** The config loaded at startup. */
export function getConfig(): HubConfig {
  return current;
}

const isPlaceholder = (v: unknown) => typeof v !== "string" || !v.trim() || /REPLACE/.test(v);

/**
 * Voice settings: config.json may hold timing; the function URL and the Supabase
 * publishable key come from config.json if filled in, otherwise from the build's
 * VITE_PARSE_FUNCTION_URL and VITE_SUPABASE_PUBLISHABLE_KEY. The publishable key is public
 * by design; OpenAI and Anthropic keys never reach the browser.
 */
function resolveVoice(v: Partial<VoiceConfig> | null | undefined): VoiceConfig | null {
  const functionUrl = !isPlaceholder(v?.functionUrl) ? v!.functionUrl! : (import.meta.env.VITE_PARSE_FUNCTION_URL ?? "");
  const publishableKey = !isPlaceholder(v?.publishableKey) ? v!.publishableKey! : (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "");
  return {
    functionUrl: functionUrl.trim(),
    publishableKey: publishableKey.trim(),
    maxSeconds: v?.maxSeconds ?? 30,
    silenceStopSeconds: v?.silenceStopSeconds ?? 2,
  };
}

/** Loads config.json from next to index.html. Never holds secrets: entity IDs and public values only. */
export async function loadConfig(): Promise<HubConfig> {
  let raw: Partial<HubConfig> = {};
  try {
    const res = await fetch("./config.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`config.json: HTTP ${res.status}`);
    raw = await res.json();
  } catch (err) {
    console.error("Could not load config.json, using defaults", err);
  }
  current = { ...DEFAULTS, ...raw, voice: resolveVoice(raw.voice) };
  return current;
}
