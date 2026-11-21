import { useEffect } from "react";
import { createPortal } from "react-dom";
import { createStore, useStore } from "../lib/store";
import "./Celebration.css";

export type CelebrationKind = "morning" | "night";
type Celebration = { kind: CelebrationKind; x: number; y: number; id: number } | null;

const store = createStore<Celebration>(null);
let nextId = 1;

const DURATION: Record<CelebrationKind, number> = { morning: 2600, night: 3400 };

/** Play a full-screen moment from a tile. x/y is the tile's centre in screen pixels. */
export function celebrate(kind: CelebrationKind, x: number, y: number) {
  store.set({ kind, x, y, id: nextId++ });
}

// A few stars in the upper part of the screen, placed the same way every time.
const STARS = [
  [12, 14, 0], [24, 8, 300], [37, 19, 600], [52, 10, 150], [63, 22, 450],
  [74, 7, 750], [86, 16, 250], [92, 28, 550], [45, 30, 900], [18, 30, 1050],
];

/**
 * Full-screen overlay for the Morning and Good Night moments. It sits outside the scaled
 * canvas so it reaches the screen edges, and never catches taps.
 */
export function Celebrations() {
  const c = useStore(store);
  useEffect(() => {
    if (!c) return;
    const t = window.setTimeout(() => {
      if (store.get()?.id === c.id) store.set(null);
    }, DURATION[c.kind]);
    return () => clearTimeout(t);
  }, [c]);
  if (!c) return null;

  return createPortal(
    <div key={c.id} className={`celebration celebration-${c.kind}`} aria-hidden="true"
      style={{ "--cx": `${c.x}px`, "--cy": `${c.y}px` } as React.CSSProperties}>
      {c.kind === "morning" ? (
        <div className="sun-glow" />
      ) : (
        <>
          <div className="dusk" />
          {STARS.map(([x, y, delay], i) => (
            <span key={i} className="star" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${700 + delay}ms` }} />
          ))}
        </>
      )}
    </div>,
    document.body,
  );
}
