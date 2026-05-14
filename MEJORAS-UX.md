# MoMar · Auditoría UX y plan de mejoras

> Análisis del mockup actual (14/may/2026) priorizado por **impacto vs esfuerzo**.
> Enfocado en mobile (~60%), conversión premium (~25%) y lujo / accesibilidad / microinteracciones (~15%).
> No se modificó código todavía — esto es la hoja de ruta.

---

## 1. El badge del carrito desaparece visualmente en mobile (bug de posicionamiento)
**Ubicación:** `css/style.css:1196` (media query `@media (max-width: 768px)`)
**Esfuerzo:** Quick win (15 min)
**Impacto:** Alto · sobre conversión / mobile UX
**Por qué:**
En mobile estás haciendo `font-size: 0` al `.header__actions button` (para ocultar texto), y al `.cart-count` le metés `margin-left:-10px; margin-top:-10px; position: relative;`. El resultado real es que el badge queda flotando contra el ícono pero **sin ser un badge bien anclado** — depende del flujo, y en pantallas de 360-375px se solapa raro con el ícono de cuenta vecino. Además queda sin offset hacia arriba/derecha clásico del badge de cart.
**Cómo:**
Hacer el botón `position: relative` y posicionar el badge en absoluto, así no depende del flujo del texto:
```css
.header__actions .js-cart-toggle { position: relative; }
.cart-count {
  position: absolute;
  top: 2px; right: 0;
  margin: 0;
  min-width: 16px; height: 16px;
  padding: 0 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px;
  border-radius: 999px;
  background: var(--color-nude);
  color: var(--color-dark);
}
```
Detalle premium: usar `--color-nude` en vez de `--color-bg` blanco-crema sobre fondo negro le da más sofisticación (Mejuri usa exactamente esa lógica).

---

## 2. El input de "Cantidad" en producto NO suma cuando el usuario tipea, solo con +/−
**Ubicación:** `producto.html:60-65` + `js/render.js:178-184`
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Medio · sobre conversión
**Por qué:**
El input tiene `readonly`, así que la única forma de pasar de 1 a 3 unidades es tocar tres veces "+". En mobile con tap-target de 44px está OK, pero conceptualmente es fricción. Además, el botón "Agregar" toma `data-qty` de un dataset que se actualiza con `onclick` inline — frágil. Si tocás +, +, y agregás, el carrito puede quedar inconsistente si el script no llegó a updatear el dataset (caso real en conexiones lentas mobile).
**Cómo:**
- Sacar `readonly`, validar `inputmode="numeric"` y leer el valor **en el momento del click** del botón "Agregar", no antes:
```js
addBtn.addEventListener('click', () => {
  const qty = Math.max(1, parseInt(document.getElementById('prod-qty').value) || 1);
  cart.add(sku, qty, variante);
});
```
- En mobile, además, el input de cantidad puede esconderse y mostrarse SOLO si el usuario quiere "ajustar" — el patrón premium (Mejuri, SSENSE) es agregar de a uno y permitir editar cantidad desde el drawer/carrito.

---

## 3. Sticky bar mobile no respeta safe-area y tapa la última fila de "Te puede gustar"
**Ubicación:** `producto.html:101-108` + `css/style.css:1220-1224`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Alto · sobre mobile UX
**Por qué:**
La sticky add bar se renderiza en `bottom: 0` sin contemplar el **home indicator** del iPhone (notch inferior). Y `producto-detalle` solo agrega `padding-bottom: 100px` en mobile, pero la sección "Te puede gustar" que viene **después** no tiene ese padding extra — el último producto relacionado queda parcialmente cubierto por la sticky bar.
**Cómo:**
```css
.sticky-add-bar {
  padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom));
}
/* y agregar padding al body en páginas con sticky bar */
body:has(.sticky-add-bar) {
  padding-bottom: 80px;
}
```
(Si no querés depender de `:has`, agregás una clase `body.has-sticky-bar` desde JS en producto.html.)

---

