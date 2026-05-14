-- =============================================================================
-- MoMar · Migration 0003 · Triggers, funciones y búsqueda full-text
-- Todas las funciones usan CREATE OR REPLACE (idempotente)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A. TRIGGER: set_updated_at
-- Actualiza updated_at antes de cualquier UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Aplicar a todas las tablas con updated_at
DO $$ DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categorias', 'productos', 'clientes', 'pedidos',
    'banners', 'ofertas', 'usuarios_admin', 'configuracion_tienda'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;
      CREATE TRIGGER trg_set_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- B. TRIGGER: productos search vector
-- Mantiene el tsvector actualizado con pesos A (nombre), B (desc_corta), C (etiquetas)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_producto_search()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.nombre, '')), 'A')
    || setweight(to_tsvector('spanish', coalesce(NEW.descripcion_corta, '')), 'B')
    || setweight(to_tsvector('spanish', coalesce(NEW.descripcion_larga, '')), 'B')
    || setweight(to_tsvector('spanish', coalesce(NEW.material, '')), 'B')
    || setweight(to_tsvector('spanish', coalesce(
         array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.etiquetas)), ' '),
         ''
       )), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_producto_search ON productos;
CREATE TRIGGER trg_producto_search
  BEFORE INSERT OR UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_producto_search();

