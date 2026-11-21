import { type FormEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { VoiceConfig } from "../config";
import { CATEGORIES } from "../lib/categorize";
import { useExit } from "../lib/useExit";
import { type Item, parseAudio, parseGroceries, voiceConfigured } from "./parse";
import { type Recorder, startRecording } from "./recorder";
import { Keyboard } from "../ui/icons";
import "./VoiceSheet.css";

export function beginRecording(cfg: VoiceConfig | null): Promise<Recorder> {
  return startRecording({ maxSeconds: cfg?.maxSeconds ?? 30 });
}

export type SheetInput = { kind: "voice"; recorder: Promise<Recorder> } | { kind: "text"; text: string };

type State =
  | { s: "listening" }
  | { s: "working"; label: string }
  | { s: "review"; transcript: string; items: Item[] }
  | { s: "typing" }
  | { s: "error"; title: string; detail?: string; reason?: string; canRetry: boolean };

const BARS = 13;

/**
 * A decorative waveform: it moves while listening to show the app is alive, but it doesn't
 * read the microphone, so it can't disturb recording on iOS. While transcribing it settles
 * into a soft pulse.
 */
function Waveform({ live }: { live: boolean }) {
  return (
    <div className={`wave ${live ? "wave-live" : "wave-pulse"}`} aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} style={{ animationDelay: `${(i * 97) % 700}ms`, animationDuration: `${620 + ((i * 131) % 420)}ms` }} />
      ))}
    </div>
  );
}

