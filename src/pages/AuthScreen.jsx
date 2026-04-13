import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AuthScreen({ onBack, initialMode }) {
  const [isSignUp, setIsSignUp] = useState(() => {
    if (initialMode === 'signup') return true;
    if (initialMode === 'login') return false;
    return window.location.search.includes('join=');
  });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, password, options: { data: { full_name: fullName } } 
        });
        if (error) throw error;
        alert('¡Bienvenido a Bandly! Tu cuenta ha sido creada exitosamente.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-layout">
      {/* Botón Volver */}
      <div className="auth-back" onClick={onBack} style={{ position: 'absolute', top: '2rem', left: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
        <span>← Volver</span>
      </div>

      <img src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/LOGO%20BANDLY%20SIN%20FONDO.png" alt="Bandly Isotipo" style={{ width: '140px', height: 'auto', marginBottom: '-1rem', filter: 'drop-shadow(0 0 30px rgba(59, 130, 246, 0.5))' }} />
      <h1 className="hero-title" style={{ fontSize: '2.5rem' }}>Bandly</h1>
      <p className="hero-subtitle">Plan songs. Send sequences. Lead better.</p>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <h3 style={{ marginBottom: '2rem', textAlign: 'center' }}>
          {isSignUp ? 'Crear Cuenta' : 'Acceso a tu Banda'}
        </h3>
        <form onSubmit={handleSubmit} className="input-group">
          {isSignUp && (
            <input type="text" placeholder="Nombre completo" className="input-field" value={fullName} onChange={e => setFullName(e.target.value)} required />
          )}
          <input type="email" placeholder="Correo electrónico" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
          
          {errorMsg && <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{errorMsg}</p>}
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="spin" size={20}/> : (isSignUp ? 'Registrar' : 'Iniciar Sesión')}
          </button>
        </form>
        
        <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          {isSignUp ? '¿Ya tienes acceso?' : '¿No estás registrado?'} 
          <span style={{ color: 'var(--primary)', cursor: 'pointer', marginLeft: '0.5rem', fontWeight: '500' }} onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Inicia sesión' : 'Crea una cuenta'}
          </span>
        </p>
      </div>
    </div>
  );
}
