// Arma mosaico de fotos de productos sin descripción para inspección visual rápida.
// Lee C:/tmp/productos-sin-desc.json, descarga fotos, compone grid con SKU encima.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const JSON_PATH = 'C:/tmp/productos-sin-desc.json';
const TMP_DIR = 'C:/tmp/desc-fotos';
const OUT_DIR = path.resolve('scripts/desc-batch');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const productos = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
const conFoto = productos.filter(p => p.foto);
const sinFoto = productos.filter(p => !p.foto);

console.log(`Productos con foto: ${conFoto.length}`);
console.log(`Productos sin foto: ${sinFoto.length}`);

// Descargar fotos
async function descargar(url, dest) {
  if (fs.existsSync(dest)) return;
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  fs.writeFileSync(dest, Buffer.from(buf));
}

const TILE_W = 300;
const TILE_H = 360; // 300 foto + 60 label

async function armarMosaico(items, outFile, cols = 4) {
  const rows = Math.ceil(items.length / cols);
  const W = TILE_W * cols;
  const H = TILE_H * rows;

  const composites = [];

  for (let i = 0; i < items.length; i++) {
    const p = items[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const dest = path.join(TMP_DIR, p.sku + '.jpg');

    try {
      await descargar(p.foto, dest);
    } catch (e) {
      console.warn(`! sku ${p.sku}: no se pudo descargar foto`);
      continue;
    }

    // Resize foto a TILE_W x TILE_W (cuadrada arriba)
    const fotoBuf = await sharp(dest)
      .resize(TILE_W, TILE_W, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();
    composites.push({ input: fotoBuf, top: row * TILE_H, left: col * TILE_W });

    // Label SVG con SKU + nombre
    const labelSvg = `
      <svg width="${TILE_W}" height="60" xmlns="http://www.w3.org/2000/svg">
        <rect width="${TILE_W}" height="60" fill="#F7F5F0"/>
        <text x="${TILE_W/2}" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#0F0F0F">${p.sku}</text>
        <text x="${TILE_W/2}" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#7A736B">${(p.nombre || '').replace(/&/g, '&amp;').slice(0, 32)}</text>
      </svg>
    `;
    composites.push({ input: Buffer.from(labelSvg), top: row * TILE_H + TILE_W, left: col * TILE_W });
  }

  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 247, g: 245, b: 240 } } })
    .composite(composites)
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(outFile);

  const stat = fs.statSync(outFile);
  console.log(`OK ${outFile} (${W}x${H}, ${Math.round(stat.size / 1024)}KB)`);
}

// Mosaicos en batches de 16 (4x4)
const BATCH = 16;
for (let i = 0; i < conFoto.length; i += BATCH) {
  const batch = conFoto.slice(i, i + BATCH);
  const n = Math.floor(i / BATCH) + 1;
  await armarMosaico(batch, path.join(OUT_DIR, `mosaico-${n}.jpg`), 4);
}

// Lista de los sin foto en texto
fs.writeFileSync(path.join(OUT_DIR, 'sin-foto.json'), JSON.stringify(sinFoto, null, 2));
console.log(`\nSin foto: ${sinFoto.length} (en scripts/desc-batch/sin-foto.json)`);
