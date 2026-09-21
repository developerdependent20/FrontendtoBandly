// ── Nombrar secciones escuchando la pista CUE ─────────────────────────────
// La guía dice cosas como «Intro, 2, 3, 4», «Coro, dos, tres, cuatro» o
// «Subir intensidad, Coro, 2, 3, 4». Whisper lo transcribe y aquí se convierte
// en el nombre de sección de Bandly (siempre en español, igual que los presets,
// para que Presenter y Lights reciban nombres consistentes).
//
// Hecho a partir de pistas guía reales: los conteos casi nunca arrancan en 1
// ("Intro, dos, tres, cuatro"), hay anuncios dobles, y Whisper suele oír mal
// palabras sueltas ("Puendelo", "Balsa" por «Pausa»), por eso el vocabulario
// es tolerante y el modelo es el grande (whisper-small).

import { SECTION_PRESETS } from './timelineLanes';

const COLOR = {
  ...Object.fromEntries(SECTION_PRESETS.map(p => [p.label, p.color])),
  PAUSA: '#94a3b8', REPETIR: '#a78bfa', SUBIDA: '#f59e0b', BAJADA: '#0ea5e9',
  BREAKDOWN: '#e11d48', TAG: '#22d3ee', VAMP: '#84cc16', 'A CAPELLA': '#f472b6',
};

// Palabras que dice una guía → sección. Las frases de dos palabras se revisan
// antes que las de una ("pre coro" antes que "coro").
const VOCAB = [
  { label: 'PRE-CORO', words: ['pre coro', 'precoro', 'preco', 'pre co', 'precorro', 'pre coros', 'pre chorus', 'prechorus', 'pre estribillo'] },
  { label: 'INTRO', words: ['intro', 'introduccion', 'introduction'] },
  { label: 'VERSO', words: ['verso', 'verse', 'estrofa', 'versos', 'verses'] },
  { label: 'CORO', words: ['coro', 'chorus', 'estribillo', 'refrain', 'coros', 'choruses'] },
  { label: 'PUENTE', words: ['puente', 'bridge'] },
  { label: 'INSTRUMENTAL', words: ['instrumental', 'interludio', 'interlude', 'turnaround', 'turn around'] },
  { label: 'SOLO', words: ['solo'] },
  { label: 'SUBIDA', words: ['subir intensidad', 'subir', 'subida', 'sube', 'build up', 'buildup', 'build', 'crescendo'] },
  { label: 'BAJADA', words: ['bajar intensidad', 'bajar', 'bajada', 'baja', 'decrescendo'] },
  { label: 'PAUSA', words: ['pausa', 'pause', 'tacet', 'silencio'] },
  { label: 'REPETIR', words: ['repetir', 'repite', 'repetimos', 'repeat'] },
  { label: 'BREAKDOWN', words: ['breakdown', 'break down'] },
  { label: 'TAG', words: ['tag'] },
  { label: 'VAMP', words: ['vamp'] },
  { label: 'A CAPELLA', words: ['a capella', 'acapella', 'a cappella', 'acappella'] },
  { label: 'FINAL', words: ['final', 'outro', 'ending', 'cierre', 'coda', 'salida', 'fin', 'end'] },
];

const NUMBER_WORDS = {
  uno: 1, una: 1, one: 1, first: 1, primero: 1, primer: 1, primera: 1,
  dos: 2, two: 2, second: 2, segundo: 2, segunda: 2, to: 2, too: 2,
  tres: 3, three: 3, third: 3, tercero: 3, tercera: 3,
  cuatro: 4, four: 4, for: 4, fourth: 4, cuarto: 4, cuarta: 4,
  cinco: 5, five: 5, fifth: 5, quinto: 5,
  seis: 6, six: 6,
};

export function normalizeSpeech(text) {
  return (text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)\b/g, '$1')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lev(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}

// Un token puede ser uno o varios números: "3" → [3], "cuatro" → [4], y Whisper
// a veces pega un conteo como "34" o "234" → [3,4] / [2,3,4].
function numbersOf(tok) {
  if (/^\d+$/.test(tok)) {
    if (tok.length > 1) {
      const ds = [...tok].map(Number);
      if (ds.every((v, i) => i === 0 || v === ds[i - 1] + 1)) return ds;
    }
    return [parseInt(tok, 10)];
  }
  const n = NUMBER_WORDS[tok];
  return n === undefined ? null : [n];
}

