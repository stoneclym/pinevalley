import { useEffect, useRef, useState } from "react";
import type { StatusTileConfig } from "../config";
import { commandDoor, type DoorState, useDoor } from "../ha/door";
import { useConnectionStatus } from "../ha/useStatus";
import { formatSince } from "../lib/time";
import { useNow } from "../lib/useNow";
import { GarageClosed, GarageOpen } from "./icons";
import "../voice/VoiceSheet.css"; // shared glass sheet styles
import "./GarageTile.css";

const STATE_TEXT: Record<DoorState, string> = {
  closed: "Closed",
  open: "Open",
  opening: "Opening…",
  closing: "Closing…",
  unavailable: "Garage offline",
};

/** How long the tile says "Sending…" while waiting for the door to report movement. */
const SENDING_TIMEOUT_MS = 30_000;
/** A confirmation left open closes itself, so a stray tap can't be confirmed later. */
const SHEET_TIMEOUT_MS = 30_000;

type SheetState = "confirm" | "sending" | "error";

function GarageSheet({ action, onConfirm, onClose, sheet }: {
  action: "open" | "close";
  sheet: SheetState;
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
    <div className="sheet-layer" role="presentation">
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
        <div className="sheet-actions">
          <span />
          <div className="sheet-buttons">
            <button type="button" className="glass pill" onClick={onClose} disabled={sheet === "sending"}>Cancel</button>
            <button type="button" className={`white-glass pill pill-primary ${action === "open" ? "pill-warm" : ""}`}
              onClick={onConfirm} disabled={sheet === "sending"}>
              {sheet === "sending" ? "Sending…" : sheet === "error" ? "Try again" : verb}
            </button>
          </div>
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
  const now = useNow();
  const live = useDoor(tile.entity_id);
  const status = useConnectionStatus();
  // Never heard from Home Assistant (offline or not set up): say the garage is offline.
  const door = !live.known && (status === "offline" || status === "unconfigured")
    ? { ...live, known: true, state: "unavailable" as DoorState, since: null }
    : live;
  const [sheet, setSheet] = useState<{ action: "open" | "close"; state: SheetState } | null>(null);
  const [sending, setSending] = useState(false); // waiting for the door to report movement
  const sentFrom = useRef<DoorState | null>(null);

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
    if (!valid) setSheet(null);
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
      setSheet(null);
    } catch (err) {
      console.error(`cover.${action}_cover failed`, err);
      setSheet({ action, state: "error" });
    }
  };

  const text = !door.known ? "" : sending ? "Sending…" : STATE_TEXT[door.state];
  const showSince = door.known && door.state !== "unavailable" && !sending && door.since;

  return (
    <>
      <button type="button" onClick={ask} disabled={!tappable}
        className={`glass tile garage garage-${door.state} ${sending ? "garage-sending" : ""} ${isOpen ? "garage-open-tint" : ""}`}
        aria-label={`${tile.label}: ${text || "loading"}${tappable ? `. Tap to ${door.state === "open" ? "close" : "open"}` : ""}`}>
        <span className="garage-top">
          <span className="tile-icon">{isOpen ? <GarageOpen size={32} /> : <GarageClosed size={32} />}</span>
          <span className="garage-label">{tile.label}</span>
        </span>
        <span className="garage-bottom">
          <span className="garage-state">{text}</span>
          {showSince && <span className="garage-since">{formatSince(door.since!, now)}</span>}
        </span>
      </button>
      {sheet && (
        <GarageSheet action={sheet.action} sheet={sheet.state} onConfirm={confirm}
          onClose={() => setSheet((s) => (s?.state === "sending" ? s : null))} />
      )}
    </>
  );
}
