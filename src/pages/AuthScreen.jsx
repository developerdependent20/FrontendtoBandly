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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://getbandly.com/reset-password',
      });
      if (error) throw error;
      setResetSent(true);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password, 
          options: { 
            data: { 
              full_name: fullName,
              accepted_terms: true,
              accepted_privacy: true
            } 
          } 
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

  if (isForgotPassword) {
    return (
      <div className="center-layout">
        <div className="auth-back" onClick={() => setIsForgotPassword(false)} style={{ position: 'absolute', top: '2rem', left: '2rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <span>← Volver al login</span>
        </div>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '1rem' }}>Recuperar Contraseña</h3>
          {resetSent ? (
            <div style={{ color: '#4ade80', fontSize: '0.9rem', padding: '1rem', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '12px' }}>
              ¡Listo! Revisa tu correo electrónico para encontrar el link de recuperación.
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="input-group">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Te enviaremos un link a tu correo para que puedas crear una nueva contraseña.
              </p>
              <input type="email" placeholder="Correo electrónico" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
              {errorMsg && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errorMsg}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <Loader2 className="spin" size={20}/> : 'Enviar link de recuperación'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

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
          
          {!isSignUp && (
            <p onClick={() => setIsForgotPassword(true)} style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', marginTop: '-0.5rem', marginBottom: '1rem' }}>
              ¿Olvidaste tu contraseña?
            </p>
          )}

          {isSignUp && (
            <div className="legal-checkboxes" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
               <label className="checkbox-container" style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#888', cursor: 'pointer', textAlign: 'left' }}>
                  <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} />
                  <span>He leído y acepto los <a href="/terminos" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/terminos'); window.dispatchEvent(new Event('popstate')); }} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Términos y Condiciones</a> de Bandly.</span>
               </label>
               <label className="checkbox-container" style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#888', cursor: 'pointer', textAlign: 'left' }}>
                  <input type="checkbox" checked={acceptedPrivacy} onChange={e => setAcceptedPrivacy(e.target.checked)} />
                  <span>He leído la <a href="/privacidad" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/privacidad'); window.dispatchEvent(new Event('popstate')); }} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Política de Privacidad</a> y autorizo el tratamiento de mis datos personales.</span>
               </label>
               <p style={{ fontSize: '0.65rem', color: '#555', marginTop: '0.5rem' }}>Bandly está disponible para mayores de 18 años.</p>
            </div>
          )}

          {errorMsg && <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{errorMsg}</p>}
          
          <button type="submit" className="btn-primary" disabled={loading || (isSignUp && (!acceptedTerms || !acceptedPrivacy))}>
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
