/**
 * Sample data for demo mode only (VITE_DEMO=1 or ?mock=1). This file is loaded on demand,
 * so the real app never downloads it, and nothing here is ever written to Home Assistant.
 */
import type { HassEntities } from "home-assistant-js-websocket";
import type { HubConfig } from "../config";

const ctx = { id: "mock", parent_id: null, user_id: null };
const at = "2026-11-20T10:00:00+00:00";

function entity(entity_id: string, state: string, attributes: Record<string, unknown>) {
  return { entity_id, state, attributes, last_changed: at, last_updated: at, context: ctx };
}

/** Sample entity states, including every entity config.json points at. */
export function mockEntities(cfg: HubConfig): HassEntities {
  const list = [
    entity(cfg.weather || "weather.home", "cloudy", { friendly_name: "Home", temperature: 48.4, temperature_unit: "°F" }),
    entity("calendar.family", "off", { friendly_name: "Family" }),
    entity(cfg.groceryList || "todo.shopping_list", "8", { friendly_name: "Shopping List" }),
    entity("light.kitchen_lamp", "on", { friendly_name: "Kitchen Lamp" }),
    ...cfg.calendars.map((id) => entity(id, "off", { friendly_name: "Calendar" })),
    ...cfg.scenes.map((sc) => entity(sc.entity_id, "off", { friendly_name: sc.label })),
    ...cfg.statusTiles.map((t) => ({
      ...entity(t.entity_id, "closed", { friendly_name: t.label, device_class: "garage" }),
      last_changed: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    })),
  ];
  return Object.fromEntries(list.map((e) => [e.entity_id, e]));
}

/** Sample events relative to "now", covering every person-color and title-stripping case. */
export function mockEvents(now: Date) {
  const at = (dayOffset: number, h: number, m = 0) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h, m);
  const day = (dayOffset: number) => at(dayOffset, 0);
  const ev = (title: string, start: Date, end: Date, allDay = false, location?: string) => ({
    id: `${title}-${start.getTime()}`, title, start, end, allDay, location, calendarId: "calendar.family",
  });
  // Later today, spaced an hour apart from now (capped so they stay today).
  const h = (n: number) => Math.min(now.getHours() + n, 23);
  return [
    ev("Greyson's birthday party", day(0), day(1), true),                                   // blue, stripped
    ev("Greyson visiting Hannah and Vince", at(0, h(1), 0), at(0, h(1), 50)),               // blue, stripped, next
    ev("Steve & Denise dinner", at(0, h(2), 0), at(0, h(2), 50), false, "The Fortunate Glass"), // red + pink split
    ev("Steve: dentist", at(0, h(3), 0), at(0, h(3), 45)),                                  // red, stripped
    ev("Dinner with Greyson", at(0, h(4), 0), at(0, h(4), 50)),                             // blue, unchanged
    ev("Family movie night", at(0, h(5), 0), at(0, h(5), 50)),                              // green, stripped
    ev("Book club", at(1, 10), at(1, 11, 30), false, "Northeast Library"),                  // unmatched
    ev("Steve", at(1, 19), at(1, 21)),                                                      // red, unchanged
    ev("Denise's yoga", at(2, 9, 30), at(2, 10, 30)),                                       // pink, stripped
    ev("Piano lesson", at(3, 16), at(3, 17)),                                               // unmatched
    ev("Grandma arrives", day(5), day(6), true),
    ev("Thanksgiving", day(6), day(7), true),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function mockTodoItems() {
  const item = (summary: string, done = false) => ({
    uid: summary, summary, status: done ? ("completed" as const) : ("needs_action" as const),
  });
  return [
    item("Avocados"), item("Limes"), item("Cilantro"), item("Milk"), item("Eggs"),
    item("Taco shells"), item("Coffee beans"), item("Paper towels"),
    item("Bananas", true), item("Olive oil", true),
  ];
}
