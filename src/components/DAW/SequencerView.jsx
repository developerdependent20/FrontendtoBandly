import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Scissors, Copy, Trash2, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Magnet, RotateCcw, Loader2 } from 'lucide-react';
import { safeInvoke } from '../../utils/tauri';
import { beatsPerBarFromSignature } from '../../utils/timelineLanes';
import {
  clipsFor, splitAt, moveClips, trimClip, duplicateClips, removeClips, pruneDefaults, snapTo,
} from '../../utils/clips';
import './Sequencer.css';

// ── Secuenciador (vista Arrange) ─────────────────────────────────────────
// Cada pista es una fila con sus clips. Se pueden mover, recortar, dividir, duplicar y borrar sin
// tocar el audio original. Los clips se guardan en cuadros del archivo en unidades "pitch 0" (ver
// utils/clips.js) y se dibujan en la línea de tiempo de reproducción (÷ pitch), igual que los
// markers. El motor recibe los cambios desde ProMixer; aquí solo se edita y se avisa con
// `onClipsChange`. El deshacer/rehacer es el global de ProMixer (Ctrl+Z).

const GUTTER = 176;
const LANE_H = 58;
const DRAG_THRESHOLD = 3;
const MAX_TIMELINE_PX = 30000; // límite del ancho de la línea de tiempo (los canvas no pasan de ~32k px)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const defaultLoadWaves = (buckets) => safeInvoke('get_track_waveforms', { buckets });

function fmtClock(s) {
  const t = Math.max(0, s);
  return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
}

// ── Ondas por pista (una consulta por canción) ───────────────────────────
const WAVES_IDLE = { status: 'idle', byId: {} };
const WAVES_LOADING = { status: 'loading', byId: {} };
function useTrackWaves(ready, songKey, loader) {
  const [state, setState] = useState({ token: null, status: 'idle', byId: {} });
  const token = ready ? String(songKey) : null;
  useEffect(() => {
    if (token == null) return undefined;
    let cancelled = false;
    Promise.resolve(loader(3000))
      .then((list) => {
        if (cancelled) return;
        const byId = {};
        for (const w of list || []) byId[String(w.id)] = w;
        setState({ token, status: list && list.length ? 'ready' : 'empty', byId });
      })
      .catch(() => { if (!cancelled) setState({ token, status: 'error', byId: {} }); });
    return () => { cancelled = true; };
  }, [token, loader]);
  if (token == null) return WAVES_IDLE;
  if (state.token !== token) return WAVES_LOADING;
  return state;
}

function drawWave(canvas, wave, clip, width, height, color) {
  const dpr = Math.min(window.devicePixelRatio || 1, width > 6000 ? 1 : 2);
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (!wave || !wave.peaks || !wave.peaks.length) return;
  const { peaks, frames_per_bucket: fpb } = wave;
  const mid = height / 2;
  const cols = Math.max(1, Math.floor(width));
  ctx.fillStyle = color;
  for (let x = 0; x < cols; x++) {
    const f0 = clip.src + (x / cols) * clip.len;
    const f1 = clip.src + ((x + 1) / cols) * clip.len;
    const b0 = Math.max(0, Math.floor(f0 / fpb));
    const b1 = Math.min(peaks.length - 1, Math.floor(f1 / fpb));
    let p = 0;
    for (let b = b0; b <= b1; b++) if (peaks[b] > p) p = peaks[b];
    const a = Math.pow(Math.min(1, p), 0.6) * (height / 2 - 2);
    ctx.fillRect(x, mid - a, 1, Math.max(1, a * 2));
  }
}

const ClipView = memo(function ClipView({ clip, left, width, color, wave, selected, onDown }) {
  const canvasRef = useRef(null);
  const h = LANE_H - 10;
  useEffect(() => {
    if (canvasRef.current) drawWave(canvasRef.current, wave, clip, width, h, color);
  }, [wave, clip, width, h, color]);
  return (
    <div
      className={`seq-clip${selected ? ' is-selected' : ''}`}
      style={{ left, width, '--clip': color }}
      onPointerDown={(e) => onDown(e, clip, e.target?.dataset?.edge === 'l' ? 'trimL' : e.target?.dataset?.edge === 'r' ? 'trimR' : 'move')}
    >
      <canvas ref={canvasRef} className="seq-clip-wave" style={{ width, height: h }} />
      <span className="seq-edge l" data-edge="l" />
      <span className="seq-edge r" data-edge="r" />
    </div>
  );
});

