// ─────────────────────────────────────────────────────────────────────────
// MEZCLA ESTÉREO PARA ESCUCHA RÁPIDA
//
// Un multitrack son cientos de MB que hay que descomprimir y decodificar
// entero antes de oír una nota. En un celular eso mata la pestaña; incluso en
// computador son 30-40 segundos de espera solo para repasar una canción.
//
// Esto genera un MP3 de ~5 MB con todos los stems sumados, en el mismo
// navegador que está subiendo (que ya tiene los archivos descomprimidos en
// memoria). No cuesta servidor y el músico puede repasar desde el celular.
//
// El control por stems no se toca: sigue siendo la experiencia de computador.
// ─────────────────────────────────────────────────────────────────────────

const TARGET_SAMPLE_RATE = 44100;
const MP3_BITRATE_KBPS = 128;

/**
 * Suma los stems en un solo buffer estéreo.
 * @param {Array<ArrayBuffer>} audioBuffers archivos de audio crudos
 * @param {(pct:number)=>void} onProgress 0..100
 * @returns {Promise<AudioBuffer|null>}
 */
async function mixStems(audioBuffers, onProgress) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  const decodeCtx = new Ctx();
  const decoded = [];

  try {
    for (let i = 0; i < audioBuffers.length; i++) {
      try {
        // slice(0) porque decodeAudioData "consume" el ArrayBuffer y el
        // llamador puede seguir necesitándolo.
        decoded.push(await decodeCtx.decodeAudioData(audioBuffers[i].slice(0)));
      } catch {
        // Un stem que no se puede decodificar no debe tumbar la mezcla entera.
      }
      onProgress?.(Math.round(((i + 1) / audioBuffers.length) * 60));
    }
  } finally {
    decodeCtx.close?.();
  }

  if (decoded.length === 0) return null;

  const length = Math.max(...decoded.map(b => b.length));
  const offline = new OfflineAudioContext(2, length, TARGET_SAMPLE_RATE);

  // Bajar el nivel de cada stem evita que la suma sature. No es una mezcla
  // "de verdad" — es una referencia para repasar, no para el escenario.
  const gain = offline.createGain();
  gain.gain.value = 1 / Math.sqrt(decoded.length);
  gain.connect(offline.destination);

  for (const buffer of decoded) {
    const src = offline.createBufferSource();
    src.buffer = buffer;
    src.connect(gain);
    src.start(0);
  }

  onProgress?.(75);
  return await offline.startRendering();
}

/**
 * Codifica un AudioBuffer a MP3.
 * @returns {Promise<Blob|null>}
 */
async function encodeMp3(audioBuffer, onProgress) {
  const { default: lamejs } = await import('lamejs');
  const Encoder = lamejs.Mp3Encoder || lamejs.default?.Mp3Encoder;
  if (!Encoder) return null;

  const encoder = new Encoder(2, audioBuffer.sampleRate, MP3_BITRATE_KBPS);

  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

  // lamejs trabaja en enteros de 16 bits, no en flotantes.
  const toPcm = (float32) => {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  };

  const pcmL = toPcm(left);
  const pcmR = toPcm(right);

  const blocks = [];
  const CHUNK = 1152; // tamaño de frame de MP3
  for (let i = 0; i < pcmL.length; i += CHUNK) {
    const buf = encoder.encodeBuffer(pcmL.subarray(i, i + CHUNK), pcmR.subarray(i, i + CHUNK));
    if (buf.length > 0) blocks.push(buf);

    if (i % (CHUNK * 200) === 0) {
      onProgress?.(75 + Math.round((i / pcmL.length) * 24));
      // Devolver el hilo al navegador: sin esto la pestaña se congela y
      // Chrome muestra "la página no responde" en canciones largas.
      await new Promise(r => setTimeout(r, 0));
    }
  }

  const last = encoder.flush();
  if (last.length > 0) blocks.push(last);

  onProgress?.(100);
  return new Blob(blocks, { type: 'audio/mpeg' });
}

/**
 * Genera la mezcla completa. Nunca lanza: si algo falla devuelve null y la
 * subida del multitrack continúa igual — la mezcla es un extra, no un
 * requisito.
 */
export async function generateMixdown(audioBuffers, onProgress) {
  try {
    if (!audioBuffers?.length) return null;
    const mixed = await mixStems(audioBuffers, onProgress);
    if (!mixed) return null;
    return await encodeMp3(mixed, onProgress);
  } catch (e) {
    console.warn('[Mixdown] No se pudo generar la mezcla:', e);
    return null;
  }
}
