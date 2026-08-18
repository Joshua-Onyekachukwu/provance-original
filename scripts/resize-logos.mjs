#!/usr/bin/env node
/**
 * resize-logos.mjs — Resize the 2000×2000 logo PNGs to web-appropriate sizes.
 *
 * Outputs to public/ so Vite serves them as static assets:
 *   - favicon-32.png       (32×32, for browser tab)
 *   - favicon-180.png      (180×180, apple-touch-icon)
 *   - logo-dark-80.png     (80×80, navbar on light bg)
 *   - logo-white-80.png    (80×80, sidebar on dark bg)
 *   - logo-dark-40.png     (40×40, compact navbar)
 *   - logo-white-40.png    (40×40, compact sidebar)
 */

import { Jimp } from 'jimp';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const LOGO_DIR = resolve(ROOT, 'logo');
const OUT_DIR = resolve(ROOT, 'public');

const SIZES = [
  { src: 'Provance Logo Dark.png',  out: 'logo-dark-80.png',   size: 80 },
  { src: 'Provance Logo Dark.png',  out: 'logo-dark-40.png',   size: 40 },
  { src: 'Provance Logo White.png', out: 'logo-white-80.png',  size: 80 },
  { src: 'Provance Logo White.png', out: 'logo-white-40.png',  size: 40 },
  { src: 'Provance Logo Favicon.png', out: 'favicon-180.png',  size: 180 },
  { src: 'Provance Logo Favicon.png', out: 'favicon-32.png',   size: 32 },
];

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  for (const { src, out, size } of SIZES) {
    const input = resolve(LOGO_DIR, src);
    if (!existsSync(input)) {
      console.error(`  SKIP ${src} — not found`);
      continue;
    }
    const img = await Jimp.read(input);
    img.resize({ w: size, h: size });
    const output = resolve(OUT_DIR, out);
    await img.write(output);
    console.log(`  ✓ ${out} (${size}×${size})`);
  }

  console.log('\nDone — all logos resized and written to public/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