export function VoiceSheet({ input, cfg, onAdd, onClose }: {
  input: SheetInput;
  cfg: VoiceConfig | null;
  onAdd: (items: Item[]) => Promise<void>;
  onClose: () => void;
}) {
  const [state, setState] = useState<State>(input.kind === "voice" ? { s: "listening" } : { s: "working", label: "Sorting" });
  const [adding, setAdding] = useState(false);
  const recorder = useRef<Recorder | null>(null);
  const alive = useRef(true);
  const { leaving, leave } = useExit();

  const listen = (rec: Promise<Recorder>) => {
    setState({ s: "listening" });
    rec
      .then(async (r) => {
        recorder.current = r;
        const clip = await r.result;
        recorder.current = null;
        if (!clip || !alive.current) return; // cancelled
        setState({ s: "working", label: "Transcribing" });
        if (!voiceConfigured(cfg)) {
          setState({
            s: "error",
            title: "Voice isn’t set up yet",
            detail: `The microphone worked (${Math.round(clip.size / 1024)} KB recorded). Sorting spoken lists needs the parse-groceries function. Type your items for now.`,
            canRetry: false,
          });
          return;
        }
        const res = await parseAudio(cfg, clip);
        if (!alive.current) return;
        if (!res.items.length) throw new Error("no items");
        setState({ s: "review", transcript: res.transcript, items: res.items });
      })
      .catch((err: unknown) => {
        if (!alive.current) return;
        console.error("voice failed", err);
        const e = err as { name?: string; message?: string };
        // Show the real reason in small print, so a failure on the iPad can be diagnosed.
        const reason = e?.name && e.name !== "Error" ? `${e.name}: ${e.message ?? ""}` : (e?.message ?? String(err));
        setState(
          e?.name === "MicCutError"
            ? { s: "error", title: "The microphone stopped", detail: "iOS cut the microphone off. Try again, or type your items instead.", reason, canRetry: true }
            : e?.name === "NotAllowedError"
            ? { s: "error", title: "Microphone is off", detail: "Allow the microphone for this app, then try again.", reason, canRetry: true }
            : e?.name === "NotFoundError" || e?.name === "NotReadableError" || e?.name === "AbortError"
              ? { s: "error", title: "The microphone didn’t start", detail: "Close the app completely and open it again. If that doesn’t help, restart the iPad.", reason, canRetry: true }
              : { s: "error", title: "Couldn’t catch that", reason, canRetry: true },
        );
      });
  };

  useEffect(() => {
    alive.current = true;
    if (input.kind === "voice") listen(input.recorder);
    else {
      parseGroceries(input.text, cfg).then((items) => {
        if (!alive.current) return;
        setState(items.length
          ? { s: "review", transcript: input.text, items }
          : { s: "error", title: "Couldn’t find any items", canRetry: false });
      });
    }
    return () => {
      alive.current = false;
      recorder.current?.cancel(); // releases the microphone
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancel = () => {
    recorder.current?.cancel();
    leave(onClose);
  };

  // Keyboard backup. The field is focused inside the tap, so iPadOS shows the keyboard.
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const startTyping = () => {
    recorder.current?.cancel();
    recorder.current = null;
    flushSync(() => setState({ s: "typing" }));
    inputRef.current?.focus();
  };
  const submitTyped = (e?: FormEvent) => {
    e?.preventDefault();
    const text = typed.trim();
    if (!text) return;
    inputRef.current?.blur();
    setState({ s: "working", label: "Sorting" });
    parseGroceries(text, cfg).then((items) => {
      if (!alive.current) return;
      setState(items.length
        ? { s: "review", transcript: text, items }
        : { s: "error", title: "Couldn\u2019t find any items", detail: "Try naming them, like \u201Cmilk, eggs, bread\u201D.", canRetry: true });
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
      setState({ s: "error", title: "Couldn’t add those items", detail: "Home Assistant didn’t respond. Try again in a moment.", canRetry: false });
    }
  };

  // Chips that were tapped play a short exit before they are removed.
  const [removing, setRemoving] = useState<Set<Item>>(new Set());
  // Stable keys per chip, so removing one doesn't re-animate the rest.
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
        {(state.s === "listening" || state.s === "working") && (
          <>
            <div className="sheet-status">
              <Waveform live={state.s === "listening"} />
              <span className="sheet-label">{state.s === "listening" ? "Listening" : state.label}</span>
            </div>
            {/* Cancel on the left; Type instead and Done (stop listening) on the right. */}
            <div className="sheet-actions">
              <button type="button" className="glass pill" onClick={cancel}>Cancel</button>
              {state.s === "listening" ? (
                <div className="sheet-buttons">
                  <button type="button" className="glass pill pill-icon" onClick={startTyping} aria-label="Type instead">
                    <Keyboard size={24} /> Type
                  </button>
                  <button type="button" className="white-glass pill pill-primary" onClick={() => recorder.current?.stop()}>
                    Done
                  </button>
                </div>
              ) : <span />}
            </div>
          </>
        )}

        {state.s === "typing" && (
          <form onSubmit={submitTyped} className="sheet-typing">
            <p className="sheet-transcript">What should we add?</p>
            <input ref={inputRef} className="sheet-input" type="text" value={typed} onChange={(e) => setTyped(e.target.value)}
              placeholder="milk, eggs and stuff for tacos" enterKeyHint="done" autoComplete="off" autoCorrect="on"
              autoCapitalize="sentences" spellCheck={false} aria-label="Items to add" />
            <div className="sheet-actions">
              <button type="button" className="glass pill" onClick={cancel}>Cancel</button>
              <button type="submit" className="white-glass pill pill-primary" disabled={!typed.trim()}>Sort Items</button>
            </div>
          </form>
        )}

        {state.s === "review" && (
          <>
            {state.transcript && <p className="sheet-transcript">{"“"}{state.transcript}{"”"}</p>}
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
              {/* counts and adds only chips that aren't on their way out */}
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
              {state.reason && <p className="sheet-reason">{state.reason}</p>}
            </div>
            <div className="sheet-actions">
              <button type="button" className="glass pill" onClick={cancel}>Cancel</button>
              <div className="sheet-buttons">
                <button type="button" className="glass pill pill-icon" onClick={startTyping}>
                  <Keyboard size={24} /> Type instead
                </button>
                {state.canRetry && (
                  <button type="button" className="white-glass pill pill-primary" onClick={() => listen(beginRecording(cfg))}>
                    Try again
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
