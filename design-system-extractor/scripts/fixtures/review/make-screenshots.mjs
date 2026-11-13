#!/usr/bin/env node
// Regenerates the synthetic screenshots the review fixtures reference.
//
//   node design-system-extractor/scripts/fixtures/review/make-screenshots.mjs
//
// The fixtures need real PNG files (the review generator reads the natural size
// from the PNG header and the page frames a thumbnail around a region), but
// they must not carry product screenshots. Each image here is flat rectangles
// drawn at known pixel positions, so a region written in a fixture can be
// checked against the rectangle it is meant to surround.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// rects are [x, y, width, height, "#rrggbb"], painted in order.
function png({ width, height, background, rects }) {
  const pixels = Buffer.alloc(width * height * 3);
  const paint = (x0, y0, w, h, color) => {
    const [r, g, b] = rgb(color);
    for (let y = Math.max(0, y0); y < Math.min(height, y0 + h); y += 1) {
      for (let x = Math.max(0, x0); x < Math.min(width, x0 + w); x += 1) {
        const at = (y * width + x) * 3;
        pixels[at] = r;
        pixels[at + 1] = g;
        pixels[at + 2] = b;
      }
    }
  };
  paint(0, 0, width, height, background);
  for (const [x, y, w, h, color] of rects) paint(x, y, w, h, color);

  // One filter byte (0 = none) in front of every scanline.
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    pixels.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const PAPER = "#f5f0e8";
const CARD = "#ffffff";
const INK = "#2c2a26";
const LINE = "#ddd5c5";
const GOLD = "#8b6000";
const GREEN = "#2f9e58";
const RED = "#c24040";

// Seven signal cards in a row; the first one is the region fixtures point at.
const lightCards = Array.from({ length: 7 }, (_, i) => [
  [40 + i * 160, 220, 144, 300, CARD],
  [56 + i * 160, 240, 60, 20, LINE],
  [140 + i * 160, 236, 32, 32, i === 4 ? RED : i === 0 ? GREEN : GOLD],
  [56 + i * 160, 300, 110, 14, INK],
  [56 + i * 160, 330, 96, 10, LINE],
]).flat();

// Table rows, each with a group of eight mini lights at x 660..948.
const tableRows = Array.from({ length: 8 }, (_, row) => [
  [40, 300 + row * 70, 1120, 62, row % 2 ? "#faf7f2" : CARD],
  [60, 322 + row * 70, 60, 14, INK],
  [180, 322 + row * 70, 120, 14, INK],
  ...Array.from({ length: 8 }, (_, i) => [660 + i * 36, 318 + row * 70, 24, 24, i === 7 ? RED : i % 3 ? GREEN : GOLD]),
  [1060, 316 + row * 70, 60, 28, LINE],
]).flat();

const images = [
  {
    file: "legacy-clean/design-system/assets/component-review/notice-compact.png",
    width: 640,
    height: 200,
    background: PAPER,
    rects: [
      [40, 60, 560, 80, CARD],
      [60, 84, 28, 28, GOLD],
      [104, 88, 320, 16, INK],
    ],
  },
  {
    // Market page: header band, a section heading stack, and the light cards.
    file: "review-flow/design-system/assets/component-review/route-market.png",
    width: 1200,
    height: 700,
    background: PAPER,
    rects: [
      [0, 0, 1200, 56, "#faf7f2"],
      [24, 14, 150, 28, INK],
      [40, 110, 6, 40, GOLD],
      [56, 114, 240, 30, INK],
      [312, 124, 220, 14, LINE],
      [40, 170, 1120, 34, "#ede8df"],
      ...lightCards,
    ],
  },
  {
    // Stock page: header controls, the filter chips row and the ranking table.
    file: "review-flow/design-system/assets/component-review/route-stock.png",
    width: 1200,
    height: 900,
    background: PAPER,
    rects: [
      [0, 0, 1200, 56, "#faf7f2"],
      [24, 14, 150, 28, INK],
      [210, 12, 60, 32, LINE],
      [280, 12, 60, 32, LINE],
      [350, 12, 60, 32, GOLD],
      [820, 12, 90, 32, LINE],
      [920, 12, 90, 32, GOLD],
      [1020, 12, 150, 32, LINE],
      [40, 190, 1120, 76, CARD],
      ...Array.from({ length: 8 }, (_, i) => [120 + i * 56, 206, 44, 44, "#ede8df"]),
      [40, 286, 1120, 2, LINE],
      ...tableRows,
    ],
  },
];

for (const image of images) {
  const target = path.join(here, image.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, png(image));
  console.log(`${image.width}x${image.height}  ${image.file}`);
}
