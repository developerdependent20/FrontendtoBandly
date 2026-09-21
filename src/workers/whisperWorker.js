// ── Reconocimiento de voz de la pista CUE (Whisper, dentro de la app) ─────
// Corre en un Web Worker para no congelar el DAW mientras escucha la guía.
// El modelo (whisper-base, ~77 MB) se descarga UNA vez desde Hugging Face y
// queda guardado en la caché del webview; después funciona sin internet.
// El motor ONNX (.wasm) viene dentro de la app, no de un CDN.
import { pipeline, env } from '@huggingface/transformers';
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';

const DEFAULT_MODEL = 'onnx-community/whisper-base';

env.allowLocalModels = false;
// Sin "caché de wasm": esa ruta carga el motor como blob:, que la política de
// seguridad de Tauri (CSP) bloquea. Se sirve directo desde la app.
env.useWasmCache = false;
env.backends.onnx.wasm.wasmPaths = { wasm: ortWasmUrl };
// Sin SharedArrayBuffer en el webview no hay hilos: uno solo, y alcanza para
// clips de 2-3 segundos.
env.backends.onnx.wasm.numThreads = 1;

let asrPromise = null;
let loadedModel = null;
const fileProgress = {};

function loadModel(model = DEFAULT_MODEL) {
  if (!asrPromise || loadedModel !== model) {
    loadedModel = model;
    for (const k of Object.keys(fileProgress)) delete fileProgress[k];
    asrPromise = pipeline('automatic-speech-recognition', model, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (p) => {
        if (p.status !== 'progress' || !p.file || !p.total) return;
        fileProgress[p.file] = { loaded: p.loaded, total: p.total };
        const all = Object.values(fileProgress);
        const loaded = all.reduce((a, f) => a + f.loaded, 0);
        const total = all.reduce((a, f) => a + f.total, 0);
        self.postMessage({ type: 'download', loaded, total });
      },
    }).catch((e) => {
      asrPromise = null; // que el próximo intento vuelva a probar (p. ej. sin internet)
      throw e;
    });
  }
  return asrPromise;
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    if (type === 'load') {
      await loadModel(data.model);
      self.postMessage({ id, type: 'ready' });
      return;
    }
    if (type === 'transcribe') {
      const asr = await loadModel(data.model);
      const opts = { task: 'transcribe' };
      if (data.language) opts.language = data.language;
      if (data.timestamps) opts.return_timestamps = true;
      const out = await asr(data.audio, opts);
      self.postMessage({
        id, type: 'result', text: (out?.text || '').trim(),
        chunks: (out?.chunks || []).map(c => ({ text: (c.text || '').trim(), start: c.timestamp?.[0] ?? null, end: c.timestamp?.[1] ?? null })),
      });
    }
  } catch (e) {
    self.postMessage({ id, type: 'error', message: String(e?.message || e) });
  }
};
