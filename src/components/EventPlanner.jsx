import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Shield, CheckCircle2, Plus, Info, Music, Calendar as CalendarIcon, X,
  Trash2, FileText, Headphones, Settings, Play, BookOpen, Loader2,
  Drum, Zap, Layout, Mic2, Video, User, ChevronDown, ChevronUp, Edit2, Check,
  GripVertical, UserX, Sparkles, Guitar
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { sendNotification } from '../utils/notifications';
import VisualCalendar from './VisualCalendar';
import ChartStudio from './ChartStudio';
import WebStemPlayer from './DAW/WebStemPlayer';
import { DEFAULT_DEPARTMENTS, DEFAULT_LEADERSHIP_ROLES, DEFAULT_PRODUCTION_ROLES, DEFAULT_LOGISTICS_ROLES, DEFAULT_INSTRUMENTS } from '../utils/defaultRoles';
import EventDayStatus from './EventDayStatus';
import { alertDialog, confirmDialog } from '../utils/dialogService';
import FirstUseTip from './FirstUseTip';

const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : ''
);

// [ESTABLE] MAPA DE VISUALIZACIÓN: Para etiquetas bilingües en el roster
const INSTRUMENT_DISPLAY_MAP = {
  'instr:bateria': 'DRUMS / BATERÍA',
  'instr:bajo': 'BASS / BAJO',
  'instr:piano': 'KEYS / TECLADO',
  'instr:guitarra': 'GTR / GUITARRA',
  'instr:voz': 'VOICE / VOZ',
  'instr:sonido': 'AUDIO / SONIDO',
  'instr:sonido_media': 'VISUALS / PANTALLAS'
};
const INSTRUMENT_MATCH_TAGS = {
  'bateria': 'instr:bateria', 'drums': 'instr:bateria', 'percusion': 'instr:bateria', 'perc': 'instr:bateria',
  'bajo': 'instr:bajo', 'bass': 'instr:bajo',
  'teclado': 'instr:piano', 'piano': 'instr:piano', 'keys': 'instr:piano',
  'guitarra': 'instr:guitarra', 'gt': 'instr:guitarra', 'gtr': 'instr:guitarra', 'electric': 'instr:guitarra', 'acoustic': 'instr:guitarra',
  'voz': 'instr:voz', 'voice': 'instr:voz', 'lead': 'instr:voz', 'cantante': 'instr:voz', 'coros': 'instr:voz',
  'sonido': 'instr:sonido', 'audio': 'instr:sonido',
  'streaming': 'instr:sonido_media', 'video': 'instr:sonido_media', 'pantalla': 'instr:sonido_media', 'media': 'instr:sonido_media',
};

const getBilingualName = (inst) => {
  const normalized = (inst || '').toLowerCase();
  if (INSTRUMENT_DISPLAY_MAP[normalized]) return INSTRUMENT_DISPLAY_MAP[normalized];
  const tag = Object.keys(INSTRUMENT_MATCH_TAGS).find(k => normalized.includes(k))
    ? INSTRUMENT_MATCH_TAGS[Object.keys(INSTRUMENT_MATCH_TAGS).find(k => normalized.includes(k))]
    : null;
  return INSTRUMENT_DISPLAY_MAP[tag] || inst;
};

// Sugerencias: ya NO usan un mapa fijo de palabras clave — comparan el rol
// contra los departamentos/instrumentos REALES configurados en Equipo.
const getSuggestedMembers = (roleName, members, allRoles) => {
  if (!roleName || !members) return { suggested: [], others: (members || []) };
  const normalizedRole = roleName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const matched = (allRoles || []).find(r => {
    const normLabel = (r.label || '').toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return normLabel && (normalizedRole.includes(normLabel) || normLabel.includes(normalizedRole));
  });
  if (!matched) return { suggested: [], others: (members || []) };
  const suggested = (members || []).filter(m => (m.functions || []).includes(matched.id));
  const others = (members || []).filter(m => !(m.functions || []).includes(matched.id));
  return { suggested, others };
};



const buildRoleBank = (orgSettings) => {
  const departments = orgSettings?.departments || DEFAULT_DEPARTMENTS;
  return departments.map(dept => {
    let colorHex = '#3b82f6';
    let bg = 'rgba(59,130,246,0.1)';
    if (dept.colorClass === 'yellow') { colorHex = '#eab308'; bg = 'rgba(234,179,8,0.1)'; }
    else if (dept.colorClass === 'purple') { colorHex = '#a855f7'; bg = 'rgba(168,85,247,0.1)'; }
    else if (dept.colorClass === 'orange') { colorHex = '#f97316'; bg = 'rgba(249,115,22,0.1)'; }
    else if (dept.colorClass === 'green') { colorHex = '#22c55e'; bg = 'rgba(34,197,94,0.1)'; }
    else if (dept.colorClass === 'red') { colorHex = '#ef4444'; bg = 'rgba(239,68,68,0.1)'; }
    
    return {
      category: dept.title.toUpperCase(),
      color: colorHex,
      bg: bg,
      roles: dept.roles || []
    };
  });
};

// [ESTABLE] COMPONENTE EXTRAÍDO (Con arreglos de truncado y visibilidad)
const MemberSelector = ({ value, onChange, members, roleName, placeholder, alignRight, eventDate, allRoles }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectedMember = members?.find(m => m.id === value);
  const { suggested, others } = getSuggestedMembers(roleName, members, allRoles);

  const handleSelect = (id) => {
    onChange(id);
    setIsOpen(false);
    setShowAll(false);
    setSearchTerm('');
  };

  // Modo compacto (sin buscar, sin "mostrar todos"): separamos sugeridos y
  // resto en dos listas con encabezado propio, en vez de un solo listado
  // donde la única pista era una estrellita pequeña.
  const isCompact = suggested.length > 0 && !showAll && !searchTerm;
  const suggestedFiltered = suggested.filter(m => m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const othersFiltered = others.filter(m => m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredList = isCompact ? suggestedFiltered : [...suggestedFiltered, ...othersFiltered];

  const renderMemberRow = (m, isSuggested) => {
    const isBlocked = eventDate && m.blocked_dates?.includes(eventDate);
    return (
      <div
        key={m.id}
        onClick={() => { if (!isBlocked) handleSelect(m.id); }}
        style={{
          padding: '10px 14px',
          borderRadius: '12px',
          cursor: isBlocked ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: value === m.id ? 'rgba(59,130,246,0.2)' : 'transparent',
          marginBottom: '4px',
          transition: 'all 0.2s ease',
          opacity: isBlocked ? 0.5 : 1
        }}
        className={isBlocked ? '' : "dropdown-item-custom"}
      >
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isBlocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)', color: isBlocked ? '#ef4444' : 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '900', border: isBlocked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {m.full_name?.[0]}
        </div>
        <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: '600', color: isBlocked ? '#ef4444' : (value === m.id ? 'var(--primary)' : 'white'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {m.full_name} {isBlocked && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.8 }}>(Ocupado)</span>}
        </div>
        {isSuggested && !isBlocked && <span style={{ color: '#fbbf24', fontSize: '0.9rem', filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.4))' }} title="Sugerido para este rol">✨</span>}
      </div>
    );
  };

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
            ...(alignRight ? { right: 0 } : { left: 0 }),
            minWidth: '240px', 
            background: '#1a2133', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '16px', 
            zIndex: 101, 
            maxHeight: '320px', 
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)', 
            padding: '8px', 
            animation: 'dropdownFadeIn 0.2s ease-out' 
          }}>
            <div style={{ paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px' }}>
              <input 
                autoFocus
                placeholder="Buscar miembro..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                onClick={e => e.stopPropagation()}
              />
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
              {value && (
                <div
                  onClick={() => handleSelect(null)}
                  className="dropdown-item-custom"
                  style={{ padding: '9px 14px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontWeight: '700', border: '1px dashed rgba(255,255,255,0.15)' }}
                >
                  <X size={14} /> Quitar asignación
                </div>
              )}

              {suggestedFiltered.length > 0 && (
                <div style={{ fontSize: '0.62rem', fontWeight: '900', color: '#fbbf24', letterSpacing: '1px', padding: '4px 10px 6px' }}>
                  ✨ SUGERIDOS PARA ESTE ROL
                </div>
              )}
              {suggestedFiltered.map(m => renderMemberRow(m, true))}

              {!isCompact && othersFiltered.length > 0 && (
                <div style={{ fontSize: '0.62rem', fontWeight: '900', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', padding: '10px 10px 6px' }}>
                  TODO EL EQUIPO
                </div>
              )}
              {!isCompact && othersFiltered.map(m => renderMemberRow(m, false))}

              {filteredList.length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>No se encontraron miembros</div>
              )}

              {suggested.length > 0 && !showAll && !searchTerm && others.length > 0 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowAll(true); }} 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: 'rgba(255,255,255,0.03)',
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
          </div>
        </>
      )}
    </div>
  );
};

const CustomDatePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Si `value` ya trae hora/zona (ej: viene de una columna timestamptz: "2026-07-04T00:00:00+00:00"),
  // hay que quedarnos solo con la fecha antes de concatenar nuestra propia hora, o el string queda
  // mal formado ("...+00:00T12:00:00") y produce un Invalid Date (mes "NaN", cuadrícula vacía).
  const [currentDate, setCurrentDate] = useState(() => value ? new Date(value.split('T')[0] + 'T12:00:00') : new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const prevMonth = (e) => { e.preventDefault(); setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); };
  const nextMonth = (e) => { e.preventDefault(); setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); };

  const handleSelect = (e, day) => {
    e.preventDefault();
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const dayNames = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="input-field" 
        style={{ width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>{value ? value.split('T')[0].split('-').reverse().join('/') : 'dd/mm/aaaa'}</span>
        <CalendarIcon size={16} color="var(--text-muted)" />
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: '#1a2133', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', zIndex: 10000, boxShadow: '0 10px 40px rgba(0,0,0,0.8)', animation: 'modalFadeIn 0.2s ease-out' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}><ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} /></button>
            <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
            <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}><ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {dayNames.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '800' }}>{d}</div>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = value && parseInt(value.split('-')[2]) === day && parseInt(value.split('-')[1]) === currentDate.getMonth() + 1 && parseInt(value.split('-')[0]) === currentDate.getFullYear();
              const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
              
              return (
                <button 
                  key={day}
                  onClick={(e) => handleSelect(e, day)}
                  style={{ 
                    padding: '8px 0', 
                    background: isSelected ? 'var(--primary)' : 'transparent', 
                    border: isToday && !isSelected ? '1px solid rgba(255,255,255,0.2)' : 'none', 
                    borderRadius: '8px', 
                    color: isSelected ? 'white' : 'rgba(255,255,255,0.8)', 
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: isSelected || isToday ? '700' : '500',
                    transition: 'all 0.1s'
                  }}
                  onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
            <button onClick={(e) => { e.preventDefault(); onChange(''); setIsOpen(false); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>Borrar</button>
            <button onClick={(e) => { e.preventDefault(); setCurrentDate(new Date()); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>Hoy</button>
          </div>

        </div>
      )}
    </div>
  );
};

export default function EventPlanner({ readOnly, events, members, orgId, refreshData, songs, profile, session, orgSettings }) {
  // Banco de roles y lista plana para sugerencias — derivados de lo que la
  // organización configuró en la pestaña Equipo (con los defaults como
  // respaldo si aún no ha personalizado nada).
  const roleBank = useMemo(() => buildRoleBank(orgSettings), [orgSettings]);
  const allRoles = useMemo(() => roleBank.flatMap(cat => cat.roles), [roleBank]);

  const [showModal, setShowModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [, setFormat] = useState('full');
  const [roster, setRoster] = useState([]);
  const [setlist, setSetlist] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [modalTab, setModalTab] = useState('info'); 
  const [notifyData, setNotifyData] = useState(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [expandedCardIds] = useState({});
  const [activeYoutubeUrl, setActiveYoutubeUrl] = useState(null);
  const [chartSong, setChartSong] = useState(null);
  const [initialRoster, setInitialRoster] = useState([]);
  const [dbHistory, setDbHistory] = useState([]);
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [seqPlayerSong, setSeqPlayerSong] = useState(null);
  const [descModalEv, setDescModalEv] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [showNewEventPicker, setShowNewEventPicker] = useState(false);
  const [pendingEventDate, setPendingEventDate] = useState('');
  const [draggedSongIdx, setDraggedSongIdx] = useState(null);
  const [replacementPicker, setReplacementPicker] = useState(null); // { eventId, rosterEntry }
  const [recurWeekly, setRecurWeekly] = useState(false);
  const [recurWeeks, setRecurWeeks] = useState(4);
  const [declineModal, setDeclineModal] = useState({ isOpen: false, event: null, roleId: null, instrument: null, reason: '' });
  // "Permitir declinar" ahora es POR EVENTO (no global de la organización) —
  // cada evento puede tener su propia política. orgSettings.allowDeclines solo
  // se usa como default al crear un evento nuevo.
  const [eventAllowDeclines, setEventAllowDeclines] = useState(true);

  const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr || dateStr.includes('NaN')) return 'Sin fecha';
    try {
      const d = new Date(dateStr.split('T')[0] + 'T00:00:00');
      if (isNaN(d.getTime())) return 'Fecha por confirmar';
      return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    } catch { return 'Error fecha'; }
  };

  const getInstrumentIcon = (inst) => {
    const i = (inst || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (i.includes('drums') || i.includes('bateria') || i.includes('perc')) return <Drum size={20} />;
    if (i.includes('bass') || i.includes('bajo')) return <Zap size={20} />;
    // Ícono real de guitarra (Lucide sí lo tiene) en vez del genérico <Music/> de antes.
    // Acústica usa un color distinto (ámbar, tono "madera") ya que Lucide no tiene
    // variantes eléctrica/acústica separadas — así no se confunden a simple vista.
    if (i.includes('acustica')) return <Guitar size={20} color="#f59e0b" />;
    if (i.includes('gtr') || i.includes('guitar') || i.includes('electrica')) return <Guitar size={20} />;
    if (i.includes('keys') || i.includes('piano') || i.includes('teclado')) return <Layout size={20} />;
    if (i.includes('voice') || i.includes('voz') || i.includes('coro')) return <Mic2 size={20} />;
    if (i.includes('audio') || i.includes('sonido')) return <Headphones size={20} />;
    if (i.includes('video') || i.includes('pantalla') || i.includes('visual') || i.includes('media') || i.includes('streaming')) return <Video size={20} />;
    if (i.includes('leader') || i.includes('direc') || i.includes('md') || i.includes('musical')) return <Shield size={20} />;
    if (i.includes('logistica') || i.includes('staff') || i.includes('roadie')) return <Users size={20} />;
    return <User size={20} />;
  };

  const getRoleGroup = (inst) => {
    const i = (inst || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (i.includes('coordinador') || i.includes('bienvenida') || i.includes('maestro') || i.includes('nino') || i.includes('seguridad') || i.includes('oraci') || i.includes('ujier') || i.includes('staff') || i.includes('predicador') || i.includes('preacher')) return 'LOGÍSTICA / STAFF';
    if (i.includes('sonido') || i.includes('audio') || i.includes('pantalla') || i.includes('camara') || i.includes('transmis') || i.includes('luce') || i.includes('roadie') || i.includes('director') || i.includes('direccion') || i.includes('video') || i.includes('visual') || i.includes('media')) return 'PRODUCCIÓN / MEDIA';
    // 'gtr' cubre las etiquetas abreviadas de las plantillas ("E. GTR", "A. GTR") que
    // no contienen la palabra completa "guitar" — antes caían en OTROS sin razón.
    // Mismo caso para brass/metales, que tampoco estaban cubiertos.
    if (i.includes('bateria') || i.includes('bajo') || i.includes('guitar') || i.includes('gtr') || i.includes('teclado') || i.includes('piano') || i.includes('voz') || i.includes('coro') || i.includes('percusion') || i.includes('drums') || i.includes('bass') || i.includes('keys') || i.includes('voice') || i.includes('brass') || i.includes('metales')) return 'MÚSICOS';
    return 'OTROS';
  };

  const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const handleExportPlan = (ev) => {
    const groups = { 'MÚSICOS': [], 'PRODUCCIÓN / MEDIA': [], 'LOGÍSTICA / STAFF': [], 'OTROS': [] };
    (ev.event_roster || []).filter(r => !r.is_removed).forEach(s => {
      const g = getRoleGroup(s.instrument);
      if (!groups[g]) groups[g] = [];
      groups[g].push(s);
    });

    const rosterHtml = Object.entries(groups).filter(([, items]) => items.length > 0).map(([groupName, items]) => `
      <h3>${escapeHtml(groupName)}</h3>
      <table>
        <tbody>
          ${items.map(s => {
            const memberName = members?.find(m => m.id === s.profile_id)?.full_name || 'Sin asignar';
            const roleName = getBilingualName(s.instrument);
            const isDeclined = s.status === 'declined' || s.status === 'rejected';
            const statusLabel = isDeclined ? 'Declinó' : (s.status === 'confirmed' ? 'Confirmado' : 'Pendiente');
            return `<tr class="${isDeclined ? 'declined' : ''}"><td class="role">${escapeHtml(roleName)}</td><td class="name">${escapeHtml(memberName)}</td><td class="status">${statusLabel}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    `).join('');

    const sortedSongs = [...(ev.event_songs || [])].sort((a, b) => a.order_index - b.order_index);
    const setlistHtml = sortedSongs.length === 0 ? '' : `
      <h3>Setlist</h3>
      <table>
        <thead><tr><th>#</th><th>Canción</th><th>Dirige</th><th>Tono</th></tr></thead>
        <tbody>
          ${sortedSongs.map((es, i) => {
            const song = songs?.find(s => s.id === es.song_id);
            const leader = members?.find(m => m.id === es.lead_id);
            return `<tr><td>${i + 1}</td><td>${escapeHtml(song?.title || 'Desconocida')}</td><td>${escapeHtml(leader?.full_name || '--')}</td><td>${escapeHtml(es.selected_key || '--')}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    `;

    const blockedForDate = (members || []).filter(m => ev.date && m.blocked_dates?.includes(ev.date.split('T')[0]));
    const blockedHtml = blockedForDate.length === 0 ? '' : `
      <p class="blocked-note"><strong>No disponibles esta fecha:</strong> ${blockedForDate.map(m => escapeHtml(m.full_name)).join(', ')}</p>
    `;

    const html = `<!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>${escapeHtml(ev.name)} — Plan del evento</title>
      <style>
        body { font-family: -apple-system, Segoe UI, Arial, sans-serif; color: #111; padding: 32px; max-width: 720px; margin: 0 auto; }
        h1 { font-size: 1.5rem; margin-bottom: 0; }
        .date { color: #555; font-size: 0.95rem; margin-top: 4px; text-transform: capitalize; }
        .desc { white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 0.9rem; }
        h3 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; color: #333; margin-top: 28px; border-bottom: 2px solid #ddd; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        td, th { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; font-size: 0.9rem; }
        th { color: #777; font-size: 0.75rem; text-transform: uppercase; }
        tr.declined td { color: #b91c1c; }
        .role { color: #666; width: 40%; }
        .status { text-align: right; color: #999; font-size: 0.8rem; }
        .blocked-note { margin-top: 24px; padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 8px; font-size: 0.85rem; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <h1>${escapeHtml(ev.name)}</h1>
        <div class="date">${escapeHtml(formatEventDate(ev.date))}</div>
        ${ev.description ? `<div class="desc">${escapeHtml(ev.description)}</div>` : ''}
        ${blockedHtml}
        ${rosterHtml}
        ${setlistHtml}
      </body></html>`;

    const win = window.open('', '_blank');
    if (!win) { alertDialog('El navegador bloqueó la ventana de impresión. Habilita popups para este sitio.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
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
    setRecurWeekly(false);
    setRecurWeeks(4);
    setEventAllowDeclines(ev.allow_declines !== false);
    const activeRosterFromDb = (ev.event_roster || []).filter(r => !r.is_removed);
    const isFullBand = activeRosterFromDb.some(r => ['Drums', 'Bass', 'Batería', 'Bajo'].includes(r.instrument));
    const detectedFormat = isFullBand ? 'full' : 'acoustic';
    setFormat(detectedFormat);
    
    // Solo cargamos lo que ya estaba guardado en la base de datos
    const merged = activeRosterFromDb.map(er => ({
      id: Math.random().toString(),
      event_roster_id: er.id,
      instrument: er.instrument,
      profile_id: er.profile_id,
      category: 'extra',
      status: er.status || 'pending'
    }));
    
    setRoster(merged);
    setInitialRoster(JSON.parse(JSON.stringify(merged)));
    setDbHistory(ev.event_roster || []);
    setSetlist(ev.event_songs ? [...ev.event_songs].sort((a,b)=>a.order_index - b.order_index).map(es => ({ song_id: es.song_id, lead_id: es.lead_id || '', selected_key: es.selected_key || '' })) : []);
    setModalTab('info');
    setShowModal(true);
  };


  const getLastPlayed = (songId) => {
    if (!events || events.length === 0) return null;
    let lastDate = null;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    events.forEach(ev => {
      if (!ev.date) return;
      const evDate = new Date(ev.date.split('T')[0] + 'T00:00:00');
      // Skip future events
      if (evDate > today) return;
      
      const hasSong = ev.event_songs?.some(es => String(es.song_id) === String(songId));
      if (hasSong) {
        if (!lastDate || evDate > lastDate) {
          lastDate = evDate;
        }
      }
    });

    if (!lastDate) return null;
    
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'hoy';
    if (diffDays === 1) return 'ayer';
    if (diffDays < 30) return `hace ${diffDays} días`;
    if (diffDays < 60) return `hace 1 mes`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `hace ${diffMonths} meses`;
    const diffYears = Math.floor(diffMonths / 12);
    return diffYears === 1 ? 'hace 1 año' : `hace ${diffYears} años`;
  };

  const handleNewEvent = (selectedDate) => {
    setPendingEventDate(selectedDate || '');
    setRecurWeekly(false);
    setRecurWeeks(4);
    setEventAllowDeclines(orgSettings?.allowDeclines !== false);
    setShowNewEventPicker(true);
  };

  const calculateRosterDiff = (initial, history, current, eventId) => {
    const diff = { newRecords: [], reactivated: [], updated: [], softDeleted: [], toNotify: [] };
    const currentActive = current.filter(m => m.profile_id);
    const claimedHistoryIds = new Set();
    
    currentActive.forEach(item => {
      let match = history.find(h => String(h.profile_id) === String(item.profile_id) && h.instrument === item.instrument && h.id === item.event_roster_id && !claimedHistoryIds.has(h.id));
      if (!match) {
        match = history.find(h => String(h.profile_id) === String(item.profile_id) && h.instrument === item.instrument && !claimedHistoryIds.has(h.id));
      }
      
      if (match) {
        claimedHistoryIds.add(match.id);
        if (match.is_removed) {
          diff.reactivated.push({ id: match.id, event_id: eventId, profile_id: item.profile_id, instrument: item.instrument, is_removed: false, status: 'pending' });
          diff.toNotify.push({ ...item, email: members.find(m => m.id === item.profile_id)?.email, name: members.find(m => m.id === item.profile_id)?.full_name });
        }
      } else {
        diff.newRecords.push({ event_id: eventId, profile_id: item.profile_id, instrument: item.instrument, category: item.category, status: 'pending' });
        diff.toNotify.push({ ...item, email: members.find(m => m.id === item.profile_id)?.email, name: members.find(m => m.id === item.profile_id)?.full_name });
      }
    });
    
    initial.forEach(active => {
      if (active.profile_id && active.event_roster_id && !claimedHistoryIds.has(active.event_roster_id)) {
        diff.softDeleted.push({ id: active.event_roster_id, event_id: eventId, profile_id: active.profile_id, instrument: active.instrument, is_removed: true, removed_at: new Date().toISOString() });
      }
    });
    return diff;
  };

  const handleSave = async () => {
    if (!eventName) { alertDialog('Falta el nombre del evento'); return; }
    if (!eventDate) { alertDialog('Falta la fecha del evento'); return; }
    if (saving) return;

    const baseDate = eventDate.split('T')[0];
    const blockedNames = roster.filter(r => r.profile_id).map(r => {
      const m = members?.find(mem => mem.id === r.profile_id);
      return (m && m.blocked_dates && m.blocked_dates.includes(baseDate)) ? m.full_name : null;
    }).filter(Boolean);
    const uniqueBlocked = [...new Set(blockedNames)];
    if (uniqueBlocked.length > 0) {
      const msg = `Las siguientes personas han marcado el ${baseDate} como NO DISPONIBLE en sus perfiles:\n\n${uniqueBlocked.map(n => `- ${n}`).join('\n')}\n\n¿Estás seguro de que deseas asignarlos de todos modos?`;
      if (!(await confirmDialog({ title: '⚠️ Atención', message: msg, danger: true }))) return;
    }

    setSaving(true);
    try {
      let evtId = editingEventId;
      if (editingEventId) {
        const { error } = await supabase.from('events').update({ name: eventName, date: eventDate, description, allow_declines: eventAllowDeclines }).eq('id', editingEventId);
        if (error) throw error;
      } else {
        const { data: evt, error } = await supabase.from('events').insert([{ org_id: orgId, name: eventName, date: eventDate, description, allow_declines: eventAllowDeclines }]).select().single();
        if (error) throw error;
        evtId = evt.id;
      }
      const diff = calculateRosterDiff(initialRoster, dbHistory, roster, evtId);
      if (diff.newRecords.length > 0) {
        const { error } = await supabase.from('event_roster').insert(diff.newRecords);
        if (error) throw error;
      }
      if (diff.reactivated.length > 0) {
        const ids = diff.reactivated.map(r => r.id);
        const { error } = await supabase.from('event_roster').update({ is_removed: false, status: 'pending' }).in('id', ids);
        if (error) throw error;
      }
      if (diff.softDeleted.length > 0) {
        const ids = diff.softDeleted.map(r => r.id);
        const { error } = await supabase.from('event_roster').update({ is_removed: true, removed_at: new Date().toISOString() }).in('id', ids);
        if (error) throw error;
      }
      const { error: songDelErr } = await supabase.from('event_songs').delete().eq('event_id', evtId);
      if (songDelErr) throw songDelErr;
      const validS = setlist.filter(i => i.song_id).map((i, idx) => ({ event_id: evtId, song_id: i.song_id, lead_id: i.lead_id || null, selected_key: i.selected_key || null, order_index: idx }));
      if (validS.length > 0) {
        const { error } = await supabase.from('event_songs').insert(validS);
        if (error) throw error;
      }
      const { data: freshRoster, error: freshErr } = await supabase.from('event_roster').select('*').eq('event_id', evtId).eq('is_removed', false);
      if (freshErr) throw freshErr;

      // Repetir semanalmente: clona el mismo equipo (sin setlist, eso cambia cada semana)
      // en las próximas N fechas. Va en su propio try/catch para que un fallo aquí no
      // dispare la alerta de "error crítico" sobre un evento principal que sí se guardó bien.
      if (!editingEventId && recurWeekly && recurWeeks > 1) {
        try {
          const filledRoster = roster.filter(r => r.profile_id);
          const baseDateObj = new Date(baseDate + 'T12:00:00');
          for (let i = 1; i < recurWeeks; i++) {
            const nextDateObj = new Date(baseDateObj);
            nextDateObj.setDate(nextDateObj.getDate() + 7 * i);
            const nextDate = nextDateObj.toISOString().split('T')[0];

            const { data: nextEvt, error: nextErr } = await supabase.from('events').insert([{ org_id: orgId, name: eventName, date: nextDate, description, allow_declines: eventAllowDeclines }]).select().single();
            if (nextErr) throw nextErr;

            if (filledRoster.length > 0) {
              const nextRosterRows = filledRoster.map(r => ({ event_id: nextEvt.id, profile_id: r.profile_id, instrument: r.instrument, category: r.category, status: 'pending' }));
              const { error: nextRosterErr } = await supabase.from('event_roster').insert(nextRosterRows);
              if (nextRosterErr) throw nextRosterErr;
            }
          }
        } catch (recurErr) {
          console.error('Error al generar semanas recurrentes:', recurErr);
          alertDialog(`El evento se guardó bien, pero hubo un problema generando las semanas siguientes: ${recurErr.message}`);
        }
      }

      // Generar la lista de todos con sus correos
      const allRosterWithEmails = (freshRoster || []).map(r => ({ ...r, email: members.find(m => m.id === r.profile_id)?.email, name: members.find(m => m.id === r.profile_id)?.full_name }));

      setNotifyData({ eventId: evtId, eventName, eventDate, description, setlist, candidates: diff.toNotify, allRoster: allRosterWithEmails });
      setShowModal(false);

      // Auto-enviar notificaciones a los agregados recientemente
      if (diff.toNotify && diff.toNotify.length > 0) {
        // Ejecutamos en segundo plano para no bloquear
        handleSendNotifications(diff.toNotify, 'delta', { eventName, eventDate, description, setlist });
      }

      // Si no hay candidatos nuevos, podemos saltarnos el modal, o mostrarlo siempre. Lo mostramos por si quieren reenviar a todos.
      setShowNotifyModal(true);
      if (refreshData) refreshData();
    } catch (e) { 
      console.error('Save Error:', e); 
      alertDialog('Error critico al guardar: ' + e.message + '\n\nRevisa la consola para más detalles.');
    }
    finally { setSaving(false); }
  };

  const handleSendNotifications = async (recipients, mode, overrideData = null) => {
    if (dispatching) return;
    setDispatching(true);
    setNotifyMessage(null);
    const isAuto = mode === 'delta' && overrideData !== null;
    try {
      const validRecipients = recipients.filter(r => r.email);

      if (validRecipients.length === 0) {
        if (!isAuto) setNotifyMessage({ type: 'error', text: 'No se puede enviar: Ninguno de los integrantes seleccionados tiene un correo registrado en su perfil.' });
        return; 
      }
      
      const evtName = overrideData ? overrideData.eventName : notifyData?.eventName;
      const evtDateRaw = overrideData ? overrideData.eventDate : notifyData?.eventDate;
      const evtDesc = overrideData ? overrideData.description : notifyData?.description;
      const evtSetlist = overrideData ? overrideData.setlist : notifyData?.setlist;

      if (!evtDateRaw) throw new Error("Falta la fecha del evento para notificar.");

      // SOLUCIÓN ESTRUCTURAL A "Invalid Date":
      // Limpiar la fecha descartando cualquier sufijo de hora que venga de la DB (ej: T19:00:00Z)
      const cleanDate = evtDateRaw.split('T')[0];
      
      // Formatear la fecha a humano para evitar "Invalid Date"
      const dateObj = new Date(cleanDate + 'T12:00:00');
      const formattedDate = isNaN(dateObj.getTime()) ? 'Fecha por confirmar' : dateObj.toLocaleDateString('es-ES', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });

      const setlistDetails = (evtSetlist || []).filter(s => s.song_id).map(s => {
        const songData = songs.find(ss => ss.id === s.song_id);
        const leadData = members.find(m => m.id === s.lead_id);
        return {
          title: songData ? songData.title : 'Canción Desconocida',
          key: s.selected_key || '-',
          lead: leadData ? leadData.full_name.split(' ')[0] : '---'
        };
      });

      const payload = { 
        eventName: evtName, 
        eventDate: formattedDate, 
        description: evtDesc, 
        setlist: setlistDetails,
        rosterWithEmails: validRecipients.map(r => ({ 
          event_roster_id: r.id, 
          profile_id: r.profile_id || r.id,
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
        
        if (!isAuto) {
          setNotifyMessage({ type: 'success', text: '✅ Notificaciones enviadas correctamente a ' + validRecipients.length + ' integrantes.' });
          closeModal(); setShowNotifyModal(false);
        } else {
          // Si es automático, solo mostramos una notificación pequeña tipo toast o nada, 
          // pero NO cerramos el modal porque el usuario lo está viendo.
          console.log("Auto-notificación enviada a nuevos.");
        }
      } else {
        setNotifyMessage({ type: 'error', text: `❌ Error del Servidor: ${result.error || result.details || 'No se pudo enviar la notificación.'}` });
        console.error("Notify API Error:", result);
      }
    } catch (e) { setNotifyMessage({ type: 'error', text: `❌ Error de red: ${e.message}` }); }
    finally { setDispatching(false); }
  };

  const handleDeleteEventConfirm = async () => {
    if (!eventToDelete) return;
    try {
      await supabase.from('events').delete().eq('id', eventToDelete.id);
      if (typeof selectedEventDetails !== 'undefined' && selectedEventDetails?.id === eventToDelete.id) {
        setSelectedEventDetails(null);
      }
      refreshData();
    } catch (e) {
      console.error('Delete Event Error:', e);
    } finally {
      setEventToDelete(null);
    }
  };

  const updateRosterStatus = async (event, roleId, status, instrument) => {
    const eventId = event?.id ?? event;
    try {
      await supabase.from('event_roster').update({ status }).eq('event_id', eventId).eq('profile_id', roleId);
      if (refreshData) refreshData();

      // Alerta automática a los directores para que puedan buscar reemplazo cuanto antes.
      if (status === 'declined' && event?.id) {
        const decliningMember = (members || []).find(m => String(m.id) === String(roleId));
        const directors = (members || [])
          .filter(m => m.role === 'director' && (m.email || m.id))
          .map(m => ({ profile_id: m.id, email: m.email, name: m.full_name }));

        if (directors.length > 0) {
          fetch(`${API_URL}/api/events/notify-decline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({
              eventName: event.name,
              eventDate: formatEventDate(event.date),
              instrument: getBilingualName(instrument || ''),
              memberName: decliningMember?.full_name || 'Un integrante',
              directors
            })
          }).catch(err => console.error('No se pudo notificar el rechazo:', err));
        }
      }
      
      if (status === 'confirmed') {
        const directorIds = (members || []).filter(m => m.role === 'director').map(m => m.id);
        const memberName = profile?.full_name || 'Un integrante';
        await sendNotification({
          orgId,
          targetProfileIds: directorIds,
          actorId: roleId,
          eventId: event.id,
          type: 'confirmation',
          message: `${memberName} ha confirmado asistencia.`
        });
      }
    } catch { alertDialog("Error al confirmar."); }
  };

  const submitDeclineReason = async () => {
    if (declineModal.event?.allow_declines === false) {
      alertDialog("El director desactivó las declinaciones para este evento.");
      return;
    }
    if (!declineModal.reason.trim()) {
      alertDialog("Debes proporcionar una justificación.");
      return;
    }
    const eventId = declineModal.event?.id ?? declineModal.event;
    try {
      await supabase.from('event_roster')
        .update({ status: 'decline_requested', decline_reason: declineModal.reason })
        .eq('event_id', eventId)
        .eq('profile_id', declineModal.roleId);
        
      if (refreshData) refreshData();
      
      // Update local state if needed
      if (selectedEventDetails && selectedEventDetails.id === eventId) {
         setSelectedEventDetails({...selectedEventDetails, event_roster: selectedEventDetails.event_roster.map(r => String(r.profile_id) === String(declineModal.roleId) ? {...r, status: 'decline_requested', decline_reason: declineModal.reason} : r)});
      }
      
      const directorIds = (members || []).filter(m => m.role === 'director').map(m => m.id);
      await sendNotification({
        orgId,
        targetProfileIds: directorIds,
        actorId: declineModal.roleId,
        eventId: eventId,
        type: 'decline_request',
        message: declineModal.reason
      });

      setDeclineModal({ isOpen: false, event: null, roleId: null, instrument: null, reason: '' });
      alertDialog("Tu justificación ha sido enviada al director para aprobación.");
    } catch {
      alertDialog("Error al enviar la justificación.");
    }
  };

  const handleRemoveFromRoster = async (rosterId) => {
    if (!(await confirmDialog({ message: '¿Seguro que quieres eliminar a este usuario del evento?', danger: true }))) return;
    try {
      await supabase.from('event_roster').delete().eq('id', rosterId);
      if (refreshData) refreshData();
    } catch { alertDialog("Error al eliminar."); }
  };

  const handleAssignReplacement = async (newProfileId) => {
    if (!replacementPicker) return;
    const { event, rosterEntry } = replacementPicker;
    try {
      const { error } = await supabase.from('event_roster')
        .update({ profile_id: newProfileId, status: 'pending' })
        .eq('id', rosterEntry.id);
      if (error) throw error;

      if (refreshData) refreshData();
      setReplacementPicker(null);

      const newMember = (members || []).find(m => String(m.id) === String(newProfileId));
      if (newMember?.email) {
        handleSendNotifications([{
          id: rosterEntry.id, profile_id: newProfileId, email: newMember.email,
          name: newMember.full_name, instrument: rosterEntry.instrument
        }], 'delta', { eventName: event.name, eventDate: event.date, description: event.description });
      }
    } catch {
      alertDialog('Error al asignar el reemplazo.');
    }
  };

  const closeModal = () => { setShowModal(false); setEditingEventId(null); setSaving(false); };

  if (!profile || !members) return <div style={{ padding: '4rem', textAlign: 'center' }}>Cargando equipo...</div>;

  const currentUserId = session?.user?.id || profile?.id;
  const userRole = (profile?.role || '').toLowerCase();
  const eventsToShow = userRole === 'director' ? (events || []) : (events || []).filter(ev => ev.event_roster?.some(r => String(r.profile_id) === String(currentUserId) && !r.is_removed));

  // Un evento es "pasado" solo cuando su fecha es ANTERIOR a hoy (el día completo del evento siempre se muestra en proximos)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const upcomingEvents = eventsToShow.filter(ev => {
    if (!ev.date) return true; // Sin fecha -> siempre proximo
    const evDate = new Date(ev.date.split('T')[0] + 'T00:00:00'); // Normalizar a medianoche local
    return evDate >= todayStart;
  });

  const pastEvents = eventsToShow.filter(ev => {
    if (!ev.date) return false;
    const evDate = new Date(ev.date.split('T')[0] + 'T00:00:00');
    return evDate < todayStart; // Solo pasa a "pasados" cuando el día del evento ya terminó
  });

  // Eventos que son HOY exactamente — para el widget de estado en vivo del equipo.
  const todayStr = `${todayStart.getFullYear()}-${String(todayStart.getMonth() + 1).padStart(2, '0')}-${String(todayStart.getDate()).padStart(2, '0')}`;
  const todaysEvents = eventsToShow.filter(ev => ev.date && ev.date.split('T')[0] === todayStr);

  // [ESTABLE] Temas Joya Premium
  const cardThemes = [
    { main: '#3b82f6', glass: 'rgba(59, 130, 246, 0.1)', light: 'rgba(59, 130, 246, 0.3)' }, // 0: Royal Blue
    { main: '#8b5cf6', glass: 'rgba(139, 92, 246, 0.1)', light: 'rgba(139, 92, 246, 0.3)' }, // 1: Neon Purple
    { main: '#ec4899', glass: 'rgba(236, 72, 153, 0.1)', light: 'rgba(236, 72, 153, 0.3)' }, // 2: Pink
    { main: '#f97316', glass: 'rgba(249, 115, 22, 0.1)', light: 'rgba(249, 115, 22, 0.3)' }, // 3: Sunset
    { main: '#be123c', glass: 'rgba(190, 18, 60, 0.1)', light: 'rgba(190, 18, 60, 0.3)' }, // 4: Rose
    { main: '#94a3b8', glass: 'rgba(148, 163, 184, 0.1)', light: 'rgba(148, 163, 184, 0.3)' }, // 5: Silver Default
  ];

  const getEventTheme = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('servicio') || n.includes('dominical') || n.includes('culto')) return cardThemes[0];
    if (n.includes('oración') || n.includes('ayuno') || n.includes('búsqueda')) return cardThemes[4];
    if (n.includes('reunión') || n.includes('jóvenes') || n.includes('servidores') || n.includes('ensayo')) return cardThemes[1];
    if (n.includes('especial') || n.includes('altar') || n.includes('conferencia')) return cardThemes[3];
    return cardThemes[5];
  };

  const renderEventList = (list, isPast = false) => {
    if (list.length === 0) return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <CalendarIcon size={28} style={{ opacity: 0.15, display: 'block', margin: '0 auto 0.75rem' }} />
        No hay eventos próximos. Prepárate con excelencia para lo que viene.
      </div>
    );

    return list.map(ev => {
      const isExpanded = !!expandedCardIds[ev.id];
      const theme = getEventTheme(ev.name);
      const userSlots = ev.event_roster?.filter(r => String(r.profile_id) === String(currentUserId) && !r.is_removed) || [];
      const evDate = ev.date ? new Date(ev.date.split('T')[0] + 'T00:00:00') : null;
      const isToday = evDate && evDate.toDateString() === new Date().toDateString();

      const statusLabel = (s) => s === 'confirmed' ? 'Confirmado' : (s === 'declined' || s === 'rejected') ? 'Rechazado' : 'Pendiente';
      const statusDot  = (s) => s === 'confirmed' ? '#10b981' : (s === 'declined' || s === 'rejected') ? '#ef4444' : '#f59e0b';

      return (
        <div key={ev.id} style={{
          position: 'relative',
          marginBottom: '1rem',
          borderRadius: '16px',
          overflow: 'hidden',
          background: isPast ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.7)',
          border: `1px solid ${isPast ? 'rgba(255,255,255,0.06)' : theme.light}`,
          boxShadow: isPast ? 'none' : `0 4px 24px -4px ${theme.main}22`,
          opacity: isPast ? 0.55 : 1,
          backdropFilter: 'blur(12px)',
          transition: 'box-shadow 0.2s ease',
        }}>
          {/* Accent line left */}
          {!isPast && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: theme.main, borderRadius: '3px 0 0 3px' }} />}

          <div style={{ padding: '1.25rem 1.25rem 1.25rem 1.6rem' }}>

            {/* â”€â”€ TOP ROW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>

                {/* Date chip + TODAY badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  {isToday && (
                    <span style={{ fontSize: '0.58rem', fontWeight: '900', color: '#fff', background: theme.main, padding: '2px 8px', borderRadius: '20px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      HOY
                    </span>
                  )}
                  <span style={{ fontSize: '0.68rem', fontWeight: '700', color: theme.main, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {formatEventDate(ev.date)}
                  </span>
                </div>

                {/* Title */}
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'white', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                  {ev.name}
                </h4>

                {/* Description - button + expandable panel */}
                {ev.description && (
                  <div style={{ marginTop: '6px' }}>
                    <button
                      onClick={() => setDescModalEv(descModalEv === ev.id ? null : ev.id)}
                      style={{ background: 'transparent', border: 'none', padding: '2px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: descModalEv === ev.id ? theme.main : 'rgba(255,255,255,0.3)', fontSize: '0.68rem', fontWeight: '700', transition: 'color 0.15s', letterSpacing: '0.3px' }}
                      onMouseEnter={e => e.currentTarget.style.color = theme.main}
                      onMouseLeave={e => e.currentTarget.style.color = descModalEv === ev.id ? theme.main : 'rgba(255,255,255,0.3)'}
                    >
                      <ChevronDown size={11} style={{ transform: descModalEv === ev.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                      {descModalEv === ev.id ? 'Ocultar descripcion' : 'Ver descripcion'}
                    </button>
                    {descModalEv === ev.id && (
                      <div style={{ marginTop: '8px', padding: '0.9rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: `1px solid ${theme.light}`, maxHeight: '160px', overflowY: 'auto', fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }} className="custom-scrollbar">
                        {ev.description}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Admin buttons */}
              {!readOnly && (
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  <button onClick={() => handleEditEvent(ev)}
                    title="Editar"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color='white'; e.currentTarget.style.background='rgba(255,255,255,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color='rgba(255,255,255,0.4)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => setEventToDelete(ev)}
                    title="Eliminar"
                    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color='#ef4444'; e.currentTarget.style.background='rgba(239,68,68,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color='rgba(239,68,68,0.5)'; e.currentTarget.style.background='rgba(239,68,68,0.07)'; }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* â”€â”€ ASSIGNMENT ROW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {userSlots.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {/* Slot pills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                  {userSlots.map((slot, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.08)` }}>
                      <span style={{ fontSize: '0.9rem' }}>{getInstrumentIcon(slot.instrument)}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'white' }}>{getBilingualName(slot.instrument)}</span>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusDot(slot.status), flexShrink: 0 }} title={slot.status === 'decline_requested' ? 'Pendiente de Aprobación' : statusLabel(slot.status)} />
                    </div>
                  ))}
                </div>

                {/* Confirm/Decline */}
                {!isPast && (
                  <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                    {userSlots.some(s => s.status !== 'confirmed') && (
                      <button onClick={() => updateRosterStatus(ev, currentUserId, 'confirmed')}
                        style={{ padding: '5px 12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={11} /> Confirmar
                      </button>
                    )}
                    {ev.allow_declines !== false && userSlots.some(s => s.status !== 'declined' && s.status !== 'rejected' && s.status !== 'decline_requested') && (
                      <button onClick={() => setDeclineModal({ isOpen: true, event: ev, roleId: currentUserId, instrument: userSlots[0]?.instrument, reason: '' })}
                        style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#ef4444', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <X size={11} /> Declinar
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* â”€â”€ EXPAND BUTTON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <button onClick={() => setSelectedEventDetails(ev)}
              style={{ width: '100%', marginTop: '0.9rem', padding: '0.5rem', background: 'transparent', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.5px' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = theme.light; e.currentTarget.style.color = theme.main; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}>
              <ChevronDown size={13} />
              'Ver detalles y equipo'
            </button>

            {/* â”€â”€ EXPANDED SECTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {isExpanded && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                {/* Team */}
                {(() => {
                  const groups = { 'BANDA': [], 'VOCES': [], 'PRODUCCION / STAFF': [] };
                  (ev.event_roster || []).filter(s => !s.is_removed).forEach(s => {
                    const g = getRoleGroup(s.instrument);
                    if (!groups[g]) groups[g] = [];
                    groups[g].push(s);
                  });
                  return Object.entries(groups).filter(([_, items]) => items.length > 0).map(([groupName, items]) => {
                    // Sort by Spanish ordinal if instrument name contains one
                    const ordinalRank = (name = '') => {
                      const n = name.toLowerCase();
                      const match = n.match(/([1-9])/);
                      if (match) return parseInt(match[1]);
                      if (n.includes('primer') || n.includes('primero') || n.includes('first')) return 1;
                      if (n.includes('segundo') || n.includes('second')) return 2;
                      if (n.includes('tercer') || n.includes('tercero') || n.includes('third')) return 3;
                      if (n.includes('cuarto') || n.includes('fourth')) return 4;
                      if (n.includes('quinto') || n.includes('fifth')) return 5;
                      if (n.includes('sexto') || n.includes('sixth')) return 6;
                      if (n.includes('septimo') || n.includes('seventh')) return 7;
                      return 99;
                    };
                    const sorted = [...items].sort((a, b) => {
                      const nameA = getBilingualName(a.instrument);
                      const nameB = getBilingualName(b.instrument);
                      if (nameA < nameB) return -1;
                      if (nameA > nameB) return 1;
                      
                      const rankDiff = ordinalRank(a.instrument) - ordinalRank(b.instrument);
                      if (rankDiff !== 0) return rankDiff;
                      
                      return (a.instrument || '').localeCompare(b.instrument || '');
                    });
                    return (
                      <div key={groupName} style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{groupName}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {sorted.map((s, i) => {
                            const dot = statusDot(s.status);
                            const memberName = members.find(m => m.id === s.profile_id)?.full_name?.split(' ')[0] || '--';
                            const roleName = getBilingualName(s.instrument);
                            const isDeclined = s.status === 'declined' || s.status === 'rejected';
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: isDeclined ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isDeclined ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '20px', position: 'relative' }}>
                                {userRole === 'director' && (
                                  <button onClick={() => handleRemoveFromRoster(s.id)}
                                    style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', borderRadius: '50%', background: 'rgba(239,68,68,0.8)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={8} />
                                  </button>
                                )}
                                <span style={{ fontSize: '0.78rem' }}>{getInstrumentIcon(s.instrument)}</span>
                                {/* Role label */}
                                <span style={{ fontSize: '0.62rem', fontWeight: '800', color: theme.main, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>{roleName}</span>
                                {/* Separator */}
                                <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                                {/* Member name */}
                                <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>{memberName}</span>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: dot, flexShrink: 0 }} title={statusLabel(s.status)} />
                                {userRole === 'director' && isDeclined && (
                                  <button onClick={() => setReplacementPicker({ event: ev, rosterEntry: s })}
                                    title="Buscar reemplazo"
                                    style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', cursor: 'pointer', padding: '2px 6px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', fontWeight: '800' }}>
                                    <UserX size={10} /> Reemplazar
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });

                })()}

                {/* Setlist */}
                {ev.event_songs && ev.event_songs.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>SETLIST</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {[...ev.event_songs].sort((a,b) => a.order_index - b.order_index).map((es, i) => {
                        const song = songs?.find(s => s.id === es.song_id);
                        const leader = members?.find(m => m.id === es.lead_id);
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: theme.main, width: '16px', flexShrink: 0 }}>{i + 1}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song?.title || 'Cancion desconocida'}</div>
                                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)' }}>{leader?.full_name?.split(' ')[0] || '--'} &bull; <span style={{ color: theme.main }}>{es.selected_key || '--'}</span></div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                              {(song?.has_sequence || song?.sequences?.length > 0) && (
                                <button onClick={() => { const p = (profile?.organizations?.plan||'free').toLowerCase(); p !== 'free' ? setSeqPlayerSong(song) : alertDialog('Requiere plan PRO'); }}
                                  style={{ padding: '4px', borderRadius: '6px', border: 'none', background: 'rgba(139,92,246,0.12)', color: '#a78bfa', cursor: 'pointer', display: 'flex' }}>
                                  <Headphones size={12} />
                                </button>
                              )}
                              {song?.youtube_link && (
                                <button onClick={() => setActiveYoutubeUrl(song.youtube_link)}
                                  style={{ padding: '4px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
                                  <Play size={12} fill="#ef4444" />
                                </button>
                              )}
                              <button onClick={() => setChartSong(song)}
                                style={{ padding: '4px', borderRadius: '6px', border: 'none', background: theme.glass, color: theme.main, cursor: 'pointer', display: 'flex' }}>
                                <FileText size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
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

      <FirstUseTip
        storageKey={`bandly_tip_planner_${profile?.id || 'anon'}`}
        title="Cómo usar el calendario"
        accentColor="var(--accent)"
        items={!readOnly ? [
          'Al crear un evento elige una plantilla (Banda Base, Reunión General) para no armar el equipo desde cero cada vez.',
          'Marca "Repetir cada semana" al crear el evento y se clona automáticamente el equipo para las próximas semanas.',
          'Verás en rojo a cualquier miembro que ya tenga esa fecha bloqueada, antes de asignarlo.'
        ] : [
          'El día del evento verás aquí un estado en vivo de quién ya confirmó su llegada.',
          'Si no puedes asistir a una fecha, márcala como bloqueada desde tu perfil para que tu director lo vea antes de asignarte.',
          'Toca cualquier evento para ver el equipo completo y el setlist.'
        ]}
      />

      {todaysEvents.map(ev => (
        <EventDayStatus key={ev.id} event={ev} members={members} />
      ))}

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
           <div><h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px' }}>proximos Eventos</h4>{renderEventList(upcomingEvents)}</div>
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
             <VisualCalendar events={events} onEventClick={setSelectedEventDetails} onDayClick={readOnly ? null : handleNewEvent} />
           </div>
        </div>
      </section>

      {selectedEventDetails && createPortal((
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: '#0f172a', zIndex: 9999999, display: 'flex', flexDirection: 'column' }}>
          
          {/* Header Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
             <button onClick={() => setSelectedEventDetails(null)} style={{ background: 'transparent', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', cursor: 'pointer' }}>
               <ChevronDown style={{ transform: 'rotate(90deg)' }} size={20} /> Volver
             </button>
             <div style={{ display: 'flex', gap: '8px' }}>
               <button onClick={() => handleExportPlan(selectedEventDetails)} title="Exportar plan completo (PDF / imprimir)" style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                 <FileText size={14} /> Exportar
               </button>
               {!readOnly && (
                 <>
                   <button onClick={() => { setSelectedEventDetails(null); handleEditEvent(selectedEventDetails); }} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                     <Edit2 size={14} /> Editar
                   </button>
                   <button onClick={() => setEventToDelete(selectedEventDetails)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                     <Trash2 size={14} />
                   </button>
                 </>
               )}
             </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', paddingBottom: '4rem' }} className="custom-scrollbar">
             
             {/* Event Info */}
             <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
               <div style={{ fontSize: '0.8rem', color: getEventTheme(selectedEventDetails.name).main, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                 {formatEventDate(selectedEventDetails.date)}
               </div>
               <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: '0 0 1rem 0', color: 'white', lineHeight: 1.1 }}>{selectedEventDetails.name}</h2>
               {selectedEventDetails.description && (
                  <details style={{ marginTop: '0.5rem', maxWidth: '600px', margin: '0 auto' }}>
                    <summary style={{ fontSize: '0.75rem', color: getEventTheme(selectedEventDetails.name).main, cursor: 'pointer', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', userSelect: 'none', listStyle: 'none' }} className="custom-summary">
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        Ver descripción completa
                      </span>
                    </summary>
                    <div style={{ marginTop: '1rem', padding: '1.2rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordWrap: 'break-word', wordBreak: 'break-word', textAlign: 'left' }} className="custom-scrollbar">
                      {selectedEventDetails.description}
                    </div>
                  </details>
                )}
             </div>

             {/* Mi Participación */}
             {(() => {
                const userSlots = selectedEventDetails.event_roster?.filter(r => String(r.profile_id) === String(currentUserId) && !r.is_removed) || [];
                if(userSlots.length === 0) return null;
                const isPast = selectedEventDetails.date && new Date(selectedEventDetails.date.split('T')[0] + 'T00:00:00') < new Date().setHours(0,0,0,0);
                
                return (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
                     <h3 style={{ fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <User size={16} color="var(--primary)" /> Mi Participación
                     </h3>
                     
                     <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                       {userSlots.map((s, i) => (
                         <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>
                           {getBilingualName(s.instrument)}
                         </div>
                       ))}
                     </div>

                     {!isPast && userSlots.some(s => s.status !== 'confirmed') && (
                        <button onClick={() => {
                            updateRosterStatus(selectedEventDetails, currentUserId, 'confirmed');
                            setSelectedEventDetails({...selectedEventDetails, event_roster: selectedEventDetails.event_roster.map(r => String(r.profile_id) === String(currentUserId) ? {...r, status: 'confirmed'} : r)});
                        }} style={{ width: '100%', padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
                          <CheckCircle2 size={20} /> Confirmar Asistencia
                        </button>
                     )}
                     {selectedEventDetails.allow_declines !== false && !isPast && userSlots.some(s => s.status !== 'declined' && s.status !== 'rejected' && s.status !== 'decline_requested') && (
                        <button onClick={() => {
                            setDeclineModal({ isOpen: true, event: selectedEventDetails, roleId: currentUserId, instrument: userSlots[0]?.instrument, reason: '' });
                        }} style={{ width: '100%', padding: '0.8rem', background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <X size={16} /> Declinar
                        </button>
                     )}
                  </div>
                );
             })()}

             {/* Equipo */}
             <div style={{ marginBottom: '2rem' }}>
               <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Users size={20} color="var(--primary)" /> Equipo ({(selectedEventDetails.event_roster?.filter(r => !r.is_removed).length || 0)})
               </h3>
               {(() => {
                  const groups = { 'BANDA': [], 'VOCES': [], 'PRODUCCION / STAFF': [] };
                  (selectedEventDetails.event_roster || []).filter(r => !r.is_removed).forEach(s => {
                    const g = getRoleGroup(s.instrument);
                    if (!groups[g]) groups[g] = [];
                    groups[g].push(s);
                  });
                  return Object.entries(groups).filter(([_, items]) => items.length > 0).map(([groupName, items]) => {
                     const ordinalRank = (name = '') => {
                       const n = name.toLowerCase();
                       const match = n.match(/([1-9])/);
                       if (match) return parseInt(match[1]);
                       if (n.includes('primer') || n.includes('primero') || n.includes('first')) return 1;
                       if (n.includes('segundo') || n.includes('second')) return 2;
                       if (n.includes('tercer') || n.includes('tercero') || n.includes('third')) return 3;
                       if (n.includes('cuarto') || n.includes('fourth')) return 4;
                       if (n.includes('quinto') || n.includes('fifth')) return 5;
                       if (n.includes('sexto') || n.includes('sixth')) return 6;
                       if (n.includes('septimo') || n.includes('seventh')) return 7;
                       return 99;
                     };
                     const sorted = [...items].sort((a, b) => {
                       const nameA = getBilingualName(a.instrument);
                       const nameB = getBilingualName(b.instrument);
                       if (nameA < nameB) return -1;
                       if (nameA > nameB) return 1;
                       
                       const rankDiff = ordinalRank(a.instrument) - ordinalRank(b.instrument);
                       if (rankDiff !== 0) return rankDiff;
                       
                       return (a.instrument || '').localeCompare(b.instrument || '');
                     });
                     
                     return (
                       <div key={groupName} style={{ marginBottom: '1.5rem' }}>
                         <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.8rem' }}>{groupName}</div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {sorted.map((s, i) => {
                               const memberName = members.find(m => m.id === s.profile_id)?.full_name?.split(' ')[0] || 'Sin Asignar';
                               const roleName = getBilingualName(s.instrument);
                               const isDeclined = s.status === 'declined' || s.status === 'rejected';
                               const dot = s.status === 'confirmed' ? '#10b981' : isDeclined ? '#ef4444' : '#f59e0b';

                               return (
                                 <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: isDeclined ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                       <div style={{ color: getEventTheme(selectedEventDetails.name).main, display: 'flex', alignItems: 'center' }}>
                                         {getInstrumentIcon(s.instrument)}
                                       </div>
                                       <div>
                                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>{memberName}</div>
                                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{roleName}</div>
                                       </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                       {userRole === 'director' && isDeclined && (
                                         <button onClick={() => setReplacementPicker({ event: selectedEventDetails, rosterEntry: s })}
                                           title="Buscar reemplazo"
                                           style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', cursor: 'pointer', padding: '3px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: '800' }}>
                                           <UserX size={11} /> Reemplazar
                                         </button>
                                       )}
                                       <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
                                    </div>
                                 </div>
                               );
                            })}
                         </div>
                       </div>
                     );
                  });
               })()}
             </div>

             {/* Setlist */}
             {selectedEventDetails.event_songs && selectedEventDetails.event_songs.length > 0 && (
               <div>
                 <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Music size={20} color="var(--primary)" /> Setlist
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[...selectedEventDetails.event_songs].sort((a,b) => a.order_index - b.order_index).map((es, i) => {
                       const song = songs?.find(s => s.id === es.song_id);
                       const leader = members?.find(m => m.id === es.lead_id);
                       return (
                         <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                           <div style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', width: '24px' }}>{i+1}</div>
                           <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '1rem', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song?.title || 'Desconocida'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span>Dirige: {leader?.full_name?.split(' ')[0] || '--'}</span>
                                <span style={{ opacity: 0.5 }}>|</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  {es.selected_key === song?.key_male ? '👨' : (es.selected_key === song?.key_female ? '👩' : '🎵')} Tono: <strong style={{ color: 'white', fontWeight: '800' }}>{es.selected_key || '--'}</strong>
                                </span>
                              </div>
                           </div>
                           <div style={{ display: 'flex', gap: '6px' }}>
                              {(song?.has_sequence || song?.sequences?.length > 0) && (
                                <button onClick={() => { const p = (profile?.organizations?.plan||'free').toLowerCase(); p !== 'free' ? setSeqPlayerSong(song) : alertDialog('Requiere plan PRO'); }} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Headphones size={16} />
                                </button>
                              )}
                              {song?.youtube_link && (() => {
                                 const yid = getYoutubeId(song.youtube_link);
                                 return yid ? (
                                   <div 
                                     onClick={() => setActiveYoutubeUrl(song.youtube_link)}
                                     style={{ 
                                       width: '64px', 
                                       height: '36px', 
                                       borderRadius: '6px', 
                                       position: 'relative', 
                                       cursor: 'pointer',
                                       border: '1px solid rgba(255,255,255,0.1)',
                                       flexShrink: 0,
                                       transform: 'translateZ(0)',
                                       WebkitTransform: 'translateZ(0)'
                                     }}
                                   >
                                     <img src={`https://img.youtube.com/vi/${yid}/hqdefault.jpg`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px' }} alt="YouTube Thumbnail" />
                                     <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', borderRadius: '5px' }} 
                                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'} 
                                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}>
                                       <Play size={16} fill="#ef4444" color="#ef4444" />
                                     </div>
                                   </div>
                                 ) : (
                                   <button onClick={() => setActiveYoutubeUrl(song.youtube_link)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                     <Play size={16} fill="#ef4444" />
                                   </button>
                                 );
                               })()}
                              <button onClick={() => setChartSong(song)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FileText size={16} />
                              </button>
                           </div>
                         </div>
                       );
                    })}
                 </div>
               </div>
             )}
          </div>
        </div>
      ), document.body)}
    

            {showNewEventPicker && createPortal((
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: 'rgba(0,0,0,0.85)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
          <div className="glass-panel" style={{
            padding: '2.5rem', width: '92%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
            animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative',
            background: 'linear-gradient(180deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)',
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }} className="custom-scrollbar">

            <button onClick={() => setShowNewEventPicker(false)} style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
              <X size={22} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'inline-flex', background: 'rgba(59,130,246,0.12)', padding: '0.9rem', borderRadius: '50%', marginBottom: '1rem', border: '1px solid rgba(59,130,246,0.25)' }}>
                <CalendarIcon size={26} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.6rem', fontWeight: '900', margin: 0, color: 'white', letterSpacing: '-0.02em' }}>Crear Nuevo Evento</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Elige cómo quieres empezar</p>
            </div>

            {(() => {
              const startOptions = [
                {
                  id: 'blank', icon: <FileText size={22} />, label: 'Evento en Blanco', desc: 'Arma el equipo desde cero',
                  color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.15)',
                  onClick: () => {
                    setEditingEventId(null); setEventName(''); setEventDate(pendingEventDate); setDescription('');
                    setFormat('blank'); setRoster([]); setInitialRoster([]); setDbHistory([]); setSetlist([]);
                  }
                },
                {
                  id: 'full', icon: <Music size={22} />, label: 'Banda Base', desc: 'Batería, bajo, guitarras, voces...',
                  color: 'var(--primary)', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)',
                  onClick: () => {
                    setEditingEventId(null); setEventName(''); setEventDate(pendingEventDate); setDescription(''); setFormat('full');
                    const template = generateTemplate('full');
                    setRoster(template); setInitialRoster(JSON.parse(JSON.stringify(template))); setDbHistory([]); setSetlist([]);
                  }
                },
                {
                  id: 'general', icon: <Users size={22} />, label: 'Reunión General', desc: 'Equipo reducido y staff',
                  color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)',
                  onClick: () => {
                    setEditingEventId(null); setEventName(''); setEventDate(pendingEventDate); setDescription(''); setFormat('general');
                    const template = generateTemplate('general');
                    setRoster(template); setInitialRoster(JSON.parse(JSON.stringify(template))); setDbHistory([]); setSetlist([]);
                  }
                }
              ];
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.9rem', marginBottom: '2rem' }}>
                  {startOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { opt.onClick(); setShowNewEventPicker(false); setModalTab('info'); setShowModal(true); }}
                      style={{
                        padding: '1.4rem 1rem', borderRadius: '16px', background: opt.bg, border: `1px solid ${opt.border}`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ color: opt.color }}>{opt.icon}</div>
                      <div style={{ color: 'white', fontWeight: '800', fontSize: '0.9rem', textAlign: 'center' }}>{opt.label}</div>
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', textAlign: 'center', lineHeight: 1.3 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              );
            })()}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 1rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: '800', letterSpacing: '1.5px' }}>O DUPLICAR UN EVENTO PASADO</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <div style={{ maxHeight: '220px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '14px', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }} className="custom-scrollbar">
              {pastEvents.length === 0 ? (
                <div style={{ padding: '1.5rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>No hay eventos pasados todavía</div>
              ) : (
                pastEvents.map(ev => (
                  <button key={ev.id} onClick={() => {
                    setShowNewEventPicker(false);
                    setEditingEventId(null);
                    setEventName(ev.name + ' (Copia)');
                    setEventDate(pendingEventDate);
                    setDescription(ev.description || '');
                    setFormat('copy');
                    const activeRosterFromDb = (ev.event_roster || []).filter(r => !r.is_removed);
                    const merged = activeRosterFromDb.map(er => ({ id: Math.random().toString(), instrument: er.instrument, profile_id: er.profile_id, category: 'extra', status: 'pending' }));
                    setRoster(merged);
                    setInitialRoster(JSON.parse(JSON.stringify(merged)));
                    setDbHistory([]);
                    setSetlist(ev.event_songs ? [...ev.event_songs].sort((a,b)=>a.order_index - b.order_index).map(es => ({ song_id: es.song_id, lead_id: es.lead_id || '', selected_key: es.selected_key || '' })) : []);
                    setModalTab('info');
                    setShowModal(true);
                  }}
                    className="dropdown-item-custom"
                    style={{ width: '100%', padding: '0.8rem 1rem', background: 'transparent', border: 'none', borderRadius: '10px', color: 'white', textAlign: 'left', marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}
                  >
                    <span style={{ fontWeight: '700', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0, background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '20px' }}>{formatEventDate(ev.date)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      {showModal && createPortal((
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: 'rgba(0,0,0,0.85)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: '95%', maxWidth: '1050px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', background: '#1a2133', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{editingEventId ? 'Editar' : 'Nuevo'} Evento</h3>
            <div className="modal-tabs" style={{ marginBottom: '1.5rem' }}>
                {['info', 'equipo', 'setlist'].map(t => <button key={t} className={`modal-tab-btn ${modalTab === t ? 'active' : ''}`} onClick={() => setModalTab(t)}>{t.toUpperCase()}</button>)}
            </div>
            {modalTab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input className="input-field" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Nombre del Evento" style={{ width: '100%' }} />
                <div style={{ padding: '0.8rem', background: 'rgba(59,130,246,0.1)', borderRadius: '10px', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '700' }}>Fecha: {formatEventDate(eventDate)}</div>
                <input type="date" className="input-field" value={eventDate ? eventDate.split('T')[0] : ''} onChange={e => setEventDate(e.target.value)} style={{ width: '100%', colorScheme: 'dark' }} />
                <textarea className="input-field" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción o Notas..." style={{ width: '100%', minHeight: '100px', resize: 'vertical' }} />

                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'white', marginBottom: '10px' }}>¿Se puede declinar este evento?</div>
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setEventAllowDeclines(false)}
                      style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800', background: !eventAllowDeclines ? '#ef4444' : 'transparent', color: !eventAllowDeclines ? 'white' : 'var(--text-muted)', transition: 'all 0.15s' }}
                    >
                      🚫 No se puede declinar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventAllowDeclines(true)}
                      style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '800', background: eventAllowDeclines ? 'var(--primary)' : 'transparent', color: eventAllowDeclines ? 'white' : 'var(--text-muted)', transition: 'all 0.15s' }}
                    >
                      ✍️ Declinar con razón
                    </button>
                  </div>
                </div>

                {!editingEventId && (
                  <div style={{ padding: '1rem', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700', color: 'white' }}>
                      <input type="checkbox" checked={recurWeekly} onChange={e => setRecurWeekly(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                      🔁 Repetir cada semana
                    </label>
                    {recurWeekly && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', paddingLeft: '28px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Crear las próximas</span>
                        <input
                          type="number"
                          min="2"
                          max="26"
                          className="input-field"
                          value={recurWeeks}
                          onChange={e => setRecurWeeks(Math.min(26, Math.max(2, parseInt(e.target.value, 10) || 2)))}
                          style={{ width: '64px', padding: '4px 8px', fontSize: '0.85rem', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>semanas con el mismo equipo (el setlist lo armas cada semana)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {modalTab === 'equipo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

                {/* Aviso de bloqueados: quién NO puede venir esta fecha, visible de una vez
                    sin tener que abrir cada selector para descubrirlo. */}
                {(() => {
                  const dateKey = eventDate ? eventDate.split('T')[0] : '';
                  const blockedMembers = dateKey ? (members || []).filter(m => m.blocked_dates?.includes(dateKey)) : [];
                  if (!dateKey || blockedMembers.length === 0) return null;
                  return (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '14px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <UserX size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ef4444', marginBottom: '4px' }}>
                          {blockedMembers.length} {blockedMembers.length === 1 ? 'persona no está disponible' : 'personas no están disponibles'} el {formatEventDate(eventDate)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {blockedMembers.map(m => m.full_name).join(', ')}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 1. BANCO DE ROLES (Tienda) - AHORA ARRIBA */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={18} color="var(--primary)" /> Añadir al Equipo
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                    {roleBank.map(cat => (
                      <div key={cat.category}>
                        <h4 style={{ fontSize: '0.8rem', color: cat.color, marginBottom: '1rem', borderBottom: `1px solid ${cat.color}33`, paddingBottom: '0.5rem', letterSpacing: '1px' }}>
                          {cat.category}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {cat.roles.map(roleObj => {
                            const role = roleObj.label;
                            const count = roster.filter(r => r.instrument === role || r.instrument.startsWith(role + ' ')).length;
                            return (
                              <div key={roleObj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {roleObj.icon && <span>{roleObj.icon}</span>} {role}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '20px' }}>
                                  <button
                                    onClick={() => {
                                      const lastIndex = roster.map(r => r.instrument).lastIndexOf(role);
                                      if (lastIndex >= 0) {
                                        setRoster(roster.filter((_, i) => i !== lastIndex));
                                      } else {
                                        const numberedIndex = roster.map(r => r.instrument).findLastIndex(i => i.startsWith(role + ' '));
                                        if (numberedIndex >= 0) {
                                          setRoster(roster.filter((_, i) => i !== numberedIndex));
                                        }
                                      }
                                    }}
                                    disabled={count === 0}
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: count > 0 ? cat.bg : 'transparent', color: count > 0 ? cat.color : 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: count > 0 ? 'pointer' : 'default', transition: 'all 0.2s' }}
                                  >
                                    -
                                  </button>
                                  <span style={{ fontSize: '0.9rem', fontWeight: '800', width: '16px', textAlign: 'center', color: count > 0 ? 'white' : 'var(--text-muted)' }}>{count}</span>
                                  <button
                                    onClick={() => {
                                      const suffix = count > 0 ? ` ${count + 1}` : '';
                                      setRoster([...roster, { id: Math.random().toString(), instrument: `${role}${suffix}`, profile_id: '', category: 'custom' }]);
                                    }}
                                    style={{ width: '24px', height: '24px', borderRadius: '50%', background: cat.bg, color: cat.color, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <button 
                      onClick={() => setRoster([...roster, { id: Math.random().toString(), instrument: 'Nuevo Rol', profile_id: '', category: 'custom' }])}
                      style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '20px', padding: '8px 20px', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Plus size={14} /> Añadir Rol Personalizado
                    </button>
                  </div>
                </div>

                {/* 2. EQUIPO SELECCIONADO (Roster Actual) - AHORA ABAJO */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} color="var(--primary)" /> Equipo Seleccionado
                    </h3>
                    <button 
                      onClick={() => setRoster(roster.filter(r => r.profile_id))}
                      className="btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <X size={14} /> Limpiar Vacíos
                    </button>
                  </div>
                  
                  {roster.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      Aún no has añadido roles. Añádelos desde el menú de arriba.
                    </div>
                  )}

                  {(() => {
                    const groupedRoster = { 'MÚSICOS': [], 'PRODUCCIÓN / MEDIA': [], 'LOGÍSTICA / STAFF': [], 'OTROS': [] };
                    roster.forEach(r => {
                      const g = getRoleGroup(r.instrument);
                      if (!groupedRoster[g]) groupedRoster[g] = [];
                      groupedRoster[g].push(r);
                    });

                    return (
                      <div>
                        {Object.entries(groupedRoster).map(([groupName, items]) => items.length > 0 && (
                          <div key={groupName} style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', letterSpacing: '1px' }}>{groupName}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                              {items.map(r => (
                                <div key={r.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1.2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                                  <div style={{ fontSize: '1.5rem', background: 'rgba(255,255,255,0.03)', width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{getInstrumentIcon(r.instrument)}</div>
                                  <div style={{ flex: 1, minWidth: 0, paddingRight: '20px' }}>
                                    <input 
                                      className="input-field"
                                      placeholder="Nombre del rol..."
                                      style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', padding: '4px 8px', height: 'auto', background: 'transparent', border: 'none', marginBottom: '5px', width: '100%', color: 'var(--text-primary)' }}
                                      value={r.instrument}
                                      onChange={e => setRoster(roster.map(x => x.id === r.id ? { ...x, instrument: e.target.value } : x))}
                                    />
                                    <MemberSelector value={r.profile_id} members={members} roleName={r.instrument} eventDate={eventDate} allRoles={allRoles} onChange={v => setRoster(roster.map(x => x.id === r.id ? { ...x, profile_id: v } : x))} />
                                  </div>
                                  <button 
                                    onClick={() => setRoster(roster.filter(x => x.id !== r.id))}
                                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.5)', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.5)'}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

              </div>
            )}
            {modalTab === 'setlist' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {setlist.map((item, idx) => (
                  <div key={idx}
                    draggable
                    onDragStart={() => setDraggedSongIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedSongIdx !== null && draggedSongIdx !== idx) {
                        setSetlist(prev => {
                          const next = [...prev];
                          const [moved] = next.splice(draggedSongIdx, 1);
                          next.splice(idx, 0, moved);
                          return next;
                        });
                      }
                      setDraggedSongIdx(null);
                    }}
                    onDragEnd={() => setDraggedSongIdx(null)}
                    style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', minWidth: 0, opacity: draggedSongIdx === idx ? 0.4 : 1, cursor: 'grab' }}>
                    <GripVertical size={16} className="hide-mobile" style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    {/* Flechas: alternativa táctil al drag-and-drop (iPad/celular no disparan dragstart nativo) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                      <button type="button" disabled={idx === 0} onClick={() => {
                        if (idx === 0) return;
                        const n = [...setlist];
                        [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]];
                        setSetlist(n);
                      }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', color: idx === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)', cursor: idx === 0 ? 'default' : 'pointer', padding: '2px', display: 'flex' }}>
                        <ChevronUp size={12} />
                      </button>
                      <button type="button" disabled={idx === setlist.length - 1} onClick={() => {
                        if (idx === setlist.length - 1) return;
                        const n = [...setlist];
                        [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]];
                        setSetlist(n);
                      }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', color: idx === setlist.length - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)', cursor: idx === setlist.length - 1 ? 'default' : 'pointer', padding: '2px', display: 'flex' }}>
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <select
                      className="input-field" 
                      value={item.song_id} 
                      onChange={e => { const n = [...setlist]; n[idx].song_id = e.target.value; setSetlist(n); }} 
                      style={{ flex: 2, background: 'none' }}
                    >
                      <option value="">Seleccionar Canción</option>
                      {songs.map(s => {
                        const lp = getLastPlayed(s.id);
                        const label = lp ? `${s.title} (${lp})` : s.title;
                                                return <option key={s.id} value={s.id}>{label}</option>;
                      })}
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
                              {song.key_male && <option value={song.key_male}>{song.key_male} (👨)</option>}
                              {song.key_female && <option value={song.key_female}>{song.key_female} (👩)</option>}
                            </>
                          );
                        })()}
                      </select>
                    </div>

                    <div style={{ flex: 1.5, minWidth: 0 }}>
                      <MemberSelector alignRight={true} value={item.lead_id} members={members} roleName="Voz" placeholder="Dirige" eventDate={eventDate} allRoles={allRoles} onChange={v => { const n = [...setlist]; n[idx].lead_id = v; setSetlist(n); }} />
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
      ), document.body)}

      {showNotifyModal && notifyData && createPortal((
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10000000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '450px', border: '1px solid var(--primary)' }}>
             <Users size={40} color="var(--primary)" style={{ marginBottom: '1rem' }} />
             <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>¿Notificar al equipo?</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Los cambios se guardaron y se notificó automáticamente a los {notifyData.candidates?.length || 0} integrantes nuevos.
              </p>
              
              {notifyMessage && (
                <div style={{
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  borderRadius: '10px',
                  background: notifyMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${notifyMessage.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: notifyMessage.type === 'success' ? '#4ade80' : '#f87171',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  {notifyMessage.text}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button 
                  onClick={() => handleSendNotifications(notifyData.allRoster, 'all')} 
                  className="btn-primary" 
                  disabled={dispatching}
                  style={{ 
                    padding: '1.2rem', 
                    background: dispatching ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.1)', 
                    border: '1px solid var(--primary)', 
                    color: dispatching ? 'rgba(255,255,255,0.5)' : 'white',
                    cursor: dispatching ? 'wait' : 'pointer'
                  }}
                >
                  {dispatching ? 'Enviando Notificaciones...' : `Re-Notificar a TODO el equipo (${notifyData.allRoster.length})`}
                </button>

                <button onClick={() => { setShowNotifyModal(false); closeModal(); }} className="btn-secondary" style={{ padding: '1.2rem' }}>
                  Finalizar (Ya se envió a los nuevos)
                </button>
              </div>
           </div>
         </div>
      ), document.body)}

      {eventToDelete && createPortal((
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', zIndex: 10000000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '400px', width: '90%', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Trash2 size={32} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>¿Borrar Evento?</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Estás a punto de eliminar permanentemente el evento <strong>{eventToDelete.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setEventToDelete(null)} className="btn-secondary" style={{ flex: 1, padding: '1rem' }}>Cancelar</button>
              <button onClick={handleDeleteEventConfirm} className="btn-primary" style={{ flex: 1, padding: '1rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444' }}>Sí, Eliminar</button>
            </div>
          </div>
        </div>
      ), document.body)}

      {chartSong && <ChartStudio song={chartSong} onClose={() => setChartSong(null)} readOnly={true} />}
      
      {activeYoutubeUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', zIndex: 10000000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '800px', position: 'relative' }}>
            <button onClick={() => setActiveYoutubeUrl(null)} style={{ position: 'absolute', top: '-35px', right: 0, color: 'white', background: 'none', border: 'none' }}><X size={32} /></button>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
              <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} src={`https://www.youtube-nocookie.com/embed/${getYoutubeId(activeYoutubeUrl)}?autoplay=1`} frameBorder="0" allowFullScreen></iframe>
            </div>
          </div>
        </div>
      )}
      {pendingTemplate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 10000000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      {/* Buscador de Reemplazo (cuando un integrante declina) */}
      {replacementPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 10000000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem', border: '1px solid rgba(251,191,36,0.25)', animation: 'modalFadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
              <Sparkles size={20} color="#fbbf24" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'white', margin: 0 }}>Buscar Reemplazo</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
              {(members.find(m => String(m.id) === String(replacementPicker.rosterEntry.profile_id))?.full_name?.split(' ')[0]) || 'Este integrante'} declinó su lugar de <strong style={{ color: 'white' }}>{getBilingualName(replacementPicker.rosterEntry.instrument)}</strong> en <strong style={{ color: 'white' }}>{replacementPicker.event.name}</strong>. Los miembros marcados con ✨ son los sugeridos para este rol; los que están "Ocupado" tienen esa fecha bloqueada.
            </p>
            <MemberSelector
              value={null}
              onChange={handleAssignReplacement}
              members={(members || []).filter(m => String(m.id) !== String(replacementPicker.rosterEntry.profile_id))}
              roleName={replacementPicker.rosterEntry.instrument}
              eventDate={replacementPicker.event.date ? replacementPicker.event.date.split('T')[0] : ''}
              allRoles={allRoles}
              placeholder="Elegir reemplazo"
            />
            <button onClick={() => setReplacementPicker(null)} className="btn-secondary" style={{ width: '100%', padding: '0.9rem', marginTop: '1.5rem' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Declinación con Justificación */}
      {declineModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 10000000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2rem', border: '1px solid rgba(239,68,68,0.25)', animation: 'modalFadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
              <X size={24} color="#ef4444" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white', margin: 0 }}>Justificar Declinación</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
              Estás a punto de declinar tu participación como <strong>{getBilingualName(declineModal.instrument)}</strong>. Por favor, indícale al director el motivo por el cual no puedes asistir. Esta solicitud quedará pendiente de aprobación.
            </p>
            <textarea
              value={declineModal.reason}
              onChange={(e) => setDeclineModal({ ...declineModal, reason: e.target.value })}
              placeholder="Ej: Tengo un compromiso laboral ineludible..."
              style={{ width: '100%', minHeight: '100px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px', padding: '12px', fontSize: '0.9rem', marginBottom: '1.5rem', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeclineModal({ isOpen: false, event: null, roleId: null, instrument: null, reason: '' })} className="btn-secondary" style={{ flex: 1, padding: '0.9rem' }}>
                Cancelar
              </button>
              <button onClick={submitDeclineReason} style={{ flex: 1, padding: '0.9rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer' }}>
                Enviar Justificación
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
