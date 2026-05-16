// Convierte primeras N paginas de PDF a PNGs para inspeccion visual
import { pdfToPng } from 'pdf-to-png-converter';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'C:/tmp/catalogo-momar.pdf';
const OUT_DIR = path.resolve('../activos/referencias-visuales/catalogo-pages');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const arg = process.argv[2] || '1-8';
const [a, b] = arg.split('-').map(Number);
const start = a || 1;
const end = b || start;
const pages = [];
for (let i = start; i <= end; i++) pages.push(i);

console.log(`Convirtiendo paginas ${start}-${end} de ${SRC}...`);

const scale = Number(process.argv[3]) || 1.2;
const result = await pdfToPng(SRC, {
  outputFolder: OUT_DIR,
  outputFileMaskFunc: (pageNum) => `page-${String(pageNum).padStart(2, '0')}@${scale}x.png`,
  viewportScale: scale,
  pagesToProcess: pages,
});

for (const r of result) {
  const stat = fs.statSync(r.path);
  console.log(`OK page ${r.pageNumber} -> ${path.basename(r.path)} (${Math.round(stat.size/1024)}KB)`);
}
