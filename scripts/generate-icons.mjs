import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcPath = '/Users/florian.euler/Downloads/collection-of-angry-roaring-lion-head-logo-designs-isolated-png.webp';

async function processLionIcon(outputSize, outFile) {
  const padded = Math.round(outputSize * 0.88);
  const padding = Math.round((outputSize - padded) / 2);

  // Step 1: load + resize to target padded size
  const resized = await sharp(srcPath)
    .resize(padded, padded, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 255 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(resized.data);
  const { width, height } = resized.info;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2];

    // White/near-white background → make transparent
    if (r > 230 && g > 230 && b > 230) {
      pixels[i+3] = 0;
      continue;
    }

    // Orange/golden tones → red  (R dominant, medium G, low B)
    if (r > 130 && g > 50 && b < 90 && r > g + 40 && r > b + 80) {
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      pixels[i]   = Math.min(255, Math.round(160 + lum * 95));
      pixels[i+1] = Math.round(lum * 20);
      pixels[i+2] = Math.round(lum * 10);
    }
  }

  // Step 2: write recolored PNG to buffer
  const recoloredBuf = await sharp(Buffer.from(pixels), {
    raw: { width, height, channels: 4 }
  }).png().toBuffer();

  // Step 3: black background canvas
  const canvas = await sharp({
    create: {
      width: outputSize, height: outputSize,
      channels: 4, background: { r: 10, g: 10, b: 10, alpha: 255 }
    }
  }).png().toBuffer();

  // Step 4: composite lion onto black bg
  const withLion = await sharp(canvas)
    .composite([{ input: recoloredBuf, top: padding, left: padding, blend: 'over' }])
    .png()
    .toBuffer();

  // Step 5: rounded corner mask
  const r = Math.round(outputSize * 0.215);
  const mask = Buffer.from(
    `<svg width="${outputSize}" height="${outputSize}"><rect width="${outputSize}" height="${outputSize}" rx="${r}" ry="${r}" fill="white"/></svg>`
  );

  await sharp(withLion)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(join(__dirname, '../public', outFile));

  console.log(`✓ ${outFile} (${outputSize}x${outputSize})`);
}

await processLionIcon(512, 'icon-512.png');
await processLionIcon(192, 'icon-192.png');
await processLionIcon(180, 'apple-touch-icon.png');
