# iPad Home Hub: Build Spec

This file is the source of truth for building the iPad Home Hub. Read all of it before writing code.
It replaces the earlier design briefs wherever they disagree. In particular: **there is no dark mode**, and the 5-day forecast is gone from Home.

Owner: Greyson Clymer. Designs were made in Claude Design (four light-mode screens, described in section 4). The build is for his family's new house in Wilmington, NC.

## 1. What we are building

A wall-friendly iPad app for the whole family. It sits on a stand in the scullery / butler's pantry, the first place Greyson's dad goes after waking up.

- It shows a very large clock, the date and current weather, today's calendar events, three big tiles, and runs scenes with one tap.
- Tapping the calendar opens an expanded Calendar view. Tapping Groceries opens a shared grocery list.
- Everything lives in one app. Nobody leaves it to use another app.
- Groceries can be added by voice: tap the mic, speak, and the spoken list is sorted into categories. There is no keyboard in that flow.
- It is a PWA served from Home Assistant (HA) over HTTPS and talks to HA over its WebSocket API.
- It is a self-contained project. It has its own Supabase project and its own API keys, shared with nothing else.

## Start here (read first)

Greyson will give you this file, a GitHub repo, and a zip of his Claude Design export.

1. Put the unzipped export in `/design` in the repo. It is a **visual reference only**: layout, spacing, colors, type, glass styling, icons. Read the tokens from it. Do not copy its sample content.
2. Your first task is **phase 0 in section 10** (the microphone test), not the full app. Then continue phase by phase.
3. **Stop at the end of every phase.** Show screenshots (or tell Greyson what to check on the iPad), list anything unverified, and wait for his go-ahead before starting the next phase.
4. Anything in section 9 that Greyson must do himself (HTTPS, Supabase, API keys, HA settings), say so plainly and wait. Do not fake it with placeholders.

## 2. Decisions that are locked

- Device: iPad Air, 4th generation, 10.9 inch, **landscape only**, on a stand, always plugged in. Design canvas about **1180 x 820 points**.
- **Light theme only.** No dark mode, no sunset switching, no `prefers-color-scheme` branches. Set `color-scheme: light` (CSS and meta tag) so iPadOS dark appearance cannot recolor form controls or scrollbars.
- Installed through Safari's Add to Home Screen, runs full screen (standalone).
- Served from HA's own web folder over **HTTPS from day one**, because the microphone only works on HTTPS pages. No paid subscription. Use HA's free Let's Encrypt add-on with a DNS challenge and a name that points to HA's local address, so nothing is exposed to the internet (section 9).
- **Voice is part of the first build**, not a later add-on. Greyson was firm about this. The design is record, then transcribe (section 7), never the iPadOS keyboard dictation key.
- **Separate backend.** A new Supabase project used only by this app, with its own OpenAI and Anthropic API keys. No database tables are needed.
- Calendar source: Apple Calendar through HA's CalDAV integration.
- Groceries source: an HA to-do list (the Shopping List integration), synced to Apple Reminders by the HA Companion app's Reminders Sync.
- Scenes: HA scenes or scripts. The app only triggers them.
- TV control is power only (a Samsung TV, with an Apple TV in the living room).
- Rooms panel and floor plan are **not part of the first build** (see section 13).
- Stack is Claude Code's choice. Recommendation: Vite + React + TypeScript + `home-assistant-js-websocket`. Keep dependencies few.

## 3. Design principles

1. **Ask "what would Apple do?"** for every detail: corner radii, spacing, motion, type size, touch targets, wording. When in doubt, copy how Apple Home, the iOS lock screen and Apple's HomeView display would do it.
2. **Align by eye (optical alignment), not only by pixels.** Round glyphs, icons and numerals often need a nudge so they look centered and level. Check every screen by eye.
3. **Quiet and premium.** It should disappear into the room: swiss coffee walls, toaster alder floors, champagne bronze fixtures. Not techy.
4. **Liquid Glass.** Frosted translucent surfaces with a thin bright edge, soft shadow, and a warm tint. Baseline is `backdrop-filter` blur plus saturation, a 1px light border, and a soft highlight. Safari does not support SVG-displacement refraction through `backdrop-filter`, so true refraction is optional and only for a few elements (see risk 6).
5. Apple's corners are continuous curves (squircles). Plain `border-radius` is close but not identical. Check whether `corner-shape: squircle` works in the iPad's Safari, and fall back to `border-radius` tuned by eye.
6. Whole family uses it, so controls are large, obvious and need no explanation.

