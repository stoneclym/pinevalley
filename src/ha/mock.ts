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

/** Sample events relative to "now", for dev mock mode only. */
export function mockEvents(now: Date) {
  const at = (dayOffset: number, h: number, m = 0) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h, m);
  const day = (dayOffset: number) => at(dayOffset, 0);
  const ev = (title: string, start: Date, end: Date, allDay = false, location?: string) => ({
    id: `${title}-${start.getTime()}`, title, start, end, allDay, location,
  });
  const nextHour = Math.min(now.getHours() + 1, 20);
  return [
    ev("Trash pickup", day(0), day(1), true),
    ev("Book club", at(0, nextHour, 30), at(0, nextHour + 1, 30), false, "Northeast Library"),
    ev("Dentist", at(0, Math.min(nextHour + 3, 21), 30), at(0, Math.min(nextHour + 4, 22), 15)),
    ev("Family dinner", at(0, 22, 30), at(0, 23, 30)),
    ev("Soccer game", at(1, 10), at(1, 11, 30)),
    ev("Movie night", at(1, 19), at(1, 21)),
    ev("Church", at(2, 9, 30), at(2, 11)),
    ev("Piano lesson", at(3, 16), at(3, 17)),
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
