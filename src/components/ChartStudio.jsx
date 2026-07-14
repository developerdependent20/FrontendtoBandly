import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import {
  X, ChevronUp, ChevronDown, Pencil, Eraser,
  Save, Maximize2, Minimize2, FileText, Copy, Check, Eye, Edit3,
  Play, Pause, ArrowLeft
} from 'lucide-react';
import { alertDialog, confirmDialog } from '../utils/dialogService';
import FirstUseTip from './FirstUseTip';
import './ChartStudio.css';

// ─────────────────────────────────────────────────
// CHART STUDIO — Bandly's Professional Chart Editor
// ─────────────────────────────────────────────────

const MAJOR_CHORDS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MINOR_CHORDS = ['Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];
const EXTRA_CHORDS = ['7', 'maj7', 'm7', 'sus2', 'sus4', 'dim', 'aug', 'add9'];
const SECTIONS = [
  { label: 'Intro', tag: '{start_of_verse: Intro}\n\n{end_of_verse}' },
  { label: 'Verso', tag: '{start_of_verse: Verso}\n\n{end_of_verse}' },
  { label: 'Pre-Coro', tag: '{start_of_verse: Pre-Coro}\n\n{end_of_verse}' },
  { label: 'Coro', tag: '{start_of_chorus: Coro}\n\n{end_of_chorus}' },
  { label: 'Puente', tag: '{start_of_bridge: Puente}\n\n{end_of_bridge}' },
  { label: 'Outro', tag: '{start_of_verse: Outro}\n\n{end_of_verse}' },
];

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Frames de espera entre cada px de scroll (mayor número = más lento). A 60fps: 60 = 1px/seg, 30 = 2px/seg, etc.
const SCROLL_SPEEDS = [0.5, 1, 1.5, 2, 3];
const FRAMES_PER_PX = { 0.5: 80, 1: 40, 1.5: 20, 2: 10, 3: 5 };

function transposeNote(note, delta) {
  let index = SHARP_NOTES.indexOf(note);
  if (index === -1) index = FLAT_NOTES.indexOf(note);
  if (index === -1) return note;
  let newIndex = (index + delta) % 12;
  if (newIndex < 0) newIndex += 12;
  return SHARP_NOTES[newIndex];
}

function transposeChordString(chord, delta) {
  if (delta === 0) return chord;
  // Acordes con bajo ("G/B", "D/F#") deben transponer AMBAS notas, o el bajo
  // queda "pegado" y el acorde resultante es musicalmente incorrecto.
  const parts = chord.split('/');
  const transposed = parts.map((part, i) => {
    if (i === 0) {
      // Raíz: nota + sufijo (ej "C#m7" -> "C#", "m7")
      const match = part.match(/^([A-G][#b]?)(.*)$/);
      if (!match) return part;
      return transposeNote(match[1], delta) + match[2];
    }
    // Bajo tras "/": solo nota, sin sufijo
    const match = part.match(/^([A-G][#b]?)$/);
    if (!match) return part;
    return transposeNote(match[1], delta);
  });
  return transposed.join('/');
}

export default function ChartStudio({ song, onClose, onSave, readOnly = false }) {
  // ── State ──
  const [source, setSource] = useState(song?.chart_data || '');
  const [mode, setMode] = useState((song?.chart_data || readOnly) ? 'preview' : 'edit'); // 'edit' or 'preview'
  const [transposeDelta, setTransposeDelta] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chordSuffix, setChordSuffix] = useState(''); // For 7, maj7, etc.

  // Si la canción no tiene cifrado todavía, heredamos la letra ya preparada en
  // el editor de "Letras para Presenter" — así solo falta insertar acordes,
  // sin retipear el texto que ya se escribió una vez.
  useEffect(() => {
    if (song?.chart_data || !song?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('presenter_slides').select('slides').eq('song_id', song.id).maybeSingle();
      if (cancelled || !data?.slides?.length) return;
      const template = data.slides.map((slide) => {
        const body = slide.text || '';
        if (slide.marker_sync) {
          return `{start_of_verse: ${slide.marker_sync}}\n${body}\n{end_of_verse}`;
        }
        return body;
      }).join('\n\n');
      setSource(template);
    })();
    return () => { cancelled = true; };
  }, [song?.id, song?.chart_data]);

  // ── Annotation State ──
  const [drawingActive, setDrawingActive] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState(() => {
    try {
      return song?.chart_annotations ? JSON.parse(song.chart_annotations) : [];
    } catch { return []; }
  });
  const [currentStroke, setCurrentStroke] = useState([]);
  const [penColor, setPenColor] = useState('#facc15');
  const [penSize, setPenSize] = useState(3);
  const [tool, setTool] = useState('pen'); // 'pen' | 'eraser'

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollRef = useRef(null); // for auto-scroll animation
  const overlayRef = useRef(null); // root element for the real Fullscreen API (proyección a pantalla externa)

  // ── Pantalla Completa real (no solo CSS) — clave para proyectar en un TV/monitor externo sin la barra del navegador ──
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      overlayRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  // ── Auto-Scroll (Teleprompter) ──
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  // Sincroniza el scroll al BPM real de la canción en vez de una velocidad fija
  // arbitraria — 120bpm es la referencia "1x" (mismo frameDelay que FRAMES_PER_PX[1]).
  const [tempoSync, setTempoSync] = useState(false);
  const TEMPO_REFERENCE_BPM = 120;

  useEffect(() => {
    if (!autoScrolling) {
      if (scrollRef.current) cancelAnimationFrame(scrollRef.current);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const baseFrames = FRAMES_PER_PX[1]; // frames/px a la velocidad de referencia (1x @ 120bpm)
    const bpm = Math.min(220, Math.max(40, Number(song?.bpm) || TEMPO_REFERENCE_BPM));
    const delay = (tempoSync && song?.bpm)
      ? baseFrames / (bpm / TEMPO_REFERENCE_BPM)
      : (FRAMES_PER_PX[scrollSpeed] ?? 40); // Frames a esperar entre cada px
    let frameCount = 0;

    const tick = () => {
      if (!container) return;
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (container.scrollTop >= maxScroll) {
        setAutoScrolling(false); // Parar al llegar al fondo
        return;
      }
      frameCount++;
      if (frameCount >= delay) {
        container.scrollTop += 1;
        frameCount = 0;
      }
      scrollRef.current = requestAnimationFrame(tick);
    };
    
    scrollRef.current = requestAnimationFrame(tick);
    return () => { if (scrollRef.current) cancelAnimationFrame(scrollRef.current); };
  }, [autoScrolling, scrollSpeed, tempoSync, song?.bpm]);


  // ── Insert chord at cursor ──
  const insertAtCursor = (text) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setSource(prev => prev + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentScrollTop = textarea.scrollTop; // Guardar posición de scroll

    const before = source.substring(0, start);
    const after = source.substring(end);
    const newSource = before + text + after;
    setSource(newSource);
    
    // Restore focus, cursor position and scroll
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.scrollTop = currentScrollTop; // Restaurar scroll
    }, 0);
  };

  const insertChord = (chord) => {
    const full = chordSuffix ? `[${chord}${chordSuffix}]` : `[${chord}]`;
    insertAtCursor(full);
  };

  // La fila "Menor" ya incluye la "m" en la raíz (ej. "Cm"): anexar el sufijo
  // "m" o "m7" tal cual produciría notación inválida como "Cmm" o "Cmm7".
  const minorSuffix = (suffix) => {
    if (!suffix || suffix === 'm') return '';
    if (suffix === 'm7') return '7';
    return suffix;
  };

  const insertMinorChord = (chord) => {
    const suffix = minorSuffix(chordSuffix);
    insertAtCursor(suffix ? `[${chord}${suffix}]` : `[${chord}]`);
  };

  const insertSection = (section) => {
    insertAtCursor('\n' + section.tag + '\n');
  };

  // ── Duración de secciones (en compases) → sincronización de markers con el DAW ──
  // No calculamos "segundos exactos": el motor del DAW ya construye su grilla y sus
  // markers en compases a partir del BPM/métrica de la secuencia (ver CueTimeline.jsx),
  // así que aquí solo replicamos ese mismo cálculo, no inventamos uno nuevo.
  const detectedSections = React.useMemo(() => {
    return source.split('\n')
      .map(line => line.match(/^\{start_of_[a-z]+:\s*([^}]+)\}/i))
      .filter(Boolean)
      .map(m => m[1].trim());
  }, [source]);

  const [sectionBars, setSectionBars] = useState(() => {
    try {
      return song?.chart_section_bars ? JSON.parse(song.chart_section_bars) : [];
    } catch { return []; }
  });

  const updateSectionBars = (index, bars) => {
    setSectionBars(prev => {
      const next = [...prev];
      next[index] = Math.max(1, parseInt(bars, 10) || 1);
      return next;
    });
  };

  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | done | error

  const beatsPerBarFromSignature = (sig) => {
    const n = parseInt((sig || '4/4').split('/')[0], 10);
    return Number.isFinite(n) && n > 0 ? n : 4;
  };

  const handleSyncMarkersToDAW = async () => {
    if (!song?.id || detectedSections.length === 0) return;
    setSyncStatus('syncing');
    try {
      const { data: sequence, error } = await supabase
        .from('sequences')
        .select('id, bpm, time_signature, markers')
        .eq('song_id', song.id)
        .maybeSingle();

      if (error || !sequence) {
        alertDialog('Esta canción todavía no tiene una secuencia de audio subida al DAW — sube el audio primero.');
        setSyncStatus('error');
        return;
      }
      if (!sequence.bpm) {
        alertDialog('Esta secuencia no tiene tempo (BPM) definido en el DAW. Ponle un tempo primero para poder ubicar los marcadores por compás.');
        setSyncStatus('error');
        return;
      }

      const sampleRate = 44100;
      const beatsPerBar = beatsPerBarFromSignature(sequence.time_signature);
      const samplesPerBar = (sampleRate * 60 / sequence.bpm) * beatsPerBar;
      const palette = ['#38bdf8', '#10b981', '#fbbf24', '#ef4444', '#a855f7', '#f97316', '#64748b'];

      let cumulativeBar = 1;
      const generatedMarkers = detectedSections.map((label, i) => {
        const marker = {
          id: crypto.randomUUID(),
          bar: cumulativeBar,
          label,
          sample: Math.round((cumulativeBar - 1) * samplesPerBar),
          color: palette[i % palette.length],
          source: 'chart'
        };
        cumulativeBar += sectionBars[i] || 8;
        return marker;
      });

      // Conservamos cualquier marker puesto a mano en el DAW; solo reemplazamos
      // los que vinieron de una sincronización anterior desde el chart.
      const manualMarkers = (sequence.markers || []).filter(m => m.source !== 'chart');
      const mergedMarkers = [...manualMarkers, ...generatedMarkers].sort((a, b) => a.sample - b.sample);

      await supabase.from('sequences').update({ markers: mergedMarkers }).eq('id', sequence.id);
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 2500);
    } catch (e) {
      alertDialog('Error al sincronizar: ' + e.message);
      setSyncStatus('error');
    }
  };

  // ── Parse & Render ChordPro ──
  // Usamos debouncedSource para no bloquear la UI al escribir rápido
  const [debouncedSource, setDebouncedSource] = useState(source);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSource(source), 300);
    return () => clearTimeout(timer);
  }, [source]);

  const renderedHtml = React.useMemo(() => {
    if (!debouncedSource.trim()) return '<div class="cs-empty-state"><h3>Tu chart aparecerá aquí</h3><p>Escribe o pega tu letra en el editor y usa los botones de acordes para insertarlos.</p></div>';
    
    // Transposición manual usando Regex para preservar TODOS los espacios y saltos de línea originales.
    // Esto evita que ChordSheetJS colapse los espacios en blanco múltiples.
    let processedText = debouncedSource;
    if (transposeDelta !== 0) {
      processedText = processedText.replace(/\[([^\]]+)\]/g, (match, chord) => {
        return `[${transposeChordString(chord, transposeDelta)}]`;
      });
    }
    
    return renderPlainChords(processedText);
  }, [debouncedSource, transposeDelta]);

  function renderPlainChords(text) {
    const lines = text.split('\n');
    return lines.map(line => {
      let escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      // 1. Manejar etiquetas de secciones (ChordPro)
      let isHeader = false;
      escaped = escaped.replace(/\{start_of_[a-z]+:\s*([^}]+)\}/i, (match, p1) => {
        isHeader = true;
        return `<h2>${p1}</h2>`;
      });
      // Eliminar etiquetas de cierre
      escaped = escaped.replace(/\{end_of_[a-z]+\}/i, '');
      
      // 2. Procesar acordes
      const formatted = escaped.replace(
        /\[([^\]]+)\]/g,
        '<span class="cs-chord">$1</span>'
      );
      
      if (isHeader) return formatted; // Retorna directo el <h2>
      if (!formatted.trim()) return `<div class="cs-line">&nbsp;</div>`;
      
      return `<div class="cs-line">${formatted}</div>`;
    }).join('');
  }

  // ── Canvas Drawing ──
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const ERASER_RADIUS = 18; // px en coords del canvas — qué tan cerca hay que pasar de un trazo para borrarlo

  const eraseNear = (x, y) => {
    setStrokes(prev => prev.filter(stroke =>
      !stroke.points.some(p => Math.hypot(p.x - x, p.y - y) < ERASER_RADIUS)
    ));
  };

  const startDrawing = (e) => {
    if (!drawingActive) return;
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);
    if (tool === 'eraser') { eraseNear(x, y); return; }
    setCurrentStroke([{ x, y }]);
  };

  const draw = (e) => {
    if (!isDrawing || !drawingActive) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    if (tool === 'eraser') { eraseNear(x, y); return; }
    setCurrentStroke(prev => [...prev, { x, y }]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (tool === 'pen' && currentStroke.length > 1) {
      setStrokes(prev => [...prev, { points: currentStroke, color: penColor, size: penSize }]);
    }
    setCurrentStroke([]);
  };

  const undoStroke = () => setStrokes(prev => prev.slice(0, -1));

  // El canvas debe cubrir TODO el contenido scrolleable, no solo el viewport visible:
  // el contenedor tiene overflow:auto, así que un width/height:100% en CSS solo mide
  // la parte visible. Fijamos tamaño en px reales (bitmap == CSS size, sin escalado
  // del navegador) y lo mantenemos en sync ante cambios de layout (resize, edit/atril).
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeAndDraw = () => {
      const w = container.scrollWidth;
      const h = container.scrollHeight;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const allStrokes = [...strokes, ...(currentStroke.length > 1 ? [{ points: currentStroke, color: penColor, size: penSize }] : [])];
      allStrokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.globalAlpha = stroke.color === '#facc15' ? 0.4 : 0.8;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) { ctx.lineTo(stroke.points[i].x, stroke.points[i].y); }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    };

    resizeAndDraw();
    const ro = new ResizeObserver(resizeAndDraw);
    ro.observe(container);
    return () => ro.disconnect();
  }, [strokes, currentStroke, penColor, penSize, renderedHtml, mode]);

  // ── Actions ──
  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave({ chart_data: source, chart_annotations: JSON.stringify(strokes), chart_section_bars: JSON.stringify(sectionBars) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alertDialog('Error al guardar: ' + e.message);
    } finally { setIsSaving(false); }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const clearAnnotations = async () => {
    if (await confirmDialog({ message: '¿Borrar todas las anotaciones?', danger: true })) setStrokes([]);
  };

  const getCurrentKey = () => {
    const match = source.match(/\{key:\s*([A-Ga-g][#b♯♭]?m?)\}/i);
    if (!match) return null;
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const baseKey = match[1];
    const isMinor = baseKey.endsWith('m');
    const keyNote = isMinor ? baseKey.slice(0, -1) : baseKey;
    const idx = notes.indexOf(keyNote.charAt(0).toUpperCase() + (keyNote.length > 1 ? keyNote.charAt(1) : ''));
    if (idx === -1) return baseKey;
    const newIdx = (idx + transposeDelta + 12) % 12;
    return notes[newIdx] + (isMinor ? 'm' : '');
  };

  // ── Render ──
  const modalContent = (
    <div className="cs-overlay cs-fullscreen" ref={overlayRef}>
      <div className="cs-container cs-container-full">
        
        {/* ── Header ── */}
        <div className="cs-header">
          <div className="cs-header-left">
            <button className="mobile-nav-back" onClick={onClose}>
              <ArrowLeft size={20} />
            </button>
            <div className="cs-header-title-group">
              <FileText size={18} className="hide-mobile" />
              <h2>{song?.title || 'Nuevo Chart'}</h2>
              {getCurrentKey() && (
                <span className="cs-key-badge">Tono: {getCurrentKey()}</span>
              )}
            </div>
          </div>
          {/* ── Centered Title ── */}
          <div className="cs-header-center">
            <h1>{song?.title || 'Chart'}</h1>
          </div>
          <div className="cs-header-actions">
            {/* Transpose */}
            <div className="cs-transpose">
              <button className="cs-btn cs-btn-sm" onClick={() => setTransposeDelta(d => d - 1)} title="Bajar semitono">
                <ChevronDown size={16} />
              </button>
              <span className="cs-transpose-value">{transposeDelta > 0 ? '+' : ''}{transposeDelta}</span>
              <button className="cs-btn cs-btn-sm" onClick={() => setTransposeDelta(d => d + 1)} title="Subir semitono">
                <ChevronUp size={16} />
              </button>
            </div>

            {/* Mode toggle — ocultar Editar en modo readOnly */}
            <div className="cs-mode-toggle">
              {!readOnly && (
                <button className={`cs-btn ${mode === 'edit' ? 'cs-btn-active' : ''}`} onClick={() => setMode('edit')}>
                  <Edit3 size={15} /> Editar
                </button>
              )}
              <button className={`cs-btn ${mode === 'preview' ? 'cs-btn-active' : ''}`} onClick={() => {
                setMode('preview');
                if (!document.fullscreenElement) overlayRef.current?.requestFullscreen?.().catch(() => {});
              }}>
                <Eye size={15} /> Atril
              </button>
            </div>

            {/* Pantalla Completa real — para proyectar en TV/monitor externo sin barra del navegador */}
            <button className={`cs-btn cs-btn-icon ${isFullscreen ? 'cs-btn-active' : ''}`} onClick={toggleFullscreen} title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (proyección)'}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Auto-scroll (teleprompter) — siempre visible en readOnly para uso en vivo */}
            <div className={`cs-autoscroll ${readOnly ? '' : 'hide-mobile-small'}`}>
              <button 
                className={`cs-btn cs-btn-icon ${autoScrolling ? 'cs-btn-playing' : ''}`} 
                onClick={() => setAutoScrolling(!autoScrolling)}
                title={autoScrolling ? 'Pausar scroll' : 'Auto-scroll'}
              >
                {autoScrolling ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <div className={`cs-speed-picker ${readOnly ? '' : 'hide-tablet'}`}>
                {song?.bpm && (
                  <button
                    className={`cs-speed-btn ${tempoSync ? 'active' : ''}`}
                    onClick={() => setTempoSync(t => !t)}
                    title={`Sincronizar scroll con el tempo de la canción (${song.bpm} BPM)`}
                  >
                    🎵 {song.bpm}
                  </button>
                )}
                {!tempoSync && SCROLL_SPEEDS.map(sp => (
                  <button
                    key={sp}
                    className={`cs-speed-btn ${scrollSpeed === sp ? 'active' : ''}`}
                    onClick={() => setScrollSpeed(sp)}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>

            {/* Drawing tools */}
            <button className={`cs-btn cs-btn-icon ${drawingActive ? 'cs-btn-active' : ''}`} onClick={() => { setDrawingActive(!drawingActive); setTool('pen'); }} title="Lápiz">
              <Pencil size={16} />
            </button>
            {drawingActive && (
              <>
                <div className="cs-color-picker">
                  {['#facc15', '#ef4444', '#3b82f6', '#1a1a2e'].map(color => (
                    <button key={color} className={`cs-color-dot ${tool === 'pen' && penColor === color ? 'cs-color-active' : ''}`} style={{ background: color }} onClick={() => { setPenColor(color); setTool('pen'); }} />
                  ))}
                </div>
                <div className="cs-color-picker" title="Grosor del trazo">
                  {[2, 4, 8].map(size => (
                    <button
                      key={size}
                      className={`cs-btn cs-btn-icon ${tool === 'pen' && penSize === size ? 'cs-btn-active' : ''}`}
                      onClick={() => { setPenSize(size); setTool('pen'); }}
                      title={size === 2 ? 'Fino' : size === 4 ? 'Medio' : 'Grueso'}
                    >
                      <span style={{ display: 'inline-block', width: size + 2, height: size + 2, borderRadius: '50%', background: 'currentColor' }} />
                    </button>
                  ))}
                </div>
                <button className={`cs-btn cs-btn-icon ${tool === 'eraser' ? 'cs-btn-active' : ''}`} onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')} title="Goma — borra un trazo tocándolo">
                  <Eraser size={16} />
                </button>
                <button className="cs-btn cs-btn-icon" onClick={undoStroke} disabled={strokes.length === 0} title="Deshacer último trazo">
                  ↶
                </button>
                <button className="cs-btn cs-btn-icon cs-btn-danger" onClick={clearAnnotations} title="Borrar todas las anotaciones">
                  <X size={16} />
                </button>
              </>
            )}

            <button className="cs-btn cs-btn-icon" onClick={handleCopyText} title="Copiar texto">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>

            {onSave && (
              <button className={`cs-btn cs-btn-save ${saved ? 'cs-saved' : ''}`} onClick={handleSave} disabled={isSaving}>
                <Save size={16} /> {isSaving ? 'Guardando...' : saved ? '¡Listo!' : 'Guardar'}
              </button>
            )}

            <button className="cs-btn cs-btn-close hide-mobile" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="cs-body">

          {/* ── Editor Panel (left) ── */}
          {mode === 'edit' && (
            <div className="cs-editor-pane">
              {!readOnly && (
                <FirstUseTip
                  storageKey="bandly_tip_chartstudio"
                  title="Cómo armar tu chart"
                  items={[
                    'Escribe la letra y usa los botones de acordes para insertarlos donde va cada uno.',
                    'Los botones de "Secciones" agregan encabezados (Verso, Coro...) para ordenar la canción.',
                    'Cambia a "Atril" arriba para ver cómo se verá en vivo, con auto-scroll y anotaciones.'
                  ]}
                />
              )}
              {/* Chord Palette */}
              <div className="cs-chord-palette">
                <div className="cs-palette-header">
                  <span className="cs-palette-title">Acordes — Click para insertar</span>
                  <div className="cs-suffix-picker">
                    <button className={`cs-suffix-btn ${chordSuffix === '' ? 'active' : ''}`} onClick={() => setChordSuffix('')}>Base</button>
                    {EXTRA_CHORDS.map(s => (
                      <button key={s} className={`cs-suffix-btn ${chordSuffix === s ? 'active' : ''}`} onClick={() => setChordSuffix(s)}>{s}</button>
                    ))}
                  </div>
                </div>

                <div className="cs-chord-row">
                  <span className="cs-row-label">Mayor</span>
                  <div className="cs-chord-buttons">
                    {MAJOR_CHORDS.map(c => (
                      <button key={c} className="cs-chord-btn" onClick={() => insertChord(c)}>
                        {c}{chordSuffix}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="cs-chord-row">
                  <span className="cs-row-label">Menor</span>
                  <div className="cs-chord-buttons">
                    {MINOR_CHORDS.map(c => (
                      <button key={c} className="cs-chord-btn cs-chord-btn-minor" onClick={() => insertMinorChord(c)}>
                        {c}{minorSuffix(chordSuffix)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cs-chord-row">
                  <span className="cs-row-label">Secciones</span>
                  <div className="cs-chord-buttons">
                    {SECTIONS.map(s => (
                      <button key={s.label} className="cs-section-btn" onClick={() => insertSection(s)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {detectedSections.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', width: '100%', boxSizing: 'border-box', padding: '0.5rem 0' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Compases por sección (para el DAW)</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {detectedSections.map((label, i) => (
                        <div key={`${label}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '0.8rem' }}>
                          <span style={{ flex: 1, minWidth: 0, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                          <input
                            type="number"
                            min="1"
                            className="input-field"
                            value={sectionBars[i] ?? 8}
                            onChange={e => updateSectionBars(i, e.target.value)}
                            style={{ width: '64px', padding: '4px 8px', fontSize: '0.8rem', textAlign: 'center' }}
                          />
                        </div>
                      ))}
                    </div>
                    {song?.id && (
                      <button
                        className="cs-btn cs-btn-sm"
                        onClick={handleSyncMarkersToDAW}
                        disabled={syncStatus === 'syncing'}
                        style={{ marginTop: '4px', width: '100%', justifyContent: 'center' }}
                        title="Genera los marcadores de sección en el DAW usando el tempo real de la secuencia"
                      >
                        {syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'done' ? '✓ Sincronizado con el DAW' : syncStatus === 'error' ? 'Reintentar sincronización' : 'Sincronizar con el DAW'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Text Editor */}
              <textarea
                ref={textareaRef}
                className="cs-textarea"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder={`Escribe o pega tu letra aquí...

Tip: Usa los botones de arriba para insertar acordes.
Los acordes van entre corchetes antes de la sílaba:

[C]Aquí va la [Am]letra
[F]Segunda [G]línea

También puedes escribir directamente: [Acorde]
`}
                spellCheck={false}
              />
            </div>
          )}

          {/* ── Preview / Atril Panel ── */}
          <div className={`cs-preview-pane ${mode === 'edit' ? '' : 'cs-preview-full'}`}>
            {drawingActive && <div className="cs-draw-banner">🖊️ Modo Anotación Activo — Dibuja sobre el chart</div>}
            <div className="cs-rendered-chart" ref={containerRef} style={{ position: 'relative' }}>
              <div className="cs-chart-html" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
              <canvas
                ref={canvasRef}
                className={`cs-canvas ${drawingActive ? 'cs-canvas-active' : ''}`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
