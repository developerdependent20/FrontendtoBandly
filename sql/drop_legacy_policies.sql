-- ═══════════════════════════════════════════════════════════════════════
-- QUITAR LAS POLICIES VIEJAS QUE ANULAN EL CANDADO
--
-- En Postgres, varias policies permisivas sobre la misma tabla y acción se
-- combinan con OR. Basta con que una diga `true` para que todas las demás
-- sobren. Eso es lo que estaba pasando: rls_lockdown.sql se aplicó bien, pero
-- convivía con estas, que dejan la puerta abierta:
--
--   profiles      · "Enable all updates for testing"        UPDATE public true
--   profiles      · "Public Profiles are viewable by..."    SELECT public true
--   organizations · "Enable read access for all users"      SELECT public true
--
-- La primera es la más grave: cualquier persona en internet, sin siquiera
-- iniciar sesión, podía modificar cualquier perfil — incluido el rol.
--
-- ⚠️ LEE EL BLOQUE 2 ANTES DE CORRER: una de estas rompe el sitio que tienes
--    publicado hoy si no despliegas el frontend nuevo al mismo tiempo.
-- ═══════════════════════════════════════════════════════════════════════


-- ── BLOQUE 1 · Correr YA ───────────────────────────────────────────────
-- Ninguna de estas la necesita el frontend que tienes publicado hoy.

-- Agujero de escritura abierto a cualquiera, sin login.
DROP POLICY IF EXISTS "Enable all updates for testing" ON profiles;

-- Por esta se leían los 31 perfiles (nombres y correos) desde internet.
-- profiles_select ya cubre lo legítimo: tu ficha y la de tus compañeros.
DROP POLICY IF EXISTS "Public Profiles are viewable by everyone" ON profiles;

-- Redundantes con profiles_update / profiles_insert_self. Se quitan para que
-- haya una sola regla por acción y no vuelva a pasar lo mismo.
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Redundante con organizations_update, y además consultaba profiles.role
-- directamente en vez de pasar por is_director().
DROP POLICY IF EXISTS "Directores pueden actualizar su organizacion" ON organizations;


-- ── BLOQUE 2 · Solo junto con el despliegue del frontend ───────────────
--
-- Por esta policy se leían las 8 organizaciones con su invite_code, que es lo
-- que hacía trivial colarse en cualquier equipo.
--
-- PERO: el sitio publicado hoy busca la organización por código haciendo un
-- SELECT directo a esta tabla. Si la quitas antes de desplegar, "unirse con
-- código" deja de funcionar para tus usuarios actuales.
--
-- El frontend nuevo ya no la consulta: usa resolve_invite_code(), que responde
-- solo por el código exacto que te dieron y de paso valida el cupo del plan.
--
-- Así que: despliega primero, corre esto después (o las dos cosas seguidas).

-- DROP POLICY IF EXISTS "Enable read access for all users" ON organizations;

-- Y esta, DESPUÉS de correr multi_org.sql:
-- Mientras exista un INSERT abierto sobre organizations, alguien puede crear
-- organizaciones sin pasar por create_organization() y saltarse el límite del
-- plan (1 / 3 / 10 / ilimitadas). La función es SECURITY DEFINER, así que
-- sigue funcionando aunque no quede ninguna policy de INSERT.

-- DROP POLICY IF EXISTS "Permitir crear bandas a usuarios nuevos" ON organizations;
-- DROP POLICY IF EXISTS organizations_insert ON organizations;


-- ── Comprobación ───────────────────────────────────────────────────────
-- Ninguna fila debe quedar con qual = true.
SELECT tablename, policyname, cmd, roles, qual
  FROM pg_policies
 WHERE tablename IN ('profiles','organizations','sequences','sequence_stems')
 ORDER BY tablename, policyname;
