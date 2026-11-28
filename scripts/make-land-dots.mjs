// Generates src/standby/land.json: which cells of the StandBy world map are land.
// Run once (the output is committed). Needs, in a scratch folder:
//   npm i world-atlas@2.0.2 topojson-client@3.1.0 d3-geo@3.1.1
//   node /path/to/make-land-dots.mjs <that folder> <output json>
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [, , depsDir, out] = process.argv;
const require = createRequire(path.join(depsDir, "package.json"));
const { feature } = require("topojson-client");
const { geoContains } = require("d3-geo");
const topo = JSON.parse(readFileSync(require.resolve("world-atlas/land-50m.json"), "utf8"));
const land = feature(topo, topo.objects.land);

// Equirectangular grid, framed like Apple's StandBy world clock.
export const GRID = { lonStart: -170, lonStep: 6.25, cols: 57, latStart: 80, latStep: 5, rows: 28 };
const rows = [];
for (let r = 0; r < GRID.rows; r++) {
  let line = "";
  for (let c = 0; c < GRID.cols; c++) {
    const lon = GRID.lonStart + c * GRID.lonStep;
    const lat = GRID.latStart - r * GRID.latStep;
    // A cell counts as land if its centre or any of 4 nearby points is land (keeps small islands).
    const pts = [[0, 0], [1.5, 1.2], [-1.5, 1.2], [1.5, -1.2], [-1.5, -1.2]];
    line += pts.some(([dx, dy]) => geoContains(land, [lon + dx, lat + dy])) ? "1" : "0";
  }
  rows.push(line);
}
writeFileSync(out, JSON.stringify({ ...GRID, rows }, null, 1) + "\n");
console.log(rows.join("\n"));
