import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Radio, Play, CheckCircle2, Loader2, Pause, Square, WifiOff, SkipBack, SkipForward, ChevronLeft, ChevronRight, ListMusic, Layers, Grid3x3 } from 'lucide-react';
import { supabase } from '../supabaseClient';

// "Modo En Vivo": control remoto desde el celular (o cualquier navegador)
// hacia el DAW de la computadora conectada a la interfaz de audio. No
// reproduce nada acá — solo manda un comando por Supabase Realtime
// (broadcast, sin tabla, efímero) y la computadora hace el load+play real.
// Pensado para que cualquiera del equipo de sonido/media pueda arrancar la
// canción correcta sin acercarse al computador ni abrir el DAW completo.
// Además del play/stop: canción anterior/siguiente, saltar de sección (con el
// conteo de siempre) y disparar los pads con su volumen. El DAW publica su
// estado (secciones, activa, pad sonando) y este control solo lo refleja.
const ON_PRIMARY = '#101012'; // texto sobre var(--primary) (crema claro)
const PAD_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function TabButton({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '0.7rem 0.5rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer',
        background: active ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
        color: active ? ON_PRIMARY : 'var(--text-muted)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      {icon} {label}
    </button>
  );
}

function TransportButton({ onClick, icon, title, disabled, bg = 'rgba(255,255,255,0.08)' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={{
        width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1
      }}
    >
      {icon}
    </button>
  );
}

