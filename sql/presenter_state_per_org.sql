-- ═══════════════════════════════════════════════════════════════════════
-- presenter_state: de UNA fila global a UNA fila POR ORGANIZACIÓN
--
-- El problema: Presenter, Lights y el DAW leían y escribían siempre
-- `.eq('id', 1)`. Una sola fila para todos los clientes del producto.
--
-- Qué pasaba el primer domingo con dos iglesias en vivo al mismo tiempo:
--   - La iglesia A pasa una diapositiva -> UPDATE sobre la fila 1.
--   - El evento de Realtime llega a TODOS los proyectores del mundo.
--   - La congregación de la iglesia B ve la letra de la iglesia A en pantalla,
--     su timer se reemplaza por el de A, y sus luces DMX saltan a la escena
--     que corresponde al marcador de A.
--   - Los dos operadores se pisan cada pocos segundos: gana el último.
--
-- No era un riesgo hipotético ni algo que RLS arreglara: era diseño de
-- esquema, y fallaba solo, sin que nadie atacara nada.
--
-- Correr DESPUÉS de sql/rls_lockdown.sql (usa la función my_org_id()).
-- ═══════════════════════════════════════════════════════════════════════

-- 0. Que `id` se genere solo
-- La tabla nació para tener UNA fila con id=1 escrito a mano, así que la
-- columna quedó NOT NULL y sin valor por defecto. Al insertar una fila por
-- organización reventaba con:
--   null value in column "id" ... violates not-null constraint
CREATE SEQUENCE IF NOT EXISTS presenter_state_id_seq;
SELECT setval('presenter_state_id_seq', coalesce((SELECT max(id) FROM presenter_state), 0) + 1, false);
ALTER TABLE presenter_state ALTER COLUMN id SET DEFAULT nextval('presenter_state_id_seq');
ALTER SEQUENCE presenter_state_id_seq OWNED BY presenter_state.id;


-- 1. Columna de organización + una fila por organización
ALTER TABLE presenter_state ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- La fila histórica (id=1) queda huérfana a propósito: no sabemos de quién era
-- y adivinar sería peor. Cada organización arranca limpia.
DELETE FROM presenter_state WHERE org_id IS NULL;

-- Una sola fila por organización: es lo que permite el upsert desde las apps.
CREATE UNIQUE INDEX IF NOT EXISTS presenter_state_org_uniq ON presenter_state(org_id);

-- Crear la fila de cada organización existente para que las apps encuentren
-- algo que actualizar desde el primer día.
INSERT INTO presenter_state (org_id)
SELECT id FROM organizations
ON CONFLICT (org_id) DO NOTHING;

-- Toda organización nueva nace con la suya.
CREATE OR REPLACE FUNCTION public.create_presenter_state_for_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO presenter_state (org_id) VALUES (NEW.id)
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_presenter_state ON organizations;
CREATE TRIGGER trg_create_presenter_state
AFTER INSERT ON organizations
FOR EACH ROW EXECUTE FUNCTION public.create_presenter_state_for_org();


-- 2. Aislamiento real
ALTER TABLE presenter_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS presenter_state_same_org ON presenter_state;
CREATE POLICY presenter_state_same_org ON presenter_state FOR ALL TO authenticated
USING (org_id = public.my_org_id())
WITH CHECK (org_id = public.my_org_id());


-- 3. Realtime
-- Aunque RLS ya filtra las filas, las apps además se suscriben con
-- `filter: org_id=eq.<uuid>` para no recibir siquiera el evento ajeno.
ALTER TABLE presenter_state REPLICA IDENTITY FULL;


-- Comprobación
SELECT o.name AS organizacion, ps.org_id IS NOT NULL AS tiene_fila
  FROM organizations o
  LEFT JOIN presenter_state ps ON ps.org_id = o.id
 ORDER BY o.name;
