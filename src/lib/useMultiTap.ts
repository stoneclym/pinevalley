import { useRef } from "react";

/** Returns a tap handler that calls `onTrigger` after `count` taps within `windowMs`. */
export function useMultiTap(count: number, onTrigger: () => void, windowMs = 2500) {
  const taps = useRef<number[]>([]);
  return () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < windowMs), now];
    if (taps.current.length >= count) {
      taps.current = [];
      onTrigger();
    }
  };
}
