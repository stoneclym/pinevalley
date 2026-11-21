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
    if (!current.has(p.key) && !leaving.current.has(p.key)) {
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
      const dx = old.x - pos.x;
      const dy = old.y - pos.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
        { duration: 420, easing: SPRING },
      );
    });
    last.current = next;
  });
}
