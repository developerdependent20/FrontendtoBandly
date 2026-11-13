-- ═══════════════════════════════════════════════════════════════════════
-- REGISTRO DE ERRORES
--
-- Hoy, si a una iglesia se le cae Presenter un domingo a las 9am, nadie se
-- entera nunca: ni cuántas veces pasó, ni a cuántos, ni por qué. Con clientes
-- pagando eso es operar a ciegas.
--
-- Esto no reemplaza a Sentry, pero responde la pregunta que importa —
-- "¿se rompió algo, a quién, cuántas veces?" — sin cuentas de terceros, sin
-- dependencias nuevas y sin costo: usa la base que ya tienes.
--
-- Se puede migrar a Sentry después; mientras tanto, no estás ciego.
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS error_log (
  id          BIGSERIAL PRIMARY KEY,
  org_id      UUID REFERENCES organizations(id) ON DELETE SET NULL,
  profile_id  UUID REFERENCES profiles(id)      ON DELETE SET NULL,
  app         TEXT,          -- 'web' | 'presenter' | 'lights' | 'daw'
  message     TEXT NOT NULL,
  stack       TEXT,
  url         TEXT,
  user_agent  TEXT,
  app_version TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS error_log_created_idx ON error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS error_log_org_idx     ON error_log(org_id);

ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS error_log_insert ON error_log;
DROP POLICY IF EXISTS error_log_select_own ON error_log;

-- Cualquiera que haya iniciado sesión puede reportar un error suyo.
-- No puede reportar en nombre de otro: profile_id tiene que ser él.
CREATE POLICY error_log_insert ON error_log FOR INSERT TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Nadie lee los errores desde la app. Se consultan desde el panel de Supabase
-- o con la service_role del backend — así un cliente no ve los fallos de otro.
-- (Sin policy de SELECT, la tabla queda cerrada para anon y authenticated.)


-- ── Consultas útiles ───────────────────────────────────────────────────
-- Qué se rompió en los últimos 7 días, agrupado:
--
--   SELECT app, message, count(*) AS veces,
--          count(DISTINCT profile_id) AS personas,
--          max(created_at) AS ultima_vez
--     FROM error_log
--    WHERE created_at > now() - interval '7 days'
--    GROUP BY app, message
--    ORDER BY veces DESC;
--
-- Qué le pasó a una organización el domingo pasado:
--
--   SELECT created_at, app, message
--     FROM error_log
--    WHERE org_id = '...'
--    ORDER BY created_at DESC LIMIT 50;

SELECT 'error_log lista' AS estado;
