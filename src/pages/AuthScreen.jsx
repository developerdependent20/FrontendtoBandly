import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { alertDialog } from '../utils/dialogService';

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

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin // Vuelve a la app principal
        }
      });
      if (error) throw error;
    } catch (error) {
      setErrorMsg(error.message);
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
        alertDialog('¡Bienvenido a Bandly! Tu cuenta ha sido creada exitosamente.');
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

      <img src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Bandly%20nuevo.png" alt="Bandly Isotipo" style={{ width: '140px', height: 'auto', marginBottom: '-1rem', filter: 'drop-shadow(0 0 30px rgba(120, 145, 185, 0.5))' }} />
      <h1 className="hero-title" style={{ fontSize: '2.5rem' }}>Bandly</h1>
      <p className="hero-subtitle">Plan songs. Send sequences. Lead better.</p>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
        <h3 style={{ marginBottom: '2rem', textAlign: 'center' }}>
          {isSignUp ? 'Crear Cuenta' : 'Acceso a tu Equipo'}
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

        <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>o continuar con</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          type="button"
          className="btn-secondary" 
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'white', color: '#1a1a1a', border: 'none', padding: '0.8rem', borderRadius: '12px', fontWeight: '500', transition: 'all 0.2s', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          {/* Logo en línea: antes se cargaba desde svgrepo.com y salía roto sin internet o en la app de escritorio */}
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.87.92 7.52 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Google
        </button>
        
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
