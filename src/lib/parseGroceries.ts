import { categorize, type Category } from "./categorize";

export type Item = { name: string; category: Category };

const LEAD_INS = [
  "can you add", "could you add", "please add", "we need to get", "we need", "we're out of",
  "we are out of", "i need", "pick up", "add", "get", "buy", "grab", "also", "and", "some",
];

const QUANTITY_WORDS: [RegExp, string][] = [
  [/^a couple(?: of)?\s+/i, "2 "],
  [/^a dozen\s+/i, "12 "],
  [/^half a dozen\s+/i, "6 "],
  [/^a few\s+/i, "3 "],
  [/^(?:a|an|one)\s+(?=\S)/i, ""], // "a carton of milk" → "carton of milk" → handled below
  [/^two\s+/i, "2 "], [/^three\s+/i, "3 "], [/^four\s+/i, "4 "], [/^five\s+/i, "5 "],
  [/^six\s+/i, "6 "], [/^seven\s+/i, "7 "], [/^eight\s+/i, "8 "], [/^nine\s+/i, "9 "],
  [/^ten\s+/i, "10 "], [/^twelve\s+/i, "12 "],
];

function stripLeadIn(s: string): string {
  let out = s.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const lead of LEAD_INS) {
      const re = new RegExp(`^${lead}\\b[\\s,:]*`, "i");
      if (re.test(out)) {
        out = out.replace(re, "");
        changed = true;
      }
    }
  }
  return out;
}

function cleanPiece(piece: string): string {
  let s = stripLeadIn(piece.replace(/[.!?"“”]+/g, " ").replace(/\s+/g, " "));
  for (const [re, rep] of QUANTITY_WORDS) {
    if (re.test(s)) {
      s = s.replace(re, rep);
      break;
    }
  }
  s = s.trim();
  if (!s) return "";
  // Capitalize the first letter unless it starts with a quantity ("2 limes" stays lower).
  return /^\d/.test(s) ? s : s[0].toUpperCase() + s.slice(1);
}

/** True when typed text holds more than one item (commas, "and", "also", new lines). */
export function hasSeparators(text: string): boolean {
  return /[,;\n]|\s(?:and|also|plus)\s/i.test(text.trim());
}

// Item names that contain "and"; protected from splitting.
const AND_NAMES = ["half and half", "mac and cheese", "salt and pepper", "peanut butter and jelly"];
const AND_MARK = "\u0000";

/** Version 1: local rules only. */
export function parseGroceriesLocal(text: string): Item[] {
  let protectedText = text;
  for (const n of AND_NAMES) {
    protectedText = protectedText.replace(new RegExp(n, "gi"), (m) => m.replace(/ and /i, AND_MARK));
  }
  const pieces = protectedText
    .split(/[,;\n]|\s+(?:and|also|plus)\s+/i)
    .map((p) => cleanPiece(p.split(AND_MARK).join(" and ")))
    .filter(Boolean);
  const seen = new Set<string>();
  return pieces
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((name) => ({ name, category: categorize(name) }));
}
