/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** "1" builds the sample-data demo. Leave unset for the real app. */
  readonly VITE_DEMO?: string;
  /** Home Assistant base URL, e.g. https://home.example.com:8123 (not a secret). */
  readonly VITE_HA_URL?: string;
  /** Dev server only. Never set this in Vercel; production builds ignore it. */
  readonly VITE_HA_TOKEN?: string;
  /** parse-groceries Supabase Edge Function URL (not a secret). */
  readonly VITE_PARSE_FUNCTION_URL?: string;
  /** Supabase publishable key (public by design). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
