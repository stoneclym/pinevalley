import { useCallback, useEffect, useRef, useState } from "react";

/** How long a sheet takes to animate out before it is removed (matches the CSS). */
export const SHEET_EXIT_MS = 240;

/**
 * Lets something play an exit animation before it is removed: `leave(then)` sets `leaving`
 * (which adds the exit class), waits for the animation, then runs `then`.
 */
export function useExit(ms = SHEET_EXIT_MS) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const leave = useCallback((then: () => void) => {
    setLeaving(true);
    clearTimeout(timer.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = window.setTimeout(then, reduced ? 120 : ms);
  }, [ms]);
  const reset = useCallback(() => setLeaving(false), []);
  return { leaving, leave, reset };
}
