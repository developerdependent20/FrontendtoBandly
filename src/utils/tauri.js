import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const isTauri = () => {
  return typeof window !== 'undefined' && (!!window.__TAURI_INTERNALS__ || !!window.__TAURI__ || !!window.__TAURI_IPC__);
};

// Wrapper seguro para invoke que no rompe el navegador
export const safeInvoke = async (command, args = {}) => {
  if (isTauri()) {
    try {
      return await invoke(command, args);
    } catch (err) {
      console.error(`[Tauri Error] Fallo en comando "${command}":`, err);
      throw err; 
    }
  }
  return null;
};

// Wrapper seguro para listen (Eventos de Rust -> JS)
export const safeListen = async (event, callback) => {
    if (isTauri()) {
        return await listen(event, callback);
    }
    return () => {}; // No-op unlisten
};
