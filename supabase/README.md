# MoMar · Supabase — Guía de setup

Stack: Supabase (Postgres 14+, Auth, Storage, RLS)
Single-tenant (un solo comercio).

---

## Orden de ejecución

```
0001_init_schema.sql       tablas, tipos, índices, constraints
0002_rls_policies.sql      funciones de rol + políticas RLS por tabla
0003_triggers_functions.sql  triggers updated_at, audit, search, funciones negocio
0004_storage_buckets.sql   buckets productos / banners / kude
0005_seed.sql              datos iniciales + instrucciones para primer usuario
```

Todos los scripts son idempotentes (se pueden re-ejecutar sin romper nada).

---

## Paso 1 — Crear proyecto Supabase

1. Ir a https://supabase.com/dashboard y crear un nuevo proyecto.
2. Elegir región: South America (São Paulo) o US East segun latencia.
3. Guardar la **database password** en un gestor de contraseñas (no se recupera).
4. Esperar que el proyecto quede activo (aprox. 2 minutos).

---

## Paso 2 — Ejecutar migrations

### Opción A: SQL Editor (más simple para setup inicial)

1. Supabase Dashboard > SQL Editor.
2. Abrir cada archivo en orden y hacer clic en **Run**.
3. Verificar que no haya errores antes de pasar al siguiente.

### Opción B: Supabase CLI (recomendado para entorno con Git)

```bash
# Instalar CLI
npm install -g supabase

# Autenticar
supabase login

# Linkear al proyecto (usar el project ref del dashboard)
supabase link --project-ref <PROJECT_REF>

# Ejecutar todas las migrations
supabase db push
```

### Verificación rápida post-migration

```sql
-- Debe retornar 13 tablas
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar que RLS está activo
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

---

## Paso 3 — Crear el primer usuario dueña

Los usuarios se crean desde Authentication en el Dashboard (no desde SQL, para que Supabase gestione el hash de la password).

### 3.1 Crear usuario en Auth

1. Supabase Dashboard > Authentication > Users > **Add user**.
2. Email: `martina@momar.com.py` (o el real).
3. Password: usar una contraseña fuerte (mínimo 12 caracteres).
4. Hacer clic en **Create user**.
5. Copiar el **UUID** generado (columna User UID).

### 3.2 Registrar en usuarios_admin

Ejecutar en SQL Editor (reemplazar el UUID real):

```sql
INSERT INTO usuarios_admin (id, nombre, apellido, rol)
VALUES ('00000000-0000-0000-0000-000000000000', 'Martina', 'Recalde', 'duena');
```

### 3.3 Agregar usuario de operaciones (opcional)

Repetir 3.1 con otro email y luego:

```sql
INSERT INTO usuarios_admin (id, nombre, apellido, rol)
VALUES ('<UUID_OPERACIONES>', 'Camila', 'Báez', 'operaciones');
```

### Regla de acceso por rol

| Acción | duena | operaciones |
|---|---|---|
| Ver pedidos, clientes, productos | si | si |
| Ver `costo_gs` de productos | si | no (NULL) |
| Ver audit_log | si | no |
| Eliminar registros | si | no |
| Gestionar usuarios | si | no |
| Cambiar configuración tienda | si | no |

---

## Paso 4 — Crear Storage buckets

El archivo `0004_storage_buckets.sql` crea los buckets automáticamente.
Si preferís crearlos manualmente:

1. Supabase Dashboard > Storage > **New bucket**.
2. Crear:
   - `productos` — public: true, max size: 5MB, tipos: image/jpeg, image/png, image/webp
   - `banners`   — public: true, max size: 10MB, tipos: image/jpeg, image/png, image/webp
   - `kude`      — public: **false**, max size: 10MB, tipos: application/pdf

### Generar signed URL para descarga de KUDE (desde el admin)

```javascript
const { data } = await supabase
  .storage
  .from('kude')
  .createSignedUrl(`${pedido.numero}/${pedido.sifen_cdc}.pdf`, 300) // 5 min de validez
