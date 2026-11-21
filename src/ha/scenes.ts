/**
 * Scenes and scripts. The app only triggers them; their contents live in Home Assistant.
 *
 * A script entity is `on` while it runs and `off` when done. `startScene` resolves once the
 * call is accepted and returns `finished`, which resolves when Home Assistant reports the
 * script has finished (state back to `off` after a new run). Morning can take ~30 seconds,
 * because it waits for The Frame to wake before switching to Art Mode.
 */
import { callService } from "home-assistant-js-websocket";
import { getConnection, MOCK } from "./connection";
import { currentEntities, patchMockEntity, watchEntities } from "./entities";

const FINISH_TIMEOUT_MS = 120_000;

export type SceneRun = { finished: Promise<void> };

function waitForScript(entityId: string, triggeredBefore: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    let sawOn = false;
    let stop = () => {};
    const timer = window.setTimeout(() => {
      stop();
      reject(new Error(`${entityId} did not finish in time`));
    }, FINISH_TIMEOUT_MS);
    stop = watchEntities((states) => {
      const e = states[entityId];
      if (!e) return;
      if (e.state === "on") sawOn = true;
      // Finished: it was seen running, or it already ran (new last_triggered) and is off again.
      const ranAgain = e.attributes.last_triggered !== undefined && e.attributes.last_triggered !== triggeredBefore;
      if (e.state === "off" && (sawOn || ranAgain)) {
        clearTimeout(timer);
        stop();
        resolve();
      }
    });
  });
}

export async function startScene(entityId: string): Promise<SceneRun> {
  const domain = entityId.split(".")[0];
  if (domain !== "scene" && domain !== "script") throw new Error(`Not a scene or script: ${entityId}`);

  if (MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    if (domain === "scene") return { finished: Promise.resolve() };
    const finished = waitForScript(entityId, undefined);
    patchMockEntity(entityId, "on");
    setTimeout(() => patchMockEntity(entityId, "off"), entityId.includes("morning") ? 4500 : 3000);
    return { finished };
  }

  const triggeredBefore = currentEntities()?.[entityId]?.attributes.last_triggered;
  const finished = domain === "script" ? waitForScript(entityId, triggeredBefore) : Promise.resolve();
  finished.catch(() => {}); // handled by the caller; avoid an unhandled rejection if the call fails
  const conn = await getConnection();
  await callService(conn, domain, "turn_on", {}, { entity_id: entityId });
  return { finished };
}
