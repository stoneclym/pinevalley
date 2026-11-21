/**
 * Calendar events for today plus the next 7 days, merged from every calendar in config.json.
 *
 * Live: the `calendar/event/subscribe` WebSocket command the HA frontend uses. Home Assistant
 * pushes the full event list for the window whenever it changes, so nothing polls. The window
 * rolls over at midnight by resubscribing. If a Home Assistant version doesn't know that
 * command, that calendar falls back to the documented `calendar.get_events` action every
 * 5 minutes. Entity state is never used: CalDAV entity state describes only one event.
 *
 * Calendars listed in config.json that don't exist in Home Assistant are skipped quietly.
 * New events can take about 15 minutes to appear, because CalDAV itself refreshes about that often.
 */
import { useEffect } from "react";
import { callService, type Connection } from "home-assistant-js-websocket";
import { type CalEvent, normalizeEvents, type RawEvent } from "../lib/events";
import { createStore, useStore } from "../lib/store";
import { addDays, haDateTime, startOfDay } from "../lib/time";
import { getConnection, haUrl, MOCK } from "./connection";
import { whenEntities } from "./entities";

const FALLBACK_REFRESH_MS = 5 * 60_000;

type CalendarState = { events: CalEvent[]; loaded: boolean };
const store = createStore<CalendarState>({ events: [], loaded: false });

let calendarIds: string[] = [];
let started = false;
let cleanups: (() => void)[] = [];
const perCalendar = new Map<string, RawEvent[]>();

function publish() {
  const byCal = Object.fromEntries([...perCalendar].map(([id, events]) => [id, { events }]));
  store.set({ events: normalizeEvents(byCal), loaded: true });
}

async function pollOnce(conn: Connection, id: string, from: Date, to: Date) {
  try {
    const res = (await callService(
      conn, "calendar", "get_events",
      { start_date_time: haDateTime(from), end_date_time: haDateTime(to) },
      { entity_id: id }, true,
    )) as { response?: Record<string, { events?: RawEvent[] }> };
    perCalendar.set(id, res.response?.[id]?.events ?? []);
    publish();
  } catch (err) {
    console.error(`calendar.get_events failed for ${id}`, err);
  }
}

async function subscribeAll() {
  cleanups.forEach((c) => c());
  cleanups = [];
  perCalendar.clear();

  if (MOCK) {
    const { mockEvents } = await import("./mock");
    store.set({ events: mockEvents(new Date()), loaded: true });
    return;
  }
  // Without a Home Assistant address we can't know the day's events, so say nothing at all.
  if (!haUrl()) return;

  const states = await whenEntities();
  const ids = calendarIds.filter((id) => id.startsWith("calendar.") && states[id]);
  if (!ids.length) {
    store.set({ events: [], loaded: true }); // no calendars set up yet: quiet empty state
    return;
  }

  const conn = await getConnection();
  const from = startOfDay(new Date());
  const to = addDays(from, 8);
  for (const id of ids) {
    try {
      const unsub = await conn.subscribeMessage<{ events: RawEvent[] | null }>(
        (msg) => {
          perCalendar.set(id, msg.events ?? []);
          publish();
        },
        { type: "calendar/event/subscribe", entity_id: id, start: from.toISOString(), end: to.toISOString() },
        { resubscribe: true },
      );
      cleanups.push(() => unsub().catch(() => {}));
    } catch (err) {
      console.warn(`calendar/event/subscribe unavailable for ${id}; polling instead`, err);
      await pollOnce(conn, id, from, to);
      const t = window.setInterval(() => pollOnce(conn, id, startOfDay(new Date()), addDays(startOfDay(new Date()), 8)), FALLBACK_REFRESH_MS);
      cleanups.push(() => clearInterval(t));
    }
  }
  if (!perCalendar.size) publish();
}

function scheduleMidnight() {
  const now = new Date();
  const next = addDays(startOfDay(now), 1);
  window.setTimeout(() => {
    if (document.visibilityState === "visible") subscribeAll().catch((e) => console.error(e));
    scheduleMidnight();
  }, next.getTime() - now.getTime() + 5_000);
}

function start(ids: string[]) {
  calendarIds = ids;
  if (started) return;
  started = true;
  let day = startOfDay(new Date()).getTime();
  subscribeAll().catch((e) => console.error("calendar subscribe failed", e));
  scheduleMidnight();
  // A sleeping iPad can miss the midnight timer: roll the window when it wakes on a new day.
  document.addEventListener("visibilitychange", () => {
    const today = startOfDay(new Date()).getTime();
    if (document.visibilityState === "visible" && today !== day) {
      day = today;
      subscribeAll().catch((e) => console.error(e));
    }
  });
}

/** Events from today through 6 days ahead, merged from every configured calendar. */
export function useCalendar(ids: string[]): CalendarState {
  useEffect(() => start(ids), [ids]);
  return useStore(store);
}
