import { useEffect, useState } from "react";
import type { HubConfig } from "./config";
import { useConnectionStatus } from "./ha/useStatus";
import { Home } from "./screens/Home";
import { Setup } from "./screens/Setup";

function useHashRoute(): string {
  const read = () => location.hash.replace(/^#/, "") || "/";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

function OfflineIndicator() {
  const status = useConnectionStatus();
  if (status !== "offline") return null;
  return (
    <div className="offline-dot" role="status">
      Offline
    </div>
  );
}

export function App({ config }: { config: HubConfig }) {
  const route = useHashRoute();
  return (
    <>
      {route === "/setup" ? <Setup config={config} /> : <Home config={config} />}
      <OfflineIndicator />
    </>
  );
}
