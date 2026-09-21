// ── Líneas de la timeline del DAW: Secciones / Letras / Luces ─────────────
// Todo lo que se guarda (markers, cues de letra y de luz) vive en unidades
// "pitch 0" del audio original, igual que los markers de siempre. La timeline
// en cambio muestra lo que va a sonar: con transposición y con arreglo. Este
// archivo es el único lugar que convierte entre las dos.

export const SECTION_PRESETS = [
  { label: 'INTRO', color: '#38bdf8' },
  { label: 'VERSO', color: '#10b981' },
  { label: 'PRE-CORO', color: '#fbbf24' },
  { label: 'CORO', color: '#ef4444' },
  { label: 'PUENTE', color: '#a855f7' },
  { label: 'SOLO', color: '#f97316' },
  { label: 'INSTRUMENTAL', color: '#14b8a6' },
  { label: 'FINAL', color: '#64748b' },
];

export const LIGHT_COLOR = '#facc15';

// Colores para los grupos detectados en la pista CUE antes de que tengan nombre.
const GROUP_COLORS = ['#38bdf8', '#10b981', '#fbbf24', '#ef4444', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];

export function beatsPerBarFromSignature(sig) {
  const n = parseInt((sig || '4/4').split('/')[0], 10);
  return Number.isFinite(n) && n > 0 ? n : 4;
}

// Convierte entre posición guardada (audio original) y posición en la timeline.
// Con arreglo, un cue que cae dentro de un coro repetido aparece dos veces en
// la timeline — por eso toTimeline devuelve una lista.
export function makeTimelineMapper(blocks, pitchRatio = 1) {
  const pr = pitchRatio || 1;
  if (!blocks || blocks.length === 0) {
    return {
      toTimeline: (s) => [s / pr],
      toSong: (t) => Math.max(0, Math.round(t * pr)),
    };
  }
  const segs = [];
  let acc = 0;
  for (const b of blocks) {
    const len = (b.end - b.start) / pr;
    segs.push({ start: b.start, end: b.end, tStart: acc, tEnd: acc + len });
    acc += len;
  }
  return {
    toTimeline: (s) => segs.filter(g => s >= g.start && s < g.end).map(g => g.tStart + (s - g.start) / pr),
    toSong: (t) => {
      const g = segs.find(x => t >= x.tStart && t < x.tEnd) || segs[segs.length - 1];
      return Math.max(0, Math.round(g.start + (Math.min(t, g.tEnd) - g.tStart) * pr));
    },
  };
}

// Expande una lista de cues guardados a eventos de timeline, ordenados.
export function toTimelineEvents(items, mapper) {
  const out = [];
  for (const it of items) {
    mapper.toTimeline(it.sample).forEach((t, k) => out.push({ ...it, key: `${it.id}@${k}`, t }));
  }
  return out.sort((a, b) => a.t - b.t);
}

