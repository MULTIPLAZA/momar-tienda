// Genera versiones web-optimizadas de las fotos Instagram para hero, banners y secciones.
// Uso: node scripts/gen-lifestyle.js

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve('../activos/referencias-visuales/momar-instagram-actual');
const OUT_DIR = path.resolve('img/lifestyle');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Map de uso → archivo origen + transform target
const TARGETS = [
  {
    name: 'hero',
    src: 'SaveClip.App_649880412_17929620390211051_3182115237835213770_n.jpg',
    width: 1920,
    height: 1280,
    fit: 'cover',
    position: 'top',
    quality: 78,
    desc: 'Hero principal · modelo en jardín con collares plateados',
  },
  {
    name: 'hero-mobile',
    src: 'SaveClip.App_649880412_17929620390211051_3182115237835213770_n.jpg',
    width: 900,
    height: 1200,
    fit: 'cover',
    position: 'top',
    quality: 80,
    desc: 'Hero mobile vertical',
  },
  {
    name: 'natural',
    src: 'SaveClip.App_484907019_17888753721211051_314368674135982268_n.jpg',
    width: 1200,
    height: 1600,
    fit: 'cover',
    quality: 82,
    desc: 'Banner Colección Natural · COLOMBIAN HANDMADE',
  },
  {
    name: 'rings',
    src: 'SaveClip.App_461268243_17866538223211051_1756581078971735929_n.jpg',
    width: 1200,
    height: 1500,
    fit: 'cover',
    quality: 82,
    desc: 'Categoría anillos · manos con anillos dorados',
  },
  {
    name: 'necklaces',
    src: 'SaveClip.App_487073952_17891080722211051_8669243103125215029_n.jpg',
    width: 1200,
    height: 1500,
    fit: 'cover',
    quality: 82,
    desc: 'Categoría collares · modelo con collar inicial S',
  },
  {
    name: 'brand',
    src: 'SaveClip.App_461304862_17866538214211051_7507986068969587787_n.jpg',
    width: 1400,
    height: 1000,
    fit: 'cover',
    quality: 82,
    desc: 'Bolsa MoMar branded · cliente real',
  },
  {
    name: 'lifestyle',
    src: 'SaveClip.App_461300936_17866538241211051_2291471456139253733_n.jpg',
    width: 1200,
    height: 1500,
    fit: 'cover',
    quality: 82,
    desc: 'Lifestyle aperol · joyería en uso',
  },
];

async function run() {
  console.log(`Procesando ${TARGETS.length} fotos a ${OUT_DIR}...\n`);
  for (const t of TARGETS) {
    const inPath = path.join(SRC_DIR, t.src);
    if (!fs.existsSync(inPath)) {
      console.warn(`! no existe: ${inPath}`);
      continue;
    }
    const outPath = path.join(OUT_DIR, `${t.name}.jpg`);
    await sharp(inPath)
      .resize(t.width, t.height, { fit: t.fit, position: t.position || 'attention' })
      .jpeg({ quality: t.quality, progressive: true, mozjpeg: true })
      .toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`OK  ${t.name}.jpg (${t.width}x${t.height}, ${Math.round(stat.size / 1024)}KB) — ${t.desc}`);
  }
  console.log('\nListo.');
}

run().catch(e => { console.error(e); process.exit(1); });
