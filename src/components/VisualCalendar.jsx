import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Plus } from 'lucide-react';

export default function VisualCalendar({ events, onEventClick, onDayClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // En pantallas angostas las celdas quedan muy apretadas (7 columnas) y es fácil tocar
  // el día vecino por error. Damos más aire por celda y quitamos elementos secundarios.
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 480);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth <= 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const weekDays = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let i = 1; i <= days; i++) calendarDays.push(i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const getEventColor = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('servicio') || n.includes('dominical') || n.includes('culto'))
      return { bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)', glow: '#3b82f6' };
    if (n.includes('oración') || n.includes('ayuno') || n.includes('búsqueda'))
      return { bg: 'linear-gradient(135deg,#9f1239,#881337)', glow: '#be123c' }; // Rose
    if (n.includes('reunión') || n.includes('jóvenes') || n.includes('servidores') || n.includes('ensayo'))
      return { bg: 'linear-gradient(135deg,#7c3aed,#6d28d9)', glow: '#8b5cf6' };
    if (n.includes('especial') || n.includes('altar') || n.includes('conferencia'))
      return { bg: 'linear-gradient(135deg,#ea580c,#c2410c)', glow: '#f97316' };
    return { bg: 'linear-gradient(135deg,#475569,#334155)', glow: '#94a3b8' };
  };

  const categories = [
    { name: 'Servicios', color: '#3b82f6' },
    { name: 'Oración', color: '#be123c' },
    { name: 'Reuniones', color: '#8b5cf6' },
    { name: 'Especiales', color: '#f97316' },
    { name: 'Otros', color: '#94a3b8' },
  ];

  const exportToICS = () => {
    try {
      const monthEvents = events?.filter(e => e.date && e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) || [];
      if (monthEvents.length === 0) return alert('No hay eventos este mes para exportar.');
      let ics = ['BEGIN:VCALENDAR','VERSION:2.0','PROID:-//Bandly//Calendar//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
      monthEvents.forEach(ev => {
        const d = new Date(ev.date);
        const dateStr = d.toISOString().replace(/-|:|\\.\\d+/g,'').split('T')[0];
        ics.push('BEGIN:VEVENT',`SUMMARY:${ev.name}`,`DTSTART;VALUE=DATE:${dateStr}`,`DTEND;VALUE=DATE:${dateStr}`,`DESCRIPTION:${ev.description||'Evento de Bandly'}`,'STATUS:CONFIRMED','END:VEVENT');
      });
      ics.push('END:VCALENDAR');
      const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.setAttribute('download', `Bandly_${monthNames[month]}_${year}.ics`);
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch(e) { alert('Error: ' + e.message); }
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
      borderRadius: '28px',
      padding: '0',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
      width: '100%',
      overflowX: 'auto'
    }} className="custom-scrollbar">
      <div style={{ minWidth: '700px' }}>

      {/* ── HEADER ── */}
      <div style={{
        padding: '1.5rem 1.75rem',
        background: 'linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(99,102,241,0.08) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>
            Calendario
          </div>
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: 'white', letterSpacing: '-0.5px' }}>
            {monthNames[month]} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '400' }}>{year}</span>
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={goToday}
            style={{ padding: '6px 14px', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '20px', color: 'var(--primary)', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(37,99,235,0.3)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(37,99,235,0.15)'}
          >Hoy</button>
          <button onClick={prevMonth} style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
          ><ChevronLeft size={16}/></button>
          <button onClick={nextMonth} style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
          ><ChevronRight size={16}/></button>
        </div>
      </div>

      {/* ── WEEKDAY HEADERS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '1rem 1rem 0' }}>
        {weekDays.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center',
            fontSize: '0.65rem',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            paddingBottom: '0.75rem',
            color: i === 0 || i === 6 ? 'rgba(249,115,22,0.6)' : 'rgba(255,255,255,0.25)',
          }}>{d}</div>
        ))}
      </div>

      {/* ── GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: isNarrow ? '3px' : '4px', padding: isNarrow ? '0 0.4rem 0.75rem' : '0 1rem 1rem' }}>
        {calendarDays.map((day, idx) => {
          const col = idx % 7;
          const isWeekend = col === 0 || col === 6;
          const dateStr = day ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : null;
          const dayEvents = dateStr ? (events || []).filter(e => e.date && e.date.startsWith(dateStr)) : [];
          const isToday = dateStr === todayStr;
          const hasPast = dateStr && dateStr < todayStr;

          return (
            <div
              key={idx}
              onClick={() => day && onDayClick && onDayClick(dateStr)}
              style={{
                minHeight: isNarrow ? '64px' : '90px',
                borderRadius: isNarrow ? '10px' : '14px',
                border: isToday
                  ? '1.5px solid rgba(37,99,235,0.6)'
                  : '1px solid rgba(255,255,255,0.04)',
                background: isToday
                  ? 'linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(99,102,241,0.08) 100%)'
                  : day
                    ? isWeekend
                      ? 'rgba(249,115,22,0.03)'
                      : 'rgba(255,255,255,0.025)'
                    : 'transparent',
                boxShadow: isToday ? '0 0 20px rgba(37,99,235,0.15) inset' : 'none',
                cursor: day ? 'pointer' : 'default',
                transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', padding: isNarrow ? '4px 2px' : '8px', position: 'relative',
                opacity: hasPast && dayEvents.length === 0 ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (day) e.currentTarget.style.background = isToday ? 'linear-gradient(135deg,rgba(37,99,235,0.25),rgba(99,102,241,0.15))' : 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (day) e.currentTarget.style.background = isToday ? 'linear-gradient(135deg,rgba(37,99,235,0.18),rgba(99,102,241,0.08))' : isWeekend ? 'rgba(249,115,22,0.03)' : 'rgba(255,255,255,0.025)'; }}
            >
              {day && (
                <>
                  {/* Day number */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isNarrow ? '3px' : '6px' }}>
                    <span style={{
                      width: isToday ? '24px' : 'auto',
                      height: isToday ? '24px' : 'auto',
                      borderRadius: '50%',
                      background: isToday ? 'var(--primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isNarrow ? '0.68rem' : '0.72rem',
                      fontWeight: isToday ? '900' : isWeekend ? '700' : '500',
                      color: isToday ? 'white' : isWeekend ? 'rgba(249,115,22,0.8)' : 'rgba(255,255,255,0.45)',
                      boxShadow: isToday ? '0 0 12px rgba(37,99,235,0.5)' : 'none',
                      flexShrink: 0,
                    }}>{day}</span>

                    {/* "+" icon on hover for new event (se oculta en pantallas angostas: le quita espacio a la celda) */}
                    {!isNarrow && dayEvents.length === 0 && (
                      <Plus size={10} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                    )}
                  </div>

                  {/* Events */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                    {dayEvents.slice(0, 3).map((ev) => {
                      const c = getEventColor(ev.name);
                      return (
                        <div
                          key={ev.id}
                          onClick={e => { e.stopPropagation(); onEventClick && onEventClick(ev); }}
                          title={ev.name}
                          style={{
                            padding: '3px 6px',
                            background: c.bg,
                            borderRadius: '6px',
                            fontSize: '0.6rem',
                            fontWeight: '700',
                            color: 'white',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            boxShadow: `0 2px 8px ${c.glow}44`,
                            transition: 'transform 0.15s, box-shadow 0.15s',
                            textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform='scale(1.04)'; e.currentTarget.style.boxShadow=`0 4px 14px ${c.glow}88`; }}
                          onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow=`0 2px 8px ${c.glow}44`; }}
                        >{ev.name}</div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textAlign: 'center', marginTop: '2px' }}>
                        +{dayEvents.length - 3} más
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        padding: '1rem 1.75rem 1.25rem',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {categories.map(cat => (
            <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, boxShadow: `0 0 8px ${cat.color}88` }} />
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{cat.name}</span>
            </div>
          ))}
        </div>

        <button
          onClick={exportToICS}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: '20px', color: 'var(--primary)', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(37,99,235,0.2)'; e.currentTarget.style.transform='translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(37,99,235,0.1)'; e.currentTarget.style.transform='translateY(0)'; }}
        >
          <Download size={13}/> Exportar .ics
        </button>
      </div>
      </div>
    </div>
  );
}
