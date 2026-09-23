import { useEffect, useRef } from 'react';
import { sendLocalCue, sendLocalBpm, getLocalCueLeadMs } from '../utils/localCue';

// El motor de audio reporta la posición cada 100 ms; si el cue se mandara al
// detectar que ya pasó, llegaría hasta 100 ms tarde. Por eso, en cada reporte se
// mira qué cues caen en los próximos milisegundos y se agenda un temporizador
// para el instante exacto (la posición se recalcula en cada reporte, así que no
// se acumula deriva). La ventana debe ser mayor que el intervalo de sondeo.
const LOOKAHEAD_MS = 250;

// Manda a Bandly Lights (misma PC, OSC por UDP a 127.0.0.1) las secciones y los
// cues de luz de la línea de tiempo. Independiente del envío por Supabase, que
// sigue siendo el que usa Presenter y Lights en otra computadora.
export function useLocalLightCues({ isPlaying, playbackSample, sampleRate, timelineMarkers, lightEvents, bpm }) {
  const lastKeyRef = useRef({});

  // Tempo para el strobe: al empezar a reproducir, al cambiar, y cada 4 s por si
  // Lights se abrió tarde (el UDP local no confirma que llegó).
  useEffect(() => {
    if (!isPlaying || !(bpm > 0)) return;
    sendLocalBpm(bpm);
    const iv = setInterval(() => sendLocalBpm(bpm), 4000);
    return () => clearInterval(iv);
  }, [isPlaying, bpm]);

  useEffect(() => {
    if (!isPlaying) { lastKeyRef.current = {}; return; }

    const sr = sampleRate || 44100;
    // El adelanto se aplica al reloj entero (no solo a los temporizadores): así
    // la recuperación de posición y los cues agendados coinciden y no se repiten.
    const pos = playbackSample + Math.round((getLocalCueLeadMs() / 1000) * sr);
    const lanes = [
      ['section', timelineMarkers.map(m => ({ key: m.id, t: m.sample, label: m.label }))],
      ['light', lightEvents.map(ev => ({ key: ev.key, t: ev.t, label: ev.scene }))],
    ];
    const timers = [];

    for (const [lane, events] of lanes) {
      // Al entrar a mitad de canción (o tras un salto) Lights debe quedar en el
      // look que corresponde a esta posición: se manda el último cue ya pasado.
      let current = null;
      for (const ev of events) {
        if (ev.t <= pos) current = ev;
        else break;
      }
      if (current && current.key !== lastKeyRef.current[lane]) {
        lastKeyRef.current[lane] = current.key;
        if (current.label) sendLocalCue(current.label);
      }

      for (const ev of events) {
        if (ev.t <= pos) continue;
        const ms = ((ev.t - pos) / sr) * 1000;
        if (ms > LOOKAHEAD_MS) break;
        timers.push(setTimeout(() => {
          if (lastKeyRef.current[lane] === ev.key) return;
          lastKeyRef.current[lane] = ev.key;
          if (ev.label) sendLocalCue(ev.label);
        }, Math.max(0, ms)));
      }
    }

    return () => timers.forEach(clearTimeout);
  }, [isPlaying, playbackSample, sampleRate, timelineMarkers, lightEvents]);
}
