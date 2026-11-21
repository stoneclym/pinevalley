import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import type { HubConfig } from "./config";
import { useConnectionStatus } from "./ha/useStatus";
import { useIdle } from "./lib/useIdle";
import { Calendar } from "./screens/Calendar";
import { Groceries } from "./screens/Groceries";
import { Home } from "./screens/Home";
import { Celebrations } from "./ui/Celebration";
import { Setup } from "./screens/Setup";

export type ScreenName = "home" | "calendar" | "groceries";

type ViewTransitionDoc = Document & { startViewTransition?: (update: () => void) => { finished: Promise<void> } };
/** Safari 18+ supports same-document view transitions; elsewhere screens crossfade. */
const canMorph = () =>
  typeof (document as ViewTransitionDoc).startViewTransition === "function" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Screens switch in memory only. The URL never changes, because a hash change in an
 * installed iPad web app can bring the microphone prompt back (spec section 6).
 * The hidden #/setup page is the one exception and is not used on the wall iPad.
 */
function useSetupHash(): boolean {
  const read = () => location.hash === "#/setup";
  const [on, setOn] = useState(read);
  useEffect(() => {
    const f = () => setOn(read());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return on;
}

function OfflineIndicator() {
  const status = useConnectionStatus();
  if (status === "offline") return <div className="offline-dot" role="status">Offline</div>;
  if (status === "unconfigured") return <div className="offline-dot" role="status">Home Assistant not set up</div>;
  return null;
}

export function App({ config }: { config: HubConfig }) {
  const setup = useSetupHash();
  const [screen, setScreen] = useState<ScreenName>("home");
  const [sheetOpen, setSheetOpen] = useState(false);
  // Which tile/screen pair is morphing: the tile and the screen share one view-transition name.
  const [hero, setHero] = useState<"calendar" | "groceries" | null>(null);
  const [morphing, setMorphing] = useState(false);

  /**
   * Switch screens. With view transitions, the tapped tile expands into the new screen and
   * Back shrinks the screen into its tile; otherwise a soft crossfade.
   */
  const go = (next: ScreenName) => {
    if (next === screen) return;
    if (!canMorph()) {
      setScreen(next);
      return;
    }
    const pair = next === "home" ? (screen as "calendar" | "groceries") : next;
    // Name the element being left before the old snapshot is taken.
    flushSync(() => {
      setHero(pair);
      setMorphing(true);
    });
    const t = (document as ViewTransitionDoc).startViewTransition!(() => flushSync(() => setScreen(next)));
    t.finished.finally(() => {
      setHero(null);
      setMorphing(false);
    });
  };

  // Calendar and Groceries use the calmer background (crossfaded by the full-screen layers).
  useEffect(() => {
    if (!setup && screen !== "home") document.body.dataset.calm = "";
    else delete document.body.dataset.calm;
  }, [screen, setup]);

  // Back to Home after a minute without touches, but never while the voice sheet is open.
  useIdle(config.autoReturnSeconds, !setup && screen !== "home" && !sheetOpen, () => go("home"));

  if (setup) return <Setup config={config} />;

  return (
    <>
      <div key={screen}
        className={`screen-transition ${morphing ? "" : screen === "home" ? "to-home" : "to-detail"}`}
        style={screen !== "home" && hero === screen ? { viewTransitionName: "hero" } : undefined}>
        {screen === "home" && <Home config={config} go={go} hero={hero} />}
        {screen === "calendar" && <Calendar config={config} go={go} />}
        {screen === "groceries" && <Groceries config={config} go={go} onSheetChange={setSheetOpen} />}
      </div>
      <OfflineIndicator />
      <Celebrations />
    </>
  );
}