### Visual tokens (approximate, read from the screenshots)

Extract exact values (colors, fonts, radii, shadows, blur) from the Claude Design export. If you do not have it, ask Greyson for it. Do not invent tokens. The estimates below are only to orient you.

- Background: a diagonal gradient from warm off-white (about `#F5EEE2`, top left) to tan (about `#DCC4A2`, bottom right). The Calendar and Groceries screens use a lighter, calmer version of the same gradient.
- Text: near-black warm brown (about `#2A211A`), with a lighter brown for secondary text.
- Glass surfaces: warm cream fill at partial opacity, thin white edge, soft shadow.
- Type: a high-contrast serif for the clock, screen titles ("Today", "Calendar", "Groceries") and the voice transcript; a clean sans for everything else.
- Icons: simple outline icons (sunrise, moon, cart, cloud, chevron, mic, sparkle). SF Symbols are not licensed for the web, so use an open set that looks close, such as Lucide or Phosphor.

### Real data only (no placeholder content)

The Claude Design export contains sample content: events, grocery items, a badge count, a weather reading, a transcript. **None of it ships.** Every value on screen comes from Home Assistant or the voice function.

- The Today panel shows only real calendar events. With none, it shows no event rows, only the panel title and one quiet line such as `Nothing planned today` in the secondary text style. Greyson may remove even that line; keep it a single constant so it is easy to change.
- The grocery list starts empty. No category cards appear until an item exists in that category. With no items, show only the add bar and one quiet line such as `Nothing on the list`. The Completed section is hidden until something is checked.
- The Home badge shows the unchecked count and is **hidden at zero**.
- The This week panel shows only days that have events, or the same quiet empty line.
- The date, time and weather are live. If weather is unavailable, hide that part of the date line rather than showing a stale value.
- Sample data exists only in **mock mode**, switched on explicitly (for example `?mock=1` in development). It must never be the default, never be in the production build's default path, and never be written to HA. Before finishing each phase, check that the real build with no events and an empty list looks clean and intentional.

## 4. Screens

All screens fill the full viewport with the same background gradient. Reference sizes below assume 1180 x 820.

### 4.1 Home (idle screen, the default)

Left side, top to bottom:

1. **Date line**, one line: short weekday and date (`Fri Nov 20`), then a small weather-condition icon, then the current temperature (`48°`). This follows the date-and-weather line on the iOS lock screen. No separate weather card, no forecast.
2. **Clock**, enormous, serif, 12-hour, no leading zero (`5:18`), no AM/PM. Readable from across the room.
3. **Tile row** under the clock: three square glass tiles side by side:
   - **Wake Up** (sunrise icon) is a scene.
   - **Good Night** (moon icon) is a scene.
   - **Groceries** (cart icon) opens the Grocery list, with a small white circular badge in the top right showing the number of unchecked items. Hide the badge at zero.

Each tile shows its icon at top left and its label at bottom left.

Right side: a **Today** panel (no card background, text on the gradient):

- Heading `Today` in serif, with a `Calendar >` link aligned to the right of the heading.
- All-day events first, as `ALL DAY` in small tracked caps followed by the title (`Trash pickup`).
- Then timed events down a thin vertical timeline. Each event has a dot on the line: a **filled dot for the next event**, hollow dots for later ones. Each shows the time (`8:30 AM`), then the title in bold. The next event also has a small `NEXT` label beside its time. Show the location in a lighter line under the title when the event has one (`Northeast Library`).

Behavior:

- Tapping the Today panel or `Calendar >` opens the Calendar view.
- Tapping the Groceries tile opens the Grocery list.
- Tapping Wake Up or Good Night runs the scene and shows a brief confirmation (section 5). Scene tiles have no on/off state.
- Leaving Home was requested as a third scene but is not in this Home design. Build the tile list from config (section 8) so it can be added without code changes.
- Proposed (not designed): hide timed events that have already ended; if more events than fit, show a short `+N more` line; if nothing is planned, show a quiet `Nothing planned today`.

### 4.2 Calendar view

Opened from Home. Top left: a glass pill button `‹ Home`. Next to it: the title `Calendar` in serif, with the date (`Fri Nov 20`) small beside it.

