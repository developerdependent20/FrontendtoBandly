-- El "Permitir Declinaciones" pasa de ser una configuración global de toda la
-- organización a ser por evento (cada evento decide si se puede declinar o no).
-- Run this in Supabase SQL Editor

ALTER TABLE events
ADD COLUMN IF NOT EXISTS allow_declines BOOLEAN DEFAULT true;

-- Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'events'
ORDER BY ordinal_position;
