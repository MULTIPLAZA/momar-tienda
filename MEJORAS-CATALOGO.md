# MoMar · Análisis crítico del CATÁLOGO con productos reales

> Auditoría profunda de `catalogo.html` + `producto.html` con la base **viva** de 79 productos (46 anillos + 33 collares + 2 ocultos). Hecho el 16/may/2026, después de la primera tanda `MEJORAS-UX.md`.
>
> **NO repite cosas ya aplicadas** (chips activos, focus-visible, sticky bar safe-area, WhatsApp float, quick-add OFF en mobile, stock-alert en ficha, galería swipe mobile, modal de talles, srcset Unsplash, etc.).
>
> Foco: lo que **se rompe ahora** cuando entran 79 productos legacy con nombres tipo "Chocker FF 5043" y casi todos los campos descriptivos en `null`.

---

## Diagnóstico inicial (lo que la data real revela)

Antes de las mejoras, dejá leído este resumen de lo que vi en la API. Es lo que enmarca todo:

| Hallazgo | Magnitud | Impacto |
|---|---|---|
| **`material` es `null` en 78 de 79 productos** | 98% | Eyebrow "Anillos · " queda con un punto colgando feo + filtro lateral de "Material" no filtra nada |
| **`descripcion_larga` = `nombre`** en 78 de 79 | 98% | Ficha de producto muestra "Choker Fiesta 1790" como párrafo descriptivo. Ridículo en premium |
| **`peso_gr`, `origen`, `dimensiones` = `null`** en 78 de 79 | 98% | Sección de atributos queda **vacía** en la ficha (HTML render no la muestra, pero el slot está) |
| **Nombres con sufijos legacy** ("RFF", "KPB 6", "CXB", "C 4889", "# 117", "Ox2") | ~50 productos | Mata aire de marca. La clienta ve "Anillo C 4889" donde Mejuri tendría "The Stacking Trio" |
| **Categorías reales**: solo `anillos` (46) y `collares` (33) | 100% | Filtro lateral muestra **aros, pulseras, hogar** que no existen → 0 resultados al tildar |
| **Stock real bajo**: 32 productos son pieza única (`es_unica=true` o `stock=1`) | 40% | Es el **mejor activo de conversión** y casi no se está comunicando en la card |
| **Precio máximo real: Gs 530.000** (en los productos que vi) | — | El filtro de precios **"3-6M"** y **"+6M"** quedan vacíos. La escala está mal |
| **Fotos extras: 32 productos** con galería real | 40% | El resto solo tiene `main.jpeg` → galería de ficha repite la misma 4 veces |
| **El demo `AN-001 "Solitario Luna"`** sigue en la lista (mock, sin foto en Storage) | 1 producto | Aparece con placeholder y rompe el feed |

Con eso fijado, las 16 mejoras que siguen están **ordenadas por urgencia operativa**, no por número arbitrario.

---

## 1 · El eyebrow de la card muestra punto colgando: "Anillos · "

**Ubicación:** `js/render.js:59` — `<div class="producto__cat">${p.cat} · ${p.material}</div>`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Alto · sobre lujo perceptual (78/79 cards afectadas)

**Por qué:**
Como el 98% de los productos tiene `material: null`, el mapper en `supabase-data.js:55` devuelve `material: ''`. Entonces cada card renderiza el eyebrow así:

```
ANILLOS ·
```

Con el separador punto-medio colgando al final, sin nada después. Es **el detalle más antipremium** del catálogo ahora mismo. Lo vas a ver replicado en 78 cards en la grilla.

**Cómo:**
```js
// render.js, productCard()
const eyebrow = [p.cat, p.material].filter(Boolean).join(' · ');
// ...
<div class="producto__cat">${eyebrow}</div>
```
Y lo mismo en `renderFicha()` línea 198 con el eyebrow grande. Mientras no haya material, mostrá solo la categoría.

Bonus: cuando SÍ haya material (caso `Solitario Luna`), dejá solo el material y suprimí la categoría (que ya está en el breadcrumb). Eyebrow `ORO AMARILLO 18K` luce más editorial que `ANILLOS · ORO AMARILLO 18K`.

---

## 2 · Los nombres legacy ("Chocker FF 5043", "Anillo C 4889") rompen el aire de marca

**Ubicación:** `js/supabase-data.js:52` (`mapProducto`) + Supabase columna `nombre_publico` (nueva).
**Esfuerzo:** Quick win (15 min frontend) + Mediana (1-2 hs de limpieza de data)
**Impacto:** Alto · sobre lujo perceptual / conversión

**Por qué:**
Mirá lo que ve la clienta cuando entra al catálogo hoy:
- "Anillos brillo KPB 3"
- "Choker dije 3 cuadros # 45 RFF"
- "Cadena UG 4209"
- "Anillo entorchado # 9 RFF"

Eso son **códigos del inventario interno**, no nombres de producto premium. Mejuri llamaría a esos "The Brillo Stacker", "Three Square Choker", "Twisted Band". El sufijo "KPB 3", "RFF", "CXB" es **referencia de proveedor/serie** que la clienta no tiene por qué ver.