Two large glass panels side by side:

- **Left panel, Today.** Heading `Today` in serif with the long date (`Friday, November 20`) on the right. `ALL DAY` events on top (`Trash pickup`). Below, each timed event is a row with a thin vertical accent bar on its left, the title in bold, and under it the time range and location (`8:30 AM – 9:30 AM · Northeast Library`). The **next** event is a brighter white card with a dark accent bar and a `NEXT` label on the right. Other events have a tan accent bar and no card.
- **Right panel, This week.** Small tracked heading `THIS WEEK`. One row per day for the next 6 days after today (a rolling 7 days including today). Each row has the short weekday in tiny caps (`SAT`) over the day number in serif (`21`), and to the right the events as `10:00 AM  Soccer game` lines. A day with no events says `Nothing planned`. All-day events say `All day  Grandma arrives`. Thin dividers separate rows.

A blue rectangle around "Family dinner" in the screenshot is the design tool's selection outline. Ignore it.

Read-only for now.

### 4.3 Grocery list

Opened from Home. Top left: `‹ Home` pill. Title `Groceries` in serif, with the count of unchecked items small beside it (`8 items`).

- **Add bar.** A wide glass bar under the title with a sparkle icon at left, placeholder text `Add anything, like "milk, eggs and stuff for tacos"`, and a white round **microphone button** at the right end.
- **Category cards.** Unchecked items grouped into glass cards in two columns (masonry, cards flow to fill the shorter column). Each card has a small tracked caps title and rows of items. Categories shown: `PRODUCE` (Avocados, Limes, Cilantro), `DAIRY & EGGS` (Milk, Eggs), `PANTRY` (Taco shells, Coffee beans), `HOUSEHOLD` (Paper towels). Each row has a circular outline checkbox and the item name in medium-weight sans.
- **Completed.** Below the cards, in the right column: `COMPLETED · 2` in tracked caps, with a small glass pill `Clear` at the right. Completed items show a filled dark circle with a white check and struck-through text (`Bananas`, `Olive oil`).

Behavior:

- Tapping a row's circle toggles it. Checked items move to Completed; unchecking moves them back to their category.
- `Clear` removes all completed items from the list.
- The header count and the Home badge both equal the number of **unchecked** items. (The mockups show 6 and 8, which is sample data. They must agree in the real app.)

### 4.4 Grocery voice sheet

Opened by the microphone button. A glass sheet centered over the Grocery screen, which blurs and dims behind it.

Three states, in order:

1. **Listening.** An animated waveform that follows the real microphone level, and the word `Listening`. A round glass **stop** button (small square icon) at left and a `Cancel` pill. Recording also stops by itself after about 2 seconds of silence, and hard-stops at 30 seconds.
2. **Transcribing.** After stop, the waveform settles into a soft pulse and the label changes to `Transcribing`. This usually lasts one to three seconds. (The mockups do not show this state yet. Match the same glass style.)
3. **Review.** The large serif transcript in quotes appears: `"We need avocados, a couple limes, taco shells, and paper towels"`. A thin divider, then **parsed items** grouped by category: a small tracked caps label on the left and white pill chips (`Avocados`, `2 limes` under PRODUCE; `Taco shells` under PANTRY; `Paper towels` under HOUSEHOLD). Bottom: `Cancel` and a white primary pill `Add 4 Items` (the number is the chip count). Chips can be tapped to remove one.

The transcript and items do **not** stream while speaking. They appear together in the Review state.

Behavior: `Add N Items` adds every chip to the list and closes the sheet. `Cancel` discards everything, including the recording. If transcription fails, show `Couldn't catch that` with `Try again` and `Cancel`; never fail silently. The same sheet also opens for typed input with several items (see section 7).

## 5. Navigation and behavior

- Home is the resting screen. Calendar and Grocery list are one level down, each with `‹ Home`.
- **Auto-return to Home** after about 60 seconds of no touches (configurable). Do not auto-return while the voice sheet is open.
- Scene tiles: a press runs the scene and shows a short confirmation on the tile (for example the icon changes to a check for about 1.5 seconds). They are not toggles. If the call fails, show a brief error state.
- Transitions: short, soft, Apple-like (a subtle zoom or slide, never a hard cut). Respect `prefers-reduced-motion`.
- Clock updates on the minute boundary. Date and weather update live.
- Wall-device hygiene: `touch-action: manipulation`, no text selection except in the add bar, no pull-to-refresh bounce (`overscroll-behavior: none`), no long-press context menus, no double-tap zoom, `viewport-fit=cover`.
- Performance: the iPad Air 4 has an A14 chip. Do not stack many `backdrop-filter` layers. Test frame rate. If it janks, reduce blur radius or fall back to a plain translucent fill.

