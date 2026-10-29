import React, { useEffect, useRef, useState } from 'react';
import { Play, Square, Minus, Plus } from 'lucide-react';

const BEATS_OPTIONS = [2, 3, 4, 6];
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

export default function Metronome() {
  const [bpm, setBpm] = useState(() => parseInt(localStorage.getItem('bandly_metro_bpm') || '100', 10));
  const [beats, setBeats] = useState(4);
  const [running, setRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);

  const ctxRef = useRef(null);
  const timerRef = useRef(null);
  const nextTimeRef = useRef(0);
  const beatRef = useRef(0);
  const bpmRef = useRef(bpm);
  const beatsRef = useRef(beats);

  useEffect(() => {
    bpmRef.current = bpm;
    try { localStorage.setItem('bandly_metro_bpm', bpm); } catch { /* sin storage */ }
  }, [bpm]);
  useEffect(() => { beatsRef.current = beats; }, [beats]);

  const click = (time, accent) => {
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.9 : 0.5, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  };

  const tick = () => {
    const ctx = ctxRef.current;
    while (nextTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const beat = beatRef.current;
      click(nextTimeRef.current, beat === 0);
      const delayMs = Math.max(0, (nextTimeRef.current - ctx.currentTime) * 1000);
      setTimeout(() => setCurrentBeat(beat), delayMs);
      nextTimeRef.current += 60 / bpmRef.current;
      beatRef.current = (beat + 1) % beatsRef.current;
    }
  };

  const start = async () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    await ctxRef.current.resume();
    beatRef.current = 0;
    nextTimeRef.current = ctxRef.current.currentTime + 0.05;
    timerRef.current = setInterval(tick, LOOKAHEAD_MS);
    setRunning(true);
  };

  const stop = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
    setCurrentBeat(-1);
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    ctxRef.current?.close();
    ctxRef.current = null;
  }, []);

  const taps = useRef([]);
  const tapTempo = () => {
    const now = performance.now();
    taps.current = [...taps.current.filter(t => now - t < 2500), now];
    if (taps.current.length >= 2) {
      const gaps = taps.current.slice(1).map((t, i) => t - taps.current[i]);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      setBpm(Math.min(240, Math.max(40, Math.round(60000 / avg))));
    }
  };

  const adjust = (d) => setBpm(b => Math.min(240, Math.max(40, b + d)));

  return (
    <div style={{ padding: '1.5rem', background: '#17171b' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500 }}>Metrónomo</h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          {BEATS_OPTIONS.map(n => (
            <button key={n} type="button" className="btn-secondary" onClick={() => setBeats(n)}
              style={{ opacity: beats === n ? 1 : 0.5, minWidth: '44px' }}>{n}/4</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.2rem', margin: '1.5rem 0' }}>
        <button type="button" className="btn-secondary" onClick={() => adjust(-1)} aria-label="Bajar BPM"><Minus size={18} /></button>
        <div style={{ textAlign: 'center', minWidth: '120px' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 500, lineHeight: 1 }}>{bpm}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>BPM</div>
        </div>
        <button type="button" className="btn-secondary" onClick={() => adjust(1)} aria-label="Subir BPM"><Plus size={18} /></button>
      </div>

      <input type="range" min="40" max="240" value={bpm} onChange={e => setBpm(parseInt(e.target.value, 10))} style={{ width: '100%' }} />

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '1.2rem 0' }}>
        {Array.from({ length: beats }, (_, i) => (
          <div key={i} style={{
            width: '18px', height: '18px', borderRadius: '50%',
            background: currentBeat === i ? (i === 0 ? '#ef4444' : '#f7f4ef') : 'rgba(255,255,255,0.1)',
            transition: 'background 0.05s'
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button type="button" className="btn-primary" onClick={running ? stop : start} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px', justifyContent: 'center' }}>
          {running ? <><Square size={16} /> Parar</> : <><Play size={16} /> Iniciar</>}
        </button>
        <button type="button" className="btn-secondary" onClick={tapTempo}>Tap</button>
      </div>
    </div>
  );
}
