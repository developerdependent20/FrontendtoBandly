import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useOrgData(orgId) {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [songs, setSongs] = useState([]);
  const [orgSettings, setOrgSettings] = useState(null);

  // fetchData depende SOLO de orgId (usa el setState funcional para leer el estado
  // más reciente sin cerrar sobre él). Si dependiera de members/events/songs/orgSettings
  // —que la propia función actualiza— entraría en un loop infinito de refetch.
  const fetchData = useCallback(async () => {
    try {
      // 1. Cargar rápido desde caché para Optimistic UI o Modo Offline
      const cachedData = localStorage.getItem(`bandly_offline_org_${orgId}`);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setMembers(prev => prev.length === 0 ? (parsed.members || []) : prev);
        setEvents(prev => prev.length === 0 ? (parsed.events || []) : prev);
        setSongs(prev => prev.length === 0 ? (parsed.songs || []) : prev);
        setOrgSettings(prev => prev ? prev : (parsed.orgSettings || null));
      }

      // Si no hay internet, nos quedamos solo con la caché
      if (!navigator.onLine) {
        console.log('[Offline] Usando datos cacheados de la agenda y setlist');
        return;
      }

      const resMem = await supabase.from('profiles').select('*').eq('org_id', orgId);
      const resSongs = await supabase.from('songs').select('*, sequences(id)').eq('org_id', orgId).order('title', { ascending: true });
      const resEv = await supabase.from('events').select('*, event_roster(*), event_songs(*, songs(*, sequences(id)))').eq('org_id', orgId).order('date', { ascending: true });
      const resOrg = await supabase.from('organizations').select('settings').eq('id', orgId).single();

      if (resMem.error || resSongs.error || resEv.error) throw new Error("Supabase fetch failed");

      setMembers(resMem.data);
      setSongs(resSongs.data);
      setEvents(resEv.data);
      if (resOrg.data) setOrgSettings(resOrg.data.settings);

      // 2. Guardar en Caché Local para la próxima vez (o para cuando se vaya el internet)
      localStorage.setItem(`bandly_offline_org_${orgId}`, JSON.stringify({
        members: resMem.data,
        songs: resSongs.data,
        events: resEv.data,
        orgSettings: resOrg.data?.settings || null,
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
        setOrgSettings(parsed.orgSettings || null);
      }
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) fetchData();
  }, [orgId, fetchData]);

  return { members, events, songs, orgSettings, fetchData };
}
