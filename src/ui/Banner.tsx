import { type ReactNode, useEffect, useState } from "react";
import { createStore, useStore } from "../lib/store";
import "./Banner.css";

type Banner = { text: string; icon?: ReactNode; id: number } | null;
const store = createStore<Banner>(null);
let nextId = 1;

const SHOW_MS = 3000;
const EXIT_MS = 320;

/** Drop a liquid glass notification from the top of the screen for 3 seconds. */
export function showBanner(text: string, icon?: ReactNode) {
  store.set({ text, icon, id: nextId++ });
}

export function Banners() {
  const banner = useStore(store);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (!banner) return;
    setLeaving(false);
    const out = window.setTimeout(() => setLeaving(true), SHOW_MS);
    const gone = window.setTimeout(() => {
      if (store.get()?.id === banner.id) store.set(null);
    }, SHOW_MS + EXIT_MS);
    return () => {
      clearTimeout(out);
      clearTimeout(gone);
    };
  }, [banner]);
  if (!banner) return null;
  return (
    <div key={banner.id} className={`banner glass ${leaving ? "banner-leaving" : ""}`} role="status">
      {banner.icon && <span className="banner-icon">{banner.icon}</span>}
      <span>{banner.text}</span>
    </div>
  );
}
