import React, { useState, useEffect } from 'react';
import { Music, CloudDownload, X, Search, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { OfflineManager } from '../../utils/offlineManager';
import { safeInvoke, isTauri } from '../../utils/tauri';

export default function CloudRepertoire({ songs, onSelect, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [syncedSongs, setSyncedSongs] = useState({}); // { songId: boolean }
  const [syncingProgress, setSyncingProgress] = useState({}); // { songId: string }

  // Verificar estado local al abrir
  useEffect(() => {
    const checkSyncStatus = async () => {
      const statusMap = {};
      for (const song of songs) {
        if (!song.sequences?.[0]) continue;
        const { data: stems } = await supabase.from('sequence_stems').select('id').eq('sequence_id', song.sequences[0].id);
        const isSynced = await OfflineManager.verifySongStems(song.id, stems || []);
        statusMap[song.id] = isSynced;
      }
      setSyncedSongs(statusMap);
    };
    if (isTauri()) checkSyncStatus();
  }, [songs]);

  const handleSync = async (e, song) => {
    e.stopPropagation();
    if (!isTauri() || !song.sequences?.[0]) return;
    
    setSyncingProgress(prev => ({ ...prev, [song.id]: '0%' }));
    
    try {
      const { data: sequence } = await supabase.from('sequences').select('*, sequence_stems(*)').eq('id', song.sequences[0].id).single();
      const stems = sequence?.sequence_stems || [];
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const baseUrl = import.meta.env.VITE_R2_PUBLIC_URL;
      const songDir = song.id.toString();

      let completed = 0;
      for (const stem of stems) {
        const url = stem.r2_key ? `${baseUrl}/${stem.r2_key}` : (stem.playback_url || stem.url);
        if (url) {
          await safeInvoke('download_multitrack', { 
            url, 
            songId: songDir, 
            fileName: `${stem.id}.mp3`,
            token 
          });
        }
        completed++;
        setSyncingProgress(prev => ({ ...prev, [song.id]: `${Math.round((completed / stems.length) * 100)}%` }));
      }

      setSyncedSongs(prev => ({ ...prev, [song.id]: true }));
      setSyncingProgress(prev => ({ ...prev, [song.id]: null }));
    } catch (error) {
      console.error("[CloudRepertoire] Error sincronizando:", error);
      setSyncingProgress(prev => ({ ...prev, [song.id]: null }));
      alert("Error al sincronizar. Revisa tu conexión.");
    }
  };
  
  const filteredSongs = songs?.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-overlay" style={{ backdropFilter: 'blur(10px)', zIndex: 1000, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
      <div className="glass-panel" style={{ 
        width: '500px', 
        maxHeight: '80vh', 
        padding: '2rem', 
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid var(--daw-border)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Music size={22} color="var(--daw-cyan)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: 'white' }}>REPERTORIO CLOUD</h3>
          </div>
          <button onClick={onClose} className="icon-btn-subtle" style={{ color: 'var(--daw-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--daw-text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar canción..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem 0.75rem 0.75rem 2.5rem', 
              background: 'rgba(0,0,0,0.3)', 
              border: '1px solid var(--daw-border)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '0.9rem',
              outline: 'none'
            }} 
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
          {filteredSongs?.map(song => {
            const isSynced = syncedSongs[song.id];
            const progress = syncingProgress[song.id];

            return (
              <button 
                key={song.id} 
                onClick={() => onSelect(song)}
                className="repertoire-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: 'white'
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{song.title}</div>
                    {isSynced ? (
                       <CheckCircle2 size={14} color="var(--daw-green)" />
                    ) : song.sequences?.length > 0 ? (
                      <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(0, 251, 255, 0.2)', color: 'var(--daw-cyan)', borderRadius: '4px', fontWeight: '900' }}>CLOUD</span>
                    ) : (
                      <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: 'var(--daw-text-muted)', borderRadius: '4px', fontWeight: '900' }}>VACÍO</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--daw-text-muted)', marginTop: '4px' }}>
                    {song.bpm} BPM • {song.key}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {progress ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <Loader2 size={16} className="animate-spin" color="var(--daw-cyan)" />
                      <span style={{ fontSize: '0.6rem', fontWeight: '900' }}>{progress}</span>
                    </div>
                  ) : !isSynced && song.sequences?.length > 0 ? (
                    <div 
                      onClick={(e) => handleSync(e, song)}
                      className="sync-btn"
                      style={{ 
                        padding: '6px', 
                        borderRadius: '6px', 
                        background: 'rgba(34, 211, 238, 0.1)', 
                        color: 'var(--daw-cyan)',
                        border: '1px solid rgba(34, 211, 238, 0.2)'
                      }}
                    >
                      <CloudDownload size={18} />
                    </div>
                  ) : isSynced && (
                    <div style={{ color: 'var(--daw-green)', opacity: 0.8 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: '900', marginRight: '5px' }}>OFFLINE</span>
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
          {filteredSongs?.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--daw-text-muted)', padding: '2rem' }}>
              No se encontraron canciones.
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .repertoire-item:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: var(--daw-cyan) !important;
          transform: translateX(4px);
        }
        .sync-btn:hover {
          background: var(--daw-cyan) !important;
          color: black !important;
        }
      `}</style>
    </div>
  );
}
