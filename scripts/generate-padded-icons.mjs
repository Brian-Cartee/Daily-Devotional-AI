#!/usr/bin/env node
/**
 * Build Safari/PWA icons with safe padding so rounded tiles don't clip the glow.
 * Run: node scripts/generate-padded-icons.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../artifacts/shepherds-path/public");
const src = path.join(publicDir, "talk-it-through-icon.png");

/** Brand purple — matches theme-color / icon interior */
const BG = { r: 45, g: 20, b: 74, alpha: 1 };

/** Logo occupies ~72% of canvas (14% inset per side) */
const INSET = 0.14;

const OUTPUTS = [
  { size: 32, file: "favicon-32.png" },
  { size: 180, file: "apple-touch-icon.png" },
  { size: 192, file: "app-icon-192.png" },
  { size: 512, file: "app-icon-512.png" },
  { size: 1024, file: "sp-icon.png" },
];

async function renderIcon(size, outPath) {
  const inner = Math.max(8, Math.round(size * (1 - INSET * 2)));
  const logo = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: BG })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outPath);
}

async function main() {
  for (const { size, file } of OUTPUTS) {
    const out = path.join(publicDir, file);
    await renderIcon(size, out);
    console.log(`Wrote ${file} (${size}×${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