## 4. El drawer del carrito ocupa el 100% del ancho en mobile y se siente claustrofóbico
**Ubicación:** `css/style.css:1274`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Medio · sobre lujo perceptual / mobile UX
**Por qué:**
`max-width: 100%` en mobile hace que el drawer se sienta como una página entera, no como un drawer — pierde la sensación de "estoy mirando algo flotante sobre el catálogo". Mejuri, Cuyana y Catbird usan ~92-95% para que se vea **el catálogo asomando** detrás del overlay oscuro. Esa sombra del catálogo es lo que comunica "podés cerrar y seguir comprando, no perdiste el contexto".
**Cómo:**
```css
@media (max-width: 768px) {
  .cart-drawer { max-width: 92%; }
}
```
Y reforzar el overlay con `backdrop-filter: blur(2px)` para sumar sofisticación:
```css
.drawer-overlay { backdrop-filter: blur(3px); }
```

---

## 5. No hay feedback de "agregando..." entre click y la apertura del drawer
**Ubicación:** `js/cart.js:154-170` (click handler de `.js-add-to-cart`)
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Alto · sobre lujo perceptual / conversión
**Por qué:**
El click es instantáneo y el drawer abre de una. En un sitio premium real esto es bueno (no querés simular lentitud), PERO el quick-add desde una card de catálogo necesita una micro-confirmación **en la card misma** antes de abrir el drawer. Hoy el usuario hace tap en una card y de repente le aparece un drawer a la derecha — pierde el ancla visual de cuál producto agregó.
**Cómo:**
- Cuando se hace click en `.producto__quick-add`, animá el botón al estado "✓ Agregado" por 800ms ANTES de abrir el drawer (o sin abrirlo, solo actualizando el badge — opción más Mejuri).
- Pulso sutil en el ícono del carrito del header (`@keyframes pulse`) cuando incrementa el contador.
```css
@keyframes cart-bump {
  0%, 100% { transform: scale(1); }
  40% { transform: scale(1.18); }
}
.cart-count.is-bumping { animation: cart-bump 0.5s var(--ease); }
```
Y en JS:
```js
const badge = document.querySelector('.cart-count');
badge.classList.remove('is-bumping');
void badge.offsetWidth; // reflow trick
badge.classList.add('is-bumping');
```

---

## 6. La grilla de catálogo en mobile (375px) muestra 2 productos pero los nombres se cortan
**Ubicación:** `css/style.css:1209-1211`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Medio · sobre mobile UX / lujo perceptual
**Por qué:**
`.producto__nombre` en mobile baja a 16px pero los nombres tipo "Anillo Solitario Clásico Diamante" o "Collar Constelación Doble Cadena" se cortan a 2 líneas o más con altura inconsistente — las cards quedan desalineadas entre sí. Esto rompe el ritmo visual editorial.
**Cómo:**
- Forzar `min-height` o limitar a 2 líneas con clamp:
```css
.producto__nombre {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.5em; /* reserva el espacio aun si solo hay 1 línea */
}
```
- Bonus premium: dejar que `producto__cat` (eyebrow chiquito) sea SIEMPRE 1 línea y `producto__nombre` 2 líneas, así la altura de cada card es predecible.

---

## 7. El quick-add visible-siempre en mobile compite con el tap en la imagen
**Ubicación:** `css/style.css:1211` + `js/render.js:17-36`
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Alto · sobre conversión / mobile UX
**Por qué:**
En desktop el quick-add aparece on-hover sobre la imagen (limpio). En mobile lo dejaste **siempre visible al fondo de la imagen**, lo que:
1. Tapa la parte baja de la foto (la pieza queda recortada visualmente).
2. Compite por el tap con el `<a>` que envuelve la imagen para ir a la ficha.
3. Saca el aura editorial — Mejuri y Aurate en mobile NO muestran quick-add en la card.

El patrón premium en mobile es: tap en la card va a la ficha, y el "agregar" sucede en la ficha (donde sí elegís talle, podés ver más fotos, etc.). El quick-add es un patrón **desktop** de e-commerce de moda rápida (Zara), no de joyería de autor.
**Cómo:**
- Ocultar `producto__quick-add` en mobile:
```css
@media (max-width: 768px) {
  .producto__quick-add { display: none; }
}
```
- Si quisieras conservar un "quick-add mobile-friendly", ponerlo COMO BOTÓN DEBAJO del precio (fuera de la imagen), pero mi recomendación es sacarlo en mobile y dejar solo navegación a ficha.

---

