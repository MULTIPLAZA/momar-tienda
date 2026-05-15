// MOMAR — Carrito funcional con localStorage + drawer overlay
// Dependencia: products.js debe cargarse antes

(function() {
  const STORAGE_KEY = 'momar_cart_v1';

  class Cart {
    constructor() {
      try {
        this.items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch (e) {
        this.items = [];
      }
    }
    save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items)); }
    add(sku, qty, variante) {
      qty = qty || 1;
      variante = variante || null;
      const key = sku + '||' + (variante || '');
      const existing = this.items.find(i => i.key === key);
      if (existing) {
        existing.qty += qty;
      } else {
        this.items.push({ key, sku, variante, qty });
      }
      this.save();
    }
    remove(key) {
      this.items = this.items.filter(i => i.key !== key);
      this.save();
    }
    updateQty(key, qty) {
      const it = this.items.find(i => i.key === key);
      if (it) {
        it.qty = Math.max(1, parseInt(qty) || 1);
        this.save();
      }
    }
    empty() { this.items = []; this.save(); }
    count() { return this.items.reduce((s, i) => s + i.qty, 0); }
    subtotal() {
      return this.items.reduce((s, i) => {
        const p = window.MOMAR_findProduct(i.sku);
        return s + (p ? p.precio * i.qty : 0);
      }, 0);
    }
    enriched() {
      return this.items.map(i => {
        const p = window.MOMAR_findProduct(i.sku);
        return p ? Object.assign({}, p, { key: i.key, qty: i.qty, variante: i.variante }) : null;
      }).filter(Boolean);
    }
  }

  window.cart = new Cart();

  // Esperar a que los datos remotos estén antes de wirear delegación que usa MOMAR_findProduct
  const ready = window.MOMAR_READY || Promise.resolve();

  // ---- UI helpers ----

  function updateBadge(animate) {
    const count = window.cart.count();
    document.querySelectorAll('.js-cart-count').forEach(el => {
      el.textContent = count;
      el.classList.toggle('is-visible', count > 0);
      if (animate && count > 0) {
        el.classList.remove('is-bumping');
        // force reflow para reiniciar la animación
        void el.offsetWidth;
        el.classList.add('is-bumping');
      }
    });
  }

  function renderDrawer() {
    const items = window.cart.enriched();
    const list = document.querySelector('.js-cart-drawer-items');
    const empty = document.querySelector('.js-cart-drawer-empty');
    const subtotalEl = document.querySelector('.js-cart-drawer-subtotal');
    const footer = document.querySelector('.js-cart-drawer-footer');
    if (!list) return;

    if (items.length === 0) {
      list.innerHTML = '';
      if (empty) empty.style.display = 'block';
      if (footer) footer.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (footer) footer.style.display = 'block';

    list.innerHTML = items.map(p => `
      <div class="cart-drawer-item" data-key="${p.key}">
        <div class="cart-drawer-item__img">
          <img src="${p.imagen}" alt="${p.nombre}" onerror="this.style.opacity=0;">
        </div>
        <div class="cart-drawer-item__body">
          <div class="cart-drawer-item__nombre">${p.nombre}</div>
          <div class="cart-drawer-item__variante">${p.cat}${p.variante ? ' · ' + p.variante : ''}</div>
          <div class="cart-drawer-item__qty">
            <button class="js-cart-qty-minus" data-key="${p.key}">−</button>
            <span>${p.qty}</span>
            <button class="js-cart-qty-plus" data-key="${p.key}">+</button>
          </div>
        </div>
        <div class="cart-drawer-item__price">
          <div>${window.MOMAR_fmtGs(p.precio * p.qty)}</div>
          <button class="cart-drawer-item__remove js-cart-remove" data-key="${p.key}">Quitar</button>
        </div>
      </div>
    `).join('');

    if (subtotalEl) subtotalEl.textContent = window.MOMAR_fmtGs(window.cart.subtotal());
  }

  function openDrawer() {
    renderDrawer();
    document.body.classList.add('drawer-open');
    document.querySelector('.cart-drawer')?.classList.add('is-open');
    document.querySelector('.drawer-overlay')?.classList.add('is-open');
  }
  function closeDrawer() {
    document.body.classList.remove('drawer-open');
    document.querySelector('.cart-drawer')?.classList.remove('is-open');
    document.querySelector('.drawer-overlay')?.classList.remove('is-open');
  }

  // Toast feedback al agregar
  function toast(msg) {
    let t = document.querySelector('.momar-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'momar-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('is-visible'), 1800);
  }

  // ---- Wiring ----
  document.addEventListener('DOMContentLoaded', () => {
    updateBadge();

    // Toggle drawer
    document.querySelectorAll('.js-cart-toggle').forEach(b => b.addEventListener('click', openDrawer));
    document.querySelectorAll('.js-cart-close, .drawer-overlay').forEach(b => b.addEventListener('click', closeDrawer));

    // Hamburger menu mobile
    const menuToggle = document.querySelector('.js-menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        document.body.classList.add('menu-open');
      });
    }
    document.querySelectorAll('.js-menu-close').forEach(b => b.addEventListener('click', () => {
      document.body.classList.remove('menu-open');
    }));

    // Delegación de clicks para add/qty/remove
    document.addEventListener('click', (e) => {
      const add = e.target.closest('.js-add-to-cart');
      if (add) {
        e.preventDefault();
        const sku = add.dataset.sku;
        const qty = parseInt(add.dataset.qty || '1', 10);
        const variante = add.dataset.variante || null;
        window.cart.add(sku, qty, variante);
        updateBadge(true); // animado
        const p = window.MOMAR_findProduct(sku);
        toast((p ? p.nombre : 'Producto') + ' agregado al carrito');
        // Si está en una página que no es carrito.html, abrir drawer
        if (add.dataset.openDrawer !== 'false') {
          openDrawer();
        } else {
          renderCartPage();
        }
        return;
      }
      const minus = e.target.closest('.js-cart-qty-minus');
      if (minus) {
        const key = minus.dataset.key;
        const it = window.cart.items.find(i => i.key === key);
        if (it) {
          if (it.qty <= 1) window.cart.remove(key);
          else window.cart.updateQty(key, it.qty - 1);
          updateBadge(); renderDrawer(); renderCartPage();
        }
        return;
      }
      const plus = e.target.closest('.js-cart-qty-plus');
      if (plus) {
        const key = plus.dataset.key;
        const it = window.cart.items.find(i => i.key === key);
        if (it) {
          window.cart.updateQty(key, it.qty + 1);
          updateBadge(); renderDrawer(); renderCartPage();
        }
        return;
      }
      const rm = e.target.closest('.js-cart-remove');
      if (rm) {
        window.cart.remove(rm.dataset.key);
        updateBadge(); renderDrawer(); renderCartPage();
        return;
      }
    });

    // Si esta página es carrito.html, renderizar items dinámicos
    renderCartPage();

    // Toast persistente: "Tenés piezas guardadas" si visita siguiente con items en carrito (#12)
    if (window.cart.items.length > 0
        && !location.pathname.includes('carrito')
        && !location.pathname.includes('checkout')) {
      const lastShown = sessionStorage.getItem('momar_cart_toast_shown');
      if (!lastShown) {
        setTimeout(() => showPersistentToast(), 2000);
        sessionStorage.setItem('momar_cart_toast_shown', '1');
      }
    }
  });

  function showPersistentToast() {
    const items = window.cart.enriched();
    if (items.length === 0) return;
    const first = items[0];
    const count = window.cart.count();

    let t = document.querySelector('.toast-persistente');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast-persistente';
      document.body.appendChild(t);
    }
    t.innerHTML = `
      <div class="toast-persistente__img">
        <img src="${first.imagen}" alt="${first.nombre}" onerror="this.style.opacity=0;">
      </div>
      <div class="toast-persistente__body">
        <strong>Tenés ${count} pieza${count > 1 ? 's' : ''} guardada${count > 1 ? 's' : ''}</strong>
        <span>Seguí donde te quedaste — tu carrito te espera.</span>
      </div>
      <button class="toast-persistente__close" aria-label="Cerrar">×</button>
    `;
    setTimeout(() => t.classList.add('is-visible'), 50);
    t.addEventListener('click', (e) => {
      if (e.target.closest('.toast-persistente__close')) {
        t.classList.remove('is-visible');
        setTimeout(() => t.remove(), 400);
      } else {
        // click en cuerpo → abre drawer
        openDrawer();
        t.classList.remove('is-visible');
        setTimeout(() => t.remove(), 400);
      }
    });
    // Auto-hide a los 8 segundos
    setTimeout(() => {
      if (t && t.classList.contains('is-visible')) {
        t.classList.remove('is-visible');
        setTimeout(() => t.remove(), 400);
      }
    }, 8000);
  }

  // ---- Página de carrito completa ----
  function renderCartPage() {
    const target = document.querySelector('.js-cart-page-items');
    if (!target) return;
    const items = window.cart.enriched();
    const empty = document.querySelector('.js-cart-page-empty');
    const layout = document.querySelector('.js-cart-page-layout');

    if (items.length === 0) {
      if (empty) empty.style.display = 'block';
      if (layout) layout.style.display = 'none';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (layout) layout.style.display = '';

    target.innerHTML = items.map(p => `
      <div class="carrito-item" data-key="${p.key}">
        <div class="carrito-item__img">
          <img src="${p.imagen}" alt="${p.nombre}" onerror="this.style.opacity=0;">
        </div>
        <div>
          <div class="carrito-item__nombre">${p.nombre}</div>
          <div class="carrito-item__variante">${p.material}${p.variante ? ' · ' + p.variante : ''}</div>
          <a href="#" class="carrito-item__quitar js-cart-remove" data-key="${p.key}" style="display:inline-block; margin-top:8px;">Quitar</a>
        </div>
        <div class="cantidad">
          <button class="js-cart-qty-minus" data-key="${p.key}">−</button>
          <input type="text" value="${p.qty}" readonly>
          <button class="js-cart-qty-plus" data-key="${p.key}">+</button>
        </div>
        <div class="carrito-item__precio">
          ${p.precio_antes ? `<del style="color: var(--color-text-soft); font-size:12px;">${window.MOMAR_fmtGs(p.precio_antes * p.qty)}</del><br>` : ''}
          ${window.MOMAR_fmtGs(p.precio * p.qty)}
        </div>
      </div>
    `).join('');

    const subtotal = window.cart.subtotal();
    const desc = items.reduce((s, p) => s + (p.precio_antes ? (p.precio_antes - p.precio) * p.qty : 0), 0);

    document.querySelectorAll('.js-cart-page-subtotal').forEach(el => el.textContent = window.MOMAR_fmtGs(subtotal + desc));
    document.querySelectorAll('.js-cart-page-discount').forEach(el => el.textContent = desc > 0 ? '— ' + window.MOMAR_fmtGs(desc) : window.MOMAR_fmtGs(0));
    document.querySelectorAll('.js-cart-page-total').forEach(el => el.textContent = window.MOMAR_fmtGs(subtotal));
    const cuota = Math.round(subtotal / 3);
    document.querySelectorAll('.js-cart-page-cuota').forEach(el => el.textContent = window.MOMAR_fmtGs(cuota));
  }
})();
