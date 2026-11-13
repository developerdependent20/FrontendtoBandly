-- ═══════════════════════════════════════════════════════════════════════
-- CIERRE DE FUGA: profiles / organizations / sequences / sequence_stems
--
-- Estado comprobado antes de esta migración (scripts/check_rls.sh, sin login,
-- solo con la llave pública que ya viaja dentro de la app):
--     profiles         31 filas visibles
--     organizations     8 filas visibles   <- incluye invite_code y datos de plan
--     sequences        20 filas visibles   <- incluye r2_zip_key (ruta al audio)
--     sequence_stems  204 filas visibles
--
-- Es decir: cualquier persona en internet podía leer los correos de todos los
-- usuarios, los códigos de invitación de todas las organizaciones y las rutas
-- de los multitracks. Esto lo cierra.
--
-- CÓMO CORRERLO
--   1. Supabase -> SQL Editor -> pega todo -> Run.
--   2. Vuelve a correr: bash scripts/check_rls.sh
--      Las cuatro tablas deben quedar en 0.
--   3. Prueba la app: entrar, ver equipo, abrir una canción, unirse con código.
--
-- SI ALGO SE ROMPE, vuelve atrás con el bloque ROLLBACK del final.
-- ═══════════════════════════════════════════════════════════════════════


-- ── Helpers ────────────────────────────────────────────────────────────
-- Van con SECURITY DEFINER a propósito: una policy sobre `profiles` que
-- consulte `profiles` se llama a sí misma y Postgres aborta por recursión
-- infinita. Estas funciones leen saltándose RLS y cortan ese ciclo.

CREATE OR REPLACE FUNCTION public.my_org_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT org_id FROM profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.is_director()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coalesce((SELECT role FROM profiles WHERE id = auth.uid()) = 'director', false) $$;

-- El backend (webhook de Paddle, tareas administrativas) usa la service_role
-- key, que se salta RLS. Los triggers NO se la saltan, así que necesitan poder
-- distinguirlo para que el webhook sí pueda escribir el plan.
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$ SELECT coalesce(auth.jwt() ->> 'role', '') = 'service_role' $$;


-- ── profiles ───────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_insert_self ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;

-- Ves tu propia ficha y la de tus compañeros de organización. Nada más.
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (org_id IS NOT NULL AND org_id = public.my_org_id())
);

-- En el registro cada quien crea su propia fila, no la de otro.
CREATE POLICY profiles_insert_self ON profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- Editas lo tuyo; un director edita a los de su organización.
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated
USING (
  id = auth.uid()
  OR (public.is_director() AND org_id IS NOT NULL AND org_id = public.my_org_id())
)
WITH CHECK (
  id = auth.uid()
  OR (public.is_director() AND org_id = public.my_org_id())
);

-- RLS controla FILAS, no COLUMNAS: sin esto, la policy de arriba deja que
-- cualquiera edite su propia fila... incluido su propio `role`. Un miembro
-- abría la consola del navegador y se hacía director.
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_service_role() THEN RETURN NEW; END IF;

  -- El rol solo lo cambia un director de la misma organización, nunca uno mismo.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_director() OR OLD.org_id IS DISTINCT FROM public.my_org_id() OR NEW.id = auth.uid() THEN
      RAISE EXCEPTION 'No puedes cambiar el rol';
    END IF;
  END IF;

  -- Entrar a una organización se hace por join_organization(), que valida el
  -- código y el cupo. Aquí solo se permite SALIR (quedarse sin organización),
  -- que es lo que hace un director al retirar a alguien del equipo.
  IF NEW.org_id IS DISTINCT FROM OLD.org_id AND NEW.org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Usa join_organization() para unirte a una organización';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_columns ON profiles;
CREATE TRIGGER trg_protect_profile_columns
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();


-- ── organizations ──────────────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organizations_select ON organizations;
DROP POLICY IF EXISTS organizations_insert ON organizations;
DROP POLICY IF EXISTS organizations_update ON organizations;

-- Solo la tuya. Antes se podían listar las 8 (con su invite_code), lo que
-- volvía trivial colarse en cualquier equipo.
CREATE POLICY organizations_select ON organizations FOR SELECT TO authenticated
USING (id = public.my_org_id());

