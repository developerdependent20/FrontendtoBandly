import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  return (
    <div className="calendar-container" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: 'bold' }}>{monthNames[month]} {year}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={prevMonth} className="btn-secondary" style={{ padding: '0.4rem', width: 'auto' }}><ChevronLeft size={18}/></button>
          <button onClick={nextMonth} className="btn-secondary" style={{ padding: '0.4rem', width: 'auto' }}><ChevronRight size={18}/></button>
        </div>
      </div>
      
      <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', textAlign: 'center' }}>
        {weekDays.map(d => <div key={d} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', paddingBottom: '0.5rem', textTransform: 'uppercase' }}>{d}</div>)}
        
        {calendarDays.map((day, idx) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
          const dayEvents = dateStr ? events?.filter(e => e.date && e.date.startsWith(dateStr)) : [];
          const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();

          return (
            <div 
              key={idx} 
              onClick={() => day && onDayClick(dateStr)}
              className={`calendar-day ${day ? "calendar-cell-hover" : ""}`}
              style={{ 
                minHeight: 'clamp(40px, 10vw, 80px)', 
                background: day ? 'rgba(255,255,255,0.02)' : 'transparent', 
                border: '1px solid rgba(255,255,255,0.03)', 
                position: 'relative', 
                cursor: day ? 'pointer' : 'default', 
                transition: '0.2s', 
                display: 'flex', 
                flexDirection: 'column', 
                padding: '4px' 
              }}
            >
              {day && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <span style={{ fontSize: '0.75rem', color: isToday ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: isToday ? 'bold' : 'normal' }}>{day}</span>
                    {isToday && <div style={{ width: '4px', height: '4px', background: 'var(--primary)', borderRadius: '50%' }}></div>}
                  </div>
                  <div className="calendar-events-container" style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'flex-start', marginTop: '2px', width: '100%', overflow: 'hidden' }}>
                    {dayEvents.map(ev => (
                      <div 
                        key={ev.id} 
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                        className="calendar-event-pill"
                        style={{ 
                          width: '100%', 
                          padding: '2px 4px', 
                          background: 'var(--accent)', 
                          color: '#0f172a', 
                          borderRadius: '3px', 
                          fontSize: '0.6rem', 
                          fontWeight: '800', 
                          cursor: 'pointer', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          textAlign: 'left'
                        }}
                        title={ev.name}
                      >
                        <span className="hide-mobile-small">{ev.name}</span>
                        <div className="show-mobile-small-dot" style={{ display: 'none', width: '100%', height: '4px', background: 'var(--accent)', borderRadius: '2px' }}></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        @media (max-width: 480px) {
          .hide-mobile-small { display: none; }
          .show-mobile-small-dot { display: block !important; }
          .calendar-day { min-height: 45px !important; padding: 2px !important; }
          .calendar-event-pill { height: 6px; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
