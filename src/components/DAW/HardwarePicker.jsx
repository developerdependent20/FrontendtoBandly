import React, { useState, useEffect } from 'react';
import { isTauri, safeInvoke } from '../../utils/tauri';
import { Settings, Headphones, Check, RefreshCw, AlertCircle } from 'lucide-react';

export default function HardwarePicker({ onConfigured }) {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const scanDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await safeInvoke('get_audio_devices');
      if (list && Array.isArray(list)) setDevices(list);
      else if (!isTauri()) {
        // Mock de dispositivos para entorno web (visualización pro)
        setDevices([
          { id: 'mock-1', name: 'Virtual Studio Interfaz (Modo Demo)', host: 'WebAudio' },
          { id: 'mock-2', name: 'Navegador Loopback', host: 'WebAudio' }
        ]);
      }
      // Intentar recuperar el último dispositivo usado
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

  const handleConfirm = async () => {
    if (!selectedDevice) return;
    setLoading(true);
    try {
      // Usamos el ID único (Host_Nombre)
      await safeInvoke('init_audio_stream', { 
        deviceId: selectedDevice.id
      });
      localStorage.setItem('bandly_last_audio_device', selectedDevice.id);
      localStorage.setItem('bandly_last_audio_host', selectedDevice.host);
      onConfigured(selectedDevice);
    } catch (e) {
      setError(`Error al inicializar el motor: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '4rem auto', padding: '2.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--primary)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
          <Settings size={30} color="white" />
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-1px' }}>Configuración de Audio</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Selecciona tu interfaz para una experiencia de baja latencia.</p>
      </div>

      {error ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', color: '#fca5a5', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <p style={{ fontSize: '0.85rem' }}>{error}</p>
        </div>
      ) : null}

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px' }}>Controlador / Interfaz</label>
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
                  background: selectedDevice?.id === device.id ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
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
                    <div style={{ fontWeight: '700', fontSize: '1rem' }}>{device.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>
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

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '1rem', display: 'block' }}>Optimización de Rendimiento</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[512, 1024, 2048].map(size => (
            <div 
              key={size}
              onClick={() => {
                safeInvoke('set_audio_buffer_size', { size });
                localStorage.setItem('bandly_buffer_size', size.toString());
              }}
              style={{
                padding: '0.8rem',
                textAlign: 'center',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '700',
                background: localStorage.getItem('bandly_buffer_size') === size.toString() ? 'rgba(34, 211, 238, 0.1)' : 'rgba(255,255,255,0.03)',
                border: '1px solid',
                borderColor: localStorage.getItem('bandly_buffer_size') === size.toString() ? '#22d3ee' : 'rgba(255,255,255,0.1)',
                color: localStorage.getItem('bandly_buffer_size') === size.toString() ? '#22d3ee' : 'var(--text-muted)'
              }}
            >
              {size === 2048 ? 'Estable' : size === 1024 ? 'Estándar' : 'Baja Lat.'}
              <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>{size} samples</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.8rem' }}>
          💡 Si escuchas cortes, selecciona **Estable (2048)**.
        </p>
      </div>

      <button 
        className="btn-primary" 
        style={{ width: '100%', padding: '1.2rem', fontSize: '1rem', fontWeight: '800' }}
        disabled={!selectedDevice || loading}
        onClick={handleConfirm}
      >
        INICIAR MOTOR DE AUDIO
      </button>

      <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
        Recomendamos usar controladores **ASIO** en Windows para obtener la latencia más baja posible.
      </p>
    </div>
  );
}
