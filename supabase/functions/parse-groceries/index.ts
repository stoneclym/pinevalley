// parse-groceries: turns a spoken or typed grocery list into sorted items.
//
//   POST  JSON {"text": "..."}              typed text
//   POST  raw audio (audio/mp4 or webm)     recorded clip
//   ->    {"transcript": "...", "items": [{"name","quantity","category"}]}
//
// Audio is transcribed and then sorted, both with OpenAI.
// No database is used. The key lives only in a Supabase secret:
//   OPENAI_API_KEY
// Optional secrets:
//   ALLOWED_ORIGINS    comma list of origins allowed to call this (default below)
//   TRANSCRIBE_MODEL   default "gpt-transcribe"
//   SORT_MODEL         default tries "gpt-5.4-nano", then "gpt-5-mini"

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CATEGORIES = [
  "Produce",
  "Meat & Seafood",
  "Dairy & Eggs",
  "Bakery",
  "Pantry",
  "Frozen",
  "Snacks",
  "Beverages",
  "Household",
  "Other",
];

const DEFAULT_ORIGINS = [
  "https://pinevalley.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
];

const MAX_AUDIO_BYTES = 2 * 1024 * 1024; // about 30 seconds of speech
const MAX_TEXT_CHARS = 1500;
const RATE_LIMIT = 12; // requests per minute per client (best effort, per instance)

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? DEFAULT_ORIGINS.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= 60_000)) hits.delete(k);
  }
  return recent.length > RATE_LIMIT;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
  if (origin && allowedOrigins.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

const VOCAB_HINT =
  "A family grocery list. Words may include: cilantro, scallions, shallots, Greek yogurt, half and half, " +
  "sourdough, tortillas, taco shells, paper towels, dish soap, La Croix, Cheerios, hummus, avocados, limes.";

async function transcribe(clip: Uint8Array, mime: string): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new HttpError(503, "voice_not_configured");
  const ext = mime.includes("webm") ? "webm" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : "m4a";
  const form = new FormData();
  form.append("file", new Blob([clip], { type: mime }), `clip.${ext}`);
  form.append("model", Deno.env.get("TRANSCRIBE_MODEL") ?? "gpt-transcribe");
  form.append("language", "en");
  form.append("prompt", VOCAB_HINT);
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    console.error("transcribe failed", res.status, (await res.text()).slice(0, 300));
    throw new HttpError(502, "transcription_failed");
  }
  const data = await res.json();
  return String(data.text ?? "").trim();
}

const SYSTEM = `You sort spoken or typed grocery requests into a clean shopping list.
Return ONLY JSON, no prose and no code fences, in exactly this shape:
{"items":[{"name":"limes","quantity":2,"category":"Produce"}]}

Rules:
- One entry per product. Split run-on lists into separate items.
- "name" is just the product, lowercase, without the quantity. For "2 boxes of taco shells" use name "taco shells" and quantity "2 boxes".
- "quantity" is a number or short string like "2" or "1 lb". Use null when none was said. "a couple" is 2, "a dozen" is 12.
- "category" must be exactly one of: ${CATEGORIES.join(", ")}.
- Expand phrases like "stuff for tacos" into the usual items (taco shells, ground beef, lettuce, tomatoes, shredded cheese, salsa).
- Ignore filler words, corrections, and anything that is not a thing to buy. If the speaker corrects themselves, keep the final version.
- Fix obvious mishearings of food words. Do not invent items that were not asked for or implied.
- If there is nothing to buy, return {"items":[]}.`;

async function sort(text: string) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new HttpError(503, "sorting_not_configured");
  const candidates = Deno.env.get("SORT_MODEL")
    ? [Deno.env.get("SORT_MODEL")!]
    : ["gpt-5.4-nano", "gpt-5-mini"];

  let raw = "";
  let ok = false;
  for (const model of candidates) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_completion_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) {
      console.error("sort failed", model, res.status, (await res.text()).slice(0, 300));
      continue; // try the next model
    }
    const data = await res.json();
    raw = String(data?.choices?.[0]?.message?.content ?? "").trim();
    ok = true;
    break;
  }
  if (!ok) throw new HttpError(502, "sorting_failed");

  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  let parsed: { items?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error("sort returned non-JSON", raw.slice(0, 200));
    throw new HttpError(502, "sorting_failed");
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return items
    .map((i: Record<string, unknown>) => {
      const name = String(i?.name ?? "").trim().slice(0, 80);
      const category = CATEGORIES.includes(String(i?.category)) ? String(i.category) : "Other";
      const q = i?.quantity;
      const quantity = q == null || q === "" ? null : typeof q === "number" ? q : String(q).slice(0, 20);
      return { name, quantity, category };
    })
    .filter((i) => i.name)
    .slice(0, 60);
}

class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  // Browsers always send Origin. Refuse anything that is not the hub.
  if (!origin || !allowedOrigins.includes(origin)) return json({ error: "origin_not_allowed" }, 403, null);

  const client = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || origin;
  if (rateLimited(client)) return json({ error: "rate_limited" }, 429, origin);

  try {
    const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    let transcript = "";

    if (type === "application/json") {
      const body = await req.json().catch(() => null);
      transcript = String(body?.text ?? "").trim();
      if (transcript.length > MAX_TEXT_CHARS) return json({ error: "text_too_long" }, 413, origin);
    } else if (type.startsWith("audio/") || type === "video/mp4" || type === "application/octet-stream") {
      const declared = Number(req.headers.get("content-length") ?? 0);
      if (declared > MAX_AUDIO_BYTES) return json({ error: "audio_too_large" }, 413, origin);
      const clip = new Uint8Array(await req.arrayBuffer());
      if (clip.byteLength > MAX_AUDIO_BYTES) return json({ error: "audio_too_large" }, 413, origin);
      if (clip.byteLength < 1000) return json({ transcript: "", items: [] }, 200, origin);
      transcript = await transcribe(clip, type.startsWith("audio/") ? type : "audio/mp4");
    } else {
      return json({ error: "unsupported_content_type" }, 415, origin);
    }

    if (!transcript) return json({ transcript: "", items: [] }, 200, origin);
    const items = await sort(transcript);
    return json({ transcript, items }, 200, origin);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code }, err.status, origin);
    console.error("unexpected", err);
    return json({ error: "server_error" }, 500, origin);
  }
});
