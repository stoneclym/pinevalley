import { useEffect, useRef, useState } from "react";
import type { StatusTileConfig } from "../config";
import { commandDoor, type DoorState, useDoor } from "../ha/door";
import { useConnectionStatus } from "../ha/useStatus";
import { useExit } from "../lib/useExit";
import { GarageClosed, GarageOpen } from "./icons";
import "../voice/VoiceSheet.css"; // shared glass sheet styles
import "./GarageTile.css";

const STATE_TEXT: Record<DoorState, string> = {
  closed: "Closed",
  open: "Open",
  opening: "Opening…",
  closing: "Closing…",
  unavailable: "Offline",
};

/** How long the tile says "Sending…" while waiting for the door to report movement. */
const SENDING_TIMEOUT_MS = 30_000;
/** A confirmation left open closes itself, so a stray tap can't be confirmed later. */
const SHEET_TIMEOUT_MS = 30_000;

type SheetState = "confirm" | "sending" | "error";

function GarageSheet({ action, onConfirm, onClose, sheet, leaving }: {
  action: "open" | "close";
  sheet: SheetState;
  leaving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (sheet !== "confirm") return;
    const t = window.setTimeout(onClose, SHEET_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [sheet, onClose]);

  const verb = action === "open" ? "Open" : "Close";
  return (
    <div className={`sheet-layer ${leaving ? "sheet-leaving" : ""}`} role="presentation">
      <div className="sheet-dim" onClick={sheet === "sending" ? undefined : onClose} />
      <div className="glass sheet garage-sheet" role="alertdialog" aria-modal="true" aria-label={`${verb} the garage`}>
        {sheet === "error" ? (
          <div className="sheet-error">
            <p className="sheet-transcript">Couldn{"’"}t reach the garage</p>
            <p className="quiet">Home Assistant reported an error. The door hasn{"’"}t moved.</p>
          </div>
        ) : (
          <div className="sheet-error">
            <p className="sheet-transcript">{verb} the garage?</p>
            <p className="quiet">
              {sheet === "sending"
                ? "Sending to the garage. It can take a few seconds to start moving."
                : action === "open" ? "The door is closed." : "The door is open."}
            </p>
          </div>
        )}
        {/* Cancel on the left, the action on the right. */}
        <div className="sheet-actions">
          <button type="button" className="glass pill" onClick={onClose} disabled={sheet === "sending"}>Cancel</button>
          <button type="button" className="white-glass pill pill-primary"
            onClick={onConfirm} disabled={sheet === "sending"}>
            {sheet === "sending" ? "Sending…" : sheet === "error" ? "Try again" : verb}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Garage tile: the door's live state first, a button second. A tap only opens a confirmation;
 * nothing moves without the second tap. No commands while the door is moving or offline.
 */
export function GarageTile({ tile, onSheetChange }: { tile: StatusTileConfig; onSheetChange?: (open: boolean) => void }) {
  const live = useDoor(tile.entity_id);
  const status = useConnectionStatus();
  // Never heard from Home Assistant (offline or not set up): say the garage is offline.
  const door = !live.known && (status === "offline" || status === "unconfigured")
    ? { ...live, known: true, state: "unavailable" as DoorState, since: null }
    : live;
  const [sheet, setSheet] = useState<{ action: "open" | "close"; state: SheetState } | null>(null);
  const [sending, setSending] = useState(false); // waiting for the door to report movement
  const sentFrom = useRef<DoorState | null>(null);
  const exit = useExit();
  // Close with the exit animation; the sheet stays mounted until it finishes.
  const closeSheet = () => {
    if (exit.leaving) return;
    exit.leave(() => {
      setSheet(null);
      exit.reset();
    });
  };

  useEffect(() => onSheetChange?.(sheet !== null), [sheet, onSheetChange]);

  // Stop showing "Sending…" once the door reports a new state, or after a timeout.
  useEffect(() => {
    if (sending && door.state !== sentFrom.current) setSending(false);
  }, [door.state, sending]);
  useEffect(() => {
    if (!sending) return;
    const t = window.setTimeout(() => setSending(false), SENDING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [sending]);

  // If the door changes while asking (moved from the wall button or the app), the question is stale.
  useEffect(() => {
    if (sheet?.state !== "confirm") return;
    const valid = (sheet.action === "open" && door.state === "closed") || (sheet.action === "close" && door.state === "open");
    if (!valid) closeSheet();
  }, [door.state, sheet]);

  const moving = door.state === "opening" || door.state === "closing";
  const tappable = door.known && door.controllable && !moving && !sending &&
    (door.state === "open" || door.state === "closed");
  const isOpen = door.state === "open" || door.state === "opening";

  const ask = () => {
    if (!tappable) return;
    setSheet({ action: door.state === "open" ? "close" : "open", state: "confirm" });
  };

  const confirm = async () => {
    if (!sheet) return;
    const action = sheet.action;
    setSheet({ action, state: "sending" });
    try {
      sentFrom.current = door.state;
      await commandDoor(tile.entity_id, action);
      setSending(door.state === sentFrom.current);
      closeSheet();
    } catch (err) {
      console.error(`cover.${action}_cover failed`, err);
      setSheet({ action, state: "error" });
    }
  };

  const text = !door.known ? "" : sending ? "Sending…" : STATE_TEXT[door.state];

  return (
    <>
      <button type="button" onClick={ask} disabled={!tappable}
        className={`glass tile garage garage-${door.state}`}
        aria-label={`${tile.label}: ${door.state === "unavailable" && !sending ? "offline" : text || "loading"}${tappable ? `. Tap to ${door.state === "open" ? "close" : "open"}` : ""}`}>
        {/* Same layout as the Groceries tile: icon top left, state where its badge sits,
            and the label on the bottom line with the other tiles. */}
        <span className="tile-top">
          <span className="tile-icon">{isOpen ? <GarageOpen size={32} /> : <GarageClosed size={32} />}</span>
          <span className="garage-state">{text}</span>
        </span>
        <span className="tile-label">{tile.label}</span>
      </button>
      {sheet && (
        <GarageSheet action={sheet.action} sheet={sheet.state} onConfirm={confirm}
          leaving={exit.leaving}
          onClose={() => { if (sheet.state !== "sending") closeSheet(); }} />
      )}
    </>
  );
}
