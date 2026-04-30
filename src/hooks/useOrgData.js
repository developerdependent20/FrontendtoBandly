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
      const resMem = await supabase.from('profiles').select('*').eq('org_id', orgId);
      if (!resMem.error) setMembers(resMem.data);

      const resSongs = await supabase.from('songs').select('*, sequences(id)').eq('org_id', orgId).order('title', { ascending: true });
      if (!resSongs.error) setSongs(resSongs.data);

      const resEv = await supabase.from('events').select('*, event_roster(*), event_songs(*, songs(*, sequences(id)))').eq('org_id', orgId).order('date', { ascending: true });
      if (!resEv.error) setEvents(resEv.data);
    } catch (e) {
      console.error('Error fetching org data:', e);
    }
  };

  return { members, events, songs, fetchData };
}
