/// <reference types="vite/client" />
/** true in dev and the demo build, false in the production build (set in vite.config.ts). */
declare const __MOCK_BUILD__: boolean;
interface ImportMetaEnv {
  readonly VITE_HA_URL: string;
  readonly VITE_HA_TOKEN?: string;
}
