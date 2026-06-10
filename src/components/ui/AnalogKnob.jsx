import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function AnalogKnob({
  value = 0,       // 0 to 1
  onChange,
  min = 0,
  max = 1,
  size = 40,
  label = '',
  color = '#a855f7'
}) {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef(null);
  const startY = useRef(0);
  const startVal = useRef(0);

  // Normalizar valor entre 0 y 1 para los cálculos visuales
  const normalizedValue = (value - min) / (max - min);

  // Rango de giro (en grados). 0 es abajo-izquierda (-135), 1 es abajo-derecha (+135). Rango total 270 grados.
  const angle = (normalizedValue * 270) - 135;

  const handlePointerDown = (e) => {
    e.preventDefault(); // prevenir drag de la página
    setIsDragging(true);
    startY.current = e.clientY;
    startVal.current = normalizedValue;
    
    // Capturar el puntero asegura que sigamos recibiendo eventos aunque el mouse salga del knob
    if (knobRef.current) {
      knobRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;
    
    // 1 pixel de movimiento = 1% de cambio (ajustable)
    const deltaY = startY.current - e.clientY;
    let newVal = startVal.current + (deltaY * 0.005);
    
    // Limitar entre 0 y 1
    newVal = Math.max(0, Math.min(1, newVal));
    
    // Desnormalizar
    const finalValue = min + (newVal * (max - min));
    
    if (onChange) {
      onChange(finalValue);
    }
  }, [isDragging, min, max, onChange]);

  const handlePointerUp = useCallback((e) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (knobRef.current) {
      knobRef.current.releasePointerCapture(e.pointerId);
    }
  }, [isDragging]);

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '8px',
        userSelect: 'none',
        touchAction: 'none' // Evitar scroll en touch al usar el knob
      }}
    >
      <div 
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          boxShadow: `
            inset 0 2px 4px rgba(255,255,255,0.1),
            inset 0 -2px 4px rgba(0,0,0,0.5),
            0 5px 10px rgba(0,0,0,0.8),
            0 0 0 2px #020617
          `,
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          transform: `rotate(${angle}deg)`,
          border: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        {/* Indicador brillante (marca del knob) */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '12%',
          height: '25%',
          background: color,
          borderRadius: '2px',
          boxShadow: `0 0 5px ${color}, 0 0 10px ${color}`
        }} />

        {/* Textura central */}
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '25%',
          width: '50%',
          height: '50%',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
        }} />
      </div>

      {label && (
        <span style={{ 
          fontSize: '0.65rem', 
          fontWeight: '800', 
          color: 'rgba(255,255,255,0.6)', 
          letterSpacing: '1px' 
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
