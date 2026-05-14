-- =============================================================================
-- MoMar · Migration 0002 · Row Level Security (RLS)
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE POLICY
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: función que retorna el rol del usuario autenticado actual
-- Consulta usuarios_admin; devuelve NULL si el usuario no existe o está inactivo
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_rol()
RETURNS rol_admin
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol
  FROM usuarios_admin
  WHERE id = auth.uid()
    AND activo = true;
$$;

-- Helper: verifica si el usuario es admin activo (cualquier rol)
CREATE OR REPLACE FUNCTION auth_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_admin
    WHERE id = auth.uid() AND activo = true
  );
$$;

-- Helper: verifica si el usuario tiene rol 'duena'
CREATE OR REPLACE FUNCTION auth_is_duena()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth_user_rol() = 'duena';
$$;

-- ===========================================================================
-- TABLA: categorias
-- Lectura pública para las activas; escritura solo admin
-- ===========================================================================
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categorias_public_select" ON categorias;
CREATE POLICY "categorias_public_select"
  ON categorias FOR SELECT
  TO anon, authenticated
  USING (activa = true);

DROP POLICY IF EXISTS "categorias_admin_select_all" ON categorias;
CREATE POLICY "categorias_admin_select_all"
  ON categorias FOR SELECT
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "categorias_admin_insert" ON categorias;
CREATE POLICY "categorias_admin_insert"
  ON categorias FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "categorias_admin_update" ON categorias;
CREATE POLICY "categorias_admin_update"
  ON categorias FOR UPDATE
  TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "categorias_admin_delete" ON categorias;
CREATE POLICY "categorias_admin_delete"
  ON categorias FOR DELETE
  TO authenticated
  USING (auth_is_admin());

-- ===========================================================================
-- TABLA: productos
-- Lectura pública para publicados (SIN costo_gs — se maneja con view separada)
-- ===========================================================================
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "productos_public_select" ON productos;
CREATE POLICY "productos_public_select"
  ON productos FOR SELECT
  TO anon
  USING (estado = 'publicado');

DROP POLICY IF EXISTS "productos_admin_select" ON productos;
CREATE POLICY "productos_admin_select"
  ON productos FOR SELECT
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "productos_admin_insert" ON productos;
CREATE POLICY "productos_admin_insert"
  ON productos FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "productos_admin_update" ON productos;
CREATE POLICY "productos_admin_update"
  ON productos FOR UPDATE
  TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "productos_admin_delete" ON productos;
CREATE POLICY "productos_admin_delete"
  ON productos FOR DELETE
  TO authenticated
  USING (auth_is_duena());   -- solo dueña puede eliminar

-- ===========================================================================
-- VISTA SEGURA: productos sin costo (para rol operaciones)
-- La view filtra costo_gs = null para operaciones; dueña lo ve completo.
-- El frontend admin debe usar esta view o la tabla según el rol.
-- ===========================================================================
DROP VIEW IF EXISTS v_productos_sin_costo;
CREATE VIEW v_productos_sin_costo
WITH (security_invoker = false)
AS
SELECT
  id, sku, codigo_barras, nombre, slug, descripcion_corta, descripcion_larga,
  categoria_id, precio_gs, precio_antes_gs,
  -- costo_gs: NULL para operaciones, valor real para dueña
  CASE WHEN auth_is_duena() THEN costo_gs ELSE NULL END AS costo_gs,
  stock, stock_alerta_min, es_unica, estado, destacado, badge,
  peso_gr, dimensiones, material, piedra, kilates_piedra, origen,
  certificado, packaging, etiquetas, seo_title, seo_desc,
  created_at, updated_at
FROM productos;

-- Permisos sobre la view
GRANT SELECT ON v_productos_sin_costo TO authenticated;

-- ===========================================================================
-- TABLA: producto_fotos
-- ===========================================================================
ALTER TABLE producto_fotos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prod_fotos_public_select" ON producto_fotos;
CREATE POLICY "prod_fotos_public_select"
  ON producto_fotos FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM productos p
      WHERE p.id = producto_fotos.producto_id
        AND p.estado = 'publicado'
    )
  );

DROP POLICY IF EXISTS "prod_fotos_admin_select" ON producto_fotos;
CREATE POLICY "prod_fotos_admin_select"
  ON producto_fotos FOR SELECT
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "prod_fotos_admin_insert" ON producto_fotos;
CREATE POLICY "prod_fotos_admin_insert"
  ON producto_fotos FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "prod_fotos_admin_update" ON producto_fotos;
