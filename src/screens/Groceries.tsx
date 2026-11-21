import { useEffect, useRef, useState } from "react";
import type { ScreenName } from "../App";
import type { HubConfig } from "../config";
import { COPY } from "../copy";
import { addItems, clearCompleted, setStatus, type TodoItem, useTodo } from "../ha/todo";
import { CATEGORIES } from "../lib/categorize";
import { categoryFor } from "../lib/categoryMemory";
import { type Presence, useFlip, usePresence } from "../lib/motion";
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
function splitColumns<T extends { item: { rows: unknown[] } }>(groups: T[], completedRows: number): [T[], T[]] {
  const heights = groups.map((g) => cardHeight(g.item.rows.length) + GAP);
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

/** Rows animate in when added and slide out when checked off or removed. */
function Rows({ items, seen }: { items: TodoItem[]; seen: Set<string> }) {
  const rows = usePresence(items, (i) => i.uid);
  return <>{rows.map((r) => <Row key={r.key} item={r.item} leaving={r.leaving} seen={seen} />)}</>;
}

function Row({ item, leaving, seen }: { item: TodoItem; leaving?: boolean; seen: Set<string> }) {
  const done = item.status === "completed";
  // Animate in only rows that weren't on screen before (a new item, or one just checked/unchecked).
  const id = `${item.uid}:${item.status}`;
  const [isNew] = useState(() => !seen.has(id));
  useEffect(() => {
    seen.add(id);
  }, [id, seen]);
  return (
    <button type="button" className={`g-row ${done ? "g-row-done" : ""} ${isNew ? "g-row-new" : ""} ${leaving ? "g-row-leaving" : ""}`}
      disabled={leaving}
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
  const [sheet, setSheet] = useState<SheetInput | null>(null);
  useEffect(() => onSheetChange(sheet !== null), [sheet, onSheetChange]);

  const columnsRef = useRef<HTMLDivElement>(null);
  // Rows already on screen when the list first loads don't animate in.
  const seen = useRef<Set<string> | null>(null);
  if (!seen.current && loaded) seen.current = new Set(items.map((i) => `${i.uid}:${i.status}`));
  const open = items.filter((i) => i.status !== "completed");
  const done = items.filter((i) => i.status === "completed");
  const groups = CATEGORIES
    .map((c) => ({ c, rows: open.filter((i) => categoryFor(i.summary) === c) }))
    .filter((g) => g.rows.length);
  const cards = usePresence(groups, (g) => g.c);
  const completed = usePresence(done.length ? [done] : [], () => "completed");
  useFlip(columnsRef);

  // Started here, inside the tap, so Safari lets the audio start.
  const startVoice = () => {
    setSheet({ kind: "voice", recorder: beginRecording(config.voice) });
  };

  return (
    <Screen calm className="detail">
      <BackHeader title="Groceries" onBack={() => go("home")}
        detail={open.length ? `${open.length} ${open.length === 1 ? "item" : "items"}` : undefined} />

      {/* The whole bar opens voice mode. There is no text field, so the keyboard never appears. */}
      <button type="button" className="glass addbar" onClick={startVoice} aria-label="Add items by voice">
        <Sparkle size={26} color="var(--ink-2)" />
        <span className="addbar-text">{COPY.addPlaceholder}</span>
        <span className="white-glass addbar-mic" aria-hidden="true">
          <Mic size={26} />
        </span>
      </button>

      <div className="g-scroll">
        {loaded && !items.length && COPY.emptyList && <p className="quiet g-empty">{COPY.emptyList}</p>}
        <div className="g-columns" ref={columnsRef}>
          {splitColumns(cards, done.length).map((col, ci) => (
            <div key={ci} className="g-col">
              {col.map(({ item: { c, rows }, leaving }) => (
                <section key={c} data-flip={`card:${c}`} className={`glass g-card ${leaving ? "g-card-leaving" : ""}`}>
                  <h2 className="caps g-card-title">{c}</h2>
                  <Rows items={rows} seen={seen.current ?? new Set()} />
                </section>
              ))}
              {/* Completed sits below the cards in the right column, as designed. */}
              {ci === 1 && completed.map(({ item: list, leaving }: Presence<TodoItem[]>) => (
                <section key="completed" data-flip="completed" className={`g-completed ${leaving ? "g-card-leaving" : ""}`}>
                  <div className="g-completed-head">
                    <h2 className="caps">Completed · {list.length}</h2>
                    <button type="button" className="glass g-clear" disabled={leaving}
                      onClick={() => clearCompleted().catch((e) => console.error(e))}>
                      Clear
                    </button>
                  </div>
                  <Rows items={list} seen={seen.current ?? new Set()} />
                </section>
              ))}
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
