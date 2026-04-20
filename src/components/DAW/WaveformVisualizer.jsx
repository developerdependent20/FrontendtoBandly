import React, { useRef, useEffect } from 'react';

// COLORES DE ALTO CONTRASTE (DAW STYLE)
const CYAN = '#22d3ee';
const INACTIVE = 'rgba(255, 255, 255, 0.12)';
const BG_COLOR = '#020617';
const GRID_MINOR = 'rgba(34, 211, 238, 0.08)';
const GRID_MAJOR = 'rgba(255, 255, 255, 0.18)';

export default function WaveformVisualizer({ 
  progress = 0, 
  peaks = [], 
  onSeek, 
  zoom = 1, 
  scrollOffset = 0, 
  setScrollOffset, 
  vZoom = 1, 
  totalBars = 64,
  onZoomWheel = null 
}) {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const centerY = height / 2;

    // 1. Fondo Profundo
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    // 2. Parámetros de Visualización
    const totalCount = peaks.length || 200;
    const displayCount = totalCount / zoom;
    const scrollMax = Math.max(0, totalCount - displayCount);
    const startIdx = zoom > 1 ? Math.floor(scrollOffset * scrollMax) : 0;
    
    // 3. Grilla de Compases
    const pixPerBar = (width * zoom) / Math.max(1, totalBars);
    const barOffset = zoom > 1 ? (scrollOffset * (totalBars * pixPerBar - width)) : 0;

    for (let i = 0; i <= totalBars; i++) {
        const x = Math.floor(i * pixPerBar - barOffset) + 0.5;
        if (x < -10 || x > width + 10) continue;

        const isMajor = i % 4 === 0;
        ctx.lineWidth = 1;
        ctx.strokeStyle = isMajor ? GRID_MAJOR : GRID_MINOR;
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();

        if (isMajor || pixPerBar > 100) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '700 10px monospace';
            ctx.fillText(i + 1, x + 4, 14);
        }
    }

    // 4. Renderizado de Onda "Boosted" (Omnisphere Style Display)
    // Usamos un factor de amplificación visual para que la onda siempre sea gorda y legible
    const visualBoost = 1.8; 
    const ampBase = (height * 0.4) * vZoom * visualBoost;
    const playheadIdx = progress * totalCount;
    const hasData = peaks.length > 0;

    for (let x = 0; x < width; x++) {
        const globalIdx = startIdx + ((x / width) * displayCount);
        if (hasData && globalIdx >= totalCount) break;

        // Si no hay datos, mostramos una línea tenue
        const rawPeak = hasData ? (peaks[Math.floor(globalIdx)] || 0) : 0.03;
        
        // LIMITER VISUAL: Aseguramos que h nunca rompa el canvas pero sea siempre visible
        const h = Math.min(height * 0.48, Math.max(1.5, rawPeak * ampBase));

        const isActive = globalIdx <= playheadIdx;
        ctx.fillStyle = isActive ? CYAN : INACTIVE;
        
        // Dibujo Simétrico Perfecto
        ctx.fillRect(x, Math.floor(centerY - h), 1, Math.floor(h * 2));
    }

    // 5. Playhead
    const playX = ((playheadIdx - startIdx) / displayCount) * width;
    if (playX >= 0 && playX <= width) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 15; ctx.shadowColor = CYAN;
        ctx.fillRect(Math.floor(playX) - 1, 0, 2, height);
        ctx.shadowBlur = 0;
    }
  };

  useEffect(() => {
    const loop = () => { draw(); requestRef.current = requestAnimationFrame(loop); };
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [progress, peaks, zoom, scrollOffset, vZoom, totalBars]);

  const handleClick = (e) => {
    if (!onSeek) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const lPos = (e.clientX - rect.left) / rect.width;
    if (zoom > 1) {
        onSeek(Math.max(0, Math.min(1, scrollOffset * (1 - 1/zoom) + lPos * (1/zoom))));
    } else {
        onSeek(Math.max(0, Math.min(1, lPos)));
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey && onZoomWheel) {
        onZoomWheel(e.deltaY);
    } else if (zoom > 1) {
        const step = 0.05 / zoom;
        setScrollOffset(prev => Math.max(0, Math.min(1, prev + (e.deltaY > 0 ? step : -step))));
    }
  };

  return (
    <div
      onClick={handleClick}
      onWheel={handleWheel}
      style={{ 
        width: '100%', height: '80px', background: BG_COLOR, borderRadius: '8px', 
        overflow: 'hidden', border: '1px solid rgba(34, 211, 238, 0.15)',
        position: 'relative', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.85)',
        cursor: 'pointer', userSelect: 'none'
      }}
    >
      <canvas ref={canvasRef} width={1200} height={80} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
    </div>
  );
}