CREATE POLICY "prod_fotos_admin_update"
  ON producto_fotos FOR UPDATE
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "prod_fotos_admin_delete" ON producto_fotos;
CREATE POLICY "prod_fotos_admin_delete"
  ON producto_fotos FOR DELETE
  TO authenticated
  USING (auth_is_admin());

-- ===========================================================================
-- TABLA: producto_variantes
-- ===========================================================================
ALTER TABLE producto_variantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prod_variantes_public_select" ON producto_variantes;
CREATE POLICY "prod_variantes_public_select"
  ON producto_variantes FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM productos p
      WHERE p.id = producto_variantes.producto_id
        AND p.estado = 'publicado'
    )
  );

DROP POLICY IF EXISTS "prod_variantes_admin_select" ON producto_variantes;
CREATE POLICY "prod_variantes_admin_select"
  ON producto_variantes FOR SELECT
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "prod_variantes_admin_insert" ON producto_variantes;
CREATE POLICY "prod_variantes_admin_insert"
  ON producto_variantes FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "prod_variantes_admin_update" ON producto_variantes;
CREATE POLICY "prod_variantes_admin_update"
  ON producto_variantes FOR UPDATE
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "prod_variantes_admin_delete" ON producto_variantes;
CREATE POLICY "prod_variantes_admin_delete"
  ON producto_variantes FOR DELETE
  TO authenticated
  USING (auth_is_admin());

-- ===========================================================================
-- TABLA: clientes
-- Solo admin (cualquier rol) puede ver y operar
-- ===========================================================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes_admin_select" ON clientes;
CREATE POLICY "clientes_admin_select"
  ON clientes FOR SELECT
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "clientes_admin_insert" ON clientes;
CREATE POLICY "clientes_admin_insert"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "clientes_admin_update" ON clientes;
CREATE POLICY "clientes_admin_update"
  ON clientes FOR UPDATE
  TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "clientes_duena_delete" ON clientes;
CREATE POLICY "clientes_duena_delete"
  ON clientes FOR DELETE
  TO authenticated
  USING (auth_is_duena());

-- Nota: el checkout público crea/busca cliente via función SECURITY DEFINER
-- (ver 0003_triggers_functions.sql), no requiere policy anon en clientes.

-- ===========================================================================
-- TABLA: pedidos
-- ===========================================================================
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pedidos_admin_select" ON pedidos;
CREATE POLICY "pedidos_admin_select"
  ON pedidos FOR SELECT
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "pedidos_admin_insert" ON pedidos;
CREATE POLICY "pedidos_admin_insert"
  ON pedidos FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "pedidos_admin_update" ON pedidos;
CREATE POLICY "pedidos_admin_update"
  ON pedidos FOR UPDATE
  TO authenticated
  USING (auth_is_admin())
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "pedidos_duena_delete" ON pedidos;
CREATE POLICY "pedidos_duena_delete"
  ON pedidos FOR DELETE
  TO authenticated
  USING (auth_is_duena());

-- ===========================================================================
-- TABLA: pedido_items
-- ===========================================================================
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pedido_items_admin_select" ON pedido_items;
CREATE POLICY "pedido_items_admin_select"
  ON pedido_items FOR SELECT
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "pedido_items_admin_insert" ON pedido_items;
CREATE POLICY "pedido_items_admin_insert"
  ON pedido_items FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "pedido_items_admin_update" ON pedido_items;
CREATE POLICY "pedido_items_admin_update"
  ON pedido_items FOR UPDATE
  TO authenticated
  USING (auth_is_admin());

-- items nunca se eliminan (integridad de historial); solo dueña puede hacerlo
DROP POLICY IF EXISTS "pedido_items_duena_delete" ON pedido_items;
CREATE POLICY "pedido_items_duena_delete"
  ON pedido_items FOR DELETE
  TO authenticated
  USING (auth_is_duena());

-- ===========================================================================
-- TABLA: pedido_estado_log
-- ===========================================================================
ALTER TABLE pedido_estado_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estado_log_admin_select" ON pedido_estado_log;
CREATE POLICY "estado_log_admin_select"
  ON pedido_estado_log FOR SELECT
  TO authenticated
  USING (auth_is_admin());

-- Insert se hace SOLO desde función SECURITY DEFINER; no se permite directo
DROP POLICY IF EXISTS "estado_log_deny_direct_insert" ON pedido_estado_log;
CREATE POLICY "estado_log_deny_direct_insert"
  ON pedido_estado_log FOR INSERT
  TO authenticated
  WITH CHECK (false);   -- bloqueado; solo pasa el trigger/función definer

