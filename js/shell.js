// MOMAR — Shell común (header, footer, drawers, mobile menu) reutilizable en todas las páginas públicas
(function() {
  const LOGO_SVG = `
    <svg class="logo-svg" viewBox="0 0 200 50" xmlns="http://www.w3.org/2000/svg">
      <text x="100" y="38" text-anchor="middle" font-size="38">MoMar</text>
    </svg>
  `;

  const NAV_ITEMS = [
    { label: 'Joyería', href: 'catalogo.html?cat=joyeria' },
    { label: 'Hogar',   href: 'catalogo.html?cat=hogar' },
    { label: 'Novedades', href: 'catalogo.html' },
    { label: 'Outlet', href: 'catalogo.html' }
  ];

  const ICON = {
    search: '<svg class="header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    user:   '<svg class="header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>',
    cart:   '<svg class="header__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 7h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>'
  };

  function buildHeader(opts) {
    const topbar = opts.minimal ? '' : `<div class="topbar">ENVÍO GRATIS EN ASUNCIÓN SOBRE 2.500.000 GS · 3 CUOTAS SIN INTERÉS</div>`;
    if (opts.minimal) {
      return `
        <header class="header">
          <div class="header__inner">
            <div></div>
            <a href="index.html" class="header__logo" aria-label="MoMar">${LOGO_SVG}</a>
            <div class="header__actions" style="font-size:11px; letter-spacing:1.5px; text-transform:uppercase; opacity:0.7;">Pago seguro · SSL</div>
          </div>
        </header>
      `;
    }
    return `
      ${topbar}
      <header class="header">
        <div class="header__inner">
          <div style="display:flex; align-items:center; gap: var(--space-3);">
            <button class="hamburger js-menu-toggle" aria-label="Menú"><span></span><span></span><span></span></button>
            <nav class="header__nav">
              ${NAV_ITEMS.map(n => `<a href="${n.href}">${n.label}</a>`).join('')}
            </nav>
          </div>
          <a href="index.html" class="header__logo" aria-label="MoMar">${LOGO_SVG}</a>
          <div class="header__actions">
            <button class="header__action-search" aria-label="Buscar">${ICON.search}</button>
            <button aria-label="Cuenta">${ICON.user}</button>
            <button class="js-cart-toggle" aria-label="Carrito">${ICON.cart}<span class="cart-count js-cart-count">0</span></button>
          </div>
        </div>
      </header>
    `;
  }

  function buildFooter(opts) {
    if (opts.minimal) return '';
    return `
      <footer class="footer">
        <div class="container">
          <div class="footer__grid">
            <div>
              <div class="footer__logo">${LOGO_SVG.replace('class="logo-svg"', 'class="logo-svg" style="height: 56px;"')}</div>
              <p style="opacity: 0.7; font-size: 13px; max-width: 280px;">
                Joyería y accesorios premium para el hogar. Curaduría exclusiva en Asunción desde 2026.
              </p>
            </div>
            <div>
              <h4>Tienda</h4>
              <ul><li>Joyería</li><li>Accesorios de Hogar</li><li>Novedades</li><li>Outlet</li><li>Gift Cards</li></ul>
            </div>
            <div>
              <h4>Atención</h4>
              <ul><li>Contacto</li><li>Envíos</li><li>Cambios y devoluciones</li><li>Garantía</li><li>Preguntas frecuentes</li></ul>
            </div>
            <div>
              <h4>MoMar</h4>
              <ul><li>Nuestra historia</li><li>Showroom Asunción</li><li>Trabajá con nosotras</li><li>Términos y condiciones</li><li>Privacidad</li></ul>
            </div>
          </div>
          <div class="footer__bottom">
            <span>© 2026 MoMar · momar.com.py · RUC 80000000-0</span>
            <div class="footer__social"><span>Instagram</span><span>WhatsApp</span><span>Facebook</span></div>
          </div>
        </div>
      </footer>
    `;
  }

  function buildMobileMenu() {
    return `
      <aside class="mobile-menu">
        <div class="mobile-menu__head">
          ${LOGO_SVG.replace('class="logo-svg"', 'class="logo-svg" style="height:26px; color: var(--color-bg);"')}
          <button class="mobile-menu__close js-menu-close">Cerrar ×</button>
        </div>
        <ul class="mobile-menu__list">
          ${NAV_ITEMS.map(n => `<li><a href="${n.href}">${n.label}</a></li>`).join('')}
          <li><a href="#" style="font-size: 14px; opacity: 0.7; font-style: normal;">Mi cuenta</a></li>
          <li><a href="#" style="font-size: 14px; opacity: 0.7; font-style: normal;">Atención</a></li>
        </ul>
        <div class="mobile-menu__foot">
          Asunción · Lun-Sáb 10-18 hs<br>+595 981 234 567
        </div>
      </aside>
    `;
  }

  function buildWaFloat() {
    return `
      <a href="https://wa.me/595981234567?text=Hola%2C%20estoy%20viendo%20la%20tienda%20de%20MoMar%20y%20quisiera%20consultar." class="wa-float" target="_blank" rel="noopener" aria-label="Consultar por WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      </a>
    `;
  }

  function buildSearchModal() {
    return `
      <div class="search-modal" role="dialog" aria-label="Buscar">
        <div class="search-modal__head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:20px; height:20px; margin-right:12px; flex-shrink:0;"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="search" class="search-modal__input js-search-input" placeholder="Buscá por nombre, código o material…" autocomplete="off" autofocus>
          <button class="search-modal__close js-search-close" aria-label="Cerrar">Cerrar ×</button>
        </div>
        <div class="search-modal__results js-search-results">
          <p class="search-modal__hint">Escribí para buscar entre las piezas. Tip: probá "anillo", "collar", "choker".</p>
        </div>
      </div>
    `;
  }

  function buildCartDrawer() {
    return `
      <div class="drawer-overlay"></div>
      <aside class="cart-drawer">
        <div class="cart-drawer__head">
          <h3>Tu carrito</h3>
          <button class="cart-drawer__close js-cart-close">Cerrar ×</button>
        </div>
        <div class="cart-drawer__body">
          <div class="js-cart-drawer-empty">
            <p style="font-family: var(--font-display); font-size: 22px; font-style: italic;">Aún no agregaste piezas</p>
            <p>Explorá nuestra colección y guardá tus favoritas.</p>
            <button class="btn btn--outline js-cart-close">Seguir comprando</button>
          </div>
          <div class="js-cart-drawer-items"></div>
        </div>
        <div class="js-cart-drawer-footer">
          <div class="cart-drawer__subtotal"><span>Subtotal</span><strong class="js-cart-drawer-subtotal">Gs 0</strong></div>
          <div class="cart-drawer__hint">Envío y descuentos se calculan en el checkout.</div>
          <div class="cart-drawer__cta">
            <a href="checkout.html" class="btn btn--primary btn--block">Finalizar compra</a>
            <a href="carrito.html" class="btn btn--outline btn--block">Ver carrito completo</a>
          </div>
        </div>
      </aside>
    `;
  }

  // API pública
  window.MOMAR_renderShell = function(opts) {
    opts = opts || {};
    // Mountpoints: cualquier div .js-shell-top y .js-shell-bottom — o body al inicio/final si no existen
    const topMount = document.querySelector('.js-shell-top');
    const bottomMount = document.querySelector('.js-shell-bottom');
    const headerHtml = buildHeader(opts);
    const footerHtml = buildFooter(opts);
    const overlaysHtml = (opts.minimal ? '' : buildMobileMenu()) + (opts.minimal ? '' : buildSearchModal()) + buildCartDrawer() + (opts.minimal ? '' : buildWaFloat());

    if (topMount) {
      topMount.outerHTML = headerHtml;
    } else {
      document.body.insertAdjacentHTML('afterbegin', headerHtml);
    }
    if (bottomMount) {
      bottomMount.outerHTML = footerHtml + overlaysHtml;
    } else {
      document.body.insertAdjacentHTML('beforeend', footerHtml + overlaysHtml);
    }
  };

  // Auto-init si la página tiene un meta data-shell-mode
  document.addEventListener('DOMContentLoaded', () => {
    const meta = document.querySelector('meta[name="momar-shell"]');
    if (meta) {
      const mode = meta.getAttribute('content');
      window.MOMAR_renderShell({ minimal: mode === 'minimal' });
    }
    // Wirear el buscador (después del render del shell)
    wireSearch();
  });

  function wireSearch() {
    function open() {
      document.body.classList.add('search-open');
      setTimeout(() => document.querySelector('.js-search-input')?.focus(), 50);
    }
    function close() {
      document.body.classList.remove('search-open');
      const input = document.querySelector('.js-search-input');
      if (input) input.value = '';
      const res = document.querySelector('.js-search-results');
      if (res) res.innerHTML = '<p class="search-modal__hint">Escribí para buscar entre las piezas. Tip: probá "anillo", "collar", "choker".</p>';
    }

    // Lupa del header
    document.querySelectorAll('.header__action-search').forEach(b => b.addEventListener('click', open));
    document.querySelectorAll('.js-search-close').forEach(b => b.addEventListener('click', close));
    // ESC para cerrar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('search-open')) close();
    });

    // Input → busca en vivo
    document.addEventListener('input', async (e) => {
      if (!e.target.matches('.js-search-input')) return;
      // Esperar a que MOMAR_PRODUCTS esté listo (puede tardar al primer abrir)
      if (window.MOMAR_READY) { try { await window.MOMAR_READY; } catch (_) {} }
      const q = e.target.value.trim().toLowerCase();
      const res = document.querySelector('.js-search-results');
      if (!res) return;
      if (!q || q.length < 2) {
        res.innerHTML = '<p class="search-modal__hint">Escribí para buscar entre las piezas. Tip: probá "anillo", "collar", "choker".</p>';
        return;
      }
      const fmt = window.MOMAR_fmtGs;
      const matches = (window.MOMAR_PRODUCTS || []).filter(p =>
        (p.nombre || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.material || '').toLowerCase().includes(q) ||
        (p.cat || '').toLowerCase().includes(q) ||
        (p.descripcion_corta || '').toLowerCase().includes(q)
      ).slice(0, 8);

      if (!matches.length) {
        res.innerHTML = `<p class="search-modal__hint">No encontramos nada para "<strong>${q}</strong>". Probá con otra palabra.</p>`;
        return;
      }
      res.innerHTML = matches.map(p => `
        <a href="producto.html?sku=${encodeURIComponent(p.sku)}" class="search-modal__item">
          <div class="search-modal__item-img">
            <img src="${p.imagen}" alt="${p.nombre}" loading="lazy" onerror="this.style.opacity=0;">
          </div>
          <div class="search-modal__item-body">
            <div class="search-modal__item-cat">${p.cat || ''} · ${p.material || ''}</div>
            <div class="search-modal__item-nombre">${p.nombre}</div>
            <div class="search-modal__item-precio">${fmt ? fmt(p.precio) : 'Gs ' + p.precio}</div>
          </div>
        </a>
      `).join('') + `
        <a href="catalogo.html?q=${encodeURIComponent(q)}" class="search-modal__see-all">Ver todos los resultados de "${q}" →</a>
      `;
    });
  }
})();
