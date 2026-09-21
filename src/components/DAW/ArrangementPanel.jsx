import React, { useState } from 'react';
import { Repeat, ChevronLeft, ChevronRight, ChevronDown, X, RotateCcw, Pencil, Piano } from 'lucide-react';
import { SECTION_PRESETS, displayName, sectionTone } from '../../utils/timelineLanes';

function fmtDur(samples, sampleRate) {
  const s = sampleRate > 0 ? samples / sampleRate : 0;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const OPEN_KEY = 'bandly_arrangement_open';

// ─────────────────────────────────────────────────────────────────────────
// ARREGLO NO DESTRUCTIVO
// Las secciones salen de los markers. Reordenar, repetir o saltar bloques
// solo cambia la lista que se le manda al motor — el audio original jamás se
// toca, así que todo es reversible con un clic.
//
// Clic en un bloque = entrar a esa sección con 2 compases de conteo.
// Shift+clic = entrar directo. Doble clic en el nombre (o el lápiz) = renombrar.
// El botón de piano le asigna una tecla / pedal MIDI.
// ─────────────────────────────────────────────────────────────────────────
export default function ArrangementPanel({
  sections,
  blocks,           // null = canción completa
  onChange,         // (nuevosBloques | null)
  onPlayBlock,      // (idx, { immediate })
  onRenameBlock,    // (uid, nombre)
  midi,             // { labelFor, learningUid, startLearn, cancelLearn, clear }
  activeIndex = -1, // bloque que suena ahora
  sampleRate,
  pitchRatio = 1,
}) {
  const isCustom = Array.isArray(blocks);
  const current = isCustom ? blocks : sections;
  const [editing, setEditing] = useState(null); // `${uid}|${idx}`
  // Contraído por defecto; recuerda lo que dejes.
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === '1'; } catch { return false; }
  });
  const toggle = () => setOpen(v => {
    try { localStorage.setItem(OPEN_KEY, v ? '0' : '1'); } catch { /* sin storage */ }
    return !v;
  });

  const totalSamples = current.reduce((acc, b) => acc + (b.end - b.start), 0);

  const commit = (next) => onChange(next);

  const move = (idx, dir) => {
    const next = [...current];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    commit(next);
  };

  const duplicate = (idx) => {
    const next = [...current];
    next.splice(idx + 1, 0, { ...next[idx], uid: `${next[idx].uid}-r${Date.now()}` });
    commit(next);
  };

  const remove = (idx) => {
    const next = current.filter((_, i) => i !== idx);
    commit(next.length ? next : null);
  };

  if (!sections.length) return null;

  const finishRename = (b, value, save) => {
    setEditing(null);
    if (save && value.trim()) onRenameBlock?.(b.uid, value);
  };

  const iconBtn = (extra = {}) => ({
    background: 'transparent', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.06)',
    padding: '0 7px', cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
    display: 'flex', alignItems: 'center', ...extra,
  });

  return (
    <div style={{ padding: open ? '6px 20px 14px' : '2px 20px 8px' }}>
      <datalist id="bandly-section-presets">
        {SECTION_PRESETS.map(p => <option key={p.label} value={displayName(p.label)} />)}
      </datalist>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: open ? 10 : 0 }}>
        <button
          onClick={toggle}
          aria-expanded={open}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px 0',
            fontSize: '0.7rem', fontWeight: 500, letterSpacing: '0.5px',
          }}
        >
          <ChevronDown size={14} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
          ARREGLO
        </button>
        {isCustom && (
          <span style={{
            fontSize: '0.66rem', fontWeight: 500, padding: '2px 9px', borderRadius: 20,
            background: 'rgba(251,191,36,0.10)', color: '#d9b45a', border: '1px solid rgba(251,191,36,0.25)',
          }}>
            Personalizado
          </span>
        )}
        <span className="mono-data" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
          {current.length} bloques · {fmtDur(totalSamples / pitchRatio, sampleRate)}
        </span>
        {isCustom && open && (
          <button
            onClick={() => commit(null)}
            title="Volver a la canción completa"
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
              color: 'rgba(255,255,255,0.65)', borderRadius: 6, padding: '4px 10px',
              fontSize: '0.7rem', fontWeight: 500, cursor: 'pointer',
            }}
          >
            <RotateCcw size={12} /> Restaurar
          </button>
        )}
      </div>

      {open && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {current.map((b, idx) => {
            const tone = sectionTone(b);
            const active = idx === activeIndex;
            const key = `${b.uid}|${idx}`;
            const isEditing = editing === key;
            const canRename = b.uid !== 'sec-head';
            const uid = String(b.uid);
            const learning = midi?.learningUid === uid;
            const mapped = midi?.labelFor(uid);
            return (
              <div
                key={b.uid ? `${b.uid}-${idx}` : `${b.label}-${idx}`}
                className={`arr-block${active ? ' arr-active' : ''}`}
                style={{
                  display: 'flex', alignItems: 'stretch', borderRadius: 12, overflow: 'hidden',
                  background: active ? 'rgba(255,255,255,0.075)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)'}`,
                  borderLeft: `3px solid ${tone}`,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <button onClick={() => move(idx, -1)} disabled={idx === 0} title="Mover antes" className="arr-act"
                  style={{ background: 'transparent', border: 'none', padding: '0 3px', cursor: idx === 0 ? 'default' : 'pointer', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', opacity: idx === 0 ? 0.15 : undefined }}>
                  <ChevronLeft size={13} />
                </button>

                <div
                  onClick={(e) => { if (!isEditing) onPlayBlock?.(idx, { immediate: e.shiftKey }); }}
                  title="Clic: con conteo · Shift+clic: directo · doble clic: renombrar"
                  style={{ padding: '7px 6px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 92, cursor: 'pointer', userSelect: 'none' }}
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      list="bandly-section-presets"
                      defaultValue={b.autoLabel ? '' : displayName(b.label)}
                      placeholder={displayName(b.label)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') finishRename(b, e.currentTarget.value, true);
                        else if (e.key === 'Escape') finishRename(b, '', false);
                      }}
                      onBlur={(e) => finishRename(b, e.currentTarget.value, true)}
                      style={{
                        width: 118, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.28)',
                        borderRadius: 6, padding: '3px 6px', color: '#fff', fontSize: '0.82rem', fontWeight: 500, outline: 'none',
                      }}
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => { if (!canRename) return; e.stopPropagation(); setEditing(key); }}
                      style={{
                        fontSize: '0.86rem', fontWeight: 500,
                        color: b.autoLabel ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.92)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e8e5df', flexShrink: 0 }} />}
                      {displayName(b.label)}
                    </span>
                  )}
                  <span className="mono-data" style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)' }}>
                    {fmtDur((b.end - b.start) / pitchRatio, sampleRate)}
                  </span>
                </div>

                <button onClick={() => move(idx, 1)} disabled={idx === current.length - 1} title="Mover después" className="arr-act"
                  style={{ background: 'transparent', border: 'none', padding: '0 3px', cursor: idx === current.length - 1 ? 'default' : 'pointer', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', opacity: idx === current.length - 1 ? 0.15 : undefined }}>
                  <ChevronRight size={13} />
                </button>

                {midi && (
                  learning ? (
                    <button onClick={() => midi.cancelLearn()} title="Cancelar (Esc)"
                      className="animate-pulse"
                      style={iconBtn({ gap: 4, color: '#fff', background: 'rgba(255,255,255,0.10)', fontSize: '0.68rem', fontWeight: 500 })}>
                      <Piano size={12} /> Toca…
                    </button>
                  ) : mapped ? (
                    <>
                      <button onClick={() => midi.startLearn(uid)} title="Reasignar MIDI" className="arr-act"
                        style={iconBtn({ gap: 4, fontSize: '0.68rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' })}>
                        <Piano size={12} /> <span className="mono-data">{mapped}</span>
                      </button>
                      <button onClick={() => midi.clear(uid)} title="Quitar MIDI" className="arr-act"
                        style={iconBtn({ padding: '0 4px', borderLeft: 'none' })}>
                        <X size={11} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => midi.startLearn(uid)} title="Asignar MIDI" className="arr-act" style={iconBtn()}>
                      <Piano size={12} />
                    </button>
                  )
                )}
                {canRename && (
                  <button onClick={() => setEditing(key)} title="Renombrar" className="arr-act" style={iconBtn()}>
                    <Pencil size={12} />
                  </button>
                )}
                <button onClick={() => duplicate(idx)} title="Repetir" className="arr-act" style={iconBtn()}>
                  <Repeat size={12} />
                </button>
                <button onClick={() => remove(idx)} title="Saltar" className="arr-act" style={iconBtn()}>
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
