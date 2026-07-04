import React, { useState } from 'react';
import { Music, Plus, Trash2, FileText, Headphones, X, Loader2, BookOpen, ShieldCheck, Settings } from 'lucide-react';
import * as Tone from 'tone';
import { supabase } from '../supabaseClient';
import ChartStudio from './ChartStudio';
import SequenceUploader from './SequenceUploader';
import WebStemPlayer from './DAW/WebStemPlayer';
import ProMixer from './DAW/ProMixer';
import { isTauri } from '../utils/tauri';

const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : ''
);

export default function SongLibrary({ songs, events, orgId, readOnly, refreshData, session, profile, setActiveTab }) {
  const [showModal, setShowModal] = useState(false);
  const [chartSong, setChartSong] = useState(null);
  const [seqUploadSong, setSeqUploadSong] = useState(null);
  const [seqMixerData, setSeqMixerData] = useState(null);
  const [loadingSeq, setLoadingSeq] = useState(null);
  const [title, setTitle] = useState('');
  const [songKey, setSongKey] = useState('');
  const [keyMale, setKeyMale] = useState('');
  const [keyFemale, setKeyFemale] = useState('');
  const [bpm, setBpm] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [editingSongId, setEditingSongId] = useState(null);

  const getLastPlayedText = (songId) => {
    if (!events || events.length === 0) return 'Nunca';
    const now = new Date();
    const pastPlays = events.filter(ev => 
      new Date(ev.date) < now && 
      ev.event_songs?.some(es => String(es.song_id) === String(songId))
    );
    if (pastPlays.length === 0) return 'Nunca';
    pastPlays.sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastDate = new Date(pastPlays[0].date);
    const diffTime = Math.abs(now - lastDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays/7)} sem`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays/30)} meses`;
    return `Hace >1 año`;
  };

  const userFunctions = (() => {
    try {
      return profile?.functions ? JSON.parse(profile.functions) : [];
    } catch { return []; }
  })();
  const canEditSongs = profile?.role === 'director' || userFunctions.includes('admin_musica');

  const openEditModal = (song) => {
    setEditingSongId(song.id);
    setTitle(song.title || '');
    setSongKey(song.key || '');
    setKeyMale(song.key_male || '');
    setKeyFemale(song.key_female || '');
    setBpm(song.bpm || '');
    setYoutubeLink(song.youtube_link || '');
    setShowModal(true);
  };

  const closeOverlay = () => {
    setShowModal(false);
    setEditingSongId(null);
    setTitle(''); setSongKey(''); setKeyMale(''); setKeyFemale(''); setBpm(''); setYoutubeLink('');
  };

  const openMixer = async (song) => {
    if (!session?.access_token) {
      alert("No se encontró una sesión activa. Por favor, intenta cerrar sesión y volver a entrar.");
      setLoadingSeq(null);
      return;
    }

    setLoadingSeq(song.id);
    try {
      // 1. Verificar secuencia directamente en Supabase (Bypass de API para estabilidad)
      const { data: sequences, error: seqError } = await supabase
        .from('sequences')
        .select(`
          *,
          sequence_stems(*)
        `)
        .eq('song_id', song.id);

      if (seqError) throw seqError;

      const mainSequence = sequences && sequences.length > 0 ? sequences[0] : null;

      if (mainSequence && (mainSequence.sequence_stems?.length > 0)) {
        const plan = (profile?.organizations?.plan || 'free').toLowerCase();
        if (plan === 'free') {
          alert("El Reproductor Multi-Track es una función exclusiva para planes de pago (Starter, Pro, Elite). ¡Haz upgrade para escucharlo!");
          setLoadingSeq(null);
          return;
        }

        if (isTauri()) {
          // ESCRITORIO: Navegar a la pestaña DAW y cargar ahí
          localStorage.setItem('bandly_load_song_id', song.id);
          setActiveTab('daw');
        } else {
          // WEB: Cargar el mezclador ligero
          setSeqMixerData(mainSequence);
        }
      } else {
        if (canEditSongs && !readOnly) {
          setSeqUploadSong(song);
        } else {
          alert('Esta canción no tiene secuencia subida aún.');
        }
      }
    } catch (e) {
      alert(`Error al verificar secuencia: ${e.message}`);
    } finally {
      setLoadingSeq(null);
    }
  };

  const handleSave = async () => {
    if(!title) return alert("El título es obligatorio");

    // NORMALIZACIÓN DEFENSIVA (v1.0): Evita error de sintaxis integer en Postgres
    const normalizeInt = (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? null : parsed;
    };

    const payload = {
      title,
      key: songKey,
      key_male: keyMale,
      key_female: keyFemale,
      bpm: normalizeInt(bpm),
      youtube_link: youtubeLink
    };

    try {
      if (editingSongId) {
        const { error } = await supabase.from('songs')
          .update(payload)
          .eq('id', editingSongId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('songs')
          .insert([{ org_id: orgId, ...payload }]);
        if (error) throw error;
      }
      closeOverlay();
      if (refreshData) refreshData();
    } catch(e) { 
      alert("Error de base de datos: " + (e.message || "Fallo al guardar")); 
    }
  };
  

  const handleDeleteSequence = async (songId) => {
    if(!confirm("¿Estás seguro de eliminar la secuencia/multitrack de esta canción? Esto borrará los archivos en la nube y te permitirá subir uno nuevo.")) return;
    try {
      const { data: sequences } = await supabase.from('sequences').select('id').eq('song_id', songId);
      if (sequences && sequences.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        for (const seq of sequences) {
          try {
            await fetch(`${API_URL}/api/sequences/${seq.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
          } catch(e) { console.error('Error borrando secuencia de R2', e); }
        }
      }
      if (refreshData) refreshData();
      alert("Secuencia eliminada correctamente. Ahora puedes subir una nueva.");
    } catch {
      alert("Error al eliminar la secuencia.");
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("¿Estás seguro de eliminar esta canción del repertorio? Se borrarán también los multitracks asociados para ahorrar espacio en la nube.")) return;
    try {
      const { data: sequences } = await supabase.from('sequences').select('id').eq('song_id', id);
      if (sequences && sequences.length > 0) {
        const { data: { session } } = await supabase.auth.getSession();
        for (const seq of sequences) {
          try {
            await fetch(`${API_URL}/api/sequences/${seq.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
          } catch(e) { console.error('Error borrando secuencia de R2', e); }
        }
      }
      await supabase.from('songs').delete().eq('id', id);
      if (refreshData) refreshData();
    } catch {
      alert("Error al eliminar la canción.");
    }
  };

  return (
    <section>
      <div className="library-intro" style={{ marginBottom: '3rem', marginTop: '1rem' }}>
        <h2 className="hero-main-title-large" style={{ fontSize: '3rem', textAlign: 'left', marginBottom: '1.5rem' }}>
          Tu Repertorio. <span className="serif-accent">Elevado.</span>
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <FileText size={28} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Chart Studio</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Crea cifrados profesionales en segundos. <span style={{ color: 'white' }}>Transpón tonos instantáneamente</span>, añade anotaciones de estructura y exporta para todo tu equipo.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <Headphones size={28} color="var(--accent)" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Multitrack Player</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              El corazón de tus ensayos. Sube tus <span style={{ color: 'white' }}>secuencias en multitrack</span>, ajusta la mezcla perfecta para cada músico y ensaya con la máxima fidelidad desde la nube.
            </p>
          </div>
        </div>
      </div>

      <section className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 className="section-title" style={{ margin: 0 }}><Music size={20} color="var(--primary)" /> Repertorio Grupal</h3>
        {canEditSongs && !readOnly && (
          <button onClick={() => { setEditingSongId(null); setShowModal(true); }} className="btn-primary" style={{ padding: '0.4rem 1rem', width: 'auto', fontSize: '0.85rem' }}>
            <Plus size={16} /> Añadir Canción
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {songs?.length === 0 ? <p style={{color:'var(--text-muted)'}}>No hay canciones en el registro. Donde hay unidad y preparación, allí hay bendición.</p> : 
          songs?.map(s => (
            <div key={s.id} className="list-item song-library-item">
              <div className="song-identity">
                <div className="song-header">
                  <strong className="song-title">{s.title}</strong>
                  {canEditSongs && !readOnly && (
                    <div className="song-manage-icons">
                      <button 
                        onClick={() => openEditModal(s)} 
                        className="icon-btn-subtle"
                        title="Editar detalles"
                      >
                        <Settings size={14} /> 
                      </button>
                      <button 
                        onClick={() => handleDelete(s.id)} 
                        className="icon-btn-subtle delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="song-metadata" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
                   <div className="meta-tag">Orig: <span>{s.key || '-'}</span></div>
                   <div className="meta-tag male">👨 Voz: <span>{s.key_male || '-'}</span></div>
                   <div className="meta-tag female">👩 Voz: <span>{s.key_female || '-'}</span></div>
                   <div className="meta-tag bpm">BPM: <span>{s.bpm || '-'}</span></div>
                   <div className="meta-tag" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                     Tocado: <span style={{ fontWeight: '800' }}>{getLastPlayedText(s.id)}</span>
                   </div>
                </div>
              </div>

              <div className="song-visuals" style={{ width: '120px', height: '68px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.youtube_link ? (() => {
                   const match = s.youtube_link.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
                   const yId = match ? match[1] : null;
                   return yId ? (
                     <a href={s.youtube_link} target="_blank" rel="noopener noreferrer" className="yt-thumb-wrapper" style={{ width: '100%', height: '100%', display: 'block', position: 'relative' }}>
                       <img src={`https://img.youtube.com/vi/${yId}/mqdefault.jpg`} alt="YouTube" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                       <div className="yt-play-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>▶</div>
                     </a>
                   ) : (
                     <a href={s.youtube_link} target="_blank" rel="noopener noreferrer" className="yt-link-simple" style={{ color: 'var(--primary)', fontSize: '0.8rem', textDecoration: 'none' }}>📺 Video</a>
                   );
                })() : (
                   <Music size={24} color="rgba(255,255,255,0.1)" />
                )}
              </div>

              <div className="song-actions-grid" style={{ display: 'grid', gridTemplateColumns: (canEditSongs && !readOnly) ? '1fr 1.1fr 36px' : '1fr 1.1fr', gap: '8px', alignItems: 'center', minWidth: (canEditSongs && !readOnly) ? '280px' : '236px', justifyContent: 'flex-end' }}>
                <button onClick={() => setChartSong(s)} className="song-action-btn chart-btn" style={{ width: '100%', whiteSpace: 'nowrap', padding: '10px', height: '38px' }}>
                  <FileText size={14} /> {s.chart_data ? 'Cifrado' : '+ Chart'}
                </button>
                <button 
                  onClick={() => openMixer(s)} 
                  disabled={loadingSeq === s.id} 
                  className={`song-action-btn sequence-btn ${loadingSeq === s.id ? 'loading' : ''} ${s.sequences?.length > 0 || (s.stems && s.stems.length > 0) ? 'ready' : ''}`}
                  style={{ width: '100%', padding: '10px', whiteSpace: 'nowrap', height: '38px' }}
                >
                  {loadingSeq === s.id ? (
                    <Loader2 size={14} className="spin-slow" />
                  ) : s.sequences?.length > 0 || (s.stems && s.stems.length > 0) ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <Headphones size={14} />
                  )}
                  {loadingSeq === s.id ? ' ...' : (s.sequences?.length > 0 || (s.stems && s.stems.length > 0)) ? ' Reprod.' : ' Secuen.'}
                </button>
                
                {canEditSongs && !readOnly && (
                  (s.sequences?.length > 0 || (s.stems && s.stems.length > 0)) ? (
                    <button 
                      onClick={() => handleDeleteSequence(s.id)} 
                      className="song-action-btn sequence-btn hover-scale"
                      style={{ width: '36px', height: '38px', padding: '0', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Eliminar secuencia para subir una nueva"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <div style={{ width: '36px' }} />
                  )
                )}
              </div>
            </div>
          ))
        }
      </div>
      
      {showModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', zIndex: 1000 }}>
          <div className="glass-panel modal-content" style={{ padding: '2.5rem', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(15, 23, 42, 0.8)' }}>
            <button onClick={closeOverlay} className="modal-close-btn">
              <X size={20} />
            </button>
            <h3 className="modal-title" style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
              {editingSongId ? 'Editar Canción' : 'Nueva Canción'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="input-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block', letterSpacing: '1px' }}>Título</label>
                <input type="text" className="input-field" placeholder="Nombre de la canción *" value={title} onChange={e=>setTitle(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>Tono Orig.</label>
                  <input type="text" className="input-field" placeholder="Ex: A" value={songKey} onChange={e=>setSongKey(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)' }} />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>BPM</label>
                  <input type="number" className="input-field" placeholder="Ex: 120" value={bpm} onChange={e=>setBpm(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>Voz Hombre</label>
                  <input type="text" className="input-field" placeholder="Ej: G" value={keyMale} onChange={e=>setKeyMale(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)' }} />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>Voz Mujer</label>
                  <input type="text" className="input-field" placeholder="Ej: D" value={keyFemale} onChange={e=>setKeyFemale(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block', letterSpacing: '1px' }}>Enlace de YouTube</label>
                <input type="url" className="input-field" placeholder="https://youtube.com/..." value={youtubeLink} onChange={e=>setYoutubeLink(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button className="btn-secondary" onClick={()=>setShowModal(false)} style={{ flex: 1, padding: '1rem' }}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} style={{ flex: 1.5, padding: '1rem' }}>Guardar Canción</button>
            </div>
          </div>
        </div>
      )}

      {chartSong && (
        <ChartStudio 
          song={chartSong}
          onClose={() => setChartSong(null)}
          onSave={async (chartData) => {
            const { error } = await supabase.from('songs').update({ chart_data: chartData.chart_data, chart_annotations: chartData.chart_annotations }).eq('id', chartSong.id);
            if (error) throw error;
            setChartSong(prev => ({ ...prev, ...chartData }));
            if (refreshData) refreshData();
          }}
        />
      )}

      {seqUploadSong && (
        <SequenceUploader song={seqUploadSong} orgId={orgId} session={session} apiUrl={API_URL} onClose={() => setSeqUploadSong(null)} onComplete={() => { if (refreshData) refreshData(); }} />
      )}

      {seqMixerData && (
        <WebStemPlayer
          song={songs.find(s => s.id === seqMixerData.song_id) || { id: seqMixerData.song_id, title: 'Canción' }}
          preloadedSequence={seqMixerData}
          session={session}
          onClose={() => setSeqMixerData(null)}
        />
      )}

      <footer className="identity-footer">
        <p>Bandly: Donde la excelencia musical encuentra el orden.</p>
      </footer>
    </section>
  </section>
  );
}