## 8. Falta indicador de stock bajo / urgencia en la ficha de producto
**Ubicación:** `producto.html:54-77` (zona precio + cuotas) y `js/render.js:105-130`
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Alto · sobre conversión
**Por qué:**
Tenés en `products.js` el campo `stock` y `es_unica` pero **no los mostrás en la ficha**. Para joyería premium con piezas únicas, decir "Última disponible" o "Quedan 2 en stock · Reservalo" es **el principal driver de conversión**. Mejuri lo usa con texto chico y borgoña sutil, no con bandera roja agresiva.
**Cómo:**
Debajo del precio en la ficha:
```js
let stockMsg = '';
if (p.es_unica) stockMsg = '<div class="stock-alert stock-alert--unique">Pieza única · No se repone</div>';
else if (p.stock === 1) stockMsg = '<div class="stock-alert stock-alert--low">Última disponible</div>';
else if (p.stock <= 3) stockMsg = `<div class="stock-alert stock-alert--low">Quedan ${p.stock} en stock</div>`;
```
Estilo sobrio (NO rojo Zara, sino borgoña y discreto):
```css
.stock-alert {
  font-size: 12px; letter-spacing: 1px; text-transform: uppercase;
  color: var(--color-sale); margin: 0 0 var(--space-3);
  display: inline-flex; align-items: center; gap: 8px;
}
.stock-alert::before {
  content: ''; width: 6px; height: 6px; border-radius: 50%;
  background: var(--color-sale); display: inline-block;
}
.stock-alert--unique::before { background: var(--color-nude-dark); }
.stock-alert--unique { color: var(--color-text); font-style: italic; font-family: var(--font-display); }
```

---

## 9. La galería del producto en mobile no permite swipe / zoom y los thumbs quedan apretados
**Ubicación:** `producto.html:43-47` + `css/style.css:629-653` (sin overrides mobile específicos)
**Esfuerzo:** Grande (medio día+)
**Impacto:** Alto · sobre conversión / lujo perceptual
**Por qué:**
Para joyería online, **la galería es el 70% de la conversión**. Hoy en mobile:
- No hay swipe horizontal entre fotos (tenés que tocar thumbs muy chiquitos abajo).
- No hay zoom on tap (pinch-zoom del navegador no cuenta — la gente espera doble-tap o pinch sobre la imagen y que aparezca lupa).
- Los thumbs `repeat(4, 1fr)` con `gap: var(--space-2)` en un ancho de 351px (375 - 24 padding) dan thumbs de ~80px — usable, pero podés convertir a carrusel horizontal con scroll-snap y mostrar más miniaturas.

**Cómo:**
- **Quick win** (15 min): convertir galería mobile a scroll horizontal con snap:
```css
@media (max-width: 768px) {
  .galeria__principal { display: none; } /* no necesitás principal+thumbs */
  .galeria__thumbs {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    gap: 0;
    margin: 0 calc(-1 * var(--space-3)); /* full bleed */
  }
  .galeria__thumbs > div {
    flex: 0 0 100%;
    aspect-ratio: 1/1;
    scroll-snap-align: center;
    outline: none;
  }
}
```
Más indicadores tipo dots debajo (1/4, 2/4...).
- **Grande** (medio día): integrar una lib de zoom tipo `medium-zoom` o codear pinch-to-zoom propio.

---

## 10. El checkout es de UNA SOLA PÁGINA larga con 4 form-steps colapsados visualmente — abrumador en mobile
**Ubicación:** `checkout.html:35-153`
**Esfuerzo:** Grande (medio día+)
**Impacto:** Alto · sobre conversión
**Por qué:**
4 secciones "form-step" todas abiertas en una sola página, en mobile son ~6-7 scrolls de pantalla. El usuario no sabe cuánto le falta. Además, el "01/04" arriba a la derecha sugiere pasos pero NO son pasos navegables.

Patrones premium actuales (Shopify Plus, Mejuri checkout):
- **Accordion** que abre uno a la vez (vas completando y se colapsa con un check verde).
- O **stepper real** en 3 páginas: contacto → envío → pago.