const Lane = memo(function Lane({ track, clips, wave, pxPerUi, pr, selKey, selected, gridStyle, totalPx, onClipDown, onBackgroundDown, onTrackUpdate, hasAudio }) {
  const color = track.color || '#f7f4ef';
  return (
    <div className={`seq-row${track.muted ? ' is-muted' : ''}`} style={{ height: LANE_H }}>
      <div className="seq-gutter" style={{ width: GUTTER }}>
        <span className="seq-dot" style={{ background: color }} />
        <span className="seq-name" title={track.name}>{track.name}</span>
        <button
          type="button" tabIndex={-1} className={`seq-ms${track.muted ? ' on mute' : ''}`} title="Silenciar"
          onClick={() => onTrackUpdate?.('mute', { trackId: track.id, muted: !track.muted })}
        >M</button>
        <button
          type="button" tabIndex={-1} className={`seq-ms${track.solo ? ' on solo' : ''}`} title="Solo"
          onClick={() => onTrackUpdate?.('solo', { trackId: track.id, solo: !track.solo })}
        >S</button>
      </div>
      <div
        className="seq-lane" style={{ width: totalPx, ...gridStyle }}
        data-sel={selKey}
        onPointerDown={(e) => onBackgroundDown(e)}
      >
        {!hasAudio && <span className="seq-lane-empty">sin audio cargado</span>}
        {hasAudio && clips.length === 0 && <span className="seq-lane-empty">pista en silencio (todos los clips borrados)</span>}
        {hasAudio && clips.map((c) => (
          <ClipView
            key={c.id} clip={c} color={color} wave={wave}
            left={(c.tl / pr) * pxPerUi} width={Math.max(2, (c.len / pr) * pxPerUi)}
            selected={selected.has(c.id)}
            onDown={(e, clip, mode) => onClipDown(e, track.id, clip, mode)}
          />
        ))}
      </div>
    </div>
  );
});

