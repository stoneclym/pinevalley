import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/instrument-serif/400.css";
import "./theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadConfig } from "./config";
import { getConnection, MOCK } from "./ha/connection";

// Start signing in right away (getAuth may redirect to HA's login page).
if (!MOCK) getConnection().catch(() => {});

// Block long-press menus and pinch zoom on the wall iPad.
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("gesturestart", (e) => e.preventDefault());

loadConfig().then((config) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
});
