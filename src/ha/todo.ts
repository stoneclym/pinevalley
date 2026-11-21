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

export async function addItems(input: string[]): Promise<void> {
  // Skip anything already on the list and not yet checked off.
  const onList = new Set(store.get().items.filter((i) => i.status !== "completed").map((i) => i.summary.trim().toLowerCase()));
  const names = input.filter((n) => !onList.has(n.trim().toLowerCase()));
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

export async function setStatus(item: TodoItem, status: TodoStatus): Promise<void> {
  // Show the change at once; the subscription confirms (or corrects) it a moment later.
  localChange((items) => items.map((i) => (i.uid === item.uid ? { ...i, status } : i)));
  if (MOCK) return;
  await call("update_item", { item: item.uid, status });
}

export async function clearCompleted(): Promise<void> {
  localChange((items) => items.filter((i) => i.status !== "completed"));
  if (MOCK) return;
  await call("remove_completed_items", {});
}
