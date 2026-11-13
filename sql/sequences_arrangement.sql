-- Arreglo no destructivo por secuencia: "sáltate el verso 2", "repite el coro
-- dos veces". Es una lista ordenada de bloques que apuntan a trozos del audio
-- original — el audio nunca se corta ni se re-exporta, así que un arreglo se
-- edita y se deshace sin perder nada.
--
-- Formato (mismas unidades de muestras en las que se guardan los markers):
--   [{ "uid": "...", "label": "CORO", "color": "#ef4444",
--      "start": 1234567, "end": 2345678 }, ...]
--
-- NULL = canción completa, de corrido (comportamiento de siempre).
-- Run this in Supabase SQL Editor

ALTER TABLE sequences ADD COLUMN IF NOT EXISTS arrangement JSONB;

-- Verificar
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sequences';
