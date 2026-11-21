import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Built files are copied to HA's /config/www/home-hub/, served at /local/home-hub/.
// A relative base keeps every asset path working from that folder.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", target: "safari15", assetsInlineLimit: 0 },
  server: { host: true },
  test: { environment: "node" },
});
