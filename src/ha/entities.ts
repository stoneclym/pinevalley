import { useEffect, useState } from "react";
import { type HassEntities, subscribeEntities } from "home-assistant-js-websocket";
import { getConfig } from "../config";
import { getConnection, MOCK } from "./connection";

type Listener = (e: HassEntities) => void;

// One shared subscription for the whole app; the last known states stay on screen
// while HA is unreachable.
let latest: HassEntities | null = null;
const listeners = new Set<Listener>();
let started = false;

function publish(ents: HassEntities) {
  latest = ents;
  listeners.forEach((l) => l(ents));
}

function start() {
  if (started) return;
  started = true;
  if (MOCK) {
    import("./mock").then((m) => publish(m.mockEntities(getConfig())));
    return;
  }
  getConnection()
    // subscribe_entities over the WebSocket: Home Assistant pushes every change, no polling.
    .then((conn) => subscribeEntities(conn, publish))
    .catch(() => {
      started = false; // allow a retry on the next subscriber
    });
}

/** All entity states the signed-in user can see, live. `null` until the first update. */
export function useEntities(): HassEntities | null {
  const [ents, setEnts] = useState<HassEntities | null>(latest);
  useEffect(() => {
    listeners.add(setEnts);
    start();
    return () => {
      listeners.delete(setEnts);
    };
  }, []);
  return ents;
}

/** The latest states, waiting for the first update if needed. */
export function whenEntities(): Promise<HassEntities> {
  if (latest) return Promise.resolve(latest);
  start();
  return new Promise((resolve) => {
    const once: Listener = (e) => {
      listeners.delete(once);
      resolve(e);
    };
    listeners.add(once);
  });
}

/** Demo mode only: change a sample entity, as if Home Assistant had pushed an update. */
export function patchMockEntity(entityId: string, state: string) {
  if (!MOCK || !latest?.[entityId]) return;
  const now = new Date().toISOString();
  publish({ ...latest, [entityId]: { ...latest[entityId], state, last_changed: now, last_updated: now } });
}

/** Call `l` with every update from Home Assistant until the returned function is called. */
export function watchEntities(l: Listener): () => void {
  listeners.add(l);
  start();
  if (latest) l(latest);
  return () => {
    listeners.delete(l);
  };
}

/** The most recent states, or null before the first update. */
export function currentEntities(): HassEntities | null {
  return latest;
}
