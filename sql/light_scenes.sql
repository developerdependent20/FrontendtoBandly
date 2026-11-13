-- Escenas de Bandly Lights visibles para el DAW.
--
-- Bandly Lights guarda sus escenas en la propia computadora (localStorage).
-- Cuando tiene "Sync con DAW" activado, sube SOLO los nombres aquí, una fila
-- por organización. El DAW los lee para que la línea LUCES (tecla K) ofrezca
-- las escenas que existen de verdad, en vez de adivinar el nombre exacto.
--
-- Correr DESPUÉS de sql/rls_lockdown.sql (usa la función my_org_id()).
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS light_scenes (
  org_id     UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  names      JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE light_scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS light_scenes_same_org ON light_scenes;
CREATE POLICY light_scenes_same_org ON light_scenes FOR ALL TO authenticated
USING (org_id = public.my_org_id())
WITH CHECK (org_id = public.my_org_id());

-- Realtime: el DAW se entera al instante cuando creas o renombras una escena.
ALTER TABLE light_scenes REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE light_scenes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Verificar
SELECT * FROM light_scenes;
