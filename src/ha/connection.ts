/**
 * The one shared Home Assistant WebSocket connection.
 *
 * Where HA is (first match wins):
 *   1. `haUrl` in config.json
 *   2. `VITE_HA_URL` at build time (for example a Vercel environment variable)
 *   3. The page's own origin, but only when the page is served by HA itself (/local/…)
 * With none of these the app stays in real mode with empty screens and says HA isn't set up.
 *
 * Sign-in: getAuth() runs HA's own login page once and refreshes tokens by itself. Tokens are
 * kept in localStorage. Sign in from the installed Home Screen app, because iOS keeps its
 * storage apart from Safari tabs. When the app is served from another origin (Vercel), HA
 * must list that origin in `http: cors_allowed_origins`, and HA must be on HTTPS.
 *
 * Development: `npm run dev` may use a long-lived token from .env.development.local
 * (VITE_HA_TOKEN). That code only exists in dev builds; production never reads a token.
 *
 * Sample data: only with VITE_DEMO=1 at build time or ?mock=1 in the URL. Never the default,
 * and mock mode never talks to HA.
 */
import {
  type Auth,
  type AuthData,
  type Connection,
  createConnection,
  createLongLivedTokenAuth,
  ERR_INVALID_AUTH,
  getAuth,
  getUser,
} from "home-assistant-js-websocket";

const TOKENS_KEY = "hub.hassTokens";

/** Built with VITE_DEMO=1: always sample data. */
export const DEMO_BUILD: boolean = import.meta.env.VITE_DEMO === "1";
/** Sample data on: the demo build, or ?mock=1 on this page load. */
export const MOCK: boolean = DEMO_BUILD || new URLSearchParams(location.search).get("mock") === "1";

export type ConnectionStatus = "connecting" | "online" | "offline" | "unconfigured";
type StatusListener = (s: ConnectionStatus) => void;

let status: ConnectionStatus = MOCK ? "online" : "connecting";
const listeners = new Set<StatusListener>();
function setStatus(s: ConnectionStatus) {
  status = s;
  listeners.forEach((l) => l(s));
}
export function getStatus(): ConnectionStatus {
  return status;
}
export function onStatus(l: StatusListener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

let configuredUrl = "";

/** Called once at startup with config.json's haUrl (may be empty). */
export function configureHa(haUrl: string | undefined) {
  configuredUrl = (haUrl ?? "").trim().replace(/\/+$/, "");
}

/** The HA base URL, or null when it isn't known. */
export function haUrl(): string | null {
  if (configuredUrl) return configuredUrl;
  const env = (import.meta.env.VITE_HA_URL ?? "").trim().replace(/\/+$/, "");
  if (env) return env;
  if (location.pathname.startsWith("/local/")) return location.origin; // served from HA's www folder
  return null;
}

function saveTokens(data: AuthData | null) {
  try {
    if (data) localStorage.setItem(TOKENS_KEY, JSON.stringify(data));
    else localStorage.removeItem(TOKENS_KEY);
  } catch {
    /* private mode: tokens last for this session only */
  }
}

async function loadTokens(): Promise<AuthData | null> {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as AuthData) : null;
  } catch {
    return null;
  }
}

class NotConfiguredError extends Error {}

async function makeAuth(hassUrl: string): Promise<Auth> {
  if (import.meta.env.DEV && import.meta.env.VITE_HA_TOKEN) {
    return createLongLivedTokenAuth(hassUrl, import.meta.env.VITE_HA_TOKEN);
  }
  if (import.meta.env.DEV && !location.search.includes("auth_callback")) {
    // HA's login redirect works from the dev server too, but a token is simpler.
    console.info("Dev: set VITE_HA_TOKEN in .env.development.local to skip HA's login page.");
  }
  try {
    const auth = await getAuth({
      hassUrl,
      // Return to this page without the hash: getAuth appends ?auth_callback=1.
      redirectUrl: location.origin + location.pathname,
      saveTokens,
      loadTokens,
    });
    // Remove the ?auth_callback=…&code=… query once the code has been exchanged.
    if (location.search.includes("auth_callback")) {
      history.replaceState(null, "", location.pathname + location.hash);
    }
    return auth;
  } catch (err) {
    if (err === ERR_INVALID_AUTH) {
      // Stored tokens were revoked; start the login again.
      saveTokens(null);
      location.replace(location.origin + location.pathname);
    }
    throw err;
  }
}

let connectionPromise: Promise<Connection> | null = null;

/** The shared connection. Never called in mock mode. */
export function getConnection(): Promise<Connection> {
  if (MOCK) return Promise.reject(new Error("getConnection() called in mock mode"));
  if (!connectionPromise) {
    connectionPromise = (async () => {
      const url = haUrl();
      if (!url) throw new NotConfiguredError("Home Assistant address is not set");
      const auth = await makeAuth(url);
      // setupRetry -1: keep retrying the first connect forever (HA may be rebooting).
      const conn = await createConnection({ auth, setupRetry: -1 });
      setStatus("online");
      conn.addEventListener("ready", () => setStatus("online"));
      conn.addEventListener("disconnected", () => setStatus("offline"));
      conn.addEventListener("reconnect-error", () => setStatus("offline"));
      // After the iPad wakes, nudge a reconnect instead of waiting for the backoff.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && !conn.connected) conn.reconnect(true);
      });
      return conn;
    })();
    connectionPromise.catch((err) => {
      if (err instanceof NotConfiguredError) {
        setStatus("unconfigured");
        return;
      }
      console.error("HA connection failed", err);
      setStatus("offline");
    });
  }
  return connectionPromise;
}

/** Display name of the signed-in HA user, for the setup page. */
export async function currentUserName(): Promise<string> {
  if (MOCK) return "Sample data";
  const user = await getUser(await getConnection());
  return user.name;
}
