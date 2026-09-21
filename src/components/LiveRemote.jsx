import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Radio, Play, CheckCircle2, Loader2, Pause, Square, WifiOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

// "Modo En Vivo": control remoto desde el celular (o cualquier navegador)
// hacia el DAW de la computadora conectada a la interfaz de audio. No
// reproduce nada acá — solo manda un comando por Supabase Realtime
// (broadcast, sin tabla, efímero) y la computadora hace el load+play real.
// Pensado para que cualquiera del equipo de sonido/media pueda arrancar la
// canción correcta sin acercarse al computador ni abrir el DAW completo.
export default function LiveRemote({ orgId, events }) {
  // Solo trackea una selección EXPLÍCITA del usuario; si no ha elegido nada
  // todavía, se deriva el primer evento de hoy directo en el render (evita
  // el efecto que solo existía para sincronizar ese default).
  const [explicitEventId, setExplicitEventId] = useState(null);
  const [daw, setDaw] = useState(null); // null = todavía no sabemos si hay computadora conectada
  const [sendingId, setSendingId] = useState(null);
  const channelRef = useRef(null);

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
    const channel = supabase.channel(`daw_remote_${orgId}`)
      .on('broadcast', { event: 'daw_status' }, ({ payload }) => setDaw(payload || null))
      .subscribe();
    channelRef.current = channel;
    return () => {
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

      {todaysEvents.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {todaysEvents.map(ev => (
            <button
              key={ev.id}
              onClick={() => setExplicitEventId(ev.id)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer',
                background: selectedEventId === ev.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: selectedEventId === ev.id ? 'white' : 'var(--text-muted)',
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
                        {isSending ? <Loader2 size={16} color="white" className="animate-spin" /> : isPlayingOnDaw ? <Pause size={16} color="white" fill="white" /> : <Play size={16} color="white" fill="white" />}
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
                      {isSending ? <Loader2 size={16} color="white" className="animate-spin" /> : <Play size={16} color="white" fill="white" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
