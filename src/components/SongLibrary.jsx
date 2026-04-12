import React, { useState } from 'react';
import { Music, Plus, Trash2, FileText, Headphones, X, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ChartStudio from './ChartStudio';
import SequenceUploader from './SequenceUploader';
import SequenceMixer from './SequenceMixer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function SongLibrary({ songs, orgId, readOnly, refreshData, session }) {
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

  const openMixer = async (song) => {
    setLoadingSeq(song.id);
    try {
      const resp = await fetch(`${API_URL}/api/sequences/${song.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await resp.json();
      if (data.sequence && data.sequence.stems?.length > 0) {
        setSeqMixerData(data.sequence);
      } else {
        if (!readOnly) {
          setSeqUploadSong(song);
        } else {
          alert('Esta canción no tiene secuencia subida aún.');
        }
      }
    } catch (e) {
      console.error('Error loading sequence:', e);
      alert('Error al cargar secuencia');
    } finally {
      setLoadingSeq(null);
    }
  };

  const handleSave = async () => {
    if(!title) return alert("El título es obligatorio");
    try {
      const { error } = await supabase.from('songs').insert([{ org_id: orgId, title, key: songKey, key_male: keyMale, key_female: keyFemale, bpm, youtube_link: youtubeLink }]);
      if (error) {
        alert("Error de la base de datos: " + error.message);
        return;
      }
      setShowModal(false);
      setTitle(''); setSongKey(''); setKeyMale(''); setKeyFemale(''); setBpm(''); setYoutubeLink('');
      if (refreshData) refreshData();
    } catch(e) { 
      alert("Error de base de datos o conexión al guardar."); 
    }
  };
  
  const handleDelete = async (id) => {
    if(!confirm("¿Estás seguro de eliminar esta canción del repertorio?")) return;
    await supabase.from('songs').delete().eq('id', id);
    if (refreshData) refreshData();
  };

  return (
    <section className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="section-title" style={{ margin: 0 }}><Music size={20} color="var(--primary)" /> Repertorio</h3>
        {!readOnly && (
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '0.4rem 1rem', width: 'auto', fontSize: '0.85rem' }}>
            <Plus size={16} /> Añadir Canción
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {songs?.length === 0 ? <p style={{color:'var(--text-muted)'}}>No hay canciones en el registro.</p> : 
          songs?.map(s => (
            <div key={s.id} className="list-item" style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: '0.5rem'}}>
              <div>
                <strong style={{color:'white', fontSize:'1rem', display:'block'}}>{s.title}</strong>
                <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>
                   Orig: <span style={{color:'var(--primary)', fontWeight:'bold'}}>{s.key || '-'}</span> | 
                   Hombre: <span style={{color:'var(--primary)', fontWeight:'bold'}}>{s.key_male || '-'}</span> | 
                   Mujer: <span style={{color:'var(--primary)', fontWeight:'bold'}}>{s.key_female || '-'}</span> | 
                   BPM: {s.bpm || '-'}
                </span>
              </div>
              <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                {s.youtube_link && (() => {
                   const match = s.youtube_link.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
                   const yId = match ? match[1] : null;
                   return yId ? (
                     <a href={s.youtube_link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100px', height: '56px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0, transition: '0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }} className="yt-thumb">
                       <img src={`https://img.youtube.com/vi/${yId}/mqdefault.jpg`} alt="YouTube" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     </a>
                   ) : (
                     <a href={s.youtube_link} target="_blank" rel="noopener noreferrer" style={{color:'#ef4444', fontWeight:'bold', fontSize:'0.85rem', textDecoration:'none'}}>📺 Ver Link</a>
                   );
                })()}
                {!readOnly && <Trash2 size={16} color="#ef4444" style={{cursor:'pointer', opacity:0.7, paddingLeft: '0.5rem'}} onClick={() => handleDelete(s.id)}/>}
                <button onClick={() => setChartSong(s)} className="song-action-btn chart-btn">
                  <FileText size={14} /> {s.chart_data ? 'Cifrado' : '+ Chart'}
                </button>
                <button onClick={() => openMixer(s)} disabled={loadingSeq === s.id} className="song-action-btn sequence-btn">
                  {loadingSeq === s.id ? <Loader2 size={14} className="spin-slow" /> : <Headphones size={14} />} Secuencia
                </button>
              </div>
            </div>
          ))
        }
      </div>
      
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '600px' }}>
            <button onClick={() => setShowModal(false)} className="modal-close-btn">
              <X size={24} />
            </button>
            <h3 className="modal-title">Datos de la Canción</h3>
            <div className="input-group">
              <input type="text" className="input-field" placeholder="Título de la canción *" value={title} onChange={e=>setTitle(e.target.value)} />
              <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap:'1rem', width: '100%'}}>
                <input type="text" className="input-field" placeholder="Tono Original (ej. A)" value={songKey} onChange={e=>setSongKey(e.target.value)} />
                <input type="number" className="input-field" placeholder="BPM (ej. 120)" value={bpm} onChange={e=>setBpm(e.target.value)} />
                <input type="text" className="input-field" placeholder="Tono Hombre (ej. G)" value={keyMale} onChange={e=>setKeyMale(e.target.value)} />
                <input type="text" className="input-field" placeholder="Tono Mujer (ej. D)" value={keyFemale} onChange={e=>setKeyFemale(e.target.value)} />
              </div>
              <input type="url" className="input-field" placeholder="Enlace de YouTube" value={youtubeLink} onChange={e=>setYoutubeLink(e.target.value)} />
            </div>
            
            <div style={{display:'flex', gap:'1rem', marginTop:'2rem'}}>
              <button className="btn-secondary" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave}>Guardar Canción</button>
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
        <SequenceMixer sequence={seqMixerData} onClose={() => setSeqMixerData(null)} />
      )}
    </section>
  );
}
