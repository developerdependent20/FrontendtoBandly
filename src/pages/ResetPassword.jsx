import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Lock, CheckCircle2 } from 'lucide-react';

export default function ResetPassword({ onFinish }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setErrorMsg('Las contraseñas no coinciden');
    }
    if (password.length < 6) {
      return setErrorMsg('La contraseña debe tener al menos 6 caracteres');
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="center-layout">
        <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ background: 'rgba(74, 222, 128, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle2 size={30} color="#4ade80" />
          </div>
          <h3 style={{ marginBottom: '1rem' }}>¡Contraseña Actualizada!</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Tu contraseña ha sido cambiada con éxito.
          </p>
          <button onClick={onFinish} className="btn-primary" style={{ width: '100%' }}>
            Entrar a Bandly
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="center-layout">
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Nueva Contraseña</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>
          Ingresa tu nueva clave de acceso.
        </p>
        
        <form onSubmit={handleUpdate} className="input-group">
          <div style={{ position: 'relative' }}>
            <input 
              type="password" 
              placeholder="Nueva contraseña" 
              className="input-field" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <div style={{ position: 'relative' }}>
            <input 
              type="password" 
              placeholder="Confirmar contraseña" 
              className="input-field" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              required 
            />
          </div>
          
          {errorMsg && <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{errorMsg}</p>}
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="spin" size={20}/> : 'Actualizar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
