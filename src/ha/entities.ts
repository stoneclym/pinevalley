import { useEffect, useState } from "react";
import { type HassEntities, subscribeEntities } from "home-assistant-js-websocket";
import { getConnection, MOCK } from "./connection";
import { MOCK_ENTITIES } from "./mock";

type Listener = (e: HassEntities) => void;

// One shared subscription for the whole app; the last known states stay on screen
// while HA is unreachable.
let latest: HassEntities | null = MOCK ? MOCK_ENTITIES : null;
const listeners = new Set<Listener>();
let started = false;

function start() {
  if (started || MOCK) return;
  started = true;
  getConnection()
    .then((conn) =>
      subscribeEntities(conn, (ents) => {
        latest = ents;
        listeners.forEach((l) => l(ents));
      }),
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
