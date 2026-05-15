// MOMAR — Render dinámico de grids de productos y categorías
(function() {
  function badgeHtml(badge) {
    if (badge === 'new') return '<span class="producto__badge producto__badge--new">Nuevo</span>';
    if (badge === 'sale') return '<span class="producto__badge producto__badge--sale">Oferta</span>';
    if (badge === 'unique') return '<span class="producto__badge">Único</span>';
    return '';
  }

  function priceHtml(p) {
    if (p.precio_antes) {
      return `<del>${window.MOMAR_fmtGs(p.precio_antes)}</del> ${window.MOMAR_fmtGs(p.precio)}`;
    }
    return window.MOMAR_fmtGs(p.precio);
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
        <a href="producto.html?sku=${p.sku}" class="producto__media-link">
          <div class="producto__media">
            ${imgTag(p.imagen, p.nombre, '(max-width: 768px) 50vw, 25vw')}
            ${badgeHtml(p.badge)}
            <button class="producto__quick-add js-add-to-cart" data-sku="${p.sku}" data-qty="1" aria-label="Agregar ${p.nombre} al carrito">
              + Agregar
            </button>
          </div>
        </a>
        <a href="producto.html?sku=${p.sku}" class="producto__link">
          <div class="producto__cat">${p.cat} · ${p.material}</div>
          <div class="producto__nombre">${p.nombre}</div>
          <div class="producto__precio">${priceHtml(p)}</div>
        </a>
      </div>
    `;
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

    // Catálogo completo
    const catalogo = document.querySelector('.js-grid-catalogo');
    if (catalogo) {
      const params = new URLSearchParams(location.search);
      const filterCat = params.get('cat');
      let list = window.MOMAR_PRODUCTS;
      if (filterCat) {
        list = list.filter(p => p.cat_slug === filterCat || p.cat.toLowerCase() === filterCat.toLowerCase());
      }
      catalogo.innerHTML = list.map(productCard).join('');
      const countEl = document.querySelector('.js-catalogo-count');
      if (countEl) countEl.textContent = list.length + ' productos';
    }

    // Hero image
    const hero = document.querySelector('.js-hero');
    if (hero && window.MOMAR_HERO) {
      hero.style.backgroundImage = `linear-gradient(135deg, rgba(15,15,15,0.25), rgba(15,15,15,0.05)), url('${window.MOMAR_HERO}')`;
      hero.classList.add('has-image');
    }

    // Promo banner
    const promo = document.querySelector('.js-promo-media');
    if (promo && window.MOMAR_PROMO) {
      promo.style.backgroundImage = `linear-gradient(135deg, rgba(15,15,15,0.5), rgba(15,15,15,0.7)), url('${window.MOMAR_PROMO}')`;
      promo.classList.add('has-image');
    }

    // Ficha de producto: leer ?sku= y renderizar
    const fichaCont = document.querySelector('.js-producto-detalle');
    if (fichaCont) {
      const params = new URLSearchParams(location.search);
      const sku = params.get('sku') || 'AN-001';
      const p = window.MOMAR_findProduct(sku) || window.MOMAR_PRODUCTS[0];
      renderFicha(p);

      // Relacionados (otros 4)
      const rel = document.querySelector('.js-grid-relacionados');
      if (rel) {
        const otros = window.MOMAR_PRODUCTS.filter(x => x.sku !== p.sku).slice(0, 4);
        rel.innerHTML = otros.map(productCard).join('');
      }
    }
  });

  function renderFicha(p) {
    const setText = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
    const setHtml = (sel, val) => { const el = document.querySelector(sel); if (el) el.innerHTML = val; };

    setText('.js-prod-nombre', p.nombre);
    setText('.js-prod-eyebrow', p.cat + ' · ' + p.material + (p.es_unica ? ' · Pieza única' : ''));
    setHtml('.js-prod-precio', p.precio_antes
      ? `<del style="color:var(--color-text-soft); font-size:18px;">${window.MOMAR_fmtGs(p.precio_antes)}</del> ${window.MOMAR_fmtGs(p.precio)}`
      : window.MOMAR_fmtGs(p.precio));
    setText('.js-prod-descripcion', p.descripcion);
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

    // Galería
    const principal = document.querySelector('.js-galeria-principal');
    const imgs = p.imagenes || [p.imagen, p.imagen, p.imagen, p.imagen];
    if (principal) {
      principal.innerHTML = imgTag(p.imagen, p.nombre, '(max-width: 768px) 100vw, 50vw');
    }
    const thumbs = document.querySelector('.js-galeria-thumbs');
    if (thumbs) {
      thumbs.innerHTML = imgs.slice(0, 4).map((src, i) => `
        <div class="${i === 0 ? 'is-active' : ''}" data-src="${src}" data-idx="${i}">
          ${imgTag(src, p.nombre + ' foto ' + (i+1), '(max-width: 768px) 100vw, 25vw')}
        </div>
      `).join('');

      // Agregar dots para indicador en mobile
      const isInsertedDots = document.querySelector('.galeria-dots');
      if (!isInsertedDots) {
        const dotsHtml = `<div class="galeria-dots">${imgs.slice(0, 4).map((_, i) => `<span class="galeria-dots__dot ${i === 0 ? 'is-active' : ''}"></span>`).join('')}</div>`;
        thumbs.insertAdjacentHTML('afterend', dotsHtml);
      }

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
        // En mobile el scroll natural maneja el cambio
      });

      // En mobile, actualizar dots con scroll
      thumbs.addEventListener('scroll', () => {
        const scrollLeft = thumbs.scrollLeft;
        const itemWidth = thumbs.clientWidth;
        const idx = Math.round(scrollLeft / itemWidth);
        const dots = document.querySelectorAll('.galeria-dots__dot');
        dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      });
    }

    // Atributos
    const attrs = document.querySelector('.js-prod-atributos');
    if (attrs && p.atributos) {
      attrs.innerHTML = Object.entries(p.atributos).map(([k, v]) =>
        `<div class="atributo"><span class="atributo__label">${k}</span><span>${v}</span></div>`
      ).join('');
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
        <a href="https://wa.me/595981234567?text=${msg}" target="_blank" rel="noopener" class="consulta-wa">
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

          <a href="https://wa.me/595981234567?text=${encodeURIComponent('Hola, quisiera pedir un medidor de talles gratis para mi anillo de MoMar.')}" target="_blank" class="btn btn--primary btn--block" style="margin-top: var(--space-3);">
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
