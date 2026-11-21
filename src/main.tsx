import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/instrument-serif/latin-400.css";
import "./theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadConfig } from "./config";
import { DEMO, getConnection, MOCK } from "./ha/connection";

// Start signing in right away (getAuth may redirect to HA's login page).
if (!MOCK) getConnection().catch(() => {});

// Block long-press menus and pinch zoom on the wall iPad.
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("gesturestart", (e) => e.preventDefault());

// Demo build: draw the iPad's 1180 × 820 canvas scaled to fit this screen.
if (DEMO) {
  document.documentElement.classList.add("demo");
  const fit = () => {
    const s = Math.min(window.innerWidth / 1180, window.innerHeight / 820);
    document.documentElement.style.setProperty("--demo-scale", String(s));
  };
  fit();
  window.addEventListener("resize", fit);
  const tag = document.createElement("div");
  tag.className = "demo-tag";
  tag.textContent = "Demo \u00B7 sample data";
  document.body.appendChild(tag);
}

loadConfig().then((config) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
});