## 6. Architecture

- Static single-page app, built to a folder that is copied into HA's `/config/www/home-hub/`. HA serves that folder at `/local/home-hub/`. Open `https://<ha-name>:8123/local/home-hub/` on the iPad (the HTTPS name from section 9) and Add to Home Screen.
- Files in `www` are served without login. Never put tokens, passwords or API keys in the bundle or in `config.json`. Entity IDs only.
- One shared HA connection (WebSocket). Wrap it in small modules: `ha/connection`, `ha/weather`, `ha/calendar`, `ha/todo`, `ha/scenes`. Screens never call HA directly.
- Per-iPad settings live in `config.json` next to `index.html` (section 8).
- PWA files: web app manifest (`display: standalone`, name, icons) and Apple meta tags (`apple-mobile-web-app-capable`, `apple-touch-icon`). A service worker is possible over HTTPS but is not needed. The app does not need offline support, because it is useless without HA.
- **Never change the URL hash or path to switch screens.** In an installed iPad web app, a hash change can make the microphone permission prompt appear again. Keep screen state in memory (a small state variable or history without URL changes). The hidden setup page (section 8) is the one exception and is not used on the wall iPad.

## 7. Home Assistant integration

Confirm each API against the Home Assistant developer docs before using it. Do not guess names or payloads.

### Connection and auth

- Use `home-assistant-js-websocket`. Because the app is served from the HA origin, use `getAuth()` so HA's own login flow runs once on the iPad and tokens refresh automatically. Persist tokens in `localStorage`.
- Sign in **inside the installed Home Screen app**, not in a Safari tab (iOS keeps their storage separate).
- Create a dedicated non-admin HA user for the iPad, for example `iPad Hub`.
- For local development, use a long-lived access token in an untracked `.env.local`. Never commit it. Also provide a **mock mode** with fake weather, events and groceries so design work does not need a live HA.
- Reconnect automatically. If HA is unreachable, keep the last data on screen and show a small, quiet offline indicator (not designed; keep it subtle and Apple-like).

### Weather

- Read one HA `weather.*` entity from `config.json`. Use its `state` (the condition) and `temperature` attribute; show the unit HA reports.
- Map HA conditions to icons: `clear-night`, `cloudy`, `exceptional`, `fog`, `hail`, `lightning`, `lightning-rainy`, `partlycloudy`, `pouring`, `rainy`, `snowy`, `snowy-rainy`, `sunny`, `windy`, `windy-variant`. The design shows only a cloud for the sample; create a matching icon for each.
- Show the current temperature rounded to a whole degree.

### Calendar

- The CalDAV integration creates calendar entities. Their state only describes **one** upcoming event and they refresh about every 15 minutes at the source. Do not build the UI from entity state.
- Fetch a date range instead. Use the `calendar.get_events` action (service call with a response) or the `/api/calendars/<entity_id>?start=&end=` REST endpoint, whichever works on this HA version. Merge events from every calendar in `config.json`, sort by start time, and flag all-day events (a date with no time).
- Fetch today for Home and the next 7 days for the Calendar view. Refresh every few minutes and whenever the app returns to the foreground. Expect new events to take up to about 15 minutes to appear.

### Groceries

- The list is an HA to-do entity, normally `todo.shopping_list`.
- Use the to-do actions: add item, get items, update item (set status to completed or needs action), remove item, remove completed items. Also check which WebSocket commands the HA frontend uses to list and subscribe to to-do items (`todo/item/list` and `todo/item/subscribe` are likely names, but verify) so the list updates live.
- The Shopping List integration stores only an item name and a completed flag. **Categories do not exist in HA.** Compute the category on the client from the item name (see below), the same way every time, so every screen agrees. Quantities are folded into the name (`2 limes`).
- Reminders Sync does not carry categories either, so phones will see a flat list. That is fine.

### Categorizing

