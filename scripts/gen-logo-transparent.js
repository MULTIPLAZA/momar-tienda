// Convierte img/logo.png (letras blancas sobre fondo negro) en versión transparente.
// PASO 1: trim del padding negro (las letras ocupan ~50% del cuadrado original).
// PASO 2: genera variants:
//   - logo-white.png: letras blancas sobre transparente (para fondos oscuros)
//   - logo-dark.png:  letras negras sobre transparente (para fondos claros)
// Alpha con curva más nítida (gamma) para que los bordes no se vean desvaídos.

import sharp from 'sharp';
import path from 'node:path';

const SRC = path.resolve('img/logo.png');
const OUT_WHITE = path.resolve('img/logo-white.png');
const OUT_DARK  = path.resolve('img/logo-dark.png');

async function main() {
  // PASO 1: trim del fondo negro
  // .trim() quita pixeles que matcheen con el color top-left (negro) dentro de un threshold
  const trimmed = sharp(SRC)
    .trim({ background: { r: 0, g: 0, b: 0 }, threshold: 20 });

  // Lo paso a un buffer intermedio para preservar el resultado del trim
  const trimmedBuf = await trimmed.png().toBuffer();
  const meta = await sharp(trimmedBuf).metadata();
  const { width, height } = meta;
  console.log(`Trim: ${width}x${height} (original era 386x386 con padding negro)`);

  // Padding mínimo alrededor de las letras (4% del width)
  const pad = Math.round(width * 0.04);
  const padded = await sharp(trimmedBuf)
    .extend({
      top: pad, bottom: pad, left: pad, right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const raw = padded.data;
  const W = padded.info.width;
  const H = padded.info.height;

  // PASO 2: alpha con curva más nítida.
  // Mapeo: lum < 20 → alpha 0; lum > 200 → alpha 255; en medio, curva más pronunciada.
  function sharpenAlpha(lum) {
    if (lum < 20) return 0;
    if (lum > 200) return 255;
    // Curva: lum lineal entre 20 y 200, pero amplificada
    const t = (lum - 20) / 180;        // 0..1
    const sharp = Math.pow(t, 0.7);    // gamma <1 → empuja hacia 255 (más opaco)
    return Math.round(sharp * 255);
  }

  const whiteBuf = Buffer.alloc(raw.length);
  const darkBuf  = Buffer.alloc(raw.length);

  for (let i = 0; i < raw.length; i += 4) {
    const lum = Math.round(0.2126 * raw[i] + 0.7152 * raw[i+1] + 0.0722 * raw[i+2]);
    const a = sharpenAlpha(lum);

    whiteBuf[i] = 255;
    whiteBuf[i+1] = 255;
    whiteBuf[i+2] = 255;
    whiteBuf[i+3] = a;

    darkBuf[i] = 15;
    darkBuf[i+1] = 15;
    darkBuf[i+2] = 15;
    darkBuf[i+3] = a;
  }

  await sharp(whiteBuf, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(OUT_WHITE);
  console.log(`OK img/logo-white.png (${W}x${H}) — para fondos dark`);

  await sharp(darkBuf, { raw: { width: W, height: H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(OUT_DARK);
  console.log(`OK img/logo-dark.png (${W}x${H}) — para fondos claros`);
}

main().catch(e => { console.error(e); process.exit(1); });
