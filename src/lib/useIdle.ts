import { useEffect, useRef } from "react";

/** Calls onIdle after `seconds` without a touch, while `active` is true. */
export function useIdle(seconds: number, active: boolean, onIdle: () => void) {
  const cb = useRef(onIdle);
  cb.current = onIdle;
  useEffect(() => {
    if (!active || seconds <= 0) return;
    let timer = window.setTimeout(() => cb.current(), seconds * 1000);
    const reset = () => {
      clearTimeout(timer);
      timer = window.setTimeout(() => cb.current(), seconds * 1000);
    };
    const events = ["pointerdown", "keydown", "input", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { capture: true, passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset, { capture: true }));
    };
  }, [seconds, active]);
}
