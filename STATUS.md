# Status

Updated 2026-11-20. Spec: [CLAUDE.md](CLAUDE.md).

## Where each phase stands

| Phase | What | Code | Checked on the iPad |
|---|---|---|---|
| 0 | Mic test page (`mic-test/index.html`) | Done | Not yet. Needs HTTPS first |
| 1 | Scaffold, HA sign-in, mock mode, setup page | Done | Not yet |
| 2 | Home: clock, date and weather, tiles, Today panel | Done | Not yet |
| 3 | Calendar view: Today and This week | Done | Not yet. Needs real calendar IDs |
| 4 | Grocery list: cards, check off, Completed, Clear, badge, live updates | Done | Not yet |
| 5 | Add by typing, local parser, preview sheet | Done | Not yet |
| 6 | Voice: Listening, Transcribing, Review, error states, recorder | Front end done | Needs the `parse-groceries` backend |
| 7 | Scene tiles with confirmation and error state | Done | Not yet. Needs the HA scripts |
| 8 | Polish: motion, empty states, offline label | Partly | Frame rate and a day-long soak test happen on the iPad |

## Checked here (dev machine, mock mode, 1180 × 820)

- Home, Calendar, Groceries and the review sheet match the Claude Design export side by side.
- The spec's test sentence ("We need avocados, a couple limes, taco shells, and paper towels")
  gives Avocados, 2 limes, Taco shells, Paper towels under Produce, Produce, Pantry, Household.
- With no data, the screens show only the quiet empty lines from `src/copy.ts`.
- 172 unit tests: categorize (147 grocery items), parser, dates and times, all-day events, the week window.
- The production build has no sample data in it.

## Not checked yet

- Anything against your real Home Assistant: sign-in, entities, calendar fetch, to-do sync, scenes.
  The API names come from HA's current docs and frontend source (`calendar.get_events`,
  `todo/item/subscribe`, `todo.add_item`, `todo.update_item`, `todo.remove_completed_items`).
- Recording on the iPad. The browser used here blocks the microphone; only the error path was seen.
- Frame rate of the glass blur on the A14.

## Decisions made without asking (easy to change)

- Timed events that have ended drop off Home and the Calendar Today panel.
- Home shows at most 2 all-day and 4 timed events, then `+N more`.
- This week lists only days that have events (from "Real data only" in the spec).
- Adding an item that is already on the list and unchecked is skipped.
- The sheet shows the category the voice function returns. The list always uses `categorize()`.
  Usually they agree, but an item the keyword map doesn't know will show under Other in the list.

## Backend contract for `parse-groceries` (to build later)

`POST <functionUrl>` with headers `Authorization: Bearer <publishableKey>` and `apikey: <publishableKey>`.

- Typed text: `Content-Type: application/json`, body `{ "text": "..." }`
- Voice: the raw clip as the body, `Content-Type: audio/mp4` (Safari) or `audio/webm`

Response: `{ "transcript": "...", "items": [ { "name": "limes", "quantity": 2, "category": "Produce" } ] }`.
Category is one of: Produce, Meat & Seafood, Dairy & Eggs, Bakery, Pantry, Frozen, Snacks, Beverages,
Household, Other. Until it exists, voice records and then says it isn't set up yet, and typed lists
use the local parser.
