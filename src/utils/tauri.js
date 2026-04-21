import { invoke } from '@tauri-apps/api/core';

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
      throw err; // Lanzamos el error para que el componente lo maneje
    }
  }
  console.warn(`[Tauri] Intento de comando "${command}" fuera de entorno desktop.`);
  return null;
};
