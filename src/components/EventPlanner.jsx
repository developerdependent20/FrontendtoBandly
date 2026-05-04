import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, CheckCircle2, Plus, Info, Music, Calendar as CalendarIcon, X, 
  Trash2, FileText, Headphones, Settings, Play, BookOpen, Loader2,
  Drum, Zap, Layout, Mic2, Video, User, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import VisualCalendar from './VisualCalendar';
import ChartStudio from './ChartStudio';
import WebStemPlayer from './DAW/WebStemPlayer';
import { isTauri } from '../utils/tauri';

const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : ''
);

// [ESTABLE] MAPA DE INTELIGENCIA: Traduce nombres de roles a etiquetas de instrumentos
// [ESTABLE] MAPA DE LÓGICA: Para sugerencias internas
const INSTRUMENT_MATCH_MAP = {
  'bateria': 'instr:bateria', 'drums': 'instr:bateria', 'percusion': 'instr:bateria', 'perc': 'instr:bateria',
  'bajo': 'instr:bajo', 'bass': 'instr:bajo',
  'teclado': 'instr:piano', 'piano': 'instr:piano', 'keys': 'instr:piano',
  'guitarra': 'instr:guitarra', 'gt': 'instr:guitarra', 'gtr': 'instr:guitarra', 'electric': 'instr:guitarra', 'acoustic': 'instr:guitarra',
  'voz': 'instr:voz', 'voice': 'instr:voz', 'lead': 'instr:voz', 'cantante': 'instr:voz', 'coros': 'instr:voz',
  'sonido': 'instr:sonido', 'audio': 'instr:sonido',
  'streaming': 'instr:sonido_media', 'video': 'instr:sonido_media', 'pantalla': 'instr:sonido_media', 'media': 'instr:sonido_media',
  'roadie': 'instr:roadie', 'logistica': 'instr:roadie', 'staff': 'instr:roadie'
};

// [ESTABLE] MAPA DE VISUALIZACIÓN: Para etiquetas de interfaz
const INSTRUMENT_DISPLAY_MAP = {
  'instr:bateria': 'DRUMS / BATERÍA',
  'instr:bajo': 'BASS / BAJO',
  'instr:piano': 'KEYS / TECLADO',
  'instr:guitarra': 'GTR / GUITARRA',
  'instr:voz': 'VOICE / VOZ',
  'instr:sonido': 'AUDIO / SONIDO',
  'instr:sonido_media': 'VISUALS / PANTALLAS'
};

const getBilingualName = (inst) => {
  const normalized = (inst || '').toLowerCase();
  // Primero buscamos si es una etiqueta interna directa
  if (INSTRUMENT_DISPLAY_MAP[normalized]) return INSTRUMENT_DISPLAY_MAP[normalized];
  // Si no, buscamos en el mapa de coincidencia para ver qué etiqueta le corresponde
  const tag = Object.keys(INSTRUMENT_MATCH_MAP).find(k => normalized.includes(k)) 
    ? INSTRUMENT_MATCH_MAP[Object.keys(INSTRUMENT_MATCH_MAP).find(k => normalized.includes(k))] 
    : null;
  return INSTRUMENT_DISPLAY_MAP[tag] || inst;
};

const getSuggestedMembers = (roleName, members) => {
  if (!roleName || !members) return { suggested: [], others: (members || []) };
  const normalizedRole = roleName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tagToFind = Object.keys(INSTRUMENT_MATCH_MAP).find(k => normalizedRole.includes(k)) 
    ? INSTRUMENT_MATCH_MAP[Object.keys(INSTRUMENT_MATCH_MAP).find(k => normalizedRole.includes(k))] 
    : null;
  if (!tagToFind) return { suggested: [], others: (members || []) };
  const suggested = (members || []).filter(m => (m.functions || []).includes(tagToFind));
  const others = (members || []).filter(m => !(m.functions || []).includes(tagToFind));
  return { suggested, others };
};