El paraguayo en mobile completando dirección con ciudad+referencia+CI+RUC+selects necesita guía visual de progreso, no un wall of inputs.
**Cómo:**
Refactor a accordion:
```html
<div class="form-step is-complete">
  <div class="form-step__head">
    <h3>✓ Datos de contacto <span class="form-step__summary">maria@email.com · +595 981...</span></h3>
    <button class="form-step__edit">Editar</button>
  </div>
  <!-- contenido colapsado -->
</div>
<div class="form-step is-active">
  <div class="form-step__head"><h3>Datos de envío</h3></div>
  <!-- contenido abierto -->
</div>
```
JS para validar al hacer "Continuar" y avanzar al siguiente paso.

Quick win **antes** del refactor grande: agregá `scroll-margin-top` a `.form-step` y un botón "Continuar →" al final de cada paso que haga scroll suave al siguiente (sin colapsar pero al menos guiando).

---

## 11. Falta autocompletado de ciudad/dirección y validación inline en el checkout
**Ubicación:** `checkout.html:50-85`
**Esfuerzo:** Mediana (1-2 hs por feature)
**Impacto:** Alto · sobre conversión
**Por qué:**
- El select de "Ciudad" es estático con 6 opciones — un cliente de San Bernardino o Areguá no aparece y queda en "Interior" frustrado.
- No hay validación inline (en blur del email, formato de WhatsApp, CI sin puntos, etc.).
- El input de CI/RUC no formatea con puntos automáticamente (1.234.567) — el paraguayo está acostumbrado a verlo así.

**Cómo:**
- Cambiar select de ciudad por un input con datalist de ciudades PY más comunes (mantenés el atajo pero permitís cualquier ciudad).
- Validación blur:
```js
document.querySelector('input[type=email]').addEventListener('blur', e => {
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value);
  e.target.classList.toggle('is-error', !ok && e.target.value);
});
```
```css
.form-field input.is-error { border-color: var(--color-sale); }
.form-field input.is-error + .form-field__err { display: block; color: var(--color-sale); font-size: 11px; margin-top: 4px; }
```
- Auto-formato CI:
```js
ci.addEventListener('input', e => {
  e.target.value = e.target.value.replace(/\D/g,'').replace(/(\d)(?=(\d{3})+$)/g,'$1.');
});
```

---

## 12. No hay micro-estados de "carrito recordado" cuando el usuario vuelve
**Ubicación:** `js/cart.js:8-14` (constructor) + falta en `index.html`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Medio · sobre conversión / lujo perceptual
**Por qué:**
El carrito ya persiste en localStorage (perfecto), pero el usuario que vuelve mañana no recibe ninguna señal de "tenemos lo que dejaste". Sin abrir el drawer no sabe que está ahí. Patrón Mejuri: a las 24-48 hs muestra un toast asomado abajo izquierda "Tenés 2 piezas en tu carrito · seguir comprando".
**Cómo:**
En `cart.js`, al cargar la página, si hay items y no estás en `carrito.html`/`checkout.html`:
```js
if (this.items.length > 0 && !location.pathname.includes('carrito') && !location.pathname.includes('checkout')) {
  setTimeout(() => {
    toast(`Tenés ${this.count()} pieza${this.count() > 1 ? 's' : ''} guardada${this.count() > 1 ? 's' : ''} en tu carrito.`);
  }, 1500);
}
```
Versión más premium: un mini-banner anclado abajo-izquierda con la foto chica del último producto y el botón "Continuar compra".

---

## 13. El hero ocupa 88vh en desktop pero el copy queda muy chiquito y "Ver colección" se pierde
**Ubicación:** `css/style.css:264-310` + `index.html:51-58`
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Alto · sobre lujo perceptual / conversión
**Por qué:**
El hero usa `text-align: center` con `max-width: 680px` y h1 con `clamp(36px, 6vw, 64px)`. En desktop a 1440px, h1 da ~64px **centrado al medio de una imagen ancha** — se siente "centrado de plantilla", no editorial. Mejuri, Cuyana, Catbird usan hero con texto **anclado abajo-izquierda** ("hugged corner") o full-bleed con un grain texture sobre la imagen.

