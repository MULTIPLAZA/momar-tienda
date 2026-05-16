// Procesa la pagina 22 del catalogo MoMar (foto B&N de Moni & Marga)
// en dos versiones: hero (con logo+firma) y crop (solo foto)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('../activos/referencias-visuales/catalogo-pages/page-22@3x.png');
const OUT_DIR = path.resolve('img/lifestyle');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const META = await sharp(SRC).metadata();
console.log(`Source: ${META.width}x${META.height}`);

// Version 1: pagina completa optimizada (logo + foto + firma)
// Esto preserva el branding original del catalogo
await sharp(SRC)
  .resize(1400, null, { withoutEnlargement: true })
  .jpeg({ quality: 86, progressive: true, mozjpeg: true })
  .toFile(path.join(OUT_DIR, 'founders.jpg'));
console.log('OK founders.jpg (pagina completa)');

// Version 2: crop solo de la foto B&N (sin logo, sin firma, sin bandas blancas)
const top = Math.round(META.height * 0.10);
const cropHeight = Math.round(META.height * 0.77);
const left = Math.round(META.width * 0.07);
const cropWidth = META.width - 2 * left;

await sharp(SRC)
  .extract({ left, top, width: cropWidth, height: cropHeight })
  .resize(1400, null, { withoutEnlargement: true })
  .jpeg({ quality: 86, progressive: true, mozjpeg: true })
  .toFile(path.join(OUT_DIR, 'founders-crop.jpg'));
console.log('OK founders-crop.jpg (solo foto)');

// Version 3: crop horizontal 16:9 para hero principal alternativo
// Tomar la franja central horizontalmente
const heroH = Math.round(META.width * 9 / 16);
const heroTop = Math.round((META.height - heroH) / 2) - 100;
await sharp(SRC)
  .extract({ left: 0, top: Math.max(0, heroTop), width: META.width, height: heroH })
  .resize(1920, null, { withoutEnlargement: true })
  .jpeg({ quality: 86, progressive: true, mozjpeg: true })
  .toFile(path.join(OUT_DIR, 'founders-hero.jpg'));
console.log('OK founders-hero.jpg (16:9 horizontal)');