// ── Detección de secciones desde la pista CUE ────────────────────────────
// La pista guía es casi todo silencio con una voz que anuncia "Coro", "Verso"...
// uno o dos tiempos ANTES de que empiece la sección (a veces seguida de un
// conteo "1, 2, 3, 4"). Entonces:
//   1. Se buscan las frases habladas (ráfagas de voz separadas por silencio).
//   2. La sección empieza donde TERMINA la frase, en la siguiente línea de compás.
//   3. Las guías usan siempre la misma grabación para cada palabra, así que la
//      forma de la primera palabra agrupa las frases iguales (todos los "Coro"
//      quedan en el mismo grupo) — nombras uno y se nombran todos.
export function detectCueSections(env, { windowFrames, sampleRate, samplesPerBar = 0 }) {
  if (!env || env.length < 50) return [];
  const winSec = windowFrames / sampleRate;

  // Umbral: relativo a la voz (percentil alto, no el máximo — un clic suelto
  // no debe mandar) y por encima del ruido de fondo.
  const sorted = [...env].sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.995)] || 0;
  const floor = sorted[Math.floor(sorted.length * 0.3)] || 0;
  if (loud <= 1e-5) return [];
  const threshold = Math.max(loud * 0.12, floor * 4, 1e-4);

  // 1a. Ráfagas: tramos sobre el umbral, pegando huecos cortos entre sílabas.
  const syllableGap = Math.round(0.25 / winSec);
  const bursts = [];
  let cur = null;
  for (let i = 0; i < env.length; i++) {
    if (env[i] > threshold) {
      if (cur && i - cur.end <= syllableGap) cur.end = i;
      else { cur = { start: i, end: i }; bursts.push(cur); }
    }
  }
  const minBurst = Math.round(0.08 / winSec);
  const words = bursts.filter(b => b.end - b.start >= minBurst);

  // 1b. Frases: palabra + conteo quedan juntos si el silencio entre ellos es corto.
  const phraseGap = Math.round(1.1 / winSec);
  const phrases = [];
  for (const w of words) {
    const last = phrases[phrases.length - 1];
    if (last && w.start - last.end <= phraseGap) { last.end = w.end; }
    else phrases.push({ start: w.start, end: w.end, first: w });
  }

  // 2. Posición de la sección.
  const barFrames = samplesPerBar > 0 ? samplesPerBar : 0;
  const minSpacing = barFrames > 0 ? barFrames * 2 : sampleRate * 4;
  const found = [];
  for (const p of phrases) {
    const endFrame = (p.end + 1) * windowFrames;
    let sample, bar = 0;
    if (barFrames > 0) {
      // Siguiente línea de compás; si la frase se pasó apenas del compás (el
      // "4" del conteo pisando el downbeat) cuenta ese mismo compás.
      bar = Math.max(1, Math.ceil(endFrame / barFrames - 0.3) + 1);
      sample = Math.round((bar - 1) * barFrames);
    } else {
      sample = Math.round(endFrame);
    }
    const prev = found[found.length - 1];
    if (prev && sample - prev.sample < minSpacing) continue;
    // Tramo hablado (en frames del audio) para que el reconocedor de voz lo
    // escuche: un poco antes de la frase y hasta 4 s como máximo.
    const clipStart = Math.max(0, p.start * windowFrames - Math.round(sampleRate * 0.15));
    const clipEnd = Math.min((p.end + 1) * windowFrames + Math.round(sampleRate * 0.25), clipStart + sampleRate * 4);
    found.push({ sample, bar, sig: env.slice(p.first.start, p.first.end + 1), clip: { start: clipStart, end: clipEnd }, word: { start: p.first.start * windowFrames, end: (p.first.end + 1) * windowFrames }, len: p.end - p.start + 1 });
  }

  // 3. Agrupar por forma de la primera palabra.
  const groups = [];
  for (const f of found) {
    let g = groups.find(gr => shapeSimilarity(gr.sig, f.sig) > 0.88);
    if (!g) { g = { id: groups.length, sig: f.sig }; groups.push(g); }
    f.group = g.id;
  }

  // 4. Variantes a reconocer. Dos apariciones son "la misma grabación" solo si
  // suenan igual al inicio (mismo grupo) Y duran casi lo mismo. Así "Verso 1" y
  // "Verso 2" —que empiezan con la misma palabra— se escuchan por separado, pero
  // los 6 "Coro" idénticos se escuchan una sola vez.
  const clusters = [];
  for (const f of found) {
    const tol = Math.max(6, f.len * 0.05);
    let c = clusters.find(k => k.group === f.group && Math.abs(k.len - f.len) <= tol);
    if (!c) { c = { id: clusters.length, group: f.group, len: f.len }; clusters.push(c); }
    f.key = c.id;
  }

  // Nombre provisional: solo el número de orden. Antes eran "SECCIÓN A / B / C"
  // (la letra era el grupo), y parecían nombres reales que se habían escogido mal.
  return found.map((f, i) => {
    const letter = String.fromCharCode(65 + (f.group % 26));
    return {
      id: crypto.randomUUID(),
      bar: f.bar,
      sample: f.sample,
      label: `SECCIÓN ${i + 1}`,
      color: GROUP_COLORS[f.group % GROUP_COLORS.length],
      source: 'cue',
      cueGroup: letter,
      autoLabel: true,
      // Solo para reconocer la voz; se quita antes de guardar (ver stripClip).
      _clip: f.clip,
      _word: f.word,
      _key: f.key,
    };
  });
}

