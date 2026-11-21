/**
 * The one shared Home Assistant WebSocket connection.
 *
 * Production: the app is served from HA's own origin (/local/home-hub/), so getAuth()
 * runs HA's normal login once and refreshes tokens on its own. Tokens live in localStorage.
 * Sign in from the installed Home Screen app: iOS keeps its storage apart from Safari tabs.
 *
 * Development: `npm run dev` may use a long-lived token from .env.development.local.
 * That file is only read in dev mode, and the branch is removed from production builds.
 *
 * Mock mode (?mock=1, remembered until ?mock=0) never touches HA.
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
const MOCK_KEY = "hub.mock";

function readMockFlag(): boolean {
  const param = new URLSearchParams(location.search).get("mock");
  try {
    if (param === "1") localStorage.setItem(MOCK_KEY, "1");
    if (param === "0") localStorage.removeItem(MOCK_KEY);
    if (localStorage.getItem(MOCK_KEY) === "1") return true;
  } catch {
    if (param === "1") return true;
  }
  // In dev without a token there is nothing to talk to, so default to mock.
  return import.meta.env.DEV && !import.meta.env.VITE_HA_TOKEN;
}

export const MOCK = readMockFlag();

export type ConnectionStatus = "connecting" | "online" | "offline";
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

async function makeAuth(): Promise<Auth> {
  if (import.meta.env.DEV && import.meta.env.VITE_HA_TOKEN) {
    return createLongLivedTokenAuth(import.meta.env.VITE_HA_URL, import.meta.env.VITE_HA_TOKEN);
  }
  try {
    const auth = await getAuth({
      hassUrl: location.origin,
      // Return to the app root without the hash: getAuth appends ?auth_callback=1,
      // which would land inside the hash route otherwise.
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
      const auth = await makeAuth();
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
      console.error("HA connection failed", err);
      setStatus("offline");
    });
  }
  return connectionPromise;
}

/** Display name of the signed-in HA user, for the setup page. */
export async function currentUserName(): Promise<string> {
  if (MOCK) return "Mock mode";
  const user = await getUser(await getConnection());
  return user.name;
}
