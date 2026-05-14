-- =============================================================================
-- MoMar · Migration 0004 · Storage buckets
-- Ejecutar con privilegios de service_role (no funciona con anon key)
-- En Supabase Dashboard: SQL Editor → ejecutar con "Run as service_role"
-- O desde la CLI: supabase db push
-- =============================================================================

-- ---------------------------------------------------------------------------
-- BUCKET: productos
-- Lectura pública · escritura solo admin
-- Path esperado: productos/{producto_id}/{filename}
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'productos',
  'productos',
  true,
  5242880,   -- 5 MB por archivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policy: lectura pública (cualquiera puede ver imágenes de productos)
DROP POLICY IF EXISTS "productos_bucket_public_read" ON storage.objects;
CREATE POLICY "productos_bucket_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'productos');

-- Policy: solo admin puede subir/reemplazar
DROP POLICY IF EXISTS "productos_bucket_admin_insert" ON storage.objects;
CREATE POLICY "productos_bucket_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'productos'
    AND auth_is_admin()
  );

DROP POLICY IF EXISTS "productos_bucket_admin_update" ON storage.objects;
CREATE POLICY "productos_bucket_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'productos'
    AND auth_is_admin()
  );

DROP POLICY IF EXISTS "productos_bucket_admin_delete" ON storage.objects;
CREATE POLICY "productos_bucket_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'productos'
    AND auth_is_admin()
  );

-- ---------------------------------------------------------------------------
-- BUCKET: banners
-- Lectura pública · escritura solo admin
-- Path esperado: banners/{banner_id}/{filename}
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  10485760,  -- 10 MB (banners son imágenes grandes)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "banners_bucket_public_read" ON storage.objects;
CREATE POLICY "banners_bucket_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "banners_bucket_admin_insert" ON storage.objects;
CREATE POLICY "banners_bucket_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'banners'
    AND auth_is_admin()
  );

DROP POLICY IF EXISTS "banners_bucket_admin_update" ON storage.objects;
CREATE POLICY "banners_bucket_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'banners'
    AND auth_is_admin()
  );

DROP POLICY IF EXISTS "banners_bucket_admin_delete" ON storage.objects;
CREATE POLICY "banners_bucket_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'banners'
    AND auth_is_admin()
  );

-- ---------------------------------------------------------------------------
-- BUCKET: kude
-- PRIVADO · solo admin con signed URL para descargar PDFs de facturas
-- Path esperado: kude/{pedido_numero}/{cdc}.pdf
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kude',
  'kude',
  false,    -- privado
  10485760, -- 10 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lectura solo admin (via signed URL generada desde el dashboard o función)
DROP POLICY IF EXISTS "kude_bucket_admin_read" ON storage.objects;
CREATE POLICY "kude_bucket_admin_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kude'
    AND auth_is_admin()
  );

DROP POLICY IF EXISTS "kude_bucket_admin_insert" ON storage.objects;
CREATE POLICY "kude_bucket_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kude'
    AND auth_is_admin()
  );

DROP POLICY IF EXISTS "kude_bucket_admin_update" ON storage.objects;
CREATE POLICY "kude_bucket_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'kude'
    AND auth_is_admin()
  );

DROP POLICY IF EXISTS "kude_bucket_admin_delete" ON storage.objects;
CREATE POLICY "kude_bucket_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kude'
    AND auth_is_duena()  -- solo dueña puede eliminar PDFs de facturas
  );

-- ---------------------------------------------------------------------------
-- NOTA: generar signed URL para kude desde el cliente admin:
--
--   const { data } = await supabase
--     .storage
--     .from('kude')
--     .createSignedUrl(`${pedido.numero}/${pedido.sifen_cdc}.pdf`, 300) // 5 min
--
-- ---------------------------------------------------------------------------