Además el botón "Ver colección" tiene `.btn--light` (off-white) sobre overlay oscuro — el contraste está bien, pero el tamaño en desktop queda subdimensionado contra una imagen full-bleed.
**Cómo:**
- Anclar el hero content abajo-izquierda:
```css
@media (min-width: 769px) {
  .hero { justify-content: flex-start; align-items: flex-end; padding: var(--space-7); }
  .hero__content { text-align: left; max-width: 540px; }
  .hero__content h1 { font-size: clamp(48px, 7vw, 88px); line-height: 1.05; }
}
```
- Bonus cinematic: animación de fade-up en el copy al cargar:
```css
.hero__content > * { opacity: 0; transform: translateY(20px); animation: hero-in 0.9s var(--ease) forwards; }
.hero__content > *:nth-child(1) { animation-delay: 0.1s; }
.hero__content > *:nth-child(2) { animation-delay: 0.25s; }
.hero__content > *:nth-child(3) { animation-delay: 0.4s; }
.hero__content > *:nth-child(4) { animation-delay: 0.55s; }
@keyframes hero-in { to { opacity: 1; transform: translateY(0); } }
```

---

## 14. Imágenes de Unsplash sin width/height fijos generan layout shift (CLS) en mobile
**Ubicación:** `js/render.js:17-36` + todo el sitio
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Medio · sobre performance / SEO / lujo perceptual
**Por qué:**
Estás cargando imágenes Unsplash sin parámetros de tamaño (`?w=800&q=80`) y sin `width/height` en el `<img>`. En mobile con conexión 4G/lenta:
- Las cards de producto **saltan** cuando carga la imagen (CLS).
- Cargás imágenes de 2000px+ para mostrarlas en 180px de ancho — desperdicio brutal de datos.

**Cómo:**
- Agregá parámetros Unsplash a las URLs en `products.js`:
```js
imagen: 'https://images.unsplash.com/photo-XXX?w=800&q=85&auto=format'
```
- Y en el render usá `srcset` para responsive:
```js
function img(src, alt) {
  const base = src.split('?')[0];
  return `<img
    src="${base}?w=600&q=80&auto=format"
    srcset="${base}?w=400&q=80&auto=format 400w, ${base}?w=800&q=80&auto=format 800w, ${base}?w=1200&q=80&auto=format 1200w"
    sizes="(max-width: 768px) 50vw, 25vw"
    alt="${alt}" loading="lazy" decoding="async">`;
}
```
- Bonus premium: **blur-up placeholder** (un base64 super chico de cada imagen mientras carga la real). En producción con CDN propio + LQIP esto es el patrón Mejuri/SSENSE clásico.

---

## 15. No hay focus-visible diferenciado — accesibilidad y navegación por teclado rotas
**Ubicación:** `css/style.css:53` (reset de `button`) + global
**Esfuerzo:** Quick win (15 min)
**Impacto:** Medio · sobre accesibilidad / WCAG
**Por qué:**
Estás reseteando `button { ... border: none; ... }` y no hay ningún `:focus-visible` definido. Una usuaria navegando con teclado (más común de lo que parece, sobre todo en escritorio para quien tiene problemas motrices) **no ve dónde está el foco**. Esto es WCAG 2.1 AA fail directo. Y para una marca "premium" la accesibilidad ES un statement de calidad.
**Cómo:**
```css
:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}
.header :focus-visible { outline-color: var(--color-bg); }
.btn:focus-visible { outline-offset: 4px; }
.producto__quick-add:focus-visible { outline-color: var(--color-bg); }
```
También: revisar contrastes. `--color-text-soft: #7A736B` sobre `--color-bg: #F7F5F0` da contraste de ~4.7:1 — pasa AA para texto normal pero **falla AAA**. En textos chicos (eyebrow 11px, beneficio__span 11px) eso es leíble pero al límite.

---

## 16. El logo "MoMar" como SVG con `<text>` se renderiza diferente en cada SO/font-fallback
**Ubicación:** `index.html:31-33` + replicado en cada page
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Medio · sobre lujo perceptual / consistencia de marca
**Por qué:**
Tu wordmark es **el activo más importante de la marca**. Lo estás renderizando como `<text>` dentro de un SVG que depende de que Cormorant Garamond ya esté cargada. En el primer paint (antes que carguen las fonts) el navegador renderiza con Georgia o el serif por defecto — el logo **se mueve y cambia de forma** ante los ojos del usuario. Es un detalle que mata el aire de marca premium.

