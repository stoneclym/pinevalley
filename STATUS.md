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
| 5 | Add by typing | Done: the add bar opens a text field with the keyboard up (use its dictation key for voice) | Not yet |
| 6 | Voice recording | Shelved: the iPad Home Screen app kept losing the microphone. Recorder kept in `src/voice/recorder.ts`, unused | n/a |
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
| 6 Voice | Shelved. Typed (or dictated) lists are sorted by `parse-groceries` when configured, local rules otherwise | Local rules |
| 7 Scenes, garage | `script.turn_on` / `scene.turn_on`; garage state pushed by `subscribe_entities`, commands via `cover.open_cover` / `cover.close_cover` | Scene tiles fake success; the garage fakes Sending, Opening, then Open |

## People colors and pickup reminder

- `config.json` `people`: name, color, keywords, optional `calendar`. Keywords match whole words,
  case-insensitive; a calendar mapping wins. Colors: Steve #B4574B, Greyson #4F6E94, Denise #C47A90, Family #6F8A5C (sage green).
  Leading names are stripped for display only ("Steve & Denise dinner" shows as "Dinner", red + pink).
- `config.json` `pickup`: trash weekly on Friday, recycling every other Friday from 2026-11-27,
  holiday `overrides` (move or skip). The day before, a bronze card sits at the top of Today.
  Pure date math in America/New_York. In demo mode, `?today=YYYY-MM-DD` pretends it's that day.

## StandBy home screen

Tap the date 5 times to switch between the original Home (the default) and a StandBy-style
screen: a dark dotted world map whose daylight follows the real sun (recomputed every minute,
`src/lib/sun.ts`), the day/night line, a marker and name for home (`standby.location`, else
HA's `zone.home`), a big rounded clock, and round buttons for Calendar and the `standby.scenes`
(Bright, Dim, Night: `script.bright`, `script.dim`, `script.night`, placeholders until they exist).
The map's land dots come from Natural Earth via world-atlas (`scripts/make-land-dots.mjs`).

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
- This week lists all of the next 7 days; empty days say "Nothing planned" quietly.
- Adding an item that is already on the list and unchecked is skipped.
- Tiles never change color. Buttons press in (tiles to 0.96) and spring back. While Morning or Good Night
  runs, only its icon changes (gold rising sun, purple moon) and breathes gently; when Home Assistant
  reports the script finished, a glass banner drops from the top ("Good Morning!" / "Good Night!") for 3 s.
- Status bar: `index.html` uses `black-translucent` (gradient behind the bar, soft wash for the text);
  `status-default.html` ("Home B") uses `default` with `theme-color` #F3EBDF. Add both to compare.
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

## Microphone on the iPad (Home Screen app)

iOS can open the microphone and then cut it off in a Home Screen web app (the orange dot
appears, then disappears), after which it sends silence until the iPad restarts. To be as
gentle as possible, the recorder now uses only getUserMedia + MediaRecorder (no AudioContext;
the waveform is decorative), keeps one microphone stream open for 3 minutes after use so iOS
asks once per session, drops it when the app is hidden, and stops at once with "The microphone
stopped" if iOS mutes or ends the track. The keyboard backup is always one tap away.
