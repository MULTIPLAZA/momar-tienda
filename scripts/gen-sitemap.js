// Genera sitemap.xml dinámico con páginas estáticas + productos publicados de Supabase.
// Uso: node scripts/gen-sitemap.js
//
// Requiere .env (carpeta padre) con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o ANON KEY).

import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve('../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error('Falta SUPABASE_URL o KEY en .env');
  process.exit(1);
}

const BASE = 'https://momar-tienda.pages.dev';
const today = new Date().toISOString().slice(0, 10);

// Páginas estáticas
const staticPages = [
  { loc: '/',                       priority: '1.0', changefreq: 'weekly' },
  { loc: '/catalogo.html',          priority: '0.9', changefreq: 'daily' },
  { loc: '/nuestra-historia.html',  priority: '0.7', changefreq: 'monthly' },
  { loc: '/info.html',              priority: '0.6', changefreq: 'monthly' },
];

// Productos publicados
const url = `${SUPABASE_URL}/rest/v1/productos?select=sku,slug,updated_at&estado=eq.publicado`;
const res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
if (!res.ok) {
  console.error('Error fetching productos:', await res.text());
  process.exit(1);
}
const productos = await res.json();
console.log(`Productos publicados: ${productos.length}`);

// Categorías
const catUrl = `${SUPABASE_URL}/rest/v1/categorias?select=slug&activa=eq.true`;
const catRes = await fetch(catUrl, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
const categorias = catRes.ok ? await catRes.json() : [];

const productPages = productos.map(p => ({
  loc: `/producto.html?sku=${encodeURIComponent(p.sku)}`,
  priority: '0.7',
  changefreq: 'weekly',
  lastmod: (p.updated_at || today).slice(0, 10),
}));

const categoryPages = categorias.map(c => ({
  loc: `/catalogo.html?cat=${c.slug}`,
  priority: '0.8',
  changefreq: 'weekly',
}));

const allPages = [...staticPages, ...categoryPages, ...productPages];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(p => `  <url>
    <loc>${BASE}${p.loc}</loc>
    <lastmod>${p.lastmod || today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync('sitemap.xml', xml);
console.log(`OK sitemap.xml generado con ${allPages.length} URLs`);
