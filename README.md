# Pine Valley Home Hub

A wall iPad app (iPad Air 4, landscape, light theme only) served from Home Assistant.
The full build spec is in [CLAUDE.md](CLAUDE.md). Progress is in [STATUS.md](STATUS.md). The Claude Design export is in [design/](design/)
(only the `*-Light` files apply; dark mode was removed on purpose).

## Develop

```bash
npm install
npm run mock      # mock mode: fake weather, calendar and groceries, no HA needed
npm test
```

To develop against a real HA, copy `.env.example` to `.env.development.local` and fill in
a long-lived access token. That file is ignored by git and is never read by `npm run build`.

Mock mode exists only in development builds and only with `?mock=1`. Production builds
contain no sample data.

`npm run build:demo` makes a sample-data demo in `dist-demo/` that scales the iPad screen to fit
any window (it never talks to Home Assistant). `dist-demo/artifact.html` is the version published
as a private claude.ai page for walking through the UI on a phone.

## Deploy to Home Assistant

```bash
npm run build
```

Copy everything in `dist/` to `/config/www/home-hub/` on the HA host. Then on the iPad:

1. Open `https://<ha-name>:8123/local/home-hub/index.html` in Safari (the HTTPS name from spec section 9;
   the microphone does not work over plain HTTP).
2. Share → Add to Home Screen.
3. Open it **from the Home Screen** and sign in there with the `iPad Hub` HA user.

Files in `www` are public on the home network, so `config.json` holds entity IDs only.

## Setup page

Open `#/setup` (for example `https://<ha-name>:8123/local/home-hub/index.html#/setup`) to list the
weather, calendar, to-do, scene and script entities the signed-in user can see, and to see
which IDs in `config.json` were not found.

## Phase 0: microphone test

`dist/mic-test/` is a one-page test with no build step. After copying `dist/` to HA, open
`https://<ha-name>:8123/local/home-hub/mic-test/index.html` in Safari, Add to Home Screen, and open it
from there. It records 5 seconds, shows the level, plays it back, and keeps a log of every
attempt and every launch, so you can compare before and after force-closing and sleeping.