-- ===========================================================================
-- TABLA: banners
-- ===========================================================================
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Banners activos y vigentes son públicos
DROP POLICY IF EXISTS "banners_public_select" ON banners;
CREATE POLICY "banners_public_select"
  ON banners FOR SELECT
  TO anon, authenticated
  USING (
    activo = true
    AND (vigente_desde IS NULL OR vigente_desde <= now())
    AND (vigente_hasta IS NULL OR vigente_hasta >= now())
  );

DROP POLICY IF EXISTS "banners_admin_select_all" ON banners;
CREATE POLICY "banners_admin_select_all"
  ON banners FOR SELECT
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "banners_admin_insert" ON banners;
CREATE POLICY "banners_admin_insert"
  ON banners FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "banners_admin_update" ON banners;
CREATE POLICY "banners_admin_update"
  ON banners FOR UPDATE
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "banners_admin_delete" ON banners;
CREATE POLICY "banners_admin_delete"
  ON banners FOR DELETE
  TO authenticated
  USING (auth_is_admin());

-- ===========================================================================
-- TABLA: ofertas
-- ===========================================================================
ALTER TABLE ofertas ENABLE ROW LEVEL SECURITY;

-- El código de cupón se valida en función SECURITY DEFINER; anon no lee la tabla
DROP POLICY IF EXISTS "ofertas_admin_select" ON ofertas;
CREATE POLICY "ofertas_admin_select"
  ON ofertas FOR SELECT
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "ofertas_admin_insert" ON ofertas;
CREATE POLICY "ofertas_admin_insert"
  ON ofertas FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_admin());

DROP POLICY IF EXISTS "ofertas_admin_update" ON ofertas;
CREATE POLICY "ofertas_admin_update"
  ON ofertas FOR UPDATE
  TO authenticated
  USING (auth_is_admin());

DROP POLICY IF EXISTS "ofertas_admin_delete" ON ofertas;
CREATE POLICY "ofertas_admin_delete"
  ON ofertas FOR DELETE
  TO authenticated
  USING (auth_is_duena());

-- ===========================================================================
-- TABLA: usuarios_admin
-- Cada usuario ve su propio registro; dueña ve todos
-- ===========================================================================
ALTER TABLE usuarios_admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_admin_self_select" ON usuarios_admin;
CREATE POLICY "usuarios_admin_self_select"
  ON usuarios_admin FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR auth_is_duena());

DROP POLICY IF EXISTS "usuarios_admin_duena_insert" ON usuarios_admin;
CREATE POLICY "usuarios_admin_duena_insert"
  ON usuarios_admin FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_duena());

DROP POLICY IF EXISTS "usuarios_admin_duena_update" ON usuarios_admin;
CREATE POLICY "usuarios_admin_duena_update"
  ON usuarios_admin FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR auth_is_duena())
  WITH CHECK (auth_is_duena());

DROP POLICY IF EXISTS "usuarios_admin_duena_delete" ON usuarios_admin;
CREATE POLICY "usuarios_admin_duena_delete"
  ON usuarios_admin FOR DELETE
  TO authenticated
  USING (auth_is_duena());

-- ===========================================================================
-- TABLA: configuracion_tienda
-- ===========================================================================
ALTER TABLE configuracion_tienda ENABLE ROW LEVEL SECURITY;

-- Configuración básica pública (para el frontend de la tienda)
DROP POLICY IF EXISTS "config_tienda_public_select" ON configuracion_tienda;
CREATE POLICY "config_tienda_public_select"
  ON configuracion_tienda FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "config_tienda_duena_update" ON configuracion_tienda;
CREATE POLICY "config_tienda_duena_update"
  ON configuracion_tienda FOR UPDATE
  TO authenticated
  USING (auth_is_duena())
  WITH CHECK (auth_is_duena());

-- No se puede insertar/eliminar (fila única garantizada por constraint)

-- ===========================================================================
-- TABLA: audit_log
-- Solo dueña puede leer; insert solo desde triggers SECURITY DEFINER
-- ===========================================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_duena_select" ON audit_log;
CREATE POLICY "audit_log_duena_select"
  ON audit_log FOR SELECT
  TO authenticated
  USING (auth_is_duena());

-- Bloquear insert directo (triggers usan SECURITY DEFINER)
DROP POLICY IF EXISTS "audit_log_deny_direct_insert" ON audit_log;
CREATE POLICY "audit_log_deny_direct_insert"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (false);
