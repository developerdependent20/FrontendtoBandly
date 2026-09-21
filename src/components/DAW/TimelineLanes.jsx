import React, { useState, useRef, useEffect, memo } from 'react';
import { Flag, Mic2, Lightbulb, Wand2, Plus, Trash2, Play, X, Piano } from 'lucide-react';
import { SECTION_PRESETS, LIGHT_COLOR, displayName, shortName, sectionTone, mutedColor } from '../../utils/timelineLanes';

const LYRIC_TONE = '#a8a8a6';
const LIGHT_TONE = mutedColor(LIGHT_COLOR);

// ── Líneas de la timeline ────────────────────────────────────────────────
// Tres pistas de eventos debajo de la onda, con el mismo zoom/scroll:
//   SECCIONES → markers del DAW (se generan solos desde la pista CUE)
//   LETRAS    → qué diapositiva de Presenter sale en cada momento
//   LUCES     → qué escena de Bandly Lights se dispara en cada momento
// Las tres llegan a Presenter/Lights por presenter_state.active_marker, que es
// lo que esas apps ya escuchan: no hubo que tocarlas.
//
// Uso: clic en un bloque = entrar con 2 compases de conteo, Shift+clic = entrar directo,
// doble clic = editar, arrastrar = mover, doble clic en vacío = agregar.
// Atajos en vivo: L = siguiente letra aquí, K = cue de luz aquí.

export const LANE_GUTTER = 104;
const LANE_H = 30;

