// ─────────────────────────────────────────────────────────────────────────
// MARCADORES AUTOMÁTICOS DESDE EL STEM DE GUÍA
//
// Casi todo multitrack trae un stem de "cues": una voz que dice "verso",
// "coro", "puente" justo antes de cada sección. Esa pista ya contiene el mapa
// de la canción — solo que nadie lo estaba leyendo, y el director terminaba
// poniendo los marcadores a mano, uno por uno.
//
// No hay que transcribir nada: el stem de guía es silencio con frases sueltas,
// así que basta con encontrar dónde sube la energía después de una pausa.
//
// Detalle que importa musicalmente: la guía habla ANTES de la sección, para
// avisar. Si el marcador se pusiera donde suena la voz, caería uno o dos
// compases antes de donde realmente entra el coro. Por eso cada detección se
// lleva al siguiente inicio de compás.
// ─────────────────────────────────────────────────────────────────────────

const WINDOW_MS = 20;        // resolución del análisis
const MIN_GAP_SEC = 1.2;     // dos frases más juntas que esto son la misma
const NOISE_FLOOR = 0.02;    // por debajo de esto es silencio, no voz

/**
 * Encuentra los instantes (en segundos) en los que la guía empieza a hablar.
 */
function detectSpeechOnsets(audioBuffer) {
  const sr = audioBuffer.sampleRate;
  const data = audioBuffer.getChannelData(0);
  const windowSize = Math.max(1, Math.floor((WINDOW_MS / 1000) * sr));
  const windows = Math.floor(data.length / windowSize);
  if (windows < 2) return [];

  // 1. Energía (RMS) de cada ventana.
  const rms = new Float32Array(windows);
  let peak = 0;
  for (let w = 0; w < windows; w++) {
    let sum = 0;
    const start = w * windowSize;
    for (let i = 0; i < windowSize; i++) {
      const s = data[start + i];
      sum += s * s;
    }
    const value = Math.sqrt(sum / windowSize);
    rms[w] = value;
    if (value > peak) peak = value;
  }

  if (peak < NOISE_FLOOR) return []; // pista muda: no hay guía que leer

  // 2. Umbral relativo al pico real de ESTA pista. Un umbral fijo fallaría
  //    según lo fuerte que cada quien haya exportado su guía.
  const threshold = Math.max(NOISE_FLOOR, peak * 0.15);

  // 3. Un onset es pasar de silencio a voz, y se ignoran los que estén
  //    demasiado cerca del anterior: una frase como "coro" son varias ventanas
  //    altas seguidas, no varios marcadores.
  const minGapWindows = Math.floor((MIN_GAP_SEC * 1000) / WINDOW_MS);
  const onsets = [];
  let lastOnset = -Infinity;
  let wasSilent = true;

  for (let w = 0; w < windows; w++) {
    const loud = rms[w] > threshold;
    if (loud && wasSilent && (w - lastOnset) > minGapWindows) {
      onsets.push((w * windowSize) / sr);
      lastOnset = w;
    }
    wasSilent = !loud;
  }

  return onsets;
}

/**
 * Genera marcadores a partir del stem de guía.
 *
 * @param {AudioBuffer} cueBuffer   el stem de cues decodificado
 * @param {object} opts  { bpm, beatsPerBar, sampleRate }
 * @returns {Array<{bar:number, label:string, sample:number, color:string}>}
 */
export function markersFromCueStem(cueBuffer, { bpm, beatsPerBar = 4, sampleRate = 44100 } = {}) {
  if (!cueBuffer || !bpm || bpm <= 0) return [];

  const onsets = detectSpeechOnsets(cueBuffer);
  if (onsets.length === 0) return [];

  const samplesPerBar = (sampleRate * 60 / bpm) * beatsPerBar;
  const palette = ['#77a5b9', '#10b981', '#fbbf24', '#ef4444', '#a78ac2', '#f97316', '#7d7d7c'];

  const seenBars = new Set();
  const markers = [];

  onsets.forEach((seconds, i) => {
    // La guía avisa antes: el marcador va al compás que ARRANCA después de
    // que ella habla, que es donde de verdad entra la sección.
    const sample = seconds * sampleRate;
    const bar = Math.ceil(sample / samplesPerBar) + 1;

    if (seenBars.has(bar)) return; // dos avisos dentro del mismo compás
    seenBars.add(bar);

    markers.push({
      id: crypto.randomUUID(),
      bar,
      // Sin nombre real: la guía dice "coro" pero no lo transcribimos. Se
      // numeran para que el director solo tenga que renombrar, no ubicar.
      label: `Sección ${markers.length + 1}`,
      sample: Math.round((bar - 1) * samplesPerBar),
      color: palette[i % palette.length],
      source: 'cue',
    });
  });

  return markers;
}

/**
 * Elige cuál de los stems es la guía.
 * Primero por el tipo que ya detecta el uploader, y si no, por el nombre.
 */
export function findCueStem(stems) {
  const byType = stems.findIndex(s => s.instrumentType === 'cue');
  if (byType >= 0) return byType;

  return stems.findIndex(s =>
    /\b(cue|cues|guia|gu[ií]a|guide|voice\s*over|vo)\b/i.test(s.fileName || '')
  );
}
