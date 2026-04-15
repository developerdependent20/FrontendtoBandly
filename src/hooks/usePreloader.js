import React, { useState, useEffect } from 'react';
import { AudioCache } from '../utils/audioCache';
import { supabase } from '../supabaseClient';

/**
 * usePreloader - El "Cerebro Silencioso" de Bandly Live.
 * Escucha cambios en el setlist y descarga todo al disco local proactivamente.
 */
export default function usePreloader(setlist = [], session) {
  const [cachedSongs, setCachedSongs] = useState({}); // { songId: { stems: [], isReady: boolean, status: 'loading'|'ready'|'error' } }
  const [isPreloading, setIsPreloading] = useState(false);

  useEffect(() => {
    if (!setlist || setlist.length === 0) return;

    const preloadAll = async () => {
      setIsPreloading(true);
      
      for (const song of setlist) {
        // 1. Si ya está cargando o listo, no repetir
        if (cachedSongs[song.id] && cachedSongs[song.id].status !== 'error') continue;

        try {
          // Marcar como cargando en el estado individual
          setCachedSongs(prev => ({
            ...prev,
            [song.id]: { ...prev[song.id], status: 'loading' }
          }));
          
          let stems = song.stems;
          if (!stems) {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const { data: { session: freshSession } } = await supabase.auth.getSession();
            const token = freshSession?.access_token || session?.access_token;
            
            const resp = await fetch(`${API_URL}/api/sequences/${song.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resp.ok) {
              const data = await resp.json();
              stems = data.sequence?.stems || [];
            }
          }

          if (stems && stems.length > 0) {
            await Promise.all(stems.map(async (stem) => {
              try {
                await AudioCache.getTrackPath(stem.id, stem.playbackUrl);
              } catch (e) { console.warn(`[Preloader] Fallo stem: ${stem.name}`, e); }
            }));

            setCachedSongs(prev => ({
              ...prev,
              [song.id]: { stems, isReady: true, status: 'ready' }
            }));
          } else {
             throw new Error('Sin stems disponibles');
          }

        } catch (err) {
          console.error(`[Preloader] Fallo en ${song.title}:`, err);
          setCachedSongs(prev => ({
            ...prev,
            [song.id]: { ...prev[song.id], status: 'error' }
          }));
        }
      }
      setIsPreloading(false);
    };

    preloadAll();
  }, [setlist, session]);

  return { cachedSongs, isPreloading };
}
