-- Líneas de la timeline del DAW: LETRAS y LUCES por secuencia.
-- (La línea de SECCIONES sigue usando sequences.markers, como siempre.)
--
-- Formato (posiciones en las mismas unidades de muestras que los markers):
--   {
--     "lyrics": [{ "id": "...", "sample": 1234567, "slideId": "<id en presenter_slides.slides>" }],
--     "lights": [{ "id": "...", "sample": 2345678, "scene": "CORO AZUL" }]
--   }
--
-- Durante la reproducción el DAW escribe en presenter_state.active_marker:
--   - letra → el marker_sync de esa diapositiva (Presenter la muestra)
--   - luz   → el nombre de la escena (Bandly Lights la dispara si existe)
-- Presenter y Lights no necesitan cambios: ya escuchan esa columna.
--
-- NULL = sin cues (comportamiento de siempre).
-- Run this in Supabase SQL Editor

ALTER TABLE sequences ADD COLUMN IF NOT EXISTS timeline_lanes JSONB;

-- Verificar
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_name = 'sequences' AND column_name = 'timeline_lanes';
