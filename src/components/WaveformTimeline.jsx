import React, { useEffect, useRef } from 'react';
import { Flag, Trash2 } from 'lucide-react';
import './WaveformTimeline.css';

/**
 * WaveformTimeline Pro - Con soporte de Marcadores Manuales Coloreados
 */
const WaveformTimeline = ({ currentTime, duration, markers = [], onSeek, onRemoveMarker }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Colores profesionales por tipo de sección
  const getColor = (label) => {
    const l = label.toUpperCase();
    if (l.includes('INTRO')) return '#3b82f6';
    if (l.includes('CORO') || l.includes('CHORUS')) return '#ef4444';
    if (l.includes('VERSO') || l.includes('VERSE')) return '#10b981';
    if (l.includes('PUENTE') || l.includes('BRIDGE')) return '#8b5cf6';
    if (l.includes('SOLO')) return '#facc15';
    return '#6b7280'; // Default Outro/Other
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, height);

      // 1. Fondos de Marcadores (Gradiente sutil)
      const sortedMarkers = [...markers].sort((a, b) => a.time - b.time);
      sortedMarkers.forEach((marker, index) => {
        const nextTime = sortedMarkers[index + 1]?.time || duration;
        const xStart = (marker.time / duration) * width;
        const xWidth = ((nextTime - marker.time) / duration) * width;
        const color = getColor(marker.label);

        // Fondo transparente de la sección
        ctx.fillStyle = `${color}15`; 
        ctx.fillRect(xStart, 0, xWidth, height);

        // Línea vertical del marcador
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xStart, 0);
        ctx.lineTo(xStart, height);
        ctx.stroke();

        // Etiqueta superior
        ctx.fillStyle = color;
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(marker.label.toUpperCase(), xStart + 4, 12);
      });

      // 2. "Ondas" Estéticas (Generadas por datos estáticos para performance)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      const barWidth = 2;
      const spacing = 1;
      for (let i = 0; i < width; i += barWidth + spacing) {
        // Generamos una "onda" pseudo-aleatoria pero determinista
        const h = Math.abs(Math.sin(i * 0.05) * (height * 0.4)) + (Math.random() * 5);
        ctx.fillRect(i, height / 2 - h / 2, barWidth, h);
      }

      // 3. Cursor de Progreso (Aguja M32)
      const cursorX = (currentTime / duration) * width;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Indicador de tiempo actual
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(formatTime(currentTime), cursorX + 5, height - 5);
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [currentTime, duration, markers]);

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    onSeek(newTime);
  };

  return (
    <div className="waveform-timeline-container" ref={containerRef}>
      <div className="timeline-info">
        <span className="info-label">ESTRUCTURA DE SECUENCIA</span>
        <div className="timeline-legend">
           <span style={{ color: '#ef4444' }}>● CORO</span>
           <span style={{ color: '#3b82f6' }}>● INTRO</span>
           <span style={{ color: '#10b981' }}>● VERSO</span>
        </div>
      </div>
      <canvas 
        ref={canvasRef} 
        onClick={handleClick}
        className="waveform-canvas"
      />
    </div>
  );
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default WaveformTimeline;
