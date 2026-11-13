-- ═══════════════════════════════════════════════════════
-- BANDLY — Métrica (Time Signature) por secuencia
-- Ejecutar en: Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

ALTER TABLE sequences ADD COLUMN IF NOT EXISTS time_signature VARCHAR(5) DEFAULT '4/4';
