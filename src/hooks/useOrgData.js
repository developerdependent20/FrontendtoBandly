import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { DEFAULT_DEPARTMENTS } from '../utils/defaultRoles';

// Exportada: OnboardingScreen la reutiliza para mostrar los roles/instrumentos
// REALES del equipo al que alguien se está uniendo por código, en vez de una
// lista genérica aparte (ver commit que arregla el mismatch de ids en "Selecciona
// tus funciones").
export const migrateSettings = (settings) => {
  if (!settings) return null;
  if (settings.departments) return settings;
  
  // Migrate from old structure to new structure
  return {
    ...settings,
    departments: [
      { ...DEFAULT_DEPARTMENTS[0], roles: settings.leadership || DEFAULT_DEPARTMENTS[0].roles },
      { ...DEFAULT_DEPARTMENTS[1], roles: settings.production || DEFAULT_DEPARTMENTS[1].roles },
      { ...DEFAULT_DEPARTMENTS[2], roles: settings.logistics || DEFAULT_DEPARTMENTS[2].roles },
      { ...DEFAULT_DEPARTMENTS[3], roles: settings.instruments || DEFAULT_DEPARTMENTS[3].roles }
    ]
  };
};

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

      // Los miembros salen de la tabla de membresías, no de profiles.org_id:
      // ese campo ahora significa "dónde está parado el usuario ahora mismo", y
      // un músico que toca en dos iglesias desaparecería del roster de una
      // mientras tuviera la otra abierta. El rol y las funciones también son
      // por organización (director en la tuya, guitarrista invitado en la otra).
      // Las 4 consultas son independientes entre sí — antes se esperaban una
      // por una en serie, sumando su latencia; en paralelo el tiempo total es
      // el de la más lenta, no la suma de las cuatro.
      const [resMem, resSongs, resEv, resOrg] = await Promise.all([
        supabase.from('org_members').select('role, functions, profiles(*)').eq('org_id', orgId),
        supabase.from('songs').select('*, sequences(id)').eq('org_id', orgId).order('title', { ascending: true }),
        supabase.from('events').select('*, event_roster(*), event_songs(*, songs(*, sequences(id)))').eq('org_id', orgId).order('date', { ascending: true }),
        supabase.from('organizations').select('settings').eq('id', orgId).single()
      ]);

      if (resMem.error || resSongs.error || resEv.error) throw new Error("Supabase fetch failed");

      // Se aplana a la misma forma que tenía antes (los campos del perfil, con
      // rol y funciones encima) para que TeamList y el resto no cambien.
      const members = (resMem.data || [])
        .filter(m => m.profiles)
        .map(m => ({ ...m.profiles, role: m.role, functions: m.functions }));

      setMembers(members);
      setSongs(resSongs.data);
      setEvents(resEv.data);
      if (resOrg.data) setOrgSettings(migrateSettings(resOrg.data.settings));

      // 2. Guardar en Caché Local para la próxima vez (o para cuando se vaya el internet)
      localStorage.setItem(`bandly_offline_org_${orgId}`, JSON.stringify({
        members,
        songs: resSongs.data,
        events: resEv.data,
        orgSettings: resOrg.data?.settings ? migrateSettings(resOrg.data.settings) : null,
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
        setOrgSettings(migrateSettings(parsed.orgSettings));
      }
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) fetchData();
  }, [orgId, fetchData]);

  return { members, events, songs, orgSettings, fetchData };
}
