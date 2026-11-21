/**
 * Who an event is for, from config.json `people`. A person's `calendar` mapping wins over
 * title matching; otherwise their keywords are matched as whole words, case-insensitive,
 * anywhere in the title. Display only: events in Home Assistant are never changed.
 */

export type Person = {
  name: string;
  /** A CSS color for the person's dot and accent line. */
  color: string;
  keywords: string[];
  /** Optional calendar entity whose events all belong to this person. */
  calendar?: string;
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (k: string) => new RegExp(`(?:^|[^\\p{L}\\p{N}])${escape(k)}(?![\\p{L}\\p{N}])`, "iu");

/** The people an event belongs to, in config order. */
export function peopleFor(title: string, calendarId: string | undefined, people: Person[]): Person[] {
  const byCalendar = calendarId ? people.filter((p) => p.calendar && p.calendar === calendarId) : [];
  if (byCalendar.length) return byCalendar;
  return people.filter((p) => p.keywords.some((k) => k.trim() && wordRe(k.trim()).test(title)));
}

/**
 * The title to show: leading names are removed (they're shown as colors instead).
 * Strips one or more leading names joined by "&", "and", "+" or commas, an optional
 * possessive "'s", and a following ":", "-", "–" or "—". Capitalizes what's left.
 * Names later in the title stay. If nothing would be left, the original title is kept.
 */
export function displayTitle(title: string, people: Person[]): string {
  const names = people
    .flatMap((p) => p.keywords)
    .map((k) => k.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escape);
  if (!names.length) return title;
  const name = `(?:${names.join("|")})(?:['’]s)?(?![\\p{L}\\p{N}])`;
  const joiner = `\\s*(?:&|\\+|,|\\band\\b)\\s*`;
  const lead = new RegExp(`^\\s*${name}(?:${joiner}${name})*\\s*(?:[:\\-–—]\\s*)?`, "iu");
  const m = lead.exec(title);
  if (!m) return title;
  const rest = title.slice(m[0].length).trim();
  if (!rest) return title;
  return rest[0].toUpperCase() + rest.slice(1);
}
