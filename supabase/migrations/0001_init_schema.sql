-- =============================================================================
-- MoMar · Migration 0001 · Esquema inicial
-- PostgreSQL 14+ / Supabase
-- Idempotente: usar IF NOT EXISTS / CREATE OR REPLACE
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- búsqueda aproximada
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- ignorar acentos en FTS

-- ---------------------------------------------------------------------------
-- Enum types (idempotente: drop + create dentro de DO block)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE producto_estado AS ENUM ('publicado', 'borrador', 'oculto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pago_estado AS ENUM ('pendiente', 'pagado', 'a_confirmar', 'reembolsado', 'fallido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pago_metodo AS ENUM ('bancard', 'bancard_cuotas', 'wally', 'transferencia_bancaria');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE envio_tipo AS ENUM ('asuncion', 'interior', 'showroom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE envio_estado AS ENUM ('pendiente', 'pendiente_pago', 'preparado', 'enviado', 'entregado', 'devuelto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE oferta_tipo AS ENUM ('porcentaje', 'monto', 'envio_gratis');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE oferta_condicion_tipo AS ENUM ('compra_minima', 'categoria', 'producto', 'primera_compra', 'sin_condicion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE banner_ubicacion AS ENUM ('hero', 'promo', 'categoria');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_accion AS ENUM ('insert', 'update', 'delete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rol_admin AS ENUM ('duena', 'operaciones');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 1. CATEGORIAS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        text NOT NULL,
  nombre      text NOT NULL,
  orden       smallint NOT NULL DEFAULT 0,
  activa      boolean NOT NULL DEFAULT true,
  imagen_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT categorias_slug_unique UNIQUE (slug),
  CONSTRAINT categorias_nombre_unique UNIQUE (nombre),
  CONSTRAINT categorias_orden_check CHECK (orden >= 0)
);

-- ---------------------------------------------------------------------------
-- 2. PRODUCTOS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku                 text NOT NULL,
  codigo_barras       text,
  nombre              text NOT NULL,
  slug                text NOT NULL,
  descripcion_corta   text,
  descripcion_larga   text,
  categoria_id        uuid REFERENCES categorias(id) ON DELETE SET NULL,

  -- precios en guaraníes (numeric para exactitud, sin decimales para Gs)
  precio_gs           numeric(15,0) NOT NULL CHECK (precio_gs >= 0),
  precio_antes_gs     numeric(15,0) CHECK (precio_antes_gs >= 0),
  -- costo: columna existe pero RLS + view protegen visibilidad para operaciones
  costo_gs            numeric(15,0) CHECK (costo_gs >= 0),

  stock               integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_alerta_min    integer NOT NULL DEFAULT 2 CHECK (stock_alerta_min >= 0),
  es_unica            boolean NOT NULL DEFAULT false,

  estado              producto_estado NOT NULL DEFAULT 'borrador',
  destacado           boolean NOT NULL DEFAULT false,
  badge               text,                  -- 'new', 'sale', 'unique', null

  -- atributos físicos/joyería
  peso_gr             numeric(8,2),
  dimensiones         text,
  material            text,
  piedra              text,
  kilates_piedra      text,
  origen              text,
  certificado         text,
  packaging           text,

  -- metadatos
  etiquetas           jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title           text,
  seo_desc            text,

  -- search vector (se actualiza via trigger)
  search_vector       tsvector,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT productos_sku_unique UNIQUE (sku),
  CONSTRAINT productos_slug_unique UNIQUE (slug),
  CONSTRAINT productos_precio_antes_check CHECK (
    precio_antes_gs IS NULL OR precio_antes_gs > precio_gs
  )
);

-- ---------------------------------------------------------------------------
-- 3. PRODUCTO_FOTOS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS producto_fotos (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id  uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  url          text NOT NULL,
  orden        smallint NOT NULL DEFAULT 0,
  es_principal boolean NOT NULL DEFAULT false,
  alt          text,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT producto_fotos_orden_check CHECK (orden >= 0)
);

-- Garantiza que solo hay UNA foto principal por producto
CREATE UNIQUE INDEX IF NOT EXISTS idx_producto_fotos_principal
  ON producto_fotos (producto_id)
  WHERE es_principal = true;

-- ---------------------------------------------------------------------------
-- 4. PRODUCTO_VARIANTES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS producto_variantes (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id    uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo           text NOT NULL,         -- 'talle', 'largo', 'aroma', etc.
  nombre_opcion  text NOT NULL,         -- '14', '45 cm', 'Higo + sándalo'
  stock_variante integer NOT NULL DEFAULT 0 CHECK (stock_variante >= 0),
  precio_extra   numeric(15,0) DEFAULT 0 CHECK (precio_extra >= 0),
  activa         boolean NOT NULL DEFAULT true,
  orden          smallint NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT producto_variantes_tipo_opcion_unique UNIQUE (producto_id, tipo, nombre_opcion)
);

-- ---------------------------------------------------------------------------
-- 5. CLIENTES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre           text NOT NULL,
  apellido         text,
  email            text NOT NULL,
  ci_ruc           text,
  whatsapp         text,

  -- dirección principal (la de la última compra se guarda en pedido como snapshot)
  dir_calle        text,
  dir_ciudad       text,
  dir_referencia   text,

  es_vip           boolean NOT NULL DEFAULT false,
  notas_internas   text,

  -- campos computados, actualizados por trigger al cambiar estado de pedido
  total_gastado    numeric(15,0) NOT NULL DEFAULT 0,
  pedidos_count    integer NOT NULL DEFAULT 0,
  ultima_compra    timestamptz,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clientes_email_unique UNIQUE (email),
  CONSTRAINT clientes_total_check CHECK (total_gastado >= 0),
  CONSTRAINT clientes_pedidos_check CHECK (pedidos_count >= 0)
);

