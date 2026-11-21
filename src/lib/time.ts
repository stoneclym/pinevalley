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
