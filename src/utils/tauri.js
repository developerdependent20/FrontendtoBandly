import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const isTauri = () => {
  return typeof window !== 'undefined' && (
    window.__TAURI_INTERNALS__ !== undefined || 
    window.__TAURI_IPC__ !== undefined || 
    window.__TAURI__ !== undefined ||
    navigator.userAgent.includes('WebView2') ||
    navigator.userAgent.includes('Tauri')
  );
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
