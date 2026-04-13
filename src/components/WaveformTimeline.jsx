import React, { useEffect, useRef, useState } from 'react';
import './WaveformTimeline.css';

/**
 * WaveformTimeline - Visualizador Pro de la estructura de la canción.
 */
const WaveformTimeline = ({ currentTime, duration, sections = [], onSeek }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Mock de secciones si no vienen dadas (para visualización pro)
  const displaySections = sections.length > 0 ? sections : [
    { id: '1', label: 'INTRO', start: 0, color: '#3b82f6' },
    { id: '2', label: 'VERSE 1', start: duration * 0.15, color: '#10b981' },
    { id: '3', label: 'CHORUS', start: duration * 0.4, color: '#f59e0b' },
    { id: '4', label: 'BRIDGE', start: duration * 0.65, color: '#8b5cf6' },
    { id: '5', label: 'OUTRO', start: duration * 0.85, color: '#ef4444' },
  ];

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

      // 1. Dibujar fondo de secciones
      displaySections.forEach((section, index) => {
        const nextStart = displaySections[index + 1]?.start || duration;
        const xStart = (section.start / duration) * width;
        const xWidth = ((nextStart - section.start) / duration) * width;

        ctx.fillStyle = `${section.color}22`; // Muy transparente
        ctx.fillRect(xStart, 0, xWidth, height);

        // Línea divisoria
        ctx.strokeStyle = section.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xStart, 0);
        ctx.lineTo(xStart, height);
        ctx.stroke();

        // Etiqueta
        ctx.fillStyle = section.color;
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText(section.label, xStart + 5, 15);
      });

      // 2. Dibujar Cursor de Progreso
      const cursorX = (currentTime / duration) * width;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();

      // Cabeza del cursor
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cursorX, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [currentTime, duration, displaySections]);

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    onSeek(newTime);
  };

  return (
    <div className="waveform-timeline-container" ref={containerRef}>
      <canvas 
        ref={canvasRef} 
        onClick={handleClick}
        className="waveform-canvas"
      />
      <div className="time-display">
        <span>{formatTime(currentTime)}</span>
        <span className="duration">/ {formatTime(duration)}</span>
      </div>
    </div>
  );
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default WaveformTimeline;