- Write `categorize(name): Category` with a plain keyword map in its own file. Categories: `Produce`, `Dairy & Eggs`, `Pantry`, `Household` (designed) plus proposed extras `Meat & Seafood`, `Bakery`, `Frozen`, `Beverages`, `Snacks`, and `Other`. Match on singular and plural, ignore a leading quantity. Items that match nothing go to `Other`.
- Unit-test it with at least 100 common grocery items.

### Parsing spoken or typed text

Write a pluggable function `parseGroceries(text): Promise<Item[]>` where `Item = { name, category }`. Both the voice sheet and the add bar use it.

- **Version 1 (build this):** local rules. Strip lead-ins (`we need`, `get`, `add`, `buy`, `pick up`, `can you add`), split on commas and `and` / `also`, convert quantity words (`a couple` to 2, `a dozen` to 12), trim, capitalize, then categorize.
  Test case: `"We need avocados, a couple limes, taco shells, and paper towels"` must produce Avocados, 2 limes, Taco shells, Paper towels, with categories Produce, Produce, Pantry, Household.
- **Version 2 (build this too, it powers voice):** the server function below. It accepts either text or audio and returns items. Keep it behind the same `parseGroceries` interface, with Version 1 as the fallback for typed text if the call fails. **Never put an OpenAI or Anthropic key in the browser or in `config.json`.**
- A single simple typed item (`milk`) can be added directly without the sheet. Anything with separators opens the same preview sheet (proposed).

### Voice capture and the server function

Flow: tap mic, record with `getUserMedia` and `MediaRecorder`, stop, upload the clip to a Supabase Edge Function, get back `{ transcript, items }`, show the Review state.

- **Do not use** the Web Speech API (unreliable in Home Screen apps) or the iPadOS keyboard dictation key. Greyson does not want either.
- **Recorder:** Safari records `audio/mp4`, other browsers `audio/webm`. Pick the type with `MediaRecorder.isTypeSupported`. Drive the waveform from an `AnalyserNode` on the same stream. Release the microphone tracks as soon as recording stops.
- **Edge Function** (new Supabase project, name it `parse-groceries`):
  1. Accepts either `{ text }` or an audio clip. Reject clips over about 30 seconds or 2 MB.
  2. For audio, call OpenAI speech to text. Current choice: `gpt-transcribe` (about $0.0045 per minute). Pass a short prompt of grocery vocabulary (cilantro, scallions, Greek yogurt, and brand names) to help recognition. Check the current model name and request format in OpenAI's docs.
  3. Send the transcript to Claude Haiku 5.5 (`claude-haiku-5-5`) with a prompt that returns only JSON: `{ "items": [ { "name", "quantity", "category" } ] }`, where category is one of the app's categories. It should expand phrases like `stuff for tacos`, split run-on lists, ignore filler words and fix obvious mishearings. Strip code fences before parsing.
  4. Return `{ transcript, items }`. **No database reads or writes.**
- **Keys** are stored as Supabase secrets (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). They are never in the app.
- **Protect the function.** It is called from a page that is served without login, so the Supabase publishable key in `config.json` is effectively public. Therefore: restrict CORS to the hub's own origin, enforce the size and length limits above, add a simple per-minute rate limit, and set hard monthly spend limits on both API accounts. Do not leave JWT verification off with open CORS.
- **Expected cost:** about a tenth of a cent per 15-second clip.
- A streaming model (`gpt-live-transcribe`) would show words while speaking but costs about 4 times as much and is harder to build. Not for the first build.

### Scenes

- `config.json` lists scenes as `{ id, label, icon, entity_id }`. If `entity_id` starts with `scene.`, call `scene.turn_on`; if `script.`, call `script.turn_on`.
- The scenes themselves are defined in HA (section 9). Their contents are not the app's job.

## 8. Config

`config.json`, loaded at startup. Entity IDs are placeholders; confirm them in HA.

```json
{
  "room": "scullery",
  "autoReturnSeconds": 60,
  "weather": "weather.home",
  "calendars": ["calendar.REPLACE_FAMILY"],
  "groceryList": "todo.shopping_list",
  "voice": { "functionUrl": "https://REPLACE.supabase.co/functions/v1/parse-groceries", "publishableKey": "REPLACE", "maxSeconds": 30, "silenceStopSeconds": 2 },
  "scenes": [
    { "id": "wake-up", "label": "Wake Up", "icon": "sunrise", "entity_id": "script.wake_up" },
    { "id": "good-night", "label": "Good Night", "icon": "moon", "entity_id": "script.good_night" }
  ]
}
```

