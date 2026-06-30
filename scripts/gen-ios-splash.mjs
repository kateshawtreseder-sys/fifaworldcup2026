// Generates solid-colour iOS `apple-touch-startup-image` PNGs (one per iPhone
// resolution) so an installed PWA shows a dark launch frame instead of white.
// Pure Node — no deps, no network. Re-run with: `node scripts/gen-ios-splash.mjs`
//
// The colour matches the <Splash> overlay and the html/body background, so the
// native launch screen blends straight into the in-app splash.
//
// It also prints the <link rel="apple-touch-startup-image"> tags to paste into
// the layout (kept in sync with the SPLASH_DEVICES export consumed by layout).
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BG = [0x07, 0x0b, 0x16]; // #070b16

// Portrait iPhone resolutions: [cssWidth, cssHeight, dpr].
// Covers SE through the iPhone 16 line. Add rows as Apple ships new sizes.
const DEVICES = [
  [320, 568, 2], [375, 667, 2], [414, 736, 3], [375, 812, 3],
  [414, 896, 2], [414, 896, 3], [390, 844, 3], [428, 926, 3],
  [393, 852, 3], [430, 932, 3], [402, 874, 3], [440, 956, 3],
];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function solidPng(w, h, [r, g, b]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: truecolour RGB
  // 10-12: compression, filter, interlace = 0

  const rowLen = 1 + w * 3;
  const raw = Buffer.alloc(rowLen * h);
  for (let y = 0; y < h; y++) {
    const off = y * rowLen;
    raw[off] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const p = off + 1 + x * 3;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "splash");
mkdirSync(outDir, { recursive: true });

const links = [];
for (const [cw, ch, dpr] of DEVICES) {
  const pw = cw * dpr;
  const ph = ch * dpr;
  const file = `splash-${pw}x${ph}.png`;
  writeFileSync(join(outDir, file), solidPng(pw, ph, BG));
  links.push(
    `<link rel="apple-touch-startup-image" href="/splash/${file}" ` +
      `media="screen and (device-width: ${cw}px) and (device-height: ${ch}px) ` +
      `and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" />`,
  );
}

console.log(`Wrote ${DEVICES.length} startup images to public/splash/\n`);
console.log(links.join("\n"));
