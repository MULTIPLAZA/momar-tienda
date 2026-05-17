// Renderiza sidebar + topbar consistentes en todas las páginas del admin
(function() {
  const PAGES = [
    { href: 'index.html',       label: 'Inicio',         icon: '<svg class="admin-side__icon" viewBox="0 0 24 24"><path d="M3 12 12 4l9 8M5 10v10h14V10"/></svg>', section: 'principal' },
    { href: 'pedidos.html',     label: 'Pedidos',        icon: '<svg class="admin-side__icon" viewBox="0 0 24 24"><path d="M6 7h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>', badge: '', badgeKey: 'pedidos', section: 'principal' },
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
          // El badge se popula despues por loadSidebarBadges() — empieza oculto
          const badgeAttr = p.badgeKey ? ` data-badge-key="${p.badgeKey}"` : '';
          const badge = p.badgeKey
            ? `<span class="admin-side__badge" data-badge="${p.badgeKey}" style="display:none;"></span>`
            : (p.badge ? `<span class="admin-side__badge">${p.badge}</span>` : '');
          return `<li class="${active}"${badgeAttr}><a href="${p.href}">${p.icon}<span>${p.label}</span>${badge}</a></li>`;
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
    // Cargar badges dinámicos (no bloqueante)
    loadSidebarBadges().catch(() => {});
  };

  // Carga los counts reales para los badges del sidebar (Pedidos, etc.)
  // No bloquea el render del shell — se actualiza apenas resuelve.
  let realtimeSubscribed = false;
  async function loadSidebarBadges() {
    if (!window.MOMAR_supabase) return;
    try {
      // Pedidos: "pago a confirmar" + "pagados esperando envío"
      const supa = window.MOMAR_supabase;
      const [confR, envR] = await Promise.all([
        supa.from('pedidos').select('id', { count: 'exact', head: true }).eq('pago_estado', 'a_confirmar'),
        supa.from('pedidos').select('id', { count: 'exact', head: true })
          .eq('pago_estado', 'pagado')
          .in('envio_estado', ['pendiente', 'preparado']),
      ]);
      const n = (confR.count || 0) + (envR.count || 0);
      const el = document.querySelector('[data-badge="pedidos"]');
      if (el) {
        if (n > 0) {
          el.textContent = n;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      }

      // Subscripción Realtime: cuando hay un cambio en pedidos, refrescar badge
      // Solo una vez por sesión (no recrear al renderizar shell de nuevo)
      if (!realtimeSubscribed) {
        realtimeSubscribed = true;
        supa.channel('admin-pedidos-badge')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
            // Recargar count cuando hay cualquier cambio en pedidos
            loadSidebarBadges();
            // Si hay un mini-toast helper, avisar al admin
            if (window.MOMAR_toast && document.visibilityState === 'visible') {
              window.MOMAR_toast('Hay novedad en pedidos', { kind: 'ok' });
            }
          })
          .subscribe();
      }
    } catch (e) { /* sin red, simplemente no mostramos badge */ }
  }

  // ============================================
  // HELPERS GLOBALES — Modal, Toast, Sortable
  // (Refinamiento 2026-05-17. No modifica markup existente;
  // sólo agrega comportamiento consistente.)
  // ============================================

  // Selector compartido de modales: a-modal (nuevo) + legacy con sus prefijos
  const MODAL_SELECTOR = '.a-modal, .c-modal, .b-modal, .nl-modal, .o-modal';

  function closeAllOpenModals() {
    document.querySelectorAll(MODAL_SELECTOR + '.is-open').forEach(m => {
      m.classList.remove('is-open');
    });
  }

  // Esc cierra cualquier modal abierto
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const opened = document.querySelector(MODAL_SELECTOR + '.is-open');
      if (opened) {
        e.stopPropagation();
        opened.classList.remove('is-open');
      } else if (document.body.classList.contains('admin-menu-open')) {
        document.body.classList.remove('admin-menu-open');
      }
    }
  });

  // Click en el backdrop cierra (sólo si el target es el contenedor exterior, NO el inner)
  document.addEventListener('click', (e) => {
    const modal = e.target.matches(MODAL_SELECTOR) ? e.target : null;
    if (modal && modal.classList.contains('is-open')) {
      modal.classList.remove('is-open');
    }
  });

  // Botón close estándar: cualquier elemento con [data-modal-close] o clase .js-modal-close-x
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-modal-close], .js-modal-close-x');
    if (closeBtn) {
      const modal = closeBtn.closest(MODAL_SELECTOR);
      if (modal) modal.classList.remove('is-open');
    }
  });

  // Inyectar botón X automáticamente en modales legacy que no lo tengan
  function injectModalCloseButtons() {
    document.querySelectorAll(MODAL_SELECTOR).forEach(modal => {
      const inner = modal.querySelector('.a-modal__inner, .c-modal__inner, .b-modal__inner, .nl-modal__inner, .o-modal__inner');
      if (!inner) return;
      if (inner.querySelector('.a-modal__close, [data-modal-close]')) return;
      const btn = document.createElement('button');
      btn.className = 'a-modal__close';
      btn.setAttribute('aria-label', 'Cerrar');
      btn.setAttribute('data-modal-close', '');
      btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      inner.appendChild(btn);
    });
  }
  document.addEventListener('DOMContentLoaded', injectModalCloseButtons);
  // Re-inyectar si después se agregan modales por JS
  const _moObserver = new MutationObserver(() => injectModalCloseButtons());
  document.addEventListener('DOMContentLoaded', () => {
    _moObserver.observe(document.body, { childList: true, subtree: true });
  });

  // ---- Toast ----
  window.MOMAR_toast = function(msg, opts) {
    opts = opts || {};
    const kind = opts.kind || 'info'; // 'ok' | 'err' | 'info'
    const ms = opts.ms || (kind === 'err' ? 4500 : 2400);

    let container = document.querySelector('.a-toast');
    if (!container) {
      container = document.createElement('div');
      container.className = 'a-toast';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }

    const item = document.createElement('div');
    item.className = 'a-toast__item is-' + kind;
    const icon = kind === 'ok'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 12 5 5 9-11"/></svg>'
      : kind === 'err'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17v.5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.5"/></svg>';
    item.innerHTML = icon + '<span>' + String(msg).replace(/</g, '&lt;') + '</span>';
    container.appendChild(item);

    setTimeout(() => {
      item.classList.add('is-hiding');
      setTimeout(() => item.remove(), 220);
    }, ms);
  };

  // ---- Sortable tables ----
  // Activar agregando data-sort al <th> con un valor: "text" | "num" | "date".
  // El tbody debe tener filas reales (no skeletons). Si la fila contiene celdas
  // con data-sort-value, se prefiere ese valor.
  function makeSortable(table) {
    const headers = table.querySelectorAll('th[data-sort]');
    if (!headers.length) return;
    headers.forEach((th, idx) => {
      if (th._sortWired) return;
      th._sortWired = true;
      th.setAttribute('tabindex', '0');
      th.setAttribute('role', 'button');
      th.setAttribute('aria-label', 'Ordenar por ' + (th.textContent || '').trim());
      const trigger = () => sortBy(table, idx, th.dataset.sort, th);
      th.addEventListener('click', trigger);
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger(); }
      });
    });
  }
  function sortBy(table, colIdx, kind, th) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr')).filter(r => !r.classList.contains('skel-row') && r.children.length > colIdx);
    if (rows.length === 0) return;

    const desc = th.classList.contains('is-sort-asc'); // toggle
    table.querySelectorAll('th[data-sort]').forEach(h => h.classList.remove('is-sort-asc', 'is-sort-desc'));
    th.classList.add(desc ? 'is-sort-desc' : 'is-sort-asc');

    const getVal = (row) => {
      const cell = row.children[colIdx];
      if (!cell) return '';
      const dv = cell.getAttribute('data-sort-value');
      if (dv != null) return dv;
      return (cell.textContent || '').trim();
    };

    rows.sort((a, b) => {
      let va = getVal(a), vb = getVal(b);
      if (kind === 'num') {
        const na = parseFloat(String(va).replace(/[^\d.-]/g, '')) || 0;
        const nb = parseFloat(String(vb).replace(/[^\d.-]/g, '')) || 0;
        return desc ? nb - na : na - nb;
      }
      if (kind === 'date') {
        const da = new Date(va).getTime() || 0;
        const db = new Date(vb).getTime() || 0;
        return desc ? db - da : da - db;
      }
      return desc ? vb.localeCompare(va, 'es') : va.localeCompare(vb, 'es');
    });

    rows.forEach(r => tbody.appendChild(r));
  }
  window.MOMAR_makeSortable = makeSortable;
  // Auto-wire al cargar el DOM y observar cambios para tablas hidratadas por JS
  function autoWireSortable() {
    document.querySelectorAll('table.admin-table').forEach(makeSortable);
  }
  document.addEventListener('DOMContentLoaded', autoWireSortable);
})();
