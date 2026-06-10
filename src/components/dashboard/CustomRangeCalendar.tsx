"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";

interface CustomRangeCalendarProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  disabledDates: string[]; // ['YYYY-MM-DD']
  onChange: (start: string, end: string, disabled: string[]) => void;
}

export const CustomRangeCalendar: React.FC<CustomRangeCalendarProps> = ({ startDate, endDate, disabledDates, onChange }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (startDate) {
      const d = new Date(startDate + "T12:00:00");
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth, year, month };
  };

  const { firstDay, daysInMonth, year, month } = getDaysInMonth(currentMonth);
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNames = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

  const generateDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };

  const todayStr = generateDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const handleDayClick = (dayStr: string) => {
    const clickedDate = new Date(dayStr + "T12:00:00");
    const start = startDate ? new Date(startDate + "T12:00:00") : null;
    const end = endDate ? new Date(endDate + "T12:00:00") : null;

    // Si ya hay inicio y fin, y hacemos clic DENTRO del rango, se alterna la disponibilidad (excepción)
    if (start && end && clickedDate >= start && clickedDate <= end) {
      let newDisabled = [...disabledDates];
      if (newDisabled.includes(dayStr)) {
        newDisabled = newDisabled.filter(d => d !== dayStr);
      } else {
        newDisabled.push(dayStr);
      }
      onChange(startDate, endDate, newDisabled);
      return;
    }

    // Comportamiento de rango: Google Flights
    if (!start || (start && end)) {
      // Iniciar nuevo rango
      onChange(dayStr, "", []);
    } else if (start && !end) {
      if (clickedDate >= start) {
        onChange(startDate, dayStr, disabledDates);
      } else {
        onChange(dayStr, "", []);
      }
    }
  };

  const renderCells = () => {
    const cells = [];
    const start = startDate ? new Date(startDate + "T12:00:00") : null;
    const end = endDate ? new Date(endDate + "T12:00:00") : null;

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="cal-cell empty"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = generateDateStr(year, month, d);
      const cellDate = new Date(dayStr + "T12:00:00");
      
      const isStart = startDate === dayStr;
      const isEnd = endDate === dayStr;
      const isBetween = start && end && cellDate > start && cellDate < end;
      const isDisabled = disabledDates.includes(dayStr);
      const isToday = todayStr === dayStr;
      
      let bg = "transparent";
      let color = "var(--text-main)";
      let border = "1px solid transparent";
      let cursor = "pointer";
      let opacity = 1;

      if (isStart || isEnd) {
        bg = "var(--brand-secondary)";
        color = "#fff";
      } else if (isBetween) {
        bg = "rgba(0, 82, 255, 0.15)";
        if (isDisabled) {
           bg = "rgba(239, 68, 68, 0.2)"; // Rojo claro
           color = "#ef4444";
           border = "1px dashed #ef4444";
        }
      }

      cells.push(
        <div 
          key={dayStr} 
          onClick={() => handleDayClick(dayStr)}
          style={{
             display: "flex", alignItems: "center", justifyContent: "center",
             height: "40px", borderRadius: isStart ? "10px 0 0 10px" : isEnd ? "0 10px 10px 0" : (isBetween && !isDisabled) ? "0" : "10px",
             background: bg, color, border, cursor, opacity,
             fontWeight: (isStart || isEnd) ? 800 : 600,
             fontSize: "0.9rem",
             transition: "all 0.2s"
          }}
          className="cal-day hover-scale"
          title={isDisabled ? "Día inhabilitado manualmente" : ""}
        >
          {d}
          {isToday && !isStart && !isEnd && !isBetween && <div style={{position: "absolute", bottom: "4px", width: "4px", height: "4px", borderRadius: "50%", background: "var(--brand-secondary)"}}></div>}
        </div>
      );
    }
    return cells;
  };

  return (
    <div style={{ background: "var(--bg-page)", padding: "20px", borderRadius: "16px", border: "1px solid var(--glass-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
          {monthNames[month]} {year}
        </h4>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={(e) => { e.preventDefault(); prevMonth(); }} style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "var(--text-main)", cursor: "pointer", padding: "6px" }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={(e) => { e.preventDefault(); nextMonth(); }} style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "var(--text-main)", cursor: "pointer", padding: "6px" }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px", marginBottom: "10px", textAlign: "center" }}>
        {dayNames.map(d => (
          <div key={d} style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>{d}</div>
        ))}
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px 0" }}>
        {renderCells()}
      </div>

      <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px dashed var(--glass-border)", fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", gap: "15px", flexWrap: "wrap" }}>
         <div style={{display: "flex", alignItems: "center", gap: "5px"}}><div style={{width: 12, height: 12, borderRadius: 3, background: "var(--brand-secondary)"}}></div> Rango Abierto</div>
         <div style={{display: "flex", alignItems: "center", gap: "5px"}}><div style={{width: 12, height: 12, borderRadius: 3, background: "rgba(239, 68, 68, 0.2)", border: "1px dashed #ef4444"}}></div> Día Apagado (Haz clic dentro del rango para apagar)</div>
      </div>
    </div>
  );
};