Adicional: en el header, el logo tiene `letter-spacing: -0.5px` y el wordmark "MoMar" se ve **muy apretado**. En marcas como Mejuri/Aurate el wordmark respira con tracking generoso (+5 a +15% letter-spacing).
**Cómo:**
- **Convertir el wordmark a SVG con paths** (Illustrator / Figma → exportar texto a outlines). Pegar el SVG inline. Carga instantánea y siempre idéntica.
- Mientras tanto, quick fix: `font-display: swap` ya lo tenés implícito por Google Fonts, pero para el logo específicamente usá CSS variable + tracking más aireado:
```css
.logo-svg text {
  letter-spacing: 0.5px; /* respira */
  font-weight: 400; /* no 500 — más delicado */
}
```
- **Más importante todavía:** considerá pedirle a un diseñador 30 min de trabajo en el wordmark final (kerning manual entre M-o-M-a-r). Por el precio que vas a cobrar esto, vale.

---

## 17. Falta WhatsApp asomado contextual (joyería en PY = conversación → venta)
**Ubicación:** Global, falta totalmente
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Alto · sobre conversión (PY-específico)
**Por qué:**
En PY, para joyería de ticket alto (Gs 3M+) **la gente quiere preguntar antes**: "¿llega en oro 14k?", "¿puedo verlo antes de pagar?", "¿hacen grabado?". El sitio menciona WhatsApp en footer y topbar pero no tiene **botón asomado** contextual. Las clientas mayores especialmente NO van a buscar el contacto en el footer.

Patrón ideal:
- Botón flotante **abajo-derecha** en mobile (encima de safe-area, NO encima de la sticky bar de producto).
- En la ficha de producto, **además**, un link "Consultar por WhatsApp" debajo del precio que prellene el mensaje con el SKU y nombre.
**Cómo:**
```html
<a href="https://wa.me/595981234567?text=Hola%2C%20quisiera%20consultar%20por%20{nombre}%20(SKU%20{sku})" class="wa-float" aria-label="Consultar por WhatsApp">
  <svg>...</svg>
</a>
```
```css
.wa-float {
  position: fixed;
  bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
  right: var(--space-3);
  width: 52px; height: 52px;
  background: #25D366;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(15,15,15,0.2);
  z-index: 40; /* debajo del cart drawer pero arriba del contenido */
}
/* Si hay sticky-add-bar, levantarlo */
body:has(.sticky-add-bar) .wa-float { bottom: calc(88px + env(safe-area-inset-bottom)); }
```
En ficha de producto, link sobrio debajo del precio:
> ¿Dudas? **Consultá por WhatsApp** →

---

## 18. El admin dashboard tiene un emoji ⚠ y 💡 que rompen el tono del resto
**Ubicación:** `admin/index.html:36` y `admin/index.html:78`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Bajo · sobre lujo perceptual / consistencia
**Por qué:**
Todo el resto del admin es sobrio, geométrico, tipográfico. Los emojis ⚠ y 💡 son **lo único colorido** y se sienten como un plugin de Wordpress pegado. Para una herramienta que va a usar Martina (la dueña) todos los días, el tono debe ser de **panel de joyero**, no de plantilla genérica.
**Cómo:**
Reemplazar por SVG icons del mismo estilo monolineal que usás en el shopfront:
```html
<!-- Atención -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16v.5"/>
</svg>
<!-- Sugerencia -->
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12c1 1 1 2 1 4h6c0-2 0-3 1-4a7 7 0 0 0-4-12Z"/>
</svg>
```

---

## 19. La página de catálogo no muestra los filtros activos seleccionados (chips)
**Ubicación:** `catalogo.html:49-89`
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Medio · sobre conversión / UX
**Por qué:**
El usuario filtra por "Oro 18k" + "Anillos" + "Gs 1M-3M" y los checks quedan adentro del aside (en mobile, oculto detrás de un drawer). No ve **qué filtros tiene puestos** desde la grilla. Patrón ideal: chips arriba de la grilla con "Anillos ×  Oro 18k ×  Gs 1-3M ×  Limpiar todo".
**Cómo:**
```html
<div class="filtros-activos js-filtros-activos">
  <span class="chip">Anillos <button>×</button></span>
  <span class="chip">Oro 18k <button>×</button></span>
  <button class="chip chip--clear">Limpiar todo</button>
</div>
```
```css
.filtros-activos {
  display: flex; flex-wrap: wrap; gap: var(--space-2);
  margin-bottom: var(--space-3);
  min-height: 32px; /* reserva espacio aunque esté vacío */
}
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--color-line);
  font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
}
.chip button { font-size: 14px; opacity: 0.5; }
.chip--clear { border: none; text-decoration: underline; }
```

