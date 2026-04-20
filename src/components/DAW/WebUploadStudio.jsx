import React, { useState, useEffect } from 'react';
import { CloudUpload, Music, ChevronDown, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import SequenceUploader from '../SequenceUploader';

const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : ''
);

export default function WebUploadStudio({ songs = [], orgId, session, profile, refreshData }) {
  const [selectedSong, setSelectedSong] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [sequences, setSequences] = useState({}); // songId -> boolean (has sequence)
  const [loadingSeqs, setLoadingSeqs] = useState(true);
  const [search, setSearch] = useState('');

  // Cargar qué canciones ya tienen secuencia
  useEffect(() => {
    if (!songs.length) { setLoadingSeqs(false); return; }
    const ids = songs.map(s => s.id);
    supabase
      .from('sequences')
      .select('song_id')
      .in('song_id', ids)
      .then(({ data }) => {
        const map = {};
        if (data) data.forEach(r => { map[r.song_id] = true; });
        setSequences(map);
        setLoadingSeqs(false);
      });
  }, [songs]);

  const filteredSongs = songs.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSongClick = (song) => {
    setSelectedSong(song);
    setShowUploader(true);
  };

  const handleUploadComplete = () => {
    setShowUploader(false);
    setSelectedSong(null);
    // Refresh sequence status
    const ids = songs.map(s => s.id);
    supabase.from('sequences').select('song_id').in('song_id', ids).then(({ data }) => {
      const map = {};
      if (data) data.forEach(r => { map[r.song_id] = true; });
      setSequences(map);
    });
    if (refreshData) refreshData();
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(160deg, #020617 0%, #0f172a 50%, #1e1432 100%)',
      minHeight: '100vh',
      padding: '0 2rem 2rem',
    }}>

      {/* Header Hero */}
      <div style={{
        padding: '2.5rem 0 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '2rem',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px rgba(139,92,246,0.4)',
          flexShrink: 0,
        }}>
          <CloudUpload size={26} color="white" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            Subir Secuencia
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Selecciona una canción y sube su multitrack ZIP a la nube.
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
        <input
          id="wus-search"
          type="text"
          placeholder="Buscar canción..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '12px',
            padding: '0.75rem 1rem 0.75rem 2.8rem',
            color: 'white',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <Music size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
      </div>

      {/* Songs list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        {loadingSeqs ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0', fontSize: '0.9rem' }}>
            Cargando repertorio...
          </div>
        ) : filteredSongs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0', fontSize: '0.9rem' }}>
            No hay canciones en el repertorio todavía.
          </div>
        ) : (
          filteredSongs.map(song => {
            const hasSeq = !!sequences[song.id];
            return (
              <button
                id={`wus-song-${song.id}`}
                key={song.id}
                onClick={() => handleSongClick(song)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem 1.25rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  color: 'white',
                  fontFamily: 'inherit',
                  width: '100%',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(139,92,246,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                {/* Color dot / status */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                  background: hasSeq ? 'rgba(34,197,94,0.15)' : 'rgba(139,92,246,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${hasSeq ? 'rgba(34,197,94,0.3)' : 'rgba(139,92,246,0.2)'}`,
                }}>
                  {hasSeq
                    ? <ShieldCheck size={18} color="#22c55e" />
                    : <CloudUpload size={18} color="#8b5cf6" />
                  }
                </div>

                {/* Song info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '10px' }}>
                    {song.key && <span>Orig: {song.key}</span>}
                    {song.bpm && <span>BPM: {song.bpm}</span>}
                    <span style={{ color: hasSeq ? '#22c55e' : '#64748b', fontWeight: '700' }}>
                      {hasSeq ? '✓ Secuencia subida' : '+ Subir secuencia'}
                    </span>
                  </div>
                </div>

                <ChevronDown size={16} color="#475569" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }} />
              </button>
            );
          })
        )}
      </div>

      {/* SequenceUploader modal triggered when song is selected */}
      {showUploader && selectedSong && (
        <SequenceUploader
          song={selectedSong}
          orgId={orgId}
          session={session}
          apiUrl={API_URL}
          onClose={() => { setShowUploader(false); setSelectedSong(null); }}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}
