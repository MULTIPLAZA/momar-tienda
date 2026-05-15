#!/usr/bin/env node
/**
 * MoMar · Update categorías de productos según patrones del nombre
 *
 * Uso: node scripts/update-categorias.js
 *
 * Mira los productos sin categoría asignada e infiere desde su nombre:
 *   "Anillo *"        -> anillos
 *   "Cadena|Collar *" -> collares
 *   "Aro|Pendiente *" -> aros
 *   "Pulsera *"       -> pulseras
 *   resto             -> queda null (admin decide manualmente)
 */

const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const { createClient } = require('@supabase/supabase-js');
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function inferirSlug(nombre) {
  const n = nombre.toLowerCase();
  if (/^anillo/.test(n)) return 'anillos';
  if (/^cadena|^collar|^choker|^chocker|^gargantilla|^dije/.test(n)) return 'collares';
  if (/^aro|^pendiente|^arete|^argolla/.test(n)) return 'aros';
  if (/^pulsera|^brazalete|^ribbon|^riviere/.test(n)) return 'pulseras';
  if (/florero|bandeja|vela|decoracion|marco|vajilla|porcelana|cristal|crystal|portavela/.test(n)) return 'hogar';
  return null;
}

async function main() {
  console.log('Fetching categorias...');
  const { data: cats, error: catErr } = await supa.from('categorias').select('id, slug');
  if (catErr) throw catErr;
  const slugToId = {};
  cats.forEach(c => slugToId[c.slug] = c.id);
  console.log('  Categorías:', cats.map(c => c.slug).join(', '));

  console.log('\nFetching productos sin categoría...');
  const { data: prods, error: prodErr } = await supa
    .from('productos')
    .select('id, sku, nombre, categoria_id')
    .is('categoria_id', null);
  if (prodErr) throw prodErr;
  console.log(`  Encontrados: ${prods.length} productos sin categoría\n`);

  const counts = { anillos: 0, collares: 0, aros: 0, pulseras: 0, hogar: 0, sin_match: 0 };
  const updates = [];

  for (const p of prods) {
    const slug = inferirSlug(p.nombre);
    if (!slug) {
      counts.sin_match++;
      console.log(`  ⏭ ${p.sku.padEnd(8)} ${p.nombre} → sin match`);
      continue;
    }
    const catId = slugToId[slug];
    if (!catId) {
      console.log(`  ⚠ ${p.sku} → slug ${slug} no encontrado en categorías`);
      continue;
    }
    updates.push({ id: p.id, sku: p.sku, nombre: p.nombre, slug, catId });
    counts[slug]++;
  }

  console.log('\nResumen inferido:');
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k.padEnd(12)} ${v}`));

  console.log('\nAplicando UPDATEs...');
  let ok = 0, err = 0;
  for (const u of updates) {
    const { error } = await supa.from('productos').update({ categoria_id: u.catId }).eq('id', u.id);
    if (error) { console.log(`  ❌ ${u.sku}: ${error.message}`); err++; }
    else ok++;
  }
  console.log(`\n✅ OK: ${ok}    ❌ Errores: ${err}    ⏭ Sin match: ${counts.sin_match}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
