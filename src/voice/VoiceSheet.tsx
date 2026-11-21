import { useEffect, useRef, useState } from "react";
import type { VoiceConfig } from "../config";
import { CATEGORIES } from "../lib/categorize";
import { createStore, useStore } from "../lib/store";
import { useExit } from "../lib/useExit";
import { Stop } from "../ui/icons";
import { type Item, parseAudio, parseGroceries, voiceConfigured } from "./parse";
import { type Recorder, startRecording } from "./recorder";
import "./VoiceSheet.css";

/** Live microphone level, written by the recorder about 30 times a second. */
export const levelStore = createStore(0);

export function beginRecording(cfg: VoiceConfig | null): Promise<Recorder> {
  return startRecording({
    maxSeconds: cfg?.maxSeconds ?? 30,
    silenceStopSeconds: cfg?.silenceStopSeconds ?? 2,
    onLevel: levelStore.set,
  });
}

export type SheetInput = { kind: "voice"; recorder: Promise<Recorder> } | { kind: "text"; text: string };

type State =
  | { s: "listening" }
  | { s: "working"; label: string }
  | { s: "review"; transcript: string; items: Item[] }
  | { s: "error"; title: string; detail?: string; reason?: string; canRetry: boolean };

const BARS = 13;

function Waveform({ live }: { live: boolean }) {
  const level = useStore(levelStore);
  const history = useRef<number[]>(Array(BARS).fill(0));
  if (live) history.current = [...history.current.slice(1), level];
  return (
    <div className={`wave ${live ? "" : "wave-pulse"}`} aria-hidden="true">
      {history.current.map((l, i) => {
        // Mirror the history so the shape reads as a centred waveform, like the design.
        const v = live ? Math.max(l, history.current[BARS - 1 - i]) : 0.35 + 0.25 * Math.sin(i * 1.3);
        const h = 10 + Math.round(Math.min(1, v * 1.6) * 42);
        return <span key={i} style={{ height: h, opacity: 0.45 + 0.5 * (h / 52), animationDelay: `${i * 60}ms` }} />;
      })}
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
        if (!clip.size) throw new Error(`empty recording · ${r.diagnostics()}`);
        setState({ s: "working", label: "Transcribing" });
        if (!voiceConfigured(cfg)) {
          setState({
            s: "error",
            title: "Voice isn’t set up yet",
            detail: `The microphone worked (${Math.round(clip.size / 1024)} KB recorded). Sorting spoken lists needs the parse-groceries function. Type items in the bar for now.`,
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
          e?.name === "NotAllowedError"
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
            <div className="sheet-actions">
              {state.s === "listening" ? (
                <button type="button" className="glass sheet-stop" aria-label="Stop listening" onClick={() => recorder.current?.stop()}>
                  <Stop size={28} />
                </button>
              ) : <span />}
              <div className="sheet-buttons">
                <button type="button" className="glass pill" onClick={cancel}>Cancel</button>
              </div>
            </div>
          </>
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
            </div>
            <div className="sheet-actions">
              <span className="sheet-hint">Tap an item to remove it</span>
              {/* counts and adds only chips that aren't on their way out */}
              <div className="sheet-buttons">
                <button type="button" className="glass pill" onClick={cancel}>Cancel</button>
                <button type="button" className="white-glass pill pill-primary" disabled={!kept.length || adding}
                  onClick={() => add(kept)}>
                  {kept.length === 1 ? "Add 1 Item" : `Add ${kept.length} Items`}
                </button>
              </div>
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
              <span />
              <div className="sheet-buttons">
                <button type="button" className="glass pill" onClick={cancel}>Cancel</button>
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
