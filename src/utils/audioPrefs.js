// Preferencias de audio del DAW (frecuencia de muestreo y buffer). 0 = automático.
// Se guardan en este equipo y se mandan al motor cada vez que abre la tarjeta.
const KEY = 'bandly_audio_prefs';
const LAST_FILE_SR_KEY = 'bandly_last_file_sr';

export const BUFFER_CHOICES = [256, 512, 1024, 2048];

export function getAudioPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { sampleRate: parseInt(p.sampleRate, 10) || 0, bufferSize: parseInt(p.bufferSize, 10) || 0 };
  } catch {
    return { sampleRate: 0, bufferSize: 0 };
  }
}

export function saveAudioPrefs({ sampleRate, bufferSize }) {
  try { localStorage.setItem(KEY, JSON.stringify({ sampleRate: sampleRate || 0, bufferSize: bufferSize || 0 })); } catch { /* sin storage */ }
}

// Frecuencia de las últimas pistas cargadas: el modo automático abre la tarjeta a esa.
export function getLastFileRate() {
  try { return parseInt(localStorage.getItem(LAST_FILE_SR_KEY) || '0', 10) || 0; } catch { return 0; }
}

export function saveLastFileRate(hz) {
  try { localStorage.setItem(LAST_FILE_SR_KEY, String(hz)); } catch { /* sin storage */ }
}

// Argumentos de init_audio_stream con las preferencias guardadas.
export function audioInitArgs(deviceId) {
  const { sampleRate, bufferSize } = getAudioPrefs();
  return { deviceId, sampleRate: sampleRate || null, bufferSize: bufferSize || null, rateHint: getLastFileRate() || null };
}