-- Crear organización es parte del onboarding de un director.
CREATE POLICY organizations_insert ON organizations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY organizations_update ON organizations FOR UPDATE TO authenticated
USING (id = public.my_org_id() AND public.is_director())
WITH CHECK (id = public.my_org_id() AND public.is_director());

-- Mismo problema de columnas: sin esto, un director se pone plan 'elite' solo.
CREATE OR REPLACE FUNCTION public.protect_org_billing_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_service_role() THEN RETURN NEW; END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.storage_limit_mb IS DISTINCT FROM OLD.storage_limit_mb
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
  THEN
    RAISE EXCEPTION 'El plan solo lo cambia el sistema de pagos';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_org_billing ON organizations;
CREATE TRIGGER trg_protect_org_billing
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION public.protect_org_billing_columns();


-- ── Unirse a una organización ──────────────────────────────────────────
-- Antes: el cliente buscaba la organización por código, contaba los miembros
-- y se escribía su propio org_id. Los tres pasos eran falsificables desde la
-- consola. Ahora ocurre entero del lado del servidor.
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

  SELECT count(*) INTO v_members FROM profiles WHERE org_id = v_org.id;

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

  UPDATE profiles SET org_id = v_org.id WHERE id = auth.uid();

  RETURN jsonb_build_object('ok', true, 'org_id', v_org.id, 'org_name', v_org.name);
END;
$$;

REVOKE ALL ON FUNCTION public.join_organization(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.join_organization(TEXT) TO authenticated;


-- Registro con código de invitación (usuario que todavía no tiene ficha).
--
-- La policy de organizations ya no deja listar equipos ajenos — que es
-- justamente lo que evita que alguien recorra los códigos y se cuele. Pero el
-- onboarding necesita traducir un código a un id para crear la ficha. Esta
-- función lo hace sin abrir la tabla: solo responde por el código exacto que
-- ya te dieron, y de paso valida el cupo (esa ruta de registro no lo miraba
-- nunca — solo lo hacía la de "unirse" desde adentro).
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

  RETURN jsonb_build_object('ok', true, 'org_id', v_org.id, 'org_name', v_org.name);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_invite_code(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_invite_code(TEXT) TO authenticated;


-- ── sequences / sequence_stems ─────────────────────────────────────────
-- Estaban con `USING (true)`: abiertas de par en par, con la nota de que "la
-- validación se hace en el backend" — pero el cliente consulta la tabla
-- directamente (SongLibrary.jsx habla de "Bypass de API para estabilidad").
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_stems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sequences_all" ON sequences;
DROP POLICY IF EXISTS "stems_all" ON sequence_stems;
DROP POLICY IF EXISTS sequences_same_org ON sequences;
DROP POLICY IF EXISTS sequence_stems_same_org ON sequence_stems;

-- La organización se hereda de la canción a la que pertenece la secuencia.
CREATE POLICY sequences_same_org ON sequences FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM songs s WHERE s.id = sequences.song_id AND s.org_id = public.my_org_id())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM songs s WHERE s.id = sequences.song_id AND s.org_id = public.my_org_id())
);

CREATE POLICY sequence_stems_same_org ON sequence_stems FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sequences q
      JOIN songs s ON s.id = q.song_id
     WHERE q.id = sequence_stems.sequence_id AND s.org_id = public.my_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sequences q
      JOIN songs s ON s.id = q.song_id
     WHERE q.id = sequence_stems.sequence_id AND s.org_id = public.my_org_id()
  )
);


-- ── Comprobación ───────────────────────────────────────────────────────
SELECT tablename,
       rowsecurity AS rls_activo,
       (SELECT count(*) FROM pg_policies p WHERE p.tablename = t.tablename) AS policies
  FROM pg_tables t
 WHERE schemaname = 'public'
   AND tablename IN ('profiles','organizations','sequences','sequence_stems')
 ORDER BY tablename;


-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK (solo si la app se rompe y necesitas volver atrás YA)
-- Ojo: esto vuelve a dejar los datos expuestos.
--
-- ALTER TABLE profiles        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE organizations   DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sequences       DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE sequence_stems  DISABLE ROW LEVEL SECURITY;
-- DROP TRIGGER IF EXISTS trg_protect_profile_columns ON profiles;
-- DROP TRIGGER IF EXISTS trg_protect_org_billing ON organizations;
-- ═══════════════════════════════════════════════════════════════════════
