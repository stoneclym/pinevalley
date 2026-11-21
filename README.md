# Pine Valley Home Hub

A wall iPad app (iPad Air 4, landscape, light theme only) that talks to Home Assistant.
The build spec is [CLAUDE.md](CLAUDE.md). Progress, and what is real versus sample data, is in [STATUS.md](STATUS.md).
The Claude Design export is in [design/](design/) (only the `*-Light` files apply).

## Modes

- **Real (default).** Data comes only from Home Assistant. With nothing connected, screens stay
  empty and a small label says Home Assistant isn't set up.
- **Demo.** Sample data, never sent to Home Assistant, labelled "Demo · sample data".
  Turn it on with `?mock=1` in the URL, or build with `VITE_DEMO=1`.

## Develop

```bash
npm install
```

```bash
npm run mock
```

```bash
npm test
```

For a real Home Assistant locally, copy `.env.example` to `.env.local` and set `VITE_HA_URL`
and `VITE_HA_TOKEN` (a long-lived token; dev server only, ignored by production builds).

## Deploy on Vercel

`vercel.json` sets everything: `npm ci`, `npm run build`, output folder `dist`.
Set these environment variables in Vercel (all public values, none are secrets):

| Name | Value |
|---|---|
| `VITE_HA_URL` | Your Home Assistant HTTPS address, e.g. `https://home.example.com:8123` |
| `VITE_PARSE_FUNCTION_URL` | `https://<project>.supabase.co/functions/v1/parse-groceries` (when it exists) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The Supabase project's publishable key (when it exists) |

Leave `VITE_DEMO` and `VITE_HA_TOKEN` unset in Vercel.

Home Assistant must allow the Vercel address. In `configuration.yaml`:

```yaml
http:
  cors_allowed_origins:
    - https://<your-app>.vercel.app
```

## Deploy inside Home Assistant (alternative)

Copy `dist/` to `/config/www/home-hub/` and open `https://<ha-name>:8123/local/home-hub/index.html`.
Served this way, the app finds Home Assistant on its own and no CORS setting is needed.

## Useful addresses

- `/?mock=1`: the demo with sample data
- `/mic-test/` or `/?mictest=1`: the Phase 0 microphone test. Add it to the Home Screen as its
  own app. It records 5 seconds, shows the level, plays back, and logs every try and every launch.
- `/#/setup`: lists the entities your Home Assistant user can see, to copy into `public/config.json`

`public/config.json` holds entity IDs and the optional `haUrl` (which wins over `VITE_HA_URL`).
It is public: never put a token or key in it.

`npm run build:demo` builds the sample-data version that's published as a private claude.ai page.
