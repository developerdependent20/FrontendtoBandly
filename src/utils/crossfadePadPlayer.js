// Reproductor de pads para el motor web (Tone.js) con loop sin bajón de volumen.
//
// Tone.Player repite con un corte directo (o, si se le pone fadeOut, con un
// hueco). El final y el principio de un pad no están en fase, así que lo
// correcto es mezclarlos con potencia constante (cos/sin): una curva lineal
// baja ~3 dB a mitad de la mezcla y se oye como una subida y bajada en cada
// vuelta. Es el mismo criterio que usa el motor de Rust (audio_engine.rs).
//
// Misma interfaz que usaba PadBoard de Tone.Player: connect(), loop, start(),
// stop(), dispose().

const CURVE_POINTS = 128;
const FADE_IN_CURVE = Float32Array.from({ length: CURVE_POINTS }, (_, i) => Math.sin((i / (CURVE_POINTS - 1)) * Math.PI / 2));
const FADE_OUT_CURVE = Float32Array.from({ length: CURVE_POINTS }, (_, i) => Math.cos((i / (CURVE_POINTS - 1)) * Math.PI / 2));
const LOOKAHEAD_S = 0.5;

export default class CrossfadePadPlayer {
  constructor(Tone, { url, loop = true, fadeIn = 1.5, fadeOut = 1.5, crossfade = 2, onload, onerror } = {}) {
    this.Tone = Tone;
    this.loop = loop;
    this.fadeIn = fadeIn;
    this.fadeOut = fadeOut;
    this.crossfade = crossfade;
    this.output = null;
    this.session = null;
    this.buffer = new Tone.ToneAudioBuffer(url, () => onload?.(), (e) => onerror?.(e));
  }

  connect(node) {
    this.output = node;
    return this;
  }

  get ctx() {
    return this.Tone.getContext().rawContext;
  }

  start() {
    const buf = this.buffer.get();
    if (!buf || !this.output) return;
    this.stop(0);

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(1, now + this.fadeIn);
    this.Tone.connect(master, this.output);

    // La mezcla nunca puede ser más larga que un cuarto del audio.
    const cf = Math.min(this.crossfade, buf.duration / 4);
    this.session = { master, voices: new Set(), timer: null, buf, cf };
    this.launch(this.session, now + 0.02, true);
  }

  launch(session, startAt, first) {
    const { master, buf, cf } = session;
    const ctx = this.ctx;
    const t = Math.max(startAt, ctx.currentTime);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    if (first) gain.gain.setValueAtTime(1, t);
    else gain.gain.setValueCurveAtTime(FADE_IN_CURVE, t, cf);
    src.connect(gain);
    gain.connect(master);
    src.start(t);

    const voice = { src, gain };
    session.voices.add(voice);
    src.onended = () => {
      session.voices.delete(voice);
      try { gain.disconnect(); } catch { /* ya desconectado */ }
    };

    if (!this.loop) return;

    // Esta voz se apaga mientras entra la siguiente, y así sucesivamente.
    const nextAt = t + buf.duration - cf;
    gain.gain.setValueCurveAtTime(FADE_OUT_CURVE, nextAt, cf);
    src.stop(t + buf.duration);
    const waitMs = Math.max(0, (nextAt - ctx.currentTime - LOOKAHEAD_S) * 1000);
    session.timer = setTimeout(() => {
      if (this.session === session) this.launch(session, nextAt, false);
    }, waitMs);
  }

  stop(fadeOut = this.fadeOut) {
    const session = this.session;
    if (!session) return;
    this.session = null;
    clearTimeout(session.timer);

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const { master, voices } = session;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + Math.max(fadeOut, 0.005));

    setTimeout(() => {
      voices.forEach(v => { try { v.src.stop(); } catch { /* ya terminó */ } });
      try { master.disconnect(); } catch { /* ya desconectado */ }
    }, Math.max(fadeOut, 0.005) * 1000 + 100);
  }

  dispose() {
    this.stop(0);
    try { this.buffer.dispose(); } catch { /* ya liberado */ }
  }
}