---

## 20. Falta "ver dimensiones reales / talles" para anillos (clave en joyería)
**Ubicación:** `producto.html` (entre variantes y atributos)
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Alto · sobre conversión / devoluciones evitadas
**Por qué:**
Para anillos en e-commerce, **el #1 motivo de devolución es el talle equivocado**. Cuyana, Mejuri, Catbird tienen todas un link "¿Cómo medir mi talle?" que abre un modal con:
- Tabla talle PY/US/MM
- Instrucción visual de medir con hilo
- Opción de "te enviamos un medidor de talles gratis"

Sin esto, la clienta no compra (incertidumbre) o compra mal y pide cambio (costo logístico).

También para joyería en general: una **escala humana** ("el anillo mide 8mm de ancho · se ve así en mano") con una foto del producto puesto en mano es **el secreto** de la conversión Mejuri.
**Cómo:**
En la ficha, cerca del selector de variantes:
```html
<button class="link-discreto js-open-talles">¿Cómo medir mi talle? →</button>
```
Modal con tabla simple + dibujo + opción "Pedí un medidor gratis por WhatsApp".

Y en el atributo de tamaño, agregar la conversión:
> Diámetro interno: 18 mm (talle 14 PY · 8 US)

Si tenés tiempo: una foto extra en la galería con la pieza puesta (anillo en mano, collar en cuello, aros en oreja). NO es genérico — es **el activo más importante de la galería** y vale más que 5 fotos editoriales del producto suelto.

---

## 21. Newsletter form sin estado de éxito real ni validación visual
**Ubicación:** `index.html:122-125`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Bajo · sobre confianza / detalle premium
**Por qué:**
El form usa `onsubmit="event.preventDefault(); alert('¡Suscripción registrada!');"`. Un alert nativo del navegador rompe **todo el aire premium** que construiste con tipografías Cormorant. Y el campo email no se limpia ni hay confirmación inline elegante.
**Cómo:**
Quick win: reemplazar alert por mensaje inline + toast del mismo estilo del toast del carrito:
```js
form.addEventListener('submit', e => {
  e.preventDefault();
  const email = form.querySelector('input').value;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { /* mostrar error inline */ return; }
  form.innerHTML = `<p class="newsletter__success">Gracias. Te escribimos pronto con acceso al 10%.</p>`;
});
```
```css
.newsletter__success {
  font-family: var(--font-display);
  font-style: italic; font-size: 20px;
  color: var(--color-text);
}
```

---

## 22. Falta sección de confianza para joyería online (certificados, showroom, devoluciones)
**Ubicación:** Falta en `index.html` (entre destacados y newsletter sería ideal) y en `producto.html`
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Alto · sobre confianza / conversión
**Por qué:**
Una clienta nueva que gasta Gs 3-8M en oro online por primera vez tiene **3 miedos concretos**:
1. "¿Es oro de verdad?"
2. "¿Y si no me gusta cuando lo veo?"
3. "¿Existe la tienda en serio? ¿Hay showroom?"

Hoy tenés "Garantía de por vida" en una línea de beneficios al final del home, pero falta:
- **Certificado de autenticidad** mencionado explícitamente con la imagen del certificado real.
- **Política de cambios visible** ("15 días para cambiar, retiro en showroom gratis").
- **Foto real del showroom** con dirección + Google Maps embed.
- **Reseñas de clientas reales** (3-4 testimonios cortos con foto/nombre/IG handle).