// [ESTABLE] COMPONENTE EXTRAÍDO (Con arreglos de truncado y visibilidad)
const MemberSelector = ({ value, onChange, members, roleName, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const selectedMember = members?.find(m => m.id === value);
  const { suggested, others } = getSuggestedMembers(roleName, members);

  const handleSelect = (id) => {
    onChange(id);
    setIsOpen(false);
    setShowAll(false);
  };

  const listToRender = (suggested.length > 0 && !showAll) ? suggested : (showAll ? [...suggested, ...others] : others);

  return (
    <div style={{ position: 'relative', width: '100%', zIndex: isOpen ? 1000 : 1 }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="input-field"
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.03)',
          padding: '0.6rem 0.8rem',
          minHeight: '45px',
          border: isOpen ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
          borderRadius: '12px',
          transition: 'all 0.2s ease',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0, flex: 1 }}>
          {selectedMember && (
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800', flexShrink: 0 }}>
              {selectedMember.full_name?.[0]}
            </div>
          )}
          <span style={{ 
            color: selectedMember ? 'white' : 'rgba(255,255,255,0.4)', 
            fontSize: '0.85rem', 
            fontWeight: '600', 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
            display: 'block'
          }}>
            {selectedMember ? selectedMember.full_name : (placeholder || '-- Asignar --')}
          </span>
        </div>
        <ChevronDown size={14} style={{ opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease', flexShrink: 0, marginLeft: '8px' }} />
      </div>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} />
          <div style={{ 
            position: 'absolute', 
            top: '115%', 
            left: 0, 
            minWidth: '220px', 
            background: '#1a2133', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '16px', 
            zIndex: 101, 
            maxHeight: '260px', 
            overflowY: 'auto', 
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)', 
            padding: '8px', 
            animation: 'dropdownFadeIn 0.2s ease-out' 
          }}>
            {listToRender.map(m => (
              <div 
                key={m.id} 
                onClick={() => handleSelect(m.id)} 
                style={{ 
                  padding: '10px 14px', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  background: value === m.id ? 'rgba(59,130,246,0.2)' : 'transparent', 
                  marginBottom: '4px',
                  transition: 'all 0.2s ease'
                }} 
                className="dropdown-item-custom"
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '900', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                  {m.full_name?.[0]}
                </div>
                <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: '600', color: value === m.id ? 'var(--primary)' : 'white', whiteSpace: 'nowrap' }}>
                  {m.full_name}
                </div>
                {suggested.find(s => s.id === m.id) && <span style={{ color: '#fbbf24', fontSize: '0.9rem', filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.4))' }}>✨</span>}
              </div>
            ))}
            {suggested.length > 0 && !showAll && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowAll(true); }} 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: 'rgba(255,255,255,0.03)', 
                  border: 'none', 
                  color: 'var(--primary)', 
                  fontSize: '0.7rem', 
                  fontWeight: '900', 
                  cursor: 'pointer', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1.5px', 
                  borderRadius: '12px', 
                  marginTop: '6px',
                  border: '1px dashed rgba(59,130,246,0.3)'
                }}
              >
                + Mostrar resto del equipo
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

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
  const [notifyData, setNotifyData] = useState(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState({});
  const [activeYoutubeUrl, setActiveYoutubeUrl] = useState(null);
  const [chartSong, setChartSong] = useState(null);
  const [initialRoster, setInitialRoster] = useState([]);
  const [dbHistory, setDbHistory] = useState([]);
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [seqPlayerSong, setSeqPlayerSong] = useState(null);

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
      return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    } catch (e) { return 'Error fecha'; }
  };

  const getInstrumentIcon = (inst) => {
    const i = (inst || '').toLowerCase();
    if (i.includes('drums') || i.includes('batería') || i.includes('perc')) return <Drum size={20} />;
    if (i.includes('bass') || i.includes('bajo')) return <Zap size={20} />;
    if (i.includes('gtr') || i.includes('guitar') || i.includes('eléctrica') || i.includes('acústica')) return <Music size={20} />;
    if (i.includes('keys') || i.includes('piano') || i.includes('teclado')) return <Layout size={20} />;
    if (i.includes('voice') || i.includes('voz') || i.includes('coro')) return <Mic2 size={20} />;
    if (i.includes('audio') || i.includes('sonido')) return <Headphones size={20} />;
    if (i.includes('video') || i.includes('pantalla') || i.includes('visual') || i.includes('media') || i.includes('streaming')) return <Video size={20} />;
    if (i.includes('leader') || i.includes('direc') || i.includes('md') || i.includes('musical')) return <Shield size={20} />;
    if (i.includes('logística') || i.includes('staff') || i.includes('roadie')) return <Users size={20} />;
    return <User size={20} />;
  };

  const generateTemplate = (fmt) => {
    let musicLabels = [];
    if (fmt === 'full') {
      musicLabels = ['DRUMS / BATERÍA', 'PERC / PERCUSIÓN', 'BASS / BAJO', 'KEYS / TECLADOS', 'E. GTR / GT. ELÉCTRICA', 'A. GTR / GT. ACÚSTICA', 'VOICE 1 / VOZ 1', 'VOICE 2 / VOZ 2', 'VOICE 3 / VOZ 3', 'VOICE 4 / COROS'];
    } else if (fmt === 'acoustic') {
      musicLabels = ['PERC / PERCUSIÓN', 'BASS / BAJO', 'PIANO / KEYS', 'A. GTR / GT. ACÚSTICA', 'VOICE 1 / VOZ 1', 'VOICE 2 / VOZ 2', 'VOICE 3 / VOZ 3'];
    } else { // general
      musicLabels = ['DRUMS / BATERÍA', 'PERC / PERCUSIÓN', 'BASS / BAJO', 'KEYS / TECLADOS', 'E. GTR / GT. ELÉCTRICA', 'A. GTR / GT. ACÚSTICA', 'BRASS / METALES', 'VOICE 1 / VOZ 1', 'VOICE 2 / VOZ 2', 'VOICE 3 / VOZ 3', 'VOICE 4 / COROS', 'BACKINGS / COROS EXTRA'];
    }
    
    const service = ['AUDIO / SONIDO (FOH)', 'VISUALS / PANTALLAS', 'STAFF / LOGÍSTICA', 'PREACHER / PREDICADOR', 'MD / DIRECCIÓN MUSICAL'];
    const base = musicLabels.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'music', status: 'pending' }));
    const srv = service.map(l => ({ id: Math.random().toString(), instrument: l, profile_id: '', category: 'service', status: 'pending' }));
    return [...base, ...srv];
  };

  const handleEditEvent = (ev) => {
    setEditingEventId(ev.id);
    setEventName(ev.name);
    setEventDate(ev.date || '');
    setDescription(ev.description || '');
    const activeRosterFromDb = (ev.event_roster || []).filter(r => !r.is_removed);
    const isFullBand = activeRosterFromDb.some(r => ['Drums', 'Bass', 'Batería', 'Bajo'].includes(r.instrument));
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
         merged.push({ id: Math.random().toString(), event_roster_id: er.id, instrument: er.instrument, profile_id: er.profile_id, category: 'extra', status: er.status || 'pending' });
       }
    });
    setRoster(merged);
    setInitialRoster(JSON.parse(JSON.stringify(merged)));
    setDbHistory(ev.event_roster || []);
    setSetlist(ev.event_songs ? [...ev.event_songs].sort((a,b)=>a.order_index - b.order_index).map(es => ({ song_id: es.song_id, lead_id: es.lead_id || '', selected_key: es.selected_key || '' })) : []);
    setModalTab('info');
    setShowModal(true);
  };

  const handleNewEvent = (selectedDate) => {
    setEditingEventId(null);
    setEventName('');
    setEventDate(selectedDate || '');
    setDescription('');
    setFormat('full');
    const template = generateTemplate('full');
    setRoster(template);
    setInitialRoster(JSON.parse(JSON.stringify(template)));
    setDbHistory([]);
    setSetlist([]);
    setModalTab('info');
    setShowModal(true);
  };

  const calculateRosterDiff = (initial, history, current, eventId) => {
    const diff = { newRecords: [], reactivated: [], updated: [], softDeleted: [], toNotify: [] };
    const currentActive = current.filter(m => m.profile_id);
    currentActive.forEach(item => {
      const historyMatch = history.find(h => String(h.profile_id) === String(item.profile_id) && h.instrument === item.instrument);
      if (historyMatch) {
        if (historyMatch.is_removed) {
          diff.reactivated.push({ id: historyMatch.id, event_id: eventId, profile_id: item.profile_id, instrument: item.instrument, is_removed: false, status: 'pending' });
          diff.toNotify.push({ ...item, email: members.find(m => m.id === item.profile_id)?.email, name: members.find(m => m.id === item.profile_id)?.full_name });
        }
      } else {
        diff.newRecords.push({ event_id: eventId, profile_id: item.profile_id, instrument: item.instrument, category: item.category, status: 'pending' });
        diff.toNotify.push({ ...item, email: members.find(m => m.id === item.profile_id)?.email, name: members.find(m => m.id === item.profile_id)?.full_name });
      }
    });
    initial.forEach(active => {
      if (active.profile_id && !currentActive.some(curr => String(curr.profile_id) === String(active.profile_id) && curr.instrument === active.instrument)) {
        if (active.event_roster_id) diff.softDeleted.push({ id: active.event_roster_id, is_removed: true, removed_at: new Date().toISOString() });
      }
    });
    return diff;
  };

  const handleSave = async () => {
    if (!eventName || !eventDate || saving) return;
    setSaving(true);
    try {
      let evtId = editingEventId;
      if (editingEventId) await supabase.from('events').update({ name: eventName, date: eventDate, description }).eq('id', editingEventId);
      else {
        const { data: evt } = await supabase.from('events').insert([{ org_id: orgId, name: eventName, date: eventDate, description }]).select().single();
        evtId = evt.id;
      }
      const diff = calculateRosterDiff(initialRoster, dbHistory, roster, evtId);
      if (diff.newRecords.length > 0) await supabase.from('event_roster').insert(diff.newRecords);
      const toUpsert = [...diff.reactivated, ...diff.softDeleted];
      if (toUpsert.length > 0) await supabase.from('event_roster').upsert(toUpsert, { onConflict: 'id' });
      await supabase.from('event_songs').delete().eq('event_id', evtId);
      const validS = setlist.filter(i => i.song_id).map((i, idx) => ({ event_id: evtId, song_id: i.song_id, lead_id: i.lead_id || null, selected_key: i.selected_key || null, order_index: idx }));
      if (validS.length > 0) await supabase.from('event_songs').insert(validS);
      const { data: freshRoster } = await supabase.from('event_roster').select('*').eq('event_id', evtId).eq('is_removed', false);
      setNotifyData({ eventId: evtId, eventName, eventDate, description, candidates: diff.toNotify, allRoster: (freshRoster || []).map(r => ({ ...r, email: members.find(m => m.id === r.profile_id)?.email, name: members.find(m => m.id === r.profile_id)?.full_name })) });
      setShowNotifyModal(true);
      if (refreshData) refreshData();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleSendNotifications = async (recipients, mode) => {
    if (dispatching) return;

    setDispatching(true);
    try {
      const validRecipients = recipients.filter(r => r.email);

      if (validRecipients.length === 0) {
        return alert('Sin correos válidos.');
      }

      const payload = { 
        eventName: notifyData.eventName, 
        eventDate: notifyData.eventDate, 
        description: notifyData.description, 
        rosterWithEmails: validRecipients.map(r => ({ 
          event_roster_id: r.id, 
          email: r.email, 
          name: r.name, 
          instrument: r.instrument 
        })) 
      };

      const response = await fetch(`${API_URL}/api/events/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        await supabase.from('event_roster').upsert(validRecipients.map(r => ({ id: r.id, last_invite_sent_at: new Date().toISOString(), invite_status: 'sent' })));
        alert('Enviado.');
        closeModal(); setShowNotifyModal(false);
      }
    } catch (e) { alert(e.message); }
    finally { setDispatching(false); }
  };

  const updateRosterStatus = async (eventId, roleId, status) => {
    try {
      await supabase.from('event_roster').update({ status }).eq('event_id', eventId).eq('profile_id', roleId);
      if (refreshData) refreshData();
    } catch (e) { alert("Error al confirmar."); }
  };

  const handleRemoveFromRoster = async (rosterId) => {
    if (!confirm('¿Seguro que quieres eliminar a este usuario del evento?')) return;
    try {
      await supabase.from('event_roster').delete().eq('id', rosterId);
      if (refreshData) refreshData();
    } catch (e) { alert("Error al eliminar."); }
  };

  const closeModal = () => { setShowModal(false); setEditingEventId(null); setSaving(false); };

  if (!profile || !members) return <div style={{ padding: '4rem', textAlign: 'center' }}>Cargando equipo...</div>;

  const currentUserId = session?.user?.id || profile?.id;
  const userRole = (profile?.role || '').toLowerCase();
  const eventsToShow = userRole === 'director' ? (events || []) : (events || []).filter(ev => ev.event_roster?.some(r => String(r.profile_id) === String(currentUserId)));

  const upcomingEvents = eventsToShow.filter(ev => !ev.date || new Date(ev.date) >= new Date().setHours(0,0,0,0));
  const pastEvents = eventsToShow.filter(ev => ev.date && new Date(ev.date) < new Date().setHours(0,0,0,0));

  // [ESTABLE] Temas Joya Premium
  const cardThemes = [
    { main: '#6366f1', glass: 'rgba(99, 102, 241, 0.1)', light: 'rgba(99, 102, 241, 0.3)' }, // Indigo
    { main: '#10b981', glass: 'rgba(16, 185, 129, 0.1)', light: 'rgba(16, 185, 129, 0.3)' }, // Emerald
    { main: '#f43f5e', glass: 'rgba(244, 63, 94, 0.1)', light: 'rgba(244, 63, 94, 0.3)' },    // Rose
    { main: '#f59e0b', glass: 'rgba(245, 158, 11, 0.1)', light: 'rgba(245, 158, 11, 0.3)' },  // Amber
    { main: '#8b5cf6', glass: 'rgba(139, 92, 246, 0.1)', light: 'rgba(139, 92, 246, 0.3)' },  // Violet
    { main: '#06b6d4', glass: 'rgba(6, 182, 212, 0.1)', light: 'rgba(6, 182, 212, 0.3)' },   // Cyan
  ];

  const getEventTheme = (name) => {
    const n = (name || '').toLowerCase();
    // Indigo para Servicios
    if (n.includes('servicio') || n.includes('dominical') || n.includes('culto')) return cardThemes[0]; 
    // Emerald para Oración
    if (n.includes('oración') || n.includes('ayuno') || n.includes('búsqueda')) return cardThemes[1];
    // Violet para Reuniones
    if (n.includes('reunión') || n.includes('jóvenes') || n.includes('servidores') || n.includes('ensayo')) return cardThemes[4];
    // Orange/Amber para Especiales
    if (n.includes('especial') || n.includes('altar') || n.includes('conferencia')) return cardThemes[3];
    // Cyan por defecto
    return cardThemes[5];
  };

  const renderEventList = (list, isPast = false) => {
    if (list.length === 0) return null;
    return list.map(ev => {
      const isExpanded = !!expandedCardIds[ev.id];
      const theme = getEventTheme(ev.name);
      const userSlots = ev.event_roster?.filter(r => String(r.profile_id) === String(currentUserId)) || [];

      return (
        <div key={ev.id} className="list-item" style={{ 
          flexDirection: 'column', 
          alignItems: 'flex-start', 
          padding: '1.5rem', 
          background: isPast ? 'rgba(255,255,255,0.01)' : `linear-gradient(135deg, ${theme.glass} 0%, rgba(15, 23, 42, 0.4) 100%)`, 
          borderLeft: isPast ? '4px solid rgba(255,255,255,0.1)' : `5px solid ${theme.main}`, 
          opacity: isPast ? 0.7 : 1, 
          marginBottom: '1rem', 
          borderRadius: '12px',
          boxShadow: isPast ? 'none' : `0 15px 40px -20px ${theme.glass}`
        }}>
          <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: '1.3rem', margin: 0, color: 'white' }}>{ev.name}</h4>
              <span style={{ fontSize: '0.9rem', color: theme.main, fontWeight: '700' }}>{formatEventDate(ev.date)}</span>
            </div>
            {!readOnly && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <span onClick={() => handleEditEvent(ev)} style={{ cursor: 'pointer', fontSize: '1.2rem' }}>✏️</span>
                <span onClick={() => { if(confirm('¿Borrar?')) { supabase.from('events').delete().eq('id', ev.id).then(()=>refreshData()); } }} style={{ cursor: 'pointer', fontSize: '1.2rem' }}>🗑️</span>
              </div>
            )}
          </div>

          {userSlots.length > 0 && (
            <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
              {userSlots.map((slot, idx) => (
                <div key={idx} style={{ padding: '0.6rem 1rem', background: isPast ? 'rgba(255,255,255,0.03)' : `${theme.glass}`, border: `1px solid ${theme.light}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{getInstrumentIcon(slot.instrument)}</span>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: theme.main, fontWeight: '800', textTransform: 'uppercase' }}>Tu Posición</div>
                    <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: '700' }}>{slot.instrument}</div>
                  </div>
                  <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: slot.status === 'confirmed' ? '#10b981' : (slot.status === 'declined' || slot.status === 'rejected') ? '#ef4444' : '#f59e0b', fontWeight: '800' }}>
                    {slot.status === 'confirmed' ? '✓' : (slot.status === 'declined' || slot.status === 'rejected') ? '✗' : '?'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {userSlots.length > 0 && !isPast && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginTop: '1rem' }}>
              {userSlots.some(s => s.status !== 'confirmed') && (
                <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'confirmed')} className="btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.75rem' }}>Confirmar Todo</button>
              )}
              {userSlots.some(s => s.status !== 'declined' && s.status !== 'rejected') && (
                <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'declined')} className="btn-secondary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.75rem' }}>Declinar</button>
              )}
            </div>
          )}
          
          <button onClick={() => setExpandedCardIds(prev => ({ ...prev, [ev.id]: !prev[ev.id] }))} style={{ background: 'rgba(255,255,255,0.03)', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '1.2rem', cursor: 'pointer', padding: '0.6rem 1rem', borderRadius: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? ' OCULTAR DETALLES' : ' VER EQUIPO Y CANCIONES'}
          </button>

          {isExpanded && (
            <div style={{ width: '100%', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
               <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Equipo Completo</div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.8rem', marginBottom: '2rem' }}>
                  {(ev.event_roster || []).map((s, i) => (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                      {userRole === 'director' && (
                        <button 
                          onClick={() => handleRemoveFromRoster(s.id)} 
                          style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Eliminar de la alineación"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', paddingRight: '20px' }}>
                        <span style={{ fontSize: '1rem' }}>{getInstrumentIcon(s.instrument)}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase' }}>
                          {getBilingualName(s.instrument)}
                        </span>
                      </div>
                     <strong style={{ 
                       fontSize: '0.9rem', 
                       color: 'white',
                       display: 'block',
                       whiteSpace: 'nowrap',
                       overflow: 'hidden',
                       textOverflow: 'ellipsis'
                     }} title={members.find(m => m.id === s.profile_id)?.full_name}>
                       {members.find(m => m.id === s.profile_id)?.full_name?.split(' ')[0] || '--'}
                     </strong>
                     {s.profile_id && (
                        <div style={{ fontSize: '0.6rem', color: s.status === 'confirmed' ? '#10b981' : (s.status === 'declined' || s.status === 'rejected') ? '#ef4444' : '#f59e0b', fontWeight: '800', marginTop: '4px' }}>
                          ● {s.status === 'confirmed' ? 'Confirmado' : (s.status === 'declined' || s.status === 'rejected') ? 'Rechazado' : 'Pendiente'}
                        </div>
                     )}
                   </div>
                 ))}
               </div>

               {ev.event_songs && ev.event_songs.length > 0 && (
                 <>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Setlist / Repertorio</div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                     {[...ev.event_songs].sort((a,b)=>a.order_index - b.order_index).map((es, i) => {
                       const song = songs?.find(s => s.id === es.song_id);
                       const leader = members?.find(m => m.id === es.lead_id);
                       return (
                         <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0, flex: 1 }}>
                               <span style={{ fontSize: '0.8rem', fontWeight: '800', color: theme.main, width: '20px' }}>{i + 1}.</span>
                               <div style={{ minWidth: 0, flex: 1 }}>
                                 <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song?.title || 'Canción Desconocida'}</div>
                                 <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                   Lidera: <span style={{ color: 'white' }}>{leader?.full_name || '--'}</span> • Tono: <span style={{ color: theme.main, fontWeight: '800' }}>{es.selected_key || '--'}</span>
                                 </div>
                               </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                               {/* Boton reproducir secuencia (solo PRO/ELITE) */}
                               {(song?.has_sequence || (song?.sequences && song.sequences.length > 0)) && (
                                  <button
                                    onClick={() => {
                                      const plan = (profile?.organizations?.plan || 'free').toLowerCase();
                                      if (plan !== 'free') {
                                        setSeqPlayerSong(song);
                                      } else {
                                        alert("La Sala de Ensayo Virtual (Reproductor Multi-Track) es una función exclusiva para planes de pago (Starter, Pro, Elite). ¡Haz upgrade a tu banda para habilitarla!");
                                      }
                                    }}
                                    style={{
                                      padding: '6px', borderRadius: '8px', border: 'none',
                                      background: 'rgba(139,92,246,0.15)',
                                      color: '#a78bfa', cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      transition: 'all 0.15s',
                                    }}
                                    title="Sala de Ensayo Virtual (Requiere PRO)"
                                  >
                                    <Headphones size={15} />
                                  </button>
                                )}
                               {song?.youtube_link && (
                                 <button onClick={() => setActiveYoutubeUrl(song.youtube_link)} className="icon-btn-subtle" style={{ padding: '6px', color: '#ef4444' }} title="Ver en YouTube">
                                   <Play size={16} fill="#ef4444" />
                                 </button>
                               )}
                               <button onClick={() => setChartSong(song)} className="icon-btn-subtle" style={{ padding: '6px', color: theme.main }} title="Ver Cifrado">
                                 <FileText size={16} />
                               </button>
                            </div>
                         </div>
                       );
                     })}
                   </div>
                 </>
               )}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <section id="planner-top">
      <div className="tutorial-banner">
        <div style={{ background: 'var(--accent)', padding: '1rem', borderRadius: '15px' }}><CalendarIcon size={24} color="#0f172a" /></div>
        <div style={{ marginLeft: '1rem' }}><h4>Calendario & Planeación</h4><p>Organiza tus servicios y eventos de forma profesional.</p></div>
      </div>

      <section id="upcoming-events" className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 className="section-title" style={{ margin: 0 }}><CalendarIcon size={20} color="var(--accent)" /> Próxima Agenda</h3>
          {!readOnly && (
            <button onClick={() => handleNewEvent('')} className="btn-primary" style={{ padding: '0.4rem 1rem', width: 'auto', fontSize: '0.85rem' }}>
              <Plus size={16} /> Nuevo Evento
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
           <div><h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px' }}>Próximos Eventos</h4>{renderEventList(upcomingEvents)}</div>
           {pastEvents.length > 0 && (
             <div>
               <button onClick={() => setShowPastEvents(!showPastEvents)} style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontWeight: '800', fontSize: '0.8rem' }}>EVENTOS PASADOS ({pastEvents.length})</span>{showPastEvents ? <ChevronUp /> : <ChevronDown />}
               </button>
               {showPastEvents && <div style={{ marginTop: '1rem' }}>{renderEventList(pastEvents, true)}</div>}
             </div>
           )}
           <div id="visual-calendar" style={{ marginTop: '2rem' }}>
             <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px' }}>Calendario Visual</h4>
             <VisualCalendar events={events} onEventClick={handleEditEvent} onDayClick={handleNewEvent} />
           </div>
        </div>
      </section>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '95%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', background: '#1a2133', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{editingEventId ? 'Editar' : 'Nuevo'} Evento</h3>
            <div className="modal-tabs" style={{ marginBottom: '1.5rem' }}>
                {['info', 'equipo', 'setlist'].map(t => <button key={t} className={`modal-tab-btn ${modalTab === t ? 'active' : ''}`} onClick={() => setModalTab(t)}>{t.toUpperCase()}</button>)}
            </div>
            {modalTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input className="input-field" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Nombre del Evento" style={{ width: '100%' }} />
                <div style={{ padding: '0.8rem', background: 'rgba(59,130,246,0.1)', borderRadius: '10px', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '700' }}>Fecha: {formatEventDate(eventDate)}</div>
                <input type="date" className="input-field" value={eventDate} onChange={e => setEventDate(e.target.value)} style={{ width: '100%' }} />
                <textarea className="input-field" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción o Notas..." style={{ width: '100%', minHeight: '100px', resize: 'vertical' }} />
              </div>
            )}
            {modalTab === 'equipo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { id: 'full', label: 'FULL BAND', icon: <Zap size={14}/> },
                    { id: 'acoustic', label: 'ACÚSTICO', icon: <Music size={14}/> },
                    { id: 'general', label: 'GRAL / ESPECIAL', icon: <Users size={14}/> }
                  ].map(t => (
                    <button 
                      key={t.id}
                      onClick={() => {
                        setPendingTemplate(t);
                      }}
                      style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px', 
                        padding: '0.6rem', 
                        borderRadius: '8px', 
                        border: 'none', 
                        fontSize: '0.65rem', 
                        fontWeight: '800', 
                        cursor: 'pointer',
                        background: format === t.id ? 'var(--primary)' : 'transparent',
                        color: format === t.id ? 'white' : 'var(--text-muted)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {roster.map(r => (
                  <div key={r.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
                    <div style={{ fontSize: '1.5rem', background: 'rgba(255,255,255,0.03)', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{getInstrumentIcon(r.instrument)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {r.category === 'custom' ? (
                        <input 
                          className="input-field"
                          placeholder="Nombre del rol..."
                          style={{ fontSize: '0.7rem', padding: '4px 8px', height: 'auto', background: 'rgba(255,255,255,0.05)', border: 'none', marginBottom: '5px', width: '100%' }}
                          value={r.instrument}
                          onChange={e => setRoster(roster.map(x => x.id === r.id ? { ...x, instrument: e.target.value } : x))}
                        />
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.instrument || 'Instrumento'}</div>
                      )}
                      <MemberSelector value={r.profile_id} members={members} roleName={r.instrument} onChange={v => setRoster(roster.map(x => x.id === r.id ? { ...x, profile_id: v } : x))} />
                    </div>
                    {r.category === 'custom' && (
                      <button 
                        onClick={() => setRoster(roster.filter(x => x.id !== r.id))}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                </div>
                <button onClick={() => setRoster([...roster, { id: Math.random().toString(), instrument: '', profile_id: '', category: 'custom' }])} className="btn-secondary" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>+ Añadir Rol</button>
              </div>
            )}
            {modalTab === 'setlist' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {setlist.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <select 
                      className="input-field" 
                      value={item.song_id} 
                      onChange={e => { const n = [...setlist]; n[idx].song_id = e.target.value; setSetlist(n); }} 
                      style={{ flex: 2, background: 'none' }}
                    >
                      <option value="">Seleccionar Canción</option>
                      {songs.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>

                    {/* NUEVO: Selector de Tono (Tonality) */}
                    <div style={{ flex: 1 }}>
                      <select 
                        className="input-field" 
                        value={item.selected_key || ''} 
                        onChange={e => { const n = [...setlist]; n[idx].selected_key = e.target.value; setSetlist(n); }}
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--primary)', fontWeight: '800', fontSize: '0.75rem' }}
                        disabled={!item.song_id}
                      >
                        <option value="">Tono</option>
                        {(() => {
                          const song = songs.find(s => String(s.id) === String(item.song_id));
                          if (!song) return null;
                          return (
                            <>
                              {song.key && <option value={song.key}>{song.key} (Orig)</option>}
                              {song.key_male && <option value={song.key_male}>{song.key_male} (♂)</option>}
                              {song.key_female && <option value={song.key_female}>{song.key_female} (♀)</option>}
                            </>
                          );
                        })()}
                      </select>
                    </div>

                    <div style={{ flex: 1.5 }}>
                      <MemberSelector value={item.lead_id} members={members} roleName="Voz" placeholder="Líder" onChange={v => { const n = [...setlist]; n[idx].lead_id = v; setSetlist(n); }} />
                    </div>
                    <button onClick={() => setSetlist(setlist.filter((_,i)=>i!==idx))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18}/></button>
                  </div>
                ))}
                <button onClick={() => setSetlist([...setlist, { song_id: '', lead_id: '', selected_key: '' }])} className="btn-secondary" style={{ padding: '1rem' }}>+ Añadir Canción</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button onClick={closeModal} className="btn-secondary" style={{ flex: 1 }}>Cerrar</button>
              <button onClick={handleSave} className="btn-primary" style={{ flex: 2 }}>{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
            </div>
          </div>
        </div>
      )}

      {showNotifyModal && notifyData && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '450px', border: '1px solid var(--primary)' }}>
             <Users size={40} color="var(--primary)" style={{ marginBottom: '1rem' }} />
             <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>¿Notificar al equipo?</h3>
             <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>Los cambios se guardaron. Selecciona una opción de aviso.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button onClick={() => handleSendNotifications(notifyData.candidates, 'delta')} className="btn-primary" style={{ padding: '1.2rem' }}>
                  Enviar solo a nuevos ({notifyData.candidates.length})
                </button>
                
                <button onClick={() => handleSendNotifications(notifyData.allRoster, 'all')} className="btn-primary" style={{ padding: '1.2rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid var(--primary)', color: 'white' }}>
                  Notificar a todo el equipo ({notifyData.allRoster.length})
                </button>

                <button onClick={() => { setShowNotifyModal(false); closeModal(); }} className="btn-secondary" style={{ padding: '1.2rem' }}>
                  Finalizar sin notificar
                </button>
              </div>
           </div>
         </div>
      )}

      {chartSong && <ChartStudio song={chartSong} onClose={() => setChartSong(null)} readOnly={true} />}
      
      {activeYoutubeUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '800px', position: 'relative' }}>
            <button onClick={() => setActiveYoutubeUrl(null)} style={{ position: 'absolute', top: '-35px', right: 0, color: 'white', background: 'none', border: 'none' }}><X size={32} /></button>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
              <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} src={`https://www.youtube-nocookie.com/embed/${getYoutubeId(activeYoutubeUrl)}?autoplay=1`} frameBorder="0" allowFullScreen></iframe>
            </div>
          </div>
        </div>
      )}
      {pendingTemplate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '400px', border: '1px solid var(--primary)', animation: 'modalFadeIn 0.3s ease-out' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Zap size={30} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>¿Cambiar a {pendingTemplate.label}?</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5' }}>
              Se generará una nueva lista de roles. Las asignaciones actuales que no hayas guardado se perderán.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setPendingTemplate(null)} 
                className="btn-secondary" 
                style={{ flex: 1, padding: '1rem' }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const t = pendingTemplate;
                  setFormat(t.id);
                  if (t.id === 'general') {
                    setRoster(members.map(m => ({
                      id: Math.random().toString(),
                      instrument: 'MEMBER',
                      profile_id: m.id,
                      category: 'music',
                      status: 'pending'
                    })));
                  } else {
                    setRoster(generateTemplate(t.id));
                  }
                  setPendingTemplate(null);
                }} 
                className="btn-primary" 
                style={{ flex: 1.5, padding: '1rem' }}
              >
                Sí, cambiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sala de Previsualizacion de Secuencia */}
      {seqPlayerSong && (
        <WebStemPlayer
          song={seqPlayerSong}
          session={session}
          onClose={() => setSeqPlayerSong(null)}
        />
      )}
    </section>
  );
}
