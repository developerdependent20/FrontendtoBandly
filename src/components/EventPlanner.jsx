import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import VisualCalendar from './VisualCalendar';

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
  const [modalTab, setModalTab] = useState('info'); // 'info', 'roster', 'songs'

  const fullBandTpl = ['Drums', 'Perc', 'Bass', 'Keys', 'E Gtr', 'A Gtr', 'Voice 1', 'Voice 2', 'Voice 3', 'Voice 4', 'Choir'];
  const acousticTpl = ['Perc', 'Keys / Piano', 'A Gtr', 'Voice 1', 'Voice 2', 'Voice 3'];
  const serviceTpl = ['Speaker', 'Announcements', 'Welcome', 'Audio', 'Media', 'Staff'];

  const generateTemplate = (fmt) => {
    const musicLabels = fmt === 'full' ? fullBandTpl : acousticTpl;
    const base = musicLabels.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'music', status: 'pending' }));
    const service = serviceTpl.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'service', status: 'pending' }));
    return [...base, ...service];
  };

  const applyFormat = (fmt) => {
    setFormat(fmt);
    setRoster(generateTemplate(fmt));
  };

  const addExtraSlot = () => setRoster([...roster, { id: Math.random().toString(), instrument: '', profile_id: '', category: 'extra', status: 'pending' }]);
  const updateSlot = (id, field, value) => {
    setRoster(roster.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        // Si cambia la persona asignada, reiniciamos su estado a pendiente
        if (field === 'profile_id' && value !== r.profile_id) {
          updated.status = 'pending';
        }
        return updated;
      }
      return r;
    }));
  };

  const handleEditEvent = (ev) => {
    setEditingEventId(ev.id);
    setEventName(ev.name);
    setEventDate(ev.date || '');
    setDescription(ev.description || '');
    const existingRoster = ev.event_roster || [];
    const isFullBand = existingRoster.some(r => ['Drums', 'Bass', 'E Gtr', 'Choir'].includes(r.instrument));
    const detectedFormat = isFullBand ? 'full' : 'acoustic';
    setFormat(detectedFormat);
    let mergedRoster = generateTemplate(detectedFormat);
    existingRoster.forEach(er => {
       const existingSlotInTemplate = mergedRoster.find(m => m.instrument === er.instrument);
       if (existingSlotInTemplate) {
         existingSlotInTemplate.profile_id = er.profile_id;
         existingSlotInTemplate.status = er.status || 'pending';
       } else {
         mergedRoster.push({ 
           id: Math.random().toString(), 
           instrument: er.instrument, 
           profile_id: er.profile_id, 
           category: 'extra',
           status: er.status || 'pending'
         });
       }
    });
    setRoster(mergedRoster);
    const existingSetlist = ev.event_songs ? ev.event_songs.sort((a,b)=>a.order_index - b.order_index).map(es => ({ song_id: es.song_id, lead_id: es.lead_id || '', selected_key: es.selected_key || '' })) : [];
    setSetlist(existingSetlist);
    setShowModal(true);
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('¿Borrar permanentemente?')) return;
    try {
      await supabase.from('event_roster').delete().eq('event_id', id);
      await supabase.from('events').delete().eq('id', id);
      refreshData();
    } catch(e) { alert("Error al eliminar."); }
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
      const validRoster = roster.filter(r => r.instrument && r.profile_id).map(r => ({ 
        event_id: evtId, 
        instrument: r.instrument, 
        category: r.category, 
        profile_id: r.profile_id,
        status: r.status || 'pending' 
      }));
      if (validRoster.length > 0) await supabase.from('event_roster').insert(validRoster);
      const validSongs = setlist.filter(i => i.song_id).map((i, idx) => ({ event_id: evtId, song_id: i.song_id, lead_id: i.lead_id || null, selected_key: i.selected_key || null, order_index: idx }));
      if (validSongs.length > 0) await supabase.from('event_songs').insert(validSongs);
      closeModal(); refreshData();
    } catch (e) { alert('Error al guardar.'); } finally { setSaving(false); }
  };

  const updateRosterStatus = async (eventId, roleId, status) => {
    try {
      const { error } = await supabase
        .from('event_roster')
        .update({ status })
        .eq('event_id', eventId)
        .eq('profile_id', roleId);
      if (error) throw error;
      if (refreshData) refreshData();
    } catch (e) { alert("Error al confirmar posición."); }
  };

  const closeModal = () => {
    setShowModal(false); setEventName(''); setEventDate(''); setDescription(''); 
    setFormat('full'); setRoster(generateTemplate('full')); setSetlist([]); setEditingEventId(null); setSaving(false);
    setModalTab('info');
  };

  return (
    <section>
      <div className="tutorial-banner">
        <div style={{ background: 'var(--accent)', padding: '1rem', borderRadius: '15px', color: '#0f172a' }}>
          <CalendarIcon size={24} />
        </div>
        <div>
          <h4>Calendario & Planeación</h4>
          <p>Organiza tus servicios, ensayos y eventos. Asigna el roster de músicos y staff para que todos sepan su rol.</p>
        </div>
      </div>

      <section className="glass-panel" style={{ padding: '2rem', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
          <h3 className="section-title" style={{ margin: 0 }}><CalendarIcon size={20} color="var(--accent)" /> Próxima Agenda</h3>
        {!readOnly && (
          <div style={{ padding: '0.6rem 1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>💡 Selecciona una fecha en el calendario para crear un evento</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        <div>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Próximos Eventos</h4>
          {!events || events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <p>No existen eventos activos.</p>
            </div>
          ) : (
            events.map(ev => (
              <div key={ev.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', margin: '1rem 0', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.3rem', color: 'white', fontWeight: '800' }}>{ev.name}</h4>
                    <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600' }}>
                      {ev.date ? (
                        (() => {
                          const dateObj = new Date(ev.date.split('T')[0] + 'T00:00:00');
                          return isNaN(dateObj) ? '---' : dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
                        })()
                      ) : '---'}
                    </span>
                  </div>
                  {!readOnly && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span onClick={() => handleEditEvent(ev)} style={{ cursor: 'pointer', padding: '0.3rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>✏️</span>
                      <span onClick={() => handleDeleteEvent(ev.id)} style={{ cursor: 'pointer', padding: '0.3rem', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>🗑️</span>
                    </div>
                  )}
                </div>

                {(() => {
                  const currentUserId = session?.user?.id || profile?.id;
                  const userSlots = ev.event_roster?.filter(r => String(r.profile_id) === String(currentUserId)) || [];
                  const isScheduled = userSlots.length > 0;
                  const userRole = (profile?.role || '').toLowerCase();
                  const canViewDetails = userRole === 'director' || userRole === 'staff' || isScheduled;

                  if (!canViewDetails) {
                    return (
                      <div style={{ width: '100%', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px dashed rgba(239, 68, 68, 0.2)', textAlign: 'center', marginBottom: '1.5rem' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          🚫 <strong style={{ color: '#ef4444' }}>Usted no ha sido agendado para este evento</strong>
                        </p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Banner de RSVP para el usuario logueado */}
                      {isScheduled && userSlots.map((slot, idx) => (
                        <div key={idx} style={{ width: '100%', padding: '1.25rem', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                               <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Tu Posición</span>
                               <h5 style={{ fontSize: '1.1rem', margin: 0, color: 'white' }}>🎸 {slot.instrument}</h5>
                            </div>
                            <div style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', background: slot.status === 'confirmed' ? 'rgba(16, 185, 129, 0.1)' : slot.status === 'declined' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: slot.status === 'confirmed' ? '#10b981' : slot.status === 'declined' ? '#f43f5e' : '#f59e0b', border: `1px solid ${slot.status === 'confirmed' ? 'rgba(16,185,129,0.2)' : slot.status === 'declined' ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                               {slot.status === 'confirmed' ? 'Confirmado' : slot.status === 'declined' ? 'Declinado' : 'Pendiente'}
                            </div>
                          </div>
                          
                          {slot.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                              <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'confirmed')} className="btn-primary" style={{ padding: '0.6rem', fontSize: '0.85rem' }}>Aceptar</button>
                              <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'declined')} className="btn-secondary" style={{ padding: '0.6rem', fontSize: '0.85rem' }}>Declinar</button>
                            </div>
                          )}
                          {slot.status !== 'pending' && (
                            <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'pending')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', width: 'fit-content' }}>Cambiar Respuesta</button>
                          )}
                        </div>
                      ))}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', width: '100%', marginBottom: '1.5rem' }}>
                        {ev.event_roster?.map((slot, i) => slot.profile_id && (
                          <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid rgba(255,255,255,0.03)', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{slot.instrument}</span>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: slot.status === 'confirmed' ? '#10b981' : slot.status === 'declined' ? '#f43f5e' : '#f59e0b', boxShadow: `0 0 10px ${slot.status === 'confirmed' ? 'rgba(16,185,129,0.5)' : slot.status === 'declined' ? 'rgba(244,63,94,0.5)' : 'rgba(245,158,11,0.5)'}` }}></div>
                            </div>
                            <strong style={{ color: slot.status === 'declined' ? 'var(--text-muted)' : 'white' }}>
                                {members?.find(m => m.id === slot.profile_id)?.full_name.split(' ')[0]}
                                {slot.status === 'declined' && <span style={{fontSize:'0.6rem', marginLeft:'4px'}}>(X)</span>}
                            </strong>
                          </div>
                        ))}
                      </div>

                      {ev.event_songs && ev.event_songs.length > 0 && (
                        <div style={{ width: '100%', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <h5 style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '1px' }}>🎵 Repertorio Seleccionado</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {ev.event_songs.sort((a,b) => a.order_index - b.order_index).map((song, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                  <span style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.9rem' }}>{song.songs?.title}</span>
                                  {song.lead_id && (
                                    <span style={{ fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                      🎙️ {members?.find(m => m.id === song.lead_id)?.full_name.split(' ')[0]}
                                    </span>
                                  )}
                                </div>
                                {song.selected_key && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                                    {song.selected_key}
                                  </span>
                                )}
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

        <div>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Vista Mensual & Agenda</h4>
          <VisualCalendar events={events} onEventClick={handleEditEvent} onDayClick={(dateStr) => {
            if(readOnly) return;
            // Quitamos la restricción de buscar uno existente. 
            // Siempre abrimos para crear uno nuevo en esa fecha.
            setEditingEventId(null); 
            setEventName(''); 
            setEventDate(dateStr); 
            setRoster(generateTemplate(format)); 
            setSetlist([]);
            setModalTab('info');
            setShowModal(true);
          }} />
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            <button 
              onClick={closeModal} 
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
            >
              <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
            </button>
            <h3 style={{ marginBottom: '2rem', textAlign: 'center', fontSize: '1.5rem' }}>{editingEventId ? 'Editar Evento' : 'Nuevo Evento'}</h3>
            <div className="modal-tabs">
              <button className={`modal-tab-btn ${modalTab === 'info' ? 'active' : ''}`} onClick={() => setModalTab('info')}>
                ℹ️ Info
              </button>
              <button className={`modal-tab-btn ${modalTab === 'roster' ? 'active' : ''}`} onClick={() => setModalTab('roster')}>
                👥 Equipo
              </button>
              <button className={`modal-tab-btn ${modalTab === 'songs' ? 'active' : ''}`} onClick={() => setModalTab('songs')}>
                🎵 Repertorio
              </button>
            </div>

            {modalTab === 'info' && (
              <div className="fade-in">
                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="roster-label" style={{ color: 'var(--primary)' }}>Título del Evento</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Concierto Anual de Verano" 
                    className="input-field" 
                    value={eventName} 
                    onChange={e => setEventName(e.target.value)} 
                    style={{ width: '100%', fontSize: '1.25rem', padding: '1.1rem', fontWeight: '700' }} 
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="roster-label">Fecha Seleccionada</label>
                  {eventDate && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.8rem 1.2rem', borderRadius: '12px', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      <CalendarIcon size={18}/> {(() => {
                        const dateObj = new Date(eventDate.split('T')[0] + 'T00:00:00');
                        return isNaN(dateObj) ? 'Sin fecha' : dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                      })()}
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label className="roster-label">Notas y Logística</label>
                  <textarea 
                    placeholder="Instrucciones de vestuario, logística, notas del director..." 
                    className="input-field" 
                    rows="4" 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    style={{ width: '100%', padding: '1rem' }}
                  ></textarea>
                </div>
              </div>
            )}

            {modalTab === 'roster' && (
              <div className="fade-in">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                   <button className={format === 'full' ? 'btn-primary' : 'btn-secondary'} onClick={() => applyFormat('full')} style={{flex: 1, padding: '0.8rem'}}>🎸 Full Band</button>
                   <button className={format === 'acoustic' ? 'btn-primary' : 'btn-secondary'} onClick={() => applyFormat('acoustic')} style={{flex: 1, padding: '0.8rem'}}>🪕 Acústico</button>
                </div>

                <h4 style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Instrumentos / Músicos</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
                  {roster.filter(r => r.category === 'music').map((slot) => (
                    <div key={slot.id} className="roster-card">
                      <div style={{ flex: 1 }}>
                        <div className="roster-label">{slot.instrument}</div>
                        <select className="input-field" value={slot.profile_id} onChange={(e) => updateSlot(slot.id, 'profile_id', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.95rem' }}>
                          <option value="">-- Por asignar --</option>
                          {members?.map(m => (<option key={m.id} value={m.id}>{m.full_name}</option>))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <h4 style={{ fontSize: '0.8rem', color: '#f59e0b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Producción / Staff</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  {roster.filter(r => r.category === 'service').map((slot) => (
                    <div key={slot.id} className="roster-card">
                      <div style={{ flex: 1 }}>
                        <div className="roster-label" style={{ color: '#f59e0b' }}>{slot.instrument}</div>
                        <select className="input-field" value={slot.profile_id} onChange={(e) => updateSlot(slot.id, 'profile_id', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.95rem' }}>
                          <option value="">-- Por asignar --</option>
                          {members?.map(m => (<option key={m.id} value={m.id}>{m.full_name}</option>))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {roster.some(r => r.category === 'extra') && (
                  <>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: '2rem', textTransform: 'uppercase', letterSpacing: '1.5px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Posiciones Extra / Personalizadas</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                      {roster.filter(r => r.category === 'extra').map((slot) => (
                        <div key={slot.id} className="roster-card" style={{ borderStyle: 'dashed' }}>
                          <div style={{ flex: 1 }}>
                            <input 
                              type="text" 
                              className="roster-label" 
                              value={slot.instrument} 
                              onChange={(e) => updateSlot(slot.id, 'instrument', e.target.value)} 
                              placeholder="Ej: Fotógrafo, Cuerdas..."
                              style={{ background: 'transparent', border: 'none', color: 'var(--primary)', outline: 'none', width: '100%', padding: 0 }}
                            />
                            <select className="input-field" value={slot.profile_id} onChange={(e) => updateSlot(slot.id, 'profile_id', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '0.95rem' }}>
                              <option value="">-- Por asignar --</option>
                              {members?.map(m => (<option key={m.id} value={m.id}>{m.full_name}</option>))}
                            </select>
                          </div>
                          <button onClick={() => setRoster(roster.filter(r => r.id !== slot.id))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6 }} title="Eliminar posición">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                <button onClick={addExtraSlot} className="btn-secondary" style={{ fontSize: '0.75rem', width: 'auto', marginTop: '1.5rem', borderStyle: 'dashed' }}>+ Añadir Posición Extra</button>
              </div>
            )}

            {modalTab === 'songs' && (
              <div className="fade-in">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  {setlist.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 40px', gap: '0.75rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <select className="input-field" style={{ border: 'none', background: 'transparent' }} value={item.song_id} onChange={e => {
                        const n = [...setlist]; n[idx].song_id = e.target.value; setSetlist(n);
                      }}>
                        <option value="">-- Canción --</option>
                        {songs?.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>

                      <select className="input-field" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)' }} value={item.lead_id} onChange={e => {
                        const n = [...setlist]; n[idx].lead_id = e.target.value; setSetlist(n);
                      }}>
                        <option value="">Líder / Voz</option>
                        {members?.map(m => (<option key={m.id} value={m.id}>{m.full_name.split(' ')[0]}</option>))}
                      </select>

                      <select className="input-field" style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontWeight: 'bold' }} value={item.selected_key} onChange={e => {
                        const n = [...setlist]; n[idx].selected_key = e.target.value; setSetlist(n);
                      }}>
                        <option value="">Tono</option>
                        {(() => {
                          const s = songs?.find(x => x.id === item.song_id);
                          if (!s) return null;
                          return (
                            <>
                              {s.key && <option value={s.key}>Orig: {s.key}</option>}
                              {s.key_male && <option value={s.key_male}>M: {s.key_male}</option>}
                              {s.key_female && <option value={s.key_female}>F: {s.key_female}</option>}
                            </>
                          );
                        })()}
                      </select>

                      <button onClick={() => setSetlist(setlist.filter((_,i)=>i!==idx))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setSetlist([...setlist, {song_id: '', lead_id: '', selected_key: ''}])} 
                  className="btn-secondary" 
                  style={{ width: '100%', borderStyle: 'dashed', background: 'transparent', padding: '1rem' }}
                >
                  + Agregar Canción al Repertorio
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {modalTab !== 'info' && (
                <button onClick={() => setModalTab(modalTab === 'songs' ? 'roster' : 'info')} className="btn-secondary" style={{ flex: 1 }}>Anterior</button>
              )}
              {modalTab !== 'songs' ? (
                <button onClick={() => setModalTab(modalTab === 'info' ? 'roster' : 'songs')} className="btn-primary" style={{ flex: 2 }}>Siguiente Paso</button>
              ) : (
                <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? 'Guardando...' : 'Finalizar y Agendar'}</button>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="identity-footer">
        <p>Bandly: Planea con orden, lidera con excelencia.</p>
      </footer>
    </section>
    </section>
  );
}
