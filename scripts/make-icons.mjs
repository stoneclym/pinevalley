// Generates the PWA / apple-touch PNG icons with no dependencies.
// A warm diagonal gradient (from the design's background) with a simple house outline.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

// Signed distance to a segment, for anti-aliased strokes.
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
// House outline in unit coordinates.
const lines = [
  [0.27, 0.48, 0.5, 0.29], [0.5, 0.29, 0.73, 0.48],
  [0.33, 0.43, 0.33, 0.72], [0.67, 0.43, 0.67, 0.72], [0.33, 0.72, 0.67, 0.72],
];

function png(size) {
  const from = [0xf5, 0xee, 0xe2], to = [0xdc, 0xc4, 0xa2], ink = [0x2b, 0x21, 0x18];
  const stroke = 0.034;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size, v = (y + 0.5) / size;
      const t = (u + v) / 2;
      let rgb = from.map((f, i) => f + (to[i] - f) * t);
      const d = Math.min(...lines.map((l) => segDist(u, v, ...l)));
      const a = Math.max(0, Math.min(1, (stroke / 2 - d) * size + 0.5));
      rgb = rgb.map((c, i) => c * (1 - a) + ink[i] * a);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [name, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  writeFileSync(new URL(`../public/${name}`, import.meta.url), png(size));
}
console.log("icons written to public/");
