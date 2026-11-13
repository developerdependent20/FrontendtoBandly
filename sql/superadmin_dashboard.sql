-- ═══════════════════════════════════════════════════════════════════════
-- PANEL DE SUPERADMIN: datos en vivo
--
-- El panel anterior dependía de un backend en Render (/api/admin/*) que solo
-- devolvía nombre, plan y almacenamiento. Aquí los datos salen directo de la
-- base, así que "se actualizan solos": el panel solo vuelve a preguntar.
--
-- Qué agrega:
--   · profiles.last_seen_at / session_count / timezone / locale / country
--     (la app los llena sola con touch_presence() al abrir y cada 5 min)
--   · super_admins: quién puede ver el panel (se valida en la BASE, no solo
--     escondiendo el botón en el frontend)
--   · admin_overview / admin_users / admin_orgs / admin_errors
--
-- Correr en Supabase -> SQL Editor. Es idempotente.
-- Para dar acceso a otra persona:
--   INSERT INTO super_admins(email) VALUES ('otra@persona.com');
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. Quién es superadmin ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admins (email TEXT PRIMARY KEY);
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;   -- sin policies: cerrada
INSERT INTO super_admins(email) VALUES ('dependentmix@gmail.com') ON CONFLICT DO NOTHING;

-- El claim "email" del JWT va firmado por Supabase: no se puede falsificar.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admins
     WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
$$;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;


-- ── 2. Presencia ───────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at   TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_count  INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country        TEXT;

-- SECURITY DEFINER para no chocar con protect_profile_columns y para que el
-- usuario solo pueda tocar SU fila y SOLO estas columnas.
CREATE OR REPLACE FUNCTION public.touch_presence(
  p_timezone TEXT DEFAULT NULL,
  p_locale TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_new_session BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE profiles
     SET last_seen_at  = now(),
         session_count = coalesce(session_count, 0) + CASE WHEN p_new_session THEN 1 ELSE 0 END,
         timezone      = coalesce(left(p_timezone, 64), timezone),
         locale        = coalesce(left(p_locale, 16), locale),
         country       = coalesce(nullif(upper(left(p_country, 2)), ''), country)
   WHERE id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.touch_presence(TEXT, TEXT, TEXT, BOOLEAN) FROM public;
GRANT EXECUTE ON FUNCTION public.touch_presence(TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;


-- ── 3. Resumen general ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r JSONB;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),

    'users_total',   (SELECT count(*) FROM auth.users),
    'users_new_7d',  (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'users_new_30d', (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
    'online_now',    (SELECT count(*) FROM profiles WHERE last_seen_at > now() - interval '5 minutes'),
    'dau',           (SELECT count(*) FROM profiles WHERE last_seen_at > now() - interval '1 day'),
    'wau',           (SELECT count(*) FROM profiles WHERE last_seen_at > now() - interval '7 days'),
    'mau',           (SELECT count(*) FROM profiles WHERE last_seen_at > now() - interval '30 days'),
    'sessions_total',(SELECT coalesce(sum(session_count), 0) FROM profiles),

    'orgs_total',    (SELECT count(*) FROM organizations),
    'songs_total',   (SELECT count(*) FROM songs),
    'events_total',  (SELECT count(*) FROM events),
    'sequences_total',(SELECT count(*) FROM sequences),
    'storage_used_mb',(SELECT coalesce(sum(storage_used_mb), 0) FROM organizations),
    'errors_24h',    (SELECT count(*) FROM error_log WHERE created_at > now() - interval '1 day'),
    'errors_7d',     (SELECT count(*) FROM error_log WHERE created_at > now() - interval '7 days'),

    -- Registros por día, últimos 30 (con ceros para los días vacíos).
    'signups_by_day', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', coalesce(c.n, 0)) ORDER BY d), '[]'::jsonb)
        FROM generate_series(current_date - 29, current_date, interval '1 day') d
        LEFT JOIN (
          SELECT created_at::date AS day, count(*) AS n FROM auth.users
           WHERE created_at > current_date - 30 GROUP BY 1
        ) c ON c.day = d::date
    ),

    -- Usuarios activos por día, últimos 30.
    'active_by_day', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'n', coalesce(c.n, 0)) ORDER BY d), '[]'::jsonb)
        FROM generate_series(current_date - 29, current_date, interval '1 day') d
        LEFT JOIN (
          SELECT last_seen_at::date AS day, count(*) AS n FROM profiles
           WHERE last_seen_at > current_date - 30 GROUP BY 1
        ) c ON c.day = d::date
    ),

    'plans', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('plan', plan, 'n', n) ORDER BY n DESC), '[]'::jsonb)
        FROM (SELECT lower(coalesce(plan, 'free')) AS plan, count(*) AS n FROM organizations GROUP BY 1) t
    ),

    'countries', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('country', country, 'n', n) ORDER BY n DESC), '[]'::jsonb)
        FROM (
          SELECT coalesce(country, '??') AS country, count(*) AS n
            FROM profiles GROUP BY 1 ORDER BY 2 DESC LIMIT 12
        ) t
    ),

    'top_errors', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'app', app, 'message', message, 'n', n, 'people', people, 'last', last) ORDER BY n DESC), '[]'::jsonb)
        FROM (
          SELECT app, left(message, 160) AS message, count(*) AS n,
                 count(DISTINCT profile_id) AS people, max(created_at) AS last
            FROM error_log
           WHERE created_at > now() - interval '7 days'
           GROUP BY app, left(message, 160) ORDER BY n DESC LIMIT 8
        ) t
    )
  ) INTO r;

  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;


-- ── 4. Usuarios ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_users()
RETURNS TABLE (
  id UUID, email TEXT, full_name TEXT, role TEXT, org_id UUID, org_name TEXT, orgs_count INT,
  plan TEXT, country TEXT, timezone TEXT, session_count INT,
  created_at TIMESTAMPTZ, last_seen_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ, provider TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  RETURN QUERY
  SELECT u.id, u.email::TEXT, p.full_name::TEXT, p.role::TEXT, p.org_id, o.name::TEXT,
         (SELECT count(*)::INT FROM org_members m WHERE m.profile_id = u.id),
         lower(coalesce(o.plan, 'free'))::TEXT,
         p.country::TEXT, p.timezone::TEXT, coalesce(p.session_count, 0),
         u.created_at, p.last_seen_at, u.last_sign_in_at,
         coalesce(u.raw_app_meta_data ->> 'provider', 'email')::TEXT
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    LEFT JOIN organizations o ON o.id = p.org_id
   ORDER BY coalesce(p.last_seen_at, u.last_sign_in_at, u.created_at) DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_users() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_users() TO authenticated;


-- ── 5. Organizaciones ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_orgs()
RETURNS TABLE (
  id UUID, name TEXT, invite_code TEXT, plan TEXT, subscription_status TEXT,
  owner_email TEXT, members INT, active_7d INT, songs INT, events INT, events_30d INT,
  storage_used_mb NUMERIC, storage_limit_mb INT, errors_7d INT,
  created_at TIMESTAMPTZ, last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  RETURN QUERY
  SELECT o.id, o.name::TEXT, o.invite_code::TEXT, lower(coalesce(o.plan, 'free'))::TEXT,
         (to_jsonb(o) ->> 'subscription_status')::TEXT,
         (SELECT u.email::TEXT FROM auth.users u WHERE u.id = o.owner_id),
         (SELECT count(*)::INT FROM org_members m WHERE m.org_id = o.id),
         (SELECT count(*)::INT FROM org_members m JOIN profiles p ON p.id = m.profile_id
           WHERE m.org_id = o.id AND p.last_seen_at > now() - interval '7 days'),
         (SELECT count(*)::INT FROM songs s WHERE s.org_id = o.id),
         (SELECT count(*)::INT FROM events e WHERE e.org_id = o.id),
         (SELECT count(*)::INT FROM events e WHERE e.org_id = o.id AND (to_jsonb(e) ->> 'created_at')::timestamptz > now() - interval '30 days'),
         coalesce(o.storage_used_mb, 0)::NUMERIC, coalesce(o.storage_limit_mb, 300)::INT,
         (SELECT count(*)::INT FROM error_log l WHERE l.org_id = o.id AND l.created_at > now() - interval '7 days'),
         (to_jsonb(o) ->> 'created_at')::timestamptz,
         (SELECT max(p.last_seen_at) FROM org_members m JOIN profiles p ON p.id = m.profile_id WHERE m.org_id = o.id)
    FROM organizations o
   ORDER BY 16 DESC NULLS LAST;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_orgs() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_orgs() TO authenticated;


-- ── 6. Errores recientes ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_errors(p_limit INT DEFAULT 100)
RETURNS TABLE (
  id BIGINT, created_at TIMESTAMPTZ, app TEXT, message TEXT, url TEXT,
  app_version TEXT, user_email TEXT, org_name TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  RETURN QUERY
  SELECT l.id, l.created_at, l.app::TEXT, left(l.message, 300), l.url::TEXT, l.app_version::TEXT,
         (SELECT u.email::TEXT FROM auth.users u WHERE u.id = l.profile_id),
         (SELECT o.name::TEXT FROM organizations o WHERE o.id = l.org_id)
    FROM error_log l
   ORDER BY l.created_at DESC
   LIMIT least(coalesce(p_limit, 100), 500);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_errors(INT) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_errors(INT) TO authenticated;


SELECT 'superadmin dashboard listo' AS estado;
