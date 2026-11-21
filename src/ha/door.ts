import { useEntities } from "./entities";

export type DoorState = "open" | "closed" | "opening" | "closing" | "unavailable";

const TEXT: Record<DoorState, string> = {
  open: "Open",
  closed: "Closed",
  opening: "Opening…",
  closing: "Closing…",
  unavailable: "Unavailable",
};

/**
 * State of a garage (or other) door. Works with a `cover.*` entity
 * (states open, closed, opening, closing) or a door `binary_sensor.*` (on means open).
 */
export function useDoor(entityId: string): { state: DoorState; text: string } {
  const e = useEntities()?.[entityId];
  let state: DoorState = "unavailable";
  if (e) {
    if (entityId.startsWith("binary_sensor.")) {
      state = e.state === "on" ? "open" : e.state === "off" ? "closed" : "unavailable";
    } else if (["open", "closed", "opening", "closing"].includes(e.state)) {
      state = e.state as DoorState;
    }
  }
  return { state, text: TEXT[state] };
}
