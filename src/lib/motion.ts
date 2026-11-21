import { type RefObject, useLayoutEffect, useReducer, useRef } from "react";

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** iPadOS-like spring: quick, with a small overshoot. */
export const SPRING = "cubic-bezier(.22, 1.2, .36, 1)";

export type Presence<T> = { item: T; key: string; leaving: boolean };

/**
 * Keeps removed items around for `ms` with `leaving: true`, so they can animate out,
 * at the position they had. Items that come back are restored at once.
 */
export function usePresence<T>(items: T[], key: (t: T) => string, ms = 280): Presence<T>[] {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const prev = useRef<Presence<T>[]>([]);
  const leaving = useRef(new Map<string, { item: T; index: number }>());

  const current = new Set(items.map(key));
  prev.current.forEach((p, index) => {
    // Only items that were showing normally start leaving. An item that already finished
    // its exit (still in `prev` as leaving) must not start over, or it would loop forever.
    if (!current.has(p.key) && !p.leaving && !leaving.current.has(p.key)) {
      leaving.current.set(p.key, { item: p.item, index });
      window.setTimeout(() => {
        leaving.current.delete(p.key);
        rerender();
      }, reducedMotion() ? 140 : ms);
    }
  });
  for (const k of current) leaving.current.delete(k);

  const out: Presence<T>[] = items.map((item) => ({ item, key: key(item), leaving: false }));
  [...leaving.current.entries()]
    .sort((a, b) => a[1].index - b[1].index)
    .forEach(([k, { item, index }]) => out.splice(Math.min(index, out.length), 0, { item, key: k, leaving: true }));
  prev.current = out;
  return out;
}

/**
 * FLIP: when elements marked `data-flip="<id>"` inside `container` move between renders,
 * animate them from their old position to the new one instead of jumping.
 */
export function useFlip(container: RefObject<HTMLElement | null>) {
  const last = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const base = root.getBoundingClientRect();
    const next = new Map<string, { x: number; y: number }>();
    root.querySelectorAll<HTMLElement>("[data-flip]").forEach((el) => {
      const r = el.getBoundingClientRect();
      const pos = { x: r.left - base.left + root.scrollLeft, y: r.top - base.top + root.scrollTop };
      const id = el.dataset.flip!;
      next.set(id, pos);
      const old = last.current.get(id);
      if (!old || reducedMotion()) return;
      // Vertical moves only (cards sliding up or down within a column), with a plain
      // ease-out: no sideways motion and no overshoot, so nothing wobbles into place.
      const dy = old.y - pos.y;
      if (Math.abs(dy) < 1 || Math.abs(old.x - pos.x) > 1) return;
      el.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
        { duration: 300, easing: "cubic-bezier(.2, .8, .2, 1)" },
      );
    });
    last.current = next;
  });
}
