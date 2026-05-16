// MOMAR — Render dinámico de grids de productos y categorías
(function() {
  // Badges premium (Mejuri/Catbird style: serif italic claro, no sticker negro)
  function badgeHtml(p) {
    if (p.badge === 'sale') return '<span class="producto__badge producto__badge--sale">Oferta</span>';
    if (p.badge === 'unique' || p.es_unica) return '<span class="producto__badge producto__badge--unique">Pieza única</span>';
    if (p.badge === 'last' || (p.stock === 1 && !p.es_unica)) return '<span class="producto__badge producto__badge--last">Última</span>';
    if (p.badge === 'low' || (p.stock >= 2 && p.stock <= 3)) return `<span class="producto__badge producto__badge--low">Quedan ${p.stock}</span>`;
    if (p.badge === 'new') return '<span class="producto__badge producto__badge--new">Nuevo</span>';
    return '';
  }

  function priceHtml(p) {
    if (p.precio_antes) {
      return `<del>${window.MOMAR_fmtGs(p.precio_antes)}</del> ${window.MOMAR_fmtGs(p.precio)}`;
    }
    return window.MOMAR_fmtGs(p.precio);
  }

  // Eyebrow editorial: si tiene material, mostrarlo; si no, solo categoría (sin punto colgando)
  function eyebrowHtml(p) {
    if (p.material && p.material !== p.cat) {
      return `${p.cat} · ${p.material}`;
    }
    return p.cat || '';
  }

  // Score editorial para "destacados" (#8)
  function scoreDestacados(p) {
    let s = 0;
    if (p.es_unica) s += 100;
    if (p.imagenes && p.imagenes.length >= 3) s += 30;
    if (p.precio_antes) s += 50;
    if (p.stock > 0 && p.stock <= 3) s += 25;
    if (p.precio > 1000000) s += 20;
    // Penalizar nombres muy legacy
    if (/^[A-Z]+\s+\w+\s+\d{3,4}/i.test(p.nombre_raw || '')) s -= 30;
    return s;
  }

  // Helper imágenes con srcset (Unsplash optimization) (#14)
  function imgTag(src, alt, sizes) {
    if (!src) return '';
    sizes = sizes || '(max-width: 768px) 50vw, 25vw';
    const base = src.split('?')[0];
    const isUnsplash = base.includes('unsplash.com');
    if (!isUnsplash) {
      return `<img src="${src}" alt="${alt}" loading="lazy" decoding="async" onerror="this.style.opacity=0;">`;
    }
    const params = '&q=80&auto=format&fit=crop';
    const src400 = `${base}?w=400${params}`;
    const src800 = `${base}?w=800${params}`;
    const src1200 = `${base}?w=1200${params}`;
    return `<img
      src="${src800}"
      srcset="${src400} 400w, ${src800} 800w, ${src1200} 1200w"
      sizes="${sizes}"
      alt="${alt}" loading="lazy" decoding="async"
      onerror="this.style.opacity=0;">`;
  }

  // Stock alert (#8)
  function stockAlert(p) {
    if (p.es_unica) return '<div class="stock-alert stock-alert--unique">Pieza única · No se repone</div>';
    if (p.stock === 1) return '<div class="stock-alert">Última disponible</div>';
    if (p.stock <= 3) return `<div class="stock-alert">Quedan ${p.stock} en stock</div>`;
    return '';
  }

  function productCard(p) {
    return `
      <div class="producto">
        <a href="producto.html?sku=${encodeURIComponent(p.sku)}" class="producto__media-link">
          <div class="producto__media">
            ${imgTag(p.imagen, p.nombre, '(max-width: 768px) 50vw, 25vw')}
            ${badgeHtml(p)}
            <button class="producto__quick-add js-add-to-cart" data-sku="${p.sku}" data-qty="1" aria-label="Agregar ${p.nombre} al carrito">
              + Agregar
            </button>
          </div>
        </a>
        <a href="producto.html?sku=${encodeURIComponent(p.sku)}" class="producto__link">
          <div class="producto__cat">${eyebrowHtml(p)}</div>
          <div class="producto__nombre">${p.nombre}</div>
          <div class="producto__sku">Ref. ${p.sku}</div>
          <div class="producto__precio">${priceHtml(p)}</div>
        </a>
      </div>
    `;
  }

  // Skeleton card mientras carga
  function skeletonCard() {
    return `
      <div class="producto producto--skeleton">
        <div class="producto__media skeleton-box"></div>
        <div class="skeleton-line skeleton-line--xs"></div>
        <div class="skeleton-line skeleton-line--md"></div>
        <div class="skeleton-line skeleton-line--sm"></div>
      </div>`;
  }

  function categoriaCard(c) {
    return `
      <a href="catalogo.html?cat=${c.slug}" class="categoria">
        ${imgTag(c.img, c.nombre, '(max-width: 768px) 50vw, 25vw')}
        <span class="categoria__label">${c.nombre}</span>
      </a>
    `;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // Esperar a que Supabase termine de cargar (o fallback inmediato si flag off)
    if (window.MOMAR_READY) {
      try { await window.MOMAR_READY; } catch (e) { console.warn('[MOMAR] datos no listos:', e); }
    }

    // Mostrar mensaje suave si el catálogo viene vacío
    const noData = !window.MOMAR_PRODUCTS || window.MOMAR_PRODUCTS.length === 0;

    // Grid de destacados (primeros 8 de la lista)
    const destacados = document.querySelector('.js-grid-destacados');
    if (destacados) {
      destacados.innerHTML = window.MOMAR_PRODUCTS.slice(0, 8).map(productCard).join('');
    }

    // Grid de categorías
    const cats = document.querySelector('.js-grid-categorias');
    if (cats) {
      cats.innerHTML = window.MOMAR_CATEGORIAS.map(categoriaCard).join('');
    }

    // Render dinámico de los filtros con counts (#3, #20)
    function renderFiltrosConCounts() {
      const aside = document.querySelector('.filtros');
      if (!aside) return;
      const all = window.MOMAR_PRODUCTS || [];
      const counts = { categoria: {}, material: {}, precio: {}, disponibilidad: { stock: 0, unica: 0, oferta: 0 } };
      const rangos = { '0-1000000': [0, 1000000], '1000000-3000000': [1000000, 3000000], '3000000-6000000': [3000000, 6000000], '6000000-': [6000000, Infinity] };
      all.forEach(p => {
        if (p.cat_slug) counts.categoria[p.cat_slug] = (counts.categoria[p.cat_slug] || 0) + 1;
        if (p.material) counts.material[p.material.toLowerCase()] = (counts.material[p.material.toLowerCase()] || 0) + 1;
        Object.entries(rangos).forEach(([k, [min, max]]) => { if (p.precio >= min && p.precio <= max) counts.precio[k] = (counts.precio[k] || 0) + 1; });
        if (p.stock > 0) counts.disponibilidad.stock++;
        if (p.es_unica) counts.disponibilidad.unica++;
        if (p.precio_antes) counts.disponibilidad.oferta++;
      });
      // Aplicar counts a cada label + ocultar opciones con 0
      aside.querySelectorAll('.filtro-grupo').forEach(group => {
        const g = group.dataset.group;
        let visibles = 0;
        group.querySelectorAll('label').forEach(lbl => {
          const input = lbl.querySelector('input[type=checkbox]');
          if (!input) return;
          const v = input.value;
          let n = 0;
          if (g === 'categoria') n = counts.categoria[v] || 0;
          else if (g === 'material') n = counts.material[v.toLowerCase()] || 0;
          else if (g === 'precio') n = counts.precio[v] || 0;
          else if (g === 'disponibilidad') n = counts.disponibilidad[v] || 0;

          // Insertar contador (si no existe ya)
          let cnt = lbl.querySelector('.filtro-count');
          if (!cnt) {
            cnt = document.createElement('span');
            cnt.className = 'filtro-count';
            lbl.appendChild(cnt);
          }
          cnt.textContent = n;
          lbl.style.display = n === 0 ? 'none' : '';
          if (n > 0) visibles++;
        });
        // Ocultar el grupo entero si NINGUNA opción tiene productos
        group.style.display = visibles === 0 ? 'none' : '';
      });
    }

    // Catálogo completo (con filtros + ordenamiento + scroll + skeleton)
    const catalogo = document.querySelector('.js-grid-catalogo');
    if (catalogo) {
      let visibleCount = 24;  // paginación virtual
      let cachedList = [];

      window.MOMAR_renderCatalogo = function(opts) {
        opts = opts || {};
        if (!opts.keepVisible) visibleCount = 24;

        const params = new URLSearchParams(location.search);
        const filterCatUrl = params.get('cat');
        const q = (params.get('q') || '').toLowerCase().trim();

        const checks = (group) => Array.from(document.querySelectorAll(`.filtros .filtro-grupo[data-group="${group}"] input[type=checkbox]:checked`)).map(c => c.value);
        const catsSel = checks('categoria');
        const matsSel = checks('material');
        const preciosSel = checks('precio');
        const dispSel = checks('disponibilidad');

        let list = (window.MOMAR_PRODUCTS || []).slice();

        if (filterCatUrl) list = list.filter(p => p.cat_slug === filterCatUrl || (p.cat || '').toLowerCase() === filterCatUrl.toLowerCase());
        if (q) {
          list = list.filter(p =>
            (p.nombre || '').toLowerCase().includes(q) ||
            (p.nombre_raw || '').toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q) ||
            (p.material || '').toLowerCase().includes(q) ||
            (p.cat || '').toLowerCase().includes(q)
          );
        }
        if (catsSel.length) list = list.filter(p => catsSel.includes(p.cat_slug));
        if (matsSel.length) list = list.filter(p => matsSel.some(m => (p.material || '').toLowerCase().includes(m.toLowerCase())));
        if (preciosSel.length) {
          list = list.filter(p => preciosSel.some(rng => {
            const [minS, maxS] = rng.split('-');
            const min = Number(minS), max = maxS === '' ? Infinity : Number(maxS);
            return p.precio >= min && p.precio <= max;
          }));
        }
        if (dispSel.includes('stock')) list = list.filter(p => p.stock > 0);
        if (dispSel.includes('unica')) list = list.filter(p => p.es_unica);
        if (dispSel.includes('oferta')) list = list.filter(p => p.precio_antes);

        const orden = document.querySelector('.js-orden')?.value || 'destacados';
        if (orden === 'precio-asc') list.sort((a, b) => a.precio - b.precio);
        else if (orden === 'precio-desc') list.sort((a, b) => b.precio - a.precio);
        else if (orden === 'nuevos') list.sort((a, b) => (new Date(b.created_at) - new Date(a.created_at)));
        else if (orden === 'unicas') list.sort((a, b) => (b.es_unica ? 1 : 0) - (a.es_unica ? 1 : 0) || scoreDestacados(b) - scoreDestacados(a));
        else { /* destacados con tie-breaker por categoría */
          list.sort((a, b) => {
            if (a.cat_slug !== b.cat_slug) return a.cat_slug.localeCompare(b.cat_slug);
            return scoreDestacados(b) - scoreDestacados(a);
          });
        }

        cachedList = list;
        const slice = list.slice(0, visibleCount);
        catalogo.innerHTML = slice.length
          ? slice.map(productCard).join('') + (visibleCount < list.length ? '<div class="js-grid-sentinel" style="grid-column: 1 / -1; height: 1px;"></div>' : '')
          : '<p class="catalogo-empty">No encontramos piezas que coincidan con tu búsqueda.</p>';

        // Stagger animation
        catalogo.querySelectorAll('.producto').forEach((c, i) => {
          c.style.animationDelay = `${Math.min(i * 0.03, 0.4)}s`;
        });

        const countEl = document.querySelector('.js-catalogo-count');
        if (countEl) {
          if (list.length === 0) countEl.textContent = '0 piezas';
          else if (visibleCount >= list.length) countEl.textContent = `${list.length} ${list.length === 1 ? 'pieza' : 'piezas'}`;
          else countEl.textContent = `Mostrando ${slice.length} de ${list.length} piezas`;
        }

        // IntersectionObserver para cargar más al scroll
        const sentinel = catalogo.querySelector('.js-grid-sentinel');
        if (sentinel && !sentinel._observed) {
          const io = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && visibleCount < cachedList.length) {
              visibleCount += 24;
              window.MOMAR_renderCatalogo({ keepVisible: true });
            }
          }, { rootMargin: '200px' });
          io.observe(sentinel);
          sentinel._observed = true;
        }

        updateTitle();
      };

      // Título dinámico del catálogo (#14)
      function updateTitle() {
        const params = new URLSearchParams(location.search);
        const cat = params.get('cat');
        const q = params.get('q');
        if (q) document.title = `Búsqueda: ${q} · MoMar`;
        else if (cat) document.title = `${cat.charAt(0).toUpperCase() + cat.slice(1)} · MoMar`;
        else document.title = 'Catálogo · MoMar';
      }

      // Skeleton primero
      catalogo.innerHTML = Array(8).fill(0).map(skeletonCard).join('');
      // Render real (data ya está)
      renderFiltrosConCounts();
      window.MOMAR_renderCatalogo();
    }

    // Hero image — respetar inline style si el HTML ya define background-image
    const hero = document.querySelector('.js-hero');
    if (hero && window.MOMAR_HERO && !hero.style.backgroundImage) {
      hero.style.backgroundImage = `url('${window.MOMAR_HERO}')`;
      hero.classList.add('has-image');
    }

    // Promo banner — idem, respetar inline si ya hay
    const promo = document.querySelector('.js-promo-media');
    if (promo && window.MOMAR_PROMO && !promo.style.backgroundImage) {
      promo.style.backgroundImage = `url('${window.MOMAR_PROMO}')`;
      promo.classList.add('has-image');
    }

    // Ficha de producto: leer ?sku= y renderizar
    const fichaCont = document.querySelector('.js-producto-detalle');
    if (fichaCont) {
      const params = new URLSearchParams(location.search);
      const sku = params.get('sku') || (window.MOMAR_PRODUCTS && window.MOMAR_PRODUCTS[0]?.sku);
      const p = window.MOMAR_findProduct(sku) || window.MOMAR_PRODUCTS[0];
      if (p) {
        renderFicha(p);
        updateFichaMeta(p);

        // Relacionados con score (#18)
        const rel = document.querySelector('.js-grid-relacionados');
        if (rel) {
          const minP = p.precio * 0.6, maxP = p.precio * 1.8;
          const score = (x) => {
            let s = 0;
            if (x.cat_slug === p.cat_slug) s += 50;
            if (x.precio >= minP && x.precio <= maxP) s += 20;
            if (x.es_unica === p.es_unica) s += 10;
            if (p.material && x.material === p.material) s += 30;
            if (x.imagenes && x.imagenes.length >= 2) s += 5;
            return s;
          };
          const relacionados = window.MOMAR_PRODUCTS
            .filter(x => x.sku !== p.sku)
            .map(x => ({ x, s: score(x) }))
            .sort((a, b) => b.s - a.s)
            .slice(0, 4)
            .map(r => r.x);
          rel.innerHTML = relacionados.map(productCard).join('');
        }
      }
    }
  });

  // SEO + Open Graph dinámicos (#14)
  function setMeta(name, content) {
    if (!content) return;
    const sel = name.startsWith('og:') ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let m = document.querySelector(sel);
    if (!m) {
      m = document.createElement('meta');
      if (name.startsWith('og:')) m.setAttribute('property', name);
      else m.setAttribute('name', name);
      document.head.appendChild(m);
    }
    m.setAttribute('content', content);
  }
  function updateFichaMeta(p) {
    document.title = `${p.nombre} · MoMar`;
    const descrip = p.descripcion || `${p.nombre} de MoMar — ${window.MOMAR_fmtGs(p.precio)}`;
    setMeta('description', descrip.slice(0, 155));
    setMeta('og:title', `${p.nombre} · MoMar`);
    setMeta('og:description', descrip.slice(0, 155));
    setMeta('og:image', p.imagen);
    setMeta('og:url', location.href);
    setMeta('og:type', 'product');
    setMeta('og:site_name', 'MoMar');
    // JSON-LD Product schema
    const old = document.querySelector('script[type="application/ld+json"]');
    if (old) old.remove();
    const ld = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": p.nombre,
      "image": p.imagenes && p.imagenes.length ? p.imagenes : [p.imagen],
      "sku": p.sku,
      "description": p.descripcion || `${p.nombre} — ${p.cat} de MoMar`,
      "brand": { "@type": "Brand", "name": "MoMar" },
      "offers": {
        "@type": "Offer",
        "url": location.href,
        "priceCurrency": "PYG",
        "price": p.precio,
        "availability": p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      }
    };
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  function renderFicha(p) {
    const setText = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    const setHtml = (sel, val) => { const el = document.querySelector(sel); if (el) el.innerHTML = val; };

    setText('.js-prod-nombre', p.nombre);
    // Eyebrow editorial: priorizar material si lo hay; sino solo categoría; sin punto colgando
    const eyebrowText = [p.material || null, p.es_unica ? 'Pieza única' : null].filter(Boolean).join(' · ') || p.cat;
    setText('.js-prod-eyebrow', eyebrowText);
    // SKU visible para uso administrativo (cruce con sistema de facturación)
    setText('.js-prod-sku', p.sku ? `Ref. ${p.sku}` : '');
    setHtml('.js-prod-precio', p.precio_antes
      ? `<del style="color:var(--color-text-soft); font-size:18px;">${window.MOMAR_fmtGs(p.precio_antes)}</del> ${window.MOMAR_fmtGs(p.precio)}`
      : window.MOMAR_fmtGs(p.precio));

    // Descripción: si no hay desc rica real, placeholder editorial (#6)
    const descEl = document.querySelector('.js-prod-descripcion');
    if (descEl) {
      if (p.descripcion) {
        descEl.textContent = p.descripcion;
        descEl.classList.remove('descripcion--placeholder');
      } else {
        const wa = `https://wa.me/595981412648?text=${encodeURIComponent(`Hola, quisiera consultar por "${p.nombre}" (${p.sku}) de MoMar.`)}`;
        descEl.innerHTML = `Pieza de la colección actual. Consultanos por características, peso y disponibilidad — <a href="${wa}" target="_blank" rel="noopener" style="color:inherit; border-bottom:1px solid currentColor;">te respondemos por WhatsApp</a>.`;
        descEl.classList.add('descripcion--placeholder');
      }
    }

    setText('.js-prod-cuota', window.MOMAR_fmtGs(Math.round(p.precio / 3)));

    // Stock alert antes del precio (#8) — inserto dinámicamente después del eyebrow
    const eyebrowEl = document.querySelector('.js-prod-eyebrow');
    if (eyebrowEl) {
      const existingAlert = document.querySelector('.stock-alert');
      if (existingAlert) existingAlert.remove();
      const alertHtml = stockAlert(p);
      if (alertHtml) {
        eyebrowEl.insertAdjacentHTML('afterend', alertHtml);
      }
    }

    // Galería: si hay solo 1 foto, no mostrar thumbs ni dots (#5)
    const principal = document.querySelector('.js-galeria-principal');
    const imgs = (p.imagenes && p.imagenes.length > 0) ? p.imagenes : [p.imagen];
    if (principal) {
      principal.innerHTML = imgTag(p.imagen, p.nombre, '(max-width: 768px) 100vw, 50vw');
    }
    const thumbs = document.querySelector('.js-galeria-thumbs');
    const oldDots = document.querySelector('.galeria-dots');
    if (oldDots) oldDots.remove();

    if (thumbs && imgs.length > 1) {
      thumbs.style.display = '';
      thumbs.innerHTML = imgs.slice(0, 8).map((src, i) => `
        <div class="${i === 0 ? 'is-active' : ''}" data-src="${src}" data-idx="${i}">
          ${imgTag(src, p.nombre + ' foto ' + (i+1), '(max-width: 768px) 100vw, 25vw')}
        </div>
      `).join('');
      const dotsHtml = `<div class="galeria-dots">${imgs.slice(0, 8).map((_, i) => `<span class="galeria-dots__dot ${i === 0 ? 'is-active' : ''}"></span>`).join('')}</div>`;
      thumbs.insertAdjacentHTML('afterend', dotsHtml);

      // Click en thumbs cambia foto (desktop)
      thumbs.addEventListener('click', (e) => {
        const t = e.target.closest('[data-src]');
        if (!t) return;
        if (window.innerWidth >= 769) {
          thumbs.querySelectorAll('div[data-src]').forEach(d => d.classList.remove('is-active'));
          t.classList.add('is-active');
          const img = principal.querySelector('img');
          if (img) img.src = t.dataset.src;
        }
      });

      // En mobile, actualizar dots con scroll
      thumbs.addEventListener('scroll', () => {
        const itemWidth = thumbs.clientWidth;
        const idx = Math.round(thumbs.scrollLeft / itemWidth);
        document.querySelectorAll('.galeria-dots__dot').forEach((d, i) => d.classList.toggle('is-active', i === idx));
      });
    } else if (thumbs) {
      thumbs.style.display = 'none';
      if (principal) principal.classList.add('galeria__principal--solo');
    }

    // Atributos: si está vacío, ocultar todo el bloque + mostrar link a WhatsApp (#7)
    const attrs = document.querySelector('.js-prod-atributos');
    if (attrs) {
      const entries = p.atributos ? Object.entries(p.atributos) : [];
      if (entries.length === 0) {
        const wa = `https://wa.me/595981412648?text=${encodeURIComponent(`Hola, quisiera ver el detalle técnico de "${p.nombre}" (${p.sku}) de MoMar.`)}`;
        attrs.innerHTML = `<div class="atributo atributo--placeholder"><span class="atributo__label">Detalles técnicos</span><a href="${wa}" target="_blank" rel="noopener" style="color:var(--color-text); border-bottom: 1px solid var(--color-line);">Consultar por WhatsApp →</a></div>`;
      } else {
        attrs.innerHTML = entries.map(([k, v]) =>
          `<div class="atributo"><span class="atributo__label">${k}</span><span>${v}</span></div>`
        ).join('');
      }
    }

    // Variantes
    const vars = document.querySelector('.js-prod-variantes');
    if (vars) {
      if (p.variantes) {
        const showTallesLink = p.variantes.tipo.toLowerCase().includes('talle');
        vars.innerHTML = `
          <div class="variantes__label">${p.variantes.tipo}${showTallesLink ? ' <button class="link-talles" onclick="window.MOMAR_openTallesModal()">¿Cómo medir mi talle? →</button>' : ''}</div>
          <div class="variantes__opciones">
            ${p.variantes.opciones.map(op => `
              <button class="variante ${op === p.variantes.default ? 'is-selected' : ''}" data-variante="${op}">${op}</button>
            `).join('')}
          </div>
        `;
        vars.addEventListener('click', (e) => {
          const b = e.target.closest('.variante');
          if (!b) return;
          vars.querySelectorAll('.variante').forEach(x => x.classList.remove('is-selected'));
          b.classList.add('is-selected');
          updateAddToCartBtn();
        });
      } else {
        vars.style.display = 'none';
      }
    }

    // Botones add to cart con SKU correcto
    document.querySelectorAll('.js-add-this-product').forEach(b => {
      b.dataset.sku = p.sku;
      b.classList.add('js-add-to-cart');
    });
    updateAddToCartBtn();

    function updateAddToCartBtn() {
      const variante = vars?.querySelector('.variante.is-selected')?.dataset.variante || null;
      document.querySelectorAll('.js-add-this-product').forEach(b => {
        if (variante) b.dataset.variante = variante;
      });
    }

    // Breadcrumb
    const bc = document.querySelector('.js-prod-breadcrumb-cat');
    if (bc) bc.textContent = p.cat;
    const bcName = document.querySelector('.js-prod-breadcrumb-nombre');
    if (bcName) bcName.textContent = p.nombre;

    // Body has-sticky-bar (#3) → para que padding extra evite que sticky tape contenido
    document.body.classList.add('has-sticky-bar');

    // WhatsApp consulta contextual debajo del precio (#17)
    const precio = document.querySelector('.js-prod-precio');
    if (precio && !document.querySelector('.consulta-wa')) {
      const msg = encodeURIComponent(`Hola, quisiera consultar por "${p.nombre}" (SKU ${p.sku}) de MoMar.`);
      precio.insertAdjacentHTML('afterend', `
        <a href="https://wa.me/595981412648?text=${msg}" target="_blank" rel="noopener" class="consulta-wa">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
          Consultá por WhatsApp
        </a>
      `);
    }
  }

  // Modal guía de talles (#20) — disponible globalmente
  window.MOMAR_openTallesModal = function() {
    let m = document.querySelector('.modal-overlay.talles-modal');
    if (!m) {
      m = document.createElement('div');
      m.className = 'modal-overlay talles-modal';
      m.innerHTML = `
        <div class="modal">
          <button class="modal__close" onclick="this.closest('.modal-overlay').classList.remove('is-open')">Cerrar ×</button>
          <h2>¿Cómo medir tu talle?</h2>
          <p style="color: var(--color-text-soft); font-size: 13px; line-height: 1.7;">
            La forma más simple: envolvé un hilo o tira de papel alrededor del dedo, marcá donde se cierra, y medí el largo en milímetros. Ese número es el diámetro interno de tu anillo.
          </p>

          <h3>Tabla de equivalencias</h3>
          <table class="talles-table">
            <thead><tr><th>Talle PY</th><th>Diámetro (mm)</th><th>US</th><th>EU</th></tr></thead>
            <tbody>
              <tr><td>10</td><td>15.7</td><td>5</td><td>49</td></tr>
              <tr><td>12</td><td>16.6</td><td>6</td><td>52</td></tr>
              <tr><td>14</td><td>17.3</td><td>7</td><td>54</td></tr>
              <tr><td>16</td><td>18.1</td><td>8</td><td>57</td></tr>
              <tr><td>18</td><td>18.9</td><td>9</td><td>59</td></tr>
              <tr><td>20</td><td>19.8</td><td>10</td><td>61</td></tr>
              <tr><td>22</td><td>20.6</td><td>11</td><td>64</td></tr>
            </tbody>
          </table>

          <div class="escala-humana">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
            </svg>
            <div>
              <strong style="display:block; font-family: var(--font-display); font-style: italic; margin-bottom: 2px;">Pedí un medidor gratis</strong>
              <span style="color: var(--color-text-soft); font-size: 12px;">Te lo enviamos por WhatsApp sin costo · Asunción</span>
            </div>
          </div>

          <a href="https://wa.me/595981412648?text=${encodeURIComponent('Hola, quisiera pedir un medidor de talles gratis para mi anillo de MoMar.')}" target="_blank" class="btn btn--primary btn--block" style="margin-top: var(--space-3);">
            Pedir medidor por WhatsApp →
          </a>
        </div>
      `;
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.remove('is-open');
      });
      document.body.appendChild(m);
    }
    m.classList.add('is-open');
  };
})();
