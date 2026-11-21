# Status

Updated 2026-11-21. Spec: [CLAUDE.md](CLAUDE.md).

## Where each phase stands

| Phase | What | Code | Checked on the iPad |
|---|---|---|---|
| 0 | Mic test page (`mic-test/index.html`) | Done | Not yet. Needs HTTPS first |
| 1 | Scaffold, HA sign-in, mock mode, setup page | Done | Not yet |
| 2 | Home: clock, date and weather, tiles, Today panel | Done | Not yet |
| 3 | Calendar view: Today and This week | Done | Not yet. Needs real calendar IDs |
| 4 | Grocery list: cards, check off, Completed, Clear, badge, live updates | Done | Not yet |
| 5 | Add by typing | Removed on request: the add bar opens voice mode, and the app has no keyboard input | n/a |
| 6 | Voice: Listening, Transcribing, Review, error states, recorder | Front end done | Needs the `parse-groceries` backend |
| 7 | Scene tiles with confirmation and error state | Done | Not yet. Needs the HA scripts |
| 7b | Garage tile: live state, since-time, confirm sheet, open/close via `cover.*` | Done | Not yet. `cover.pine_valley_garage_door` |
| 8 | Polish: motion, empty states, offline label | Partly | Frame rate and a day-long soak test happen on the iPad |

## Real versus sample data

The default build is real mode. Sample data shows only with `?mock=1` or a `VITE_DEMO=1` build.
It loads from its own file (`mock-*.js`), which real mode never downloads, and it is never written
to Home Assistant.

| Phase | Real mode | Demo mode |
|---|---|---|
| 0 Mic test | Real microphone, real recording. Nothing is uploaded | Same page, no sample data |
| 1 Connection | Real HA login (`getAuth`), live entity states, setup page lists real entities | No connection; sample entities |
| 2 Home | Real clock and date. Weather, events, badge and garage state come from HA | Sample weather (48°, cloudy), events, 8 groceries, garage Closed |
| 3 Calendar | `calendar/event/subscribe` for today plus 6 days, pushed live (falls back to `calendar.get_events` every 5 min) | Sample events relative to the current time |
| 4 Groceries | Live `todo/item/subscribe` list; checks and Clear go to HA | Sample list; changes stay in the page |
| 5 Typed add | Removed: the add bar opens voice mode | Same |
| 6 Voice | Real recording. Sorting needs the `parse-groceries` function, which doesn't exist yet, so the sheet says voice isn't set up after recording | Same |
| 7 Scenes, garage | `script.turn_on` / `scene.turn_on`; garage state pushed by `subscribe_entities`, commands via `cover.open_cover` / `cover.close_cover` | Scene tiles fake success; the garage fakes Sending, Opening, then Open |

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
- Tiles never change color or fade. The only feedback on any button is a quick press-in that
  springs back with a small bounce.
- The garage tile shows the live state first. A tap only opens "Open the garage?" / "Close the garage?";
  nothing moves without the second tap. No commands while the door is moving, offline, or still
  "Sending…". An unanswered confirmation closes itself after 30 seconds.
- Scenes and calendars named in config.json but missing from Home Assistant show quietly
  (a dimmed "Not set up" tile; an empty Today panel), never an error. A missing weather entity hides the weather.
- The list puts an item under the category the review sheet showed. That choice is remembered on
  this iPad only (Home Assistant stores just the name); other items use the keyword map.

## Backend: `supabase/functions/parse-groceries/index.ts`

The deployed function, committed unchanged. It takes JSON `{ "text" }` or a raw audio body and
returns `{ transcript, items: [{ name, quantity, category }] }`, which matches what the app sends
and reads. Transcription and sorting both use OpenAI (`gpt-transcribe`, then a small GPT model), so
it needs only the `OPENAI_API_KEY` secret. The spec planned to sort with Claude Haiku; that is not
what's deployed. It checks the caller's Origin against `ALLOWED_ORIGINS` (default includes
`https://pinevalley.vercel.app` and local dev ports), limits clips to 2 MB and text to 1,500
characters, and rate-limits per instance.
