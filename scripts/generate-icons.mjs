// Renders public/icon.svg to the PNG sizes the manifest and index.html reference.
// The maskable variant drops the rounded corners and scales the artwork into the
// 80 % safe zone so Android's adaptive masks don't clip the letters.
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, '../public/icon.svg'), 'utf-8');

const maskable = svg
  .replace('<rect id="bg" width="512" height="512" rx="112"', '<rect id="bg" width="512" height="512" rx="0"')
  .replace('<g id="art">', '<g id="art" transform="translate(256 256) scale(0.74) translate(-256 -256)">');

const out = (name) => join(__dirname, '../public', name);
for (const [file, size, src] of [
  ['icon-512.png', 512, svg],
  ['icon-192.png', 192, svg],
  ['apple-touch-icon.png', 180, svg],
  ['icon-maskable-512.png', 512, maskable],
  ['icon-maskable-192.png', 192, maskable],
]) {
  await sharp(Buffer.from(src)).resize(size, size).png().toFile(out(file));
  console.log(`✓ ${file}`);
}
