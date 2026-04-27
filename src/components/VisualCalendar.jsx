import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Circle, Download } from 'lucide-react';

export default function VisualCalendar({ events, onEventClick, onDayClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const calendarDays = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let i = 1; i <= days; i++) calendarDays.push(i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Lógica de colores por categoría
  const getEventStyle = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('servicio') || n.includes('dominical') || n.includes('culto')) return { bg: 'rgba(99, 102, 241, 0.2)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.4)' }; 
    if (n.includes('oración') || n.includes('ayuno') || n.includes('búsqueda')) return { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', border: 'rgba(16, 185, 129, 0.4)' }; 
    if (n.includes('reunión') || n.includes('jóvenes') || n.includes('servidores') || n.includes('ensayo')) return { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.4)' }; 
    if (n.includes('especial') || n.includes('altar') || n.includes('conferencia')) return { bg: 'rgba(249, 115, 22, 0.2)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.4)' }; 
    return { bg: 'rgba(6, 182, 212, 0.2)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.4)' }; 
  };

  const categories = [
    { name: 'Servicios', color: '#818cf8' },
    { name: 'Oración', color: '#34d399' },
    { name: 'Reuniones', color: '#a78bfa' },
    { name: 'Especiales', color: '#fb923c' }
  ];

  // Exportar a formato universal .ics
  const exportToICS = () => {
    try {
      const monthEvents = events?.filter(e => e.date && e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) || [];
      if (monthEvents.length === 0) return alert('No hay eventos este mes para exportar.');

      let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PROID:-//Bandly//Calendar//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ];

      monthEvents.forEach(ev => {
        const d = new Date(ev.date);
        const dateStr = d.toISOString().replace(/-|:|\.\d+/g, '').split('T')[0];
        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`SUMMARY:${ev.name}`);
        icsContent.push(`DTSTART;VALUE=DATE:${dateStr}`);
        icsContent.push(`DTEND;VALUE=DATE:${dateStr}`);
        icsContent.push(`DESCRIPTION:${ev.description || 'Evento de Bandly'}`);
        icsContent.push('STATUS:CONFIRMED');
        icsContent.push('END:VEVENT');
      });

      icsContent.push('END:VCALENDAR');
      
      const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bandly_Agenda_${monthNames[month]}_${year}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) { alert('Error al exportar: ' + e.message); }
  };

  return (
    <div className="calendar-container" style={{ background: 'rgba(30, 41, 59, 0.3)', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: '800', letterSpacing: '-0.5px' }}>{monthNames[month]} <span style={{ color: 'rgba(255,255,255,0.3)' }}>{year}</span></h3>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button onClick={prevMonth} className="btn-secondary" style={{ padding: '0.5rem', width: '36px', height: '36px', borderRadius: '10px' }}><ChevronLeft size={18}/></button>
          <button onClick={nextMonth} className="btn-secondary" style={{ padding: '0.5rem', width: '36px', height: '36px', borderRadius: '10px' }}><ChevronRight size={18}/></button>
        </div>
      </div>
      
      {/* GRID */}
      <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {weekDays.map(d => <div key={d} style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontWeight: 'bold', paddingBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{d}</div>)}
        
        {calendarDays.map((day, idx) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
          const dayEvents = dateStr ? events?.filter(e => e.date && e.date.startsWith(dateStr)) : [];
          const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();

          return (
            <div 
              key={idx} 
              onClick={() => day && onDayClick(dateStr)}
              className={`calendar-day ${day ? "calendar-cell-active" : ""}`}
              style={{ 
                minHeight: '85px', 
                background: day ? 'rgba(255,255,255,0.02)' : 'transparent', 
                borderRadius: '12px',
                border: isToday ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.03)', 
                position: 'relative', 
                cursor: day ? 'pointer' : 'default', 
                transition: 'all 0.2s ease', 
                display: 'flex', 
                flexDirection: 'column', 
                padding: '8px' 
              }}
            >
              {day && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: isToday ? 'var(--primary)' : 'rgba(255,255,255,0.3)', fontWeight: isToday ? '900' : '500' }}>{day}</span>
                  </div>
                  <div className="calendar-events-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', overflow: 'hidden' }}>
                    {dayEvents.map(ev => {
                      const style = getEventStyle(ev.name);
                      return (
                        <div 
                          key={ev.id} 
                          onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                          style={{ 
                            width: '100%', 
                            padding: '4px 6px', 
                            background: style.bg, 
                            color: style.text, 
                            borderLeft: `3px solid ${style.text}`,
                            borderRadius: '4px', 
                            fontSize: '0.65rem', 
                            fontWeight: '700', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            textAlign: 'left',
                            transition: 'transform 0.1s'
                          }}
                          className="calendar-pill-hover"
                          title={ev.name}
                        >
                          {ev.name}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER / LEYENDA / EXPORT */}
      <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem' }}>
          {categories.map(cat => (
            <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, boxShadow: `0 0 10px ${cat.color}66` }}></div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>{cat.name}</span>
            </div>
          ))}
        </div>
        
        <button 
          onClick={exportToICS}
          style={{ 
            background: 'rgba(99, 102, 241, 0.1)', 
            border: '1px solid rgba(99, 102, 241, 0.3)', 
            color: '#818cf8', 
            padding: '0.5rem 1rem', 
            borderRadius: '10px', 
            fontSize: '0.7rem', 
            fontWeight: '800', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          className="btn-export-hover"
        >
          <Download size={14} /> Sincronizar Calendario
        </button>
      </div>

      <style>{`
        .calendar-cell-active:hover { background: rgba(255,255,255,0.05) !important; transform: translateY(-2px); }
        .calendar-pill-hover:hover { transform: scale(1.02); filter: brightness(1.2); }
        .btn-export-hover:hover { background: rgba(99, 102, 241, 0.2) !important; transform: translateY(-1px); border-color: rgba(99, 102, 241, 0.5) !important; }
        @media (max-width: 480px) {
          .calendar-day { min-height: 50px !important; padding: 4px !important; }
          .calendar-pill-hover { font-size: 0 !important; height: 6px; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