export const stripClip = ({ _clip, _word, _key, ...m }) => m;

// Correlación normalizada de dos envolventes (misma palabra grabada = ~1).
function shapeSimilarity(a, b) {
  if (!a.length || !b.length) return 0;
  const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  if (ratio < 0.8) return 0;
  const n = Math.min(a.length, b.length);
  const norm = (arr) => {
    const s = arr.slice(0, n);
    const mean = s.reduce((x, y) => x + y, 0) / n;
    const d = s.map(v => v - mean);
    const mag = Math.sqrt(d.reduce((x, y) => x + y * y, 0)) || 1;
    return d.map(v => v / mag);
  };
  const na = norm(a), nb = norm(b);
  let best = -1;
  // Tolerar un desfase de ±2 ventanas en el arranque de la palabra.
  for (let shift = -2; shift <= 2; shift++) {
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const j = i + shift;
      if (j >= 0 && j < n) acc += na[i] * nb[j];
    }
    if (acc > best) best = acc;
  }
  return best;
}

// Mezcla lo detectado con lo que ya había: los markers puestos a mano (o
// renombrados) se respetan; los detectados de una pasada anterior se reemplazan.
export function mergeDetectedMarkers(existing, detected, minGap) {
  const kept = existing.filter(m => m.source !== 'cue' || !m.autoLabel);
  const fresh = detected.filter(d => !kept.some(k => Math.abs(k.sample - d.sample) < minGap));
  return [...kept, ...fresh].sort((a, b) => a.sample - b.sample);
}

// ── Cómo se muestran los nombres ─────────────────────────────────────────
// Lo guardado y lo que viaja a Presenter/Lights sigue en mayúsculas (CORO):
// es el "contrato" con esas apps. Aquí solo se decide cómo se ve en pantalla.
// "PRE-CORO" → "Pre-coro", "VERSO 2" → "Verso 2".
export function displayName(label) {
  const t = (label || '').trim().toLowerCase();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

// Versión corta para bloques angostos de la timeline: una sección sin nombre
// ("SECCIÓN 14") se ve como "S14"; las que ya tienen nombre se muestran completas.
export function shortName(marker) {
  if (marker?.autoLabel) {
    const m = /(\d+)\s*$/.exec(marker.label || '');
    return m ? `S${m[1]}` : displayName(marker.label);
  }
  return displayName(marker?.label);
}

// ── Color sobrio ─────────────────────────────────────────────────────────
// Los colores guardados (rojo/verde/cian/violeta a plena saturación) puestos
// todos juntos se ven como un arcoíris de neón. Aquí se apagan al mostrarlos:
// menos saturación y algo más oscuros. Se hace al mostrar, no al guardar, así
// también se arregla lo que ya estaba guardado. Una sección sin nombre no lleva
// color propio: gris neutro (el color solo aparece cuando significa algo).
export const NEUTRAL_TONE = '#7d7d7c';

export function mutedColor(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return NEUTRAL_TONE;
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, sat = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d > 0) {
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const s2 = Math.min(sat, 0.30);           // menos saturación
  const l2 = Math.max(0.5, Math.min(0.62, l * 0.95)); // ni muy claro ni muy oscuro
  const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  const q = l2 < 0.5 ? l2 * (1 + s2) : l2 + s2 - l2 * s2, p = 2 * l2 - q;
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${to(hue2rgb(p, q, h + 1 / 3))}${to(hue2rgb(p, q, h))}${to(hue2rgb(p, q, h - 1 / 3))}`;
}

// Color con el que se muestra una sección.
export function sectionTone(marker) {
  return marker?.autoLabel ? NEUTRAL_TONE : mutedColor(marker?.color);
}
