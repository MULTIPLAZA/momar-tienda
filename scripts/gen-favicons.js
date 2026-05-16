// Genera favicon en múltiples tamaños + apple-touch-icon + OG image desde img/logo.png
// Uso: node scripts/gen-favicons.js

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('img/logo.png');
const IMG_DIR = path.resolve('img');
const ROOT = path.resolve('.');

if (!fs.existsSync(SRC)) {
  console.error('No se encuentra img/logo.png');
  process.exit(1);
}

// El logo es cuadrado, fondo negro #0F0F0F. Mantengo así para favicons.
const BG = { r: 15, g: 15, b: 15, alpha: 1 };

async function gen() {
  // 1) Favicons PNG
  const sizes = [
    { size: 16,  out: path.join(IMG_DIR, 'favicon-16.png') },
    { size: 32,  out: path.join(IMG_DIR, 'favicon-32.png') },
    { size: 48,  out: path.join(IMG_DIR, 'favicon-48.png') },
    { size: 192, out: path.join(IMG_DIR, 'icon-192.png') },
    { size: 512, out: path.join(IMG_DIR, 'icon-512.png') },
    { size: 180, out: path.join(IMG_DIR, 'apple-touch-icon.png') },
  ];

  for (const { size, out } of sizes) {
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: BG })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`OK  ${path.relative(ROOT, out)} (${size}x${size})`);
  }

  // 2) favicon.ico (uso el 32x32 PNG renombrado — los navegadores aceptan PNG con extensión .ico)
  await sharp(SRC)
    .resize(32, 32, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(ROOT, 'favicon.ico'));
  console.log('OK  favicon.ico (32x32)');

  // 3) OG image 1200x630 — logo centrado sobre fondo crema con tagline editorial
  const ogSvg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#F7F5F0"/>
      <text x="600" y="280" text-anchor="middle"
        font-family="Georgia, 'Cormorant Garamond', serif"
        font-size="120" font-style="italic" font-weight="500" fill="#0F0F0F" letter-spacing="2">MoMar</text>
      <text x="600" y="350" text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="22" font-weight="500" fill="#7A736B" letter-spacing="8">HOGAR &amp; MÁS</text>
      <line x1="450" y1="400" x2="750" y2="400" stroke="#DDD6CB" stroke-width="1"/>
      <text x="600" y="450" text-anchor="middle"
        font-family="Georgia, serif"
        font-size="28" font-style="italic" fill="#0F0F0F">Hecho a mano, traído a tu mesa</text>
      <text x="600" y="510" text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="16" fill="#7A736B">Curaduría de artesanías colombianas · Asunción</text>
    </svg>
  `;
  await sharp(Buffer.from(ogSvg))
    .png({ compressionLevel: 9 })
    .toFile(path.join(IMG_DIR, 'og-image.png'));
  console.log('OK  img/og-image.png (1200x630)');

  console.log('\nListo.');
}

gen().catch(e => { console.error(e); process.exit(1); });
