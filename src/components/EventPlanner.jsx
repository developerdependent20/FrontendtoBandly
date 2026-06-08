import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, CheckCircle2, Plus, Info, Music, Calendar as CalendarIcon, X, 
  Trash2, FileText, Headphones, Settings, Play, BookOpen, Loader2,
  Drum, Zap, Layout, Mic2, Video, User, ChevronDown, ChevronUp, Edit2, Check, Search
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
const DEFAULT_INSTRUMENT_MATCH_MAP = {
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
const DEFAULT_INSTRUMENT_DISPLAY_MAP = {
  'instr:bateria': 'DRUMS / BATERÍA',
  'instr:bajo': 'BASS / BAJO',
  'instr:piano': 'KEYS / TECLADO',
  'instr:guitarra': 'GTR / GUITARRA',
  'instr:voz': 'VOICE / VOZ',
  'instr:sonido': 'AUDIO / SONIDO',
  'instr:sonido_media': 'VISUALS / PANTALLAS'
};

const cleanEncoding = (str) => {
  if (!str) return str;
  return str
    .replace(/BATERÍA/g, 'BATERÍA')
    .replace(/PERCUSIÓN/g, 'PERCUSIÓN')
    .replace(/ELÉCTRICA/g, 'ELÉCTRICA')
    .replace(/ACÚSTICA/g, 'ACÚSTICA')
    .replace(/LOGÍSTICA/g, 'LOGÍSTICA')
    .replace(/DIRECCIÓN/g, 'DIRECCIÓN')
    .replace(/batería/g, 'batería')
    .replace(/Vacíos/g, 'Vacíos');
};

const getBilingualName = (inst, displayMap, matchMap) => {
  const normalized = (inst || '').toLowerCase();
  if (displayMap[normalized]) return cleanEncoding(displayMap[normalized]);
  const tag = Object.keys(matchMap).find(k => normalized.includes(k)) ? matchMap[Object.keys(matchMap).find(k => normalized.includes(k))] : null;
  return cleanEncoding(displayMap[tag] || inst);
};

const getSuggestedMembers = (roleName, members, matchMap) => {
  if (!roleName || !members) return { suggested: [], others: (members || []) };
  const normalizedRole = roleName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tagToFind = Object.keys(matchMap).find(k => normalizedRole.includes(k)) ? matchMap[Object.keys(matchMap).find(k => normalizedRole.includes(k))] : null;
  if (!tagToFind) return { suggested: [], others: (members || []) };
  const suggested = (members || []).filter(m => (m.functions || []).includes(tagToFind));
  const others = (members || []).filter(m => !(m.functions || []).includes(tagToFind));
  return { suggested, others };
};

const DEFAULT_ROLE_BANK = [
  {
    category: 'MÚSICOS',
    color: 'var(--primary)',
    bg: 'rgba(59,130,246,0.1)',
    roles: ['Voz', 'Coros', 'Batería', 'Bajo', 'Teclados', 'Guitarra Eléctrica', 'Guitarra Acústica', 'Percusión']
  },
  {
    category: 'PRODUCCIÓN / MEDIA',
    color: 'var(--accent)',
    bg: 'rgba(37, 99, 235,0.1)',
    roles: ['Sonido', 'Pantallas', 'Cámaras', 'Transmisión', 'Luces', 'Roadie', 'Director Musical']
  },
  {
    category: 'LOGÍSTICA / STAFF',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.1)',
    roles: ['Coordinador', 'Bienvenida', 'Maestro de Niños', 'Oración']
  }
];

