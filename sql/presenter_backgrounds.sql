-- Fondos de letras propios de Bandly Presenter, por organización. Antes los
-- fondos eran fijos (empaquetados con la app, iguales para todos); esto deja
-- que cada equipo suba los suyos y los vea guardados cada vez que abre la app,
-- sin importar en qué computadora esté.
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS presenter_backgrounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presenter_backgrounds_org_id ON presenter_backgrounds(org_id);

ALTER TABLE presenter_backgrounds ENABLE ROW LEVEL SECURITY;

-- Cualquiera de la misma organización ve los fondos que subió el equipo.
CREATE POLICY "presenter_backgrounds_select_same_org" ON presenter_backgrounds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = presenter_backgrounds.org_id));

-- Solo puedes subir fondos firmados como tú mismo, y a tu propia organización.
CREATE POLICY "presenter_backgrounds_insert_same_org" ON presenter_backgrounds FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = presenter_backgrounds.org_id)
  );

-- Borrar: quien lo subió, o un director de la misma organización.
CREATE POLICY "presenter_backgrounds_delete_uploader_or_director" ON presenter_backgrounds FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND org_id = presenter_backgrounds.org_id AND (role = 'director' OR id = presenter_backgrounds.uploaded_by)
    )
  );

-- Verificar
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'presenter_backgrounds';