const isTyping = () => {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

const firstLine = (text) => (text || '').split('\n').map(s => s.trim()).find(Boolean) || '(vacía)';

const TimelineLanes = memo(({
  view,                 // { start, span } — fracción visible de la canción
  totalSamples,         // largo de la timeline (unidades de reproducción)
  playbackSample,
  sampleRate,
  snap,                 // { beat: fn(t)->t, bar: fn(t)->t, toBar: fn(t)->n }
  sections,             // [{ id, label, color, sample, cueGroup, autoLabel }]
  sectionsEditable,
  lyricEvents,          // [{ key, id, t, slideId }]
  lightEvents,          // [{ key, id, t, scene, color }]
  slides,               // diapositivas de Presenter para esta canción
  hasCueTrack,
  isDetecting,
  lightScenes = [],     // nombres de escenas publicados por Bandly Lights
  actions,              // ver ProMixer: laneActions
  onSeek,
  onJump,             // (posición, { immediate })
  midi = null,        // asignación MIDI de secciones
  midiUid = (id) => id,
}) => {
  const [editor, setEditor] = useState(null); // { lane, id|null, t, x, y }
  const [drag, setDrag] = useState(null);     // { lane, id, startX, width, t0, t, moved }
  const [flash, setFlash] = useState(null);
  const lyricsRowRef = useRef(null);
  const lightsRowRef = useRef(null);

  const pToPct = (p) => ((p - view.start) / view.span) * 100;
  const tToPct = (t) => pToPct(totalSamples > 0 ? t / totalSamples : 0);
  const xToT = (clientX, el) => {
    const r = el.getBoundingClientRect();
    const p = view.start + ((clientX - r.left) / r.width) * view.span;
    return Math.max(0, Math.min(totalSamples, p * totalSamples));
  };
  const visible = (t0, t1) => {
    const a = tToPct(t0), b = tToPct(t1);
    return b >= 0 && a <= 100;
  };

  const showFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2200);
  };

  const openEditorAtT = (lane, id, t, rowEl) => {
    if (!rowEl) return;
    const r = rowEl.getBoundingClientRect();
    const x = r.left + (Math.max(0, Math.min(100, tToPct(t))) / 100) * r.width;
    setEditor({ lane, id, t, x, y: r.bottom + 6 });
  };

  // ── Atajos en vivo (L / K) ──
  // El listener se registra una sola vez y lee todo de este ref: así la
  // tecla siempre ve la posición actual, no la del render en que se armó.
  const live = useRef({});
  useEffect(() => {
    live.current = { playbackSample, lyricEvents, slides, snap, sampleRate, actions, openEditorAtT, showFlash, view, totalSamples, sectionsEditable, onSeek, onJump };
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || isTyping()) return;
      const k = (e.key || '').toLowerCase();
      const isL = e.code === 'KeyL' || k === 'l';
      const isK = e.code === 'KeyK' || k === 'k';
      if (!isL && !isK) return;
      e.preventDefault();
      const s = live.current;
      if (isL) {
        if (!s.slides.length) { s.showFlash('Sin letra en Presenter'); return; }
        // Al tocar en vivo uno reacciona tarde: se adelanta ~150ms y se
        // alinea al tiempo más cercano, que es donde cambia la frase.
        const t = s.snap.beat(Math.max(0, s.playbackSample - s.sampleRate * 0.15));
        const prev = [...s.lyricEvents].reverse().find(ev => ev.t <= t);
        const prevIdx = prev ? s.slides.findIndex(sl => sl.id === prev.slideId) : -1;
        const next = s.slides[Math.min(s.slides.length - 1, prevIdx + 1)];
        s.actions.addLyric(t, next.id);
        s.showFlash(`Letra ${s.slides.indexOf(next) + 1}: ${firstLine(next.text)}`);
      } else {
        s.openEditorAtT('light', null, s.snap.beat(s.playbackSample), lightsRowRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Arrastrar / clic en items ──
  // El arrastre escucha en window (no en la fila): así sigue funcionando
  // aunque el mouse salga de la línea. Soltar un item también dispara el
  // click de la fila (seek); este flag lo salta.
  const suppressRowClick = useRef(false);
  const dragRef = useRef(null);
  const onItemPointerDown = (e, lane, item) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const row = e.currentTarget.parentElement;
    const d = { lane, id: item.id, startX: e.clientX, width: row.getBoundingClientRect().width, t0: item.t, t: item.t, moved: false, row };
    dragRef.current = d;
    setDrag(d);

    const onMove = (ev) => {
      const cur = dragRef.current;
      if (!cur) return;
      const dx = ev.clientX - cur.startX;
      if (!cur.moved && Math.abs(dx) < 4) return;
      const s = live.current;
      if (cur.lane === 'section' && !s.sectionsEditable) return;
      const dt = (dx / cur.width) * s.view.span * s.totalSamples;
      const raw = Math.max(0, Math.min(s.totalSamples, cur.t0 + dt));
      const t = cur.lane === 'section' ? s.snap.bar(raw) : s.snap.beat(raw);
      dragRef.current = { ...cur, t, moved: true };
      setDrag(dragRef.current);
    };
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const cur = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!cur) return;
      suppressRowClick.current = true;
      setTimeout(() => { suppressRowClick.current = false; }, 350);
      const s = live.current;
      if (cur.moved) {
        if (cur.t !== cur.t0) s.actions.moveItem(cur.lane, cur.id, cur.t, s.snap.toBar(cur.t));
      } else {
        // Clic: entra con 2 compases de conteo. Shift+clic: directo.
        s.onJump(cur.t0, { immediate: ev.shiftKey });
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  const openItemEditor = (e, lane, item) => {
    e.stopPropagation();
    const row = e.currentTarget.parentElement;
    setEditor({ lane, id: item.id, t: item.t, x: e.clientX, y: row.getBoundingClientRect().bottom + 6 });
  };
  const posOf = (lane, item) => (drag && drag.moved && drag.lane === lane && drag.id === item.id ? drag.t : item.t);

  const onRowClick = (e) => {
    if (e.target !== e.currentTarget || suppressRowClick.current) return;
    const t = xToT(e.clientX, e.currentTarget);
    onSeek(totalSamples > 0 ? t / totalSamples : 0);
  };
  const onRowDoubleClick = (e, lane) => {
    if (e.target !== e.currentTarget || suppressRowClick.current) return;
    const raw = xToT(e.clientX, e.currentTarget);
    if (lane === 'section') {
      if (!sectionsEditable) return;
      openEditorAtT('section', null, snap.bar(raw), e.currentTarget);
    } else if (lane === 'lyric') {
      if (!slides.length) { showFlash('Sin letra en Presenter'); return; }
      openEditorAtT('lyric', null, snap.beat(raw), e.currentTarget);
    } else {
      openEditorAtT('light', null, snap.beat(raw), e.currentTarget);
    }
  };

  const rowProps = (lane) => ({
    onClick: onRowClick,
    onDoubleClick: (e) => onRowDoubleClick(e, lane),
    style: {
      position: 'relative', flex: 1, height: LANE_H, overflow: 'hidden',
      background: 'rgba(255,255,255,0.025)', borderRadius: 6,
      border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
    }
  });

  // Bloques que van de un evento al siguiente (secciones y letras).
  const renderBlocks = (lane, items, getLabel, getColor, getBadge, getFullLabel) => {
    const sorted = items.map(it => ({ ...it, _t: posOf(lane, it) })).sort((a, b) => a._t - b._t);
    return sorted.map((it, i) => {
      const end = i + 1 < sorted.length ? sorted[i + 1]._t : totalSamples;
      if (!visible(it._t, end)) return null;
      // Si el bloque empieza antes de la vista (con zoom), se recorta al borde
      // izquierdo: así su nombre sigue a la vista en vez de quedar escondido.
      const clipped = tToPct(it._t) < 0;
      const left = Math.max(0, tToPct(it._t)), right = Math.min(100.5, tToPct(end));
      const color = getColor(it);
      const active = playbackSample >= it._t && playbackSample < end;
      const badge = getBadge ? getBadge(it, i) : null;
      return (
        <div
          key={it.key || it.id}
          onPointerDown={(e) => onItemPointerDown(e, lane, { ...it, t: it._t })}
          onDoubleClick={(e) => openItemEditor(e, lane, { ...it, t: it._t })}
          title={`${getFullLabel ? getFullLabel(it) : getLabel(it)} — clic: con conteo · Shift+clic: directo · doble clic: editar`}
          style={{
            position: 'absolute', top: 2, bottom: 2,
            left: `${left}%`, width: `calc(${Math.max(0, right - left)}% - 2px)`,
            background: active ? `${color}38` : `${color}1c`,
            borderLeft: clipped ? 'none' : `2px solid ${color}`, borderRadius: clipped ? '0 4px 4px 0' : 4,
            color: active ? '#fff' : 'rgba(255,255,255,0.82)',
            fontSize: '0.78rem', fontWeight: 500, letterSpacing: '0',
            padding: '0 7px', display: 'flex', alignItems: 'center', gap: 6,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            cursor: 'pointer', userSelect: 'none', touchAction: 'none',
          }}
        >
          {badge && (
            <span title={`Atajo: tecla ${badge}`} style={{
              flexShrink: 0, fontSize: '0.62rem', fontWeight: 500, lineHeight: 1,
              padding: '2px 5px', borderRadius: 6,
              background: 'rgba(0,0,0,0.35)', color: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.18)',
            }}>{badge}</span>
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{getLabel(it)}</span>
        </div>
      );
    });
  };

  const sectionItems = sections.map(m => ({ ...m, t: m.sample }));
  const slideById = Object.fromEntries(slides.map((s, i) => [s.id, { ...s, idx: i }]));

  const addNextLyricHere = () => {
    if (!slides.length) { showFlash('Sin letra en Presenter'); return; }
    openEditorAtT('lyric', null, snap.beat(playbackSample), lyricsRowRef.current);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4, position: 'relative' }}>
      {/* SECCIONES */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Gutter icon={<Flag size={12} color="rgba(255,255,255,0.5)" />} label="SECCIONES">
          <MiniBtn
            onClick={() => actions.detectCues()}
            disabled={!hasCueTrack || isDetecting || !sectionsEditable}
            title={hasCueTrack ? 'Leer la pista de guía' : 'Sin pista de guía'}
          >
            <Wand2 size={11} className={isDetecting ? 'animate-pulse' : ''} />
          </MiniBtn>
        </Gutter>
        <div {...rowProps('section')}>
          {renderBlocks('section', sectionItems, m => shortName(m), m => sectionTone(m), (m, i) => (!m.autoLabel && i < 9 ? String(i + 1) : null), m => displayName(m.label))}
        </div>
      </div>

      {/* LETRAS */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Gutter icon={<Mic2 size={12} color="rgba(255,255,255,0.5)" />} label="LETRAS">
          <MiniBtn onClick={addNextLyricHere} title="Diapositiva aquí (L)">
            <Plus size={10} />L
          </MiniBtn>
        </Gutter>
        <div ref={lyricsRowRef} {...rowProps('lyric')}>
          {renderBlocks(
            'lyric', lyricEvents,
            ev => { const s = slideById[ev.slideId]; return s ? `${s.idx + 1} · ${firstLine(s.text)}` : '(diapositiva borrada)'; },
            ev => (slideById[ev.slideId] ? LYRIC_TONE : '#7d7d7c')
          )}
          {lyricEvents.length === 0 && !slides.length && (
            <span style={{ position: 'absolute', left: 8, top: 8, fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>Sin letra</span>
          )}
        </div>
      </div>

      {/* LUCES */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Gutter icon={<Lightbulb size={12} color="rgba(255,255,255,0.5)" />} label="LUCES">
          <MiniBtn onClick={() => openEditorAtT('light', null, snap.beat(playbackSample), lightsRowRef.current)} title="Cue de luz aquí (K)">
            <Plus size={10} />K
          </MiniBtn>
        </Gutter>
        <div ref={lightsRowRef} {...rowProps('light')}>
          {lightEvents.map(ev => {
            const t = posOf('light', ev);
            if (!visible(t, t)) return null;
            const color = LIGHT_TONE;
            const passed = playbackSample >= t;
            // Si Lights publicó sus escenas y esta no está, el cue no va a hacer nada.
            const missing = lightScenes.length > 0 && !lightScenes.some(n => n.trim().toLowerCase() === ev.scene.trim().toLowerCase());
            return (
              <div
                key={ev.key}
                onPointerDown={(e) => onItemPointerDown(e, 'light', { ...ev, t })}
                onDoubleClick={(e) => openItemEditor(e, 'light', { ...ev, t })}
                title={(missing ? `${ev.scene} — no existe en Bandly Lights` : ev.scene) + ' — clic: con conteo · doble clic: editar'}
                style={{
                  position: 'absolute', top: 3, bottom: 3, left: `${tToPct(t)}%`,
                  display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4,
                  cursor: 'pointer', userSelect: 'none', touchAction: 'none',
                  transform: 'translateX(-6px)',
                }}
              >
                <div style={{
                  width: 10, height: 10, transform: 'rotate(45deg)', flexShrink: 0,
                  background: passed && !missing ? color : 'transparent', border: `2px ${missing ? 'dashed' : 'solid'} ${missing ? '#f87171' : color}`,
                }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: missing ? '#f87171' : 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', textDecoration: missing ? 'line-through' : 'none' }}>{ev.scene}</span>
              </div>
            );
          })}
        </div>
      </div>

      {flash && (
        <div style={{
          position: 'absolute', right: 0, top: -26, zIndex: 60, pointerEvents: 'none',
          background: 'rgba(23, 23, 26,0.95)', border: '1px solid rgba(247, 244, 239, 0.3)',
          color: '#e9d5ff', fontSize: '0.65rem', fontWeight: 500, padding: '4px 10px', borderRadius: 6,
          maxWidth: 360, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{flash}</div>
      )}

      {editor && (
        <LaneEditor
          editor={editor}
          onClose={() => setEditor(null)}
          sections={sections}
          sectionsEditable={sectionsEditable}
          lyricEvents={lyricEvents}
          lightEvents={lightEvents}
          lightScenes={lightScenes}
          slides={slides}
          sampleRate={sampleRate}
          snap={snap}
          actions={actions}
          onJump={onJump}
          midi={midi}
          midiUid={midiUid}
        />
      )}
    </div>
  );
});

// ── Mini editor flotante (uno para las tres líneas) ────────────────────────
function LaneEditor({ editor, onClose, sections, sectionsEditable, lyricEvents, lightEvents, lightScenes, slides, sampleRate, snap, actions, onJump, midi, midiUid }) {
  const { lane, id, t } = editor;
  const item = id
    ? (lane === 'section' ? sections.find(m => m.id === id)
      : lane === 'lyric' ? lyricEvents.find(e => e.id === id)
      : lightEvents.find(e => e.id === id))
    : null;

  const [text, setText] = useState(() => (lane === 'section' ? (item?.autoLabel ? '' : item?.label || '') : lane === 'light' ? item?.scene || '' : ''));
  const panelRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    // En el próximo tick: el mismo clic que abrió el editor no debe cerrarlo.
    const tmr = setTimeout(() => window.addEventListener('pointerdown', onDown), 0);
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(tmr); window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const W = 300;
  const left = Math.max(8, Math.min(window.innerWidth - W - 8, editor.x - W / 2));
  const top = Math.min(editor.y, window.innerHeight - 340);
  const secs = t / sampleRate;
  const clock = `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

  const groupSize = item?.cueGroup ? sections.filter(m => m.cueGroup === item.cueGroup && m.autoLabel).length : 0;

  const commitSection = (label, color) => {
    const clean = label.trim().toUpperCase();
    if (!clean) return;
    if (item) actions.updateSection(item.id, { label: clean, color: color || item.color });
    else actions.addSection(t, snap.toBar(t), clean, color);
    onClose();
  };
  const commitLight = (scene) => {
    const clean = scene.trim();
    if (!clean) return;
    if (item) actions.updateLight(item.id, { scene: clean });
    else actions.addLight(t, clean);
    onClose();
  };
  const pickSlide = (slideId) => {
    if (item) actions.updateLyric(item.id, { slideId });
    else actions.addLyric(t, slideId);
    onClose();
  };
  const remove = () => {
    if (lane === 'section') actions.removeSection(item.id);
    else if (lane === 'lyric') actions.removeLyric(item.id);
    else actions.removeLight(item.id);
    onClose();
  };

  // Con escenas publicadas por Lights, esas son LA lista (las únicas que hacen
  // algo). Sin ellas, se sugiere lo ya usado y los nombres de sección.
  const usedScenes = [...new Set(lightEvents.map(e => e.scene))];
  const sceneSuggestions = lightScenes.length
    ? lightScenes
    : [...new Set([...usedScenes, ...sections.filter(m => !m.autoLabel).map(m => m.label)])].slice(0, 10);
  const typedMissing = lightScenes.length > 0 && text.trim() !== ''
    && !lightScenes.some(n => n.trim().toLowerCase() === text.trim().toLowerCase());

  const title = lane === 'section' ? (item ? 'SECCIÓN' : 'NUEVA SECCIÓN')
    : lane === 'lyric' ? (item ? 'DIAPOSITIVA' : 'COLOCAR DIAPOSITIVA')
    : (item ? 'CUE DE LUZ' : 'NUEVO CUE DE LUZ');

  const chip = (c0) => {
    const c = mutedColor(c0);
    return {
    padding: '5px 10px', borderRadius: 12, cursor: 'pointer',
    background: `${c}1f`, border: `1px solid ${c}55`, color: 'rgba(255,255,255,0.88)',
    fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.1px',
  };
  };

  return (
    <div
      ref={panelRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', left, top, width: W, zIndex: 600,
        background: '#17171a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)', padding: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.5px', color: 'rgba(255,255,255,0.5)' }}>{title}</span>
        <span className="mono-data" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>{clock}</span>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex' }}><X size={14} /></button>
      </div>

      {lane === 'section' && (
        (
          <>
            {(item?.heard || groupSize > 1) && (
              <p style={{ margin: '0 0 8px', fontSize: '0.66rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                {item?.heard ? `Guía: “${item.heard}”` : ''}{item?.heard && groupSize > 1 ? ' · ' : ''}{groupSize > 1 ? `aplica a ${groupSize} iguales` : ''}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
              {SECTION_PRESETS.map(p => (
                <button key={p.label} onClick={() => commitSection(p.label, p.color)} style={chip(p.color)}>{displayName(p.label)}</button>
              ))}
            </div>
            <input
              autoFocus value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitSection(text); }}
              placeholder={item ? displayName(item.label) : 'Nombre'}
              style={inputStyle}
            />
            {midi && item && (() => {
              const uid = midiUid(item.id);
              const learning = midi.learningUid === uid;
              const mapped = midi.labelFor(uid);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                  <Piano size={13} />
                  <span>MIDI</span>
                  {learning ? (
                    <button onClick={() => midi.cancelLearn()} className="animate-pulse" style={{ ...chip('#a8a8a6'), padding: '3px 10px' }}>Toca una tecla…</button>
                  ) : mapped ? (
                    <>
                      <button onClick={() => midi.startLearn(uid)} style={{ ...chip('#a8a8a6'), padding: '3px 10px' }} title="Reasignar"><span className="mono-data">{mapped}</span></button>
                      <button onClick={() => midi.clear(uid)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.72rem' }}>Quitar</button>
                    </>
                  ) : (
                    <button onClick={() => midi.startLearn(uid)} style={{ ...chip('#a8a8a6'), padding: '3px 10px' }}>Asignar</button>
                  )}
                </div>
              );
            })()}
          </>
        )
      )}

      {lane === 'lyric' && (
        <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {slides.map((s, i) => {
            const selected = item?.slideId === s.id;
            return (
              <button
                key={s.id} onClick={() => pickSlide(s.id)}
                style={{
                  textAlign: 'left', padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                  background: selected ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selected ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  color: '#fff', fontSize: '0.68rem', display: 'flex', gap: 8,
                }}
              >
                <span style={{ opacity: 0.4, fontWeight: 500, minWidth: 16 }}>{i + 1}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstLine(s.text)}</span>
              </button>
            );
          })}
        </div>
      )}

      {lane === 'light' && (
        <>
          {lightScenes.length > 0 && (
            <p style={{ margin: '0 0 6px', fontSize: '0.66rem', fontWeight: 500, letterSpacing: '0.6px', color: 'rgba(255,255,255,0.45)' }}>
              Escenas
            </p>
          )}
          {sceneSuggestions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10, maxHeight: 150, overflowY: 'auto' }}>
              {sceneSuggestions.map(s => (
                <button key={s} onClick={() => commitLight(s)} style={chip(LIGHT_COLOR)}>{s}</button>
              ))}
            </div>
          )}
          <input
            autoFocus value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitLight(text); }}
            placeholder="Nombre de la escena"
            style={inputStyle}
          />
          {typedMissing && (
            <p style={{ margin: '6px 0 0', fontSize: '0.64rem', color: '#fca5a5', lineHeight: 1.4 }}>
              No existe en Bandly Lights
            </p>
          )}
        </>
      )}

      {item && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button onClick={() => { onJump(item.t ?? item.sample, {}); onClose(); }} style={footBtn('#c2c2c1')}>
            <Play size={11} /> IR AQUÍ
          </button>
          {(lane !== 'section' || sectionsEditable) && (
            <button onClick={remove} style={footBtn('#c76a6a')}>
              <Trash2 size={11} /> BORRAR
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Fuera del componente: la timeline re-renderiza cada 100ms con el playhead y
// si estos se redefinieran adentro, React los remontaría y se perderían clics.
function Gutter({ icon, label, children }) {
  return (
    <div style={{ width: LANE_GUTTER, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, paddingRight: 6 }}>
      {icon}
      <span style={{ fontSize: '0.64rem', fontWeight: 500, letterSpacing: '0.6px', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>{children}</div>
    </div>
  );
}

function MiniBtn({ onClick, title, children, disabled }) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      style={{
        height: 22, minWidth: 22, padding: '0 5px', borderRadius: 6, cursor: disabled ? 'default' : 'pointer',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
        fontSize: '0.58rem', fontWeight: 500,
      }}
    >{children}</button>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)', padding: '8px 10px', borderRadius: 6,
  color: '#fff', fontSize: '0.8rem', outline: 'none',
};
const footBtn = (c) => ({
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  padding: '7px', borderRadius: 6, cursor: 'pointer',
  background: `${c}14`, border: `1px solid ${c}44`, color: c,
  fontSize: '0.6rem', fontWeight: 500, letterSpacing: '0.5px',
});

export default TimelineLanes;
