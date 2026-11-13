-- RLS para la tabla notifications (creada en notifications_table.sql).
-- Sin esto, cualquier usuario logueado de CUALQUIER organización puede leer o
-- escribir notificaciones de otros — incluyendo razones de declinación, que
-- a veces son información personal sensible.
-- Run this in Supabase SQL Editor

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Cada quien ve solo sus propias notificaciones.
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Cada quien solo puede marcar como leídas (u otro update) sus propias notificaciones.
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

-- Insertar: solo puedes mandar notificaciones firmadas como tú mismo
-- (actor_id = tu id), y solo a gente de tu misma organización — evita
-- suplantar a otro usuario o mandar notificaciones cruzadas entre orgs.
CREATE POLICY "notifications_insert_same_org" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid() AND me.org_id = org_id
    )
    AND EXISTS (
      SELECT 1 FROM profiles target
      WHERE target.id = profile_id AND target.org_id = org_id
    )
  );

-- Verificar
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'notifications';
