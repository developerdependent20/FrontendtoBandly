import { isTauri } from './tauri';

/**
 * Gestor de almacenamiento local para Bandly.
 * Maneja la descarga y persistencia de stems para uso offline.
 * Adaptado a Tauri 2.0 con seguridad perimetral.
 */
export const OfflineManager = {
  isAvailable: isTauri(),

  /**
   * Obtiene la ruta base para una canción específica
   */
  async getSongDir(songId) {
    if (!isTauri()) return null;
    const { appLocalDataDir, join } = await import('@tauri-apps/api/path');
    const base = await appLocalDataDir();
    return await join(base, 'multitracks', songId.toString());
  },

  /**
   * Verifica si una canción ya está descargada
   */
  /**
   * Verifica si todos los stems específicos de una canción están descargados
   */
  async verifySongStems(songId, stems) {
    if (!isTauri() || !stems || stems.length === 0) return false;
    try {
      const { exists } = await import('@tauri-apps/plugin-fs');
      const { join } = await import('@tauri-apps/api/path');
      const songDir = await this.getSongDir(songId);
      
      // Verificamos si al menos existe la carpeta. La lógica de Rust extract_multitrack_zip
      // se encarga de no sobreescribir si ya hay archivos válidos.
      const folderExists = await exists(songDir);
      if (!folderExists) return false;

      // Opcional: Verificar si existen los archivos específicos (ahora con sus nombres originales)
      for (const stem of stems) {
        const filePath = await join(songDir, stem.original_name);
        if (!(await exists(filePath))) return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Obtiene la URL local de un archivo (para Tone.js)
   */
  async getLocalUrl(songId, fileName) {
    if (!isTauri()) return null;
    try {
      const { exists, readFile } = await import('@tauri-apps/plugin-fs');
      const { join } = await import('@tauri-apps/api/path');
      const songDir = await this.getSongDir(songId);
      const filePath = await join(songDir, fileName); // El nombre exacto que viene del ZIP
      
      if (await exists(filePath)) {
        const data = await readFile(filePath);
        const ext = fileName.split('.').pop().toLowerCase();
        const mime = (ext === 'wav' || ext === 'aif' || ext === 'aiff') ? 'audio/wav' : 'audio/mpeg';
        const blob = new Blob([data], { type: mime });
        return URL.createObjectURL(blob);
      }
      return null;
    } catch (error) {
      console.error(`[OfflineManager] Error leyendo archivo local ${fileName}:`, error);
      return null;
    }
  }
};
