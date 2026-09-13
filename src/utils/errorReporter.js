import { supabase } from '../supabaseClient';

// ─────────────────────────────────────────────────────────────────────────
// REPORTE DE ERRORES
//
// Sin esto, un fallo en pleno servicio moría en la consola del navegador de
// alguien y nadie se enteraba nunca. Esto lo deja escrito en la base, para
// poder contestar "¿se rompió algo, a quién, cuántas veces?".
//
// Reglas que se cumplen a rajatabla:
//   · Nunca romper la app por intentar reportar. Todo va en try/catch y si
//     falla, se calla: un error reportando un error no puede tumbar nada.
//   · No inundar la base. El mismo mensaje no se manda dos veces seguidas ni
//     más de un puñado por sesión.
// ─────────────────────────────────────────────────────────────────────────

const MAX_POR_SESION = 20;
const VENTANA_REPETIDO_MS = 30_000;

let enviados = 0;
const ultimoPorMensaje = new Map();

export async function reportError(error, { app = 'web', context = '' } = {}) {
  try {
    if (enviados >= MAX_POR_SESION) return;

    const message = [context, String(error?.message || error)].filter(Boolean).join(' — ').slice(0, 500);
    if (!message) return;

    // Un bucle de render puede lanzar el mismo error cientos de veces por
    // segundo; sin esto, una sola pestaña llenaría la tabla.
    const ahora = Date.now();
    const previo = ultimoPorMensaje.get(message);
    if (previo && ahora - previo < VENTANA_REPETIDO_MS) return;
    ultimoPorMensaje.set(message, ahora);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // La policy exige profile_id = auth.uid()

    let orgId = null;
    try {
      const { data } = await supabase.from('profiles').select('org_id').eq('id', user.id).maybeSingle();
      orgId = data?.org_id || null;
    } catch { /* el error se reporta igual, solo sin organización */ }

    enviados++;
    await supabase.from('error_log').insert({
      org_id: orgId,
      profile_id: user.id,
      app,
      message,
      stack: String(error?.stack || '').slice(0, 4000),
      url: typeof window !== 'undefined' ? window.location.href.slice(0, 500) : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
    });
  } catch {
    // Silencio a propósito: reportar nunca puede ser la causa de un fallo.
  }
}

/**
 * Engancha los errores que nadie captura: excepciones sueltas y promesas
 * rechazadas. Son justo los que hoy se perdían.
 */
export function installGlobalErrorReporting(app = 'web') {
  if (typeof window === 'undefined' || window.__bandlyErrorHooked) return;
  window.__bandlyErrorHooked = true;

  window.addEventListener('error', (e) => {
    reportError(e.error || new Error(e.message), { app, context: 'window.onerror' });
  });

  window.addEventListener('unhandledrejection', (e) => {
    reportError(e.reason instanceof Error ? e.reason : new Error(String(e.reason)), {
      app, context: 'promesa sin catch',
    });
  });
}
