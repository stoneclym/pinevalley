import { useEffect, useRef, useState } from "react";
import type { SceneConfig } from "../config";
import { useEntities } from "./entities";
import { startScene } from "./scenes";

export type SceneRunState = "idle" | "starting" | "running" | "done" | "error";

/**
 * Runs a scene or script from a tile or button: "running" until Home Assistant reports the
 * script finished, then `onDone` (or a short "done" state), or "error" for ~2.6 s on failure.
 * `missing` is true when the entity isn't in Home Assistant (show a quiet "not set up").
 */
export function useSceneRun(scene: SceneConfig, onDone?: () => void) {
  const states = useEntities();
  const missing = states !== null && !states[scene.entity_id];
  const [state, setState] = useState<SceneRunState>("idle");
  const timer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const settle = (s: SceneRunState, ms: number) => {
    setState(s);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), ms);
  };

  const busy = state === "starting" || state === "running";
  const press = async () => {
    if (missing || busy) return;
    clearTimeout(timer.current);
    setState("starting");
    try {
      const run = await startScene(scene.entity_id);
      setState("running");
      await run.finished;
      if (onDone) {
        setState("idle");
        onDone();
      } else {
        settle("done", 1500);
      }
    } catch (err) {
      console.error(`Scene ${scene.entity_id} failed`, err);
      settle("error", 2600);
    }
  };

  return { state, missing, busy, press };
}
