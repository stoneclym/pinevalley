/**
 * Remembers the category the review sheet showed for an item, so the grocery list puts it in
 * the same card. Home Assistant stores only the item name, so this lives on this iPad only
 * (localStorage). Items it doesn't know fall back to the keyword map in categorize().
 */
import { CATEGORIES, type Category, categorize } from "./categorize";

const KEY = "hub.itemCategories";
const MAX_ENTRIES = 500;

const norm = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

function read(): Record<string, Category> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

let memory: Record<string, Category> = read();

/** Save categories for items about to be added. */
export function rememberCategories(items: { name: string; category: Category }[]) {
  for (const { name, category } of items) {
    if (!(CATEGORIES as readonly string[]).includes(category)) continue;
    const k = norm(name);
    delete memory[k]; // re-insert so the newest entries survive trimming
    memory[k] = category;
  }
  const keys = Object.keys(memory);
  if (keys.length > MAX_ENTRIES) {
    for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete memory[k];
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* storage unavailable: categories last until the page reloads */
  }
}

/** The category to show for a list item: what the review sheet showed, else the keyword map. */
export function categoryFor(name: string): Category {
  return memory[norm(name)] ?? categorize(name);
}
