import { useEffect, useState } from "react";
import type { HubConfig } from "./config";
import { useConnectionStatus } from "./ha/useStatus";
import { useIdle } from "./lib/useIdle";
import { Calendar } from "./screens/Calendar";
import { Groceries } from "./screens/Groceries";
import { Home } from "./screens/Home";
import { Setup } from "./screens/Setup";

export type ScreenName = "home" | "calendar" | "groceries";

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

  // Back to Home after a minute without touches, but never while the voice sheet is open.
  useIdle(config.autoReturnSeconds, !setup && screen !== "home" && !sheetOpen, () => setScreen("home"));

  if (setup) return <Setup config={config} />;

  const go = (s: ScreenName) => setScreen(s);
  return (
    <>
      <div key={screen} className={`screen-transition ${screen === "home" ? "to-home" : "to-detail"}`}>
        {screen === "home" && <Home config={config} go={go} />}
        {screen === "calendar" && <Calendar config={config} go={go} />}
        {screen === "groceries" && <Groceries config={config} go={go} onSheetChange={setSheetOpen} />}
      </div>
      <OfflineIndicator />
    </>
  );
}
