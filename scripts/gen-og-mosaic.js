// Genera img/og-image.png estilo mosaico 2x2 con logo MoMar al centro
// 1200x630 (Open Graph estándar)
import sharp from 'sharp';
import path from 'node:path';

const W = 1200;
const H = 630;
const CW = W / 2;   // 600
const CH = H / 2;   // 315

const LIFESTYLE = path.resolve('img/lifestyle');
const OUT = path.resolve('img/og-image.jpg');
const OUT_PNG_LEGACY = path.resolve('img/og-image.png');

// 4 fotos en orden: top-left, top-right, bottom-left, bottom-right
const fotos = [
  { f: 'rings.jpg',      x: 0,  y: 0  },
  { f: 'necklaces.jpg',  x: CW, y: 0  },
  { f: 'earrings.jpg',   x: 0,  y: CH },
  { f: 'hogar-table.jpg',x: CW, y: CH },
];

async function main() {
  // 1. Procesar cada foto a 600x315 con cover crop
  const tiles = await Promise.all(fotos.map(async (t) => {
    const buf = await sharp(path.join(LIFESTYLE, t.f))
      .resize(CW, CH, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { input: buf, top: t.y, left: t.x };
  }));

  // 2. Círculo central con logo MoMar (overlay SVG)
  // Diámetro: 280px, centrado en (600, 315)
  const CIRC = 280;
  const cx = W / 2;
  const cy = H / 2;
  const overlaySvg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Líneas finas de cruz central (separadores del mosaico, blanco semitransparente) -->
      <line x1="${cx}" y1="0" x2="${cx}" y2="${H}" stroke="rgba(255,255,255,0.95)" stroke-width="2"/>
      <line x1="0" y1="${cy}" x2="${W}" y2="${cy}" stroke="rgba(255,255,255,0.95)" stroke-width="2"/>

      <!-- Círculo blanco para el logo -->
      <circle cx="${cx}" cy="${cy}" r="${CIRC/2}" fill="#F7F5F0"/>
      <circle cx="${cx}" cy="${cy}" r="${CIRC/2}" fill="none" stroke="#0F0F0F" stroke-width="1.5"/>

      <!-- Texto: MoMar italic + Hogar & Más + tagline -->
      <text x="${cx}" y="${cy - 18}" text-anchor="middle"
        font-family="Cormorant Garamond, Georgia, serif"
        font-size="78" font-style="italic" font-weight="500" fill="#0F0F0F" letter-spacing="0.5">MoMar</text>
      <line x1="${cx - 60}" y1="${cy + 8}" x2="${cx + 60}" y2="${cy + 8}" stroke="#0F0F0F" stroke-width="1"/>
      <text x="${cx}" y="${cy + 38}" text-anchor="middle"
        font-family="DM Sans, Arial, sans-serif"
        font-size="14" font-weight="500" fill="#7A736B" letter-spacing="3">HOGAR &amp; MÁS</text>
      <text x="${cx}" y="${cy + 65}" text-anchor="middle"
        font-family="DM Sans, Arial, sans-serif"
        font-size="11" fill="#7A736B" letter-spacing="1">CURADURÍA COLOMBIANA</text>
    </svg>
  `;

  // 3. Componer mosaico + overlay
  const composed = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([
      ...tiles,
      { input: Buffer.from(overlaySvg), top: 0, left: 0 },
    ])
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toBuffer();

  const fs = await import('node:fs');
  fs.writeFileSync(OUT, composed);
  // También sobrescribimos el .png viejo con la misma imagen (por compat con links cacheados)
  await sharp(composed).png({ compressionLevel: 9 }).toFile(OUT_PNG_LEGACY);

  const statJpg = fs.statSync(OUT);
  const statPng = fs.statSync(OUT_PNG_LEGACY);
  console.log(`OK img/og-image.jpg (${W}x${H}, ${Math.round(statJpg.size / 1024)}KB)`);
  console.log(`OK img/og-image.png (legacy, ${Math.round(statPng.size / 1024)}KB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