// ¿La palabra del vocabulario `w` empieza en el token i? Devuelve cuántos
// tokens usa (0 si no coincide).
function matchAt(tokens, i, w) {
  const parts = w.split(' ');
  // Exacto, o casi exacto: 1 letra de diferencia en palabras de 4+, 2 en las largas.
  const close = (tok, p) => tok === p
    || (p.length >= 4 && lev(tok, p) <= 1)
    || (p.length >= 8 && lev(tok, p) <= 2);
  const slice = tokens.slice(i, i + parts.length);
  if (slice.length === parts.length && parts.every((p, k) => close(slice[k], p))) return parts.length;
  // Whisper a veces parte la palabra: "Verso" → "Ver eso".
  if (parts.length === 1 && i + 1 < tokens.length && close(tokens[i] + tokens[i + 1], parts[0])) return 2;
  return 0;
}

// Clasifica lo que oyó Whisper en UN clip:
//   { kind: 'section', label, color }  → "Coro, dos, tres, cuatro" = CORO
//   { kind: 'count' }                  → solo un conteo ("1, 2, 1, 2, 3, 4"): no es una sección
//   { kind: 'unknown' }                → no se entendió nada útil
export function classifyTranscript(text) {
  const tokens = normalizeSpeech(text).split(' ').filter(Boolean);
  if (!tokens.length) return { kind: 'unknown' };

  // Todas las apariciones de vocabulario. Se queda la ÚLTIMA: en "Subir
  // intensidad, Coro, 2, 3, 4" la sección que arranca es CORO.
  let last = null;
  for (let i = 0; i < tokens.length; i++) {
    for (const entry of VOCAB) {
      let used = 0;
      for (const w of entry.words) { used = matchAt(tokens, i, w); if (used) break; }
      // "Inter…" (interludio, interno, interluyo…) → instrumental
      if (!used && entry.label === 'INSTRUMENTAL' && tokens[i].length >= 5 && tokens[i].startsWith('inter')) used = 1;
      if (used) { last = { entry, i, used }; i += used - 1; break; }
    }
  }

  if (!last) {
    // ¿Solo números? Es el conteo de entrada, no una sección.
    const allNums = tokens.every(t => numbersOf(t) !== null);
    return allNums ? { kind: 'count' } : { kind: 'unknown' };
  }

  // Números tras la palabra: pueden ser el número de la sección ("Verso 2") o
  // el conteo que arranca a mitad ("Intro, dos, tres, cuatro"). Un conteo es una
  // racha creciente de 2+ números seguidos al final; lo que queda antes de esa
  // racha es el número de la sección.
  const nums = [];
  for (let k = last.i + last.used; k < tokens.length; k++) {
    const ns = numbersOf(tokens[k]);
    if (!ns) break;
    nums.push(...ns);
  }
  let runStart = nums.length;
  while (runStart > 0 && (runStart === nums.length || nums[runStart] === nums[runStart - 1] + 1)) runStart--;
  const isRun = nums.length - runStart >= 2;
  const prefix = isRun ? nums.slice(0, runStart) : nums;
  let num = prefix.length ? prefix[0] : null;
  if (num === 4 && prefix.length === 1) num = null; // un "4" suelto casi siempre es el final del conteo

  const label = num ? `${last.entry.label} ${num}` : last.entry.label;
  return { kind: 'section', label, color: COLOR[last.entry.label] || '#94a3b8' };
}

// Compatibilidad: solo el nombre (o null).
export function labelFromTranscript(text) {
  const c = classifyTranscript(text);
  return c.kind === 'section' ? { label: c.label, color: c.color } : null;
}

// ── Cliente del worker ────────────────────────────────────────────────────
let worker = null;
let seq = 0;
const pending = new Map();
let onDownload = null;

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('../workers/whisperWorker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'download') { onDownload?.(data.loaded, data.total); return; }
    const p = pending.get(data.id);
    if (!p) return;
    pending.delete(data.id);
    if (data.type === 'error') p.reject(new Error(data.message));
    else p.resolve(data);
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'worker error'));
    pending.clear();
    worker = null;
  };
  return worker;
}

function call(msg, transfer) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...msg, id }, transfer || []);
  });
}

// Transcribe UN audio (mono 16 kHz; puede traer varios clips pegados).
export async function transcribeRaw(audio, { language = 'spanish', model, timestamps = false } = {}) {
  const copy = audio.slice(); // el worker se queda con su copia
  return call({ type: 'transcribe', audio: copy, language, model, timestamps }, [copy.buffer]);
}

export async function loadSpeechModel({ model, onProgress } = {}) {
  onDownload = (loaded, total) => onProgress?.({ phase: 'download', loaded, total });
  try { onProgress?.({ phase: 'load' }); await call({ type: 'load', model }); } finally { onDownload = null; }
}

export const MODEL_SMALL = 'onnx-community/whisper-small'; // ~250 MB, mucho mejor con palabras sueltas
export const MODEL_BASE = 'onnx-community/whisper-base';   // ~77 MB, respaldo

