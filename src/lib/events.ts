import { addDays, startOfDay } from "./time";

export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  /** Exclusive. For all-day events this is midnight after the last day. */
  end: Date;
  allDay: boolean;
  location?: string;
};

/** HA returns plain strings from calendar.get_events, and {date}/{dateTime} from REST. Accept all. */
export type RawTime = string | { dateTime: string } | { date: string };
export type RawEvent = {
  summary?: string;
  start: RawTime;
  end: RawTime;
  location?: string | null;
  uid?: string | null;
  recurrence_id?: string | null;
};

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseTime(raw: RawTime): { date: Date; allDay: boolean } {
  const value = typeof raw === "string" ? raw : "date" in raw ? raw.date : raw.dateTime;
  const m = DATE_ONLY.exec(value);
  if (m) return { date: new Date(+m[1], +m[2] - 1, +m[3]), allDay: true };
  // Safari cannot parse "2026-11-20 08:30:00"; ISO needs the "T". No offset means local time.
  return { date: new Date(value.replace(" ", "T")), allDay: false };
}

/** Merge get_events responses from every calendar into one list sorted by start. */
export function normalizeEvents(byCalendar: Record<string, { events?: RawEvent[] }>): CalEvent[] {
  const out: CalEvent[] = [];
  for (const [calendarId, { events = [] }] of Object.entries(byCalendar)) {
    events.forEach((e, i) => {
      const s = parseTime(e.start);
      const en = parseTime(e.end);
      if (isNaN(s.date.getTime()) || isNaN(en.date.getTime())) return;
      out.push({
        id: `${calendarId}:${e.uid ?? i}:${e.recurrence_id ?? s.date.getTime()}`,
        title: (e.summary || "Untitled").trim(),
        start: s.date,
        end: en.date,
        allDay: s.allDay,
        location: e.location?.trim() || undefined,
      });
    });
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime() || a.title.localeCompare(b.title));
}

/** True if the event covers any part of the day that starts at `day` (local midnight). */
export function onDay(e: CalEvent, day: Date): boolean {
  const next = addDays(day, 1);
  return e.start < next && e.end > day;
}

export type TodayView = {
  allDay: CalEvent[];
  /** Timed events that have not ended yet. */
  timed: CalEvent[];
  /** The first timed event that has not ended (may be in progress). */
  next: CalEvent | null;
};

export function todayView(events: CalEvent[], now: Date): TodayView {
  const today = startOfDay(now);
  const todays = events.filter((e) => onDay(e, today));
  const allDay = todays.filter((e) => e.allDay);
  const timed = todays.filter((e) => !e.allDay && e.end > now);
  return { allDay, timed, next: timed[0] ?? null };
}

export type WeekDay = { date: Date; allDay: CalEvent[]; timed: CalEvent[] };

/** The 6 days after today (a rolling 7 days including today). */
export function weekView(events: CalEvent[], now: Date): WeekDay[] {
  const today = startOfDay(now);
  return Array.from({ length: 6 }, (_, i) => {
    const date = addDays(today, i + 1);
    const day = events.filter((e) => onDay(e, date));
    return { date, allDay: day.filter((e) => e.allDay), timed: day.filter((e) => !e.allDay) };
  });
}
