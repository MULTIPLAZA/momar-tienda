# MoMar — Tienda online

Mockup de e-commerce premium para **MoMar**, joyería y accesorios de hogar de alta gama en Asunción, Paraguay.

[`momar.com.py`](https://momar.com.py) *(próximamente)*

---

## Stack

100% estático — sin backend, sin build step.

- **HTML5** + **CSS3** (vanilla)
- **JavaScript** (vanilla, ES2020+)
- **Tipografías:** Cormorant Garamond + DM Sans (Google Fonts)
- **Imágenes de demo:** Unsplash (placeholder hasta que estén las fotos reales)
- **Carrito:** `localStorage` (sin backend)

## Estructura

```
.
├── index.html               # Home pública
├── catalogo.html            # Listado con filtros
├── producto.html            # Ficha de producto (lee ?sku=)
├── carrito.html             # Carrito completo
├── checkout.html            # Checkout 4 pasos
├── css/style.css            # Estilos de la tienda pública (mobile-first)
├── js/
│   ├── products.js          # Catálogo de demo
│   ├── cart.js              # Lógica del carrito + drawer
│   └── render.js            # Render dinámico de grids
├── img/logo.png             # Logo MoMar
├── server.js                # Mini server local para dev (Node, sin deps)
└── admin/                   # Panel de administración (mockup)
    ├── login.html
    ├── index.html           # Dashboard
    ├── pedidos.html         # Listado de pedidos
    ├── pedido.html          # Detalle de pedido (cambio estado, WhatsApp, KUDE)
    ├── productos.html       # Listado de productos
    ├── producto-edit.html   # Editar / crear producto
    ├── clientes.html        # Listado de clientas (segmentación VIP)
    ├── banners.html         # Gestión de banners de home
    ├── ofertas.html         # Cupones y descuentos
    ├── estadisticas.html    # Reportes y gráficos
    ├── configuracion.html   # Datos de la tienda, SIFEN, redes, SEO
    ├── css/admin.css
    └── js/
        ├── admin-data.js    # Datos mock (pedidos, clientes, banners, ofertas)
        └── admin-shell.js   # Sidebar + topbar reutilizables
```

**URLs en producción:**
- Tienda pública → `/`
- Panel admin → `/admin/`

## Cómo correr localmente

Cualquiera de estas:

```bash
# Opción 1: el server incluido (Node, sin deps)
node server.js
# luego abrí http://localhost:8020

# Opción 2: Python
python -m http.server 8020

# Opción 3: npx serve
npx serve . -p 8020
```

## Deploy en Cloudflare Pages

1. Conectar este repo desde Cloudflare Pages.
2. **Build command:** *(vacío)*
3. **Build output directory:** `/`
4. **Root directory:** `/`

No hay build step — es un sitio estático puro.

## Identidad visual

- **Paleta:** monocromática contemporánea (negro profundo `#0F0F0F` · off-white `#F7F5F0` · nude `#E8DFD3`)
- **Tipografía display:** Cormorant Garamond italic (titulares editorial)
- **Tipografía texto:** DM Sans (limpia, moderna)
- **Mood:** new luxury / editorial contemporáneo — línea Mejuri · Aurate · Catbird

## Lo que falta para producción

- [ ] Logo vectorial real (SVG) reemplazando el `<text>` actual
- [ ] Fotos profesionales de productos (fondo blanco macro)
- [ ] 3 fotos hero rotativas
- [ ] Banners promo reales
- [ ] Copy real de cada sección
- [ ] Integración pasarela de pago (Bancard)
- [ ] Integración facturación electrónica SIFEN
- [ ] Backend para órdenes + stock real
- [ ] Migración a WordPress + WooCommerce (o stack equivalente)

---

© 2026 MoMar
