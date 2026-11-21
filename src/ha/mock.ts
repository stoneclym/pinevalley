import type { HassEntities } from "home-assistant-js-websocket";

const ctx = { id: "mock", parent_id: null, user_id: null };
const at = "2026-11-20T10:00:00+00:00";

function entity(entity_id: string, state: string, attributes: Record<string, unknown>) {
  return { entity_id, state, attributes, last_changed: at, last_updated: at, context: ctx };
}

/** Fake entity states for design work without a live HA. */
export function mockEntities(): HassEntities {
  return Object.fromEntries(
  [
    entity("weather.home", "cloudy", {
      friendly_name: "Home",
      temperature: 48.4,
      temperature_unit: "°F",
    }),
    entity("calendar.family", "off", { friendly_name: "Family", message: "Book club" }),
    entity("calendar.us_holidays", "off", { friendly_name: "US Holidays" }),
    entity("todo.shopping_list", "8", { friendly_name: "Shopping List" }),
    entity("scene.evening", "2026-11-19T22:00:00+00:00", { friendly_name: "Evening" }),
    entity("script.wake_up", "off", { friendly_name: "Wake Up" }),
    entity("script.good_night", "off", { friendly_name: "Good Night" }),
    entity("script.leaving_home", "off", { friendly_name: "Leaving Home" }),
    entity("light.kitchen_lamp", "on", { friendly_name: "Kitchen Lamp" }),
  ].map((e) => [e.entity_id, e]),
  );
}
