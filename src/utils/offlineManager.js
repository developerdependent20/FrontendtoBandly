import { exists, mkdir, writeFile, readFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { fetch } from '@tauri-apps/plugin-http';
import { appDataDir, join } from '@tauri-apps/api/path';

const isTauri = !!window.__TAURI_INTERNALS__;

/**
 * Gestor de almacenamiento local para Bandly.
 * Maneja la descarga y persistencia de stems para uso offline.
 */
export const OfflineManager = {
  isAvailable: isTauri,

  /**
   * Obtiene la ruta base para una canción específica
   */
  async getSongDir(songId) {
    if (!isTauri) return null;
    const base = await appDataDir();
    return await join(base, 'songs', songId.toString());
  },

  /**
   * Descarga un stem y lo guarda localmente
   */
  async downloadStep(songId, stemId, url) {
    if (!isTauri) return null;

    try {
      const songDir = await this.getSongDir(songId);
      const stemsDir = await join(songDir, 'stems');
      
      // Crear directorios si no existen
      if (!(await exists(stemsDir, { baseDir: BaseDirectory.AppData }))) {
        await mkdir(stemsDir, { recursive: true, baseDir: BaseDirectory.AppData });
      }

      const filePath = await join(stemsDir, `${stemId}.mp3`);

      // Descargar archivo
      const response = await fetch(url, { method: 'GET', responseType: 2 }); // 2 = Binary
      const data = new Uint8Array(await response.arrayBuffer());

      // Guardar localmente
      await writeFile(filePath, data, { baseDir: BaseDirectory.AppData });
      
      return filePath;
    } catch (error) {
      console.error(`[OfflineManager] Error descargando stem ${stemId}:`, error);
      throw error;
    }
  },

  /**
   * Verifica si una canción ya está descargada
   */
  async isSongDownloaded(songId) {
    if (!isTauri) return false;
    try {
      const songDir = await this.getSongDir(songId);
      return await exists(songDir, { baseDir: BaseDirectory.AppData });
    } catch {
      return false;
    }
  },

  /**
   * Obtiene la URL local de un archivo (para Tone.js)
   */
  async getLocalUrl(songId, stemId) {
    if (!isTauri) return null;
    try {
      const songDir = await this.getSongDir(songId);
      const filePath = await join(songDir, 'stems', `${stemId}.mp3`);
      
      if (await exists(filePath, { baseDir: BaseDirectory.AppData })) {
        const data = await readFile(filePath, { baseDir: BaseDirectory.AppData });
        const blob = new Blob([data], { type: 'audio/mpeg' });
        return URL.createObjectURL(blob);
      }
      return null;
    } catch (error) {
      console.error(`[OfflineManager] Error leyendo archivo local ${stemId}:`, error);
      return null;
    }
  }
};
