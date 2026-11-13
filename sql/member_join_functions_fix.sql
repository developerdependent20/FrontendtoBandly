-- ═══════════════════════════════════════════════════════════════════════
-- FIX: seguridad de alta de perfil + funciones reales al unirse por código
--
-- Corre esto DESPUÉS de sql/multi_org.sql y sql/rls_lockdown.sql.
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. CRÍTICO · profiles_insert_self no validaba role/org_id ──────────
-- Antes: WITH CHECK (id = auth.uid()) — solo comprobaba que la fila fuera
-- tuya, nunca que role/org_id fueran razonables. Cualquier cliente podía
-- mandar un INSERT directo con role:'director' y el org_id que quisiera,
-- saltándose join_organization()/create_organization() por completo y
-- quedando con acceso de director sobre ese equipo. Con el frontend ya
-- actualizado (OnboardingScreen ahora siempre crea el perfil con
-- role:'member', org_id:NULL y deja que join_organization()/
-- create_organization() decidan el resto), esta policy puede exigirlo.
DROP POLICY IF EXISTS profiles_insert_self ON profiles;
CREATE POLICY profiles_insert_self ON profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() AND role = 'member' AND org_id IS NULL);


-- ── 2. resolve_invite_code ahora también devuelve la configuración ─────
-- El frontend la necesita para poder ofrecer, a quien se une por código,
-- los roles/instrumentos REALES de ESE equipo (antes usaba una lista
-- genérica de "funciones" con ids que no coincidían con los que usa
-- "sugeridos" al agendar — un guitarrista que se unía nunca aparecía
-- sugerido para tocar guitarra).
CREATE OR REPLACE FUNCTION public.resolve_invite_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_org     organizations%ROWTYPE;
  v_members INT;
  v_limit   INT;
BEGIN
  SELECT * INTO v_org FROM organizations
   WHERE upper(invite_code) = upper(trim(p_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código de acceso inválido.');
  END IF;

  SELECT count(*) INTO v_members FROM profiles WHERE org_id = v_org.id;

  v_limit := CASE lower(coalesce(v_org.plan, 'free'))
               WHEN 'starter' THEN 25
               WHEN 'pro'     THEN 75
               WHEN 'elite'   THEN 2147483647
               ELSE 10
             END;

  IF v_members >= v_limit THEN
    RETURN jsonb_build_object('ok', false, 'error',
      format('Esta organización llegó a su límite de %s miembros.', v_limit));
  END IF;

  RETURN jsonb_build_object('ok', true, 'org_id', v_org.id, 'org_name', v_org.name, 'org_settings', v_org.settings);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_invite_code(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_invite_code(TEXT) TO authenticated;


-- ── 3. join_organization acepta las funciones elegidas al unirse ───────
-- p_functions es opcional (default '[]'), así que las llamadas existentes
-- que no lo mandan (ej. "unirse con código" desde dentro de la app, en
-- App.jsx) siguen funcionando exactamente igual que antes.
CREATE OR REPLACE FUNCTION public.join_organization(p_code TEXT, p_functions JSONB DEFAULT '[]'::jsonb)
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
  VALUES (v_org.id, auth.uid(), 'member', coalesce(p_functions, '[]'::jsonb))
  ON CONFLICT (org_id, profile_id) DO NOTHING;

  UPDATE profiles SET org_id = v_org.id, role = 'member', functions = coalesce(p_functions, '[]'::jsonb) WHERE id = auth.uid();

  RETURN jsonb_build_object('ok', true, 'org_id', v_org.id, 'org_name', v_org.name);
END;
$$;

REVOKE ALL ON FUNCTION public.join_organization(TEXT, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.join_organization(TEXT, JSONB) TO authenticated;
