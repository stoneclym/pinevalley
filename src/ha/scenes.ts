import { callService } from "home-assistant-js-websocket";
import { getConnection, MOCK } from "./connection";

/** Runs a scene (scene.turn_on) or script (script.turn_on). The app never defines them. */
export async function runScene(entityId: string): Promise<void> {
  const domain = entityId.split(".")[0];
  if (domain !== "scene" && domain !== "script") {
    throw new Error(`Not a scene or script: ${entityId}`);
  }
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    return;
  }
  const conn = await getConnection();
  await callService(conn, domain, "turn_on", {}, { entity_id: entityId });
}