Add a hidden **setup page** (for example `#/setup`) that lists the weather, calendar, to-do, scene and script entities the signed-in user can see, so Greyson can copy the right IDs into `config.json` without hunting.

## 9. Home Assistant setup (Greyson does this, not the app)

Do these before or alongside the build. Walk Greyson through them if he asks.

1. **iPad user:** create a non-admin HA user for the iPad.
2. **Calendar:** in his Apple Account settings, create an app-specific password. In HA add the CalDAV integration, URL `https://caldav.icloud.com`, his Apple ID and that password. Use the Apple ID that holds the family calendar. Check that each calendar appears as an entity, and whether calendars shared with that account appear (untested).
3. **Groceries:** add the Shopping List integration and confirm `todo.shopping_list` exists.
4. **Phone sync:** in the HA Companion app on one iPhone or the wall iPad, open Reminders Sync (a Labs feature), create a shared Apple Reminders list such as Family Groceries (Family Sharing allows this), and link it two-way to the HA list. Test round trips in both directions and note how long each takes. Test from a second family phone.
5. **Weather:** confirm a `weather.*` entity exists.
6. **Scenes:** create scripts or scenes. Example, with placeholders to replace (the fireplace may be a switch, a climate entity or something else):

```yaml
script:
  wake_up:
    alias: Wake Up
    sequence:
      - action: light.turn_on
        target: { entity_id: light.REPLACE_LAMP }
      - action: switch.turn_on
        target: { entity_id: switch.REPLACE_FIREPLACE }
      - action: media_player.turn_on
        target: { entity_id: media_player.REPLACE_SAMSUNG_TV }
  good_night:
    alias: Good Night
    sequence: []   # contents decided by Greyson's dad
  leaving_home:
    alias: Leaving Home
    sequence: []   # contents decided by Greyson's dad
```

   Turning a Samsung TV on from HA can be unreliable. Test it in the real room. Waking the Apple TV may power the Samsung through HDMI-CEC.
7. **iPad:** Settings, Display & Brightness, Auto-Lock to Never. Keep it plugged in. Open the app URL in Safari, Share, Add to Home Screen, then open it from the Home Screen and sign in there. Use Guided Access to pin the app.

### Voice backend and HTTPS (do before phase 1)

1. **HTTPS.** Install HA's Let's Encrypt add-on and get a certificate for a name Greyson controls (a free DuckDNS name, or a subdomain of a domain he owns) using the DNS challenge. Point the name at HA's local IP. Set HA's `http:` section to use the certificate. Confirm `https://<name>:8123` loads on the iPad over home Wi-Fi.
2. **New Supabase project**, used only by this app. Do not reuse any other project.
3. **New API keys** from separate OpenAI and Anthropic accounts or workspaces made for this app, each with a low monthly spend limit (for example $5). Add them as Supabase secrets.
4. Deploy the `parse-groceries` function (section 7) and put its URL and publishable key in `config.json`.

## 10. Build plan

Do the phases in order. At the end of each phase, show Greyson a screenshot, list what you could not verify, and **stop and wait for his approval** before starting the next one.

0. **Mic spike (do this first, before any design work).** A one-page test served from HA over the HTTPS name: a button that records 5 seconds, plays it back and shows the level. Install it to the Home Screen on the iPad. *Done when:* it records in the installed app, again after force-closing and reopening, and again after the iPad sleeps and wakes. If it fails only in the installed app, tell Greyson immediately; the fallback is running the hub in a regular Safari tab.
1. **Scaffold and connect.** Project, build to `www`, manifest and meta tags, HA connection with `getAuth()`, mock mode, `config.json`, the setup page. *Done when:* the app loads on the iPad from HA over HTTPS, signs in, and the setup page lists entities.
2. **Home.** Layout, clock, date line with weather, three tiles, Today panel with live events. *Done when:* it matches the Home design at 1180 x 820, checked side by side and by eye.
3. **Calendar view.** Today panel and This week panel from real data, `‹ Home`, auto-return. *Done when:* a new event added in Apple Calendar shows up within about 15 minutes.
4. **Grocery list.** Category cards, check and uncheck, Completed with Clear, header count, Home badge, live updates. *Done when:* an item added on an iPhone in Reminders shows on the iPad, and one checked on the iPad shows on the phone (timing depends on Reminders Sync).
5. **Add by typing.** Add bar, `parseGroceries` version 1, the preview sheet, `Add N Items`. *Done when:* the test sentence in section 7 produces the right four chips and adds them.
6. **Voice.** Listening, Transcribing and Review states, recorder and waveform, the `parse-groceries` function, error state. *Done when:* saying the test sentence into the installed Home Screen app on the real iPad produces the right four chips and adds them, still works after closing and reopening the app, and a 30-second ramble with 10 items sorts correctly.
7. **Scenes.** Wire the tiles to HA scripts or scenes with the confirmation state. *Done when:* Wake Up turns on the lamp, fireplace and TV in the real room.
8. **Polish.** Motion, optical alignment pass, frame-rate check, offline indicator, empty states, accessibility of touch targets, one full day of soak testing on the wall iPad.

