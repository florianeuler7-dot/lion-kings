import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, '../public/icon.svg'));

for (const [file, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
  await sharp(svg).resize(size, size).png().toFile(join(__dirname, '../public', file));
  console.log(`✓ ${file}`);
}