export default function LiveRemote({ orgId, events }) {
  // Solo trackea una selección EXPLÍCITA del usuario; si no ha elegido nada
  // todavía, se deriva el primer evento de hoy directo en el render (evita
  // el efecto que solo existía para sincronizar ese default).
  const [explicitEventId, setExplicitEventId] = useState(null);
  const [daw, setDaw] = useState(null); // null = todavía no sabemos si hay computadora conectada
  const [sendingId, setSendingId] = useState(null);
  const channelRef = useRef(null);
  const [tab, setTab] = useState('setlist'); // setlist | secciones | pads
  const [padVolLocal, setPadVolLocal] = useState(null); // mientras se arrastra el volumen
  const lastVolSend = useRef(0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysEvents = useMemo(
    () => (events || []).filter(ev => ev.date && ev.date.split('T')[0] === todayStr),
    [events, todayStr]
  );

  const selectedEventId = explicitEventId || todaysEvents[0]?.id || null;
  const activeEvent = todaysEvents.find(ev => ev.id === selectedEventId) || null;
  const setlist = useMemo(() => {
    return (activeEvent?.event_songs || [])
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [activeEvent]);

  useEffect(() => {
    if (!orgId) return;
    let lastSeen = 0; // última vez que el DAW dio señal de vida
    const requestStatus = () => channel.send({ type: 'broadcast', event: 'request_status', payload: {} });
    const channel = supabase.channel(`daw_remote_${orgId}`)
      .on('broadcast', { event: 'daw_status' }, ({ payload }) => {
        lastSeen = Date.now();
        setDaw(payload || null);
      })
      .subscribe((status) => {
        // Si el DAW ya estaba abierto, pedirle su estado ahora en vez de esperar
        // a que algo cambie.
        if (status === 'SUBSCRIBED') requestStatus();
      });
    channelRef.current = channel;

    // Sin conexión, insistir cada 3 s (el primer aviso pudo perderse o el DAW
    // abrirse después). El DAW da señal de vida cada 5 s: si pasan 15 s sin
    // oírlo (se cerró o se cayó la red) el celular vuelve a "Esperando".
    const watchdog = setInterval(() => {
      if (Date.now() - lastSeen > 15000) setDaw(null);
      if (Date.now() - lastSeen > 3000) requestStatus();
    }, 3000);

    return () => {
      clearInterval(watchdog);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  const sendCommand = async (event, songId) => {
    if (!channelRef.current) return;
    setSendingId(songId);
    await channelRef.current.send({ type: 'broadcast', event, payload: { songId } });
    setTimeout(() => setSendingId(prev => (prev === songId ? null : prev)), 2000);
  };

  // "play_song" carga la canción de cero en el motor (para cuando todavía no
  // está en memoria). "resume_song" solo retoma donde quedó — la canción ya
  // está cargada, así que evitamos recargarla desde cero al reanudar.
  const handlePlay = (songId) => sendCommand('play_song', songId);
  const handleResume = (songId) => sendCommand('resume_song', songId);
  const handlePause = (songId) => sendCommand('pause_song', songId);
  const handleStop = (songId) => sendCommand('stop_song', songId);

  const sendRaw = (event, payload = {}) => channelRef.current?.send({ type: 'broadcast', event, payload });

  // Volumen de pads: se manda mientras se arrastra, pero como máximo cada 80 ms.
  const handlePadVolume = (value, timeStamp) => {
    setPadVolLocal(value);
    if (timeStamp - lastVolSend.current > 80) {
      lastVolSend.current = timeStamp;
      sendRaw('pad_volume', { value });
    }
  };
  const commitPadVolume = () => {
    if (padVolLocal !== null) sendRaw('pad_volume', { value: padVolLocal });
    setPadVolLocal(null);
  };

  const sections = daw?.sections || [];
  const activeBlock = daw?.activeBlock ?? -1;
  const pad = daw?.pad || { activeKey: null, volume: 0.7 };
  const padVolume = padVolLocal ?? pad.volume;
  const songLoaded = !!daw?.songId;
  const enabled = !!daw;

  const circleBtn = (bg, enabled) => ({
    width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, background: bg, border: 'none', cursor: enabled ? 'pointer' : 'not-allowed'
  });

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Radio size={30} color="var(--primary)" /> Modo En Vivo
        </h2>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '0.9rem 1.2rem', borderRadius: '12px',
        marginBottom: '1.5rem', fontWeight: '500', fontSize: '0.85rem',
        background: daw ? 'rgba(16,185,129,0.1)' : 'rgba(168, 168, 166,0.1)',
        border: `1px solid ${daw ? 'rgba(16,185,129,0.4)' : 'rgba(168, 168, 166,0.3)'}`,
        color: daw ? '#10b981' : 'var(--text-muted)'
      }}>
        {daw ? <CheckCircle2 size={18} /> : <WifiOff size={18} />}
        {daw ? 'Conectado con la computadora' : 'Esperando conexión con la computadora del DAW...'}
      </div>

      {daw && (
        <div style={{ padding: '1rem 1.2rem', borderRadius: '14px', marginBottom: '1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '4px' }}>
            {songLoaded ? (daw.isPlaying ? '🔴 SONANDO AHORA' : 'CARGADA · EN PAUSA') : 'SIN CANCIÓN CARGADA'}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '500', color: 'white', marginBottom: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {daw.songTitle || 'Elige una canción de la lista'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <TransportButton onClick={() => sendRaw('prev_song')} icon={<SkipBack size={20} color="white" />} title="Canción anterior" disabled={!songLoaded} />
            <TransportButton onClick={() => sendRaw('prev_section')} icon={<ChevronLeft size={20} color="white" />} title="Sección anterior" disabled={!songLoaded} />
            <TransportButton
              onClick={() => sendRaw(daw.isPlaying ? 'pause_song' : 'resume_song')}
              icon={daw.isPlaying ? <Pause size={20} color="white" fill="white" /> : <Play size={20} color={ON_PRIMARY} fill={ON_PRIMARY} />}
              title={daw.isPlaying ? 'Pausar' : 'Reanudar'}
              bg={daw.isPlaying ? '#f59e0b' : 'var(--primary)'}
              disabled={!songLoaded}
            />
            <TransportButton onClick={() => sendRaw('stop_song')} icon={<Square size={20} color="white" fill="white" />} title="Detener" bg="#ef4444" disabled={!songLoaded} />
            <TransportButton onClick={() => sendRaw('next_section')} icon={<ChevronRight size={20} color="white" />} title="Sección siguiente" disabled={!songLoaded} />
            <TransportButton onClick={() => sendRaw('next_song')} icon={<SkipForward size={20} color="white" />} title="Canción siguiente" disabled={!songLoaded} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        <TabButton active={tab === 'setlist'} onClick={() => setTab('setlist')} label="Setlist" icon={<ListMusic size={16} />} />
        <TabButton active={tab === 'secciones'} onClick={() => setTab('secciones')} label="Secciones" icon={<Layers size={16} />} />
        <TabButton active={tab === 'pads'} onClick={() => setTab('pads')} label="Pads" icon={<Grid3x3 size={16} />} />
      </div>

      {tab === 'setlist' && (
        <>
        {todaysEvents.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {todaysEvents.map(ev => (
              <button
                key={ev.id}
                onClick={() => setExplicitEventId(ev.id)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
                  background: selectedEventId === ev.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  color: selectedEventId === ev.id ? ON_PRIMARY : 'var(--text-muted)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {ev.title || 'Evento'}
              </button>
            ))}
          </div>
        )}

        {!activeEvent ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Radio size={36} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-muted)' }}>No hay ningún evento programado para hoy.</p>
          </div>
        ) : setlist.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p style={{ color: 'var(--text-muted)' }}>Este evento todavía no tiene repertorio armado.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {setlist.map((es, i) => {
              const song = es.songs;
              const isSending = sendingId === es.song_id;
              const isLoadedOnDaw = daw?.songId === es.song_id;
              const isPlayingOnDaw = isLoadedOnDaw && daw?.isPlaying;

              return (
                <div
                  key={es.id || i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', padding: '1rem 1.2rem', borderRadius: '12px',
                    background: isPlayingOnDaw ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isPlayingOnDaw ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                    opacity: daw ? 1 : 0.5, transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)', width: '20px', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: '500', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {song?.title || 'Canción'}
                    </div>
                    {isPlayingOnDaw ? (
                      <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        🔴 SONANDO AHORA
                      </div>
                    ) : isLoadedOnDaw ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Pause size={12} /> Cargada, en pausa
                      </div>
                    ) : es.selected_key ? (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Tono: {es.selected_key}</div>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {isLoadedOnDaw ? (
                      <>
                        <button
                          onClick={() => (isPlayingOnDaw ? handlePause(es.song_id) : handleResume(es.song_id))}
                          disabled={!daw}
                          title={isPlayingOnDaw ? 'Pausar' : 'Reanudar'}
                          style={circleBtn(isPlayingOnDaw ? '#f59e0b' : 'var(--primary)', !!daw)}
                        >
                          {isSending ? <Loader2 size={16} color={ON_PRIMARY} className="animate-spin" /> : isPlayingOnDaw ? <Pause size={16} color="white" fill="white" /> : <Play size={16} color={ON_PRIMARY} fill={ON_PRIMARY} />}
                        </button>
                        <button
                          onClick={() => handleStop(es.song_id)}
                          disabled={!daw}
                          title="Detener"
                          style={circleBtn('#ef4444', !!daw)}
                        >
                          <Square size={14} color="white" fill="white" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handlePlay(es.song_id)}
                        disabled={!daw}
                        title="Reproducir"
                        style={circleBtn('var(--primary)', !!daw)}
                      >
                        {isSending ? <Loader2 size={16} color={ON_PRIMARY} className="animate-spin" /> : <Play size={16} color={ON_PRIMARY} fill={ON_PRIMARY} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
      )}

      {tab === 'secciones' && (
        !songLoaded || sections.length === 0 ? (
          <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              {songLoaded ? 'Esta canción todavía no tiene secciones marcadas.' : 'Carga una canción para ver sus secciones.'}
            </p>
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 0.8rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Toca una sección para saltar a ella (entra con el conteo de 2 compases).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
              {sections.map((sec, idx) => {
                const on = idx === activeBlock;
                return (
                  <button
                    key={idx}
                    onClick={() => sendRaw('jump_section', { idx })}
                    disabled={!enabled}
                    style={{
                      padding: '1.1rem 0.8rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '500', cursor: enabled ? 'pointer' : 'not-allowed',
                      color: 'white', textAlign: 'left', minHeight: '64px',
                      background: on ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${on ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                      borderLeft: `6px solid ${sec.color}`
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{idx + 1}</div>
                    {sec.label}
                  </button>
                );
              })}
            </div>
          </>
        )
      )}

      {tab === 'pads' && (
        <div style={{ opacity: enabled ? 1 : 0.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Pad sonando: <strong style={{ color: 'white' }}>{pad.activeKey || '—'}</strong>
            </span>
            <button
              onClick={() => sendRaw('pad_release')}
              disabled={!enabled || !pad.activeKey}
              style={{ padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '500', cursor: enabled && pad.activeKey ? 'pointer' : 'not-allowed', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', opacity: pad.activeKey ? 1 : 0.4 }}
            >
              Soltar pad
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
            {PAD_NOTES.map(note => {
              const on = pad.activeKey === note;
              return (
                <button
                  key={note}
                  onClick={() => sendRaw('pad_key', { note })}
                  disabled={!enabled}
                  style={{
                    padding: '1.4rem 0', borderRadius: '12px', fontSize: '1.05rem', fontWeight: '500', cursor: enabled ? 'pointer' : 'not-allowed', touchAction: 'manipulation',
                    color: on ? ON_PRIMARY : 'white',
                    background: on ? 'var(--primary)' : note.includes('#') ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${on ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`
                  }}
                >
                  {note}
                </button>
              );
            })}
          </div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Volumen de pads · {Math.round(padVolume * 100)}%
          </label>
          <input
            type="range" min="0" max="1" step="0.01"
            value={padVolume}
            disabled={!enabled}
            onChange={e => handlePadVolume(parseFloat(e.target.value), e.timeStamp)}
            onPointerUp={commitPadVolume}
            onTouchEnd={commitPadVolume}
            onKeyUp={commitPadVolume}
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  );
}