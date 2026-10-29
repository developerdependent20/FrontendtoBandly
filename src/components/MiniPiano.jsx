import React, { useEffect, useRef, useState } from 'react';

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [3, 4]; // C3 a B4
const midiOf = (name, oct) => 12 * (oct + 1) + NAMES.indexOf(name);

const KEYS = OCTAVES.flatMap(oct => NAMES.map(n => ({ name: n, oct, midi: midiOf(n, oct), black: n.includes('#') })));
const WHITE = KEYS.filter(k => !k.black);

export default function MiniPiano() {
  const toneRef = useRef(null);
  const samplerRef = useRef(null);
  const held = useRef(new Set());
  const [down, setDown] = useState({});
  const [last, setLast] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Muestras reales de piano (Salamander Grand Piano, CC-BY) en /audio/piano
  useEffect(() => {
    let alive = true;
    import('tone').then((t) => {
      if (!alive) return;
      const Tone = t.default || t;
      toneRef.current = Tone;
      samplerRef.current = new Tone.Sampler({
        urls: { A1: 'A1.mp3', C2: 'C2.mp3', A2: 'A2.mp3', C3: 'C3.mp3', A3: 'A3.mp3', C4: 'C4.mp3', A4: 'A4.mp3', C5: 'C5.mp3', A5: 'A5.mp3' },
        baseUrl: '/audio/piano/',
        release: 1,
        onload: () => alive && setLoaded(true),
      }).toDestination();
    });
    return () => {
      alive = false;
      samplerRef.current?.dispose();
      samplerRef.current = null;
    };
  }, []);

  const noteOn = async (k) => {
    if (held.current.has(k.midi)) return;
    held.current.add(k.midi);
    setDown(d => ({ ...d, [k.midi]: true }));
    setLast(`${k.name}${k.oct}`);
    const Tone = toneRef.current;
    if (!Tone || !samplerRef.current) return;
    await Tone.start();
    if (samplerRef.current.loaded && held.current.has(k.midi)) {
      samplerRef.current.triggerAttack(`${k.name}${k.oct}`);
    }
  };

  const noteOff = (k) => {
    if (!held.current.has(k.midi)) return;
    held.current.delete(k.midi);
    setDown(d => ({ ...d, [k.midi]: false }));
    if (samplerRef.current?.loaded) samplerRef.current.triggerRelease(`${k.name}${k.oct}`);
  };

  const handlers = (k) => ({
    onPointerDown: (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); noteOn(k); },
    onPointerUp: () => noteOff(k),
    onPointerCancel: () => noteOff(k),
    onPointerLeave: () => noteOff(k),
  });

  const whiteW = 100 / WHITE.length;

  return (
    <div style={{ padding: '1.5rem', background: '#17171b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>Piano</h3>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {!loaded ? 'Cargando piano...' : last ? <>Nota: <strong style={{ color: 'white' }}>{last}</strong></> : 'Toca una tecla para sacar la nota'}
        </span>
      </div>

      <div style={{ position: 'relative', height: '160px', userSelect: 'none', touchAction: 'none' }}>
        {WHITE.map((k, i) => (
          <div key={k.midi} {...handlers(k)} style={{
            position: 'absolute', left: `${i * whiteW}%`, width: `${whiteW}%`, height: '100%',
            background: down[k.midi] ? '#c7d2fe' : '#f7f4ef', border: '1px solid #1c1c20', borderRadius: '0 0 6px 6px',
            boxSizing: 'border-box', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: '6px', color: '#555', fontSize: '0.7rem', cursor: 'pointer'
          }}>{k.name === 'C' ? `C${k.oct}` : k.name}</div>
        ))}
        {KEYS.filter(k => k.black).map(k => {
          const idx = WHITE.findIndex(w => w.midi === k.midi - 1);
          return (
            <div key={k.midi} {...handlers(k)} style={{
              position: 'absolute', left: `${(idx + 1) * whiteW - whiteW * 0.3}%`, width: `${whiteW * 0.6}%`, height: '60%',
              background: down[k.midi] ? '#6366f1' : '#111', border: '1px solid #000', borderRadius: '0 0 4px 4px',
              zIndex: 2, cursor: 'pointer'
            }} />
          );
        })}
      </div>
    </div>
  );
}
