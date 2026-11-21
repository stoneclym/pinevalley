import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Static build in dist/. A relative base keeps asset paths working wherever it is served:
// Vercel (site root) or Home Assistant's www folder (/local/home-hub/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", target: "safari15", assetsInlineLimit: 0 },
  server: { host: true },
  test: { environment: "node" },
});
