-- ═══════════════════════════════════════════════════════
-- BANDLY — ZIP único por secuencia (r2_zip_key)
-- Ejecutar en: Supabase SQL Editor
-- ═══════════════════════════════════════════════════════
-- El backend guarda cada secuencia como un único archivo ZIP en R2
-- (organizations/<org>/sequences/seq_<uuid>/multitrack.zip) y referencia
-- su ruta en esta columna. Sin ella, /api/sequences/create falla al
-- insertar el registro con un error 500 genérico ("Error al crear la secuencia").

ALTER TABLE sequences ADD COLUMN IF NOT EXISTS r2_zip_key TEXT;
