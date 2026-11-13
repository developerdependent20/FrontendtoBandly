-- Encuestas simples para coordinar equipo (pregunta + opciones + un voto por
-- persona). Con RLS desde el inicio — no repetir el hueco de seguridad que
-- tuvo la tabla notifications al principio.
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, profile_id) -- un voto por persona por encuesta; cambiar de opción reemplaza el voto
);

CREATE INDEX IF NOT EXISTS idx_polls_org_id ON polls(org_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- polls: cualquiera de la misma organización puede ver y crear; solo el
-- creador o un director puede cerrarla/editarla.
CREATE POLICY "polls_select_same_org" ON polls FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = polls.org_id));

CREATE POLICY "polls_insert_same_org" ON polls FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND org_id = polls.org_id)
  );

CREATE POLICY "polls_update_creator_or_director" ON polls FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND org_id = polls.org_id AND (role = 'director' OR id = polls.created_by)
    )
  );

CREATE POLICY "polls_delete_creator_or_director" ON polls FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND org_id = polls.org_id AND (role = 'director' OR id = polls.created_by)
    )
  );

-- poll_options: se crean junto con la encuesta (solo su creador), se leen
-- por cualquiera de la misma organización.
CREATE POLICY "poll_options_select_same_org" ON poll_options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM polls p JOIN profiles pr ON pr.org_id = p.org_id
      WHERE p.id = poll_options.poll_id AND pr.id = auth.uid()
    )
  );

CREATE POLICY "poll_options_insert_by_poll_creator" ON poll_options FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_options.poll_id AND p.created_by = auth.uid())
  );

-- poll_votes: cualquiera de la misma organización lee los resultados; cada
-- quien solo puede insertar/actualizar/borrar su propio voto.
CREATE POLICY "poll_votes_select_same_org" ON poll_votes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM polls p JOIN profiles pr ON pr.org_id = p.org_id
      WHERE p.id = poll_votes.poll_id AND pr.id = auth.uid()
    )
  );

CREATE POLICY "poll_votes_insert_own" ON poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM polls p JOIN profiles pr ON pr.org_id = p.org_id
      WHERE p.id = poll_votes.poll_id AND pr.id = auth.uid()
    )
  );

CREATE POLICY "poll_votes_update_own" ON poll_votes FOR UPDATE TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "poll_votes_delete_own" ON poll_votes FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- Verificar
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('polls', 'poll_options', 'poll_votes')
ORDER BY tablename, cmd;
