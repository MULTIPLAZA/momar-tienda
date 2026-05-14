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
├── index.html          # Home
├── catalogo.html       # Listado con filtros
├── producto.html       # Ficha de producto (lee ?sku=)
├── carrito.html        # Carrito completo
├── checkout.html       # Checkout 4 pasos
├── admin.html          # Mockup del panel administrativo
├── css/
│   └── style.css       # Estilos completos (mobile-first)
├── js/
│   ├── products.js     # Catálogo de demo
│   ├── cart.js         # Lógica del carrito + drawer
│   └── render.js       # Render dinámico de grids
├── img/
│   └── logo.png        # Logo MoMar
└── server.js           # Mini server local para dev (Node, sin deps)
```

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
