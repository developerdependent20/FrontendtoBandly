import React, { useState, useEffect } from 'react';
import { isTauri, safeInvoke } from '../../utils/tauri';
import { Settings, Headphones, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { getAudioPrefs, saveAudioPrefs, getLastFileRate, audioInitArgs, BUFFER_CHOICES } from '../../utils/audioPrefs';

const selectStyle = { width: '100%', padding: '0.7rem 0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'white', fontSize: '0.9rem', colorScheme: 'dark' };
const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: '500', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '0.5rem' };
const khz = (hz) => `${(hz / 1000).toLocaleString('es', { maximumFractionDigits: 1 })} kHz`;

export default function HardwarePicker({ onConfigured }) {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prefs, setPrefs] = useState(getAudioPrefs);
  const [options, setOptions] = useState(null); // { sample_rates, buffer_min, buffer_max } del dispositivo elegido

  const scanDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await safeInvoke('get_audio_devices');
      if (list && Array.isArray(list)) setDevices(list);
      else if (!isTauri()) {
        setDevices([
          { id: 'mock-1', name: 'Virtual Studio Interfaz (Modo Demo)', host: 'WebAudio' },
          { id: 'mock-2', name: 'Navegador Loopback', host: 'WebAudio' }
        ]);
      }
      const lastId = localStorage.getItem('bandly_last_audio_device');
      if (lastId && list) {
        const found = list.find(d => d.id === lastId);
        if (found) setSelectedDevice(found);
      }
    } catch (e) {
      setError("No se pudieron detectar controladores de audio. Verifica tus drivers ASIO.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanDevices();
  }, []);

  // Qué frecuencias y buffers admite el dispositivo elegido. Si el driver no lo informa
  // (p. ej. ya está en uso), se ofrecen las opciones habituales.
  useEffect(() => {
    let alive = true;
    setOptions(null);
    if (!selectedDevice || !isTauri()) return () => { alive = false; };
    safeInvoke('get_device_audio_options', { deviceId: selectedDevice.id })
      .then(o => { if (alive) setOptions(o); })
      .catch(() => {});
    return () => { alive = false; };
  }, [selectedDevice]);

  const handleConfirm = async () => {
    if (!selectedDevice) return;
    setLoading(true);
    try {
      await safeInvoke('kill_audio_stream');
      await new Promise(r => setTimeout(r, 200)); // Pequeña pausa para que el driver respire
      saveAudioPrefs(prefs);
      await safeInvoke('init_audio_stream', audioInitArgs(selectedDevice.id));
      localStorage.setItem('bandly_last_audio_device', selectedDevice.id);
      localStorage.setItem('bandly_last_audio_host', selectedDevice.host);
      onConfigured(selectedDevice);
    } catch (e) {
      console.error("[HardwarePicker] Error:", e);
      setError(`FALLO CRÍTICO: ${e}. Intenta desconectar y volver a conectar la interfaz, o selecciona otro controlador.`);
    } finally {
      setLoading(false);
    }
  };

  const lastRate = getLastFileRate();
  const rateChoices = options?.sample_rates?.length ? options.sample_rates : [44100, 48000];
  const bufferChoices = BUFFER_CHOICES.filter(b => !options?.buffer_max || (b >= options.buffer_min && b <= options.buffer_max));
  const latencyMs = (b) => (b / (prefs.sampleRate || lastRate || 48000) * 1000).toFixed(1);

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '4rem auto', padding: '2.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--primary)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 0 20px rgba(0, 0, 0, 0.35)' }}>
          <Settings size={30} color="white" />
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '500', letterSpacing: '-1px' }}>Configuración de Audio</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Selecciona tu interfaz de audio para comenzar.</p>
      </div>

      {error ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', color: '#fca5a5', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <p style={{ fontSize: '0.85rem' }}>{error}</p>
        </div>
      ) : null}

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '500', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Controlador / Interfaz</label>
          <button onClick={scanDevices} className="icon-btn-subtle" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Escaneando hardware...</div>
          ) : devices.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>No se encontraron dispositivos.</div>
          ) : (
            devices.map((device, idx) => (
              <div 
                key={device.id || idx} 
                onClick={() => setSelectedDevice(device)}
                className={`list-item ${selectedDevice?.id === device.id ? 'active' : ''}`}
                style={{ 
                  padding: '1.2rem', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: selectedDevice?.id === device.id ? 'rgba(247, 244, 239, 0.08)' : 'rgba(255,255,255,0.03)',
                  borderColor: selectedDevice?.id === device.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <Headphones size={20} color={selectedDevice?.id === device.id ? 'var(--primary)' : 'var(--text-muted)'} />
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '1rem' }}>{device.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: '500', letterSpacing: '0.5px' }}>
                      Driver: {device.host}
                    </div>
                  </div>
                </div>
                {selectedDevice?.id === device.id && (
                  <div style={{ background: 'var(--primary)', padding: '4px', borderRadius: '50%', display: 'flex' }}>
                    <Check size={14} color="white" strokeWidth={3} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {selectedDevice && isTauri() && (
        <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Frecuencia de muestreo</label>
            <select style={selectStyle} value={prefs.sampleRate} onChange={e => setPrefs(p => ({ ...p, sampleRate: parseInt(e.target.value, 10) }))}>
              <option value={0}>Automática{lastRate ? ` (${khz(lastRate)} · igual a las pistas)` : ' (48 kHz)'}</option>
              {rateChoices.map(r => <option key={r} value={r}>{khz(r)}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Buffer</label>
            <select style={selectStyle} value={prefs.bufferSize} onChange={e => setPrefs(p => ({ ...p, bufferSize: parseInt(e.target.value, 10) }))}>
              <option value={0}>Automático (el del driver)</option>
              {bufferChoices.map(b => <option key={b} value={b}>{b} muestras · {latencyMs(b)} ms</option>)}
            </select>
          </div>
          <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Un buffer más chico responde más rápido (pads y drum pad en vivo) pero exige más al procesador; si oyes cortes, súbelo.
            Tus pistas suenan mejor cuando la tarjeta trabaja a su misma frecuencia{lastRate ? ` (las últimas estaban a ${khz(lastRate)})` : ''}.
          </p>
        </div>
      )}

      <button 
        className="btn-primary" 
        style={{ width: '100%', padding: '1.2rem', fontSize: '1rem', fontWeight: '500' }}
        disabled={!selectedDevice || loading}
        onClick={handleConfirm}
      >
        {loading ? 'CONECTANDO...' : 'INICIAR MOTOR DE AUDIO'}
      </button>


    </div>
  );
}
