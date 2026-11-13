-- Biblias propias de Bandly Presenter, por organización. Antes las Biblias venían empaquetadas con
-- el instalador (iguales para todos); ahora cada iglesia sube las suyas en XML (Zefania u OpenSong)
-- y las ve guardadas desde cualquier computador. Se guardan en un bucket PRIVADO: a diferencia de
-- "files", no hay URL pública, así que una versión con derechos de autor solo la leen los miembros
-- de la organización que la subió.
-- Run this in Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('bibles', 'bibles', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS presenter_bibles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presenter_bibles_org_id ON presenter_bibles(org_id);

ALTER TABLE presenter_bibles ENABLE ROW LEVEL SECURITY;

-- Cualquiera de la misma organización ve las Biblias del equipo.
CREATE POLICY "presenter_bibles_select_same_org" ON presenter_bibles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = presenter_bibles.org_id));

-- Solo puedes subir Biblias firmadas como tú mismo, y a tu propia organización.
CREATE POLICY "presenter_bibles_insert_same_org" ON presenter_bibles FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = presenter_bibles.org_id)
  );

-- Borrar: quien la subió, o un director de la misma organización.
CREATE POLICY "presenter_bibles_delete_uploader_or_director" ON presenter_bibles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND org_id = presenter_bibles.org_id AND (role = 'director' OR id = presenter_bibles.uploaded_by)
    )
  );

-- Archivos del bucket: la carpeta de primer nivel es el id de la organización ({org_id}/{archivo}.xml).
CREATE POLICY "bibles_bucket_select_same_org" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'bibles'
    AND (storage.foldername(name))[1] = (SELECT org_id::text FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "bibles_bucket_insert_same_org" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bibles'
    AND (storage.foldername(name))[1] = (SELECT org_id::text FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "bibles_bucket_delete_same_org" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'bibles'
    AND (storage.foldername(name))[1] = (SELECT org_id::text FROM profiles WHERE id = auth.uid())
  );

-- Verificar
SELECT tablename, policyname, cmd FROM pg_policies
WHERE (schemaname = 'public' AND tablename = 'presenter_bibles')
   OR (schemaname = 'storage' AND policyname LIKE 'bibles_bucket_%');