**Cómo:**
- **Quick win frontend:** función `limpiarNombre()` en el mapper que esconde sufijos conocidos:
```js
function limpiarNombre(n) {
  return (n || '')
    .replace(/\s*#\s*\d+/g, '')           // " # 45", "# 117"
    .replace(/\s+(RFF|KPB|CXB|FF|UG|Ox2|CM)\s*\d*\s*$/gi, '') // sufijos
    .replace(/\s+\d{3,4}\s*$/g, '')       // " 4889", " 5043" finales
    .replace(/\s+\(\d+\)\s*$/g, '')       // " (1)", " (3)"
    .trim();
}
// en mapProducto:
nombre: limpiarNombre(p.nombre),
```
Eso te convierte "Choker dije 3 cuadros # 45 RFF" en "Choker dije 3 cuadros". No es brillante pero ya **respira**.

- **Mejor (mediana):** agregar columna `nombre_publico` en `productos` y curar a mano. Tarea de 1-2 horas con Martina mirando producto por producto. Ese curado es **el activo más importante** de los próximos 30 días.
- **Mientras tanto** dejá el SKU **fuera de la vista** (no se renderiza en card, perfecto) pero accesible vía `data-sku` y en la ficha en chiquito (texto soft) para que Martina pueda comunicarlo por WhatsApp si hace falta.

---

## 3 · Filtros laterales con opciones que retornan CERO resultados

**Ubicación:** `catalogo.html:36-48` (aros, pulseras, hogar, todos los materiales, rangos de precio altos)
**Esfuerzo:** Quick win (15 min hide) + Mediana (1-2 hs render dinámico con counts)
**Impacto:** Alto · sobre conversión / mobile UX

**Por qué:**
Hoy el aside muestra hard-coded:
- Categorías: anillos, collares, **aros, pulseras, hogar** ← estas 3 no existen
- Materiales: oro 18k, oro blanco, plata 925, baño de oro, mármol ← **NINGUNA matchea** porque `material=null`
- Precios: hasta 1M, 1-3M, **3-6M, +6M** ← los últimos dos vacíos (máx real ≈ 530k entre los 30 que vi, hasta ~5.2M en la base global)

El usuario tilda "Oro 18k" y la grilla queda **vacía**. Tildea "Pulseras" y aparece "No encontramos piezas". Es un patrón roto: **el usuario te pide algo y le decís que no tenés nada**. La sensación es "esta tienda no funciona".

**Cómo:**
- **Quick win:** ocultar las opciones que no tengan al menos 1 match — render dinámico del aside:
```js
function buildFiltros() {
  const all = window.MOMAR_PRODUCTS || [];
  const counts = {
    categoria: {},
    material: {},
    precio: { '0-1000000': 0, '1000000-3000000': 0, '3000000-6000000': 0, '6000000-': 0 },
    disponibilidad: { stock: 0, unica: 0, oferta: 0 },
  };
  all.forEach(p => {
    counts.categoria[p.cat_slug] = (counts.categoria[p.cat_slug] || 0) + 1;
    if (p.material) {
      const key = p.material.toLowerCase();
      counts.material[key] = (counts.material[key] || 0) + 1;
    }
    // rangos precio...
    if (p.stock > 0) counts.disponibilidad.stock++;
    if (p.es_unica) counts.disponibilidad.unica++;
    if (p.precio_antes) counts.disponibilidad.oferta++;
  });
  return counts;
}
```
Y al render del aside:
```html
<label><input type="checkbox" value="anillos"> Anillos <span class="filtro-count">(46)</span></label>
```
**Si count = 0, esconder la opción entera.** No la dejes muda.

- **Bonus premium:** todo el grupo "Material" desaparece hasta que tengas al menos 5 productos con material cargado. Y `filtro-count` con estilo `font-size: 11px; color: var(--color-text-soft); margin-left: 4px;`. Lujo perceptual sutil pero medible.

---

## 4 · Filtros laterales: faltan los que la clienta REALMENTE usa para joyería

**Ubicación:** `catalogo.html:32-63` (estructura de grupos)
**Esfuerzo:** Mediana (1-2 hs · cambio de modelo + render dinámico)
**Impacto:** Alto · sobre conversión / categorización útil

**Por qué:**
Los filtros que tenés (categoría + material + precio + disponibilidad) son **filtros de e-commerce genérico**. Para joyería, los filtros de Mejuri/Catbird/Aurate que mueven la aguja son:

| Filtro premium real | Por qué importa | Estado en MoMar |
|---|---|---|
| **Tipo de pieza** dentro de categoría (anillo de banda, solitario, cocktail; choker, gargantilla, sautoir) | Clienta llega buscando "choker" no "collar" | NO está |
| **Ocasión** (cotidiano, evento, regalo, novia) | Filtro psicológico clave en joyería | NO está |
| **Tono/color** (dorado, plateado, mix, perla, rojo, verde) | Filtro visual #1 después de categoría | NO está |
| **Precio** | OK pero rangos muy escalonados para el catálogo real | Rangos malos |
| **Estado/inventario** (pieza única, novedad, en oferta) | OK | Tenés |
| **Talle** (solo en anillos, condicional) | Crítico — evita devoluciones | NO está |

**Cómo:**
- Agregar columnas en `productos`: `tipo` (taxonomía dentro de categoría), `ocasion` (array), `tono` (array). Tienen que ser **derivadas semiautomáticamente** del nombre legacy y curadas:
  - "Choker" → tipo=choker; ocasión=fiesta/regalo; tono según foto
  - "Anillo solitario" → tipo=solitario; ocasión=novia/regalo
- En el aside, los grupos `Tipo`, `Ocasión`, `Tono` aparecen **solo si la categoría seleccionada tiene esos campos** (filtros contextuales — Mejuri lo hace así).
- Rangos de precio adaptados al catálogo real: hasta 300k, 300-600k, 600k-1.5M, 1.5-3M, +3M (cubre la distribución que veo en la data).

