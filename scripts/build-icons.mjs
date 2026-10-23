#!/usr/bin/env node
// Rasterizes assets-src/icon.svg into the PNG sizes the manifest needs.
// Uses `sharp` which ships prebuilt binaries for every CI OS.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const SIZES = [16, 32, 48, 128, 512];
const src = resolve('assets-src/icon.svg');
const svg = await readFile(src);

for (const size of SIZES) {
  const out = resolve(`public/icons/icon-${size}.png`);
  await sharp(svg, { density: 384 }).resize(size, size, { fit: 'contain' }).png().toFile(out);
  console.log(`wrote ${out}`);
}
