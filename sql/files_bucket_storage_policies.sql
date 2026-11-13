-- RLS para el bucket de Storage "files" (usado por Bandly Presenter para
-- "Subir a Nube" en Recursos del Día, y para los fondos de letras subidos
-- por el equipo). El bucket ya existe y es público para lectura, pero
-- storage.objects tiene su propio RLS separado del RLS de las tablas
-- normales — sin estas políticas, cualquier subida de un usuario autenticado
-- (no admin) falla con "new row violates row-level security policy".
-- Run this in Supabase SQL Editor

CREATE POLICY "files_bucket_select_public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'files');

CREATE POLICY "files_bucket_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'files');

CREATE POLICY "files_bucket_delete_authenticated" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'files');

-- Verificar
SELECT policyname, cmd, roles FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'files_bucket_%';
