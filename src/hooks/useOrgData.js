import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useOrgData(orgId) {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    if (orgId) fetchData();
  }, [orgId]);

  const fetchData = async () => {
    try {
      // 1. Cargar rápido desde caché para Optimistic UI o Modo Offline
      const cachedData = localStorage.getItem(`bandly_offline_org_${orgId}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (members.length === 0) setMembers(parsed.members || []);
        if (events.length === 0) setEvents(parsed.events || []);
        if (songs.length === 0) setSongs(parsed.songs || []);
      }

      // Si no hay internet, nos quedamos solo con la caché
      if (!navigator.onLine) {
        console.log('[Offline] Usando datos cacheados de la agenda y setlist');
        return;
      }

      const resMem = await supabase.from('profiles').select('*').eq('org_id', orgId);
      const resSongs = await supabase.from('songs').select('*, sequences(id)').eq('org_id', orgId).order('title', { ascending: true });
      const resEv = await supabase.from('events').select('*, event_roster(*), event_songs(*, songs(*, sequences(id)))').eq('org_id', orgId).order('date', { ascending: true });

      if (resMem.error || resSongs.error || resEv.error) throw new Error("Supabase fetch failed");

      setMembers(resMem.data);
      setSongs(resSongs.data);
      setEvents(resEv.data);

      // 2. Guardar en Caché Local para la próxima vez (o para cuando se vaya el internet)
      localStorage.setItem(`bandly_offline_org_${orgId}`, JSON.stringify({
        members: resMem.data,
        songs: resSongs.data,
        events: resEv.data,
        lastSync: new Date().toISOString()
      }));

    } catch (e) {
      console.error('Error fetching org data, falling back to cache:', e);
      // Fallback estricto a caché en caso de fallo inesperado del servidor
      const cachedData = localStorage.getItem(`bandly_offline_org_${orgId}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setMembers(parsed.members || []);
        setEvents(parsed.events || []);
        setSongs(parsed.songs || []);
      }
    }
  };

  return { members, events, songs, fetchData };
}
