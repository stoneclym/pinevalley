const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Lock-screen style clock: 12-hour, no leading zero, no AM/PM. `5:18`. */
export function formatClock(d: Date): string {
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Short date line: `Fri Nov 20`. */
export function formatShortDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Milliseconds until the next minute boundary (at least 1). */
export function msUntilNextMinute(d: Date): number {
  return Math.max(1, 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()));
}

const LONG_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];

/** Event time: `8:30 AM`. */
export function formatTime(d: Date): string {
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

/** `Friday, November 20`. */
export function formatLongDate(d: Date): string {
  return `${LONG_WEEKDAYS[d.getDay()]}, ${LONG_MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** `SAT`-style short weekday (shown uppercase by CSS). */
export function shortWeekday(d: Date): string {
  return WEEKDAYS[d.getDay()];
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** HA wants local wall-clock time: `2026-11-20 00:00:00`. */
export function haDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** `since 4:12 PM` today, `since Thu 4:12 PM` this week, else `since Nov 12`. */
export function formatSince(d: Date, now: Date): string {
  if (sameDay(d, now)) return `since ${formatTime(d)}`;
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return `since ${WEEKDAYS[d.getDay()]} ${formatTime(d)}`;
  return `since ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
