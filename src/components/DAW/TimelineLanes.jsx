import React, { useState, useRef, useEffect, memo } from 'react';
import { Flag, Mic2, Lightbulb, Wand2, Plus, Trash2, Play, X, Piano } from 'lucide-react';
import { SECTION_PRESETS, LIGHT_COLOR, displayName, shortName, sectionTone, mutedColor } from '../../utils/timelineLanes';
import { itemKey, clampDelta, keysInRange, uniqueById, makeClipboard, planPaste } from '../../utils/laneSelection';

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
// Atajos en vivo: L = siguiente letra aquí, Shift+L = repetir la letra actual, K = cue de luz aquí.
// Letras: clic derecho o Alt+clic en la línea = elegir cualquier diapositiva (repetidas incluidas).

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

  // ── Selección múltiple ──
  // Clic = elige uno · Ctrl+clic = suma/quita · arrastrar en el fondo de una línea = rectángulo ·
  // Ctrl+A (con el mouse sobre las líneas) = todo · arrastrar uno elegido mueve TODOS ·
  // Supr = borrar · Ctrl+C / X / V = copiar, cortar y pegar en el cursor de reproducción.
  const [selected, setSelected] = useState(() => new Set());
  const [marquee, setMarquee] = useState(null); // { lane, lo, hi }
  const hoverRef = useRef(false);
  const clipboardRef = useRef(null);

  const sectionItems = sections.map(m => ({ ...m, t: m.sample }));
  const entries = [
    ...sectionItems.map(m => ({ lane: 'section', id: m.id, key: itemKey('section', m), t: m.t, payload: { label: m.label, color: m.color } })),
    ...lyricEvents.map(ev => ({ lane: 'lyric', id: ev.id, key: itemKey('lyric', ev), t: ev.t, payload: { slideId: ev.slideId } })),
    ...lightEvents.map(ev => ({ lane: 'light', id: ev.id, key: itemKey('light', ev), t: ev.t, payload: { scene: ev.scene } })),
  ];

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

  const selectedEntries = () => entries.filter(e => selected.has(e.key));
  const ops = {
    selectAll: () => { setSelected(new Set(entries.map(e => e.key))); showFlash(`${entries.length} seleccionados`); },
    clear: () => setSelected(new Set()),
    remove: () => {
      const list = uniqueById(selectedEntries().filter(e => e.lane !== 'section' || sectionsEditable));
      if (!list.length) { showFlash('Las secciones no se pueden borrar con un arreglo activo'); return; }
      actions.removeItems(list.map(e => ({ lane: e.lane, id: e.id })));
      setSelected(new Set());
      showFlash(`Eliminados ${list.length}`);
    },
    copy: (cut) => {
      const list = uniqueById(selectedEntries());
      if (!list.length) return;
      clipboardRef.current = makeClipboard(list);
      showFlash(`${cut ? 'Cortados' : 'Copiados'} ${list.length}`);
      if (cut) ops.remove();
    },
    // Se pega con el primero en el cursor de reproducción y el resto a la misma distancia.
    paste: () => {
      const plan = planPaste(clipboardRef.current, snap.beat(playbackSample), totalSamples)
        .filter(p => p.lane !== 'section' || sectionsEditable)
        .map(p => (p.lane === 'section' ? { ...p, bar: snap.toBar(p.t) } : p));
      if (!plan.length) { showFlash('No hay nada que pegar aquí'); return; }
      actions.addItems(plan);
      showFlash(`Pegados ${plan.length}`);
    },
  };

  useEffect(() => {
    live.current = { playbackSample, lyricEvents, slides, snap, sampleRate, actions, openEditorAtT, showFlash, view, totalSamples, sectionsEditable, onSeek, onJump, selected, entries, ops, editorOpen: !!editor };
  });
  useEffect(() => {
    const onKey = (e) => {
      if (isTyping()) return;
      const s = live.current;
      const mod = e.ctrlKey || e.metaKey;
      const k = (e.key || '').toLowerCase();
      if (mod && !e.shiftKey && !e.altKey && k === 'a') {
        if (!hoverRef.current) return; // fuera de las líneas, Ctrl+A queda para lo demás
        e.preventDefault();
        s.ops?.selectAll();
      } else if (mod && !e.altKey && (k === 'c' || k === 'x')) {
        if (!s.selected?.size) return;
        e.preventDefault();
        s.ops.copy(k === 'x');
      } else if (mod && !e.altKey && k === 'v') {
        if (!clipboardRef.current) return;
        e.preventDefault();
        s.ops.paste();
      } else if (!mod && !e.altKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (!s.selected?.size) return;
        e.preventDefault();
        s.ops.remove();
      } else if (e.key === 'Escape' && s.selected?.size && !s.editorOpen) {
        s.ops.clear();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
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
        // Shift+L: repite la diapositiva que está sonando (coros que se cantan dos veces).
        if (e.shiftKey) {
          const cur = prev && s.slides.find(sl => sl.id === prev.slideId);
          if (!cur) { s.showFlash('No hay una letra anterior para repetir'); return; }
          s.actions.addLyric(t, cur.id);
          s.showFlash(`Repetida ${s.slides.indexOf(cur) + 1}: ${firstLine(cur.text)}`);
          return;
        }
        // L pregunta cuál: el selector se abre en este punto, con la que suena y la
        // siguiente marcadas (Enter elige la siguiente), para no adivinar.
        s.openEditorAtT('lyric', null, t, lyricsRowRef.current);
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
    // Alt+clic sobre una letra: agrega otra diapositiva en ese punto (permite repetir una).
    if (lane === 'lyric' && e.altKey) {
      e.preventDefault();
      const s = live.current;
      if (!s.slides.length) { s.showFlash('Sin letra en Presenter'); return; }
      s.openEditorAtT('lyric', null, s.snap.beat(xToT(e.clientX, row)), row);
      return;
    }
    // Selección: Ctrl+clic suma o quita (Shift+clic sigue siendo "entrar directo"); un clic
    // en algo que no estaba elegido lo deja como lo único elegido.
    const s0 = live.current;
    const key = itemKey(lane, item);
    if (e.ctrlKey || e.metaKey) {
      const next = new Set(s0.selected);
      if (next.has(key)) next.delete(key); else next.add(key);
      setSelected(next);
      return;
    }
    const nextSel = s0.selected.has(key) ? s0.selected : new Set([key]);
    if (nextSel !== s0.selected) setSelected(nextSel);
    // Grupo que viaja con el arrastre: todo lo elegido (el que se agarró va primero).
    const picked = s0.entries.filter(en => nextSel.has(en.key) && (en.lane !== 'section' || s0.sectionsEditable));
    const grabbed = picked.find(en => en.key === key);
    const group = grabbed ? [grabbed, ...picked.filter(en => en !== grabbed)] : picked;
    const d = {
      lane, id: item.id, key, startX: e.clientX, width: row.getBoundingClientRect().width,
      t0: item.t, t: item.t, dt: 0, moved: false, row, group, groupKeys: new Set(group.map(g => g.key)),
    };
    dragRef.current = d;
    setDrag(d);

    const onMove = (ev) => {
      const cur = dragRef.current;
      if (!cur) return;
      const dx = ev.clientX - cur.startX;
      if (!cur.moved && Math.abs(dx) < 4) return;
      const s = live.current;
      if (cur.lane === 'section' && !s.sectionsEditable) return;
      const dtRaw = (dx / cur.width) * s.view.span * s.totalSamples;
      const raw = Math.max(0, Math.min(s.totalSamples, cur.t0 + dtRaw));
      const tNew = cur.lane === 'section' ? s.snap.bar(raw) : s.snap.beat(raw);
      // El que se agarró se alinea a su cuadrícula; los demás se mueven la misma distancia exacta.
      const dt = clampDelta(cur.group, tNew - cur.t0, s.totalSamples);
      dragRef.current = { ...cur, t: cur.t0 + dt, dt, moved: true };
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
        if (cur.dt !== 0) {
          s.actions.moveItems(uniqueById(cur.group).map(g => {
            const t = g.t + cur.dt;
            return { lane: g.lane, id: g.id, t, bar: g.lane === 'section' ? s.snap.toBar(t) : undefined };
          }));
        }
        return;
      }
      // Clic sin arrastrar sobre uno de varios elegidos: queda solo ese.
      if (cur.group.length > 1) setSelected(new Set([cur.key]));
      if (cur.lane !== 'lyric') {
        // Clic: entra con 2 compases de conteo. Shift+clic: directo.
        // En Letras el clic no mueve la reproducción: para saltar está el carril de secciones.
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
  // Mientras se arrastra, todo el grupo elegido se ve desplazado la misma distancia.
  const posOf = (lane, item) => (drag && drag.moved && drag.groupKeys.has(itemKey(lane, item)) ? item.t + drag.dt : item.t);

  // Rectángulo: arrastrar sobre el fondo vacío de una línea elige lo que quede dentro
  // (Ctrl suma a lo que ya estaba elegido). Un clic en el fondo sigue moviendo el cursor.
  const onRowPointerDown = (e, lane) => {
    if (e.target !== e.currentTarget || e.button !== 0) return;
    const row = e.currentTarget;
    const startX = e.clientX;
    const additive = e.ctrlKey || e.metaKey;
    const base = additive ? new Set(live.current.selected) : new Set();
    let moved = false;
    const onMove = (ev) => {
      if (!moved && Math.abs(ev.clientX - startX) < 4) return;
      moved = true;
      const a = xToT(startX, row);
      const b = xToT(ev.clientX, row);
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      setMarquee({ lane, lo, hi });
      setSelected(new Set([...base, ...keysInRange(live.current.entries, lane, lo, hi)]));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setMarquee(null);
      if (moved) {
        suppressRowClick.current = true;
        setTimeout(() => { suppressRowClick.current = false; }, 350);
      } else if (!additive) {
        setSelected(new Set());
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  const renderMarquee = (lane) => (marquee && marquee.lane === lane ? (
    <div style={{
      position: 'absolute', top: 0, bottom: 0, pointerEvents: 'none', zIndex: 5,
      left: `${tToPct(marquee.lo)}%`, width: `${Math.max(0, tToPct(marquee.hi) - tToPct(marquee.lo))}%`,
      background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 3,
    }} />
  ) : null);

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
    onPointerDown: (e) => onRowPointerDown(e, lane),
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
      const isSel = selected.has(itemKey(lane, it));
      return (
        <div
          key={it.key || it.id}
          onPointerDown={(e) => onItemPointerDown(e, lane, { ...it, t: it._t })}
          onDoubleClick={(e) => openItemEditor(e, lane, { ...it, t: it._t })}
          title={`${getFullLabel ? getFullLabel(it) : getLabel(it)} — ${lane === 'lyric' ? 'doble clic: cambiar diapositiva · clic derecho: agregar otra aquí · arrastrar: mover' : 'clic: con conteo · Shift+clic: directo · doble clic: editar'} · Ctrl+clic: sumar a la selección`}
          style={{
            position: 'absolute', top: 2, bottom: 2,
            left: `${left}%`, width: `calc(${Math.max(0, right - left)}% - 2px)`,
            boxShadow: isSel ? 'inset 0 0 0 1.5px rgba(255,255,255,0.95)' : 'none',
            background: isSel ? `${color}55` : active ? `${color}38` : `${color}1c`,
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

  const slideById = Object.fromEntries(slides.map((s, i) => [s.id, { ...s, idx: i }]));

  const addNextLyricHere = () => {
    if (!slides.length) { showFlash('Sin letra en Presenter'); return; }
    openEditorAtT('lyric', null, snap.beat(playbackSample), lyricsRowRef.current);
  };

  return (
    <div
      onPointerEnter={() => { hoverRef.current = true; }}
      onPointerLeave={() => { hoverRef.current = false; }}
      style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4, position: 'relative' }}
    >
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
          {renderMarquee('section')}
        </div>
      </div>

      {/* LETRAS */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Gutter icon={<Mic2 size={12} color="rgba(255,255,255,0.5)" />} label="LETRAS">
          <MiniBtn onClick={addNextLyricHere} title="Diapositiva aquí (L = la siguiente · Shift+L = repetir la actual · clic derecho o Alt+clic en la línea = elegir cuál)">
            <Plus size={10} />L
          </MiniBtn>
        </Gutter>
        <div
          ref={lyricsRowRef}
          {...rowProps('lyric')}
          onContextMenu={(e) => {
            // Clic derecho en cualquier punto (incluso sobre una letra): agregar una diapositiva ahí.
            e.preventDefault();
            if (!slides.length) { showFlash('Sin letra en Presenter'); return; }
            openEditorAtT('lyric', null, snap.beat(xToT(e.clientX, e.currentTarget)), e.currentTarget);
          }}
        >
          {renderBlocks(
            'lyric', lyricEvents,
            ev => { const s = slideById[ev.slideId]; return s ? `${s.idx + 1} · ${firstLine(s.text)}` : '(diapositiva borrada)'; },
            ev => (slideById[ev.slideId] ? LYRIC_TONE : '#7d7d7c')
          )}
          {lyricEvents.length === 0 && !slides.length && (
            <span style={{ position: 'absolute', left: 8, top: 8, fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>Sin letra</span>
          )}
          {renderMarquee('lyric')}
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
            const isSel = selected.has(itemKey('light', ev));
            return (
              <div
                key={ev.key}
                onPointerDown={(e) => onItemPointerDown(e, 'light', { ...ev, t })}
                onDoubleClick={(e) => openItemEditor(e, 'light', { ...ev, t })}
                title={(missing ? `${ev.scene} — no existe en Bandly Lights` : ev.scene) + ' — clic: con conteo · doble clic: editar · Ctrl+clic: sumar a la selección'}
                style={{
                  position: 'absolute', top: 3, bottom: 3, left: `${tToPct(t)}%`,
                  display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4,
                  cursor: 'pointer', userSelect: 'none', touchAction: 'none',
                  transform: 'translateX(-6px)',
                  borderRadius: 4, boxShadow: isSel ? '0 0 0 1.5px rgba(255,255,255,0.95)' : 'none',
                  background: isSel ? 'rgba(255,255,255,0.14)' : 'transparent',
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
          {renderMarquee('light')}
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

  // Al agregar una letra: cuál suena en este punto y cuál sigue (la sugerida).
  const suggestion = (() => {
    if (lane !== 'lyric' || item) return null;
    const prev = [...lyricEvents].reverse().find(ev => ev.t <= t);
    const prevIdx = prev ? slides.findIndex(sl => sl.id === prev.slideId) : -1;
    return { currentId: prev ? prev.slideId : null, nextId: slides[Math.min(slides.length - 1, prevIdx + 1)]?.id ?? null };
  })();
  const enterRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) onClose(); };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      // Enter elige la sugerida (salvo que el foco esté en un botón: ahí Enter ya lo pulsa).
      else if (e.key === 'Enter' && !panelRef.current?.contains(document.activeElement)) enterRef.current?.();
    };
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
  useEffect(() => { enterRef.current = () => { if (suggestion?.nextId) pickSlide(suggestion.nextId); }; });
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
          {suggestion && <p style={{ margin: '0 0 4px', fontSize: '0.66rem', color: 'rgba(255,255,255,0.45)' }}>¿Cuál va aquí? Enter = la siguiente</p>}
          {slides.map((s, i) => {
            const selected = item?.slideId === s.id;
            const isCurrent = suggestion?.currentId === s.id;
            const isNext = suggestion?.nextId === s.id;
            return (
              <button
                key={s.id} onClick={() => pickSlide(s.id)}
                style={{
                  textAlign: 'left', padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                  background: selected || isNext ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selected || isNext ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  color: '#fff', fontSize: '0.68rem', display: 'flex', gap: 8, alignItems: 'center',
                }}
              >
                <span style={{ opacity: 0.4, fontWeight: 500, minWidth: 16 }}>{i + 1}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{firstLine(s.text)}</span>
                {isCurrent && <span style={{ flexShrink: 0, fontSize: '0.58rem', padding: '1px 5px', borderRadius: 5, background: 'rgba(52,211,153,0.18)', color: '#6ee7b7' }}>suena</span>}
                {isNext && <span style={{ flexShrink: 0, fontSize: '0.58rem', padding: '1px 5px', borderRadius: 5, background: 'rgba(255,255,255,0.16)' }}>siguiente</span>}
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
