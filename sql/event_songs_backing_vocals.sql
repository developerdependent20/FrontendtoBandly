-- Coristas por canción: [{ "member_id": "<uuid>", "role": "melodia" | "segunda" }]
-- Ejecutar en el SQL Editor de Supabase
ALTER TABLE event_songs
ADD COLUMN IF NOT EXISTS backing_vocals JSONB DEFAULT '[]'::jsonb;
