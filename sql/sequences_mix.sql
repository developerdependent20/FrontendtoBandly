-- ═══════════════════════════════════════════════════════════════════════
-- MEZCLA ESTÉREO PARA ESCUCHA RÁPIDA
--
-- Un multitrack son cientos de MB que hay que descomprimir y decodificar
-- entero antes de oír una nota. En un celular eso mata la pestaña de Safari;
-- incluso en computador son 30-40 segundos de espera solo para repasar.
--
-- Ahora, al subir una secuencia, el navegador genera además un MP3 de ~5 MB
-- con todos los stems sumados. Sirve para repasar desde el celular, en el bus,
-- antes del ensayo. El control pista por pista sigue siendo de computador.
--
-- La mezcla la genera el navegador que sube (ya tiene los stems en memoria),
-- así que no cuesta CPU de servidor. Es opcional: si falla, la secuencia queda
-- igual de válida y simplemente no se ofrece la escucha rápida.
-- Run this in Supabase SQL Editor

ALTER TABLE sequences ADD COLUMN IF NOT EXISTS r2_mix_key TEXT;

-- Verificar
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_name = 'sequences' AND column_name IN ('r2_zip_key','r2_mix_key');
