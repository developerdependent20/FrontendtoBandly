-- Audios por canción: 2das voces, 3ras voces, guías, etc.
--
-- El archivo vive en Cloudflare R2 (llave organizations/<org>/songs/<song>/
-- audios/...). Esta tabla lo relaciona con la canción y su tamaño cuenta para
-- la cuota del plan (el backend la suma en poolUsedMb). Las filas las escribe
-- solo bandly-backend con service_role; el cliente solo puede leerlas.
-- Requiere la función my_org_id() de sql/rls_lockdown.sql.
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS song_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  song_id     UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'otro',  -- voz2 | voz3 | guia | otro
  name        TEXT NOT NULL,
  r2_key      TEXT NOT NULL,
  size_bytes  BIGINT NOT NULL DEFAULT 0,
  mime_type   TEXT,
  uploaded_by UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Si ya habías corrido la primera versión (Supabase Storage), la adaptamos.
ALTER TABLE song_files ADD COLUMN IF NOT EXISTS r2_key TEXT;
ALTER TABLE song_files DROP COLUMN IF EXISTS path;
ALTER TABLE song_files DROP COLUMN IF EXISTS url;
DELETE FROM song_files WHERE r2_key IS NULL;
ALTER TABLE song_files ALTER COLUMN r2_key SET NOT NULL;
ALTER TABLE song_files ALTER COLUMN size_bytes SET DEFAULT 0;
ALTER TABLE song_files ALTER COLUMN uploaded_by DROP DEFAULT;

CREATE INDEX IF NOT EXISTS song_files_song_idx ON song_files (song_id, created_at);
CREATE INDEX IF NOT EXISTS song_files_org_idx ON song_files (org_id);

ALTER TABLE song_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS song_files_same_org ON song_files;
DROP POLICY IF EXISTS song_files_read_same_org ON song_files;
CREATE POLICY song_files_read_same_org ON song_files FOR SELECT TO authenticated
USING (org_id = public.my_org_id());

-- Verificar
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'song_files';
