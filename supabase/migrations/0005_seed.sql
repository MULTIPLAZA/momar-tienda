-- =============================================================================
-- MoMar · Migration 0005 · Seed inicial
-- Datos mínimos para arrancar: configuración, categorías, banner demo
-- El usuario dueña se crea MANUALMENTE (ver README paso 3) — no guardar
-- passwords en el repo.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Configuración de la tienda (fila única)
-- ---------------------------------------------------------------------------
INSERT INTO configuracion_tienda (
  id, nombre_comercial, razon_social, ruc, timbrado,
  dominio, email_institucional, whatsapp_atencion,
  showroom_direccion, showroom_ciudad, showroom_cp,
  horario_lv, horario_sabado,
  instagram, facebook,
  topbar_texto, topbar_activo,
  seo_title, seo_desc,
  envio_gratis_desde_gs, cuotas_sin_interes
)
VALUES (
  1,
  'MoMar',
  'MoMar Joyería S.R.L.',
  '80000000-0',
  '80000000',
  'momar.com.py',
  'contacto@momar.com.py',
  '+595981000000',
  'Av. España 1234 c/ Brasilia',
  'Asunción',
  '1209',
  '10:00 — 18:00',
  '10:00 — 14:00',
  '@momarpy',
  'MoMar Paraguay',
  'ENVÍO GRATIS EN ASUNCIÓN SOBRE Gs 2.500.000 · 3 CUOTAS SIN INTERÉS',
  true,
  'MoMar · Joyería y accesorios premium',
  'Joyería de autor en oro 18k y plata 925, accesorios de hogar premium curados en Asunción. Envíos gratis en Asunción.',
  2500000,
  3
)
ON CONFLICT (id) DO UPDATE
  SET nombre_comercial      = EXCLUDED.nombre_comercial,
      razon_social          = EXCLUDED.razon_social,
      dominio               = EXCLUDED.dominio,
      email_institucional   = EXCLUDED.email_institucional,
      whatsapp_atencion     = EXCLUDED.whatsapp_atencion,
      topbar_texto          = EXCLUDED.topbar_texto,
      seo_title             = EXCLUDED.seo_title,
      seo_desc              = EXCLUDED.seo_desc;

-- ---------------------------------------------------------------------------
-- 2. Categorías
-- ---------------------------------------------------------------------------
INSERT INTO categorias (slug, nombre, orden, activa)
VALUES
  ('anillos',  'Anillos',  1, true),
  ('collares', 'Collares', 2, true),
  ('aros',     'Aros',     3, true),
  ('pulseras', 'Pulseras', 4, true),
  ('hogar',    'Hogar · Decoración', 5, true)
ON CONFLICT (slug) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      orden  = EXCLUDED.orden,
      activa = EXCLUDED.activa;

-- ---------------------------------------------------------------------------
-- 3. Banner demo (hero principal)
-- ---------------------------------------------------------------------------
INSERT INTO banners (titulo, subtitulo, cta_texto, cta_link, ubicacion, activo, orden)
VALUES (
  'Colección Otoño 2026',
  'Piezas que perduran',
  'Ver colección',
  '/catalogo.html',
  'hero',
  true,
  1
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Oferta de bienvenida (cupón demo)
-- ---------------------------------------------------------------------------
INSERT INTO ofertas (codigo, tipo, valor, condicion_tipo, condicion_valor, usos_max, activo, vence)
VALUES (
  'BIENVENIDA10',
  'porcentaje',
  10,
  'primera_compra',
  '{}',
  NULL,  -- sin límite de usos
  true,
  '2026-12-31 23:59:59+00'
)
ON CONFLICT (UPPER(codigo)) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Producto de ejemplo (para probar el catálogo público)
-- Se puede eliminar luego de verificar que todo funciona
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_cat_id uuid;
  v_prod_id uuid;
BEGIN
  SELECT id INTO v_cat_id FROM categorias WHERE slug = 'anillos';

  INSERT INTO productos (
    sku, nombre, slug, descripcion_corta, descripcion_larga,
    categoria_id, precio_gs, costo_gs,
    stock, es_unica, estado, destacado, badge,
    peso_gr, material, piedra, certificado, packaging,
    etiquetas
  )
  VALUES (
    'AN-001',
    'Solitario Luna',
    'solitario-luna',
    'Anillo solitario en oro 18k con diamante 0,15 ct',
    'Anillo solitario en oro amarillo 18 quilates con diamante central de 0,15 ct, talla brillante. Banda interior con grabado MOMAR. Una pieza concebida para acompañar momentos que duran toda la vida — y para usarse, todos los días, con la misma delicadeza con la que fue hecha.',
    v_cat_id,
    2850000,
    980000,   -- costo interno (solo visible para dueña)
    1,
    true,
    'publicado',
    true,
    'new',
    3.8,
    'Oro amarillo 18k',
    'Diamante 0,15 ct · talla brillante',
    'GIA',
    'Caja MOMAR de regalo',
    '["oro", "diamante", "solitario", "novia", "regalo"]'::jsonb
  )
  ON CONFLICT (sku) DO NOTHING
  RETURNING id INTO v_prod_id;

  -- Variantes de talle para el solitario
  IF v_prod_id IS NOT NULL THEN
    INSERT INTO producto_variantes (producto_id, tipo, nombre_opcion, stock_variante, orden)
    VALUES
      (v_prod_id, 'Talle', '10', 0, 1),
      (v_prod_id, 'Talle', '12', 0, 2),
      (v_prod_id, 'Talle', '14', 1, 3),  -- stock real en variante
      (v_prod_id, 'Talle', '16', 0, 4),
      (v_prod_id, 'Talle', '18', 0, 5)
    ON CONFLICT (producto_id, tipo, nombre_opcion) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Instrucciones para crear el primer usuario dueña
-- (No automatizable sin exponer credenciales — ver README paso 3)
-- ---------------------------------------------------------------------------
-- EJECUTAR MANUALMENTE desde Supabase Dashboard > Authentication > Users:
--
-- 1. Crear usuario con email: martina@momar.com.py
-- 2. Copiar el UUID generado
-- 3. Ejecutar:
--
--    INSERT INTO usuarios_admin (id, nombre, apellido, rol)
--    VALUES ('<UUID_COPIADO>', 'Martina', 'Recalde', 'duena');
--
-- Para agregar un usuario de operaciones:
--    INSERT INTO usuarios_admin (id, nombre, apellido, rol)
--    VALUES ('<UUID_OPERACIONES>', 'Camila', 'Báez', 'operaciones');
--
-- ---------------------------------------------------------------------------
