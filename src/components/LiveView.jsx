import React, { useState, useEffect } from 'react';
import { PlayCircle, ListMusic, Music, Search, Trash2, GripVertical, Info, Headphones, Zap, ChevronDown, Plus } from 'lucide-react';
import ProPlayer from './ProPlayer';
import { AudioCache } from '../utils/audioCache';
import { supabase } from '../supabaseClient';
import './LiveView.css';

/**
 * LiveView - Versión de Rescate y Estabilidad
 * Hemos vuelto a la base sólida mientras optimizamos el motor en segundo plano.
 */
export default function LiveView({ songs, session, profile }) {
  const [setlist, setSetlist] = useState(() => {
    try {
      const saved = localStorage.getItem('bandly_setlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [activeSong, setActiveSong] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);

  useEffect(() => {
    const songIdToLoad = localStorage.getItem('bandly_load_song_id');
    if (songIdToLoad && (songs || []).length > 0) {
      const targetSong = songs.find(s => s.id === songIdToLoad);
      if (targetSong) {
        if (!setlist.find(x => x.id === targetSong.id)) {
           setSetlist(prev => [...prev, targetSong]);
        }
        loadFromBackend(targetSong);
      }
      localStorage.removeItem('bandly_load_song_id');
    }
  }, [songs]);

  useEffect(() => {
    localStorage.setItem('bandly_setlist', JSON.stringify(setlist));
  }, [setlist]);

  const availableSongs = (songs || []).filter(s => 
    (s.sequences && s.sequences.length > 0) || (s.stems && s.stems.length > 0)
  ).filter(s => s.title && s.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const addToSetlist = (song) => {
    if (setlist.find(s => s.id === song.id)) return;
    setSetlist([...setlist, song]);
  };

  const removeFromSetlist = (id) => {
    setSetlist(setlist.filter(s => s.id !== id));
    if (activeSong?.id === id) setActiveSong(null);
  };

  const loadFromBackend = async (song) => {
    if (activeSong?.id === song.id) return;
    setIsLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const { data: { session: freshSession } } = await supabase.auth.getSession();
      const token = freshSession?.access_token || session?.access_token;
      const resp = await fetch(`${API_URL}/api/sequences/${song.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Error de conexión');
      const data = await resp.json();
      
      console.log(`[LiveView] Hidratando canción "${song.title}":`, data);
      
      if (data.sequence && data.sequence.stems) {
        console.log(`[LiveView] Recibidos ${data.sequence.stems.length} instrumentos de Supabase.`);
        
        // Actualizamos la canción activa CON los nuevos instrumentos antes de abrir el player
        const hydratedSong = { 
          ...song, 
          stems: data.sequence.stems, 
          bpm: data.sequence.bpm || song.bpm, 
          key: data.sequence.key || song.key, 
          name: song.title 
        };
        
        setActiveSong(hydratedSong);
      } else {
        console.warn("[LiveView] La secuencia no contiene instrumentos adicionales.");
      }
    } catch (e) { alert(e.message); } finally { setIsLoading(false); }
  };

  return (
    <div className="live-view-container-m32">
      <aside className="live-sidebar-unified">
        <div className="sidebar-section setlist-upper">
          <div className="section-header">
            <ListMusic size={16} />
            <span>SETLIST DEL SHOW</span>
            <span className="count-badge">{setlist.length}</span>
          </div>
          <div className="list-content scrollable">
            {setlist.map((s, index) => (
              <div 
                key={s.id}
                className={`setlist-item-mini ${activeSong?.id === s.id ? 'is-active' : ''}`}
                onClick={() => loadFromBackend(s)}
              >
                <GripVertical size={12} className="drag-handle" />
                <div className="song-info">
                  <span className="title">{s.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="meta">{s.key} // {s.bpm} BPM</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeFromSetlist(s.id); }} className="trash-btn">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={`sidebar-section repository-lower ${isLibraryExpanded ? 'is-expanded' : ''}`}>
          <div className="section-header clickable" onClick={() => setIsLibraryExpanded(!isLibraryExpanded)}>
            <Music size={16} />
            <span>REPOSITORIO / NUBE</span>
            <div className="expand-icon">{isLibraryExpanded ? <ChevronDown size={14} /> : <Search size={14} />}</div>
          </div>
          {isLibraryExpanded && (
            <div className="repository-content">
              <div className="search-box-mini">
                <input 
                  type="text" 
                  placeholder="Buscar en la biblioteca..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="list-content scrollable">
                {availableSongs.map(s => (
                  <div key={s.id} className="library-item-mini" onClick={() => addToSetlist(s)}>
                    <div className="song-detail">
                      <strong>{s.title}</strong>
                      <span>{s.bpm} BPM</span>
                    </div>
                    <Plus size={14} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="live-player-area">
        {activeSong ? (
          <ProPlayer song={activeSong} onClose={() => setActiveSong(null)} />
        ) : (
          <div className="player-empty-state">
            {isLoading ? (
              <div className="loader-box">
                <Zap className="spin-slow" size={48} />
                <p>CARGANDO SECUENCIA...</p>
              </div>
            ) : (
              <div className="m32-welcome">
                <PlayCircle size={64} color="var(--primary)" />
                <h2>M32 VIRTUAL STATION</h2>
                <p>Selecciona una secuencia del setlist para iniciar la mezcla en vivo.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
