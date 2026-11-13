#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# ¿Está RLS realmente activo?
#
# Los archivos de sql/ dicen qué se pensó hacer, no qué quedó configurado en
# Supabase (las policies se pueden crear desde el dashboard y no quedan en el
# repo). Esto lo comprueba de verdad.
#
# Cómo funciona: pide SOLO EL CONTEO de filas usando la llave pública (la misma
# que ya va dentro de la app), SIN iniciar sesión como nadie.
#   - Si RLS está bien:   devuelve 0   (un anónimo no debe ver nada)
#   - Si RLS está apagado: devuelve >0 (cualquiera en internet ve esa tabla)
#
# No lee ni imprime datos de ningún cliente: solo cuenta.
#
# Uso:  bash scripts/check_rls.sh
# ─────────────────────────────────────────────────────────────────────────
set -u

URL="$(grep -E '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | tr -d '\r')"
KEY="$(grep -E '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2- | tr -d '\r')"

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "No pude leer VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY de .env"
  exit 1
fi

# Lista sacada de la base, no de memoria: `sequence_files` estaba expuesta con
# una policy `true` y no aparecía aquí simplemente porque no me acordé de ella.
# Si creas una tabla nueva, agrégala — o mejor, corre el diagnóstico completo
# que está al final de sql/rls_final.sql, que las recorre todas solo.
TABLES="profiles organizations songs events event_roster event_songs sequences sequence_stems sequence_files presenter_state presenter_slides presenter_backgrounds notifications polls payment_history"

printf '%-20s %s\n' "TABLA" "FILAS VISIBLES SIN LOGIN"
printf '%-20s %s\n' "--------------------" "------------------------"

for t in $TABLES; do
  count=$(curl -s -o /dev/null -D - \
    "$URL/rest/v1/$t?select=id&limit=1" \
    -H "apikey: $KEY" \
    -H "Range: 0-0" \
    -H "Prefer: count=exact" 2>/dev/null \
    | grep -i '^content-range:' | sed 's|.*/||' | tr -d '\r')

  case "$count" in
    0|"")   printf '%-20s %s\n' "$t" "0  -> protegida" ;;
    "*")    printf '%-20s %s\n' "$t" "?  (sin conteo)" ;;
    *)      printf '%-20s %s\n' "$t" "$count  <-- EXPUESTA, RLS APAGADO" ;;
  esac
done

echo ""
echo "Cualquier fila > 0 significa que esa tabla es legible por cualquiera"
echo "en internet que tenga la llave publica (que va dentro de la app)."
