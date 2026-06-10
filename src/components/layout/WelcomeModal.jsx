import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Sparkles, Layout, X, Settings } from 'lucide-react';

export default function WelcomeModal({ profile, onClose, onOpenSettings }) {
  const [step, setStep] = useState(1);

  const handleClose = () => {
    localStorage.setItem(`bandly_welcome_${profile?.id}`, 'true');
    onClose();
  };

  const handleOpenSettings = () => {
    handleClose();
    localStorage.setItem('open_org_settings', 'true');
    onOpenSettings();
  };

  const slides = [
    {
      title: "¡Bienvenido a tu nueva cuenta, Director!",
      desc: "Has dado el primer paso para organizar a tu equipo como los profesionales. Bandly te da las herramientas para que la música fluya sin distracciones.",
      icon: <Crown size={48} color="#eab308" />
    },
    {
      title: "Todo tu ministerio en un solo lugar",
      desc: "Crea eventos, sube secuencias multipista, comparte charts con los músicos y mantén a todo tu equipo sincronizado en tiempo real.",
      icon: <Sparkles size={48} color="#3b82f6" />
    },
    {
      title: "Un último paso importante...",
      desc: "Antes de empezar a planear eventos, es vital que configures los Departamentos y Roles de tu equipo. ¡Hazlo ahora para tener todo listo!",
      icon: <Settings size={48} color="#a855f7" />
    }
  ];

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
      <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', textAlign: 'center', padding: '3rem 2rem', position: 'relative', animation: 'modalFadeIn 0.3s ease-out' }}>
        
        <button onClick={handleClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }}>
            {slides[step - 1].icon}
          </div>
        </div>

        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', fontWeight: '800', lineHeight: 1.2 }}>
          {slides[step - 1].title}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2.5rem', minHeight: '80px' }}>
          {slides[step - 1].desc}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '2.5rem' }}>
          {slides.map((_, idx) => (
            <div key={idx} style={{ width: '8px', height: '8px', borderRadius: '50%', background: idx === step - 1 ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s' }} />
          ))}
        </div>

        {step < slides.length ? (
          <button onClick={() => setStep(s => s + 1)} className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
            Siguiente
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handleClose} className="btn-secondary" style={{ flex: 1, padding: '1rem' }}>
              Más tarde
            </button>
            <button onClick={handleOpenSettings} className="btn-primary" style={{ flex: 2, padding: '1rem', background: '#a855f7' }}>
              Configurar Equipo
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
