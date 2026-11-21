import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/instrument-serif/latin-400.css";
import "./theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { loadConfig } from "./config";
import { configureHa, getConnection, MOCK } from "./ha/connection";

// ?mictest=1 opens the Phase 0 microphone test page (also reachable at /mic-test/).
if (new URLSearchParams(location.search).get("mictest") === "1") {
  location.replace(new URL("mic-test/index.html", location.href).href);
} else {
  start();
}

function start() {
  // Block long-press menus and pinch zoom on the wall iPad.
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  // iOS Safari only applies :active (the press-in on buttons) when a touchstart listener exists.
  document.addEventListener("touchstart", () => {}, { passive: true });

  // Full-bleed background layers behind the canvas (and the status bar wash for option A).
  for (const cls of ["bg-wood", "bg-wash", "bg-wood-calm", "bg-wash-calm", "status-wash"]) {
    const el = document.createElement("div");
    el.className = `bg-layer ${cls}`;
    el.setAttribute("aria-hidden", "true");
    document.body.insertBefore(el, document.getElementById("root"));
  }
  const bar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.getAttribute("content");
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  // The wash only matters when the page runs under a translucent status bar (the installed app).
  if (bar === "black-translucent" && standalone) document.documentElement.classList.add("status-translucent");

  // Draw the 1180 × 820 design canvas scaled to fit the window. On the iPad Air in the
  // installed app the scale is 1; in a browser tab or on a phone it shrinks to fit.
  const fit = () => {
    const s = Math.min(window.innerWidth / 1180, window.innerHeight / 820);
    document.documentElement.style.setProperty("--fit-scale", String(s));
  };
  fit();
  window.addEventListener("resize", fit);

  if (MOCK) {
    const tag = document.createElement("div");
    tag.className = "demo-tag";
    tag.textContent = "Demo · sample data";
    document.body.appendChild(tag);
  }

  loadConfig().then((config) => {
    configureHa(config.haUrl);
    // Start signing in right away (getAuth may redirect to HA's login page).
    if (!MOCK) getConnection().catch(() => {});
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App config={config} />
      </StrictMode>,
    );
  });
}
