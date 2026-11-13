-- ═══════════════════════════════════════════════════════════════════════
-- CIERRE FINAL DE RLS
--
-- Estado al escribir esto:
--   profiles        · limpia (3 policies propias)
--   sequences       · limpia
--   sequence_stems  · limpia
--   organizations   · le queda "Enable read access for all users" (SELECT true)
--                     y dos policies de INSERT abiertas
--   storage.objects · el bucket "files" permite que CUALQUIER usuario
--                     autenticado borre los archivos de CUALQUIER iglesia
--
-- Este archivo cierra esas dos. Léelo antes de correrlo: el BLOQUE A va junto
-- con el despliegue del frontend.
-- ═══════════════════════════════════════════════════════════════════════


-- ── BLOQUE A · organizations (junto con el despliegue) ─────────────────
--
-- Por esta policy se leían las 8 organizaciones con su invite_code desde
-- internet, que es lo que hacía trivial colarse en cualquier equipo.
--
-- ⚠️ El sitio publicado HOY busca la organización por código con un SELECT
--    directo a esta tabla. El frontend nuevo ya no: usa resolve_invite_code().
--    Si corres esto antes de desplegar, "unirse con código" deja de funcionar.

DROP POLICY IF EXISTS "Enable read access for all users" ON organizations;

-- Mientras exista un INSERT abierto, alguien puede crear organizaciones sin
-- pasar por create_organization() y saltarse el límite de su plan
-- (1 / 3 / 10 / ilimitadas). La función es SECURITY DEFINER, así que sigue
-- funcionando aunque no quede ninguna policy de INSERT.
--
-- ⚠️ Correr SOLO si ya aplicaste multi_org.sql. Si no, el registro de un
--    director nuevo se queda sin forma de crear su organización.
DROP POLICY IF EXISTS "Permitir crear bandas a usuarios nuevos" ON organizations;
DROP POLICY IF EXISTS organizations_insert ON organizations;


-- ── BLOQUE B · Bucket "files" (correr ya) ──────────────────────────────
--
-- Hoy: FOR DELETE TO authenticated USING (bucket_id = 'files')
-- Es decir, sin ninguna condición de dueño. Cualquier cliente logueado puede
-- borrar los fondos y recursos de todas las demás iglesias. Es destructivo e
-- irreversible, así que es lo más urgente de esta tabla.
--
-- La ruta pasa a ser siempre `<carpeta>/<org_id>/<archivo>`:
--   presenter-bg/<org_id>/...  (fondos de letras)
--   media/<org_id>/...         (recursos del día)

DROP POLICY IF EXISTS "files_bucket_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "files_bucket_delete_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "files_bucket_insert_own_org" ON storage.objects;
DROP POLICY IF EXISTS "files_bucket_delete_own_org" ON storage.objects;

CREATE POLICY "files_bucket_insert_own_org" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] IN ('presenter-bg', 'media')
    AND (storage.foldername(name))[2] = public.my_org_id()::text
  );

CREATE POLICY "files_bucket_delete_own_org" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'files'
    AND (storage.foldername(name))[1] IN ('presenter-bg', 'media')
    AND (storage.foldername(name))[2] = public.my_org_id()::text
  );

-- NOTA sobre la lectura:
-- "files_bucket_select_public" se deja como está a propósito. El bucket está
-- marcado como público y las apps muestran los fondos y videos con
-- getPublicUrl(); si se restringe la lectura, el proyector deja de cargarlos.
-- Protegerlos de verdad exige volver el bucket privado y firmar cada URL, que
-- es un cambio mayor. Lo que se cierra aquí es el borrado y la escritura
-- cruzada, que es lo destructivo. Son fondos e imágenes de culto, no datos
-- personales.
--
-- NOTA sobre archivos viejos:
-- Los recursos subidos antes de este cambio quedaron sueltos en la raíz del
-- bucket, sin carpeta de organización, así que ya no calzan con estas policies
-- y no se podrán borrar desde la app. Siguen viéndose. Si estorban, se borran
-- a mano desde el panel de Storage.


-- ── Diagnóstico de TODO lo demás ───────────────────────────────────────
-- El script check_rls.sh solo prueba el acceso ANÓNIMO. Una tabla puede estar
-- cerrada al anónimo y aun así dejar que cualquier cliente logueado lea los
-- datos de todas las organizaciones (por ejemplo con una policy
-- `TO authenticated USING (true)`). Esto lo revisa de verdad:

SELECT
  c.relname                                   AS tabla,
  c.relrowsecurity                            AS rls_activo,
  coalesce(p.policyname, '— SIN POLICIES —')  AS policy,
  p.cmd,
  p.roles,
  CASE
    WHEN p.qual = 'true' THEN '⚠️  ABIERTA'
    WHEN p.qual IS NULL AND p.cmd = 'INSERT' THEN 'revisar with_check'
    ELSE 'ok'
  END                                         AS alerta,
  p.qual
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = 'public'
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relrowsecurity, c.relname, p.policyname;
