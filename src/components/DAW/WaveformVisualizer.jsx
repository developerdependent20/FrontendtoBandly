import React, { useRef, useEffect, useCallback, useState } from 'react';

// COLORES DE ALTO CONTRASTE (DAW STYLE)
const PLAYED = 'rgba(247, 244, 239, 0.82)';
const INACTIVE = 'rgba(255, 255, 255, 0.14)';
const BG_COLOR = '#101012';
const GRID_MINOR = 'rgba(255, 255, 255, 0.035)';
const GRID_MAJOR = 'rgba(255, 255, 255, 0.09)';

// La onda ya no dibuja el cursor ni los números de compás: el cursor lo pone
// CueTimeline encima de TODAS las líneas (onda, secciones, letras, luces) y
// los números viven en la regla. Aquí solo quedan grilla + forma de onda.
//
// El canvas se ajusta al tamaño real en pantalla × devicePixelRatio. Antes
// era fijo de 1200px y el navegador lo estiraba: en pantallas grandes o de
// alta densidad se veía borroso.
export default function WaveformVisualizer({
  progress = 0,
  peaks = [],
  onSeek,
  zoom = 1,
  scrollOffset = 0,
  vZoom = 1,
  totalBars = 64,
  tickFraction = 0,      // largo de un tick de grilla (compás o N segundos) como fracción de la canción
  snapToGrid = false,
  snapFraction = 0,      // paso del snap (un tiempo, o un tick sin tempo) como fracción
  majorEvery = 4,
  height = 80,
}) {
  const wrapRef = useRef(null);
  const staticCanvasRef = useRef(null);
  const dynamicCanvasRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0, dpr: 1 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      setSize(prev => (prev.w === r.width && prev.h === r.height && prev.dpr === dpr ? prev : { w: r.width, h: r.height, dpr }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const W = Math.max(1, Math.round(size.w * size.dpr));
  const H = Math.max(1, Math.round(size.h * size.dpr));

  // Ventana visible — el mismo mapeo que usa CueTimeline para todo lo demás.
  const viewStart = zoom > 1 ? scrollOffset * (1 - 1 / zoom) : 0;
  const viewSpan = 1 / zoom;

  // GRILLA (solo cambia con zoom/scroll/tamaño)
  const drawStatic = useCallback(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);
    // Sin datos reales todavía: fondo neutro, sin líneas (evita grilla falsa al abrir)
    if (totalBars < 1 || tickFraction <= 0) return;

    const pxPerTick = (W / viewSpan) * tickFraction;
    const first = Math.max(0, Math.floor(viewStart / tickFraction));
    const last = Math.min(totalBars, Math.ceil((viewStart + viewSpan) / tickFraction));
    // Con mucho zoom-out se salta ticks menores: si no, la grilla es una mancha.
    const minorVisible = pxPerTick >= 6 * size.dpr;
    ctx.lineWidth = Math.max(1, Math.round(size.dpr));
    for (let i = first; i <= last; i++) {
      const isMajor = i % Math.max(1, majorEvery) === 0;
      if (!isMajor && !minorVisible) continue;
      const x = Math.round(((i * tickFraction) - viewStart) / viewSpan * W) + 0.5;
      ctx.strokeStyle = isMajor ? GRID_MAJOR : GRID_MINOR;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
  }, [W, H, size.dpr, viewStart, viewSpan, totalBars, tickFraction, majorEvery]);

  // FORMA DE ONDA (progress/peaks/vZoom + escala)
  const drawDynamic = useCallback(() => {
    const canvas = dynamicCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const centerY = H / 2;

    const totalCount = peaks.length || 200;
    const hasData = peaks.length > 0;
    const ampBase = (H * 0.4) * vZoom * 1.8;
    const playheadIdx = progress * totalCount;

    for (let x = 0; x < W; x++) {
      const globalIdx = (viewStart + (x / W) * viewSpan) * totalCount;
      if (hasData && globalIdx >= totalCount) break;
      const rawPeak = hasData ? (peaks[Math.floor(globalIdx)] || 0) : 0.03;
      const h = Math.min(H * 0.48, Math.max(1.5, rawPeak * ampBase));
      ctx.fillStyle = globalIdx <= playheadIdx ? PLAYED : INACTIVE;
      ctx.fillRect(x, Math.floor(centerY - h), 1, Math.floor(h * 2));
    }
  }, [W, H, progress, peaks, vZoom, viewStart, viewSpan]);

  useEffect(() => { drawStatic(); }, [drawStatic]);
  useEffect(() => { drawDynamic(); }, [drawDynamic]);

  const handleClick = (e) => {
    if (!onSeek) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const lPos = (e.clientX - rect.left) / rect.width;
    let rawPos = Math.max(0, Math.min(1, viewStart + lPos * viewSpan));

    // SNAP TO GRID: con tempo, a los tiempos del compás; sin tempo, a los ticks.
    if (snapToGrid && snapFraction > 0) {
      rawPos = Math.round(rawPos / snapFraction) * snapFraction;
    }
    onSeek(Math.max(0, Math.min(1, rawPos)));
  };

  const canvasStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' };

  return (
    <div
      ref={wrapRef}
      onClick={handleClick}
      style={{
        width: '100%', height: `${height}px`, background: BG_COLOR, borderRadius: '12px',
        overflow: 'hidden', border: '1px solid rgba(247, 244, 239, 0.18)',
        position: 'relative', cursor: 'pointer', userSelect: 'none'
      }}
    >
      <canvas ref={staticCanvasRef} width={W} height={H} style={canvasStyle} />
      <canvas ref={dynamicCanvasRef} width={W} height={H} style={canvasStyle} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 30px rgba(0,0,0,0.7)', pointerEvents: 'none' }} />
    </div>
  );
}
