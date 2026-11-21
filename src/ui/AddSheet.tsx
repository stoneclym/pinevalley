import { type FormEvent, type RefObject, useRef, useState } from "react";
import type { VoiceConfig } from "../config";
import { CATEGORIES } from "../lib/categorize";
import { useExit } from "../lib/useExit";
import { type Item, parseGroceries } from "../voice/parse";
import "./Sheet.css";

type State =
  | { s: "typing" }
  | { s: "sorting" }
  | { s: "review"; text: string; items: Item[] }
  | { s: "error"; title: string; detail?: string };

/** An iOS-style activity indicator: twelve spokes fading round in a circle. */
function Spinner() {
  return (
    <span className="spinner" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} style={{ transform: `rotate(${i * 30}deg)`, animationDelay: `${(i - 12) * 83}ms` }} />
      ))}
    </span>
  );
}

/**
 * Add items by typing (or with the keyboard's own dictation key). The list is sorted by the
 * parse-groceries function when it's set up, or by the local rules otherwise, and shown as
 * chips to review before adding. The microphone recorder is shelved (src/voice/recorder.ts).
 *
 * `inputRef` belongs to the parent, which focuses the field inside the tap that opened the
 * sheet: iPadOS only shows the keyboard for a focus that happens during a tap.
 */
export function AddSheet({ cfg, onAdd, onClose, inputRef }: {
  cfg: VoiceConfig | null;
  onAdd: (items: Item[]) => Promise<void>;
  onClose: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [state, setState] = useState<State>({ s: "typing" });
  const [typed, setTyped] = useState("");
  const [adding, setAdding] = useState(false);
  const { leaving, leave } = useExit();

  const cancel = () => {
    inputRef.current?.blur();
    leave(onClose);
  };

  const backToTyping = () => {
    setState({ s: "typing" });
    // Still inside the tap, so the keyboard comes back up.
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = typed.trim();
    if (!text) return;
    inputRef.current?.blur();
    setState({ s: "sorting" });
    parseGroceries(text, cfg)
      .then((items) => {
        setState(items.length
          ? { s: "review", text, items }
          : { s: "error", title: "Couldn’t find any items", detail: "Try naming them, like “milk, eggs, bread”." });
      })
      .catch((err) => {
        console.error("sorting failed", err);
        setState({ s: "error", title: "Couldn’t sort that", detail: "Try again in a moment." });
      });
  };

  const add = async (items: Item[]) => {
    setAdding(true);
    try {
      await onAdd(items); // names with the categories shown here, so the list matches
      leave(onClose);
    } catch (err) {
      console.error("add items failed", err);
      setAdding(false);
      setState({ s: "error", title: "Couldn’t add those items", detail: "Home Assistant didn’t respond. Try again in a moment." });
    }
  };

  // Chips that were tapped play a short exit before they are removed.
  const [removing, setRemoving] = useState<Set<Item>>(new Set());
  const ids = useRef(new WeakMap<Item, number>());
  const nextId = useRef(0);
  const idOf = (it: Item) => {
    if (!ids.current.has(it)) ids.current.set(it, nextId.current++);
    return ids.current.get(it)!;
  };
  const removeChip = (it: Item) => {
    if (state.s !== "review" || removing.has(it)) return;
    setRemoving((r) => new Set(r).add(it));
    window.setTimeout(() => {
      setState((st) => (st.s === "review" ? { ...st, items: st.items.filter((x) => x !== it) } : st));
      setRemoving((r) => {
        const n = new Set(r);
        n.delete(it);
        return n;
      });
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 200);
  };
  const kept = state.s === "review" ? state.items.filter((it) => !removing.has(it)) : [];

  return (
    <div className={`sheet-layer ${leaving ? "sheet-leaving" : ""}`} role="presentation">
      <div className="sheet-dim" />
      <div className="glass sheet" role="dialog" aria-modal="true" aria-label="Add items">
        {/* The field stays mounted (hidden when not typing) so the parent can focus it during the tap. */}
        <form onSubmit={submit} className="sheet-typing" hidden={state.s !== "typing"}>
          <p className="sheet-transcript">What should we add?</p>
          <input ref={inputRef} className="sheet-input" type="text" value={typed} onChange={(e) => setTyped(e.target.value)}
            placeholder="milk, eggs and stuff for tacos" enterKeyHint="done" autoComplete="off" autoCorrect="on"
            autoCapitalize="sentences" spellCheck={false} aria-label="Items to add" />
          <p className="sheet-hint">Type, or tap the microphone on the keyboard to dictate.</p>
          <div className="sheet-actions">
            <button type="button" className="glass pill" onClick={cancel}>Cancel</button>
            <button type="submit" className="white-glass pill pill-primary" disabled={!typed.trim()}>Sort Items</button>
          </div>
        </form>

        {state.s === "sorting" && (
          <>
            <div className="sheet-status">
              <Spinner />
              <span className="sheet-label">Sorting your list{"…"}</span>
            </div>
            <div className="sheet-actions">
              <button type="button" className="glass pill" onClick={cancel}>Cancel</button>
              <span />
            </div>
          </>
        )}

        {state.s === "review" && (
          <>
            <p className="sheet-transcript">{"“"}{state.text}{"”"}</p>
            <div className="sheet-divider" />
            <div className="sheet-groups">
              {CATEGORIES.filter((c) => state.items.some((i) => i.category === c)).map((c) => (
                <div key={c} className="sheet-group">
                  <span className="caps sheet-cat">{c}</span>
                  <div className="sheet-chips">
                    {state.items.map((it, idx) => it.category === c && (
                      <button key={idOf(it)} type="button" className={`chip ${removing.has(it) ? "chip-leaving" : ""}`}
                        style={{ animationDelay: removing.has(it) ? "0ms" : `${idx * 45}ms` }}
                        onClick={() => removeChip(it)} aria-label={`Remove ${it.name}`}>
                        {it.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {state.items.length === 0 && <p className="quiet">All items removed.</p>}
              {state.items.length > 0 && <p className="sheet-hint">Tap an item to remove it</p>}
            </div>
            <div className="sheet-actions">
              <button type="button" className="glass pill" onClick={cancel}>Cancel</button>
              <button type="button" className="white-glass pill pill-primary" disabled={!kept.length || adding}
                onClick={() => add(kept)}>
                {kept.length === 1 ? "Add 1 Item" : `Add ${kept.length} Items`}
              </button>
            </div>
          </>
        )}

        {state.s === "error" && (
          <>
            <div className="sheet-error">
              <p className="sheet-transcript">{state.title}</p>
              {state.detail && <p className="quiet">{state.detail}</p>}
            </div>
            <div className="sheet-actions">
              <button type="button" className="glass pill" onClick={cancel}>Cancel</button>
              <button type="button" className="white-glass pill pill-primary" onClick={backToTyping}>Edit List</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
