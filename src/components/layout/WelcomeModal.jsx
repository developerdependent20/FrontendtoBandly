import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, CheckCircle2, Settings, Users, CalendarPlus, X, ArrowRight, CalendarCheck, Music2, Crown } from 'lucide-react';
import { getPlanById } from '../../utils/planFeatures';

export default function WelcomeModal({ profile, onClose, onOpenSettings, onOpenSubscription }) {
  const isDirector = profile?.role === 'director';
  const plan = getPlanById(profile?.organizations?.plan);

  const handleClose = () => {
    localStorage.setItem(`bandly_welcome_${profile?.id}`, 'true');
    onClose();
  };

  const handleOpenSettings = () => {
    handleClose();
    localStorage.setItem('open_org_settings', 'true');
    onOpenSettings();
  };

  const handleSeePlans = () => {
    handleClose();
    onOpenSubscription?.();
  };

  const directorSteps = [
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

  const memberSteps = [
    {
      id: 1,
      title: "Te uniste a tu equipo",
      desc: "¡Completado! Ya formas parte de la organización.",
      icon: <CheckCircle2 size={24} color="#10b981" />,
      status: "completed"
    },
    {
      id: 2,
      title: "Revisa el calendario",
      desc: "Ahí verás tus próximos ensayos, cultos o conciertos y a qué eventos fuiste asignado.",
      icon: <CalendarCheck size={24} color="#3b82f6" />,
      status: "active"
    },
    {
      id: 3,
      title: "Marca tus fechas bloqueadas",
      desc: "Avísale a tu director cuándo no puedes asistir, desde tu perfil.",
      icon: <CalendarPlus size={24} color="#f59e0b" />,
      status: "pending"
    },
    {
      id: 4,
      title: "Explora tus recursos",
      desc: "Letras, charts y pistas de las canciones que te asignen estarán disponibles aquí.",
      icon: <Music2 size={24} color="#a855f7" />,
      status: "pending"
    }
  ];

  const steps = isDirector ? directorSteps : memberSteps;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel" style={{
        width: '90%',
        maxWidth: '550px',
        maxHeight: '90vh',
        overflowY: 'auto',
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
            {isDirector ? '¡Tu Banda está lista para despegar!' : '¡Bienvenido a Bandly!'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', fontSize: '1.05rem', lineHeight: 1.5 }}>
            {isDirector
              ? 'Sigue esta pequeña guía de 4 pasos para configurar tu espacio y tener a tu equipo funcionando como profesionales.'
              : 'Esta es tu guía rápida para empezar a usar Bandly con tu equipo.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
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

        <div style={{
          padding: '1.25rem',
          background: 'rgba(168, 85, 247, 0.05)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '12px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <Crown size={18} color="#a855f7" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#fff' }}>
              Tu organización está en el plan {plan.name}
            </h3>
          </div>
          <ul style={{ margin: '0 0 1rem 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {plan.features.slice(0, 4).map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                <CheckCircle2 size={14} color="#a855f7" />
                {f}
              </li>
            ))}
          </ul>
          {isDirector && (
            <button
              onClick={handleSeePlans}
              style={{
                background: 'transparent',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                color: '#a855f7',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              Ver todos los planes <ArrowRight size={14} />
            </button>
          )}
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
          {isDirector ? 'Cerrar guía por ahora' : 'Entendido, ¡empecemos!'}
        </button>

      </div>
    </div>,
    document.body
  );
}
