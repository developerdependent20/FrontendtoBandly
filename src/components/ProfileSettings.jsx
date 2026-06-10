import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Calendar, Save, Trash2, Camera, Loader2, Plus, LogOut } from 'lucide-react';
import { isTauri } from '../utils/tauri';

export default function ProfileSettings({ profile, session, onLogout }) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [blockedDates, setBlockedDates] = useState(profile?.blocked_dates || []);
  const [loading, setLoading] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sincronizar estado local si el profile cambia
  useEffect(() => {
    setFullName(profile?.full_name || '');
    setAvatarUrl(profile?.avatar_url || '');
    setBlockedDates(profile?.blocked_dates || []);
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    setSuccessMsg('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
          blocked_dates: blockedDates
        })
        .eq('id', profile.id);

      if (error) throw error;
      setSuccessMsg('Perfil actualizado correctamente.');
      
      // Auto ocultar mensaje
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      alert("Error al guardar perfil: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const addBlockedDate = () => {
    if (!newDate) return;
    if (blockedDates.includes(newDate)) return; // No duplicados
    setBlockedDates([...blockedDates, newDate].sort());
    setNewDate('');
  };

  const removeBlockedDate = (date) => {
    setBlockedDates(blockedDates.filter(d => d !== date));
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00Z');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <User size={32} color="var(--primary)" /> Mi Perfil
        </h2>
        {onLogout && (
          <button onClick={onLogout} className="btn-secondary-outline" style={{ border: '1px solid #ef4444', color: '#ef4444' }}>
            <LogOut size={16} /> Cerrar Sesión
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={20} color="var(--primary)" /> Información Básica
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '500px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Nombre Completo</label>
            <input 
              type="text" 
              className="input-field" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>URL de Avatar (Opcional)</label>
            <input 
              type="text" 
              className="input-field" 
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
            {avatarUrl && (
              <div style={{ marginTop: '1rem', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                <img src={avatarUrl} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 className="section-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
          <Calendar size={20} color="#f59e0b" /> Bloqueo de Fechas (Disponibilidad)
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Selecciona las fechas en las que <strong>no estarás disponible</strong>. Los directores verán esta información en el calendario y no podrán asignarte en esos días.
        </p>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem', maxWidth: '400px' }}>
          <input 
            type="date" 
            className="input-field" 
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={addBlockedDate} className="btn-secondary" style={{ width: 'auto', padding: '0.75rem 1rem' }}>
            <Plus size={18} /> Bloquear
          </button>
        </div>

        {blockedDates.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {blockedDates.map(date => (
              <div key={date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fecaca', fontWeight: '500' }}>
                  <Calendar size={16} color="#ef4444" /> {formatDate(date)}
                </span>
                <button onClick={() => removeBlockedDate(date)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.5rem' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Calendar size={32} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-muted)' }}>No tienes fechas bloqueadas.</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'flex-end' }}>
        {successMsg && <span style={{ color: '#22c55e', fontWeight: 'bold', animation: 'modalFadeIn 0.3s ease-out' }}>{successMsg}</span>}
        <button onClick={handleSave} className="btn-primary" disabled={loading} style={{ width: 'auto', minWidth: '150px' }}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Guardar Cambios</>}
        </button>
      </div>
    </div>
  );
}
