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
    const overlaysHtml = (opts.minimal ? '' : buildMobileMenu()) + buildCartDrawer();

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
  });
})();
