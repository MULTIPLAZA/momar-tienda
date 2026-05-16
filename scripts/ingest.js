#!/usr/bin/env node
/**
 * MoMar · Ingesta de catálogo
 *
 * Uso: node ingest.js productos.json
 *
 * Donde productos.json es un array de:
 * [
 *   {
 *     "sku": "AN-001",
 *     "codigo_barras": "7791234567890",
 *     "nombre": "Solitario Luna",
 *     "descripcion": "Anillo oro 18k con diamante...",
 *     "precio_gs": 2850000,
 *     "categoria_slug": "anillos",
 *     "material": "Oro 18k",
 *     "stock": 1,
 *     "foto_path": "C:/.../fotos-con-codigo/7791234567890.jpg"
 *   },
 *   ...
 * ]
 *
 * Variables de entorno requeridas en .env (de la carpeta padre):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs');
const path = require('path');

// Cargar .env de la carpeta padre o de la raíz del repo
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'productos';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  console.error('   Esperaba el archivo en:', envPath);
  process.exit(1);
}

// Lazy-import del SDK (instala si falta)
let createClient;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch (e) {
  console.error('⚠ @supabase/supabase-js no instalado. Ejecutá:');
  console.error('   npm install @supabase/supabase-js');
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function subirFoto(filePath, sku, slot = 'main') {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase().slice(1) || 'jpg';
  const key = `${sku}/${slot}.${ext}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const { data, error } = await supa.storage
    .from(BUCKET)
    .upload(key, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Upload falló para ${sku}/${slot}: ${error.message}`);
  const { data: pub } = supa.storage.from(BUCKET).getPublicUrl(key);
  return pub.publicUrl;
}

async function subirFotosExtras(extras, sku, productoId, fotosDir, nombre) {
  // extras: array de nombres de archivo relativos a fotosDir
  for (let i = 0; i < extras.length; i++) {
    const fname = extras[i];
    const fpath = path.join(fotosDir, fname);
    if (!fs.existsSync(fpath)) {
      console.warn(`    ⚠ extra no encontrada: ${fname}`);
      continue;
    }
    const orden = i + 2;
    const slot = `foto-${orden}`;
    process.stdout.write(`    extra ${orden}: ${fname}...`);
    try {
      const url = await subirFoto(fpath, sku, slot);
      // DELETE + INSERT (mismo patrón que la principal por las unique constraints)
      await supa.from('producto_fotos').delete().eq('producto_id', productoId).eq('orden', orden);
      const { error: fErr } = await supa.from('producto_fotos').insert({
        producto_id: productoId,
        url,
        orden,
        es_principal: false,
        alt: nombre,
      });
      if (fErr) console.warn(` ⚠ ${fErr.message}`);
      else process.stdout.write(' ✓\n');
    } catch (e) {
      console.warn(` ❌ ${e.message}`);
    }
  }
}

async function upsertProducto(p, fotoUrl) {
  // Defensa: NO pisar descripcion_corta/larga editoriales con el nombre.
  // Si el producto ya existe en DB y tiene descripción rica (distinta del nombre),
  // y el JSON fuente no trae una descripción explícita, conservamos la de DB.
  let preserveDescCorta = null;
  let preserveDescLarga = null;
  if (!p.descripcion_corta || !p.descripcion_larga) {
    const { data: existing } = await supa
      .from('productos')
      .select('descripcion_corta, descripcion_larga, nombre')
      .eq('sku', p.sku)
      .maybeSingle();
    if (existing) {
      const dc = (existing.descripcion_corta || '').trim();
      const dl = (existing.descripcion_larga || '').trim();
      const nm = (existing.nombre || '').trim();
      if (!p.descripcion_corta && dc && dc !== nm) preserveDescCorta = dc;
      if (!p.descripcion_larga && dl && dl !== nm) preserveDescLarga = dl;
    }
  }

  const payload = {
    sku: p.sku,
    codigo_barras: p.codigo_barras,
    nombre: p.nombre,
    slug: (p.slug || p.nombre).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    descripcion_corta: p.descripcion_corta || preserveDescCorta || p.nombre,
    descripcion_larga: p.descripcion || p.descripcion_larga || preserveDescLarga || '',
    precio_gs: p.precio_gs,
    precio_antes_gs: p.precio_antes_gs || null,
    costo_gs: p.costo_gs || null,
    stock: p.stock ?? 1,
    es_unica: p.es_unica ?? (p.stock === 1),
    estado: p.estado || 'publicado',
    material: p.material || null,
    peso_gr: p.peso_gr || null,
    origen: p.origen || null,
    certificado: p.certificado || false
  };

  // Resolver categoria_id desde slug si vino
  if (p.categoria_slug) {
    const { data: cat } = await supa.from('categorias').select('id').eq('slug', p.categoria_slug).maybeSingle();
    if (cat) payload.categoria_id = cat.id;
  }

  const { data, error } = await supa
    .from('productos')
    .upsert(payload, { onConflict: 'sku' })
    .select()
    .single();
  if (error) throw new Error(`Upsert productos falló para ${p.sku}: ${error.message}`);

  // Asociar foto principal en producto_fotos
  // (DELETE + INSERT en vez de upsert porque la tabla solo tiene partial unique
  //  para es_principal=true, no compuesto producto_id+orden)
  if (fotoUrl) {
    await supa.from('producto_fotos').delete().eq('producto_id', data.id).eq('orden', 1);
    const { error: fotoErr } = await supa
      .from('producto_fotos')
      .insert({
        producto_id: data.id,
        url: fotoUrl,
        orden: 1,
        es_principal: true,
        alt: p.nombre
      });
    if (fotoErr) console.warn(`  ⚠ foto no asociada para ${p.sku}: ${fotoErr.message}`);
  }
  return data;
}

async function main() {
  const inputArg = process.argv[2];
  if (!inputArg) {
    console.error('Uso: node ingest.js productos.json');
    process.exit(1);
  }
  const inputPath = path.resolve(inputArg);
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ No existe el archivo: ${inputPath}`);
    process.exit(1);
  }
  const items = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  if (!Array.isArray(items)) {
    console.error('❌ El JSON debe ser un array.');
    process.exit(1);
  }

  console.log(`📦 Procesando ${items.length} productos...\n`);
  const okList = [];
  const errList = [];

  for (const p of items) {
    const sku = p.sku || p.codigo_barras;
    try {
      let fotoUrl = null;
      if (p.foto_path && fs.existsSync(p.foto_path)) {
        process.stdout.write(`  ${sku}: subiendo foto principal...`);
        fotoUrl = await subirFoto(p.foto_path, sku, 'main');
        process.stdout.write(' ✓\n');
      } else if (p.foto_path) {
        console.warn(`  ${sku}: foto no encontrada en ${p.foto_path}, sigo sin imagen`);
      }
      process.stdout.write(`  ${sku}: upsert producto...`);
      const prod = await upsertProducto(p, fotoUrl);
      process.stdout.write(' ✓\n');

      // Subir fotos extras si vienen en _meta.fotos_extra
      const extras = p._meta && Array.isArray(p._meta.fotos_extra) ? p._meta.fotos_extra : [];
      if (extras.length && prod && p.foto_path) {
        const fotosDir = path.dirname(p.foto_path);
        await subirFotosExtras(extras, sku, prod.id, fotosDir, p.nombre);
      }
      okList.push(sku);
    } catch (e) {
      console.error(`  ${sku}: ❌ ${e.message}`);
      errList.push({ sku, error: e.message });
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`✅ OK: ${okList.length}`);
  console.log(`❌ Errores: ${errList.length}`);
  if (errList.length) {
    console.log('\nDetalle errores:');
    errList.forEach(e => console.log(`  - ${e.sku}: ${e.error}`));
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
