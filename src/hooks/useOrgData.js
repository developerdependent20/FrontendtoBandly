import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useOrgData(profile) {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    if (profile?.org_id) fetchData();
  }, [profile?.org_id]);

  const fetchData = async () => {
    try {
      const resMem = await supabase.from('profiles').select('*').eq('org_id', profile.org_id);
      if (!resMem.error) setMembers(resMem.data);

      const resSongs = await supabase.from('songs').select('*').eq('org_id', profile.org_id).order('title', { ascending: true });
      if (!resSongs.error) setSongs(resSongs.data);

      const resEv = await supabase.from('events').select('*, event_roster(*), event_songs(*, songs(*))').eq('org_id', profile.org_id).order('date', { ascending: true });
      if (!resEv.error) setEvents(resEv.data);
    } catch (e) {
      console.error('Error fetching org data:', e);
    }
  };

  return { members, events, songs, fetchData };
}
