// MoMar · Carga datos reales desde Supabase y sobreescribe los mocks de products.js
//
// Este archivo se carga DESPUÉS de products.js (que define los mocks como fallback)
// y ANTES de render.js. Expone window.MOMAR_READY como una Promise que render.js
// debe await antes de pintar nada.

(function() {
  if (!window.MOMAR_USE_SUPABASE) {
    // Flag apagado — quedamos con los mocks. Resolvemos MOMAR_READY de inmediato.
    window.MOMAR_READY = Promise.resolve('mocks');
    return;
  }

  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.warn('[MOMAR] Supabase SDK no cargado. Quedo con mocks.');
    window.MOMAR_READY = Promise.resolve('mocks-fallback-no-sdk');
    return;
  }

  const client = supabase.createClient(
    window.MOMAR_SUPABASE_URL,
    window.MOMAR_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
  window.MOMAR_supabase = client;

  // Helpers de mapeo
  const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=800&fit=crop&q=80';

  // Categorías base que no son nombres descriptivos por sí solas
  const CAT_PELADAS = new Set(['anillo', 'anillos', 'collar', 'collares', 'choker', 'chocker', 'cadena', 'pulsera', 'aro', 'aros']);

  // Limpia sufijos legacy del nombre del sistema interno (RFF, KPB, C 4889, # 45, etc.).
  // Si la limpieza deja solo la categoría base (p.ej. "Anillo"), devuelve el nombre original
  // para no perder el descriptor interno que sirve a la admin para identificar la pieza.
  function limpiarNombre(n) {
    if (!n) return '';
    const limpio = n
      .replace(/\s*#\s*\d+/g, '')                                  // " # 45", "# 117"
      .replace(/\s+(RFF|KPB|CXB|FF|UG|Ox2|CM|KPB)\s*\d*\s*$/gi, '') // sufijos serie
      .replace(/\s+[A-Z]{1,3}\s+\d{3,4}\s*$/g, '')                  // " C 4889", " R 5020"
      .replace(/\s+\d{3,4}\s*$/g, '')                               // " 4889", " 5043" finales
      .replace(/\s+\(\d+\)\s*$/g, '')                               // " (1)", " (3)"
      .replace(/\s{2,}/g, ' ')                                      // dobles espacios
      .trim();

    // Si quedó solo la categoría pelada ("Anillo", "Collar"), conservar el original
    const palabras = limpio.split(/\s+/).filter(Boolean);
    if (palabras.length <= 1 && CAT_PELADAS.has(limpio.toLowerCase())) {
      return n.trim();
    }
    return limpio;
  }

  function detectBadge(p) {
    if (p.precio_antes_gs && p.precio_antes_gs > p.precio_gs) return 'sale';
    if (p.es_unica) return 'unique';
    if (p.stock === 1 && !p.es_unica) return 'last';
    if (p.stock >= 2 && p.stock <= 3) return 'low';
    if (p.created_at) {
      const dias = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
      if (dias < 30) return 'new';
    }
    return null;
  }

  function mapProducto(p) {
    const fotos = (p.fotos || []).slice().sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const principal = fotos.find(f => f.es_principal) || fotos[0];
    const cat = p.categoria || {};
    const atributos = {};
    if (p.material) atributos['Material'] = p.material;
    if (p.peso_gr) atributos['Peso'] = p.peso_gr + ' g';
    if (p.origen) atributos['Origen'] = p.origen;
    if (p.dimensiones) atributos['Dimensiones'] = p.dimensiones;

    // Descripción "real": preferir descripcion_corta (editorial generada), fallback a descripcion_larga.
    // Solo cuenta como "rica" si es distinta del nombre (no lo duplica).
    const nombreLimpio = limpiarNombre(p.nombre);
    const candidata = (p.descripcion_corta && p.descripcion_corta.trim()) || (p.descripcion_larga && p.descripcion_larga.trim()) || '';
    const esRica = candidata && candidata !== p.nombre.trim() && candidata !== nombreLimpio;
    const descRica = esRica ? candidata : null;

    return {
      sku: p.sku,
      nombre: nombreLimpio || p.nombre,
      nombre_raw: p.nombre,  // por si lo necesitamos
      cat: cat.nombre || 'Producto',
      cat_slug: cat.slug || 'joyeria',
      material: p.material || '',
      precio: p.precio_gs,
      precio_antes: p.precio_antes_gs || null,
      badge: detectBadge(p),
      imagen: principal?.url || PLACEHOLDER_IMG,
      imagenes: fotos.length ? fotos.map(f => f.url) : [],
      es_unica: !!p.es_unica,
      stock: p.stock,
      created_at: p.created_at,
      descripcion_corta: descRica,
      descripcion: descRica,  // null si no hay descripción rica real
      atributos,
      variantes: null
    };
  }

  // Override de imágenes lifestyle por slug (fotos editoriales propias de IG)
  const CATEGORIA_IMG_OVERRIDE = {
    anillos:  'img/lifestyle/rings.jpg?v=20260517g',
    collares: 'img/lifestyle/necklaces.jpg?v=20260517g',
    aros:     'img/lifestyle/earrings.jpg?v=20260517g',
    pulseras: 'img/lifestyle/bracelet.jpg?v=20260517g',
    hogar:    'img/lifestyle/hogar-table.jpg?v=20260517g'
  };

  function mapCategoria(c) {
    return {
      slug: c.slug,
      nombre: c.nombre,
      img: CATEGORIA_IMG_OVERRIDE[c.slug] || c.imagen_url || PLACEHOLDER_IMG
    };
  }

  async function cargarTodo() {
    const inicio = performance.now();

    const [prodRes, catRes, bannerRes] = await Promise.all([
      client.from('productos').select(`
        sku, nombre, descripcion_corta, descripcion_larga, precio_gs, precio_antes_gs,
        stock, es_unica, estado, material, peso_gr, origen, dimensiones, created_at,
        categoria:categorias(slug,nombre),
        fotos:producto_fotos(url,es_principal,orden,alt)
      `).eq('estado', 'publicado').order('created_at', { ascending: false }),

      client.from('categorias').select('slug,nombre,imagen_url,orden').eq('activa', true).order('orden'),

      client.from('banners').select('titulo,subtitulo,imagen_url,ubicacion').eq('activo', true)
    ]);

    if (prodRes.error) { console.error('[MOMAR] Error fetching productos:', prodRes.error); return 'error-productos'; }
    if (catRes.error)  { console.error('[MOMAR] Error fetching categorias:', catRes.error); return 'error-categorias'; }

    // Reemplazar mocks
    window.MOMAR_PRODUCTS   = (prodRes.data || []).map(mapProducto);
    window.MOMAR_CATEGORIAS = (catRes.data || []).map(mapCategoria);

    // Banners (hero + promo)
    if (bannerRes.data) {
      const hero = bannerRes.data.find(b => b.ubicacion === 'hero');
      const promo = bannerRes.data.find(b => b.ubicacion === 'promo');
      if (hero?.imagen_url)  window.MOMAR_HERO  = hero.imagen_url;
      if (promo?.imagen_url) window.MOMAR_PROMO = promo.imagen_url;
    }

    const ms = Math.round(performance.now() - inicio);
    console.log(`[MOMAR] Catálogo cargado de Supabase en ${ms}ms · ${window.MOMAR_PRODUCTS.length} productos · ${window.MOMAR_CATEGORIAS.length} categorías`);
    return 'supabase';
  }

  // Exponer promesa para que render.js y cart.js esperen antes de pintar
  window.MOMAR_READY = cargarTodo().catch(err => {
    console.error('[MOMAR] Falla cargando datos, queda con mocks:', err);
    return 'mocks-fallback-error';
  });
})();
