import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Trash2, ShieldCheck, Info } from 'lucide-react';

export default function MyProfile({ profile, session }) {
  const [blockedDates, setBlockedDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.blocked_dates) {
      setBlockedDates(profile.blocked_dates);
    }
  }, [profile]);

  const handleAddDate = async () => {
    if (!selectedDate) return;
    if (blockedDates.includes(selectedDate)) {
      alert('Esta fecha ya está bloqueada.');
      return;
    }
    
    const newDates = [...blockedDates, selectedDate].sort();
    await saveDates(newDates);
  };

  const handleRemoveDate = async (dateToRemove) => {
    const newDates = blockedDates.filter(d => d !== dateToRemove);
    await saveDates(newDates);
  };

  const saveDates = async (newDates) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ blocked_dates: newDates })
        .eq('id', profile.id);
        
      if (error) throw error;
      setBlockedDates(newDates);
      // Actualizar el perfil local en cache si se necesita
      const cached = localStorage.getItem('bandly_profile_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.blocked_dates = newDates;
        localStorage.setItem('bandly_profile_cache', JSON.stringify(parsed));
      }
    } catch (e) {
      alert('Error al guardar fechas: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
          <ShieldCheck size={28} color="var(--primary)" />
          <h2 style={{ margin: 0 }}>Mi Disponibilidad</h2>
        </div>
        
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', lineHeight: 1.5 }}>
          Añade las fechas en las que <strong>no estarás disponible</strong> por viajes, trabajo u otros compromisos. 
          El director de la organización no podrá asignarte a eventos en estos días.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>Selecciona una fecha</label>
            <input 
              type="date" 
              className="input-field" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '100%', padding: '12px' }}
            />
          </div>
          <button 
            onClick={handleAddDate} 
            disabled={loading || !selectedDate}
            className="btn-primary" 
            style={{ padding: '12px 24px', height: '48px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Calendar size={18} />
            {loading ? 'Guardando...' : 'Bloquear Fecha'}
          </button>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Fechas Bloqueadas ({blockedDates.length})
          </h3>
          
          {blockedDates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>
              <Info size={24} style={{ marginBottom: '10px' }} />
              <p style={{ margin: 0 }}>No tienes ninguna fecha bloqueada.</p>
              <p style={{ margin: '5px 0 0', fontSize: '0.8rem' }}>Actualmente estás disponible para todos los eventos.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {blockedDates.map(date => (
                <div key={date} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', 
                  padding: '10px 15px', borderRadius: '8px'
                }}>
                  <span style={{ fontWeight: 'bold', color: '#fca5a5' }}>
                    {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={() => handleRemoveDate(date)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    title="Desbloquear fecha"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
