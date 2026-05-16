// Convierte img/logo.png (letras blancas sobre fondo negro) en versión transparente:
// - Pixeles claros → blanco opaco (las letras)
// - Pixeles oscuros → transparente (el fondo)
// Resultado: img/logo-white.png (sin cuadrado negro, sirve sobre cualquier fondo dark)

import sharp from 'sharp';
import path from 'node:path';

const SRC = path.resolve('img/logo.png');
const OUT_WHITE = path.resolve('img/logo-white.png');
const OUT_DARK  = path.resolve('img/logo-dark.png');

async function main() {
  const img = sharp(SRC).ensureAlpha();
  const meta = await img.metadata();
  const { width, height } = meta;
  const raw = await img.raw().toBuffer(); // RGBA

  // Versión WHITE: para fondos oscuros (header/footer dark)
  const whiteBuf = Buffer.alloc(raw.length);
  // Versión DARK: para fondos claros (body crema)
  const darkBuf = Buffer.alloc(raw.length);

  for (let i = 0; i < raw.length; i += 4) {
    // luminancia (0-255). 0=negro/fondo, 255=blanco/letra
    const lum = Math.round(0.2126 * raw[i] + 0.7152 * raw[i+1] + 0.0722 * raw[i+2]);
    // white version: pinto blanco con alpha proporcional al brillo
    whiteBuf[i] = 255;
    whiteBuf[i+1] = 255;
    whiteBuf[i+2] = 255;
    whiteBuf[i+3] = lum;
    // dark version: pinto negro con alpha proporcional al brillo
    darkBuf[i] = 15;
    darkBuf[i+1] = 15;
    darkBuf[i+2] = 15;
    darkBuf[i+3] = lum;
  }

  await sharp(whiteBuf, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(OUT_WHITE);
  console.log(`OK img/logo-white.png (${width}x${height}) — para fondos dark`);

  await sharp(darkBuf, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(OUT_DARK);
  console.log(`OK img/logo-dark.png (${width}x${height}) — para fondos claros`);
}

main().catch(e => { console.error(e); process.exit(1); });
