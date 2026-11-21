# iPad Home Hub: Build Spec

This file is the source of truth for building the iPad Home Hub. Read all of it before writing code.
It replaces the earlier design briefs wherever they disagree. In particular: **there is no dark mode**, and the 5-day forecast is gone from Home.

Owner: Greyson Clymer. Designs were made in Claude Design (four light-mode screens, described in section 4). The build is for his family's new house in Wilmington, NC.

## 1. What we are building

A wall-friendly iPad app for the whole family. It sits on a stand in the scullery / butler's pantry, the first place Greyson's dad goes after waking up.

- It shows a very large clock, the date and current weather, today's calendar events, three big tiles, and runs scenes with one tap.
- Tapping the calendar opens an expanded Calendar view. Tapping Groceries opens a shared grocery list.
- Everything lives in one app. Nobody leaves it to use another app.
- It is a PWA served from Home Assistant (HA) and talks to HA over its WebSocket API.

## 2. Decisions that are locked

- Device: iPad Air, 4th generation, 10.9 inch, **landscape only**, on a stand, always plugged in. Design canvas about **1180 x 820 points**.
- **Light theme only.** No dark mode, no sunset switching, no `prefers-color-scheme` branches. Set `color-scheme: light` (CSS and meta tag) so iPadOS dark appearance cannot recolor form controls or scrollbars.
- Installed through Safari's Add to Home Screen, runs full screen (standalone).
- Served from HA's own web folder over plain HTTP on the home network. See section 12, risk 1: the microphone needs HTTPS, which conflicts with this.
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

- Top: an animated waveform and the word `Listening`.
- Large serif transcript in quotes, updating live: `"We need avocados, a couple limes, taco shells, and paper towels"`.
- A thin divider, then **parsed items** grouped by category: a small tracked caps category label on the left and white pill chips for each item (`Avocados`, `2 limes` under PRODUCE; `Taco shells` under PANTRY; `Paper towels` under HOUSEHOLD). The chips update as the transcript grows.
- Bottom: a round glass **stop** button (small square icon) at left; at right a `Cancel` pill and a white primary pill `Add 4 Items` (the number is the chip count).

Behavior: Stop ends listening but keeps the sheet open. `Add N Items` adds every chip to the list and closes the sheet. `Cancel` discards everything. The sheet must work with typed text as well as voice (see section 7).

## 5. Navigation and behavior

- Home is the resting screen. Calendar and Grocery list are one level down, each with `‹ Home`.
- **Auto-return to Home** after about 60 seconds of no touches (configurable). Do not auto-return while the voice sheet is open.
- Scene tiles: a press runs the scene and shows a short confirmation on the tile (for example the icon changes to a check for about 1.5 seconds). They are not toggles. If the call fails, show a brief error state.
- Transitions: short, soft, Apple-like (a subtle zoom or slide, never a hard cut). Respect `prefers-reduced-motion`.
- Clock updates on the minute boundary. Date and weather update live.
- Wall-device hygiene: `touch-action: manipulation`, no text selection except in the add bar, no pull-to-refresh bounce (`overscroll-behavior: none`), no long-press context menus, no double-tap zoom, `viewport-fit=cover`.
- Performance: the iPad Air 4 has an A14 chip. Do not stack many `backdrop-filter` layers. Test frame rate. If it janks, reduce blur radius or fall back to a plain translucent fill.

## 6. Architecture

