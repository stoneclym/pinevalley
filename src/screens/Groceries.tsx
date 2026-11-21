import { type FormEvent, useEffect, useState } from "react";
import type { ScreenName } from "../App";
import type { HubConfig } from "../config";
import { COPY } from "../copy";
import { addItems, clearCompleted, setStatus, type TodoItem, useTodo } from "../ha/todo";
import { CATEGORIES, categorize } from "../lib/categorize";
import { hasSeparators, parseGroceriesLocal } from "../lib/parseGroceries";
import { BackHeader } from "../ui/BackHeader";
import { Check, Mic, Sparkle } from "../ui/icons";
import { beginRecording, type SheetInput, VoiceSheet } from "../voice/VoiceSheet";
import { Screen } from "./Screen";
import "./Groceries.css";

function Row({ item }: { item: TodoItem }) {
  const done = item.status === "completed";
  return (
    <button type="button" className={`g-row ${done ? "g-row-done" : ""}`}
      onClick={() => setStatus(item, done ? "needs_action" : "completed").catch((e) => console.error(e))}
      aria-label={`${item.summary}, ${done ? "checked" : "not checked"}`}>
      <span className={done ? "g-check-on" : "g-check"}>{done && <Check size={20} color="#F4EEE6" />}</span>
      <span className="g-name">{item.summary}</span>
    </button>
  );
}

export function Groceries({ config, go, onSheetChange }: {
  config: HubConfig;
  go: (s: ScreenName) => void;
  onSheetChange: (open: boolean) => void;
}) {
  const { items, loaded } = useTodo(config.groceryList);
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState<SheetInput | null>(null);
  useEffect(() => onSheetChange(sheet !== null), [sheet, onSheetChange]);

  const open = items.filter((i) => i.status !== "completed");
  const done = items.filter((i) => i.status === "completed");
  const groups = CATEGORIES
    .map((c) => ({ c, rows: open.filter((i) => categorize(i.summary) === c) }))
    .filter((g) => g.rows.length);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    if (hasSeparators(t)) {
      setSheet({ kind: "text", text: t });
    } else {
      // A single simple item goes straight on the list.
      const [one] = parseGroceriesLocal(t);
      if (one) addItems([one.name]).catch((err) => console.error(err));
    }
  };

  // Started here, inside the tap, so Safari lets the audio start.
  const startVoice = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    setSheet({ kind: "voice", recorder: beginRecording(config.voice) });
  };

  return (
    <Screen calm className="detail">
      <BackHeader title="Groceries" onBack={() => go("home")}
        detail={open.length ? `${open.length} ${open.length === 1 ? "item" : "items"}` : undefined} />

      <form className="glass addbar" onSubmit={submit}>
        <Sparkle size={26} color="var(--ink-2)" />
        <label className="addbar-field">
          <span className="sr-only">Add items</span>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder={COPY.addPlaceholder}
            enterKeyHint="done" autoComplete="off" autoCorrect="on" autoCapitalize="sentences" spellCheck={false} />
        </label>
        <button type="button" className="white-glass addbar-mic" aria-label="Speak items" onClick={startVoice}>
          <Mic size={26} />
        </button>
      </form>

      <div className="g-scroll">
        {loaded && !items.length && COPY.emptyList && <p className="quiet g-empty">{COPY.emptyList}</p>}
        <div className="g-columns">
          {groups.map(({ c, rows }) => (
            <section key={c} className="glass g-card">
              <h2 className="caps g-card-title">{c}</h2>
              {rows.map((i) => <Row key={i.uid} item={i} />)}
            </section>
          ))}
          {done.length > 0 && (
            <section className="g-completed">
              <div className="g-completed-head">
                <h2 className="caps">Completed · {done.length}</h2>
                <button type="button" className="glass g-clear" onClick={() => clearCompleted().catch((e) => console.error(e))}>
                  Clear
                </button>
              </div>
              {done.map((i) => <Row key={i.uid} item={i} />)}
            </section>
          )}
        </div>
      </div>

      {sheet && (
        <VoiceSheet input={sheet} cfg={config.voice} onAdd={addItems} onClose={() => setSheet(null)} />
      )}
    </Screen>
  );
}
