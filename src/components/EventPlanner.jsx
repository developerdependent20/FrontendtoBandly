import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, CheckCircle2, Plus, Info, Music, Calendar as CalendarIcon, X, 
  Trash2, FileText, Headphones, Settings, Play, BookOpen, Loader2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import VisualCalendar from './VisualCalendar';
import ProPlayer from './ProPlayer';
import ChartStudio from './ChartStudio';
import * as Tone from 'tone';

const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : ''
);

export default function EventPlanner({ readOnly, events, members, orgId, refreshData, songs, profile, session }) {
  const [showModal, setShowModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState('full');
  const [roster, setRoster] = useState([]);
  const [setlist, setSetlist] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [modalTab, setModalTab] = useState('info'); 
  
  const [chartSong, setChartSong] = useState(null);
  const [seqMixerData, setSeqMixerData] = useState(null);
  const [loadingSeq, setLoadingSeq] = useState(null);
  const [activeYoutubeUrl, setActiveYoutubeUrl] = useState(null);

  const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return 'Sin fecha';
    try {
      const d = new Date(dateStr.split('T')[0] + 'T00:00:00');
      if (isNaN(d.getTime())) return 'Fecha inválida';
      return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    } catch (e) { return 'Error fecha'; }
  };

  const getInstrumentIcon = (inst) => {
    const lower = (inst || '').toLowerCase();
    if (lower.includes('drum') || lower.includes('bater')) return '🥁';
    if (lower.includes('bass') || lower.includes('bajo')) return '🎸';
    if (lower.includes('keys') || lower.includes('piano') || lower.includes('tecla')) return '🎹';
    if (lower.includes('guitar') || lower.includes('guit')) return '🎸';
    if (lower.includes('voice') || lower.includes('vocal') || lower.includes('voz')) return '🎤';
    if (lower.includes('speaker') || lower.includes('predicador')) return '🔊';
    if (lower.includes('media') || lower.includes('visual')) return '💻';
    if (lower.includes('staff')) return '📋';
    return '🎵';
  };

  const openMixerFromEvent = async (song, selectedKey) => {
    if (!session?.access_token) return alert("Sesión no encontrada.");
    setLoadingSeq(song?.id);
    try {
      await Tone.start();
      const resp = await fetch(`${API_URL}/api/sequences/${song.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!resp.ok) throw new Error("No hay respuesta del servidor.");
      const data = await resp.json();
      if (data.sequence?.stems?.length > 0) {
        if (isTauri) {
          localStorage.setItem('bandly_load_song_id', song.id);
          localStorage.setItem('bandly_load_key', selectedKey);
        } else {
          setSeqMixerData({ ...data.sequence, event_key: selectedKey });
        }
      } else {
        alert('Esta canción aún no tiene secuencia subida.');
      }
    } catch (e) {
      alert('Error cargando secuencia.');
    } finally {
      setLoadingSeq(null);
    }
  };

  const generateTemplate = (fmt) => {
    const musicLabels = fmt === 'full' 
      ? ['Drums', 'Perc', 'Bass', 'Keys', 'E Gtr', 'A Gtr', 'Voice 1', 'Voice 2', 'Voice 3', 'Voice 4', 'Choir']
      : ['Perc', 'Keys / Piano', 'A Gtr', 'Voice 1', 'Voice 2', 'Voice 3'];
    const service = ['Speaker', 'Announcements', 'Welcome', 'Audio', 'Media', 'Staff'];
    const base = musicLabels.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'music', status: 'pending' }));
    const srv = service.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'service', status: 'pending' }));
    return [...base, ...srv];
  };

  const handleEditEvent = (ev) => {
    setEditingEventId(ev.id);
    setEventName(ev.name);
    setEventDate(ev.date || '');
    setDescription(ev.description || '');
    const existingRoster = ev.event_roster || [];
    const isFullBand = existingRoster.some(r => ['Drums', 'Bass'].includes(r.instrument));
    const detectedFormat = isFullBand ? 'full' : 'acoustic';
    setFormat(detectedFormat);
    let merged = generateTemplate(detectedFormat);
    existingRoster.forEach(er => {
       const slot = merged.find(m => m.instrument === er.instrument);
       if (slot) {
         slot.profile_id = er.profile_id;
         slot.status = er.status || 'pending';
       } else {
         merged.push({ id: Math.random().toString(), instrument: er.instrument, profile_id: er.profile_id, category: 'extra', status: er.status || 'pending' });
       }
    });
    setRoster(merged);
    setSetlist(ev.event_songs ? [...ev.event_songs].sort((a,b)=>a.order_index - b.order_index).map(es => ({ song_id: es.song_id, lead_id: es.lead_id || '', selected_key: es.selected_key || '' })) : []);
    setModalTab('info');
    setShowModal(true);
  };

  const applyRosterPreset = (type) => {
    let newRoster = [];
    if (type === 'staff') {
      const staffMembers = members.filter(m => 
        (m.functions || []).some(f => ['audio', 'media', 'staff', 'bienvenida', 'voluntario'].includes(f))
      );
      newRoster = staffMembers.map(m => ({
        id: Math.random().toString(),
        instrument: (m.functions || []).find(f => ['audio', 'media', 'staff', 'bienvenida', 'voluntario'].includes(f))?.toUpperCase() || 'STAFF',
        profile_id: m.id,
        category: 'service',
        status: 'pending'
      }));
    } else if (type === 'full') {
      const musicLabels = ['Drums', 'Bass', 'Keys', 'E Gtr', 'Voice 1', 'Voice 2', 'Voice 3'];
      newRoster = musicLabels.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'music', status: 'pending' }));
      const service = ['Audio', 'Media', 'Staff'].map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'service', status: 'pending' }));
      newRoster = [...newRoster, ...service];
    } else if (type === 'acoustic') {
      const musicLabels = ['Piano', 'Acoustic Gtr', 'Percussion', 'Voice 1', 'Voice 2'];
      newRoster = musicLabels.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'music', status: 'pending' }));
      const service = ['Audio', 'Media'].map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'service', status: 'pending' }));
      newRoster = [...newRoster, ...service];
    } else if (type === 'all') {
      const staff = members.filter(m => (m.functions || []).some(f => ['audio', 'media', 'staff', 'bienvenida', 'voluntario'].includes(f)))
        .map(m => ({
          id: Math.random().toString(),
          instrument: (m.functions || []).find(f => ['audio', 'media', 'staff', 'bienvenida', 'voluntario'].includes(f))?.toUpperCase() || 'STAFF',
          profile_id: m.id,
          category: 'service',
          status: 'pending'
        }));
      const music = ['Drums', 'Bass', 'Keys', 'E Gtr', 'Voice 1', 'Voice 2'].map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'music', status: 'pending' }));
      newRoster = [...music, ...staff];
    }
    setRoster(newRoster);
  };

  const handleSave = async () => {
    if (!eventName || !eventDate) return alert('Nombre y Fecha requeridos');
    setSaving(true);
    try {
      let evtId = editingEventId;
      if (editingEventId) {
        await supabase.from('events').update({ name: eventName, date: eventDate, description }).eq('id', editingEventId);
        await supabase.from('event_roster').delete().eq('event_id', evtId);
        await supabase.from('event_songs').delete().eq('event_id', evtId);
      } else {
        const { data: evt } = await supabase.from('events').insert([{ org_id: orgId, name: eventName, date: eventDate, description }]).select().single();
        evtId = evt.id;
      }
      const validR = roster.filter(r => r.profile_id).map(r => ({ event_id: evtId, instrument: r.instrument, category: r.category, profile_id: r.profile_id, status: r.status || 'pending' }));
      if (validR.length > 0) await supabase.from('event_roster').insert(validR);
      const validS = setlist.filter(i => i.song_id).map((i, idx) => ({ event_id: evtId, song_id: i.song_id, lead_id: i.lead_id || null, selected_key: i.selected_key || null, order_index: idx }));
      if (validS.length > 0) await supabase.from('event_songs').insert(validS);
      
      closeModal(); 
      if (refreshData) refreshData();
    } catch (e) { alert('Error al guardar.'); } finally { setSaving(false); }
  };

  const updateRosterStatus = async (eventId, roleId, status) => {
    try {
      await supabase.from('event_roster').update({ status }).eq('event_id', eventId).eq('profile_id', roleId);
      if (refreshData) refreshData();
    } catch (e) { alert("Error al confirmar."); }
  };

  const closeModal = () => {
    setShowModal(false); setEditingEventId(null); setSaving(false);
  };

  if (!profile || !members) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando equipo...</div>;
  }

  const currentUserId = session?.user?.id || profile?.id;
  const userRole = (profile?.role || '').toLowerCase();
  const eventsToShow = userRole === 'director' ? (events || []) : (events || []).filter(ev => ev.event_roster?.some(r => String(r.profile_id) === String(currentUserId)));

  return (
    <section>
      <div className="tutorial-banner">
        <div style={{ background: 'var(--accent)', padding: '1rem', borderRadius: '15px', color: '#0f172a' }}>
          <CalendarIcon size={24} />
        </div>
        <div>
          <h4>Calendario & Planeación</h4>
          <p>Organiza tus servicios, ensayos y eventos de forma profesional.</p>
        </div>
      </div>

      <section className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 className="section-title" style={{ margin: 0 }}><CalendarIcon size={20} color="var(--accent)" /> Próxima Agenda</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>Próximos Eventos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {eventsToShow.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                  <p>No tienes eventos agendados próximamente.</p>
                </div>
              ) : (
                eventsToShow.map(ev => (
                  <div key={ev.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.3rem', color: 'white' }}>{ev.name}</h4>
                        <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600' }}>{formatEventDate(ev.date)}</span>
                      </div>
                      {!readOnly && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span onClick={() => handleEditEvent(ev)} style={{ cursor: 'pointer' }}>✏️</span>
                          <span onClick={() => { if(confirm('¿Borrar?')) { supabase.from('events').delete().eq('id', ev.id).then(()=>refreshData()); } }} style={{ cursor: 'pointer' }}>🗑️</span>
                        </div>
                      )}
                    </div>

                    {(() => {
                      const userSlots = ev.event_roster?.filter(r => String(r.profile_id) === String(currentUserId)) || [];
                      return (
                        <>
                          {userSlots.map((slot, idx) => (
                            <div key={idx} style={{ width: '100%', padding: '1rem', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                 <h5 style={{ margin: 0 }}>{getInstrumentIcon(slot.instrument)} {slot.instrument}</h5>
                                 <span style={{ fontSize: '0.7rem', color: slot.status === 'confirmed' ? '#10b981' : (slot.status === 'declined' || slot.status === 'rejected') ? '#ef4444' : '#f59e0b', fontWeight: '800' }}>
                                   {slot.status === 'confirmed' ? 'CONFIRMADO' : (slot.status === 'declined' || slot.status === 'rejected') ? 'RECHAZADO' : 'PENDIENTE'}
                                 </span>
                              </div>
                              {slot.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                  <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'confirmed')} className="btn-primary" style={{ padding: '0.4rem 1rem' }}>Aceptar</button>
                                  <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'declined')} className="btn-secondary" style={{ padding: '0.4rem 1rem' }}>Declinar</button>
                                </div>
                              )}
                            </div>
                          ))}

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem', width: '100%', marginBottom: '1rem' }}>
                            {(ev.event_roster || []).map((slot, i) => (
                              <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '1rem' }}>{getInstrumentIcon(slot.instrument)}</span>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase' }}>{slot.instrument}</span>
                                </div>
                                <strong style={{ color: 'white', fontSize: '0.9rem' }}>{members?.find(m => m.id === slot.profile_id)?.full_name?.split(' ')[0] || '---'}</strong>
                                {slot.profile_id && (
                                  <div style={{ 
                                    fontSize: '0.65rem', 
                                    color: slot.status === 'confirmed' ? '#10b981' : (slot.status === 'declined' || slot.status === 'rejected') ? '#ef4444' : '#f59e0b',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '2px 6px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '6px',
                                    width: 'fit-content'
                                  }}>
                                    <span style={{ 
                                      width: '6px', 
                                      height: '6px', 
                                      borderRadius: '50%', 
                                      background: slot.status === 'confirmed' ? '#10b981' : (slot.status === 'declined' || slot.status === 'rejected') ? '#ef4444' : '#f59e0b' 
                                    }}></span>
                                    {slot.status === 'confirmed' ? 'Confirmado' : (slot.status === 'declined' || slot.status === 'rejected') ? 'Rechazado' : 'Pendiente'}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {ev.event_songs?.length > 0 && (
                            <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {[...ev.event_songs].sort((a,b)=>a.order_index-b.order_index).map((songEntry, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                                    <div>
                                      <div style={{ fontWeight: '700' }}>{songEntry.songs?.title}</div>
                                      <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Líder: {members?.find(m => m.id === songEntry.lead_id)?.full_name?.split(' ')[0] || '---'} | Tono: {songEntry.selected_key || '---'}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {songEntry.songs?.youtube_link && (
                                        <button 
                                          onClick={() => setActiveYoutubeUrl(songEntry.songs.youtube_link)} 
                                          className="icon-btn-subtle" 
                                          style={{ color: '#ef4444', gap: '6px', padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.05)' }}
                                          title="Ver video de referencia"
                                        >
                                          <Play size={14} /> <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>VIDEO</span>
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => setChartSong(songEntry.songs)} 
                                        className="icon-btn-subtle"
                                        style={{ color: '#3b82f6', gap: '6px', padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.05)' }}
                                        title="Ver Chart (Letra y Acordes)"
                                      >
                                        <FileText size={14} /> <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>CHART</span>
                                      </button>
                                      
                                      {(() => {
                                        const hasSeq = songEntry.songs?.sequences?.length > 0;
                                        return (
                                          <button 
                                            onClick={() => hasSeq ? openMixerFromEvent(songEntry.songs, songEntry.selected_key) : alert('Esta canción no tiene pistas cargadas.')} 
                                            className="icon-btn-subtle" 
                                            disabled={loadingSeq === songEntry.songs?.id}
                                            style={{ 
                                              color: hasSeq ? '#a855f7' : '#64748b', 
                                              gap: '6px', 
                                              padding: '0.4rem 0.8rem', 
                                              background: hasSeq ? 'rgba(168, 85, 247, 0.05)' : 'rgba(100, 116, 139, 0.05)',
                                              opacity: hasSeq ? 1 : 0.5,
                                              cursor: hasSeq ? 'pointer' : 'not-allowed'
                                            }}
                                            title={hasSeq ? "Abrir ProPlayer (Secuencias)" : "Secuencia no disponible"}
                                          >
                                             {loadingSeq === songEntry.songs?.id ? (
                                               <Loader2 className="animate-spin" size={14} />
                                             ) : (
                                               <><Headphones size={14} /> <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>{hasSeq ? 'PISTAS' : 'SIN PISTAS'}</span></>
                                             )}
                                          </button>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>Calendario Visual</h4>
            <VisualCalendar events={events} onEventClick={handleEditEvent} onDayClick={(d) => { if(!readOnly) { setEditingEventId(null); setEventName(''); setEventDate(d); setRoster(generateTemplate(format)); setSetlist([]); setShowModal(true); } }} />
          </div>
        </div>
      </section>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', background: '#1e293b' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{editingEventId ? 'Editar' : 'Nuevo'} Evento</h3>
            <div className="modal-tabs" style={{ marginBottom: '1.5rem' }}>
              {['info', 'roster', 'songs'].map(t => <button key={t} className={`modal-tab-btn ${modalTab === t ? 'active' : ''}`} onClick={() => setModalTab(t)}>{t.toUpperCase()}</button>)}
            </div>
            
            <div style={{ minHeight: '300px' }}>
              {modalTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input placeholder="Nombre" className="input-field" value={eventName} onChange={e => setEventName(e.target.value)} />
                  <div style={{ padding: '0.8rem', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '700' }}>Fecha: {formatEventDate(eventDate)}</div>
                  <textarea placeholder="Notas" className="input-field" rows="4" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              )}
              {modalTab === 'roster' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <button onClick={() => applyRosterPreset('staff')} className="icon-btn-subtle" style={{ fontSize: '0.75rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', padding: '0.4rem 1rem', borderRadius: '10px', fontWeight: '700' }}>📋 Staff</button>
                    <button onClick={() => applyRosterPreset('full')} className="icon-btn-subtle" style={{ fontSize: '0.75rem', background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)', padding: '0.4rem 1rem', borderRadius: '10px', fontWeight: '700' }}>🎸 Banda Full</button>
                    <button onClick={() => applyRosterPreset('acoustic')} className="icon-btn-subtle" style={{ fontSize: '0.75rem', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)', padding: '0.4rem 1rem', borderRadius: '10px', fontWeight: '700' }}>🎻 Acústico</button>
                    <button onClick={() => applyRosterPreset('all')} className="icon-btn-subtle" style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', padding: '0.4rem 1rem', borderRadius: '10px', fontWeight: '700' }}>🚀 Todo</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
                      {roster.map(r => (
                        <div key={r.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontSize: '1.5rem', background: 'rgba(255,255,255,0.03)', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getInstrumentIcon(r.instrument)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '4px' }}>{r.instrument}</div>
                            <select className="input-field" style={{ width: '100%', background: 'none', border: 'none', padding: 0 }} value={r.profile_id} onChange={e => setRoster(roster.map(x => x.id === r.id ? { ...x, profile_id: e.target.value } : x))}>
                              <option value="">-- Asignar --</option>
                              {members?.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {modalTab === 'songs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {setlist.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '0.5rem' }}>
                      <select className="input-field" value={item.song_id} onChange={e => { const n = [...setlist]; n[idx].song_id = e.target.value; setSetlist(n); }}>
                        <option value="">Canción</option>
                        {songs?.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                      <select className="input-field" value={item.lead_id} onChange={e => { const n = [...setlist]; n[idx].lead_id = e.target.value; setSetlist(n); }}>
                         <option value="">Líder</option>
                         {members?.map(m => <option key={m.id} value={m.id}>{m.full_name.split(' ')[0]}</option>)}
                      </select>
                      <input placeholder="Tono" className="input-field" value={item.selected_key} onChange={e => { const n = [...setlist]; n[idx].selected_key = e.target.value; setSetlist(n); }} />
                      <button onClick={() => setSetlist(setlist.filter((_,i)=>i!==idx))} style={{ color: '#ef4444', background: 'none' }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setSetlist([...setlist, {song_id: '', lead_id: '', selected_key: ''}])} className="btn-secondary">+ Add</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={closeModal} className="btn-secondary" style={{ flex: 1 }}>Cerrar</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {chartSong && <ChartStudio song={chartSong} onClose={() => setChartSong(null)} readOnly={true} />}
      {seqMixerData && <ProPlayer sequence={seqMixerData} songTitle={seqMixerData.song_title || "Secuencia"} onClose={() => setSeqMixerData(null)} />}
      
      {activeYoutubeUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '800px', position: 'relative' }}>
            <button onClick={() => setActiveYoutubeUrl(null)} style={{ position: 'absolute', top: '-35px', right: 0, color: 'white', background: 'none' }}><X size={32} /></button>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
              <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} src={`https://www.youtube-nocookie.com/embed/${getYoutubeId(activeYoutubeUrl)}?autoplay=1`} frameBorder="0" allowFullScreen></iframe>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