**Cómo:**
Agregar entre destacados y promo banner:
```html
<section class="confianza section--alt">
  <div class="container">
    <div class="confianza-grid">
      <div class="confianza-item">
        <img src="cert.jpg" alt="Certificado de autenticidad MoMar">
        <h3>Certificado en cada pieza</h3>
        <p>Cada joya viene con certificado de autenticidad numerado en oro 18k contrastado.</p>
      </div>
      <div class="confianza-item">
        <img src="showroom.jpg" alt="Showroom MoMar Asunción">
        <h3>Vení a conocernos</h3>
        <p>Showroom en Av. España 1234, Asunción. Lun-Sáb 10-18 hs · con cita previa.</p>
        <a href="#mapa">Ver en mapa →</a>
      </div>
      <div class="confianza-item">
        <h3>Cambios sin costo</h3>
        <p>15 días para cambiar o devolver. Retiro a domicilio gratis en Asunción.</p>
      </div>
    </div>
  </div>
</section>
```
Y reseñas de clientas en la página de producto, debajo de atributos.

---

## Patrón sistémico detectado: HEADERS y FOOTERS duplicados en cada HTML

Cada uno de los 5 HTML públicos repite ~30 líneas idénticas de header, ~20 de footer, ~15 de cart drawer, ~10 de mobile menu. Cualquier cambio (ej: agregar item al menú, cambiar texto de topbar, agregar WhatsApp asomado) hay que hacerlo **5 veces**, con alto riesgo de inconsistencia. Y el admin tiene su propio shell.js (`MOMAR_renderAdminShell`) que es exactamente el patrón correcto.

**Recomendación:** crear `js/shell.js` con dos funciones:
- `MOMAR_renderHeader()` que pinta `<header>`, `<aside.mobile-menu>` y `<aside.cart-drawer>`.
- `MOMAR_renderFooter()` que pinta `<footer>`.

Y dejar en cada HTML solo:
```html
<div data-shell="header"></div>
<!-- contenido único de la página -->
<div data-shell="footer"></div>
```

Esto es **lo primero que rediseñaría a fondo** antes de meter funcionalidades nuevas. Te ahorra horas y previene bugs.

---

## Patrón sistémico detectado #2: Estilos inline pegados en HTML

Hay decenas de `style="..."` inline en los HTML (sobre todo en admin/index.html). Cosas como `style="font-size: 13px; opacity: 0.85; line-height: 1.6;"`. Esto:
- Imposibilita responsive serio (no podés tener un estilo distinto en mobile).
- Mata la mantenibilidad.
- Hace que cualquier override desde CSS necesite `!important`.

**Recomendación:** crear utility classes (`.text-sm`, `.text-soft`, `.mt-3`, `.flex-col`) o componentizar. Es un trabajo de medio día pero te ordena el código antes que crezca.

---

## Resumen de prioridades (cheat sheet)

| # | Mejora | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | Badge carrito posicionado correcto en mobile | Quick win | Alto |
| 3 | Sticky bar respetando safe-area iPhone | Quick win | Alto |
| 7 | Sacar quick-add en mobile | Quick win | Alto |
| 8 | Stock bajo / "Última disponible" en ficha | Mediana | Alto |
| 11 | Validación inline + auto-formato CI en checkout | Mediana | Alto |
| 17 | WhatsApp asomado contextual | Mediana | Alto |
| 20 | Guía de talles + escala humana en producto | Mediana | Alto |
| 22 | Sección de confianza (certificado, showroom, reseñas) | Mediana | Alto |
| 9 | Galería mobile swipe horizontal | Quick win → Grande | Alto |
| 10 | Checkout en accordion / multi-step | Grande | Alto |
| 13 | Hero anclado abajo-izquierda + fade-up | Mediana | Alto |
| 5 | Microinteracciones bump del carrito | Mediana | Alto |
| 14 | Sizing real de imágenes + srcset | Mediana | Medio |
| 19 | Chips de filtros activos | Mediana | Medio |
| 4 | Drawer 92% en mobile + blur | Quick win | Medio |
| 6 | Min-height de nombre de producto en grilla | Quick win | Medio |
| 2 | Cantidad editable real en producto | Mediana | Medio |
| 12 | Toast "tenés piezas guardadas" | Quick win | Medio |
| 15 | Focus-visible accesible | Quick win | Medio |
| 16 | Wordmark como SVG outline | Mediana | Medio |
| 18 | Sacar emojis del admin | Quick win | Bajo |
| 21 | Newsletter sin alert nativo | Quick win | Bajo |
