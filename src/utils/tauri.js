import { invoke } from '@tauri-apps/api/core';

export const isTauri = () => {
  return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
};

// Wrapper seguro para invoke que no rompe el navegador
export const safeInvoke = async (command, args = {}) => {
  if (isTauri()) {
    try {
      return await invoke(command, args);
    } catch (err) {
      console.error(`[Tauri Error] Fallo en comando "${command}":`, err);
      return null;
    }
  }
  return null;
};
