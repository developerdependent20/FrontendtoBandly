import React from 'react';
import { Repeat, ChevronLeft, ChevronRight, X, RotateCcw, ListMusic } from 'lucide-react';

function fmtDur(samples, sampleRate) {
  const s = sampleRate > 0 ? samples / sampleRate : 0;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────
// ARREGLO NO DESTRUCTIVO
// Las secciones salen de los markers. Reordenar, repetir o saltar bloques
// solo cambia la lista que se le manda al motor — el audio original jamás se
// toca, así que todo es reversible con un clic.
// ─────────────────────────────────────────────────────────────────────────
export default function ArrangementPanel({
  sections,
  blocks,           // null = canción completa
  onChange,         // (nuevosBloques | null)
  sampleRate,
  pitchRatio = 1,
}) {
  const isCustom = Array.isArray(blocks);
  const current = isCustom ? blocks : sections;

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

  if (!sections.length) {
    return (
      <div style={{
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px',
        color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem'
      }}>
        <ListMusic size={16} />
        Agrega marcadores de sección para poder armar un arreglo.
      </div>
    );
  }

  return (
    <div style={{ padding: '10px 20px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: '900', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.45)' }}>
          ARREGLO
        </span>
        <span style={{
          fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.5px', padding: '2px 8px', borderRadius: '20px',
          background: isCustom ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
          color: isCustom ? '#fbbf24' : 'rgba(255,255,255,0.35)',
          border: `1px solid ${isCustom ? 'rgba(251,191,36,0.4)' : 'transparent'}`
        }}>
          {isCustom ? 'PERSONALIZADO' : 'CANCIÓN COMPLETA'}
        </span>
        <span className="mono-data" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
          {current.length} bloques · {fmtDur(totalSamples / pitchRatio, sampleRate)}
        </span>
        {isCustom && (
          <button
            onClick={() => commit(null)}
            title="Volver a la canción completa"
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', borderRadius: '6px', padding: '4px 10px',
              fontSize: '0.65rem', fontWeight: '800', cursor: 'pointer'
            }}
          >
            <RotateCcw size={12} /> RESTAURAR
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {current.map((b, idx) => (
          <div
            key={b.uid ?? `${b.label}-${idx}`}
            style={{
              display: 'flex', alignItems: 'stretch', borderRadius: '6px', overflow: 'hidden',
              background: `${b.color || '#38bdf8'}14`,
              border: `1px solid ${b.color || '#38bdf8'}55`
            }}
          >
            <button onClick={() => move(idx, -1)} disabled={idx === 0} title="Mover antes"
              style={{
                background: 'transparent', border: 'none', padding: '0 4px', cursor: idx === 0 ? 'default' : 'pointer',
                color: idx === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center'
              }}>
              <ChevronLeft size={13} />
            </button>

            <div style={{ padding: '7px 4px', display: 'flex', flexDirection: 'column', gap: '1px', minWidth: '64px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '900', color: b.color || '#38bdf8', letterSpacing: '0.3px' }}>
                {b.label}
              </span>
              <span className="mono-data" style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)' }}>
                {fmtDur((b.end - b.start) / pitchRatio, sampleRate)}
              </span>
            </div>

            <button onClick={() => move(idx, 1)} disabled={idx === current.length - 1} title="Mover después"
              style={{
                background: 'transparent', border: 'none', padding: '0 4px',
                cursor: idx === current.length - 1 ? 'default' : 'pointer',
                color: idx === current.length - 1 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.45)',
                display: 'flex', alignItems: 'center'
              }}>
              <ChevronRight size={13} />
            </button>

            <button onClick={() => duplicate(idx)} title="Repetir esta sección"
              style={{
                background: 'rgba(255,255,255,0.04)', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.07)',
                padding: '0 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center'
              }}>
              <Repeat size={12} />
            </button>
            <button onClick={() => remove(idx)} title="Saltarse esta sección"
              style={{
                background: 'rgba(239,68,68,0.06)', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.07)',
                padding: '0 8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center'
              }}>
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
