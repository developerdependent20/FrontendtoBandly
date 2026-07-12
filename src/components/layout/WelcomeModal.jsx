import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, CheckCircle2, Settings, Users, CalendarPlus, X, ArrowRight } from 'lucide-react';

export default function WelcomeModal({ profile, onClose, onOpenSettings }) {
  const handleClose = () => {
    localStorage.setItem(`bandly_welcome_${profile?.id}`, 'true');
    onClose();
  };

  const handleOpenSettings = () => {
    handleClose();
    localStorage.setItem('open_org_settings', 'true');
    onOpenSettings();
  };

  const steps = [
    {
      id: 1,
      title: "Crea tu usuario y organización",
      desc: "¡Completado! Ya tienes el control de tu cuenta.",
      icon: <CheckCircle2 size={24} color="#10b981" />,
      status: "completed"
    },
    {
      id: 2,
      title: "Configura tu equipo",
      desc: "Define los instrumentos, roles y departamentos que usarán tus integrantes.",
      icon: <Settings size={24} color="#a855f7" />,
      status: "active",
      action: handleOpenSettings,
      btnText: "Configurar ahora"
    },
    {
      id: 3,
      title: "Invita a tu banda",
      desc: "Comparte tu Link Mágico o Código de Invitación para que todos se unan.",
      icon: <Users size={24} color="#3b82f6" />,
      status: "pending"
    },
    {
      id: 4,
      title: "Crea tu primer evento",
      desc: "Agenda tu primer ensayo o concierto y asigna a tu equipo.",
      icon: <CalendarPlus size={24} color="#f59e0b" />,
      status: "pending"
    }
  ];

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel" style={{ 
        width: '90%', 
        maxWidth: '550px', 
        padding: '2.5rem', 
        position: 'relative', 
        animation: 'modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        background: 'linear-gradient(180deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05) inset'
      }}>
        
        <button onClick={handleClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
          <X size={24} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(168, 85, 247, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <Sparkles size={32} color="#a855f7" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
            ¡Tu Banda está lista para despegar!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', fontSize: '1.05rem', lineHeight: 1.5 }}>
            Sigue esta pequeña guía de 4 pasos para configurar tu espacio y tener a tu equipo funcionando como profesionales.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
          {steps.map((step, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1.25rem',
              padding: '1.25rem',
              background: step.status === 'active' ? 'rgba(168, 85, 247, 0.05)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${step.status === 'active' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255,255,255,0.05)'}`,
              borderRadius: '12px',
              opacity: step.status === 'pending' ? 0.6 : 1,
              transition: 'all 0.3s ease'
            }}>
              <div style={{ 
                marginTop: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: step.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : step.status === 'active' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.05)',
              }}>
                {step.icon}
              </div>
              
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin: '0 0 0.25rem 0', 
                  fontSize: '1.05rem', 
                  fontWeight: '700', 
                  color: step.status === 'completed' ? '#10b981' : '#fff' 
                }}>
                  {step.id}. {step.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                  {step.desc}
                </p>
                
                {step.action && (
                  <button 
                    onClick={step.action}
                    style={{
                      marginTop: '1rem',
                      background: '#a855f7',
                      color: '#fff',
                      border: 'none',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#9333ea'}
                    onMouseOut={e => e.currentTarget.style.background = '#a855f7'}
                  >
                    {step.btnText} <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleClose} 
          style={{ 
            width: '100%', 
            padding: '1rem', 
            background: 'transparent', 
            border: '1px solid rgba(255,255,255,0.1)', 
            color: '#fff', 
            borderRadius: '8px', 
            fontSize: '1rem', 
            fontWeight: '600', 
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.2)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }}
        >
          Cerrar guía por ahora
        </button>

      </div>
    </div>,
    document.body
  );
}
