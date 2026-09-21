import { useState, useEffect, useRef, useCallback } from 'react';

// ── MIDI → saltar a una sección ──────────────────────────────────────────
// "Aprender": marcas una sección, tocas una tecla / pedal / botón y queda
// asignada. Después, esa tecla salta a esa sección (con el conteo de 2 compases,
// igual que un clic). Usa la Web MIDI API del webview (el mismo mecanismo que
// Bandly Lights), sin tocar Rust.
//
// Qué se puede asignar: nota (Note On), CC (pedales, botones) o Program Change
// (pedaleras). Se guarda POR CANCIÓN en este equipo (un controlador es del
// equipo, no de la cuenta): localStorage → { [sequenceId]: { [uidSección]: "n:1:36" } }.

const STORAGE_KEY = 'bandly_midi_sections';

function loadAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function saveAll(all) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* sin storage */ }
}

// "n:1:36" → "N36" · "c:1:20" → "CC20" · "p:1:5" → "PC5"
export function midiKeyLabel(key) {
  if (!key) return '';
  const [kind, , num] = key.split(':');
  return `${kind === 'n' ? 'N' : kind === 'c' ? 'CC' : 'PC'}${num}`;
}

function parse(data) {
  const [st, d1, d2 = 0] = data;
  const type = st & 0xf0;
  const ch = (st & 0x0f) + 1;
  if (type === 0x90 && d2 > 0) return `n:${ch}:${d1}`;   // Note On (velocidad 0 = Note Off)
  if (type === 0xb0 && d2 > 0) return `c:${ch}:${d1}`;   // CC (pedal / botón al pisar)
  if (type === 0xc0) return `p:${ch}:${d1}`;             // Program Change
  return null;
}

export function useSectionMidi({ sequenceId, onTrigger }) {
  const [all, setAll] = useState(loadAll);
  const [learningUid, setLearningUid] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | ok | denied
  const mine = (sequenceId && all[sequenceId]) || {};

  const onTriggerRef = useRef(onTrigger);
  useEffect(() => { onTriggerRef.current = onTrigger; });
  const stateRef = useRef({});
  useEffect(() => { stateRef.current = { sequenceId, learningUid, mine }; });
  const lastFire = useRef({ key: '', at: 0 });

  const assign = useCallback((uid, key) => {
    setAll(prev => {
      const seq = { ...(prev[stateRef.current.sequenceId] || {}) };
      for (const u of Object.keys(seq)) if (seq[u] === key) delete seq[u]; // una tecla, una sección
      seq[uid] = key;
      const next = { ...prev, [stateRef.current.sequenceId]: seq };
      saveAll(next);
      return next;
    });
  }, []);

  const clear = useCallback((uid) => {
    setAll(prev => {
      const seq = { ...(prev[stateRef.current.sequenceId] || {}) };
      delete seq[uid];
      const next = { ...prev, [stateRef.current.sequenceId]: seq };
      saveAll(next);
      return next;
    });
  }, []);

  // Solo se abre el MIDI cuando hace falta (hay algo asignado o se está aprendiendo):
  // así no se pide permiso al arrancar para quien no usa MIDI.
  const needed = !!learningUid || Object.keys(mine).length > 0;

  useEffect(() => {
    if (!needed) return;
    if (!navigator.requestMIDIAccess) return; // sin soporte: simplemente no hay MIDI
    let access = null;
    let cancelled = false;

    const onMessage = (msg) => {
      const key = parse(msg.data);
      if (!key) return;
      const now = performance.now();
      // Un pedal manda varios mensajes seguidos: se toma solo el primero.
      if (lastFire.current.key === key && now - lastFire.current.at < 300) return;
      lastFire.current = { key, at: now };

      const { learningUid: learning, mine: map } = stateRef.current;
      if (learning) {
        assign(learning, key);
        setLearningUid(null);
        return;
      }
      const uid = Object.keys(map).find(u => map[u] === key);
      if (uid) onTriggerRef.current?.(uid);
    };

    const attach = (acc) => { for (const input of acc.inputs.values()) input.onmidimessage = onMessage; };

    navigator.requestMIDIAccess().then((acc) => {
      if (cancelled) return;
      access = acc;
      setStatus('ok');
      attach(acc);
      acc.onstatechange = () => attach(acc); // se enchufó / desenchufó un aparato
    }).catch(() => setStatus('denied'));

    return () => {
      cancelled = true;
      if (access) {
        access.onstatechange = null;
        for (const input of access.inputs.values()) input.onmidimessage = null;
      }
    };
  }, [needed, assign]);

  // Escape cancela el aprendizaje
  useEffect(() => {
    if (!learningUid) return;
    const onKey = (e) => { if (e.key === 'Escape') setLearningUid(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [learningUid]);

  return {
    status,
    learningUid,
    labelFor: (uid) => midiKeyLabel(mine[uid]),
    startLearn: (uid) => setLearningUid(uid),
    cancelLearn: () => setLearningUid(null),
    clear,
  };
}
