import React, { useState } from 'react';
import { Crown, Check, X, Loader2 } from 'lucide-react';
import { paymentService } from '../../services/paymentService';

const SubscriptionModal = ({ profile, onClose }) => {
  const [loading, setLoading] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  const handleSubscribe = async (planId) => {
    setLoading(planId);
    try {
      const checkoutUrl = await paymentService.createCheckout(planId, billingPeriod, profile.id);
      paymentService.openCheckout(checkoutUrl);
    } catch (err) {
      alert(`Error al iniciar el pago: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Gratis',
      monthly: 0,
      yearly: 0,
      features: ['1 banda u organización', 'Hasta 10 usuarios', '300 MB almacenamiento', 'Calendario de eventos', 'Repertorios básicos', 'Letras', 'Enlaces de YouTube']
    },
    {
      id: 'starter',
      name: 'Starter',
      monthly: 9,
      yearly: 89,
      features: ['Hasta 3 bandas', 'Hasta 25 usuarios', '10 GB almacenamiento', 'Charts en PDF', 'Gestión de repertorios', 'Recursos por canción', 'Multitracks', 'Reproductor en la app'],
      recommended: true
    },
    {
      id: 'pro',
      name: 'Pro',
      monthly: 19,
      yearly: 159,
      features: ['Hasta 10 bandas', 'Hasta 75 usuarios', '45 GB almacenamiento', 'Todo lo de Starter', 'Sala de previsualización', 'Player de secuencias']
    },
    {
      id: 'elite',
      name: 'Elite',
      monthly: 39,
      yearly: 329,
      features: ['Bandas ilimitadas', 'Usuarios ilimitados', '100 GB almacenamiento', 'Todo lo de Pro', 'Roles y permisos', 'Prioridad en soporte', 'Acceso anticipado']
    }
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '95%', maxWidth: '1100px', maxHeight: '90vh', background: '#0f172a', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-1px' }}>ELIGE TU PLAN</h2>
            <p style={{ margin: '4px 0 0', opacity: 0.5, fontSize: '0.8rem' }}>Impulsa tu banda al siguiente nivel con Bandly.</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.5 }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, overflowX: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', display: 'flex', gap: '4px' }}>
              <button 
                onClick={() => setBillingPeriod('monthly')}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700',
                  background: billingPeriod === 'monthly' ? 'var(--daw-cyan)' : 'transparent',
                  color: billingPeriod === 'monthly' ? '#000' : 'rgba(255,255,255,0.5)'
                }}
              >
                MENSUAL
              </button>
              <button 
                onClick={() => setBillingPeriod('yearly')}
                style={{
                  padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700',
                  background: billingPeriod === 'yearly' ? 'var(--daw-cyan)' : 'transparent',
                  color: billingPeriod === 'yearly' ? '#000' : 'rgba(255,255,255,0.5)'
                }}
              >
                ANUAL (Ahorra 20%)
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, minmax(250px, 1fr))', 
              gap: '20px',
              width: '100%'
            }}>
              {plans.map(plan => {
                const isCurrentPlan = (profile?.organizations?.plan || 'free').toLowerCase() === plan.id;
                
                return (
                  <div key={plan.id} style={{ 
                    background: isCurrentPlan ? 'rgba(168, 85, 247, 0.05)' : 'rgba(255,255,255,0.02)', 
                    borderRadius: '16px', 
                    border: plan.recommended ? '2px solid #a855f7' : (isCurrentPlan ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255,255,255,0.05)'),
                    padding: '24px', display: 'flex', flexDirection: 'column',
                    position: 'relative',
                    transform: plan.recommended ? 'scale(1.05)' : 'none',
                    zIndex: plan.recommended ? 1 : 0,
                    transition: 'all 0.3s ease'
                  }}>
                    {plan.recommended && (
                      <div style={{ 
                        position: 'absolute', top: '-12px', right: '12px', background: '#a855f7', color: '#fff', 
                        padding: '4px 12px', borderRadius: '20px', fontSize: '0.6rem', fontWeight: '900' 
                      }}>
                        RECOMENDADO
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                       <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', opacity: 0.8 }}>{plan.name.toUpperCase()}</h3>
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: '950', marginBottom: '2px' }}>
                      {plan.monthly === 0 ? 'Gratis' : `$${billingPeriod === 'monthly' ? plan.monthly : plan.yearly}`}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.5, marginBottom: '4px' }}>
                      {plan.monthly === 0 ? '0/mes' : `$${billingPeriod === 'monthly' ? plan.monthly : plan.yearly}/mes`}
                    </div>
                    <p style={{ fontSize: '0.65rem', opacity: 0.4, marginBottom: '20px' }}>
                      {plan.monthly === 0 ? 'Ideal para bandas nuevas' : 'Facturado mensualmente'}
                    </p>
                    <div style={{ flex: 1, marginBottom: '24px' }}>
                      {plan.features.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'start', marginBottom: '10px', fontSize: '0.75rem', opacity: 0.7 }}>
                          <Crown size={12} color={plan.recommended ? '#a855f7' : 'var(--daw-cyan)'} style={{ marginTop: '2px' }} />
                          {f}
                        </div>
                      ))}
                    </div>
                    <button 
                      disabled={loading || isCurrentPlan || (plan.monthly === 0 && isCurrentPlan)}
                      onClick={() => handleSubscribe(plan.id)}
                      style={{
                        width: '100%', padding: '12px', borderRadius: '12px', border: plan.id === 'free' ? '1px solid rgba(255,255,255,0.2)' : 'none', 
                        background: plan.recommended ? '#a855f7' : (plan.id === 'free' ? 'transparent' : 'rgba(255,255,255,0.05)'), 
                        color: '#fff', 
                        fontWeight: '700', fontSize: '0.8rem',
                        cursor: (loading || isCurrentPlan || (plan.monthly === 0 && isCurrentPlan)) ? 'default' : 'pointer', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {loading === plan.id ? <Loader2 className="animate-spin" size={18} /> : (isCurrentPlan ? 'TU PLAN ACTUAL' : (plan.id === 'free' ? 'Empezar gratis' : `Elegir ${plan.name}`))}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', textAlign: 'center', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: '0.65rem', opacity: 0.4 }}>
            Pagos procesados de forma segura por Mercado Pago. Puedes cancelar en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
