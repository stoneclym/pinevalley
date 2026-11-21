import { useEntities } from "./entities";

/** The condition values a HA weather entity reports as its state. */
export type WeatherCondition =
  | "clear-night" | "cloudy" | "exceptional" | "fog" | "hail" | "lightning"
  | "lightning-rainy" | "partlycloudy" | "pouring" | "rainy" | "snowy"
  | "snowy-rainy" | "sunny" | "windy" | "windy-variant";

export type Weather = {
  condition: WeatherCondition | string;
  /** Rounded to a whole degree. */
  temperature: number | null;
  /** The unit HA reports, e.g. "°F". */
  unit: string;
};

export function useWeather(entityId: string): Weather | null {
  const ents = useEntities();
  const e = ents?.[entityId];
  if (!e || e.state === "unavailable" || e.state === "unknown") return null;
  const t = Number(e.attributes.temperature);
  return {
    condition: e.state,
    temperature: Number.isFinite(t) ? Math.round(t) : null,
    unit: String(e.attributes.temperature_unit ?? "°"),
  };
}
