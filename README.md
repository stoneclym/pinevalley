# Pine Valley Home Hub

A wall iPad app (iPad Air 4, landscape, light theme only) served from Home Assistant.
The full build spec is in [CLAUDE.md](CLAUDE.md). The Claude Design export is in [design/](design/)
(only the `*-Light` files apply; dark mode was removed on purpose).

## Develop

```bash
npm install
npm run mock      # mock mode: fake weather, calendar and groceries, no HA needed
npm test
```

To develop against a real HA, copy `.env.example` to `.env.development.local` and fill in
a long-lived access token. That file is ignored by git and is never read by `npm run build`.

Mock mode is turned on with `?mock=1` and stays on until `?mock=0`.

## Deploy to Home Assistant

```bash
npm run build
```

Copy everything in `dist/` to `/config/www/home-hub/` on the HA host. Then on the iPad:

1. Open `http://<ha-host>:8123/local/home-hub/` in Safari.
2. Share → Add to Home Screen.
3. Open it **from the Home Screen** and sign in there with the `iPad Hub` HA user.

Files in `www` are public on the home network, so `config.json` holds entity IDs only.

## Setup page

Open `#/setup` (for example `http://<ha-host>:8123/local/home-hub/#/setup`) to list the
weather, calendar, to-do, scene and script entities the signed-in user can see, and to see
which IDs in `config.json` were not found.
