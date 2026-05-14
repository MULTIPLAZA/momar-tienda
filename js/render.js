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

  function productCard(p) {
    return `
      <div class="producto">
        <a href="producto.html?sku=${p.sku}" class="producto__media-link">
          <div class="producto__media">
            <img src="${p.imagen}" alt="${p.nombre}" loading="lazy" onerror="this.style.opacity=0;">
            ${badgeHtml(p.badge)}
            <button class="producto__quick-add js-add-to-cart" data-sku="${p.sku}" data-qty="1" aria-label="Agregar al carrito">
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
        <img src="${c.img}" alt="${c.nombre}" loading="lazy" onerror="this.style.opacity=0;">
        <span class="categoria__label">${c.nombre}</span>
      </a>
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
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

    // Galería
    const principal = document.querySelector('.js-galeria-principal');
    if (principal) {
      principal.innerHTML = `<img src="${p.imagen}" alt="${p.nombre}" onerror="this.style.opacity=0;">`;
    }
    const thumbs = document.querySelector('.js-galeria-thumbs');
    if (thumbs) {
      const imgs = p.imagenes || [p.imagen, p.imagen, p.imagen, p.imagen];
      thumbs.innerHTML = imgs.slice(0, 4).map((src, i) => `
        <div class="${i === 0 ? 'is-active' : ''}" data-src="${src}">
          <img src="${src}" alt="" onerror="this.style.opacity=0;">
        </div>
      `).join('');
      thumbs.addEventListener('click', (e) => {
        const t = e.target.closest('[data-src]');
        if (!t) return;
        thumbs.querySelectorAll('div').forEach(d => d.classList.remove('is-active'));
        t.classList.add('is-active');
        const img = principal.querySelector('img');
        if (img) img.src = t.dataset.src;
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
        vars.innerHTML = `
          <div class="variantes__label">${p.variantes.tipo}</div>
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
  }
})();
