import { isTauri, safeInvoke } from './tauri';

// Puente local DAW → Bandly Lights (misma computadora): un mensaje OSC por UDP
// a 127.0.0.1, sin pasar por internet. Lights lo escucha en su puerto OSC
// (por defecto 8000) y dispara la escena con ese nombre.
//
// Config opcional en localStorage:
//   bandly_lights_osc_port    puerto de Lights (8000 por defecto)
//   bandly_lights_lead_ms     adelanto en ms con el que se manda cada cue, para
//                             compensar lo que tardan la red DMX y el fixture en
//                             reaccionar (0 por defecto; sube si la luz cae tarde)

const oscPad = (bytes) => {
  const padded = new Uint8Array(Math.ceil((bytes.length + 1) / 4) * 4); // termina en \0 y alinea a 4
  padded.set(bytes);
  return padded;
};

// Mensaje OSC con una sola cadena: /dirección + ",s" + texto.
export function buildOscStringMessage(address, text) {
  const enc = new TextEncoder();
  const parts = [oscPad(enc.encode(address)), oscPad(enc.encode(',s')), oscPad(enc.encode(text))];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return Array.from(out);
}

// Mensaje OSC con un solo float32: /dirección + ",f" + 4 bytes big-endian.
export function buildOscFloatMessage(address, value) {
  const enc = new TextEncoder();
  const addr = oscPad(enc.encode(address));
  const tag = oscPad(enc.encode(',f'));
  const out = new Uint8Array(addr.length + tag.length + 4);
  out.set(addr, 0);
  out.set(tag, addr.length);
  new DataView(out.buffer).setFloat32(addr.length + tag.length, value, false);
  return Array.from(out);
}

const readNumber = (key, fallback) => {
  const n = parseInt(localStorage.getItem(key), 10);
  return Number.isFinite(n) ? n : fallback;
};

export const getLocalCueLeadMs = () => Math.max(0, readNumber('bandly_lights_lead_ms', 0));

const sendUdp = (data) => {
  const port = readNumber('bandly_lights_osc_port', 8000);
  safeInvoke('send_local_udp', { port, data })
    .catch(() => { /* Lights cerrado o sin escuchar: el UDP local no avisa, y no debe romper el DAW */ });
};

export function sendLocalCue(label) {
  if (!isTauri() || !label) return;
  sendUdp(buildOscStringMessage('/bandly/cue', label));
}

// Tempo de la canción para el strobe de Lights (no depende de que Presenter esté abierto).
export function sendLocalBpm(bpm) {
  if (!isTauri() || !(bpm > 0)) return;
  sendUdp(buildOscFloatMessage('/bandly/bpm', bpm));
}