- Static single-page app, built to a folder that is copied into HA's `/config/www/home-hub/`. HA serves that folder at `/local/home-hub/`. Open `http://<ha-host>:8123/local/home-hub/` on the iPad and Add to Home Screen.
- Files in `www` are served without login. Never put tokens, passwords or API keys in the bundle or in `config.json`. Entity IDs only.
- One shared HA connection (WebSocket). Wrap it in small modules: `ha/connection`, `ha/weather`, `ha/calendar`, `ha/todo`, `ha/scenes`. Screens never call HA directly.
- Per-iPad settings live in `config.json` next to `index.html` (section 8).
- PWA files: web app manifest (`display: standalone`, name, icons) and Apple meta tags (`apple-mobile-web-app-capable`, `apple-touch-icon`). A service worker is not available over plain HTTP, so do not depend on one. The app does not need offline support, because it is useless without HA.

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
- **Version 2 (later):** an AI parser that can expand phrases like `stuff for tacos` into items. **Never put an API key in the browser.** Call a small server-side function, or an HA conversation agent if one is configured. Keep it behind the same `parseGroceries` interface, with Version 1 as the fallback if it fails.
- A single simple typed item (`milk`) can be added directly without the sheet. Anything with separators opens the same preview sheet (proposed).

### Voice capture

- The design shows live listening with a transcript. Browsers only allow microphone access on HTTPS pages, so over plain HTTP this will not work (risk 1).
- If the Web Speech API is unavailable, the mic button should focus the add bar and prompt the iPadOS keyboard's built-in dictation key. The text then goes through the same parse-preview sheet. Build this fallback first; add live listening only if HTTPS is enabled and it works on the actual iPad.

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

## 10. Build plan

Do the phases in order. Show Greyson a screenshot at the end of each phase.

1. **Scaffold and connect.** Project, build to `www`, manifest and meta tags, HA connection with `getAuth()`, mock mode, `config.json`, the setup page. *Done when:* the app loads on the iPad from HA, signs in, and the setup page lists entities.
2. **Home.** Layout, clock, date line with weather, three tiles, Today panel with live events. *Done when:* it matches the Home design at 1180 x 820, checked side by side and by eye.
3. **Calendar view.** Today panel and This week panel from real data, `‹ Home`, auto-return. *Done when:* a new event added in Apple Calendar shows up within about 15 minutes.
4. **Grocery list.** Category cards, check and uncheck, Completed with Clear, header count, Home badge, live updates. *Done when:* an item added on an iPhone in Reminders shows on the iPad, and one checked on the iPad shows on the phone (timing depends on Reminders Sync).
5. **Add by typing.** Add bar, `parseGroceries` version 1, the preview sheet, `Add N Items`. *Done when:* the test sentence in section 7 produces the right four chips and adds them.
6. **Voice.** Dictation-key fallback first. Live listening only if HTTPS is enabled and it works on the iPad.
7. **Scenes.** Wire the tiles to HA scripts or scenes with the confirmation state. *Done when:* Wake Up turns on the lamp, fireplace and TV in the real room.
8. **Polish.** Motion, optical alignment pass, frame-rate check, offline indicator, empty states, accessibility of touch targets, one full day of soak testing on the wall iPad.

## 11. Testing

- Unit tests: `categorize`, `parseGroceries`, date and time formatting, all-day event handling, week window.
- Screenshot tests at 1180 x 820 for Home, Calendar, Grocery list and the voice sheet, in mock mode, compared with the design.
- On-device checks on the actual iPad Air: touch targets, scroll behavior, gradients, blur performance, sign-in inside the Home Screen app, behavior after the iPad sleeps and wakes, behavior when Wi-Fi drops.

## 12. Risks and things to verify (do not assume)

1. **Microphone vs HTTP.** Live voice needs HTTPS. The plan is plain HTTP. Either enable HTTPS (Nabu Casa or a local reverse proxy) or rely on keyboard dictation. Ask Greyson before enabling HTTPS.
2. **Speech recognition in a Home Screen app.** The Web Speech API has been unreliable in iOS standalone web apps. Test early on the actual iPad.
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
- Should timed events disappear once they end, and what shows when nothing is planned?
- Do you have the Claude Design export or tokens (fonts, colors, radii, shadows)?
- Is the iPad's brightness a problem at night with a light-only theme? If so, consider an iPadOS Shortcut that dims the screen at a set time. Do not add a dark theme.
- What extra grocery categories does the family want?
