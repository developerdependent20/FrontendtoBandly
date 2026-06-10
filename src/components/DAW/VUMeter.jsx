import React, { useEffect, useRef } from 'react';

export default function VUMeter({ level = 0, isActive = false }) {
  const canvasRef = useRef(null);
  const smoothedLevel = useRef(0);
  const peakLevel = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Suavizado de caída (Decay)
      if (level > smoothedLevel.current) {
        smoothedLevel.current = level;
      } else {
        smoothedLevel.current *= 0.92; // Caída suave profesional
      }

      // Memoria de pico flotante
      if (smoothedLevel.current > peakLevel.current) {
        peakLevel.current = smoothedLevel.current;
      } else {
        peakLevel.current *= 0.985;
      }

      ctx.clearRect(0, 0, w, h);
      
      // Fondo negro técnico
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, w, h);

      // Gradiente DAW (Verde a Rojo)
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, '#10b981'); // Verde
      grad.addColorStop(0.7, '#fbbf24'); // Amarillo
      grad.addColorStop(0.95, '#ef4444'); // Rojo

      const barHeight = h * (smoothedLevel.current / 100);
      ctx.fillStyle = grad;
      ctx.fillRect(0, h - barHeight, w, barHeight);

      // Dibujar marca de pico flotante
      const peakY = h - (h * (peakLevel.current / 100));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, peakY, w, 2);

      // Dibujar rejilla (Ticks de dB)
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      for(let i = 0; i < 10; i++) {
        const y = (h / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [level]);

  return (
    <div className="vu-meter-container" style={{ border: '1px solid #334155' }}>
      <canvas 
        ref={canvasRef} 
        width="10" 
        height="200" 
        style={{ width: '10px', height: '200px' }}
      />
    </div>
  );
}
