/**
 * The garage door: live state from the shared subscribe_entities stream (pushed by Home
 * Assistant, no polling), and open/close through the documented cover actions.
 * A door binary_sensor also works, read-only.
 */
import { callService } from "home-assistant-js-websocket";
import { getConnection, MOCK } from "./connection";
import { patchMockEntity, useEntities } from "./entities";

export type DoorState = "open" | "closed" | "opening" | "closing" | "unavailable";

export type Door = {
  state: DoorState;
  /** When the state last changed (HA's last_changed). */
  since: Date | null;
  /** True for a cover that accepts open/close; false for a read-only sensor. */
  controllable: boolean;
  /** False until the first states arrive from Home Assistant. */
  known: boolean;
};

export function useDoor(entityId: string): Door {
  const states = useEntities();
  const e = states?.[entityId];
  let state: DoorState = "unavailable";
  if (e) {
    if (entityId.startsWith("binary_sensor.")) {
      state = e.state === "on" ? "open" : e.state === "off" ? "closed" : "unavailable";
    } else if (["open", "closed", "opening", "closing"].includes(e.state)) {
      state = e.state as DoorState;
    }
  }
  const since = e?.last_changed ? new Date(e.last_changed) : null;
  return {
    state,
    since: since && !isNaN(since.getTime()) ? since : null,
    controllable: entityId.startsWith("cover."),
    known: states !== null,
  };
}

/** cover.open_cover / cover.close_cover. Rejects if Home Assistant reports an error. */
export async function commandDoor(entityId: string, action: "open" | "close"): Promise<void> {
  if (MOCK) {
    // Demo: a cloud opener takes a moment to answer, then the door moves for a few seconds.
    await new Promise((r) => setTimeout(r, 1200));
    patchMockEntity(entityId, action === "open" ? "opening" : "closing");
    setTimeout(() => patchMockEntity(entityId, action === "open" ? "open" : "closed"), 4000);
    return;
  }
  const conn = await getConnection();
  await callService(conn, "cover", action === "open" ? "open_cover" : "close_cover", {}, { entity_id: entityId });
}