-- ---------------------------------------------------------------------------
-- 6. PEDIDOS
-- Número visible autoincrementado (correlativo humano, no UUID)
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS pedidos_numero_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS pedidos (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero                    integer NOT NULL DEFAULT nextval('pedidos_numero_seq'),
  cliente_id                uuid REFERENCES clientes(id) ON DELETE SET NULL,

  -- totales en Gs
  subtotal_gs               numeric(15,0) NOT NULL DEFAULT 0 CHECK (subtotal_gs >= 0),
  descuento_gs              numeric(15,0) NOT NULL DEFAULT 0 CHECK (descuento_gs >= 0),
  envio_gs                  numeric(15,0) NOT NULL DEFAULT 0 CHECK (envio_gs >= 0),
  total_gs                  numeric(15,0) NOT NULL DEFAULT 0 CHECK (total_gs >= 0),

  cupon_codigo              text,

  -- pago
  pago_metodo               pago_metodo,
  pago_estado               pago_estado NOT NULL DEFAULT 'pendiente',
  pago_referencia           text,       -- número de transacción Bancard, comprobante transferencia, etc.
  pago_cuotas               smallint,   -- NULL si no aplica, 3, 6, 12

  -- envío
  envio_tipo                envio_tipo NOT NULL DEFAULT 'asuncion',
  envio_estado              envio_estado NOT NULL DEFAULT 'pendiente',
  -- snapshot de dirección al momento del pedido
  envio_direccion_snapshot  jsonb,      -- { calle, ciudad, referencia, whatsapp, nombre_destinatario }

  notas_internas            text,
  es_regalo                 boolean NOT NULL DEFAULT false,

  -- facturación electrónica SIFEN
  sifen_cdc                 text UNIQUE,
  sifen_factura_num         text,       -- '001-001-12345'
  sifen_xml_url             text,
  sifen_kude_url            text,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pedidos_numero_unique UNIQUE (numero),
  CONSTRAINT pedidos_total_check CHECK (
    total_gs = subtotal_gs - descuento_gs + envio_gs
    OR total_gs = 0  -- permitir 0 mientras se crea el pedido
  ),
  CONSTRAINT pedidos_cuotas_check CHECK (
    pago_cuotas IS NULL
    OR (pago_metodo = 'bancard_cuotas' AND pago_cuotas IN (3, 6, 12))
  )
);

-- ---------------------------------------------------------------------------
-- 7. PEDIDO_ITEMS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedido_items (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id             uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id           uuid REFERENCES productos(id) ON DELETE SET NULL,
  variante_id           uuid REFERENCES producto_variantes(id) ON DELETE SET NULL,

  -- snapshots del momento de la compra (no cambiar aunque el producto cambie)
  nombre_snapshot       text NOT NULL,
  sku_snapshot          text,
  variante_snapshot     text,           -- 'Talle 14', '45 cm', etc.
  precio_unit_snapshot  numeric(15,0) NOT NULL CHECK (precio_unit_snapshot >= 0),
  cantidad              integer NOT NULL CHECK (cantidad > 0),
  subtotal_gs           numeric(15,0) NOT NULL CHECK (subtotal_gs >= 0)
);

-- ---------------------------------------------------------------------------
-- 8. PEDIDO_ESTADO_LOG (auditoría de cambios de estado)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedido_estado_log (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id        uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  campo            text NOT NULL DEFAULT 'pago_estado', -- 'pago_estado' | 'envio_estado'
  estado_anterior  text,
  estado_nuevo     text NOT NULL,
  usuario_id       uuid,               -- auth.users.id; null = sistema automático
  motivo           text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 9. BANNERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo         text NOT NULL,
  subtitulo      text,
  cta_texto      text,
  cta_link       text,
  imagen_url     text,
  ubicacion      banner_ubicacion NOT NULL DEFAULT 'hero',
  -- si ubicacion = 'categoria', este campo guarda el slug de la categoría
  ubicacion_ref  text,
  vigente_desde  timestamptz,
  vigente_hasta  timestamptz,
  activo         boolean NOT NULL DEFAULT true,
  orden          smallint NOT NULL DEFAULT 0,
  clicks_count   integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT banners_vigencia_check CHECK (
    vigente_hasta IS NULL OR vigente_desde IS NULL OR vigente_hasta > vigente_desde
  )
);