```

---

## Paso 5 — Variables de entorno para el frontend

1. Copiar `env.example` a `.env` en la carpeta del frontend.
2. Completar con los valores reales:

```
# Dashboard > Project Settings > API
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

La `ANON_KEY` es pública y segura para el frontend — el acceso real está
controlado por las políticas RLS.

Los secretos de SIFEN Engine y Bancard private key van en
**Supabase Secrets** (Dashboard > Edge Functions > Secrets), NO en el `.env`
del frontend.

---

## Funciones RPC disponibles para el frontend

Llamar con `supabase.rpc('nombre_funcion', { params })`.

| Función | Quién puede llamar | Para qué |
|---|---|---|
| `crear_pedido(payload)` | anon + authenticated | Crear pedido desde checkout |
| `validar_cupon(codigo, cliente_id, subtotal, categoria_slug)` | anon | Validar cupón antes de confirmar |
| `cambiar_estado_pedido(pedido_id, campo, nuevo_estado, motivo)` | authenticated admin | Admin cambia estado pago/envio |
| `buscar_productos(query, limite, offset)` | anon | Full-text search en catálogo |
| `registrar_click_banner(banner_id)` | anon | Trackear clic en banner |
| `actualizar_sifen_pedido(...)` | authenticated admin | Guardar datos factura electrónica |

---

## Notas de diseño importantes

### Stock y cancelaciones
- Al crear pedido: stock se descuenta atómicamente dentro de `crear_pedido()` con `SELECT FOR UPDATE` (previene race condition si dos personas compran la misma pieza única al mismo tiempo).
- Al cancelar (reembolsado/fallido/devuelto): `restituir_stock_pedido()` devuelve el stock. Tiene flag `stock_restituido` para ser idempotente — no importa si se llama dos veces.
- Productos con variantes: el stock del producto maestro baja siempre; también baja el `stock_variante` de la variante específica.

### Costos y márgenes
- `costo_gs` existe en la tabla `productos` pero la view `v_productos_sin_costo` lo nullea para rol `operaciones`. El frontend admin debe usar esta view o filtrar según el rol del usuario autenticado.

### Pedido número
- La secuencia `pedidos_numero_seq` arranca en 1001 (no 1, para que no parezca que es el primer pedido de la historia). Ajustable en el seed.

### Snapshots en pedido_items
- `nombre_snapshot`, `sku_snapshot`, `variante_snapshot`, `precio_unit_snapshot` guardan el estado exacto al momento de la compra. Si el producto cambia de nombre o precio después, el pedido histórico queda intacto.

### Búsqueda full-text
- `search_vector` en `productos` se actualiza automáticamente via trigger antes de INSERT/UPDATE.
- Usa el diccionario `spanish` de PostgreSQL.
- Función `buscar_productos()` usa `websearch_to_tsquery` (sintaxis Google-like: "oro diamante" funciona sin operadores especiales).

### Auditoria
- `audit_log` registra INSERT/UPDATE/DELETE en `pedidos`, `productos`, `clientes`, `ofertas`.
- Solo la dueña puede leer. Inserts bloqueados directo (solo via trigger SECURITY DEFINER).

---

## Troubleshooting frecuente

**Error: "new row violates row-level security policy"**
El usuario no está registrado en `usuarios_admin` o `activo = false`. Verificar con:
```sql
SELECT * FROM usuarios_admin WHERE id = auth.uid();
```

**Error al ejecutar 0004 (storage): "relation storage.buckets does not exist"**
Ejecutar el script desde el SQL Editor del Dashboard (no desde psql externo), que ya tiene el schema `storage` disponible.

**La función `crear_pedido` falla con "Stock insuficiente"**
Stock real del producto es menor a la cantidad pedida. Verificar `productos.stock` y `producto_variantes.stock_variante`.

**`costo_gs` siempre NULL aunque soy dueña**
Verificar que el usuario tenga `rol = 'duena'` en `usuarios_admin` y que esté usando la view `v_productos_sin_costo` (o leyendo directo de `productos` que también funciona para dueña con la policy normal).
