// Renderiza sidebar + topbar consistentes en todas las páginas del admin
(function() {
  const PAGES = [
    { href: 'index.html',       label: 'Inicio',         icon: '<svg class="admin-side__icon" viewBox="0 0 24 24"><path d="M3 12 12 4l9 8M5 10v10h14V10"/></svg>', section: 'principal' },
    { href: 'pedidos.html',     label: 'Pedidos',        icon: '<svg class="admin-side__icon" viewBox="0 0 24 24"><path d="M6 7h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>', badge: '3', section: 'principal' },
    { href: 'productos.html',   label: 'Productos',      icon: '<svg class="admin-side__icon" viewBox="0 0 24 24"><path d="M20 7 12 3 4 7v10l8 4 8-4V7Z"/><path d="m4 7 8 4 8-4M12 11v10"/></svg>', section: 'principal' },
    { href: 'clientes.html',    label: 'Clientes',       icon: '<svg class="admin-side__icon" viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-3.5 3.1-6 7-6s7 2.5 7 6"/><circle cx="17" cy="8" r="3"/><path d="M22 19c0-2.5-2-4.5-5-4.5"/></svg>', section: 'principal' },
    { type: 'label', label: 'Marketing' },
    { href: 'banners.html',     label: 'Banners',        icon: '<svg class="admin-side__icon" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 10h18"/></svg>' },
    { href: 'newsletter.html',  label: 'Newsletter',     icon: '<svg class="admin-side__icon" viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="m4 6 8 7 8-7"/></svg>' },
    { href: 'ofertas.html',     label: 'Ofertas y cupones', icon: '<svg class="admin-side__icon" viewBox="0 0 24 24"><path d="M3 12 12 3l9 9-9 9z"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/></svg>' },
    { type: 'label', label: 'Reportes' },
    { href: 'estadisticas.html',label: 'Estadísticas',   icon: '<svg class="admin-side__icon" viewBox="0 0 24 24"><path d="M4 20V8m6 12V4m6 16v-8m6 8v-4"/></svg>' },
    { type: 'label', label: 'Sistema' },
    { href: 'configuracion.html',label: 'Configuración', icon: '<svg class="admin-side__icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1A2 2 0 1 1 4.6 17l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1A2 2 0 1 1 7 4.6l.1.1a1.6 1.6 0 0 0 1.7.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3l.1-.1A2 2 0 1 1 19.4 7l-.1.1a1.6 1.6 0 0 0-.3 1.7V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>' }
  ];

  function buildSidebar(activeHref) {
    const u = window.MOMAR_ADMIN_USER;
    return `
      <div class="admin-side__logo">
        <a href="index.html" aria-label="MOMAR">
          <svg class="logo-svg" viewBox="0 0 200 50"><text x="100" y="38" text-anchor="middle" font-size="38" font-family="Cormorant Garamond, serif" font-weight="500" font-style="italic" fill="currentColor" letter-spacing="0.5">MoMar</text></svg>
        </a>
      </div>
      <ul class="admin-side__menu">
        ${PAGES.map(p => {
          if (p.type === 'label') return `<li class="section-label">${p.label}</li>`;
          const active = p.href === activeHref ? 'is-active' : '';
          const badge = p.badge ? `<span class="admin-side__badge">${p.badge}</span>` : '';
          return `<li class="${active}"><a href="${p.href}">${p.icon}<span>${p.label}</span>${badge}</a></li>`;
        }).join('')}
      </ul>
      <div class="admin-side__user">
        <div class="admin-side__avatar">${u.inicial}</div>
        <div style="min-width:0; flex:1;">
          <div class="admin-side__user-name">${u.nombre} ${u.apellido}</div>
          <div class="admin-side__user-role">${u.rol}</div>
        </div>
      </div>
      <div class="admin-side__foot">
        <a href="../index.html">← Tienda pública</a> · <a href="#" class="js-admin-logout">Salir</a>
      </div>
    `;
  }

  function buildTopbar(title) {
    return `
      <div class="admin-topbar__left">
        <span class="admin-hamburger" onclick="document.body.classList.add('admin-menu-open')"><span></span><span></span><span></span></span>
        <h1 class="admin-topbar__title">${title || ''}</h1>
      </div>
      <div class="admin-topbar__right">
        <div class="admin-search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="text" placeholder="Buscar pedido, cliente, producto…">
        </div>
        <button class="admin-bell" aria-label="Notificaciones">
          <svg viewBox="0 0 24 24"><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16Z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
        </button>
      </div>
    `;
  }

  // Cierra el menú al click en overlay (mobile)
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('admin-menu-open') && !e.target.closest('.admin-side') && !e.target.closest('.admin-hamburger')) {
      document.body.classList.remove('admin-menu-open');
    }
  });

  // Si está disponible el flow de auth real, esperamos a que resuelva antes de renderear el sidebar
  // (así muestra el email/nombre del usuario logueado, no el fallback)
  async function ensureAuthReady() {
    if (window.MOMAR_AUTH_READY) {
      const session = await window.MOMAR_AUTH_READY;
      if (!session) return false; // admin-auth ya redirige a login
    }
    return true;
  }

  window.MOMAR_renderAdminShell = async function(activeHref, pageTitle) {
    const ok = await ensureAuthReady();
    if (!ok) return;
    const side = document.querySelector('.admin-side');
    const top = document.querySelector('.admin-topbar');
    if (side) side.innerHTML = buildSidebar(activeHref);
    if (top) top.innerHTML = buildTopbar(pageTitle);
    // Wirear logout
    document.querySelectorAll('.js-admin-logout').forEach(a => {
      a.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm('¿Cerrar sesión?')) return;
        if (window.MOMAR_logout) await window.MOMAR_logout();
        else location.replace('login.html');
      });
    });
  };
})();