// Campo de fecha — calendario custom premium (no usa el picker nativo)
const DatePickerField = ({ value, onChange, formatEventDate }) => {
  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(() => value ? new Date(value + 'T12:00:00') : new Date());
  const wrapperRef = React.useRef(null);

  // Cerrar al hacer click fuera
  React.useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const selected = value ? new Date(value + 'T12:00:00') : null;

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const dayNames = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

  // Primer día del mes y total de días
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectDay = (day) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange({ target: { value: `${year}-${mm}-${dd}` } });
    setOpen(false);
  };

  const isToday = (day) => today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  const isSelected = (day) => selected && selected.getDate() === day && selected.getMonth() === month && selected.getFullYear() === year;

  // Build grid: empty slots + days
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger button */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          background: open ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px',
          height: '50px', color: value ? 'white' : 'rgba(255,255,255,0.4)',
          transition: 'all 0.2s', cursor: 'pointer',
        }}
      >
        <CalendarIcon size={18} style={{ color: value ? 'var(--primary)' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.9rem', fontWeight: '600', textTransform: 'capitalize', flex: 1 }}>
          {value ? formatEventDate(value) : 'Seleccionar Fecha...'}
        </span>
        <ChevronDown size={14} style={{ opacity: 0.5, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {/* Custom Calendar Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 2000,
          background: 'linear-gradient(135deg, #0f172a, #1a2133)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px',
          padding: '20px', minWidth: '300px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
          animation: 'dropdownFadeIn 0.2s ease-out',
        }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', padding: '6px 10px', fontSize: '1rem', lineHeight: 1 }}>‹</button>
            <span style={{ fontWeight: '700', fontSize: '1rem', color: 'white', textTransform: 'capitalize' }}>{monthNames[month]} {year}</span>
            <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', padding: '6px 10px', fontSize: '1rem', lineHeight: 1 }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {dayNames.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {cells.map((day, idx) => (
              <div key={idx}>
                {day ? (
                  <button
                    onClick={() => selectDay(day)}
                    style={{
                      width: '100%', aspectRatio: '1', border: 'none', borderRadius: '10px',
                      cursor: 'pointer', fontSize: '0.85rem', fontWeight: isSelected(day) ? '800' : '500',
                      background: isSelected(day)
                        ? 'linear-gradient(135deg, var(--primary), #6366f1)'
                        : isToday(day)
                          ? 'rgba(59,130,246,0.15)'
                          : 'transparent',
                      color: isSelected(day) ? 'white' : isToday(day) ? 'var(--primary)' : 'rgba(255,255,255,0.8)',
                      outline: isToday(day) && !isSelected(day) ? '1px solid rgba(59,130,246,0.4)' : 'none',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isSelected(day)) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                    onMouseLeave={e => { if (!isSelected(day)) e.currentTarget.style.background = isToday(day) ? 'rgba(59,130,246,0.15)' : 'transparent'; }}
                  >{day}</button>
                ) : <div />}
              </div>
            ))}
          </div>
          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <button onClick={() => { onChange({ target: { value: '' } }); setOpen(false); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>Borrar</button>
            <button onClick={() => {
              const t = new Date();
              const mm = String(t.getMonth()+1).padStart(2,'0');
              const dd = String(t.getDate()).padStart(2,'0');
              onChange({ target: { value: `${t.getFullYear()}-${mm}-${dd}` } });
              setOpen(false);
            }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>Hoy</button>
          </div>
        </div>
      )}
    </div>
  );
};

// [ESTABLE] COMPONENTE EXTRAÍDO (Con arreglos de truncado y visibilidad)
const MemberSelector = ({ value, onChange, members, roleName, placeholder, eventDate, instrumentMatchMap }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedMember = members?.find(m => m.id === value);
  const { suggested, others } = getSuggestedMembers(roleName, members, instrumentMatchMap);

  const isBlocked = (member) => {
    if (!eventDate || !member.availability) return false;
    const dateStr = eventDate.split('T')[0];
    return member.availability.includes(dateStr);
  };

  const handleSelect = (member, e) => {
    if (isBlocked(member)) {
      alert(`${member.full_name} no está disponible en esta fecha.`);
      return;
    }
    onChange(member.id, e?.shiftKey);
    setIsOpen(false);
    setShowAll(false);
    setSearchQuery('');
  };

  const allMembers = [...suggested, ...others];
  const filteredList = allMembers.filter(m => m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));

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
            minWidth: '250px', 
            background: '#1a2133', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '16px', 
            zIndex: 101, 
            maxHeight: '300px', 
            overflowY: 'auto', 
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)', 
            padding: '12px', 
            animation: 'dropdownFadeIn 0.2s ease-out' 
          }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'rgba(255,255,255,0.3)' }} />
              <input 
                autoFocus
                placeholder="Buscar miembro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 8px 8px 30px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.8rem' }}
              />
            </div>
            {(!showAll && !searchQuery) ? (
              <>
                {suggested.length > 0 && (
                  <div style={{ marginBottom: '0.8rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>Recomendados ({roleName})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {suggested.map(m => {
                        const blocked = isBlocked(m);
                        return (
                        <div 
                          key={m.id} 
                          onClick={(e) => handleSelect(m, e)} 
                          style={{ 
                            padding: '10px 14px', 
                            borderRadius: '12px', 
                            cursor: blocked ? 'not-allowed' : 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            background: selectedMember?.id === m.id ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${selectedMember?.id === m.id ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                            transition: 'all 0.2s',
                            opacity: blocked ? 0.4 : 1
                          }}
                          onMouseEnter={e => { if(!blocked) { e.currentTarget.style.background = selectedMember?.id === m.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1.02)'; } }}
                          onMouseLeave={e => { if(!blocked) { e.currentTarget.style.background = selectedMember?.id === m.id ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.02)'; e.currentTarget.style.transform = 'scale(1)'; } }}
                        >
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800' }}>{m.full_name[0]}</div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{m.full_name}</span>
                        </div>
                      )})}
                    </div>
                  </div>
                )}
                {others.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px', marginTop: '12px' }}>Otros Miembros</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {others.map(m => {
                        const blocked = isBlocked(m);
                        return (
                        <div 
                          key={m.id} 
                          onClick={(e) => handleSelect(m, e)} 
                          style={{ 
                            padding: '10px 14px', 
                            borderRadius: '12px', 
                            cursor: blocked ? 'not-allowed' : 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            background: selectedMember?.id === m.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                            border: `1px solid ${selectedMember?.id === m.id ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                            transition: 'all 0.2s',
                            opacity: blocked ? 0.4 : 1
                          }}
                          onMouseEnter={e => { if(!blocked) { e.currentTarget.style.background = selectedMember?.id === m.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1.02)'; } }}
                          onMouseLeave={e => { if(!blocked) { e.currentTarget.style.background = selectedMember?.id === m.id ? 'rgba(59,130,246,0.15)' : 'transparent'; e.currentTarget.style.transform = 'scale(1)'; } }}
                        >
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800' }}>{m.full_name[0]}</div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{m.full_name}</span>
                        </div>
                      )})}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {filteredList.length === 0 ? (
                  <div style={{ padding: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>No se encontraron resultados</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {filteredList.map(m => {
                      const blocked = isBlocked(m);
                      return (
                      <div 
                        key={m.id} 
                        onClick={(e) => handleSelect(m, e)} 
                        style={{ 
                          padding: '10px 14px', 
                          borderRadius: '12px', 
                          cursor: blocked ? 'not-allowed' : 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          background: selectedMember?.id === m.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                          border: `1px solid ${selectedMember?.id === m.id ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                          transition: 'all 0.2s',
                          opacity: blocked ? 0.4 : 1
                        }}
                        onMouseEnter={e => { if(!blocked) { e.currentTarget.style.background = selectedMember?.id === m.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1.02)'; } }}
                        onMouseLeave={e => { if(!blocked) { e.currentTarget.style.background = selectedMember?.id === m.id ? 'rgba(59,130,246,0.15)' : 'transparent'; e.currentTarget.style.transform = 'scale(1)'; } }}
                      >
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800' }}>{m.full_name[0]}</div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{m.full_name}</span>
                        {selectedMember?.id === m.id && <Check size={14} style={{ marginLeft: 'auto' }} />}
                      </div>
                    )})}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const SongPicker = ({ value, onChange, songs, events, editingEventId }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selectedSong = songs.find(s => String(s.id) === String(value));

  // Build history map
  const songHistory = React.useMemo(() => {
    const map = {};
    (events || []).forEach(ev => {
      if (!ev.date) return;
      (ev.event_songs || []).forEach(es => {
        if (!map[es.song_id]) map[es.song_id] = [];
        map[es.song_id].push({ date: ev.date, name: ev.name, eventId: ev.id });
      });
    });
    Object.keys(map).forEach(k => map[k].sort((a, b) => new Date(b.date) - new Date(a.date)));
    return map;
  }, [events]);

  const relDate = (dateStr) => {
    const d = new Date(dateStr.split('T')[0] + 'T00:00:00');
    const diff = Math.round((new Date().setHours(0,0,0,0) - d) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff < 7) return `${diff}d`;
    if (diff < 30) return `${Math.round(diff/7)}sem`;
    if (diff < 365) return `${Math.round(diff/30)}m`;
    return `${Math.round(diff/365)}a`;
  };

  const filtered = [...songs]
    .sort((a, b) => a.title.localeCompare(b.title))
    .filter(s => s.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ flex: 1, position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', padding: '0', cursor: 'pointer', gap: '8px',
        }}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: selectedSong ? 'white' : 'rgba(255,255,255,0.3)', textAlign: 'left', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedSong ? selectedSong.title : '— Seleccionar Canción —'}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', flexShrink: 0 }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
          <div style={{
            position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 201,
            background: '#101827', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            maxHeight: '380px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            minWidth: '320px',
          }}>
            {/* Search */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar canción..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '7px 12px', color: 'white', fontSize: '0.82rem', outline: 'none' }}
              />
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Sin resultados</div>
              )}
              {filtered.map(s => {
                const hist = (songHistory[s.id] || []).filter(h => h.eventId !== editingEventId);
                const last = hist[0];
                const isSelected = String(s.id) === String(value);
                return (
                  <div
                    key={s.id}
                    onClick={() => { onChange(s.id); setOpen(false); setQuery(''); }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isSelected ? 'rgba(37,99,235,0.15)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Song title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isSelected ? 'var(--primary)' : 'white', flex: 1 }}>{s.title}</span>
                      {s.key && <span style={{ fontSize: '0.65rem', fontWeight: '800', background: 'rgba(37,99,235,0.2)', color: '#60a5fa', padding: '2px 7px', borderRadius: '6px', flexShrink: 0 }}>{s.key}</span>}
                      {s.bpm && <span style={{ fontSize: '0.65rem', fontWeight: '800', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '2px 7px', borderRadius: '6px', flexShrink: 0 }}>{s.bpm} BPM</span>}
                    </div>
                    {/* History pills */}
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {hist.length === 0 ? (
                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Primera vez 🎉</span>
                      ) : (
                        hist.slice(0, 4).map((h, hi) => (
                          <span key={hi} style={{
                            fontSize: '0.62rem', fontWeight: '700',
                            background: hi === 0 ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.05)',
                            color: hi === 0 ? '#60a5fa' : 'rgba(255,255,255,0.35)',
                            padding: '2px 7px', borderRadius: '10px', border: hi === 0 ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.06)',
                          }}>📅 {relDate(h.date)} · {h.name.length > 18 ? h.name.slice(0,18)+'…' : h.name}</span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const RoleInput = ({ value, onChange }) => {

  const [localValue, setLocalValue] = React.useState(value);
  
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <input 
      className="input-field"
      placeholder="Nombre del rol..."
      style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', padding: '4px 8px', height: 'auto', background: 'transparent', border: 'none', marginBottom: '5px', width: '100%', color: 'var(--text-primary)' }}
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={() => { if (localValue !== value) onChange(localValue); }}
      onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } }}
    />
  );
};

export default function EventPlanner({ readOnly, events, members, orgId, refreshData, songs, profile, session }) {
  const orgSettings = profile?.organizations?.settings || {};

  const instrumentDisplayMap = React.useMemo(() => {
    if (!orgSettings.instruments) return DEFAULT_INSTRUMENT_DISPLAY_MAP;
    const customMap = { ...DEFAULT_INSTRUMENT_DISPLAY_MAP };
    orgSettings.instruments.forEach(inst => {
      customMap[`instr:${inst.id}`] = (inst.label || '').toUpperCase();
    });
    return customMap;
  }, [orgSettings]);

  const instrumentMatchMap = React.useMemo(() => {
    if (!orgSettings.instruments) return DEFAULT_INSTRUMENT_MATCH_MAP;
    const customMap = { ...DEFAULT_INSTRUMENT_MATCH_MAP };
    orgSettings.instruments.forEach(inst => {
      customMap[inst.label.toLowerCase()] = `instr:${inst.id}`;
      customMap[inst.id.toLowerCase()] = `instr:${inst.id}`;
    });
    return customMap;
  }, [orgSettings]);

  const roleBank = React.useMemo(() => {
    if (!orgSettings.roles && !orgSettings.instruments) return DEFAULT_ROLE_BANK;
    const musicians = (orgSettings.instruments || []).map(i => i.label);
    const admins = (orgSettings.roles || []).map(r => r.label);
    return [
      { category: 'MÚSICOS / INSTRUMENTOS', color: 'var(--primary)', bg: 'rgba(59,130,246,0.1)', roles: musicians.length ? musicians : DEFAULT_ROLE_BANK[0].roles },
      { category: 'ADMINISTRADORES / ROLES', color: 'var(--accent)', bg: 'rgba(37, 99, 235,0.1)', roles: admins.length ? admins : DEFAULT_ROLE_BANK[1].roles }
    ];
  }, [orgSettings]);

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
  const [descModalEv, setDescModalEv] = useState(null);
  const [showNewEventPicker, setShowNewEventPicker] = useState(false);
  const [pendingNewDate, setPendingNewDate] = useState('');

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
    if (i.includes('gtr') || i.includes('guitar') || i.includes('el├®ctrica') || i.includes('acústica')) return <Music size={20} />;
    if (i.includes('keys') || i.includes('piano') || i.includes('teclado')) return <Layout size={20} />;
    if (i.includes('voice') || i.includes('voz') || i.includes('coro')) return <Mic2 size={20} />;
    if (i.includes('audio') || i.includes('sonido')) return <Headphones size={20} />;
    if (i.includes('video') || i.includes('pantalla') || i.includes('visual') || i.includes('media') || i.includes('streaming')) return <Video size={20} />;
    if (i.includes('leader') || i.includes('direc') || i.includes('md') || i.includes('musical')) return <Shield size={20} />;
    if (i.includes('logistica') || i.includes('staff') || i.includes('roadie')) return <Users size={20} />;
    return <User size={20} />;
  };

  const getRoleGroup = (inst) => {
    const i = (inst || '').toLowerCase();
    if (i.includes('coordinador') || i.includes('bienvenida') || i.includes('maestro') || i.includes('niño') || i.includes('seguridad') || i.includes('oraci') || i.includes('ujier') || i.includes('staff')) return 'LOGÍSTICA / STAFF';
    if (i.includes('sonido') || i.includes('audio') || i.includes('pantalla') || i.includes('camara') || i.includes('cámara') || i.includes('transmis') || i.includes('luce') || i.includes('roadie') || i.includes('director') || i.includes('video') || i.includes('visual') || i.includes('media')) return 'PRODUCCIÓN / MEDIA';
    if (i.includes('bateria') || i.includes('bajo') || i.includes('guitar') || i.includes('teclado') || i.includes('piano') || i.includes('voz') || i.includes('coro') || i.includes('percusion') || i.includes('drums') || i.includes('bass') || i.includes('keys') || i.includes('voice')) return 'MÚSICOS';
    return 'OTROS';
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
    setPendingNewDate(selectedDate || '');
    setShowNewEventPicker(true);
  };

  const openNewEventWithTemplate = (type, duplicateFrom) => {
    setShowNewEventPicker(false);
    setEditingEventId(null);
    setEventName('');
    setEventDate(pendingNewDate || '');
    setDescription('');
    
    if (type === 'blank') {
      setFormat('full');
      setRoster([]);
      setSetlist([]);
      setInitialRoster([]);
    } else if (type === 'duplicate' && duplicateFrom) {
      setFormat('full');
      setEventName(duplicateFrom.name + ' (Copia)');
      setRoster(duplicateFrom.event_roster.map(r => ({ ...r, id: `temp-${Date.now()}-${Math.random()}`, status: 'pending' })));
      setSetlist(duplicateFrom.event_songs || []);
      setInitialRoster([]);
    } else {
      setFormat(type);
      const template = generateTemplate(type);
      setRoster(template);
      setSetlist([]);
      setInitialRoster(JSON.parse(JSON.stringify(template)));
    }
    setDbHistory([]);
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
          profile_id: r.profile_id || r.id, // Ensure profile_id is sent
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
    if (!confirm('┬┐Seguro que quieres eliminar a este usuario del evento?')) return;
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

  // Un evento es "pasado" solo cuando su fecha es ANTERIOR a hoy (el día completo del evento siempre se muestra en proximos)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const upcomingEvents = eventsToShow.filter(ev => {
    if (!ev.date) return true; // Sin fecha ├óÔÇáÔÇÖ siempre próximo
    const evDate = new Date(ev.date.split('T')[0] + 'T00:00:00'); // Normalizar a medianoche local
    return evDate >= todayStart;
  });

  const pastEvents = eventsToShow.filter(ev => {
    if (!ev.date) return false;
    const evDate = new Date(ev.date.split('T')[0] + 'T00:00:00');
    return evDate < todayStart; // Solo pasa a "pasados" cuando el día del evento ya terminó
  });

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
    if (list.length === 0) return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <CalendarIcon size={28} style={{ opacity: 0.15, display: 'block', margin: '0 auto 0.75rem' }} />
        No hay eventos proximos
      </div>
    );

    return list.map(ev => {
      const isExpanded = !!expandedCardIds[ev.id];
      const theme = getEventTheme(ev.name);
      const userSlots = ev.event_roster?.filter(r => String(r.profile_id) === String(currentUserId)) || [];
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
          WebkitBackdropFilter: 'blur(12px)',
          transform: 'translateZ(0)',
          transition: 'box-shadow 0.2s ease',
        }}>
          {/* Accent line left */}
          {!isPast && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: theme.main, borderRadius: '3px 0 0 3px' }} />}

          <div style={{ padding: '1.25rem 1.25rem 1.25rem 1.6rem' }}>

            {/* ── TOP ROW ────────────────────────────────────────────────── */}
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

                {/* Description ÔÇö button + expandable panel */}
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
                  <button onClick={() => { if(window.confirm('Borrar este evento?')) supabase.from('events').delete().eq('id', ev.id).then(()=>refreshData()); }}
                    title="Eliminar"
                    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.12)', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color='#ef4444'; e.currentTarget.style.background='rgba(239,68,68,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color='rgba(239,68,68,0.5)'; e.currentTarget.style.background='rgba(239,68,68,0.07)'; }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* ÔöÇÔöÇ ASSIGNMENT ROW ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
            {userSlots.length > 0 && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {/* Slot pills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                  {userSlots.map((slot, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.08)` }}>
                      <span style={{ fontSize: '0.9rem' }}>{getInstrumentIcon(slot.instrument)}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'white' }}>{getBilingualName(slot.instrument, instrumentDisplayMap, instrumentMatchMap)}</span>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusDot(slot.status), flexShrink: 0 }} title={statusLabel(slot.status)} />
                    </div>
                  ))}
                </div>

                {/* Confirm/Decline */}
                {!isPast && (
                  <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                    {userSlots.some(s => s.status !== 'confirmed') && (
                      <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'confirmed')}
                        style={{ padding: '5px 12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={11} /> Confirmar
                      </button>
                    )}
                    {userSlots.some(s => s.status !== 'declined' && s.status !== 'rejected') && (
                      <button onClick={() => updateRosterStatus(ev.id, currentUserId, 'declined')}
                        style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#ef4444', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <X size={11} /> Declinar
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ÔöÇÔöÇ EXPAND BUTTON ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
            <button onClick={() => setExpandedCardIds(prev => ({ ...prev, [ev.id]: !prev[ev.id] }))}
              style={{ width: '100%', marginTop: '0.9rem', padding: '0.5rem', background: 'transparent', border: `1px solid ${isExpanded ? theme.light : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', color: isExpanded ? theme.main : 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.5px' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = theme.light; e.currentTarget.style.color = theme.main; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isExpanded ? theme.light : 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = isExpanded ? theme.main : 'rgba(255,255,255,0.3)'; }}>
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {isExpanded ? 'Ocultar' : 'Ver equipo y canciones'}
            </button>

            {/* ÔöÇÔöÇ EXPANDED SECTION ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ */}
            {isExpanded && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                {/* Team */}
                {(() => {
                  const groups = { 'BANDA': [], 'VOCES': [], 'PRODUCCION / STAFF': [] };
                  (ev.event_roster || []).forEach(s => {
                    const g = getRoleGroup(s.instrument);
                    if (!groups[g]) groups[g] = [];
                    groups[g].push(s);
                  });
                  return Object.entries(groups).filter(([_, items]) => items.length > 0).map(([groupName, items]) => {
                    // Sort by Spanish ordinal if instrument name contains one
                    const ordinalRank = (name = '') => {
                      const n = name.toLowerCase();
                      if (n.includes('primer') || n.includes('primero') || n.includes('first')) return 1;
                      if (n.includes('segundo') || n.includes('second')) return 2;
                      if (n.includes('tercer') || n.includes('tercero') || n.includes('third')) return 3;
                      if (n.includes('cuarto') || n.includes('fourth')) return 4;
                      if (n.includes('quinto') || n.includes('fifth')) return 5;
                      if (n.includes('sexto') || n.includes('sixth')) return 6;
                      if (n.includes('septimo') || n.includes('seventh')) return 7;
                      return 99;
                    };
                    const sorted = [...items].sort((a, b) => ordinalRank(a.instrument) - ordinalRank(b.instrument));
                    return (
                      <div key={groupName} style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontWeight: '900', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{groupName}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {sorted.map((s, i) => {
                            const dot = statusDot(s.status);
                            const memberName = members.find(m => m.id === s.profile_id)?.full_name?.split(' ')[0] || '--';
                            const roleName = getBilingualName(s.instrument, instrumentDisplayMap, instrumentMatchMap);
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', position: 'relative' }}>
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
                                <button onClick={() => { const p = (profile?.organizations?.plan||'free').toLowerCase(); p !== 'free' ? setSeqPlayerSong(song) : alert('Requiere plan PRO'); }}
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
             <VisualCalendar events={events} onEventClick={handleEditEvent} onDayClick={handleNewEvent} />
           </div>
        </div>
      </section>

      {showNewEventPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', zIndex: 999999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8vh' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2rem', background: '#1a2133', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Crear Nuevo Evento</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button onClick={() => openNewEventWithTemplate('blank')} className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
                📄 Evento en Blanco
              </button>
              <button onClick={() => openNewEventWithTemplate('full')} className="btn-primary" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', border: '1px solid rgba(59,130,246,0.3)' }}>
                🎸 Plantilla Base (Banda Completa)
              </button>
              <button onClick={() => openNewEventWithTemplate('acoustic')} className="btn-primary" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                🪕 Plantilla Acústica
              </button>
              {pastEvents.length > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Duplicar evento pasado:</p>
                  <select 
                    className="input-field" 
                    onChange={(e) => {
                      if(e.target.value) {
                        const ev = pastEvents.find(p => p.id === e.target.value);
                        if(ev) openNewEventWithTemplate('duplicate', ev);
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    <option value="">Selecciona un evento...</option>
                    {pastEvents.slice(0,5).map(p => (
                      <option key={p.id} value={p.id}>{formatEventDate(p.date)} - {p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button onClick={() => setShowNewEventPicker(false)} style={{ marginTop: '1.5rem', width: '100%', padding: '0.8rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                
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
                          {cat.roles.map(role => {
                            const count = roster.filter(r => r.instrument === role || r.instrument.startsWith(role + ' ')).length;
                            return (
                              <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{role}</span>
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
                                    <MemberSelector instrumentMatchMap={instrumentMatchMap} eventDate={eventDate} value={r.profile_id} members={members} roleName={r.instrument} onChange={v => setRoster(roster.map(x => x.id === r.id ? { ...x, profile_id: v } : x))} />
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
                  <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', minWidth: 0, overflow: 'hidden' }}>
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
                              {song.key_male && <option value={song.key_male}>{song.key_male} (ÔÖé)</option>}
                              {song.key_female && <option value={song.key_female}>{song.key_female} (ÔÖÇ)</option>}
                            </>
                          );
                        })()}
                      </select>
                    </div>

                    <div style={{ flex: 1.5, minWidth: 0, overflow: 'hidden' }}>
                      <MemberSelector instrumentMatchMap={instrumentMatchMap} eventDate={eventDate} value={item.lead_id} members={members} roleName="Voz" placeholder="Líder" onChange={v => { const n = [...setlist]; n[idx].lead_id = v; setSetlist(n); }} />
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
             <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>┬┐Notificar al equipo?</h3>
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
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>┬┐Cambiar a {pendingTemplate.label}?</h3>
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