-- ---------------------------------------------------------------------------
-- C. FUNCIÓN: validar_cupon(codigo, cliente_id, subtotal, categoria_slug)
-- Retorna JSONB con { valido, descuento_gs, motivo }
-- SECURITY DEFINER para que anon pueda validar sin leer la tabla directamente
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validar_cupon(
  p_codigo       text,
  p_cliente_id   uuid,
  p_subtotal_gs  numeric,
  p_categoria_slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_oferta ofertas%ROWTYPE;
  v_descuento numeric := 0;
  v_motivo    text;
BEGIN
  SELECT * INTO v_oferta
  FROM ofertas
  WHERE UPPER(codigo) = UPPER(p_codigo)
    AND activo = true
    AND (vence IS NULL OR vence > now())
    AND (usos_max IS NULL OR usos_count < usos_max);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valido', false, 'descuento_gs', 0, 'motivo', 'Cupón inválido, vencido o sin usos disponibles.');
  END IF;

  -- Verificar condición
  CASE v_oferta.condicion_tipo
    WHEN 'compra_minima' THEN
      IF p_subtotal_gs < (v_oferta.condicion_valor->>'monto')::numeric THEN
        RETURN jsonb_build_object(
          'valido', false, 'descuento_gs', 0,
          'motivo', format('Compra mínima de Gs %s requerida.', v_oferta.condicion_valor->>'monto')
        );
      END IF;

    WHEN 'categoria' THEN
      IF p_categoria_slug IS NULL OR p_categoria_slug != (v_oferta.condicion_valor->>'categoria_slug') THEN
        RETURN jsonb_build_object(
          'valido', false, 'descuento_gs', 0,
          'motivo', 'El cupón aplica solo a productos de una categoría específica.'
        );
      END IF;

    WHEN 'primera_compra' THEN
      IF p_cliente_id IS NOT NULL THEN
        IF EXISTS (
          SELECT 1 FROM pedidos
          WHERE cliente_id = p_cliente_id
            AND pago_estado = 'pagado'
        ) THEN
          RETURN jsonb_build_object(
            'valido', false, 'descuento_gs', 0,
            'motivo', 'Este cupón es solo para primera compra.'
          );
        END IF;
      END IF;

    ELSE NULL; -- sin_condicion y producto: no se valida aquí
  END CASE;

  -- Calcular descuento
  CASE v_oferta.tipo
    WHEN 'porcentaje' THEN
      v_descuento := ROUND(p_subtotal_gs * v_oferta.valor / 100);
    WHEN 'monto' THEN
      v_descuento := LEAST(v_oferta.valor, p_subtotal_gs);
    WHEN 'envio_gratis' THEN
      v_descuento := 0; -- se maneja a nivel envio_gs en la función crear_pedido
  END CASE;

  RETURN jsonb_build_object(
    'valido', true,
    'descuento_gs', v_descuento,
    'tipo', v_oferta.tipo::text,
    'motivo', 'Cupón aplicado correctamente.',
    'oferta_id', v_oferta.id
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- D. FUNCIÓN: crear_pedido(payload jsonb)
-- Crea pedido + items, decrementa stock, loguea estado inicial.
-- Atómica: si algo falla, hace rollback completo.
-- SECURITY DEFINER para que el checkout público pueda insertar sin policy anon.
--
-- payload esperado:
-- {
--   "cliente": { "nombre", "apellido", "email", "whatsapp", "ci_ruc",
--                "dir_calle", "dir_ciudad", "dir_referencia" },
--   "envio_tipo": "asuncion"|"interior"|"showroom",
--   "envio_gs": 0,
--   "pago_metodo": "bancard",
--   "pago_cuotas": null,
--   "cupon_codigo": null,
--   "es_regalo": false,
--   "notas_internas": "",
--   "items": [
--     { "producto_id": "uuid", "variante_id": "uuid|null", "cantidad": 1 }
--   ]
-- }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crear_pedido(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_data    jsonb := payload->'cliente';
  v_cliente_id      uuid;
  v_pedido_id       uuid;
  v_pedido_numero   integer;
  v_item            jsonb;
  v_producto        productos%ROWTYPE;
  v_variante        producto_variantes%ROWTYPE;
  v_precio_unit     numeric;
  v_subtotal        numeric := 0;
  v_descuento       numeric := 0;
  v_envio_gs        numeric := coalesce((payload->>'envio_gs')::numeric, 0);
  v_total           numeric;
  v_cupon_codigo    text := payload->>'cupon_codigo';
  v_cupon_result    jsonb;
  v_snapshot        jsonb;
BEGIN
  -- 1. Upsert cliente por email
  INSERT INTO clientes (nombre, apellido, email, whatsapp, ci_ruc,
                        dir_calle, dir_ciudad, dir_referencia)
  VALUES (
    v_cliente_data->>'nombre',
    v_cliente_data->>'apellido',
    lower(trim(v_cliente_data->>'email')),
    v_cliente_data->>'whatsapp',
    v_cliente_data->>'ci_ruc',
    v_cliente_data->>'dir_calle',
    v_cliente_data->>'dir_ciudad',
    v_cliente_data->>'dir_referencia'
  )
  ON CONFLICT (email) DO UPDATE
    SET nombre     = EXCLUDED.nombre,
        apellido   = EXCLUDED.apellido,
        whatsapp   = EXCLUDED.whatsapp,
        dir_calle  = COALESCE(EXCLUDED.dir_calle, clientes.dir_calle),
        dir_ciudad = COALESCE(EXCLUDED.dir_ciudad, clientes.dir_ciudad),
        updated_at = now()
  RETURNING id INTO v_cliente_id;

  -- 2. Snapshot de dirección
  v_snapshot := jsonb_build_object(
    'nombre',     v_cliente_data->>'nombre',
    'apellido',   v_cliente_data->>'apellido',
    'calle',      v_cliente_data->>'dir_calle',
    'ciudad',     v_cliente_data->>'dir_ciudad',
    'referencia', v_cliente_data->>'dir_referencia',
    'whatsapp',   v_cliente_data->>'whatsapp'
  );

  -- 3. Crear pedido base
  INSERT INTO pedidos (
    cliente_id, subtotal_gs, descuento_gs, envio_gs, total_gs,
    cupon_codigo, pago_metodo, pago_cuotas, envio_tipo,
    envio_direccion_snapshot, es_regalo, notas_internas,
    pago_estado, envio_estado
  )
  VALUES (
    v_cliente_id,
    0, 0, v_envio_gs, 0,  -- se actualizan al final
    v_cupon_codigo,
    (payload->>'pago_metodo')::pago_metodo,
    (payload->>'pago_cuotas')::smallint,
    (payload->>'envio_tipo')::envio_tipo,
    v_snapshot,
    coalesce((payload->>'es_regalo')::boolean, false),
    payload->>'notas_internas',
    'pendiente',
    CASE WHEN (payload->>'pago_metodo') = 'transferencia_bancaria'
         THEN 'pendiente_pago'::envio_estado
         ELSE 'pendiente'::envio_estado
    END
  )
  RETURNING id, numero INTO v_pedido_id, v_pedido_numero;

  -- 4. Procesar items
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    -- Obtener y bloquear fila del producto (FOR UPDATE previene race conditions)
    SELECT * INTO v_producto
    FROM productos
    WHERE id = (v_item->>'producto_id')::uuid
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto % no encontrado.', v_item->>'producto_id';
    END IF;

    IF v_producto.estado != 'publicado' THEN
      RAISE EXCEPTION 'Producto % no está disponible.', v_producto.nombre;
    END IF;

    -- Precio base
    v_precio_unit := v_producto.precio_gs;

    -- Si tiene variante, verificar stock de variante y sumar precio extra
    IF (v_item->>'variante_id') IS NOT NULL THEN
      SELECT * INTO v_variante
      FROM producto_variantes
      WHERE id = (v_item->>'variante_id')::uuid
        AND producto_id = v_producto.id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variante no encontrada para el producto %.', v_producto.nombre;
      END IF;

      IF v_variante.stock_variante < (v_item->>'cantidad')::integer THEN
        RAISE EXCEPTION 'Stock insuficiente para variante % de %.', v_variante.nombre_opcion, v_producto.nombre;
      END IF;

      -- Decrementar stock de variante
      UPDATE producto_variantes
        SET stock_variante = stock_variante - (v_item->>'cantidad')::integer
      WHERE id = v_variante.id;

      v_precio_unit := v_precio_unit + coalesce(v_variante.precio_extra, 0);
    ELSE
      -- Verificar stock general
      IF v_producto.stock < (v_item->>'cantidad')::integer THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto %.', v_producto.nombre;
      END IF;
    END IF;

    -- Decrementar stock del producto
    UPDATE productos
      SET stock = stock - (v_item->>'cantidad')::integer
    WHERE id = v_producto.id;

    -- Insertar item con snapshots
    INSERT INTO pedido_items (
      pedido_id, producto_id, variante_id,
      nombre_snapshot, sku_snapshot, variante_snapshot,
      precio_unit_snapshot, cantidad, subtotal_gs
    )
    VALUES (
      v_pedido_id,
      v_producto.id,
      (v_item->>'variante_id')::uuid,
      v_producto.nombre,
      v_producto.sku,
      CASE WHEN v_variante.id IS NOT NULL
           THEN v_variante.tipo || ' ' || v_variante.nombre_opcion
           ELSE NULL
      END,
      v_precio_unit,
      (v_item->>'cantidad')::integer,
      v_precio_unit * (v_item->>'cantidad')::integer
    );

    v_subtotal := v_subtotal + (v_precio_unit * (v_item->>'cantidad')::integer);

    -- Reset variante para próxima iteración
    v_variante := NULL;
  END LOOP;

  -- 5. Aplicar cupón si hay
  IF v_cupon_codigo IS NOT NULL AND v_cupon_codigo != '' THEN
    v_cupon_result := validar_cupon(v_cupon_codigo, v_cliente_id, v_subtotal, NULL);
    IF (v_cupon_result->>'valido')::boolean THEN
      v_descuento := (v_cupon_result->>'descuento_gs')::numeric;
      -- Marcar envio gratis
      IF (v_cupon_result->>'tipo') = 'envio_gratis' THEN
        v_envio_gs := 0;
      END IF;
      -- Incrementar contador de usos
      UPDATE ofertas
        SET usos_count = usos_count + 1
      WHERE UPPER(codigo) = UPPER(v_cupon_codigo);
    END IF;
  END IF;

  -- 6. Calcular total y actualizar pedido
  v_total := v_subtotal - v_descuento + v_envio_gs;
  IF v_total < 0 THEN v_total := 0; END IF;

  UPDATE pedidos
    SET subtotal_gs  = v_subtotal,
        descuento_gs = v_descuento,
        envio_gs     = v_envio_gs,
        total_gs     = v_total
  WHERE id = v_pedido_id;

  -- 7. Log estado inicial (insert directo: función es SECURITY DEFINER)
  INSERT INTO pedido_estado_log (pedido_id, campo, estado_anterior, estado_nuevo, usuario_id, motivo)
  VALUES (v_pedido_id, 'pago_estado', NULL, 'pendiente', auth.uid(), 'Pedido creado');

  RETURN jsonb_build_object(
    'ok', true,
    'pedido_id', v_pedido_id,
    'numero', v_pedido_numero,
    'total_gs', v_total
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ---------------------------------------------------------------------------
-- E. FUNCIÓN: cambiar_estado_pedido
-- Registra cambio de pago_estado o envio_estado con auditoría
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cambiar_estado_pedido(
  p_pedido_id    uuid,
  p_campo        text,       -- 'pago_estado' | 'envio_estado'
  p_nuevo_estado text,
  p_motivo       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido        pedidos%ROWTYPE;
  v_estado_ant    text;
BEGIN
  -- Solo admins
  IF NOT auth_is_admin() THEN
    RAISE EXCEPTION 'Permiso insuficiente.';
  END IF;

  SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado.';
  END IF;

  IF p_campo = 'pago_estado' THEN
    v_estado_ant := v_pedido.pago_estado::text;
    UPDATE pedidos SET pago_estado = p_nuevo_estado::pago_estado WHERE id = p_pedido_id;

    -- Si pago confirmado: actualizar stats del cliente
    IF p_nuevo_estado = 'pagado' AND v_estado_ant != 'pagado' THEN
      PERFORM update_cliente_stats(v_pedido.cliente_id);
    END IF;

    -- Si reembolsado/fallido luego de pagado: revertir stats y restituir stock
    IF p_nuevo_estado IN ('reembolsado', 'fallido') AND v_estado_ant = 'pagado' THEN
      PERFORM restituir_stock_pedido(p_pedido_id);
      PERFORM update_cliente_stats(v_pedido.cliente_id);
    END IF;

  ELSIF p_campo = 'envio_estado' THEN
    v_estado_ant := v_pedido.envio_estado::text;
    UPDATE pedidos SET envio_estado = p_nuevo_estado::envio_estado WHERE id = p_pedido_id;

    -- Si devuelto: restituir stock (solo si no se hizo antes por reembolso)
    IF p_nuevo_estado = 'devuelto' AND v_estado_ant != 'devuelto' THEN
      IF v_pedido.pago_estado NOT IN ('reembolsado', 'fallido') THEN
        PERFORM restituir_stock_pedido(p_pedido_id);
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'Campo inválido: %. Usar pago_estado o envio_estado.', p_campo;
  END IF;

  -- Log
  INSERT INTO pedido_estado_log (pedido_id, campo, estado_anterior, estado_nuevo, usuario_id, motivo)
  VALUES (p_pedido_id, p_campo, v_estado_ant, p_nuevo_estado, auth.uid(), p_motivo);

  RETURN jsonb_build_object('ok', true, 'estado_anterior', v_estado_ant, 'estado_nuevo', p_nuevo_estado);
END;
$$;

-- ---------------------------------------------------------------------------
-- F. FUNCIÓN: update_cliente_stats
-- Recalcula total_gastado, pedidos_count, ultima_compra para un cliente
-- Solo cuenta pedidos con pago_estado = 'pagado'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_cliente_stats(p_cliente_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clientes
  SET
    total_gastado  = COALESCE((
      SELECT SUM(total_gs)
      FROM pedidos
      WHERE cliente_id = p_cliente_id AND pago_estado = 'pagado'
    ), 0),
    pedidos_count  = (
      SELECT COUNT(*)
      FROM pedidos
      WHERE cliente_id = p_cliente_id AND pago_estado = 'pagado'
    ),
    ultima_compra  = (
      SELECT MAX(created_at)
      FROM pedidos
      WHERE cliente_id = p_cliente_id AND pago_estado = 'pagado'
    )
  WHERE id = p_cliente_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- G. FUNCIÓN: restituir_stock_pedido
-- Devuelve al stock los items de un pedido cancelado/reembolsado/devuelto
-- Idempotente: no hace doble restitución si ya se aplicó (flag en pedido)
-- Usamos una columna stock_restituido para rastrear esto.
-- ---------------------------------------------------------------------------

-- Agregar columna si no existe (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pedidos' AND column_name = 'stock_restituido'
  ) THEN
    ALTER TABLE pedidos ADD COLUMN stock_restituido boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION restituir_stock_pedido(p_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item pedido_items%ROWTYPE;
BEGIN
  -- Verificar que no se haya restituido ya
  IF EXISTS (SELECT 1 FROM pedidos WHERE id = p_pedido_id AND stock_restituido = true) THEN
    RETURN;
  END IF;

  FOR v_item IN
    SELECT * FROM pedido_items WHERE pedido_id = p_pedido_id
  LOOP
    -- Restituir stock del producto
    IF v_item.producto_id IS NOT NULL THEN
      UPDATE productos SET stock = stock + v_item.cantidad WHERE id = v_item.producto_id;
    END IF;

    -- Restituir stock de variante si aplica
    IF v_item.variante_id IS NOT NULL THEN
      UPDATE producto_variantes
        SET stock_variante = stock_variante + v_item.cantidad
      WHERE id = v_item.variante_id;
    END IF;
  END LOOP;

  -- Marcar como restituido
  UPDATE pedidos SET stock_restituido = true WHERE id = p_pedido_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- H. FUNCIÓN: audit_trigger
-- Loguea cambios a audit_log para tablas críticas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'insert', auth.uid(), NULL, to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'update', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'delete', auth.uid(), to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Aplicar audit trigger a tablas críticas
DO $$ DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pedidos', 'productos', 'clientes', 'ofertas']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_audit ON %I;
      CREATE TRIGGER trg_audit
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
    ', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- I. FUNCIÓN: buscar_productos(query text, limite int, offset int)
-- Full-text search sobre el tsvector con ranking
-- SECURITY DEFINER para que anon pueda buscar solo publicados
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION buscar_productos(
  p_query   text,
  p_limite  integer DEFAULT 20,
  p_offset  integer DEFAULT 0
)
RETURNS TABLE (
  id                uuid,
  sku               text,
  nombre            text,
  slug              text,
  descripcion_corta text,
  categoria_id      uuid,
  precio_gs         numeric,
  precio_antes_gs   numeric,
  stock             integer,
  badge             text,
  destacado         boolean,
  imagen_principal  text,
  rank              real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.sku, p.nombre, p.slug, p.descripcion_corta,
    p.categoria_id, p.precio_gs, p.precio_antes_gs,
    p.stock, p.badge, p.destacado,
    f.url AS imagen_principal,
    ts_rank(p.search_vector, websearch_to_tsquery('spanish', p_query)) AS rank
  FROM productos p
  LEFT JOIN producto_fotos f ON f.producto_id = p.id AND f.es_principal = true
  WHERE
    p.estado = 'publicado'
    AND p.search_vector @@ websearch_to_tsquery('spanish', p_query)
  ORDER BY rank DESC, p.nombre
  LIMIT p_limite
  OFFSET p_offset;
$$;

-- ---------------------------------------------------------------------------
-- J. FUNCIÓN: registrar_click_banner(banner_id)
-- Para que el frontend incremente el contador sin policy de update en anon
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION registrar_click_banner(p_banner_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE banners SET clicks_count = clicks_count + 1 WHERE id = p_banner_id;
$$;

-- ---------------------------------------------------------------------------
-- K. FUNCIÓN: actualizar_sifen_pedido
-- Permite al backend/Edge Function actualizar datos SIFEN de un pedido
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION actualizar_sifen_pedido(
  p_pedido_id       uuid,
  p_cdc             text,
  p_factura_num     text,
  p_xml_url         text DEFAULT NULL,
  p_kude_url        text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT auth_is_admin() THEN
    RAISE EXCEPTION 'Permiso insuficiente.';
  END IF;

  UPDATE pedidos
  SET sifen_cdc         = p_cdc,
      sifen_factura_num = p_factura_num,
      sifen_xml_url     = p_xml_url,
      sifen_kude_url    = p_kude_url,
      updated_at        = now()
  WHERE id = p_pedido_id;
END;
$$;