**Si el esfuerzo asusta**, este es exactamente el tipo de cosa que se hace **mejor con Martina al lado** en 1 hora: "decime cuántas categorías quirúrgicas necesitás" → la clienta tipea menos y compra más.

---

## 5 · La ficha de producto repite la MISMA foto 4 veces en la galería

**Ubicación:** `js/render.js:218` — `const imgs = p.imagenes || [p.imagen, p.imagen, p.imagen, p.imagen]`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Alto · sobre lujo perceptual / conversión

**Por qué:**
Para los 47 productos que tienen solo `main.jpeg`, el fallback es **repetir la misma foto 4 veces**. El usuario hace click en thumb 2 y... no pasa nada. Cliquea thumb 3 y... lo mismo. La galería **anuncia que hay más** y luego no entrega. Es peor que mostrar una sola foto grande.

Además, en mobile con swipe horizontal, **arrastrás y la foto siguiente es idéntica** — la transición se ve fea porque parece bug, no diseño.

**Cómo:**
```js
const imgs = (p.imagenes && p.imagenes.length > 1) ? p.imagenes : [p.imagen];
// y los thumbs solo se renderizan si imgs.length > 1
if (thumbs && imgs.length > 1) {
  thumbs.innerHTML = imgs.map(...).join('');
} else if (thumbs) {
  thumbs.remove(); // o thumbs.style.display = 'none';
}
// y los dots tampoco se muestran con 1 sola foto
```

**Bonus premium:** cuando hay solo 1 foto, agrandar `galeria__principal` un poco (de aspect 1/1 a aspect 4/5 que es la proporción Mejuri/Aurate clásica para joyería de moda). Y agregar `padding` extra alrededor para que respire. La pieza sola, grande, sin distracción, es más Mejuri que 4 thumbnails repetidos.

---

## 6 · La ficha muestra "Cargando…" como descripción real porque `descripcion = nombre`

**Ubicación:** `js/supabase-data.js:64` + `producto.html:32`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Alto · sobre conversión / lujo perceptual

**Por qué:**
Como el mapper hace `descripcion: p.descripcion_larga || p.descripcion_corta || p.nombre`, y los tres son iguales para 78 productos, la clienta entra a la ficha de "Choker FF 5043" y debajo del precio lee:

> Choker FF 5043

Como si fuera un texto descriptivo. **Es lo mismo dos veces**. Tres si contás el `<title>`.

Hoy el bloque `.descripcion` en `producto-info` ocupa lugar premium en la página y comunica… nada. El usuario lee y queda con la sensación "no me dicen nada de esto, no entiendo qué estoy comprando".

**Cómo:**
- En el mapper, **solo asignar descripción si es realmente distinta del nombre**:
```js
const descRica = p.descripcion_larga && p.descripcion_larga !== p.nombre
  ? p.descripcion_larga
  : null;
// ...
descripcion: descRica,
```
- En `renderFicha()`:
```js
const descEl = document.querySelector('.js-prod-descripcion');
if (descEl) {
  if (p.descripcion) {
    descEl.textContent = p.descripcion;
  } else {
    // Fallback editorial genérico por categoría
    descEl.innerHTML = `<em>Pieza ${p.cat.toLowerCase()} de la colección actual. Consultanos por características, peso y disponibilidad — te respondemos por WhatsApp.</em>`;
    descEl.classList.add('descripcion--placeholder');
  }
}
```
```css
.descripcion--placeholder {
  color: var(--color-text-soft);
  font-style: italic;
  border-left: 1px solid var(--color-line);
  padding-left: var(--space-3);
}
```

Esto **no miente, no inventa, pero deja el espacio elegante** mientras Martina carga las descripciones reales. Y al final del placeholder, link directo a consultar por WhatsApp (que ya tenés).

**Bonus:** generador de descripciones con IA por lote. Le pasás a Claude el nombre + categoría + foto + precio y te devuelve 2-3 líneas editoriales. 79 productos × 30 segundos = 40 min de curado. Lo dejaría para sprint 2.

---

## 7 · El bloque de "atributos" en la ficha queda VACÍO (sin material, sin peso, sin nada)

**Ubicación:** `producto.html:56` + `js/render.js:261-266`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Medio · sobre conversión / lujo perceptual

**Por qué:**
El render hace `Object.entries(p.atributos).map(...)` y si el objeto está vacío (caso 78/79), **no renderiza nada pero el slot queda con el `margin-top: var(--space-5)`** que separa visualmente del resto. Queda un hueco blanco raro entre el botón "Agregar" y los "Beneficios".

Y para una pieza de Gs 500k, la clienta **necesita una tabla técnica**: material, peso, dimensiones, talle. Sin eso, no genera confianza para comprar online.

**Cómo:**
1. **Si está vacío, ocultar el contenedor:**
```js
if (attrs) {
  const entries = Object.entries(p.atributos || {});
  if (entries.length === 0) {
    attrs.style.display = 'none';
  } else {
    attrs.innerHTML = entries.map(...).join('');
  }
}
```
2. **Mientras no hay datos, mostrar un fallback editorial:** "Detalles técnicos disponibles a pedido" con link a WhatsApp que prellena "Hola, quisiera ver el detalle técnico de [producto]".
3. **A más largo plazo:** carga rápida de atributos por categoría — anillo siempre lleva (material, peso, ancho de banda, talle); collar siempre lleva (material, largo, cierre, peso). Hacé un wizard de carga en el admin para que Martina tarde 30 segundos por producto.