## 11. Testing

- Unit tests: `categorize`, `parseGroceries`, date and time formatting, all-day event handling, week window.
- Screenshot tests at 1180 x 820 for Home, Calendar, Grocery list and the voice sheet, in mock mode, compared with the design.
- On-device checks on the actual iPad Air: touch targets, scroll behavior, gradients, blur performance, sign-in inside the Home Screen app, behavior after the iPad sleeps and wakes, behavior when Wi-Fi drops.

## 12. Risks and things to verify (do not assume)

1. **HTTPS setup.** The microphone needs HTTPS. The free route (HA Let's Encrypt add-on, DNS challenge, a name pointing at HA's local address) needs about 30 minutes of setup. Some routers block public names that resolve to private addresses (DNS rebinding protection); if so, allow that one name in the router. Check the add-on's current docs for supported DNS providers. Nabu Casa would also work but Greyson does not want a subscription.
2. **Microphone in an installed iPad web app.** Reported WebKit problems: the permission prompt can reappear when the URL hash changes, and recording can fail after closing and reopening the app until the device restarts. It works in a normal Safari tab. Mitigations: no URL changes between screens, release the mic tracks after every recording, and run the phase 0 spike before building anything else. Tell Greyson at once if it fails.
3. **Calendar entity limits.** CalDAV entities track a single upcoming event and refresh about every 15 minutes. Use range queries, and set Greyson's expectation about the delay.
4. **Reminders Sync is a Labs feature.** It can change. Background timing is controlled by iOS (from about 15 minutes to 24 hours when the app is closed). Shared Family lists and the Groceries list type are not covered by its documentation, so test them first. Fallback: the HA Bring! integration with the Bring! app.
5. **Categories do not sync.** They exist only on this screen.
6. **Liquid Glass.** Safari cannot do live SVG-displacement refraction. Candidate libraries: `samasante/liquid-glass` (headless React, with a frosted fallback), `rdev/liquid-glass-react`, `ybouane/liquidglass` (WebGL). Check each README yourself. Use real refraction on at most a few elements.
7. **`corner-shape: squircle`** may not be supported in the iPad's Safari.
8. **HA API names** (`calendar.get_events`, to-do WebSocket commands, `getAuth` flow) must be checked against the current HA docs.
9. **Samsung TV power-on** can be flaky from HA.

## 13. Out of scope for now

- **Rooms control panel.** It was designed in the first brief (Apple Home style glass tiles by room, rooms built automatically from HA Areas, hidden if a room has no controllable devices). No screens for it exist yet and Home has no entry point to it. Build it only after Greyson provides a design and an entry point.
- Floor plan, thermostat tile, camera stills and the Blink link, photo-frame screen, creating events from the wall, Tesla card, motorized shades.
- Dark mode (removed on purpose).

## 14. Questions to ask Greyson

- Where should the Rooms panel be opened from, and can he share its design?
- Should Leaving Home be added as a tile, and where, since the Home design has room for only three tiles?
- Should timed events disappear once they end? (Empty states are decided: quiet single line, see Real data only.)
- Do you have the Claude Design export or tokens (fonts, colors, radii, shadows)?
- Is the iPad's brightness a problem at night with a light-only theme? If so, consider an iPadOS Shortcut that dims the screen at a set time. Do not add a dark theme.
- What extra grocery categories does the family want?
- Which name will the HTTPS address use (a free DuckDNS name, or a subdomain of a domain Greyson owns)?