// ── Lectura por lotes ─────────────────────────────────────────────────────
// Whisper procesa SIEMPRE una ventana de 30 s, dure lo que dure el clip: leer 14
// clips de 2 s por separado cuesta 14 ventanas. Aquí se pegan varios clips en una
// misma ventana, separados por silencio, y las marcas de tiempo dicen cuál
// texto es de cuál clip. Una canción entera baja de minutos a ~40 s.
// Los clips que Whisper junta o no separa bien se leen aparte, uno por uno.
const SR = 16000;
const GAP = SR * 2.6;
const LEAD = SR * 0.6;
const MAX_WINDOW = SR * 28;

function packWindows(clips) {
  const windows = [];
  let cur = { parts: [], len: LEAD };
  clips.forEach((c, i) => {
    if (cur.len + c.length + GAP > MAX_WINDOW && cur.parts.length) { windows.push(cur); cur = { parts: [], len: LEAD }; }
    cur.parts.push({ i, off: cur.len, len: c.length });
    cur.len += c.length + GAP;
  });
  if (cur.parts.length) windows.push(cur);
  return windows;
}

// Texto de cada clip de una ventana, solo cuando un trozo de la transcripción
// cae dentro de UN único clip (si toca a dos, es ambiguo y no se asigna).
function assignChunks(win, chunks) {
  const texts = new Map();
  for (const c of chunks || []) {
    const cs = c.start ?? 0;
    const ce = Math.max(c.end ?? cs, cs + 0.05);
    let best = null, bestOv = 0, hits = 0;
    for (const p of win.parts) {
      const ps = p.off / SR - 0.4, pe = (p.off + p.len) / SR + 0.4;
      const ov = Math.max(0, Math.min(ce, pe) - Math.max(cs, ps));
      if (ov > 0.05) hits++;
      if (ov > bestOv) { bestOv = ov; best = p; }
    }
    if (best && hits === 1 && bestOv >= 0.5 * (ce - cs)) texts.set(best.i, `${texts.get(best.i) || ''} ${c.text}`.trim());
  }
  return texts;
}

// clips: Float32Array[] (mono 16 kHz). Devuelve un arreglo con, por clip,
//   { kind: 'section'|'count'|'unknown', label?, color?, heard }
// onResults(map) se llama cada vez que hay clips resueltos, para ir mostrando
// los nombres a medida que aparecen en vez de esperar al final.
export async function nameVariants(clips, { onProgress, onResults, model = MODEL_SMALL } = {}) {
  let activeModel = model;
  try {
    await loadSpeechModel({ model: activeModel, onProgress });
  } catch (e) {
    if (activeModel === MODEL_BASE) throw e;
    // Sin internet para bajar el modelo grande: se intenta con el chico (si ya lo tenías).
    console.warn('[cueSpeech] modelo grande no disponible, probando el chico:', e);
    activeModel = MODEL_BASE;
    onProgress?.({ phase: 'fallback' });
    await loadSpeechModel({ model: activeModel, onProgress });
  }

  const results = new Array(clips.length).fill(null);
  const emit = (partial) => { if (partial.size) onResults?.(partial); };
  let done = 0;
  const bump = (n) => { done += n; onProgress?.({ phase: 'listen', done, total: clips.length }); };
  onProgress?.({ phase: 'listen', done: 0, total: clips.length });

  // 1) Lotes
  const windows = packWindows(clips);
  for (const win of windows) {
    const audio = new Float32Array(Math.ceil(win.len));
    win.parts.forEach(p => audio.set(clips[p.i], p.off));
    const partial = new Map();
    try {
      const r = await transcribeRaw(audio, { language: 'spanish', model: activeModel, timestamps: true });
      for (const [i, text] of assignChunks(win, r.chunks)) {
        const cls = classifyTranscript(text);
        if (cls.kind !== 'unknown') { results[i] = { ...cls, heard: text }; partial.set(i, results[i]); }
      }
    } catch (e) {
      console.warn('[cueSpeech] lote falló, se leerá clip por clip:', e);
    }
    emit(partial);
    bump(partial.size);
  }

  // 2) Lo que quedó sin resolver, clip por clip: español y, si no, inglés.
  for (let i = 0; i < clips.length; i++) {
    if (results[i]) continue;
    let heard = '';
    let cls = { kind: 'unknown' };
    for (const language of ['spanish', 'english']) {
      try {
        const { text } = await transcribeRaw(clips[i], { language, model: activeModel });
        heard = heard || text;
        cls = classifyTranscript(text);
        if (cls.kind !== 'unknown') { heard = text; break; }
      } catch (e) {
        console.warn('[cueSpeech] clip falló:', e);
      }
    }
    results[i] = { ...cls, heard };
    emit(new Map([[i, results[i]]]));
    bump(1);
  }

  onProgress?.({ phase: 'done' });
  return results;
}
