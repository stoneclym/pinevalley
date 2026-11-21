/**
 * Calendar events by date range, via the documented `calendar.get_events` action
 * (a service call that returns a response). Entity state is never used: CalDAV entity
 * state only describes one upcoming event.
 *
 * One fetch covers today plus the next 6 days, for Home and the Calendar view alike.
 * Refreshes every 5 minutes and whenever the app returns to the foreground. New events can
 * take about 15 minutes to appear, because CalDAV itself refreshes about that often.
 */
import { useEffect } from "react";
import { callService } from "home-assistant-js-websocket";
import { type CalEvent, normalizeEvents, type RawEvent } from "../lib/events";
import { createStore, useStore } from "../lib/store";
import { addDays, haDateTime, startOfDay } from "../lib/time";
import { getConnection, MOCK } from "./connection";
import { mockEvents } from "./mock";

const REFRESH_MS = 5 * 60_000;

type CalendarState = { events: CalEvent[]; loaded: boolean };
const store = createStore<CalendarState>({ events: [], loaded: false });

let calendarIds: string[] = [];
let timer: number | undefined;
let started = false;

async function refresh() {
  if (__MOCK_BUILD__ && MOCK) {
    store.set({ events: mockEvents(new Date()), loaded: true });
    return;
  }
  const ids = calendarIds.filter((id) => id.startsWith("calendar.") && !id.includes("REPLACE"));
  if (!ids.length) {
    store.set({ events: [], loaded: true });
    return;
  }
  try {
    const conn = await getConnection();
    const from = startOfDay(new Date());
    const res = (await callService(
      conn,
      "calendar",
      "get_events",
      { start_date_time: haDateTime(from), end_date_time: haDateTime(addDays(from, 7)) },
      { entity_id: ids },
      true,
    )) as { response?: Record<string, { events?: RawEvent[] }> };
    store.set({ events: normalizeEvents(res.response ?? {}), loaded: true });
  } catch (err) {
    // Keep the last events on screen; the offline indicator covers connection loss.
    console.error("calendar.get_events failed", err);
  }
}

function start(ids: string[]) {
  calendarIds = ids;
  if (started) return;
  started = true;
  refresh();
  timer = window.setInterval(refresh, REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
  void timer;
}

/** Events from today through 6 days ahead, merged from every configured calendar. */
export function useCalendar(ids: string[]): CalendarState {
  useEffect(() => start(ids), [ids]);
  return useStore(store);
}
