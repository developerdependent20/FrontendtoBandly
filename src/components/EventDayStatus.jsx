import React, { useState, useEffect, useMemo } from 'react';
import { Radio, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Vista compartida (director Y equipo, no solo el editor del evento) de quién
// ya confirmó/está pendiente/declinó HOY, actualizada en vivo vía Supabase
// Realtime — para reducir el caos de último momento del día del evento sin
// que cada quien tenga que preguntar "¿ya confirmaste?" por WhatsApp.
// El padre renderiza esto con key={event.id}, así que React ya remonta una
// instancia fresca cuando cambia el evento — no hace falta un efecto para
// resincronizar el estado inicial (y evita que un refetch del padre le pise
// encima a las actualizaciones que ya llegaron por Realtime).
export default function EventDayStatus({ event, members }) {
  const [roster, setRoster] = useState(() => (event.event_roster || []).filter(r => !r.is_removed));

  useEffect(() => {
    const channel = supabase.channel(`event_day_status_${event.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_roster', filter: `event_id=eq.${event.id}` }, (payload) => {
        setRoster(prev => {
          if (payload.eventType === 'DELETE') return prev.filter(r => r.id !== payload.old.id);
          const row = payload.new;
          if (row.is_removed) return prev.filter(r => r.id !== row.id);
          const exists = prev.some(r => r.id === row.id);
          return exists ? prev.map(r => r.id === row.id ? row : r) : [...prev, row];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.id]);

  const stats = useMemo(() => {
    const confirmed = roster.filter(r => r.status === 'confirmed');
    const declined = roster.filter(r => r.status === 'declined' || r.status === 'rejected');
    const pending = roster.filter(r => r.status !== 'confirmed' && r.status !== 'declined' && r.status !== 'rejected');
    const nameOf = (r) => members?.find(m => m.id === r.profile_id)?.full_name?.split(' ')[0] || 'Alguien';
    return { confirmed, declined, pending, nameOf };
  }, [roster, members]);

  if (roster.length === 0) return null;

  return (
    <section className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem', border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.04)' }}>
      <style>{`
        @keyframes eventDayPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .event-day-pulse { animation: eventDayPulse 2s ease-in-out infinite; }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <Radio size={18} color="#10b981" className="event-day-pulse" />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#fff' }}>Hoy: {event.name}</h3>
        <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#10b981', letterSpacing: '1px', marginLeft: 'auto' }}>EN VIVO</span>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px' }}>
            <CheckCircle2 size={14} /> CONFIRMADOS ({stats.confirmed.length})
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, wordBreak: 'break-word' }}>
            {stats.confirmed.length > 0 ? stats.confirmed.map(stats.nameOf).join(', ') : '—'}
          </div>
        </div>
        <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px' }}>
            <Clock size={14} /> PENDIENTES ({stats.pending.length})
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, wordBreak: 'break-word' }}>
            {stats.pending.length > 0 ? stats.pending.map(stats.nameOf).join(', ') : '—'}
          </div>
        </div>
        {stats.declined.length > 0 && (
          <div style={{ flex: '1 1 200px', minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.75rem', fontWeight: '800', marginBottom: '6px' }}>
              <XCircle size={14} /> DECLINARON ({stats.declined.length})
            </div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, wordBreak: 'break-word' }}>
              {stats.declined.map(stats.nameOf).join(', ')}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
