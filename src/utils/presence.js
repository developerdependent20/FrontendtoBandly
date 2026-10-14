import { supabase } from '../supabaseClient';

// Marca al usuario como "visto" para que el panel de superadmin muestre quién
// está activo, desde qué país y cuántas sesiones lleva. Nunca rompe la app.
const INTERVALO_MS = 5 * 60 * 1000;
let timer = null;
let iniciado = false;

const touch = async (newSession) => {
  try {
    if (!navigator.onLine) return;
    const locale = navigator.language || '';
    const region = locale.split('-')[1] || '';
    await supabase.rpc('touch_presence', {
      p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      p_locale: locale || null,
      p_country: region || null,
      p_new_session: newSession,
    });
  } catch { /* la presencia es opcional */ }
};

export function startPresence() {
  if (iniciado) return;
  iniciado = true;
  touch(true);
  timer = setInterval(() => { if (!document.hidden) touch(false); }, INTERVALO_MS);
}

export function stopPresence() {
  iniciado = false;
  if (timer) clearInterval(timer);
  timer = null;
}