-- ---------------------------------------------------------------------------
-- 10. OFERTAS (cupones de descuento)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ofertas (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo             text NOT NULL,
  tipo               oferta_tipo NOT NULL,
  valor              numeric(15,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  condicion_tipo     oferta_condicion_tipo NOT NULL DEFAULT 'sin_condicion',
  -- condicion_valor ejemplos:
  --   compra_minima: { "monto": 1500000 }
  --   categoria:     { "categoria_slug": "anillos" }
  --   producto:      { "producto_id": "uuid" }
  --   primera_compra: {} (solo verificar que cliente no tenga pedidos previos pagados)
  condicion_valor    jsonb NOT NULL DEFAULT '{}'::jsonb,
  usos_count         integer NOT NULL DEFAULT 0 CHECK (usos_count >= 0),
  usos_max           integer CHECK (usos_max > 0),
  vence              timestamptz,
  activo             boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ofertas_codigo_unique UNIQUE (UPPER(codigo)),
  CONSTRAINT ofertas_porcentaje_check CHECK (
    tipo != 'porcentaje' OR (valor > 0 AND valor <= 100)
  )
);

-- ---------------------------------------------------------------------------
-- 11. USUARIOS_ADMIN (extiende auth.users de Supabase)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_admin (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  apellido    text,
  rol         rol_admin NOT NULL DEFAULT 'operaciones',
  activo      boolean NOT NULL DEFAULT true,
  last_login  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 12. CONFIGURACION_TIENDA (key-value, fila única)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion_tienda (
  id                    integer PRIMARY KEY DEFAULT 1,
  nombre_comercial      text NOT NULL DEFAULT 'MoMar',
  razon_social          text,
  ruc                   text,
  timbrado              text,
  dominio               text,
  email_institucional   text,
  whatsapp_atencion     text,
  showroom_direccion    text,
  showroom_ciudad       text,
  showroom_cp           text,
  horario_lv            text,
  horario_sabado        text,
  instagram             text,
  facebook              text,
  tiktok                text,
  logo_url              text,
  favicon_url           text,
  topbar_texto          text,
  topbar_activo         boolean NOT NULL DEFAULT true,
  seo_title             text,
  seo_desc              text,
  meta_pixel_id         text,
  gtm_id                text,
  envio_gratis_desde_gs numeric(15,0) DEFAULT 2500000,
  cuotas_sin_interes    smallint DEFAULT 3,
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT configuracion_tienda_singleton CHECK (id = 1)
);

-- ---------------------------------------------------------------------------
-- 13. AUDIT_LOG
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabla         text NOT NULL,
  registro_id   text NOT NULL,     -- text para soportar uuid o int
  accion        audit_accion NOT NULL,
  usuario_id    uuid,              -- auth.users.id; null = trigger del sistema
  datos_antes   jsonb,
  datos_despues jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------------

-- Productos
CREATE INDEX IF NOT EXISTS idx_productos_slug         ON productos (slug);
CREATE INDEX IF NOT EXISTS idx_productos_sku          ON productos (sku);
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON productos (codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_productos_categoria    ON productos (categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_estado       ON productos (estado);
CREATE INDEX IF NOT EXISTS idx_productos_destacado    ON productos (destacado) WHERE destacado = true;
CREATE INDEX IF NOT EXISTS idx_productos_search       ON productos USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_productos_etiquetas    ON productos USING GIN (etiquetas);
-- Búsqueda por nombre con trigramas (para LIKE y similitud)
CREATE INDEX IF NOT EXISTS idx_productos_nombre_trgm  ON productos USING GIN (nombre gin_trgm_ops);

-- Producto fotos
CREATE INDEX IF NOT EXISTS idx_producto_fotos_prod    ON producto_fotos (producto_id);

-- Producto variantes
CREATE INDEX IF NOT EXISTS idx_prod_variantes_prod    ON producto_variantes (producto_id);

-- Clientes
CREATE INDEX IF NOT EXISTS idx_clientes_email         ON clientes (email);
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp      ON clientes (whatsapp) WHERE whatsapp IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_vip           ON clientes (es_vip) WHERE es_vip = true;

-- Pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_numero         ON pedidos (numero);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente        ON pedidos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_pago_estado    ON pedidos (pago_estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_envio_estado   ON pedidos (envio_estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_sifen_cdc      ON pedidos (sifen_cdc) WHERE sifen_cdc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at     ON pedidos (created_at DESC);

-- Pedido items
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido    ON pedido_items (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_producto  ON pedido_items (producto_id);

-- Pedido estado log
CREATE INDEX IF NOT EXISTS idx_estado_log_pedido      ON pedido_estado_log (pedido_id);

-- Banners
CREATE INDEX IF NOT EXISTS idx_banners_activo_vig     ON banners (activo, vigente_desde, vigente_hasta);

-- Ofertas
CREATE INDEX IF NOT EXISTS idx_ofertas_codigo         ON ofertas (UPPER(codigo));
CREATE INDEX IF NOT EXISTS idx_ofertas_activo         ON ofertas (activo) WHERE activo = true;

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_tabla        ON audit_log (tabla, registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created      ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario      ON audit_log (usuario_id) WHERE usuario_id IS NOT NULL;