---

## 8 · El select de "destacados" no destaca nada — no hay lógica de ranking real

**Ubicación:** `js/render.js:148-152`
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Medio · sobre conversión / curadora editorial

**Por qué:**
"Destacados" hoy = orden por `created_at DESC` que ya viene de Supabase. O sea, **lo más nuevo primero**. La opción `nuevos` del select hace **exactamente lo mismo**. Son dos botones que hacen lo idéntico.

Además, la grilla mezcla anillos y collares **al azar cronológico**, así que ves: anillo, collar, anillo, anillo, collar, anillo… sin agrupación visual. Eso rompe ritmo (problema #11 más abajo).

Lo que la clienta espera de "Destacados" en una tienda premium:
1. Piezas únicas / agotándose primero (urgencia)
2. Las que tienen galería rica (mejor presentación → mejor conversión)
3. Precio medio o alto (no las de Gs 150k arriba — comunica "tenemos buenas piezas")

**Cómo:**
Una función `score()` simple que ordena por:
```js
function scoreDestacados(p) {
  let s = 0;
  if (p.es_unica) s += 100;
  if (p.imagenes && p.imagenes.length >= 3) s += 30; // galería rica
  if (p.precio_antes) s += 50; // oferta
  if (p.stock > 0 && p.stock <= 3) s += 25; // urgencia sutil
  if (p.precio > 1000000) s += 20; // ticket medio-alto
  // Anti-pattern: penalizar si el nombre es 100% legacy
  if (/^[A-Z]+\s+\w+\s+\d{3,4}/i.test(p.nombre)) s -= 30;
  return s;
}
// Y en el render:
if (orden === 'destacados') list.sort((a, b) => scoreDestacados(b) - scoreDestacados(a));
```

Cambiar la etiqueta del primer option a "Sugeridos" o "Selección MoMar" (más editorial que "Destacados").

Y agregar **2 opciones nuevas** al select:
```html
<option value="unicas">Piezas únicas primero</option>
<option value="precio-medio">Mejor relación precio</option>
```
Y/o **un toggle separado** "Solo piezas únicas" arriba de la grilla (visual, no escondido en aside). Es el filtro #1 emocional de la categoría.

---

## 9 · 79 productos en una sola página → CARGA LENTA + sin escala visual + scroll infinito

**Ubicación:** `catalogo.html:84` + `js/render.js:99-160`
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Medio · sobre performance / mobile UX / SEO

**Por qué:**
Hoy se renderizan **los 79 productos en el primer paint**, todos con `<img>`. Eso son 79 requests de imagen (con `loading="lazy"` mitigás algo pero solo en lo que está fuera del viewport). En mobile 4G PY, el FCP se va a ~2.5s con bandera.

El botón "Cargar más" del HTML **no hace nada** — está hard-coded sin handler. Genera **falsa promesa**: el usuario ve el botón y piensa "¿hay más cosas además de estos 79?" cuando ya están todos visibles.

A futuro con 200+ productos esto se vuelve insostenible.

**Cómo:**
Paginación virtual por scroll (NO clicks, no botones — patrón Mejuri/Aurate):

```js
let visibleCount = 24; // primer paint solo 24 cards
function renderPage() {
  catalogo.innerHTML = list.slice(0, visibleCount).map(productCard).join('');
  // ... contador y "Mostrando 24 de 79"
}

// IntersectionObserver en el último elemento o un sentinel
const sentinel = document.querySelector('.js-grid-sentinel');
const io = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && visibleCount < list.length) {
    visibleCount += 24;
    renderPage();
  }
});
io.observe(sentinel);
```

Y **sacar el botón "Cargar más"** o convertirlo en fallback accesible (visible solo si `prefers-reduced-motion` o sin JS).

**Cambiar el texto del contador:**
- Hoy: `79 productos`
- Mejor: `Mostrando 24 de 79 piezas` (transparencia de scroll virtual)

**Bonus performance:**
- Imagen del primer card con `fetchpriority="high"` (LCP del catálogo).
- `loading="eager"` en los primeros 4 (visibles en viewport mobile) y `loading="lazy"` en el resto.

---

## 10 · La grilla mezcla anillos y collares sin agrupación → ritmo visual roto

**Ubicación:** `js/render.js:99-160` (función `MOMAR_renderCatalogo`)
**Esfuerzo:** Mediana (1-2 hs) o Quick win (15 min) según versión
**Impacto:** Medio · sobre lujo perceptual / orientación

**Por qué:**
46 anillos + 33 collares en orden cronológico mezclado. Lo que ve la usuaria:

```
[collar] [anillo] [anillo] [collar]
[anillo] [collar] [anillo] [anillo]
[collar] [anillo] [collar] [anillo]
...
```

Aparte de los filtros, **no hay agrupación visual**. Un cliente que entra a buscar "algo lindo" no sabe que también tenés collares hasta que scrollea. Las piezas no se **agrupan en colecciones visuales** — fundamental en e-commerce premium.

**Cómo:**
- **Quick win (15 min):** ordenamiento por categoría como tie-breaker al orden actual:
```js
list.sort((a, b) => {
  if (a.cat_slug !== b.cat_slug) return a.cat_slug.localeCompare(b.cat_slug);
  return scoreDestacados(b) - scoreDestacados(a);
});
```
Al menos quedan agrupados por sección.

- **Mediana (1-2 hs):** modo "Agrupado por categoría" como una **toggle** en la toolbar:
```
[ Cuadrícula | Agrupado ]
```
En modo agrupado, render cada categoría como un sub-bloque con header:
```html
<h2 class="catalogo-subhead">Anillos <span>(46)</span></h2>
<div class="productos">...</div>
<h2 class="catalogo-subhead">Collares <span>(33)</span></h2>
<div class="productos">...</div>
```
Estilo del header igual al `eyebrow + h2 italic` que usás en home. Eso ya es **editorial premium puro**.

- **Bonus:** una "selección curada del mes" (4-6 piezas top) **anclada arriba** de la grilla. Es la patada premium — "Selección curada para mayo" con tipografía italic + 4-6 cards más grandes. Después abajo "Todo el catálogo (79)".

---

## 11 · El demo `AN-001 "Solitario Luna"` está rompiendo la grilla con placeholder

**Ubicación:** Base de datos Supabase (`productos.sku = AN-001`)
**Esfuerzo:** Quick win (5 min DB)
**Impacto:** Alto · sobre lujo perceptual

**Por qué:**
El producto demo no tiene fotos en Storage (`producto_fotos: []`) y como bandera tiene `material: "Oro amarillo 18k"` que es el ÚNICO con material → en el filtro Material > Oro 18k aparece **solo él**. Y al click en la card aparece **placeholder Unsplash genérico** que la clienta detecta a 10 metros como stock photo.

**Cómo:**
- Lo más rápido: `UPDATE productos SET estado = 'borrador' WHERE sku = 'AN-001';` y listo. Sale del catálogo.
- O dejarlo en `estado = 'borrador'` desde el admin (botón).
- Bonus: revisar si hay otros productos en `estado='publicado'` sin foto. Una query simple:
```sql
SELECT sku, nombre FROM productos p
WHERE estado='publicado'
  AND NOT EXISTS (SELECT 1 FROM producto_fotos f WHERE f.producto_id = p.id);
```

---

## 12 · El badge "Pieza única" se pinta DOBLE en mobile (card + ficha)… pero NO en la card grande

**Ubicación:** `js/render.js:6` + `js/render.js:46-65` (productCard)
**Esfuerzo:** Quick win (15 min)
**Impacto:** Alto · sobre conversión (38 piezas únicas en el catálogo)

**Por qué:**
Estoy mirando la card y `badgeHtml(p.badge)` se renderiza arriba-izquierda con texto **"Único"** en mayúsculas dentro de un fondo negro chiquitito. Pero **NO comunica urgencia ni unicidad** — parece una etiqueta de categoría más.

Comparado con Mejuri/Catbird donde "Last one" o "1 of 1" usa:
- Tipografía italic / serif (no caps)
- Color borgoña o gris piedra (no negro)
- Posición sutil (bottom-left, no top-left)
- Tamaño suficientemente grande para leerse en mobile

Y el sticker negro top-left compite con la foto. Sobre fotos oscuras (joyas en fondo negro) **desaparece** porque el badge ES negro.

**Cómo:**
Estilo redefinido para `producto__badge--unique`:
```css
.producto__badge--unique {
  background: rgba(247, 245, 240, 0.92); /* color-bg con leve transparencia */
  color: var(--color-text);
  font-family: var(--font-display);
  font-style: italic;
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
  border: 1px solid var(--color-line);
  backdrop-filter: blur(4px);
}
```
Y cambiar el texto:
```js
if (badge === 'unique') return '<span class="producto__badge producto__badge--unique">Pieza única</span>';
```
Ya que tenés data, podés afinar:
```js
if (p.es_unica) return '<span class="producto__badge producto__badge--unique">Pieza única</span>';
if (p.stock === 1 && !p.es_unica) return '<span class="producto__badge producto__badge--last">Última</span>';
if (p.stock <= 3 && p.stock > 1) return `<span class="producto__badge producto__badge--low">Quedan ${p.stock}</span>`;
```
Ese badge "Última" / "Quedan 3" en card es **el #1 driver de conversión** en joyería pieza única. Acordate que tenés 32+ productos con stock ≤ 3.

---

## 13 · Toolbar/contador desaparece visualmente al lado del select (jerarquía rota)

**Ubicación:** `catalogo.html:67-76` + `css/style.css:839-855`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Medio · sobre lujo perceptual

**Por qué:**
La toolbar hoy es:
```
[Filtros]    79 productos    [Ordenar: Destacados ▼]
```
Las 3 piezas tienen pesos visuales similares — todo gris, todo borders finos. La pieza más importante es **"79 productos"** (es el contador, te dice si filtraste bien) pero queda **suelta en el medio** sin jerarquía.

En Mejuri/Aurate la toolbar es:
```
46 PIEZAS                              [Ordenar ▾]
```
- Contador a la izquierda, **mayúsculas + letterspacing** estilo eyebrow.
- Select a la derecha.
- En mobile el botón Filtros sí va arriba, separado.

**Cómo:**
```html
<div class="toolbar">
  <span class="toolbar__count js-catalogo-count">79 piezas</span>
  <div class="toolbar__right">
    <button class="toolbar__filter-btn">Filtros</button>
    <select class="js-orden">…</select>
  </div>
</div>
```
```css
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-line);
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-4);
}
.toolbar__count {
  font-size: 11px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--color-text);
}
.toolbar__right {
  display: flex; gap: var(--space-3); align-items: center;
}
```

Y cambiá el texto:
- Hoy: `79 productos`
- Mejor: `79 piezas` (más boutique, menos e-commerce)

---

## 14 · No hay breadcrumb dinámico ni `<title>` de ficha con el nombre real

**Ubicación:** `producto.html:7` (`<title>Producto · MoMar</title>`) + `js/render.js:309-311`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Medio · sobre SEO / share / pestañas del navegador

**Por qué:**
- El `<title>` queda en **"Producto · MoMar"** para los 79 productos. Si la clienta abre 3 pestañas, no sabe cuál es cuál.
- Cuando comparte el link por WhatsApp, el preview también dice "Producto · MoMar".
- Google indexa todas las páginas con el mismo título → SEO desastre (penalización por contenido duplicado en titles).

Lo mismo con `<meta description>`, `<meta og:title>`, `<meta og:image>`.

**Cómo:**
En `renderFicha()`:
```js
document.title = `${p.nombre} · MoMar`;

// Y crear/actualizar meta og dinámicas
function setMeta(name, content) {
  let m = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
  if (!m) {
    m = document.createElement('meta');
    if (name.startsWith('og:')) m.setAttribute('property', name);
    else m.setAttribute('name', name);
    document.head.appendChild(m);
  }
  m.setAttribute('content', content);
}
setMeta('description', p.descripcion?.slice(0, 155) || `${p.nombre} de MoMar — ${window.MOMAR_fmtGs(p.precio)}`);
setMeta('og:title', `${p.nombre} · MoMar`);
setMeta('og:description', p.descripcion?.slice(0, 155) || `${p.cat} en MoMar`);
setMeta('og:image', p.imagen);
setMeta('og:url', location.href);
setMeta('og:type', 'product');
```

**Más impacto SEO todavía:** structured data JSON-LD `Product` schema embebido en cada ficha:
```js
const productLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": p.nombre,
  "image": p.imagenes,
  "description": p.descripcion,
  "sku": p.sku,
  "offers": {
    "@type": "Offer",
    "price": p.precio,
    "priceCurrency": "PYG",
    "availability": p.stock > 0 ? "InStock" : "OutOfStock"
  }
};
document.head.insertAdjacentHTML('beforeend',
  `<script type="application/ld+json">${JSON.stringify(productLd)}</script>`
);
```
Eso te da rich snippets en Google (precio, stock, foto) — diferencial de **percepción de marca seria** en SERP.

**Mismo trato para `catalogo.html`:**
```js
document.title = filterCatUrl
  ? `${capitalize(filterCatUrl)} · MoMar` // "Anillos · MoMar"
  : 'Catálogo · MoMar';
```
Y si hay `?q=choker`: `document.title = 'Búsqueda: choker · MoMar';`

---

## 15 · URLs no son friendly — `?sku=00696` no comunica nada

**Ubicación:** `producto.html` URL pattern global
**Esfuerzo:** Grande (medio día+) — requiere Cloudflare Pages routing
**Impacto:** Medio · sobre SEO / share por WhatsApp / lujo perceptual

**Por qué:**
La URL hoy es `/producto.html?sku=00696`. Cuando se comparte por WhatsApp, la usuaria ve un link feo con código de SKU. Google indexa pobre. Y `/producto.html?sku=AN-001` vs `/producto/solitario-luna-oro-18k` es **noche y día** para autoridad SEO.

**Cómo:**
- Slugs en la BD: agregar columna `slug` en `productos` (auto-generado del nombre limpiado: `solitario-luna-oro-18k`).
- Cloudflare Pages Function que sirve `producto.html` para `/producto/:slug` pattern (o rewrite con `_redirects`).
- En el render, lee el slug de `location.pathname` en vez de `?sku=`.
- Para `?cat=`, lo mismo: `/catalogo/anillos`, `/catalogo/collares`.

**Si la migración es muy costosa**: como mínimo redirigir `/anillos` → `/catalogo.html?cat=anillos` con `_redirects` de Cloudflare. Eso te da URLs cortas compartibles **sin tocar JS**.

```
# _redirects
/anillos    /catalogo.html?cat=anillos    301
/collares   /catalogo.html?cat=collares   301
```

---

## 16 · Skeleton de carga inexistente — la grilla aparece de golpe (jarring)

**Ubicación:** `catalogo.html:81` + `js/render.js:99-160`
**Esfuerzo:** Mediana (1-2 hs)
**Impacto:** Medio · sobre lujo perceptual / percepción de velocidad

**Por qué:**
El catálogo arranca con `<div class="productos productos--lista js-grid-catalogo"></div>` **completamente vacío**. La toolbar dice "Cargando…" (bien) pero la grilla queda en blanco hasta que termina el fetch a Supabase (~600-1200ms en mobile PY).

Durante ese hueco, el header está, el aside está, el footer está, pero **el contenido principal es un agujero blanco**. La clienta percibe "está rota". Y cuando aparece, **aparecen 79 cards de golpe** sin animación → estática→ explosión.

**Cómo:**
- Skeleton cards mientras carga:
```js
function skeletonCard() {
  return `
    <div class="producto producto--skeleton">
      <div class="producto__media skeleton-box"></div>
      <div class="skeleton-line skeleton-line--xs"></div>
      <div class="skeleton-line skeleton-line--md"></div>
      <div class="skeleton-line skeleton-line--sm"></div>
    </div>`;
}
// Antes de await MOMAR_READY:
catalogo.innerHTML = Array(8).fill(0).map(skeletonCard).join('');
```
```css
.skeleton-box, .skeleton-line {
  background: linear-gradient(90deg, var(--color-bg-alt) 25%, #EFECE5 50%, var(--color-bg-alt) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton-box { aspect-ratio: 1/1; margin-bottom: var(--space-3); }
.skeleton-line { height: 12px; margin-bottom: 8px; }
.skeleton-line--xs { width: 30%; }
.skeleton-line--md { width: 75%; }
.skeleton-line--sm { width: 40%; }
```
- Animación de entrada al render real:
```css
.producto { opacity: 0; animation: fade-in 0.4s ease forwards; }
.producto:nth-child(1) { animation-delay: 0.05s; }
.producto:nth-child(2) { animation-delay: 0.1s; }
/* …con stagger via JS para los siguientes */
@keyframes fade-in { to { opacity: 1; } }
```
Stagger en JS:
```js
catalogo.querySelectorAll('.producto').forEach((c, i) => {
  c.style.animationDelay = `${Math.min(i * 0.04, 0.6)}s`;
});
```

---

## 17 · Después de filtrar, el scroll NO vuelve arriba — el usuario se pierde

**Ubicación:** `js/render.js:99-160` (renderCatalogo) + `catalogo.html:123-128` (onChange)
**Esfuerzo:** Quick win (15 min)
**Impacto:** Medio · sobre mobile UX

**Por qué:**
Imaginate: estás scrolleando en la card #40, tocás "Filtros", marcás "Anillos · pieza única". Cerrás el drawer. **La página NO scrollea arriba** y la grilla cambia de 79 a 6 items **fuera de tu viewport**. Resultado: la pantalla parece **vacía** porque viste el footer.

Patrón premium: al cambiar filtros u orden, **scroll suave a la grilla** (no al top hard).

**Cómo:**
```js
function reRender() {
  if (window.MOMAR_renderCatalogo) window.MOMAR_renderCatalogo();
  // Scroll suave al inicio de la grilla
  const grid = document.querySelector('.js-grid-catalogo');
  if (grid && window.innerWidth <= 768) {
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
// Y reemplazar las llamadas directas a MOMAR_renderCatalogo() en los handlers de checkbox/select por reRender()
```
En desktop no scrollees (el aside lateral hace que el usuario vea siempre la grilla en el viewport).

**Bonus:** botón **"Scroll to top"** que aparece después de scrollear más de 800px:
```html
<button class="scroll-top js-scroll-top" aria-label="Volver arriba">↑</button>
```
```css
.scroll-top {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom));
  right: var(--space-3);
  width: 44px; height: 44px;
  border: 1px solid var(--color-line);
  background: var(--color-bg);
  opacity: 0; pointer-events: none;
  transition: opacity 0.2s;
  z-index: 30;
}
.scroll-top.is-visible { opacity: 1; pointer-events: auto; }
```
(Ojo: NO chocarse con el WhatsApp float — ponerlo a la izquierda o un poco más arriba.)

---

## 18 · La ficha no muestra "Te puede gustar" — los relacionados son aleatorios

**Ubicación:** `js/render.js:184-189`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Medio · sobre conversión / cross-sell

**Por qué:**
Hoy: `const otros = window.MOMAR_PRODUCTS.filter(x => x.sku !== p.sku).slice(0, 4);`
Toma los 4 **primeros** del array global (siempre los mismos, no relacionados con el producto que se está viendo).

La clienta entra a "Anillo Solitario" y le muestran "Choker FF 5043" como relacionado. Cero coherencia.

Premium: relacionados son **misma categoría primero**, luego **mismo rango de precio**, luego **misma colección/material** si lo tenés.

**Cómo:**
```js
function relacionados(p, todos, n = 4) {
  const minP = p.precio * 0.6, maxP = p.precio * 1.8;
  return todos
    .filter(x => x.sku !== p.sku)
    .map(x => {
      let score = 0;
      if (x.cat_slug === p.cat_slug) score += 50;
      if (x.precio >= minP && x.precio <= maxP) score += 20;
      if (x.es_unica === p.es_unica) score += 10;
      if (p.material && x.material === p.material) score += 30;
      return { x, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(r => r.x);
}
// Uso:
rel.innerHTML = relacionados(p, window.MOMAR_PRODUCTS, 4).map(productCard).join('');
```

**Bonus:** cambiar el copy del bloque. Hoy: "Para complementar / Te puede gustar". Mejor por categoría:
- Si producto = anillo → "Combina con" + mostrar collares/aros (cross-category contextual)
- Si producto = collar → "Otros collares para vos"

Eso es **lujo perceptual real** porque demuestra que el sitio entiende lo que está mostrando.

---

## 19 · "3 cuotas sin interés" en la ficha — pero sin botón de "ver detalle de financiación"

**Ubicación:** `producto.html:51-54`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Medio · sobre conversión / confianza

**Por qué:**
El bloque "3 cuotas sin interés de Gs X con Bancard · o pagá hasta 12 cuotas" es bueno (es el #1 driver de compras de Gs 1M+ en PY) **pero no se puede expandir**. La clienta quiere saber:
- ¿Qué tarjetas? (Visa, Mastercard, todas?)
- ¿Cuotas con interés cómo son? (12 cuotas con cuánto recargo?)
- ¿Hay opción contado con descuento?

Sin esa transparencia, **abandono**. Aurate y Stelco SaaS PY lo resuelven con un acordeón "Ver más" o un mini-modal.

**Cómo:**
Convertir el bloque en un componente con `<details>`:
```html
<details class="financiacion">
  <summary>
    <strong>3 cuotas sin interés</strong> de <strong>Gs X</strong> · o hasta 12 cuotas
    <span class="financiacion__chevron">▾</span>
  </summary>
  <div class="financiacion__detalle">
    <p><strong>Sin interés:</strong> 3 cuotas con Visa, Mastercard, Cabal Bancard.</p>
    <p><strong>Con interés:</strong> 6 cuotas (~3% mensual) · 12 cuotas (~5% mensual).</p>
    <p><strong>Contado en transferencia:</strong> 5% de descuento sobre Gs X = <strong>Gs Y</strong>.</p>
  </div>
</details>
```
Diseño sobrio con `--color-bg-alt`, `border-top` y chevron rotando con `details[open]`.

---

## 20 · Microinteracción del check de checkbox en filtros se siente "de plantilla"

**Ubicación:** `catalogo.html:33-62` (inputs default browser) + `css/style.css:837`
**Esfuerzo:** Quick win (15 min)
**Impacto:** Bajo · sobre lujo perceptual

**Por qué:**
Los `<input type="checkbox">` están con estilo **default del navegador** — el cuadradito azul iOS o el chequecito Windows. **Rompe el aire monocromático** de la marca con un azul brillante o un check sistémico.

**Cómo:**
Custom checkbox sobrio:
```css
.filtro-grupo label {
  display: flex; align-items: center; gap: 10px;
  cursor: pointer;
}
.filtro-grupo label input[type=checkbox] {
  appearance: none;
  width: 14px; height: 14px;
  border: 1px solid var(--color-line);
  background: var(--color-bg);
  display: inline-block;
  margin: 0;
  position: relative;
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s;
}
.filtro-grupo label input[type=checkbox]:checked {
  border-color: var(--color-text);
  background: var(--color-text);
}
.filtro-grupo label input[type=checkbox]:checked::after {
  content: '';
  position: absolute; inset: 0;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%23F7F5F0' stroke-width='2'><path d='M2 6l3 3 5-6'/></svg>") center/9px no-repeat;
}
.filtro-grupo label input[type=checkbox]:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}
```
Y agregar contador a la derecha:
```html
<label>
  <input type="checkbox" value="anillos">
  <span class="filtro-label">Anillos</span>
  <span class="filtro-count">46</span>
</label>
```
```css
.filtro-grupo label .filtro-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--color-text-soft);
  font-variant-numeric: tabular-nums;
}
```

---

## TOP 5 quick wins (15 min cada uno · empezar HOY)

1. **#1 — Eyebrow sin punto colgando** (`render.js:59`). Filter Boolean. Toca 78 cards al instante.
2. **#11 — Despublicar `AN-001` Solitario Luna** (UPDATE Supabase). Saca el demo placeholder. 5 minutos.
3. **#5 — No repetir misma foto 4 veces en galería** (`render.js:218`). Si hay 1 foto, sin thumbs.
4. **#6 — Descripción placeholder elegante** cuando `descripcion === nombre` (`render.js + supabase-data.js`). 78 fichas dejan de mentir.
5. **#3 — Esconder opciones de filtros sin matches** (categoría hogar/pulseras/aros; materiales). El usuario deja de chocar con vacíos.

**Tiempo total estimado: ~75 minutos. Cambia la sensación general del sitio de "está en construcción" a "está terminado".**

---

## TOP 3 mejoras grandes que cambian el negocio (medio día+ c/u)

1. **Curado de nombres y descripciones — los 79** (`nombre_publico` + `descripcion_larga` por producto). Sentate con Martina **2 horas** y curen 30 productos top juntos. Los otros 49 con IA + revisión. **Es lo más alto-impacto que existe** — sin esto el resto es maquillaje.

2. **Estructura de filtros que sirvan para joyería real** (#4): tipo, ocasión, tono, talle. Junto a contadores dinámicos (#3 + #20). Esto cambia el sitio de "una grilla de 79 cosas" a "una boutique que entiende lo que vendés". Y baja **devoluciones** porque la usuaria encuentra mejor.

3. **URLs friendly + structured data + meta dinámicas** (#14 + #15). Es el **único cambio SEO real** que va a hacer que Google traiga clientes orgánicos. Hoy compite cero en búsquedas. Con esto, en 3-4 meses empieza a aparecer en "anillos oro 18k Asunción". El esfuerzo es 1 día y el retorno se mide en clientes nuevos a 6 meses.

---

## Apéndice · Cosas que NO incluí porque no daban impacto suficiente

- "Wishlist" persistente — el botón "♡ Guardar" hoy no hace nada (es solo visual). Es Mediana de esfuerzo y solo levanta conversión cuando hay tráfico recurrente. **Postergar a fase 2.**
- Comparador de productos — para joyería de moda, **no aplica** (la decisión es estética/única, no spec sheet).
- "Vendido recientemente" tipo Booking — riesgo de feel cheap si Martina no tiene volumen real. Mejor no fingirlo.
- Filtro de tamaño del anillo en grilla (talle) — los productos no tienen variantes cargadas todavía. Cuando se carguen, retomar.
- Reseñas de clientas en cada ficha — necesitás antes recopilarlas (1-2 meses de operación). Cuando las tengas, **integrar en ficha + structured data Review**.
- Modo oscuro del catálogo — no es premium para joyería; los blancos lechosos son parte del lenguaje. Skip.
