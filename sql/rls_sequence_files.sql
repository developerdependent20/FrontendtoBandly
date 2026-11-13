-- ═══════════════════════════════════════════════════════════════════════
-- ÚLTIMO HUECO: sequence_files
--
-- La policy se llamaba "Users can view their org sequences" pero su condición
-- real era `true`: cualquiera, sin iniciar sesión, podía leer la tabla entera.
-- El nombre decía una cosa y el código hacía otra, por eso pasó desapercibida.
--
-- check_rls.sh nunca la probó porque yo no la incluí en la lista — no sabía
-- que existía. De ahí la lección: la lista de tablas a revisar hay que sacarla
-- de la base, no de la memoria.
--
-- A esta tabla solo la toca el backend (índice de archivos sueltos en R2, ruta
-- legacy), y el backend usa la service_role key, que se salta RLS por
-- completo. Ningún frontend la consulta. Así que se cierra del todo: sin
-- policies, ningún cliente la ve, y el backend sigue trabajando igual.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view their org sequences" ON sequence_files;
DROP POLICY IF EXISTS "Staff can insert sequences" ON sequence_files;

-- RLS ya está activo; al quedarse sin policies, queda cerrada para anon y para
-- authenticated. La service_role del backend no se ve afectada.
ALTER TABLE sequence_files ENABLE ROW LEVEL SECURITY;


-- Comprobación: no debe quedar ninguna fila.
SELECT policyname, cmd, roles, qual
  FROM pg_policies
 WHERE tablename = 'sequence_files';
