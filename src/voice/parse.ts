/**
 * parseGroceries: one interface for typed text and recorded audio.
 *
 * Version 2 is the `parse-groceries` Supabase Edge Function (not deployed yet). It takes
 * either JSON `{ text }` or a raw audio body, and returns `{ transcript, items }` with
 * items as `{ name, quantity, category }`. Keys for OpenAI and Anthropic live only in
 * Supabase secrets; the browser sends just the publishable key.
 *
 * Version 1 (local rules) is the fallback for typed text when the function is missing or fails.
 */
import type { VoiceConfig } from "../config";
import { CATEGORIES, type Category, categorize } from "../lib/categorize";
import { type Item, parseGroceriesLocal } from "../lib/parseGroceries";

export type { Item };
export type ParseResult = { transcript: string; items: Item[] };

type RemoteItem = { name?: string; quantity?: string | number | null; category?: string };

const TIMEOUT_MS = 20_000;

export function voiceConfigured(cfg: VoiceConfig | null): cfg is VoiceConfig {
  return !!cfg?.functionUrl && !!cfg.publishableKey && !/REPLACE/.test(cfg.functionUrl + cfg.publishableKey);
}

function toItem(r: RemoteItem): Item | null {
  const name = (r.name ?? "").trim();
  if (!name) return null;
  const qty = r.quantity == null || r.quantity === "" || r.quantity === 1 || r.quantity === "1" ? "" : String(r.quantity).trim();
  const label = qty ? `${qty} ${name.toLowerCase()}` : name[0].toUpperCase() + name.slice(1);
  const category = (CATEGORIES as readonly string[]).includes(r.category ?? "")
    ? (r.category as Category)
    : categorize(label);
  return { name: label, category };
}

async function post(cfg: VoiceConfig, body: BodyInit, contentType: string): Promise<ParseResult> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(cfg.functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        Authorization: `Bearer ${cfg.publishableKey}`,
        apikey: cfg.publishableKey,
      },
      body,
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`parse-groceries: HTTP ${res.status}`);
    const data = (await res.json()) as { transcript?: string; items?: RemoteItem[] };
    return {
      transcript: (data.transcript ?? "").trim(),
      items: (data.items ?? []).map(toItem).filter((i): i is Item => !!i),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Audio → transcript and items. Throws if voice is not set up or the call fails. */
export async function parseAudio(cfg: VoiceConfig | null, clip: Blob): Promise<ParseResult> {
  if (!voiceConfigured(cfg)) throw new Error("Voice is not set up yet");
  return post(cfg, clip, clip.type || "audio/mp4");
}

/** Typed text → items. Uses the function when available, local rules otherwise. */
export async function parseGroceries(text: string, cfg: VoiceConfig | null): Promise<Item[]> {
  if (voiceConfigured(cfg)) {
    try {
      const r = await post(cfg, JSON.stringify({ text }), "application/json");
      if (r.items.length) return r.items;
    } catch (err) {
      console.warn("parse-groceries failed, using local rules", err);
    }
  }
  return parseGroceriesLocal(text);
}
