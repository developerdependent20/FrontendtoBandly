// ── Clips del secuenciador: lógica pura (sin React, sin motor) ─────────────
//
// Un clip es un pedazo de UNA pista colocado en la línea de tiempo:
//   { id, tl, src, len }
//   tl  = dónde empieza en la línea de tiempo de la canción
//   src = desde qué punto del archivo de audio suena
//   len = cuánto dura
// Todo en cuadros del archivo en unidades "pitch 0" (igual que los markers y las secciones):
// así lo guardado vale con cualquier transposición. El audio original NUNCA se toca.
//
// Una pista sin entrada en el mapa suena entera, de corrido (un único clip implícito). Solo se
// guarda lo que el usuario editó. Las funciones devuelven listas nuevas, nunca mutan.

// Un clip no puede quedar más corto que esto (≈ 1.5 ms a 44.1 kHz).
export const MIN_CLIP = 64;

let seq = 0;
export function newClipId() {
  seq += 1;
  return `c${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export const fullClips = (trackId, frames) => [{ id: `${trackId}-full`, tl: 0, src: 0, len: Math.max(0, Math.round(frames)) }];

/** Los clips de una pista: los editados, o el clip completo implícito. */
export function clipsFor(map, trackId, frames) {
  const own = map?.[trackId];
  return Array.isArray(own) ? own : fullClips(trackId, frames);
}

/** ¿Es exactamente la pista entera sin tocar? (entonces no hace falta guardarla ni mandarla al motor) */
export function isDefault(clips, frames) {
  return clips.length === 1 && clips[0].tl === 0 && clips[0].src === 0 && clips[0].len === Math.round(frames);
}

/** Quita del mapa las pistas que volvieron a ser la entera. `framesByTrack`: { [id]: cuadros }. */
export function pruneDefaults(map, framesByTrack) {
  const out = {};
  for (const [id, clips] of Object.entries(map || {})) {
    const frames = framesByTrack?.[id];
    if (frames != null && isDefault(clips, frames)) continue;
    out[id] = clips;
  }
  return out;
}

/** Ordena, descarta vacíos y entrega copias limpias. No resuelve solapes (eso lo hace `carve`). */
export function normalize(clips) {
  return clips
    .filter(c => c.len > 0)
    .map(c => ({ id: c.id, tl: Math.round(c.tl), src: Math.round(c.src), len: Math.round(c.len) }))
    .sort((a, b) => a.tl - b.tl);
}

/**
 * Despeja el intervalo [start, end) de la línea de tiempo: los clips que lo cruzan se recortan o se
 * parten (como "sobrescribir" en cualquier DAW). Los clips en `keep` no se tocan.
 */
export function carve(clips, start, end, keep = new Set()) {
  if (end <= start) return clips.slice();
  const out = [];
  for (const c of clips) {
    const a = c.tl;
    const b = c.tl + c.len;
    if (keep.has(c.id) || b <= start || a >= end) { out.push(c); continue; }
    // Lo que sobra de un clip pisado: si queda menos que el mínimo (< 1.5 ms) es una astilla
    // inaudible que nadie podría volver a agarrar, así que se descarta.
    const hasLeft = a < start && start - a >= MIN_CLIP;
    if (hasLeft) out.push({ ...c, len: start - a });
    if (b - end >= MIN_CLIP) {
      out.push({ id: hasLeft ? newClipId() : c.id, tl: end, src: c.src + (end - a), len: b - end });
    }
  }
  return out;
}

/** Corta en `at` los clips que lo contienen (solo los de `ids` si se da). Devuelve `{ clips, changed }`. */
export function splitAt(clips, at, ids = null) {
  let changed = false;
  const out = [];
  for (const c of clips) {
    const inside = at - c.tl >= MIN_CLIP && c.tl + c.len - at >= MIN_CLIP;
    if (inside && (!ids || ids.has(c.id))) {
      changed = true;
      out.push({ ...c, len: at - c.tl });
      out.push({ id: newClipId(), tl: at, src: c.src + (at - c.tl), len: c.tl + c.len - at });
    } else {
      out.push(c);
    }
  }
  return { clips: out, changed };
}

/** Mueve los clips de `ids` `delta` cuadros (sin salirse por la izquierda del 0) y sobrescribe lo que pisan. */
export function moveClips(clips, ids, delta) {
  const moving = clips.filter(c => ids.has(c.id));
  if (!moving.length) return clips;
  const minTl = Math.min(...moving.map(c => c.tl));
  const d = Math.max(Math.round(delta), -minTl);
  if (d === 0) return clips;
  const moved = moving.map(c => ({ ...c, tl: c.tl + d }));
  let rest = clips.filter(c => !ids.has(c.id));
  for (const m of moved) rest = carve(rest, m.tl, m.tl + m.len, ids);
  return normalize([...rest, ...moved]);
}

/**
 * Recorta un borde de un clip (sin cortar el audio: solo cambia qué parte suena).
 * `edge`: 'l' | 'r'. `pos`: nueva posición del borde en la línea de tiempo.
 * `frames`: largo total del archivo de esa pista (no se puede sonar más allá).
 */
export function trimClip(clips, id, edge, pos, frames) {
  const c = clips.find(x => x.id === id);
  if (!c) return clips;
  const end = c.tl + c.len;
  if (edge === 'l') {
    const lo = Math.max(0, c.tl - c.src);        // no más atrás del inicio del archivo ni del tiempo 0
    const hi = Math.max(lo, end - MIN_CLIP);     // (nunca por debajo de `lo`: si no, el audio saldría negativo)
    const newTl = Math.round(Math.min(hi, Math.max(lo, pos)));
    if (newTl === c.tl) return clips;
    const trimmed = { ...c, tl: newTl, src: c.src + (newTl - c.tl), len: end - newTl };
    const rest = carve(clips.filter(x => x.id !== id), newTl, c.tl, new Set());
    return normalize([...rest, trimmed]);
  }
  const lo = c.tl + MIN_CLIP;
  const hi = c.tl + Math.max(MIN_CLIP, Math.round(frames) - c.src); // hasta el final del archivo
  const newEnd = Math.round(Math.min(hi, Math.max(lo, pos)));
  if (newEnd === end) return clips;
  const trimmed = { ...c, len: newEnd - c.tl };
  const rest = carve(clips.filter(x => x.id !== id), end, newEnd, new Set());
  return normalize([...rest, trimmed]);
}

/** Copia los clips de `ids` justo después de ellos (como Ctrl+D). Devuelve `{ clips, newIds }`. */
export function duplicateClips(clips, ids) {
  const src = clips.filter(c => ids.has(c.id));
  if (!src.length) return { clips, newIds: new Set() };
  const start = Math.min(...src.map(c => c.tl));
  const end = Math.max(...src.map(c => c.tl + c.len));
  const span = end - start;
  const copies = src.map(c => ({ ...c, id: newClipId(), tl: c.tl + span }));
  let rest = clips.slice();
  for (const k of copies) rest = carve(rest, k.tl, k.tl + k.len, new Set(copies.map(x => x.id)));
  return { clips: normalize([...rest, ...copies]), newIds: new Set(copies.map(c => c.id)) };
}

export function removeClips(clips, ids) {
  return clips.filter(c => !ids.has(c.id));
}

/** Redondea `value` a la rejilla `grid` (0 o negativo = sin rejilla). */
export function snapTo(value, grid) {
  return grid > 0 ? Math.round(value / grid) * grid : value;
}

/**
 * Convierte los clips a las unidades del motor: `[tl, src, len]` en muestras de reproducción.
 * `k` = pitchRatio × unitScale (el mismo divisor que usa el arreglo de secciones).
 *
 * Ojo: no se redondea cada campo por separado. Los clips contiguos (un corte limpio) deben seguir
 * siendo contiguos en el motor, tanto en la línea de tiempo como en el audio, o el motor los
 * trataría como un salto y metería un fundido (un bajón audible) en el corte. Por eso:
 *   - los bordes se redondean como posiciones (el largo es fin − inicio), y
 *   - el audio se expresa como un desplazamiento `src − tl`, que es el mismo en clips contiguos.
 */
export function toEngineClips(clips, k) {
  const div = k > 0 ? k : 1;
  const out = [];
  for (const c of clips) {
    const tl = Math.round(c.tl / div);
    const end = Math.round((c.tl + c.len) / div);
    const len = end - tl;
    if (len <= 0) continue;
    const src = Math.max(0, tl + Math.round((c.src - c.tl) / div));
    out.push([tl, src, len]);
  }
  return out;
}
