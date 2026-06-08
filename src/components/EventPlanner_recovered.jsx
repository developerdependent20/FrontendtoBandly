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
  '
<truncated 45215 bytes>
des('reunión') || n.includes('jóvenes') || n.includes('servidores') || n.includes('ensayo')) return cardThemes[4];
    if (n.includes('especial') || n.includes('altar') || n.includes('conferencia')) return cardThemes[3];
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
          background: isPast ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.95)',
          border: `1px solid ${isPast ? 'rgba(255,255,255,0.06)' : theme.light}`,
          opacity: isPast ? 0.55 : 1,
        }}>
          {!isPast && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: theme.main, borderRadius: '3px 0 0 3px' }} />}

          <div style={{ padding: '1.25rem 1.25rem 1.25rem 1.6rem' }}>

            <di
<truncated 54893 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.