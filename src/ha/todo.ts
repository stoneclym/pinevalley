/**
 * The grocery list: an HA to-do entity (normally todo.shopping_list).
 *
 * Live list: the `todo/item/subscribe` WebSocket command the HA frontend uses. Every message
 * carries the full list. Changes go through the documented to-do actions:
 * todo.add_item, todo.update_item (status), todo.remove_completed_items.
 * Categories are not stored in HA; screens compute them with categorize().
 */
import { useEffect } from "react";
import { callService } from "home-assistant-js-websocket";
import type { Category } from "../lib/categorize";
import { rememberCategories } from "../lib/categoryMemory";
import { createStore, useStore } from "../lib/store";
import { getConnection, MOCK } from "./connection";

export type TodoStatus = "needs_action" | "completed";
export type TodoItem = { uid: string; summary: string; status: TodoStatus };

type TodoState = { items: TodoItem[]; loaded: boolean };
const store = createStore<TodoState>({ items: [], loaded: false });

let entityId = "";
let started = false;

function start(id: string) {
  if (started) return;
  started = true;
  entityId = id;
  if (MOCK) {
    import("./mock").then((m) => store.set({ items: m.mockTodoItems(), loaded: true }));
    return;
  }
  getConnection()
    .then((conn) =>
      // The library re-subscribes on its own after a reconnect.
      conn.subscribeMessage<{ items: TodoItem[] }>(
        (msg) => store.set({ items: msg.items ?? [], loaded: true }),
        { type: "todo/item/subscribe", entity_id: entityId },
        { resubscribe: true },
      ),
    )
    .catch((err) => {
      console.error("todo/item/subscribe failed", err);
      started = false;
    });
}

export function useTodo(id: string): TodoState {
  useEffect(() => start(id), [id]);
  return useStore(store);
}

// ---- Changes. Shown locally at once; in mock mode they never reach HA. ----

function localChange(fn: (items: TodoItem[]) => TodoItem[]) {
  store.set({ items: fn(store.get().items), loaded: true });
}

async function call(service: string, data: object) {
  const conn = await getConnection();
  await callService(conn, "todo", service, data, { entity_id: entityId });
}

/** Items to add: plain names, or names with the category the review sheet showed. */
export type NewItem = string | { name: string; category: Category };

export async function addItems(input: NewItem[]): Promise<void> {
  const withCategory = input.filter((i): i is { name: string; category: Category } => typeof i !== "string");
  rememberCategories(withCategory);
  // Skip anything already on the list and not yet checked off.
  const onList = new Set(store.get().items.filter((i) => i.status !== "completed").map((i) => i.summary.trim().toLowerCase()));
  const names = input
    .map((i) => (typeof i === "string" ? i : i.name))
    .filter((n) => !onList.has(n.trim().toLowerCase()));
  if (!names.length) return;
  if (MOCK) {
    localChange((items) => [
      ...items,
      ...names.map((summary) => ({ uid: crypto.randomUUID(), summary, status: "needs_action" as const })),
    ]);
    return;
  }
  for (const item of names) await call("add_item", { item });
}

/** Show a change at once; if Home Assistant rejects it, put the list back as it was. */
async function optimistic(fn: (items: TodoItem[]) => TodoItem[], send: () => Promise<void>) {
  const before = store.get();
  localChange(fn);
  if (MOCK) return;
  try {
    await send(); // the subscription then confirms the change with Home Assistant's own list
  } catch (err) {
    store.set(before);
    throw err;
  }
}

export function setStatus(item: TodoItem, status: TodoStatus): Promise<void> {
  return optimistic(
    (items) => items.map((i) => (i.uid === item.uid ? { ...i, status } : i)),
    () => call("update_item", { item: item.uid, status }),
  );
}

export function clearCompleted(): Promise<void> {
  return optimistic(
    (items) => items.filter((i) => i.status !== "completed"),
    () => call("remove_completed_items", {}),
  );
}
