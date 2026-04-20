import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, CheckCircle2, Plus, Info, Music, Calendar as CalendarIcon, X, 
  Trash2, FileText, Headphones, Settings, Play, BookOpen, Loader2,
  Drum, Zap, Layout, Mic2, Video, User, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import VisualCalendar from './VisualCalendar';
import ChartStudio from './ChartStudio';
import { isTauri } from '../utils/tauri';

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
  
  const [activeYoutubeUrl, setActiveYoutubeUrl] = useState(null);
  const [chartSong, setChartSong] = useState(null);
  const [initialRoster, setInitialRoster] = useState([]); // Snapshot activos (InitialSnapshot)
  const [dbHistory, setDbHistory] = useState([]); // Historial completo (Activos + Removidos)
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyData, setNotifyData] = useState(null);
  const [dispatching, setDispatching] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState({});

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
    const i = (inst || '').toLowerCase();
    if (i.includes('batería') || i.includes('drums') || i.includes('perc')) return <Drum size={20} />;
    if (i.includes('bajo') || i.includes('bass')) return <Zap size={20} />;
    if (i.includes('gt.') || i.includes('gtr') || i.includes('guitar')) return <Music size={20} />;
    if (i.includes('tecla') || i.includes('keys') || i.includes('piano')) return <Layout size={20} />;
    if (i.includes('voz') || i.includes('voice') || i.includes('coro')) return <Mic2 size={20} />;
    if (i.includes('sonido')) return <Headphones size={20} />;
    if (i.includes('panta') || i.includes('visual') || i.includes('media')) return <Video size={20} />;
    if (i.includes('direc') || i.includes('musical') || i.includes('leader')) return <Shield size={20} />;
    if (i.includes('logística') || i.includes('staff')) return <Users size={20} />;
    return <User size={20} />;
  };


  const generateTemplate = (fmt) => {
    const musicLabels = fmt === 'full' 
      ? ['Batería', 'Bajo', 'Teclados', 'Gt. Eléctrica', 'Gt. Acústica', 'Voz 1', 'Voz 2', 'Voz 3', 'Coros']
      : ['Percusión', 'Piano / Teclado', 'Gt. Acústica', 'Voz 1', 'Voz 2'];
    const service = ['Sonido (FOH)', 'Pantallas / Visuales', 'Logística', 'Predicador', 'Dirección Musical'];
    const base = musicLabels.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'music', status: 'pending' }));
    const srv = service.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'service', status: 'pending' }));
    return [...base, ...srv];
  };

  const handleEditEvent = (ev) => {
    setEditingEventId(ev.id);
    setEventName(ev.name);
    setEventDate(ev.date || '');
    setDescription(ev.description || '');
    // 1. Cargamos historial completo para detectar reactivaciones (Identidad v4.0)
    const fullHistory = ev.event_roster || [];
    setDbHistory(fullHistory);

    // 2. Filtramos activos para el modal
    const activeRosterFromDb = fullHistory.filter(r => !r.is_removed);
    
    const isFullBand = activeRosterFromDb.some(r => ['Drums', 'Bass'].includes(r.instrument));
    const detectedFormat = isFullBand ? 'full' : 'acoustic';
    setFormat(detectedFormat);
    
    let merged = generateTemplate(detectedFormat);
    activeRosterFromDb.forEach(er => {
       const slot = merged.find(m => m.instrument === er.instrument);
       if (slot) {
         slot.event_roster_id = er.id;
         slot.profile_id = er.profile_id;
         slot.status = er.status || 'pending';
       } else {
         merged.push({ 
           id: Math.random().toString(), 
           event_roster_id: er.id, 
           instrument: er.instrument, 
           profile_id: er.profile_id, 
           category: 'extra', 
           status: er.status || 'pending' 
         });
       }
    });

    setRoster(merged);
    // Snapshot para detectar CAMBIOS REALES (v5.0: Identidad Persona + Rol)
    setInitialRoster(JSON.parse(JSON.stringify(merged.filter(m => m.profile_id).map(r => ({ ...r, snapshot_id: `${r.profile_id}-${r.instrument}` })))));
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

  const calculateRosterDiff = (initialSnapshot, fullHistory, currentModal, eventId) => {
    const diff = {
      newRecords: [],
      reactivated: [],
      updated: [],
      softDeleted: [],
      toNotify: []
    };

    const currentActive = currentModal.filter(m => m.profile_id);

    currentActive.forEach(item => {
      // REGLA v5.0: Identidad por Persona + Instrumento
      const historyMatch = fullHistory.find(h => 
        String(h.profile_id) === String(item.profile_id) && 
        h.instrument === item.instrument
      );

      if (historyMatch) {
        if (historyMatch.is_removed) {
          // CASO: REACTIVACIÓN (Vuelve a este rol específico)
          const payload = {
            id: historyMatch.id,
            event_id: eventId,
            profile_id: item.profile_id,
            instrument: item.instrument,
            is_removed: false,
            removed_at: null,
            status: 'pending' // Reset: Nueva convocatoria para este rol
          };
          diff.reactivated.push(payload);
          diff.toNotify.push({ ...item, email: members.find(m => m.id === item.profile_id)?.email, name: members.find(m => m.id === item.profile_id)?.full_name });
        } else {
          // CASO: CONTINUIDAD (Preservamos status)
          const snapshot = initialSnapshot.find(s => 
            String(s.profile_id) === String(item.profile_id) && 
            s.instrument === item.instrument
          );
          
          if (snapshot && snapshot.category !== item.category) {
            // Solo update si cambiaron metadatos menores
            diff.updated.push({
              id: historyMatch.id,
              category: item.category
            });
          }
        }
      } else {
        // CASO: NUEVA ASIGNACIÓN (Persona nueva en este rol o cambio de instrumento)
        const payload = {
          event_id: eventId,
          profile_id: item.profile_id,
          instrument: item.instrument,
          category: item.category,
          status: 'pending'
        };
        diff.newRecords.push(payload);
        diff.toNotify.push({ ...item, email: members.find(m => m.id === item.profile_id)?.email, name: members.find(m => m.id === item.profile_id)?.full_name });
      }
    });

    // CASO: REMOCIÓN (Soft Delete por par Profile+Instrument)
    initialSnapshot.forEach(active => {
      if (!currentActive.some(curr => String(curr.profile_id) === String(active.profile_id) && curr.instrument === active.instrument)) {
        diff.softDeleted.push({
          id: active.event_roster_id,
          is_removed: true,
          removed_at: new Date().toISOString()
        });
      }
    });

    return diff;
  };

  const handleSave = async () => {
    if (!eventName || !eventDate) return alert('Nombre y Fecha requeridos');
    if (saving) return; 
    setSaving(true);
    
    try {
      let evtId = editingEventId;
      const originalEvent = editingEventId ? events.find(e => e.id === editingEventId) : null;
      const isDateChanged = originalEvent && originalEvent.date !== eventDate;

      // 1. Persistencia del Evento
      if (editingEventId) {
        await supabase.from('events').update({ name: eventName, date: eventDate, description }).eq('id', editingEventId);
      } else {
        const { data: evt } = await supabase.from('events').insert([{ org_id: orgId, name: eventName, date: eventDate, description }]).select().single();
        evtId = evt.id;
      }

      // 2. Motor de Integridad v4.0
      const diff = calculateRosterDiff(initialRoster, dbHistory, roster, evtId);

      // 3. Persistencia Granular
      if (diff.newRecords.length > 0) {
        const { error } = await supabase.from('event_roster').insert(diff.newRecords);
        if (error) throw error;
      }

      const toUpsert = [...diff.reactivated, ...diff.updated, ...diff.softDeleted];
      if (toUpsert.length > 0) {
        // Upsert quirúrgico por ID (onConflict: id)
        const { error } = await supabase.from('event_roster').upsert(toUpsert, { onConflict: 'id' });
        if (error) throw error;
      }

      // 4. Sincronización de Setlist
      await supabase.from('event_songs').delete().eq('event_id', evtId);
      const validS = setlist.filter(i => i.song_id).map((i, idx) => ({ event_id: evtId, song_id: i.song_id, lead_id: i.lead_id || null, selected_key: i.selected_key || null, order_index: idx }));
      if (validS.length > 0) await supabase.from('event_songs').insert(validS);
      
      // 5. Refrescar datos reales de la DB para el modal (Garantiza IDs para links de correo)
      const { data: freshRoster, error: fetchErr } = await supabase
        .from('event_roster')
        .select('*')
        .eq('event_id', evtId)
        .eq('is_removed', false);

      if (fetchErr) throw fetchErr;

      // 6. Preparar Post-Save UI con datos frescos
      setNotifyData({
        eventId: evtId,
        eventName,
        eventDate,
        description,
        isDateChanged,
        candidates: diff.toNotify,
        allRoster: freshRoster.map(r => ({ 
          ...r, 
          email: members.find(m => m.id === r.profile_id)?.email, 
          name: members.find(m => m.id === r.profile_id)?.full_name 
        }))
      });
      
      setShowNotifyModal(true);
      if (refreshData) refreshData();
    } catch (e) { 
      console.error(e);
      alert('Error crítico de guardado: ' + e.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleSendNotifications = async (recipients, mode) => {
    if (dispatching) return;
    setDispatching(true);

    // CONTROL DE RED (v5.2): Evita que se quede "pegado" por timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos máximo

    try {
      // 1. Filtrado de Destinatarios sin Email
      const validRecipients = recipients.filter(r => r.email && r.email.includes('@'));
      const omittedCount = recipients.length - validRecipients.length;

      if (validRecipients.length === 0) {
        alert('No hay destinatarios con correo electrónico válido.');
        setDispatching(false);
        clearTimeout(timeoutId);
        return;
      }

      const rosterWithEmails = validRecipients.map(r => ({
        event_roster_id: r.event_roster_id || r.id, 
        email: r.email,
        name: r.name,
        instrument: r.instrument
      }));

      const response = await fetch(`${API_URL}/api/events/notify`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          eventName: notifyData.eventName,
          eventDate: notifyData.eventDate,
          description: notifyData.description,
          rosterWithEmails
        })
      });

      clearTimeout(timeoutId);

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Error en el despacho');
      
      // 2. Trazabilidad de Éxito en DB
      const now = new Date().toISOString();
      const updates = validRecipients.map(r => ({
        id: r.event_roster_id || r.id,
        last_invite_sent_at: now,
        invite_status: 'sent',
        invite_error: null
      }));

      await supabase.from('event_roster').upsert(updates, { onConflict: 'id' });
      
      let msg = `¡Invitaciones enviadas! (${validRecipients.length} músicos).`;
      if (omittedCount > 0) msg += `\n(${omittedCount} fueron omitidos por falta de email).`;
      
      alert(msg);
      closeModal();
      setShowNotifyModal(false);
    } catch (e) {
      clearTimeout(timeoutId);
      console.error(e);
      
      // REGISTRO DE FALLO EN DB para trazabilidad
      if (notifyData && recipients.length > 0) {
         try {
           const errorUpdates = recipients.filter(r => r.id || r.event_roster_id).map(r => ({
             id: r.event_roster_id || r.id,
             invite_status: 'failed',
             invite_error: e.name === 'AbortError' ? 'Timeout: La red tardó demasiado' : e.message.substring(0, 100)
           }));
           await supabase.from('event_roster').upsert(errorUpdates, { onConflict: 'id' });
         } catch (dbErr) { console.error("Fallo al registrar error en DB", dbErr); }
      }

      const errorMsg = e.name === 'AbortError' 
        ? 'La red está muy lenta o el servidor no responde (Timeout 15s). Intenta nuevamente.'
        : 'Error: ' + e.message;
      alert(errorMsg);
    } finally {
      setDispatching(false);
    }
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

  // SEGMENTACIÓN TEMPORAL (UX Improvements)
  const now = new Date();
  const upcomingEvents = eventsToShow.filter(ev => {
    if (!ev.date) return true;
    const d = new Date(ev.date);
    if (ev.date.length <= 10) d.setHours(23, 59, 59); // Vigente todo el día si no hay hora
    return d >= now;
  });

  const pastEvents = eventsToShow.filter(ev => {
    if (!ev.date) return false;
    const d = new Date(ev.date);
    if (ev.date.length <= 10) d.setHours(23, 59, 59);
    return d < now;
  });

  const toggleCard = (id) => {
    setExpandedCardIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ESTÉTICA DINÁMICA: Paleta de Colores Joya para identidad visual
  const cardThemes = [
    { main: '#6366f1', glass: 'rgba(99, 102, 241, 0.1)', light: 'rgba(99, 102, 241, 0.3)' }, // Indigo
    { main: '#10b981', glass: 'rgba(16, 185, 129, 0.1)', light: 'rgba(16, 185, 129, 0.3)' }, // Emerald
    { main: '#f43f5e', glass: 'rgba(244, 63, 94, 0.1)', light: 'rgba(244, 63, 94, 0.3)' },    // Rose
    { main: '#f59e0b', glass: 'rgba(245, 158, 11, 0.1)', light: 'rgba(245, 158, 11, 0.3)' },  // Amber
    { main: '#8b5cf6', glass: 'rgba(139, 92, 246, 0.1)', light: 'rgba(139, 92, 246, 0.3)' },  // Violet
    { main: '#06b6d4', glass: 'rgba(6, 182, 212, 0.1)', light: 'rgba(6, 182, 212, 0.3)' },   // Cyan
  ];

  const getEventTheme = (id) => {
    if (!id) return cardThemes[0];
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % cardThemes.length;
    return cardThemes[index];
  };

  const renderEventList = (list, isPast = false) => {
    if (list.length === 0) {
      return !isPast ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
          <p>No tienes eventos agendados próximamente.</p>
        </div>
      ) : null;
    }

    return list.map(ev => {
      const isExpanded = !!expandedCardIds[ev.id];
      const userSlots = ev.event_roster?.filter(r => String(r.profile_id) === String(currentUserId)) || [];
      const theme = getEventTheme(ev.id);

      return (
        <div key={ev.id} className="list-item" style={{ 
          flexDirection: 'column', 
          alignItems: 'flex-start', 
          padding: '1.5rem', 
          background: isPast 
            ? 'rgba(255,255,255,0.01)' 
            : `linear-gradient(135deg, ${theme.glass} 0%, rgba(15, 23, 42, 0.4) 100%)`, 
          border: isPast ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${theme.glass}`,
          borderLeft: isPast ? '4px solid rgba(255,255,255,0.1)' : `5px solid ${theme.main}`,
          opacity: isPast ? 0.7 : 1,
          gap: '0.5rem',
          boxShadow: isPast ? 'none' : `0 15px 40px -20px ${theme.glass}`,
          transition: 'all 0.3s ease'
        }}>
          {/* CABECERA (SIEMPRE VISIBLE) */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div>
              <h4 style={{ fontSize: '1.3rem', color: 'white', marginBottom: '0.2rem' }}>{ev.name}</h4>
              <span style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '600' }}>{formatEventDate(ev.date)}</span>
            </div>
            {!readOnly && (
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <span onClick={() => handleEditEvent(ev)} style={{ cursor: 'pointer', fontSize: '1.2rem' }} title="Editar">✏️</span>
                <span onClick={() => { if(confirm('¿Borrar?')) { supabase.from('events').delete().eq('id', ev.id).then(()=>refreshData()); } }} style={{ cursor: 'pointer', fontSize: '1.2rem' }} title="Eliminar">🗑️</span>
              </div>
            )}
          </div>

          {/* MIS POSICIONES (SIEMPRE VISIBLE) */}
          {userSlots.length > 0 && (
            <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {userSlots.map((slot, idx) => (
                <div key={idx} style={{ 
                  padding: '0.6rem 1rem', 
                  background: isPast ? 'rgba(255,255,255,0.03)' : `${theme.glass}`, 
                  border: `1px solid ${isPast ? 'rgba(255,255,255,0.05)' : theme.light}`, 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px' 
                }}>
                  <span style={{ fontSize: '1.1rem', filter: isPast ? 'grayscale(1)' : 'none' }}>{getInstrumentIcon(slot.instrument)}</span>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: isPast ? 'var(--text-muted)' : theme.main, fontWeight: '800', textTransform: 'uppercase' }}>Tu Posición</div>
                    <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: '700' }}>{slot.instrument}</div>
                  </div>
                  <span style={{ marginLeft: '8px', fontSize: '0.6rem', color: slot.status === 'confirmed' ? '#10b981' : (slot.status === 'declined' || slot.status === 'rejected') ? '#ef4444' : '#f59e0b', fontWeight: '800' }}>
                    {slot.status === 'confirmed' ? '✓' : (slot.status === 'declined' || slot.status === 'rejected') ? '✗' : '?'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ACCIONES RÁPIDAS SI TIENE ROLES PENDIENTES */}
          {userSlots.some(s => s.status === 'pending') && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', width: '100%' }}>
              <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'confirmed')} className="btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.8rem' }}>Confirmar Todo</button>
              <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'declined')} className="btn-secondary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.8rem' }}>Declinar</button>
            </div>
          )}

          {/* TOGGLE DE DETALLES */}
          <button 
            onClick={() => toggleCard(ev.id)}
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: 'none', 
              color: 'var(--text-muted)', 
              padding: '0.6rem 1rem', 
              borderRadius: '10px', 
              fontSize: '0.75rem', 
              fontWeight: '700', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer',
              marginTop: '0.5rem'
            }}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? 'OCULTAR DETALLES' : 'VER EQUIPO Y CANCIONES'}
          </button>

          {/* SECCIÓN EXPANDIBLE */}
          {isExpanded && (
            <div style={{ width: '100%', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
              
              {/* EQUIPO COMPLETO */}
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Equipo Completo</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem', width: '100%' }}>
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
              </div>

              {/* SETLIST */}
              {ev.event_songs?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Setlist</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[...ev.event_songs].sort((a,b)=>a.order_index-b.order_index).map((songEntry, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{songEntry.songs?.title}</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Líder: {members?.find(m => m.id === songEntry.lead_id)?.full_name?.split(' ')[0] || '---'} | Tono: {songEntry.selected_key || '---'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {songEntry.songs?.youtube_link && (
                            <button 
                              onClick={() => setActiveYoutubeUrl(songEntry.songs.youtube_link)} 
                              className="icon-btn-subtle" 
                              style={{ color: '#ef4444', gap: '6px', padding: '0.4rem 0.8rem', background: 'rgba(239, 68, 68, 0.05)' }}
                            >
                              <Play size={14} /> <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>VIDEO</span>
                            </button>
                          )}
                          <button 
                            onClick={() => setChartSong(songEntry.songs)} 
                            className="icon-btn-subtle"
                            style={{ color: '#3b82f6', gap: '6px', padding: '0.4rem 0.8rem', background: 'rgba(59, 130, 246, 0.05)' }}
                          >
                            <FileText size={14} /> <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>CHART</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

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
              {renderEventList(upcomingEvents)}
            </div>

            {pastEvents.length > 0 && (
              <div style={{ marginTop: '3rem' }}>
                <button 
                  onClick={() => setShowPastEvents(!showPastEvents)}
                  className="icon-btn-subtle"
                  style={{ 
                    width: '100%', 
                    justifyContent: 'space-between', 
                    padding: '1rem 1.5rem', 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    marginBottom: '1.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CalendarIcon size={18} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Eventos pasados ({pastEvents.length})</span>
                  </div>
                  {showPastEvents ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {showPastEvents && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {renderEventList(pastEvents, true)}
                  </div>
                )}
              </div>
            )}
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
              {['info', 'equipo', 'setlist'].map(t => (
                <button 
                  key={t} 
                  className={`modal-tab-btn ${modalTab === t ? 'active' : ''}`} 
                  onClick={() => setModalTab(t)}
                >
                  {t === 'info' ? 'INFORMACIÓN' : t.toUpperCase()}
                </button>
              ))}
            </div>
            
            <div style={{ minHeight: '300px' }}>
              {modalTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input placeholder="Nombre del Evento" className="input-field" value={eventName} onChange={e => setEventName(e.target.value)} />
                  <div style={{ padding: '0.8rem', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '700' }}>Fecha: {formatEventDate(eventDate)}</div>
                  <textarea placeholder="Notas, descripción o agenda del servicio..." className="input-field" rows="4" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              )}
              {modalTab === 'equipo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <button onClick={() => applyRosterPreset('full')} className="icon-btn-subtle" style={{ fontSize: '0.75rem', background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)', padding: '0.4rem 1rem', borderRadius: '10px', fontWeight: '700' }}>🎸 Equipo Full</button>
                    <button onClick={() => applyRosterPreset('acoustic')} className="icon-btn-subtle" style={{ fontSize: '0.75rem', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)', padding: '0.4rem 1rem', borderRadius: '10px', fontWeight: '700' }}>🎻 Acústico</button>
                    <button 
                      onClick={() => setRoster([...roster, { id: Math.random().toString(), instrument: '', profile_id: '', category: 'custom', status: 'pending', is_dynamic: true }])} 
                      className="icon-btn-subtle" 
                      style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', padding: '0.4rem 1rem', borderRadius: '10px', fontWeight: '700' }}
                    >
                      + Añadir Rol Personalizado
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
                      {roster.map(r => (
                        <div key={r.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '16px', border: r.is_dynamic ? '1px dashed var(--primary)' : '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                          <div style={{ fontSize: '1.5rem', background: 'rgba(255,255,255,0.03)', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {getInstrumentIcon(r.instrument)}
                          </div>
                          <div style={{ flex: 1 }}>
                            {r.is_dynamic ? (
                               <input 
                                 placeholder="Nombre del Rol..." 
                                 className="input-field" 
                                 style={{ fontSize: '0.7rem', padding: '2px 4px', background: 'rgba(255,255,255,0.05)', border: 'none', marginBottom: '4px', height: 'auto' }} 
                                 value={r.instrument} 
                                 onChange={e => setRoster(roster.map(x => x.id === r.id ? { ...x, instrument: e.target.value } : x))}
                               />
                            ) : (
                               <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px', marginBottom: '4px' }}>{r.instrument}</div>
                            )}
                            <select className="input-field" style={{ width: '100%', background: 'none', border: 'none', padding: 0 }} value={r.profile_id} onChange={e => setRoster(roster.map(x => x.id === r.id ? { ...x, profile_id: e.target.value } : x))}>
                              <option value="">-- Asignar --</option>
                              {members?.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                            </select>
                          </div>
                          {r.is_dynamic && (
                            <button 
                              onClick={() => setRoster(roster.filter(x => x.id !== r.id))}
                              style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {modalTab === 'setlist' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <div style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>ORDEN DEL SETLIST</div>
                  {setlist.map((item, idx) => {
                    const selectedSong = songs?.find(s => s.id === item.song_id);
                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '30px 2fr 1fr 1fr 40px', gap: '0.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 'bold' }}>{idx + 1}.</span>
                        <select className="input-field" style={{ background: 'none' }} value={item.song_id} onChange={e => { const n = [...setlist]; n[idx].song_id = e.target.value; setSetlist(n); }}>
                          <option value="">Seleccionar Canción...</option>
                          {songs?.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                        <select className="input-field" style={{ background: 'none' }} value={item.lead_id} onChange={e => { const n = [...setlist]; n[idx].lead_id = e.target.value; setSetlist(n); }}>
                           <option value="">Líder</option>
                           {members?.map(m => <option key={m.id} value={m.id}>{m.full_name.split(' ')[0]}</option>)}
                        </select>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <input placeholder="Key" className="input-field" style={{ fontSize: '0.8rem', height: 'auto', padding: '6px' }} value={item.selected_key} onChange={e => { const n = [...setlist]; n[idx].selected_key = e.target.value; setSetlist(n); }} />
                          {selectedSong && (selectedSong.key_male || selectedSong.key_female) && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {selectedSong.key_male && (
                                <button 
                                  onClick={() => { const n = [...setlist]; n[idx].selected_key = selectedSong.key_male; setSetlist(n); }}
                                  style={{ padding: '2px 6px', fontSize: '10px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '4px', fontWeight: '800', cursor: 'pointer' }}
                                  title="Tono sugerido para Hombre"
                                >
                                  {selectedSong.key_male} (H)
                                </button>
                              )}
                              {selectedSong.key_female && (
                                <button 
                                  onClick={() => { const n = [...setlist]; n[idx].selected_key = selectedSong.key_female; setSetlist(n); }}
                                  style={{ padding: '2px 6px', fontSize: '10px', background: 'rgba(236,72,153,0.1)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.2)', borderRadius: '4px', fontWeight: '800', cursor: 'pointer' }}
                                  title="Tono sugerido para Mujer"
                                >
                                  {selectedSong.key_female} (M)
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <button onClick={() => setSetlist(setlist.filter((_,i)=>i!==idx))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  <button onClick={() => setSetlist([...setlist, {song_id: '', lead_id: '', selected_key: ''}])} className="btn-secondary" style={{ marginTop: '1rem', border: '1px dashed rgba(255,255,255,0.1)' }}>+ Añadir Canción al Setlist</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={closeModal} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ flex: 2 }}>{saving ? 'Guardando...' : 'Guardar Evento'}</button>
            </div>
          </div>
        </div>
      )}

      {showNotifyModal && notifyData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', textAlign: 'center', border: '1px solid var(--primary)' }}>
            <div style={{ background: 'var(--primary)', width: '60px', height: '60px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'white' }}>
              <Users size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>¿Notificar al equipo?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Los cambios se han guardado correctamente. Selecciona una opción de envío.
            </p>

            {notifyData.candidates.some(c => !c.email) && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '0.8rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#fbbf24', textAlign: 'left' }}>
                ⚠️ Algunos músicos ({notifyData.candidates.filter(c => !c.email).length}) no tienen correo configurado y serán omitidos.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button 
                onClick={() => handleSendNotifications(notifyData.candidates, 'delta')}
                disabled={saving || notifyData.candidates.length === 0}
                className="btn-primary" 
                style={{ py: '1rem', opacity: notifyData.candidates.length === 0 ? 0.5 : 1 }}
              >
                {notifyData.isDateChanged ? '🔔 Avisar Cambios Relevantes' : '📨 Solo Nuevos / Modificados'} ({notifyData.candidates.length})
              </button>
              
              <button 
                onClick={() => handleSendNotifications(notifyData.allRoster, 'all')}
                disabled={saving}
                className="btn-secondary" 
                style={{ border: notifyData.isDateChanged ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)' }}
              >
                {notifyData.isDateChanged ? '📢 Reenviar a TODOS (Actualización Crítica)' : '📢 Reenviar a TODOS'} ({notifyData.allRoster.length})
              </button>

              <button 
                onClick={() => { setShowNotifyModal(false); closeModal(); }}
                disabled={saving}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', marginTop: '1.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
              >
                Finalizar sin enviar correos
              </button>
            </div>
            
            {dispatching && (
              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--primary)' }}>
                <Loader2 size={16} className="spin-slow" />
                <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '1px' }}>DESPACHANDO...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {chartSong && <ChartStudio song={chartSong} onClose={() => setChartSong(null)} readOnly={true} />}
      
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
