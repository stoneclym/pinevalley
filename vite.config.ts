import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Built files are copied to HA's /config/www/home-hub/, served at /local/home-hub/.
// A relative base keeps every asset path working from that folder.
//
// `npm run build`       production build for HA, no sample data in it
// `npm run build:demo`  sample-data demo that scales to any screen, built to dist-demo/
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react()],
  define: { __MOCK_BUILD__: JSON.stringify(mode !== "production") },
  build: {
    outDir: mode === "demo" ? "dist-demo" : "dist",
    target: "safari15",
    assetsInlineLimit: 0,
  },
  server: { host: true },
  test: { environment: "node" },
}));
