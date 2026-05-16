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
  // HERO PRINCIPAL — modelo rubia con set completo de joyas (la mejor)
  // La foto original es vertical, hacemos crop horizontal con la modelo a la derecha
  // dejando aire a la izquierda para el copy del hero
  {
    name: 'hero',
    src: 'SaveClip.App_645867423_17928754629211051_1814072146106467222_n.jpg',
    width: 1920,
    height: 1280,
    fit: 'cover',
    position: 'right',
    quality: 80,
    desc: 'Hero principal · modelo con set completo de joyas doradas',
  },
  {
    name: 'hero-mobile',
    src: 'SaveClip.App_645867423_17928754629211051_1814072146106467222_n.jpg',
    width: 900,
    height: 1200,
    fit: 'cover',
    position: 'center',
    quality: 82,
    desc: 'Hero mobile vertical',
  },

  // FUNDADORAS — nuevas a COLOR (la del PDF era B&N)
  {
    name: 'founders-color',
    src: 'SaveClip.App_574498636_18100198303613665_4455269756595184465_n.jpg',
    width: 1600,
    height: 2100,
    fit: 'inside',
    quality: 84,
    desc: 'Moni & Marga caminando en Doce 10 (a color, completa)',
  },
  {
    name: 'founders-event',
    src: 'SaveClip.App_581403730_18121176991523745_5719431296665366553_n.jpg',
    width: 1400,
    height: 1900,
    fit: 'inside',
    quality: 82,
    desc: '3 mujeres en local MoMar · evento/inauguracion B&N',
  },

  // CATEGORÍAS Y SECCIONES
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
    position: 'top',
    quality: 84,
    desc: 'Bolsa MoMar branded · crop superior para mostrar el logo MoMar',
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
  {
    name: 'earrings',
    src: 'SaveClip.App_552220180_17903026578256396_2913894922128505738_n.jpg',
    width: 1200,
    height: 1500,
    fit: 'cover',
    quality: 84,
    desc: 'Categoría aros · aretes flor dorada con perla',
  },
  {
    name: 'bracelet',
    src: 'SaveClip.App_645887747_17928754638211051_4327558085659302903_n.jpg',
    width: 1200,
    height: 1500,
    fit: 'cover',
    quality: 84,
    desc: 'Pulsera dorada esmeralda close-up',
  },
  {
    name: 'hogar-table',
    src: 'SaveClip.App_520583628_17902871457211051_2489244047387463050_n.jpg',
    width: 1200,
    height: 1500,
    fit: 'cover',
    quality: 84,
    desc: 'Mesa con servilletas monstera y posaplatos',
  },
  {
    name: 'hogar-vintage',
    src: 'SaveClip.App_518264469_17902871448211051_8334233020183933321_n.jpg',
    width: 1200,
    height: 1500,
    fit: 'cover',
    quality: 84,
    desc: 'Mesa con muebles vintage · comedor hogar',
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
