/**
 * Trash and recycling pickup days: pure date math in America/New_York, no Home Assistant entity.
 * Dates are calendar days ("YYYY-MM-DD"); times of day never matter.
 */

export type PickupKind = "trash" | "recycling";

export type PickupSchedule = { weekday: string; everyWeeks: number; anchor?: string };
export type PickupOverride = { date: string; moveTo?: string; skip?: boolean };
export type PickupConfig = {
  trash?: PickupSchedule;
  recycling?: PickupSchedule;
  remindDayBefore?: boolean;
  overrides?: PickupOverride[];
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY = 86_400_000;

/** "YYYY-MM-DD" → days since 1970-01-01 (UTC calendar math, no DST surprises). */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
}
function isoFromDay(n: number): string {
  return new Date(n * DAY).toISOString().slice(0, 10);
}
export function addDaysIso(iso: string, n: number): string {
  return isoFromDay(dayNumber(iso) + n);
}

/** Today's date in America/New_York as "YYYY-MM-DD". */
export function todayInNewYork(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(now);
}

/** Is this the regular pickup day for a schedule (before holiday overrides)? */
function scheduledOn(iso: string, s: PickupSchedule | undefined): boolean {
  if (!s) return false;
  const n = dayNumber(iso);
  const weekday = WEEKDAYS[((n % 7) + 4 + 7) % 7]; // 1970-01-01 was a Thursday
  if (weekday !== s.weekday.toLowerCase()) return false;
  const every = Math.max(1, Math.round(s.everyWeeks || 1));
  if (every === 1) return true;
  if (!s.anchor) return true; // no anchor: can't know the phase; treat as every week
  const weeks = Math.round((n - dayNumber(s.anchor)) / 7);
  return ((weeks % every) + every) % every === 0;
}

/** Which pickups happen on a date, after holiday overrides (moves and skips). */
export function pickupsOn(iso: string, cfg: PickupConfig): PickupKind[] {
  const overrides = cfg.overrides ?? [];
  const kinds: PickupKind[] = ["trash", "recycling"];
  return kinds.filter((k) => {
    const sched = cfg[k];
    // Regular day, unless an override moves or skips it.
    const moved = overrides.find((o) => o.date === iso && (o.skip || o.moveTo));
    if (scheduledOn(iso, sched) && !moved) return true;
    // A pickup moved here from its regular day.
    return overrides.some((o) => o.moveTo === iso && !o.skip && scheduledOn(o.date, sched));
  });
}

/** The pickups to remind about today (they happen tomorrow), or [] when there's nothing. */
export function reminderFor(todayIso: string, cfg: PickupConfig | null | undefined): PickupKind[] {
  if (!cfg || cfg.remindDayBefore === false) return [];
  return pickupsOn(addDaysIso(todayIso, 1), cfg);
}
