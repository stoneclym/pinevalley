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
    .then((conn) =>
      subscribeEntities(conn, publish),
    )
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
