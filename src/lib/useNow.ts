import { useEffect, useState } from "react";
import { msUntilNextMinute } from "./time";

/** Current time, re-rendered exactly on each minute boundary and on return to foreground. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: number;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = window.setTimeout(tick, msUntilNextMinute(d) + 20);
    };
    timer = window.setTimeout(tick, msUntilNextMinute(new Date()) + 20);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return now;
}
