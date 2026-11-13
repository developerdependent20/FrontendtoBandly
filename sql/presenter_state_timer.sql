-- Timer de escenario para Bandly Presenter / Stage Display: cuenta regresiva
-- de segmentos (prédica, ofrenda, etc.) visible solo para el equipo en
-- escenario, no para la audiencia. Se guarda como una hora de fin absoluta
-- (no "segundos restantes") para que no se desincronice por drift de reloj
-- entre dispositivos — cada pantalla calcula el restante comparando su propia
-- hora contra esta.
-- Run this in Supabase SQL Editor

ALTER TABLE presenter_state ADD COLUMN IF NOT EXISTS timer_end_at TIMESTAMPTZ;

-- Verificar
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'presenter_state';
