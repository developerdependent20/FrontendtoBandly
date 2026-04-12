-- ═══════════════════════════════════════════════════════
-- BANDLY — Sistema de Secuencias Pro
-- Migración de Base de Datos
-- Ejecutar en: Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Tabla principal de secuencias (una por canción + tono)
CREATE TABLE IF NOT EXISTS sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),
  key VARCHAR(10),
  bpm INTEGER,
  stem_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de stems individuales (archivos de audio)
CREATE TABLE IF NOT EXISTS sequence_stems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id UUID REFERENCES sequences(id) ON DELETE CASCADE,
  original_name VARCHAR(255),
  instrument_type VARCHAR(50),
  instrument_label VARCHAR(100),
  r2_key TEXT NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  mime_type VARCHAR(100) DEFAULT 'audio/mpeg',
  duration_seconds FLOAT,
  sort_order INTEGER DEFAULT 0,
  color VARCHAR(7) DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_sequences_song ON sequences(song_id);
CREATE INDEX IF NOT EXISTS idx_sequences_org ON sequences(org_id);
CREATE INDEX IF NOT EXISTS idx_stems_sequence ON sequence_stems(sequence_id);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_stems ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad: cualquier usuario autenticado puede leer/escribir
--    (la validación de organización se hace en el backend)
CREATE POLICY "sequences_all" ON sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "stems_all" ON sequence_stems FOR ALL USING (true) WITH CHECK (true);
