-- ═══════════════════════════════════════════════════════════════════════
-- MULTI-ORGANIZACIÓN
--
-- Hasta ahora `profiles.org_id` era un solo UUID: un usuario = una
-- organización. Por eso "hasta 3 / 10 / ilimitados equipos" se vendía pero no
-- se podía usar.
--
-- Idea para no reescribir la app: `profiles.org_id` deja de significar "mi
-- única organización" y pasa a significar "la organización en la que estoy
-- ahora mismo". Las membresías viven en una tabla nueva. Así los ~38
-- componentes que ya leen `profile.org_id` siguen funcionando sin tocarlos, y
-- cambiar de equipo es mover ese campo (validando antes que seas miembro).
--
-- Reglas comerciales que implementa:
--   · El plan limita cuántas organizaciones puedes CREAR (ser dueño).
--       free 1 · starter 3 · pro 10 · elite ilimitadas
--   · PERTENECER a varias organizaciones es gratis para todos: el músico que
--     toca en dos iglesias no paga dos veces, cada iglesia ya paga la suya.
--   · El almacenamiento del plan se REPARTE entre las organizaciones del mismo
--     dueño. Si fuera por organización, un Elite con organizaciones ilimitadas
--     tendría almacenamiento infinito por $37/mes.
--
-- Correr DESPUÉS de sql/rls_lockdown.sql.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. Membresías ──────────────────────────────────────────────────────
-- El rol y las funciones son POR organización: puedes ser director en tu
-- iglesia y guitarrista invitado en otra.
CREATE TABLE IF NOT EXISTS org_members (
  org_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id)      ON DELETE CASCADE,
  role       TEXT  DEFAULT 'member',
  functions  JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, profile_id)
);

CREATE INDEX IF NOT EXISTS org_members_profile_idx ON org_members(profile_id);

-- Todo el mundo que ya estaba en una organización conserva su rol y funciones.
INSERT INTO org_members (org_id, profile_id, role, functions)
SELECT p.org_id, p.id, coalesce(p.role, 'member'),
       CASE
         WHEN p.functions IS NULL THEN '[]'::jsonb
         WHEN jsonb_typeof(to_jsonb(p.functions)) = 'array' THEN to_jsonb(p.functions)
         ELSE '[]'::jsonb
       END
  FROM profiles p
 WHERE p.org_id IS NOT NULL
ON CONFLICT (org_id, profile_id) DO NOTHING;


-- ── 2. Dueño de cada organización (quién la paga) ──────────────────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Para las que ya existen: el director más antiguo.
UPDATE organizations o
   SET owner_id = sub.id
  FROM (
    SELECT DISTINCT ON (org_id) org_id, id
      FROM profiles
     WHERE org_id IS NOT NULL AND role = 'director'
     ORDER BY org_id, created_at NULLS LAST
  ) sub
 WHERE sub.org_id = o.id AND o.owner_id IS NULL;


-- ── 3. Helpers ─────────────────────────────────────────────────────────
-- Todas las organizaciones a las que pertenezco (no solo la activa).
-- SECURITY DEFINER para que una policy pueda usarla sin recursión.
CREATE OR REPLACE FUNCTION public.my_org_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT org_id FROM org_members WHERE profile_id = auth.uid() $$;

