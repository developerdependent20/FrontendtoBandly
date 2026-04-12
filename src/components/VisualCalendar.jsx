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
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: 'bold' }}>{monthNames[month]} {year}</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={prevMonth} className="btn-secondary" style={{ padding: '0.4rem', width: 'auto' }}><ChevronLeft size={18}/></button>
          <button onClick={nextMonth} className="btn-secondary" style={{ padding: '0.4rem', width: 'auto' }}><ChevronRight size={18}/></button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
        {weekDays.map(d => <div key={d} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', paddingBottom: '0.5rem', textTransform: 'uppercase' }}>{d}</div>)}
        
        {calendarDays.map((day, idx) => {
          const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
          const dayEvents = dateStr ? events?.filter(e => e.date && e.date.startsWith(dateStr)) : [];
          const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();

          return (
            <div 
              key={idx} 
              onClick={() => day && onDayClick(dateStr)}
              style={{ minHeight: '80px', background: day ? 'rgba(255,255,255,0.02)' : 'transparent', border: '1px solid rgba(255,255,255,0.03)', position: 'relative', cursor: day ? 'pointer' : 'default', transition: '0.2s', display: 'flex', flexDirection: 'column', padding: '8px' }}
              className={day ? "calendar-cell-hover" : ""}
            >
              {day && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <span style={{ fontSize: '0.8rem', color: isToday ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: isToday ? 'bold' : 'normal' }}>{day}</span>
                    {isToday && <div style={{ width: '4px', height: '4px', background: 'var(--primary)', borderRadius: '50%' }}></div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', justifyContent: 'flex-start', marginTop: '6px', width: '100%' }}>
                    {dayEvents.map(ev => (
                      <div 
                        key={ev.id} 
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                        style={{ 
                          width: '100%', 
                          padding: '3px 6px', 
                          background: 'var(--accent)', 
                          color: '#0f172a', 
                          borderRadius: '4px', 
                          fontSize: '0.65rem', 
                          fontWeight: '800', 
                          cursor: 'pointer', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          textAlign: 'left',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                        title={ev.name}
                      >
                        {ev.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
