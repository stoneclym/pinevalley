import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { HubConfig } from "./config";
import { useConnectionStatus } from "./ha/useStatus";
import { useIdle } from "./lib/useIdle";
import { Calendar } from "./screens/Calendar";
import { Groceries } from "./screens/Groceries";
import { Home } from "./screens/Home";
import { StandBy } from "./screens/StandBy";
import { Banners } from "./ui/Banner";
import { Setup } from "./screens/Setup";

export type ScreenName = "home" | "calendar" | "groceries";

/** The last place the screen was touched, in canvas pixels (the canvas is scaled to fit). */
const lastTouch = { x: 590, y: 410 };
window.addEventListener(
  "pointerdown",
  (e) => {
    const root = document.getElementById("root")?.getBoundingClientRect();
    if (!root || !root.width) return;
    const scale = root.width / 1180;
    lastTouch.x = (e.clientX - root.left) / scale;
    lastTouch.y = (e.clientY - root.top) / scale;
  },
  { capture: true, passive: true },
);

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
  // Which home screen: the original (default) or StandBy. Tap the date 5 times to switch.
  const [homeStyle, setHomeStyle] = useState<"classic" | "standby">("classic");
  const switchHome = () => setHomeStyle((h) => (h === "classic" ? "standby" : "classic"));
  // Where the tapped tile was: the new screen zooms out of it, and Home settles back toward it.
  const origin = useRef({ x: 590, y: 410 });

  /** Switch screens with a short, steady zoom from the tapped tile (no overshoot). */
  const go = (next: ScreenName) => {
    if (next === screen) return;
    if (next !== "home") origin.current = { ...lastTouch };
    setScreen(next);
  };

  // Calendar and Groceries use the calmer background (crossfaded by the full-screen layers);
  // the StandBy home screen is dark.
  useEffect(() => {
    if (!setup && screen !== "home") document.body.dataset.calm = "";
    else delete document.body.dataset.calm;
    if (!setup && screen === "home" && homeStyle === "standby") document.body.dataset.standby = "";
    else delete document.body.dataset.standby;
  }, [screen, setup, homeStyle]);

  // Back to Home after a minute without touches, but never while the voice sheet is open.
  useIdle(config.autoReturnSeconds, !setup && screen !== "home" && !sheetOpen, () => go("home"));

  if (setup) return <Setup config={config} />;

  return (
    <>
      <div key={screen}
        className={`screen-transition ${screen === "home" ? "to-home" : "to-detail"}`}
        style={{ "--ox": `${origin.current.x}px`, "--oy": `${origin.current.y}px` } as CSSProperties}>
        {screen === "home" && homeStyle === "classic" && <Home config={config} go={go} onSwitch={switchHome} />}
        {screen === "home" && homeStyle === "standby" && <StandBy config={config} go={go} onSwitch={switchHome} />}
        {screen === "calendar" && <Calendar config={config} go={go} />}
        {screen === "groceries" && <Groceries config={config} go={go} onSheetChange={setSheetOpen} />}
      </div>
      <OfflineIndicator />
      <Banners />
    </>
  );
}