-- Cuántas organizaciones puede tener el dueño según su suscripción.
CREATE OR REPLACE FUNCTION public.org_quota_for(p_profile UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE lower(coalesce((SELECT plan_id FROM profiles WHERE id = p_profile), 'free'))
           WHEN 'starter' THEN 3
           WHEN 'pro'     THEN 10
           WHEN 'elite'   THEN 2147483647
           ELSE 1
         END
$$;

-- Almacenamiento: el plan se reparte entre las organizaciones del mismo dueño.
-- Devuelve (usado_mb, limite_mb) para la organización que se le pase.
CREATE OR REPLACE FUNCTION public.org_storage_pool(p_org_id UUID)
RETURNS TABLE (used_mb NUMERIC, limit_mb INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH target AS (SELECT owner_id, storage_limit_mb FROM organizations WHERE id = p_org_id)
  SELECT
    coalesce((
      SELECT sum(o.storage_used_mb)
        FROM organizations o, target t
       WHERE (t.owner_id IS NOT NULL AND o.owner_id = t.owner_id)
          OR (t.owner_id IS NULL AND o.id = p_org_id)
    ), 0)::NUMERIC,
    coalesce((SELECT storage_limit_mb FROM target), 300)::INT
$$;


-- ── 4. RLS de org_members ──────────────────────────────────────────────
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_members_select ON org_members;
DROP POLICY IF EXISTS org_members_update ON org_members;
DROP POLICY IF EXISTS org_members_delete ON org_members;

-- Ves las membresías de las organizaciones a las que perteneces.
CREATE POLICY org_members_select ON org_members FOR SELECT TO authenticated
USING (org_id IN (SELECT public.my_org_ids()));

-- Solo un director de esa organización cambia roles/funciones o saca gente.
-- Entrar se hace por join_organization()/create_organization(), nunca por
-- INSERT directo: si no, cualquiera se mete al equipo que quiera.
CREATE POLICY org_members_update ON org_members FOR UPDATE TO authenticated
USING (public.is_director() AND org_id = public.my_org_id())
WITH CHECK (public.is_director() AND org_id = public.my_org_id());

CREATE POLICY org_members_delete ON org_members FOR DELETE TO authenticated
USING (public.is_director() AND org_id = public.my_org_id());


-- ── 5. Ver a los compañeros ────────────────────────────────────────────
-- La lista del equipo ya no sale de profiles.org_id (que ahora es "dónde
-- estoy parado"), sino de la membresía. Sin esto, el músico cuya organización
-- activa fuera otra desaparecía del roster de esta.
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM org_members m
     WHERE m.profile_id = profiles.id
       AND m.org_id IN (SELECT public.my_org_ids())
  )
);


-- ── 6. Crear una organización ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_organization(
  p_name TEXT,
  p_invite_code TEXT,
  p_settings JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owned INT;
  v_quota INT;
  v_org   organizations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes iniciar sesión.');
  END IF;

  SELECT count(*) INTO v_owned FROM organizations WHERE owner_id = auth.uid();
  v_quota := public.org_quota_for(auth.uid());

  IF v_owned >= v_quota THEN
    RETURN jsonb_build_object('ok', false, 'error',
      format('Tu plan permite %s organización(es). Mejora el plan para crear más.', v_quota));
  END IF;

  BEGIN
    INSERT INTO organizations (name, invite_code, settings, owner_id)
    VALUES (p_name, upper(trim(p_invite_code)), p_settings, auth.uid())
    RETURNING * INTO v_org;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ese código de equipo ya está en uso. ¡Elige otro!');
  END;

  INSERT INTO org_members (org_id, profile_id, role, functions)
  VALUES (v_org.id, auth.uid(), 'director', '[]'::jsonb)
  ON CONFLICT (org_id, profile_id) DO NOTHING;

  UPDATE profiles SET org_id = v_org.id, role = 'director' WHERE id = auth.uid();

  RETURN jsonb_build_object('ok', true, 'org_id', v_org.id, 'org_name', v_org.name);
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization(TEXT, TEXT, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.create_organization(TEXT, TEXT, JSONB) TO authenticated;


-- ── 7. Cambiar de organización activa ──────────────────────────────────
-- El rol y las funciones se copian desde la membresía al perfil: así toda la
-- app, que ya lee profiles.role y profiles.functions, funciona sin cambios.
CREATE OR REPLACE FUNCTION public.switch_organization(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_m org_members%ROWTYPE;
BEGIN
  SELECT * INTO v_m FROM org_members
   WHERE profile_id = auth.uid() AND org_id = p_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No perteneces a esa organización.');
  END IF;

  UPDATE profiles
     SET org_id    = v_m.org_id,
         role      = coalesce(v_m.role, 'member'),
         functions = v_m.functions
   WHERE id = auth.uid();

  RETURN jsonb_build_object('ok', true, 'org_id', p_org_id);
END;
$$;

REVOKE ALL ON FUNCTION public.switch_organization(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.switch_organization(UUID) TO authenticated;


-- ── 8. Unirse: ahora también crea la membresía ─────────────────────────
CREATE OR REPLACE FUNCTION public.join_organization(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org      organizations%ROWTYPE;
  v_members  INT;
  v_limit    INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes iniciar sesión.');
  END IF;

  SELECT * INTO v_org FROM organizations
   WHERE upper(invite_code) = upper(trim(p_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código no encontrado. Revisa que esté bien escrito.');
  END IF;

  IF EXISTS (SELECT 1 FROM org_members WHERE org_id = v_org.id AND profile_id = auth.uid()) THEN
    -- Ya eres miembro: no es error, simplemente te lleva allá.
    PERFORM public.switch_organization(v_org.id);
    RETURN jsonb_build_object('ok', true, 'org_id', v_org.id, 'org_name', v_org.name, 'already', true);
  END IF;

  SELECT count(*) INTO v_members FROM org_members WHERE org_id = v_org.id;

  v_limit := CASE lower(coalesce(v_org.plan, 'free'))
               WHEN 'starter' THEN 25
               WHEN 'pro'     THEN 75
               WHEN 'elite'   THEN 2147483647
               ELSE 10
             END;

  IF v_members >= v_limit THEN
    RETURN jsonb_build_object('ok', false, 'error',
      format('Esta organización llegó a su límite de %s miembros. El director debe mejorar el plan.', v_limit));
  END IF;

  INSERT INTO org_members (org_id, profile_id, role, functions)
  VALUES (v_org.id, auth.uid(), 'member', '[]'::jsonb)
  ON CONFLICT (org_id, profile_id) DO NOTHING;

  UPDATE profiles SET org_id = v_org.id, role = 'member' WHERE id = auth.uid();

  RETURN jsonb_build_object('ok', true, 'org_id', v_org.id, 'org_name', v_org.name);
END;
$$;


-- ── 9. Cambiar el rol/funciones de un miembro ──────────────────────────
-- Antes esto era un UPDATE directo sobre `profiles` desde el navegador, y ahí
-- estaba el agujero: cualquiera podía abrir la consola y ponerse 'director'.
-- Ahora solo un director de ESA organización puede hacerlo, y nunca sobre sí
-- mismo. Además escribe en los dos lados: la membresía (la verdad) y el perfil
-- (la copia que lee la app, solo si esa es su organización activa).
CREATE OR REPLACE FUNCTION public.set_member_role(
  p_org_id UUID,
  p_profile UUID,
  p_role TEXT DEFAULT NULL,
  p_functions JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_dir BOOLEAN;
BEGIN
  SELECT coalesce(role = 'director', false) INTO v_is_dir
    FROM org_members WHERE org_id = p_org_id AND profile_id = auth.uid();

  IF NOT coalesce(v_is_dir, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo un director de esta organización puede hacer esto.');
  END IF;

  IF p_role IS NOT NULL AND p_profile = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No puedes cambiar tu propio rol.');
  END IF;

  UPDATE org_members
     SET role      = coalesce(p_role, role),
         functions = coalesce(p_functions, functions)
   WHERE org_id = p_org_id AND profile_id = p_profile;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Esa persona no pertenece a esta organización.');
  END IF;

  -- Reflejarlo en el perfil solo si está parado en esta organización.
  UPDATE profiles
     SET role      = coalesce(p_role, role),
         functions = coalesce(p_functions, functions)
   WHERE id = p_profile AND org_id = p_org_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_member_role(UUID, UUID, TEXT, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, UUID, TEXT, JSONB) TO authenticated;


-- Sacar a alguien del equipo (solo director de esa organización).
CREATE OR REPLACE FUNCTION public.remove_member(p_org_id UUID, p_profile UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_dir BOOLEAN;
  v_dirs   INT;
BEGIN
  SELECT coalesce(role = 'director', false) INTO v_is_dir
    FROM org_members WHERE org_id = p_org_id AND profile_id = auth.uid();

  IF NOT coalesce(v_is_dir, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo un director de esta organización puede hacer esto.');
  END IF;

  SELECT count(*) INTO v_dirs FROM org_members WHERE org_id = p_org_id AND role = 'director';
  IF v_dirs <= 1 AND EXISTS (SELECT 1 FROM org_members WHERE org_id = p_org_id AND profile_id = p_profile AND role = 'director') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No puedes eliminar al único director de la organización.');
  END IF;

  DELETE FROM org_members WHERE org_id = p_org_id AND profile_id = p_profile;

  -- Si estaba parado ahí, queda sin organización activa.
  UPDATE profiles SET org_id = NULL WHERE id = p_profile AND org_id = p_org_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.remove_member(UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.remove_member(UUID, UUID) TO authenticated;


-- ── 10. Mis organizaciones (para el selector) ──────────────────────────
CREATE OR REPLACE FUNCTION public.my_organizations()
RETURNS TABLE (org_id UUID, name TEXT, role TEXT, is_owner BOOLEAN, plan TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT o.id, o.name::TEXT, m.role::TEXT, (o.owner_id = auth.uid()), o.plan::TEXT
    FROM org_members m
    JOIN organizations o ON o.id = m.org_id
   WHERE m.profile_id = auth.uid()
   ORDER BY o.name
$$;

REVOKE ALL ON FUNCTION public.my_organizations() FROM public;
GRANT EXECUTE ON FUNCTION public.my_organizations() TO authenticated;


-- ── Comprobación ───────────────────────────────────────────────────────
SELECT o.name AS organizacion,
       (SELECT count(*) FROM org_members m WHERE m.org_id = o.id) AS miembros,
       (SELECT full_name FROM profiles WHERE id = o.owner_id)     AS dueno
  FROM organizations o
 ORDER BY o.name;
