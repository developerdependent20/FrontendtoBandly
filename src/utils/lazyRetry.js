import { lazy } from 'react';

const KEY = 'bandly_chunk_reload_at';

// Recarga la página una sola vez (máx. 1 cada 30 s) para evitar bucles.
export function reloadOnceForNewDeploy() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* sessionStorage no disponible: recargamos igual */ }
  window.location.reload();
  return true;
}

/**
 * React.lazy que sobrevive a un deploy nuevo: si el chunk con hash ya no existe
 * (el index viejo está en caché), recarga la página para traer el index nuevo.
 */
export function lazyRetry(factory) {
  return lazy(() =>
    factory().catch((err) => {
      if (reloadOnceForNewDeploy()) return new Promise(() => {}); // esperando el reload
      throw err;
    })
  );
}
