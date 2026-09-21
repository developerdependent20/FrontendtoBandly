import React, { memo } from 'react';
import { ChevronRight, Mic2 } from 'lucide-react';
import { displayName, sectionTone } from '../../utils/timelineLanes';

// ── AHORA / SIGUE ────────────────────────────────────────────────────────
// Lo que el baterista o el director miran desde el escenario: en qué sección
// estamos, cuál viene y en cuántos compases, y en qué tiempo del compás vamos.
// Letra grande y alto contraste — se tiene que leer a 3 metros con luces encima.

const firstLine = (text) => (text || '').split('\n').map(s => s.trim()).find(Boolean) || '';

const NowNextPanel = memo(({
  markers,            // secciones en unidades de reproducción, ordenadas
  playbackSample,
  sampleRate,
  samplesPerBar,
  samplesPerBeat,
  beatsPerBar,
  hasTempo,
  currentLyric,       // { text, index } | null
}) => {
  let curIdx = -1;
  for (let i = 0; i < markers.length; i++) {
    if (markers[i].sample <= playbackSample) curIdx = i;
    else break;
  }
  const current = curIdx >= 0 ? markers[curIdx] : null;
  const next = markers[curIdx + 1] || null;

  const bar = hasTempo ? Math.floor(playbackSample / samplesPerBar) + 1 : 0;
  const beat = hasTempo ? Math.floor((playbackSample % samplesPerBar) / samplesPerBeat) + 1 : 0;

  // Cuenta regresiva hasta la próxima sección (compases con tempo, segundos sin).
  let remainLabel = '';
  let remainFrac = 0;
  let urgent = false;
  if (next) {
    const left = Math.max(0, next.sample - playbackSample);
    const segStart = current ? current.sample : 0;
    const segLen = Math.max(1, next.sample - segStart);
    remainFrac = 1 - left / segLen;
    if (hasTempo) {
      const bars = Math.ceil(left / samplesPerBar - 1e-6);
      remainLabel = bars <= 1 ? 'ESTE COMPÁS' : `EN ${bars} COMPASES`;
      urgent = bars <= 2;
    } else {
      const secs = Math.ceil(left / sampleRate);
      remainLabel = `EN ${secs}s`;
      urgent = secs <= 4;
    }
  }

  const curColor = current ? sectionTone(current) : '#7d7d7c';
  const nextColor = next ? sectionTone(next) : '#7d7d7c';

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: hasTempo ? 'auto 1fr 1fr' : '1fr 1fr', gap: 10,
      padding: '0 20px', marginBottom: 8,
    }}>
      {hasTempo && (
        <div style={cell('rgba(255,255,255,0.03)', 'rgba(255,255,255,0.08)')}>
          <span style={kicker}>COMPÁS</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="mono-data" style={{ fontSize: '1.8rem', fontWeight: 500, color: '#fff', lineHeight: 1, minWidth: '2.2ch', textAlign: 'right' }}>{bar}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: beatsPerBar }, (_, i) => (
                <span key={i} style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: i + 1 === beat ? (i === 0 ? '#ffffff' : '#c2c2c1') : 'rgba(255,255,255,0.12)',
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ ...cell('rgba(255,255,255,0.045)', 'rgba(255,255,255,0.09)'), borderLeft: `3px solid ${curColor}` }}>
        <span style={kicker}>AHORA</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          
          <span style={{ ...bigName, color: current ? '#fff' : 'rgba(255,255,255,0.35)' }}>{current ? displayName(current.label) : '—'}</span>
          {currentLyric?.text && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', minWidth: 0, color: 'rgba(233,213,255,0.85)', fontSize: '0.8rem', fontWeight: 500 }}>
              <Mic2 size={13} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstLine(currentLyric.text)}</span>
            </span>
          )}
        </div>
      </div>

      <div style={{ ...cell(urgent ? 'rgba(255,255,255,0.075)' : 'rgba(255,255,255,0.03)', urgent ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)'), borderLeft: `3px solid ${nextColor}`, position: 'relative', overflow: 'hidden' }}>
        <span style={kicker}>SIGUE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <ChevronRight size={18} color="rgba(255,255,255,0.45)" style={{ flexShrink: 0 }} />
          <span style={{ ...bigName, color: next ? '#fff' : 'rgba(255,255,255,0.35)' }}>{next ? displayName(next.label) : 'Fin'}</span>
          {next && (
            <span className={urgent ? 'animate-pulse' : ''} style={{
              marginLeft: 'auto', flexShrink: 0, fontSize: '0.82rem', fontWeight: 500, letterSpacing: '0.3px',
              color: urgent ? '#fff' : 'rgba(255,255,255,0.6)',
            }}>{remainLabel}</span>
          )}
        </div>
        {next && (
          <div style={{ position: 'absolute', left: 0, bottom: 0, height: 2, width: `${Math.min(100, remainFrac * 100)}%`, background: 'rgba(255,255,255,0.55)', transition: 'width 0.1s linear' }} />
        )}
      </div>
    </div>
  );
});

const cell = (bg, border) => ({
  display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
  padding: '8px 14px', minHeight: 58, minWidth: 0, boxSizing: 'border-box',
  background: bg, border: `1px solid ${border}`, borderRadius: 12,
});
const kicker = { fontSize: '0.66rem', fontWeight: 500, letterSpacing: '0.5px', color: 'rgba(255,255,255,0.55)' };
const bigName = { fontSize: '1.6rem', fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

export default NowNextPanel;