export default function SequencerView({
  tracks = [], clipsByTrack = {}, onClipsChange,
  playbackSample = 0, sampleRate = 44100, songSamples = 0, pitchRatio = 1,
  bpm = 120, hasTempo = true, timeSignature = '4/4',
  sections = [], isPlaying = false, onSeek, onTrackUpdate, onUndo, onRedo,
  stemsReady = false, songKey = '', arrangementActive = false,
  loadWaves = defaultLoadWaves,
}) {
  const sr = sampleRate > 1000 ? sampleRate : 44100;
  const pr = pitchRatio > 0 ? pitchRatio : 1;
  const beatsPerBar = beatsPerBarFromSignature(timeSignature);

  const waves = useTrackWaves(stemsReady, songKey, loadWaves);
  const framesByTrack = useMemo(() => {
    const out = {};
    for (const t of tracks) { const w = waves.byId[String(t.id)]; if (w) out[t.id] = w.frames; }
    return out;
  }, [tracks, waves.byId]);

  // ── Estado de edición ──
  const [selectedRaw, setSelected] = useState(() => new Set());
  const [draft, setDraft] = useState(null);       // clips provisionales mientras se arrastra
  const [snapMode, setSnapMode] = useState('bar'); // 'off' | 'beat' | 'bar'
  const [zoom, setZoom] = useState(1);
  const [viewW, setViewW] = useState(900);
  const scrollRef = useRef(null);
  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const draftRef = useRef(null);
  useLayoutEffect(() => { draftRef.current = draft; }, [draft]);

  // Nueva canción: nada seleccionado y zoom de ajuste (se ajusta durante el render, sin efecto).
  const [shownSong, setShownSong] = useState(songKey);
  if (shownSong !== songKey) {
    setShownSong(songKey);
    setSelected(new Set());
    setDraft(null);
    setZoom(1);
  }

  const effectiveMap = useMemo(() => (draft ? { ...clipsByTrack, ...draft } : clipsByTrack), [clipsByTrack, draft]);
  // Los clips seleccionados que ya no existen (por deshacer/rehacer/borrar) dejan de estar seleccionados.
  const selected = useMemo(() => {
    if (!selectedRaw.size) return selectedRaw;
    const alive = new Set();
    for (const t of tracks) for (const c of clipsFor(clipsByTrack, t.id, framesByTrack[t.id] ?? 0)) alive.add(c.id);
    const kept = [...selectedRaw].filter(id => alive.has(id));
    return kept.length === selectedRaw.size ? selectedRaw : new Set(kept);
  }, [selectedRaw, clipsByTrack, tracks, framesByTrack]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const update = () => setViewW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Escala: tiempo → píxeles ──
  const maxEndUi = useMemo(() => {
    let m = songSamples / pr;
    for (const t of tracks) {
      for (const c of clipsFor(effectiveMap, t.id, framesByTrack[t.id] ?? 0)) m = Math.max(m, (c.tl + c.len) / pr);
    }
    return m;
  }, [effectiveMap, tracks, framesByTrack, songSamples, pr]);
  const durSec = Math.max(1, maxEndUi / sr) + 4; // un poco de cola para poder mover clips hacia el final
  const fitPps = Math.max(1, (viewW - GUTTER - 24) / durSec);
  const maxZoom = Math.max(1, MAX_TIMELINE_PX / (fitPps * durSec));
  const zoomC = clamp(zoom, 1, maxZoom);
  const pps = fitPps * zoomC;
  const pxPerUi = pps / sr;
  const totalPx = Math.ceil(durSec * pps);

  // Rejilla en muestras de la línea de tiempo (las mismas unidades que CueTimeline).
  const samplesPerBeat = hasTempo && bpm > 0 ? (sr * 60) / bpm : 0;
  const samplesPerBar = samplesPerBeat * beatsPerBar;
  const beatPx = samplesPerBeat * pxPerUi;
  const barPx = samplesPerBar * pxPerUi;
  const grid = !hasTempo || snapMode === 'off' ? 0 : (snapMode === 'bar' ? samplesPerBar : samplesPerBeat);

  const gridStyle = useMemo(() => {
    if (!hasTempo || barPx < 4) return {};
    const layers = [`repeating-linear-gradient(to right, rgba(255,255,255,0.10) 0, rgba(255,255,255,0.10) 1px, transparent 1px, transparent ${barPx}px)`];
    if (beatPx >= 14) layers.push(`repeating-linear-gradient(to right, rgba(255,255,255,0.045) 0, rgba(255,255,255,0.045) 1px, transparent 1px, transparent ${beatPx}px)`);
    return { backgroundImage: layers.join(',') };
  }, [hasTempo, barPx, beatPx]);

  // Siempre se leen los valores más recientes desde los manejadores de arrastre (viven fuera del render).
  const latest = useRef({});
  useLayoutEffect(() => {
    latest.current = { pxPerUi, pr, grid, clipsByTrack, framesByTrack, effectiveMap, onClipsChange, tracks, selected, playbackSample };
  });

  // ── Seguir el cursor mientras suena ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isPlaying || dragRef.current) return;
    const x = playbackSample * pxPerUi;
    if (x < el.scrollLeft + 40 || x > el.scrollLeft + el.clientWidth - GUTTER - 80) {
      el.scrollLeft = Math.max(0, x - 120);
    }
  }, [playbackSample, isPlaying, pxPerUi]);

  // ── Zoom con Ctrl + rueda, centrado en el puntero ──
  const zoomAnchor = useRef(null);
  const ppsRef = useRef(pps);
  useLayoutEffect(() => { ppsRef.current = pps; }, [pps]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left - GUTTER;
      zoomAnchor.current = { sec: (cursorX + el.scrollLeft) / ppsRef.current, cursorX };
      setZoom(z => z * (e.deltaY < 0 ? 1.2 : 1 / 1.2));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  useLayoutEffect(() => {
    const a = zoomAnchor.current;
    const el = scrollRef.current;
    if (!a || !el) return;
    zoomAnchor.current = null;
    el.scrollLeft = Math.max(0, a.sec * pps - a.cursorX);
  }, [pps]);

  // ── Aplicar un cambio ──
  const commit = useCallback((overrides) => {
    const L = latest.current;
    const next = pruneDefaults({ ...L.clipsByTrack, ...overrides }, L.framesByTrack);
    L.onClipsChange?.(next);
  }, []);

  const tracksOfSelection = useCallback((sel, base) => {
    const L = latest.current;
    const groups = [];
    for (const t of L.tracks) {
      const frames = L.framesByTrack[t.id];
      if (frames == null) continue;
      const list = clipsFor(base, t.id, frames);
      const ids = new Set(list.filter(c => sel.has(c.id)).map(c => c.id));
      if (ids.size) groups.push({ trackId: t.id, frames, list, ids });
    }
    return groups;
  }, []);

  // ── Arrastre de clips (mover / recortar) ──
  const onWindowMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    d.moved = true;
    const L = latest.current;
    const deltaUi = dx / L.pxPerUi;
    const snapUi = (v) => (L.grid > 0 && !e.altKey ? snapTo(v, L.grid) : v);
    const out = {};
    if (d.mode === 'move') {
      const origUi = d.clip.tl / L.pr;
      const deltaFile = (snapUi(origUi + deltaUi) - origUi) * L.pr;
      for (const g of tracksOfSelection(d.sel, d.base)) out[g.trackId] = moveClips(g.list, g.ids, deltaFile);
    } else {
      const frames = L.framesByTrack[d.trackId];
      const edgeFile = d.mode === 'trimL' ? d.clip.tl : d.clip.tl + d.clip.len;
      const posFile = snapUi(edgeFile / L.pr + deltaUi) * L.pr;
      out[d.trackId] = trimClip(clipsFor(d.base, d.trackId, frames), d.clip.id, d.mode === 'trimL' ? 'l' : 'r', posFile, frames);
    }
    setDraft(out);
  }, [tracksOfSelection]);

  const cancelDragRef = useRef(null);

  const startDrag = useCallback((e, trackId, clip, mode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    rootRef.current?.focus({ preventScroll: true });
    const L = latest.current;
    let sel = L.selected;
    if (e.shiftKey) {
      sel = new Set(sel);
      if (sel.has(clip.id)) { sel.delete(clip.id); setSelected(sel); return; }
      sel.add(clip.id);
      setSelected(sel);
    } else if (!sel.has(clip.id)) {
      sel = new Set([clip.id]);
      setSelected(sel);
    }
    if (L.framesByTrack[trackId] == null) return;
    dragRef.current = { mode, trackId, clip, startX: e.clientX, sel: new Set(sel), base: L.effectiveMap, moved: false };

    function finish(commitIt) {
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      cancelDragRef.current = null;
      const d = dragRef.current;
      dragRef.current = null;
      const pending = draftRef.current;
      setDraft(null);
      if (commitIt && d?.moved && pending) commit(pending);
    }
    function onUp() { finish(true); }
    function onCancel() { finish(false); }
    cancelDragRef.current = onCancel;
    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }, [onWindowMove, commit]);

  const onBackgroundDown = useCallback((e) => {
    rootRef.current?.focus({ preventScroll: true });
    if (!e.shiftKey) setSelected(prev => (prev.size ? new Set() : prev));
  }, []);

  // ── Acciones (botones y teclado) ──
  const doSplit = useCallback(() => {
    const L = latest.current;
    const at = Math.round(L.playbackSample * L.pr); // cursor, en cuadros del archivo (pitch 0)
    const ids = L.selected.size ? L.selected : null;
    const out = {};
    let any = false;
    for (const t of L.tracks) {
      const frames = L.framesByTrack[t.id];
      if (frames == null) continue;
      const r = splitAt(clipsFor(L.clipsByTrack, t.id, frames), at, ids);
      if (r.changed) { out[t.id] = r.clips; any = true; }
    }
    if (any) commit(out);
  }, [commit]);

  const doDuplicate = useCallback(() => {
    const L = latest.current;
    if (!L.selected.size) return;
    const out = {};
    const created = new Set();
    for (const g of tracksOfSelection(L.selected, L.clipsByTrack)) {
      const r = duplicateClips(g.list, g.ids);
      out[g.trackId] = r.clips;
      r.newIds.forEach(id => created.add(id));
    }
    if (created.size) { commit(out); setSelected(created); }
  }, [commit, tracksOfSelection]);

  const doDelete = useCallback(() => {
    const L = latest.current;
    if (!L.selected.size) return;
    const out = {};
    for (const g of tracksOfSelection(L.selected, L.clipsByTrack)) out[g.trackId] = removeClips(g.list, g.ids);
    commit(out);
    setSelected(new Set());
  }, [commit, tracksOfSelection]);

  // Restaura las pistas con clips seleccionados (o TODAS si no hay selección) a su audio entero.
  const doReset = useCallback(() => {
    const L = latest.current;
    const touched = L.selected.size ? tracksOfSelection(L.selected, L.clipsByTrack).map(g => g.trackId) : Object.keys(L.clipsByTrack);
    if (!touched.length) return;
    const next = { ...L.clipsByTrack };
    for (const id of touched) delete next[id];
    L.onClipsChange?.(next);
    setSelected(new Set());
  }, [tracksOfSelection]);

  const onKeyDown = useCallback((e) => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const mod = e.ctrlKey || e.metaKey;
    const k = (e.key || '').toLowerCase();
    if (!mod && k === 's') { e.preventDefault(); doSplit(); }
    else if (!mod && (k === 'delete' || k === 'backspace')) { e.preventDefault(); doDelete(); }
    else if (mod && k === 'd') { e.preventDefault(); doDuplicate(); }
    else if (mod && k === 'a') {
      e.preventDefault();
      const all = new Set();
      for (const t of latest.current.tracks) for (const c of clipsFor(latest.current.clipsByTrack, t.id, latest.current.framesByTrack[t.id] ?? 0)) all.add(c.id);
      setSelected(all);
    } else if (k === 'escape') {
      if (dragRef.current) cancelDragRef.current?.();
      else setSelected(new Set());
    }
  }, [doSplit, doDelete, doDuplicate]);

  // ── Regla: clic o arrastre para mover el cursor ──
  const seekFromEvent = useCallback((e, el) => {
    const L = latest.current;
    const rect = el.getBoundingClientRect();
    let ui = Math.max(0, (e.clientX - rect.left) / L.pxPerUi);
    if (L.grid > 0 && !e.altKey) ui = snapTo(ui, L.grid);
    onSeek?.(ui);
  }, [onSeek]);
  const onRulerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    el.setPointerCapture?.(e.pointerId);
    seekFromEvent(e, el);
    const move = (ev) => seekFromEvent(ev, el);
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  }, [seekFromEvent]);

  // Marcas de la regla (compases con tempo; tiempo sin él)
  const rulerMarks = useMemo(() => {
    const marks = [];
    if (hasTempo && barPx > 0) {
      const step = [1, 2, 4, 8, 16, 32, 64].find(s => s * barPx >= 56) || 64;
      const bars = Math.ceil(totalPx / barPx);
      for (let i = 0; i < bars; i += step) marks.push({ x: i * barPx, label: String(i + 1) });
    } else {
      const step = [1, 2, 5, 10, 15, 30, 60, 120].find(s => s * pps >= 56) || 120;
      for (let s = 0; s < durSec; s += step) marks.push({ x: s * pps, label: fmtClock(s) });
    }
    return marks;
  }, [hasTempo, barPx, totalPx, pps, durSec]);

  const clipCount = useMemo(() => tracks.reduce((n, t) => n + clipsFor(effectiveMap, t.id, framesByTrack[t.id] ?? 0).length, 0), [tracks, effectiveMap, framesByTrack]);
  const edited = Object.keys(clipsByTrack || {}).length;

  if (!tracks.length) {
    return <div className="seq-empty">Carga una secuencia para empezar a editar clips.</div>;
  }

  const ready = waves.status === 'ready';
  return (
    <div className="seq-root" ref={rootRef} tabIndex={0} onKeyDown={onKeyDown}>
      <div className="seq-toolbar">
        <button type="button" tabIndex={-1} className="seq-tool" onClick={doSplit} disabled={!ready} title="Dividir en el cursor (S). Con clips seleccionados solo esos; sin selección, todas las pistas.">
          <Scissors size={14} /> Dividir <kbd>S</kbd>
        </button>
        <button type="button" tabIndex={-1} className="seq-tool" onClick={doDuplicate} disabled={!ready || !selected.size} title="Duplicar la selección a continuación (Ctrl+D)">
          <Copy size={14} /> Duplicar <kbd>Ctrl+D</kbd>
        </button>
        <button type="button" tabIndex={-1} className="seq-tool" onClick={doDelete} disabled={!ready || !selected.size} title="Borrar la selección (Supr): deja silencio">
          <Trash2 size={14} /> Borrar <kbd>Supr</kbd>
        </button>
        <span className="seq-sep" />
        <button type="button" tabIndex={-1} className="seq-tool icon" onClick={onUndo} title="Deshacer (Ctrl+Z)"><Undo2 size={14} /></button>
        <button type="button" tabIndex={-1} className="seq-tool icon" onClick={onRedo} title="Rehacer (Ctrl+Shift+Z)"><Redo2 size={14} /></button>
        <button type="button" tabIndex={-1} className="seq-tool" onClick={doReset} disabled={!ready || (!edited && !selected.size)} title="Volver al audio original: de los clips seleccionados, o de todas las pistas si no hay selección">
          <RotateCcw size={14} /> Restaurar
        </button>
        <span className="seq-sep" />
        <label className="seq-snap" title={hasTempo ? 'Imán: los clips y el cursor se pegan a la rejilla (mantén Alt para ignorarla)' : 'Esta canción no tiene tempo: sin rejilla'}>
          <Magnet size={14} />
          <select tabIndex={-1} value={hasTempo ? snapMode : 'off'} disabled={!hasTempo} onChange={(e) => setSnapMode(e.target.value)}>
            <option value="bar">Compás</option>
            <option value="beat">Tiempo</option>
            <option value="off">Libre</option>
          </select>
        </label>
        <span className="seq-grow" />
        <span className="seq-info">{clipCount} clips{edited ? ` · ${edited} pista${edited > 1 ? 's' : ''} editada${edited > 1 ? 's' : ''}` : ''}</span>
        <button type="button" tabIndex={-1} className="seq-tool icon" onClick={() => setZoom(z => z / 1.4)} title="Alejar"><ZoomOut size={14} /></button>
        <button type="button" tabIndex={-1} className="seq-tool icon" onClick={() => setZoom(z => z * 1.4)} title="Acercar (Ctrl + rueda)"><ZoomIn size={14} /></button>
        <button type="button" tabIndex={-1} className="seq-tool icon" onClick={() => { setZoom(1); if (scrollRef.current) scrollRef.current.scrollLeft = 0; }} title="Ajustar a la canción"><Maximize2 size={14} /></button>
      </div>

      {arrangementActive && (
        <div className="seq-note">Hay un arreglo de secciones activo: aquí los clips se editan sobre la línea de tiempo original de la canción, y el arreglo se aplica después.</div>
      )}

      <div className="seq-scroll" ref={scrollRef}>
        <div className="seq-content" style={{ width: GUTTER + totalPx }}>
          {/* Regla + secciones (fijas arriba) */}
          <div className="seq-head">
            <div className="seq-gutter head" style={{ width: GUTTER }}>
              <span className="seq-clock mono-data">{fmtClock(playbackSample / sr)}</span>
            </div>
            <div className="seq-ruler-wrap" style={{ width: totalPx }}>
              <div className="seq-ruler" onPointerDown={onRulerDown}>
                {rulerMarks.map(m => (
                  <span key={m.x} className="seq-tick" style={{ left: m.x }}>{m.label}</span>
                ))}
              </div>
              <div className="seq-sections">
                {sections.map(s => (
                  <button
                    key={s.uid} type="button" tabIndex={-1} className="seq-section" title={s.label}
                    style={{ left: (s.start / pr) * pxPerUi, width: Math.max(3, ((s.end - s.start) / pr) * pxPerUi), '--sec': s.color || '#7d7d7c' }}
                    onClick={() => onSeek?.(s.start / pr)}
                  >{s.label}</button>
                ))}
              </div>
            </div>
          </div>

          {waves.status === 'loading' && (
            <div className="seq-status"><Loader2 size={16} className="animate-spin" /> Leyendo las ondas de cada pista…</div>
          )}
          {waves.status === 'empty' && (
            <div className="seq-status">Las ondas por pista solo están disponibles en la aplicación de escritorio, con la secuencia cargada.</div>
          )}
          {waves.status === 'error' && (
            <div className="seq-status err">No se pudieron leer las ondas de las pistas.</div>
          )}
          {waves.status === 'idle' && (
            <div className="seq-status">Esperando a que el motor termine de cargar las pistas…</div>
          )}

          {tracks.map((t) => {
            const frames = framesByTrack[t.id];
            const hasAudio = frames != null;
            const list = hasAudio ? clipsFor(effectiveMap, t.id, frames) : [];
            const selKey = list.filter(c => selected.has(c.id)).map(c => c.id).join(',');
            return (
              <Lane
                key={t.id} track={t} clips={list} wave={waves.byId[String(t.id)]} hasAudio={hasAudio}
                pxPerUi={pxPerUi} pr={pr} selKey={selKey} selected={selected}
                gridStyle={gridStyle} totalPx={totalPx}
                onClipDown={startDrag} onBackgroundDown={onBackgroundDown} onTrackUpdate={onTrackUpdate}
              />
            );
          })}

          {/* Cursor de reproducción */}
          <div className="seq-playhead" style={{ transform: `translateX(${GUTTER + playbackSample * pxPerUi}px)` }} />
        </div>
      </div>
    </div>
  );
}
