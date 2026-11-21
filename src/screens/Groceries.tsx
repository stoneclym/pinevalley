import { type FormEvent, useEffect, useState } from "react";
import type { ScreenName } from "../App";
import type { HubConfig } from "../config";
import { COPY } from "../copy";
import { addItems, clearCompleted, setStatus, type TodoItem, useTodo } from "../ha/todo";
import { CATEGORIES } from "../lib/categorize";
import { categoryFor } from "../lib/categoryMemory";
import { hasSeparators, parseGroceriesLocal } from "../lib/parseGroceries";
import { BackHeader } from "../ui/BackHeader";
import { Check, Mic, Sparkle } from "../ui/icons";
import { beginRecording, type SheetInput, VoiceSheet } from "../voice/VoiceSheet";
import { Screen } from "./Screen";
import "./Groceries.css";

// Card height estimate from the design: padding and title about 64px, then 60px per row.
const GAP = 18;
const cardHeight = (rows: number) => 64 + rows * 60;

/**
 * Split cards into two balanced columns, reading down the left column and then the right,
 * in category order, the way the design lays them out. Completed always ends the right column.
 * Plain flex columns instead of CSS multi-column: iPad Safari draws blurred cards inside
 * multi-column layout glitchily and sometimes not at all.
 */
function splitColumns<T extends { rows: unknown[] }>(groups: T[], completedRows: number): [T[], T[]] {
  const heights = groups.map((g) => cardHeight(g.rows.length) + GAP);
  const completed = completedRows ? 40 + completedRows * 60 : 0;
  const half = (heights.reduce((a, h) => a + h, 0) + completed) / 2;
  const left: T[] = [];
  const right: T[] = [];
  let used = 0;
  groups.forEach((g, i) => {
    // Stay in the left column while this card's middle still falls in the first half.
    if (right.length === 0 && (left.length === 0 || used + heights[i] / 2 <= half)) {
      left.push(g);
      used += heights[i];
    } else {
      right.push(g);
    }
  });
  return [left, right];
}

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
    .map((c) => ({ c, rows: open.filter((i) => categoryFor(i.summary) === c) }))
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
          {splitColumns(groups, done.length).map((col, ci) => (
            <div key={ci} className="g-col">
              {col.map(({ c, rows }) => (
                <section key={c} className="glass g-card">
                  <h2 className="caps g-card-title">{c}</h2>
                  {rows.map((i) => <Row key={i.uid} item={i} />)}
                </section>
              ))}
              {/* Completed sits below the cards in the right column, as designed. */}
              {ci === 1 && done.length > 0 && (
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
          ))}
        </div>
      </div>

      {sheet && (
        <VoiceSheet input={sheet} cfg={config.voice} onAdd={addItems} onClose={() => setSheet(null)} />
      )}
    </Screen>
  );
}
