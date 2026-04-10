import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChordSheetJS from 'chordsheetjs';
import { 
  X, ChevronUp, ChevronDown, Pencil, Eraser,
  Save, Maximize2, Minimize2, FileText, Copy, Check, Eye, Edit3,
  Play, Pause
} from 'lucide-react';
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

export default function ChartStudio({ song, onClose, onSave }) {
  // ── State ──
  const [source, setSource] = useState(song?.chart_data || '');
  const [mode, setMode] = useState(song?.chart_data ? 'preview' : 'edit'); // 'edit' or 'preview'
  const [transposeDelta, setTransposeDelta] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true); // Start fullscreen
  const [copied, setCopied] = useState(false);
  const [chordSuffix, setChordSuffix] = useState(''); // For 7, maj7, etc.

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

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollRef = useRef(null); // for auto-scroll animation

  // ── Auto-Scroll (Teleprompter) ──
  const [autoScrolling, setAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1); // 0.5, 1, 1.5, 2, 3
  const SCROLL_SPEEDS = [0.5, 1, 1.5, 2, 3];

  useEffect(() => {
    if (!autoScrolling) {
      if (scrollRef.current) cancelAnimationFrame(scrollRef.current);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const pixelsPerFrame = scrollSpeed * 0.8; // Base speed tuned for readability
    
    const tick = () => {
      if (!container) return;
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (container.scrollTop >= maxScroll) {
        setAutoScrolling(false); // Stop at bottom
        return;
      }
      container.scrollTop += pixelsPerFrame;
      scrollRef.current = requestAnimationFrame(tick);
    };
    
    scrollRef.current = requestAnimationFrame(tick);
    return () => { if (scrollRef.current) cancelAnimationFrame(scrollRef.current); };
  }, [autoScrolling, scrollSpeed]);

  // ── Insert chord at cursor ──
  const insertAtCursor = (text) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setSource(prev => prev + text);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = source.substring(0, start);
    const after = source.substring(end);
    const newSource = before + text + after;
    setSource(newSource);
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  };

  const insertChord = (chord) => {
    const full = chordSuffix ? `[${chord}${chordSuffix}]` : `[${chord}]`;
    insertAtCursor(full);
  };

  const insertSection = (section) => {
    insertAtCursor('\n' + section.tag + '\n');
  };

  // ── Parse & Render ChordPro ──
  const renderChart = useCallback(() => {
    if (!source.trim()) return '<div class="cs-empty-state"><h3>Tu chart aparecerá aquí</h3><p>Escribe o pega tu letra en el editor y usa los botones de acordes para insertarlos.</p></div>';
    try {
      const parser = new ChordSheetJS.ChordProParser();
      let parsedSong = parser.parse(source);
      if (transposeDelta !== 0) {
        parsedSong = parsedSong.transpose(transposeDelta);
      }
      const formatter = new ChordSheetJS.HtmlDivFormatter();
      return formatter.format(parsedSong);
    } catch (e) {
      return renderPlainChords(source);
    }
  }, [source, transposeDelta]);

  function renderPlainChords(text) {
    const lines = text.split('\n');
    return lines.map(line => {
      const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const formatted = escaped.replace(
        /\[([A-Ga-g][#b♯♭]?(?:m|min|maj|dim|aug|sus|add|7|9|11|13|6)?(?:\/[A-Ga-g][#b♯♭]?)?)\]/g,
        '<span class="cs-chord">$1</span>'
      );
      return `<div class="cs-line">${formatted || '&nbsp;'}</div>`;
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

  const startDrawing = (e) => {
    if (!drawingActive) return;
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCanvasCoords(e);
    setCurrentStroke([{ x, y }]);
  };

  const draw = (e) => {
    if (!isDrawing || !drawingActive) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    setCurrentStroke(prev => [...prev, { x, y }]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      setStrokes(prev => [...prev, { points: currentStroke, color: penColor, size: penSize }]);
    }
    setCurrentStroke([]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width = container.scrollWidth;
    canvas.height = container.scrollHeight;
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
  }, [strokes, currentStroke, penColor, penSize]);

  // ── Actions ──
  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave({ chart_data: source, chart_annotations: JSON.stringify(strokes) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert('Error al guardar: ' + e.message);
    } finally { setIsSaving(false); }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const clearAnnotations = () => {
    if (confirm('¿Borrar todas las anotaciones?')) setStrokes([]);
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
  return (
    <div className="cs-overlay cs-fullscreen">
      <div className="cs-container cs-container-full">
        
        {/* ── Header ── */}
        <div className="cs-header">
          <div className="cs-header-left">
            <FileText size={20} />
            <h2>{song?.title || 'Nuevo Chart'}</h2>
            {getCurrentKey() && (
              <span className="cs-key-badge">Tono: {getCurrentKey()}</span>
            )}
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

            {/* Mode toggle */}
            <div className="cs-mode-toggle">
              <button className={`cs-btn ${mode === 'edit' ? 'cs-btn-active' : ''}`} onClick={() => setMode('edit')}>
                <Edit3 size={15} /> Editar
              </button>
              <button className={`cs-btn ${mode === 'preview' ? 'cs-btn-active' : ''}`} onClick={() => setMode('preview')}>
                <Eye size={15} /> Atril
              </button>
            </div>

            {/* Auto-scroll (teleprompter) */}
            <div className="cs-autoscroll">
              <button 
                className={`cs-btn cs-btn-icon ${autoScrolling ? 'cs-btn-playing' : ''}`} 
                onClick={() => setAutoScrolling(!autoScrolling)}
                title={autoScrolling ? 'Pausar scroll' : 'Auto-scroll'}
              >
                {autoScrolling ? <Pause size={16} /> : <Play size={16} />}
              </button>
              {SCROLL_SPEEDS.map(sp => (
                <button 
                  key={sp}
                  className={`cs-speed-btn ${scrollSpeed === sp ? 'active' : ''}`}
                  onClick={() => setScrollSpeed(sp)}
                >
                  {sp}x
                </button>
              ))}
            </div>

            {/* Drawing tools */}
            <button className={`cs-btn cs-btn-icon ${drawingActive ? 'cs-btn-active' : ''}`} onClick={() => setDrawingActive(!drawingActive)} title="Lápiz">
              <Pencil size={16} />
            </button>
            {drawingActive && (
              <>
                <div className="cs-color-picker">
                  {['#facc15', '#ef4444', '#3b82f6', '#1a1a2e'].map(color => (
                    <button key={color} className={`cs-color-dot ${penColor === color ? 'cs-color-active' : ''}`} style={{ background: color }} onClick={() => setPenColor(color)} />
                  ))}
                </div>
                <button className="cs-btn cs-btn-icon cs-btn-danger" onClick={clearAnnotations} title="Borrar anotaciones">
                  <Eraser size={16} />
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

            <button className="cs-btn cs-btn-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="cs-body">

          {/* ── Editor Panel (left) ── */}
          {mode === 'edit' && (
            <div className="cs-editor-pane">
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
                      <button key={c} className="cs-chord-btn cs-chord-btn-minor" onClick={() => insertChord(c)}>
                        {c}{chordSuffix && chordSuffix !== 'm' ? chordSuffix : ''}
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
              <div className="cs-chart-html" dangerouslySetInnerHTML={{ __html: renderChart() }} />
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
}
