import type { CSSProperties } from "react";
import type { CalEvent } from "../lib/events";
import { displayTitle, type Person, peopleFor } from "../lib/people";

/** Who an event belongs to and the title to show (leading names stripped). */
export function personInfo(e: CalEvent, people: Person[]) {
  const who = peopleFor(e.title, e.calendarId, people);
  return { colors: who.map((p) => p.color), names: who.map((p) => p.name), title: displayTitle(e.title, people) };
}

/** Equal slices of each color round a circle (one color: a plain fill). */
function circleFill(colors: string[]): string {
  if (colors.length === 1) return colors[0];
  const step = 360 / colors.length;
  return `conic-gradient(${colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`).join(", ")})`;
}

/** Equal stacked bands of each color, top to bottom (one color: a plain fill). */
export function barFill(colors: string[]): CSSProperties | undefined {
  if (!colors.length) return undefined;
  if (colors.length === 1) return { background: colors[0], opacity: 1 };
  const step = 100 / colors.length;
  return {
    background: `linear-gradient(180deg, ${colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(", ")})`,
    opacity: 1,
  };
}

/**
 * Timeline dot: filled for the next event, hollow for later ones. Matched people color it;
 * several people split it. Unmatched events keep the neutral dark dot.
 */
export function TimelineDot({ colors, next }: { colors: string[]; next: boolean }) {
  if (!colors.length) return <span className={next ? "tl-dot-filled" : "tl-dot"} />;
  return <span className={`tl-pdot ${next ? "tl-pdot-next" : ""}`} style={{ background: circleFill(colors) }} />;
}

/** Small dots, one per person, for one-line lists. */
export function PersonDots({ colors }: { colors: string[] }) {
  if (!colors.length) return null;
  return (
    <span className="pdots" aria-hidden="true">
      {colors.map((c, i) => <i key={i} style={{ background: c }} />)}
    </span>
  );
}
