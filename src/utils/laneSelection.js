// Selección múltiple en las líneas de la timeline (Secciones / Letras / Luces).
// Todo es función pura: se prueba sin la interfaz.
//
// Un "entry" es { lane, id, key, t, payload }:
//   key     identifica la instancia en pantalla (con arreglo un cue puede verse dos veces)
//   t       posición en unidades de la timeline
//   payload lo que hace falta para volver a crearlo al pegar

export const itemKey = (lane, it) => `${lane}:${it.key || it.id}`;

// Mismo desplazamiento para todo el grupo, limitado para que nadie se salga de 0..total.
export function clampDelta(entries, dt, total) {
  if (!entries.length) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const e of entries) { if (e.t < min) min = e.t; if (e.t > max) max = e.t; }
  return Math.max(-min, Math.min(total - max, dt));
}

// Claves de los items de una línea cuyo inicio cae dentro de [lo, hi].
export function keysInRange(entries, lane, lo, hi) {
  return entries.filter(e => e.lane === lane && e.t >= lo && e.t <= hi).map(e => e.key);
}

// Una instancia por item real: con arreglo, el mismo cue aparece varias veces y
// mover/borrar por id debe contarlo una sola vez (gana la primera instancia).
export function uniqueById(entries) {
  const seen = new Set();
  return entries.filter(e => {
    const k = `${e.lane}:${e.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Copiar: se guarda la posición relativa al primero, para pegar el grupo entero
// conservando la distancia entre sus items.
export function makeClipboard(entries) {
  if (!entries.length) return null;
  const origin = Math.min(...entries.map(e => e.t));
  return { items: entries.map(e => ({ lane: e.lane, rel: e.t - origin, payload: e.payload })) };
}

// Pegar: el primer item cae en `at`; el resto mantiene su distancia. Lo que se
// saldría del final de la canción se descarta.
export function planPaste(clip, at, total) {
  if (!clip) return [];
  return clip.items
    .map(i => ({ lane: i.lane, t: Math.round(at + i.rel), payload: i.payload }))
    .filter(i => i.t >= 0 && i.t <= total);
}
