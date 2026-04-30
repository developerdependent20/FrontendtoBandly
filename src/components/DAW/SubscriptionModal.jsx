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
      id: 'pro',
      name: 'Pro',
      monthly: 19,
      yearly: 159,
      features: ['Hasta 10 bandas', '45 GB almacenamiento', 'Sala de previsualización', 'Player de secuencias']
    },
    {
      id: 'elite',
      name: 'Elite',
      monthly: 39,
      yearly: 329,
      features: ['Bandas ilimitadas', '100 GB almacenamiento', 'Roles y permisos', 'Soporte prioritario']
    }
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '800px', background: '#0f172a', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-1px' }}>MEJORA TU PLAN</h2>
            <p style={{ margin: '4px 0 0', opacity: 0.5, fontSize: '0.8rem' }}>Desbloquea todo el poder de Bandly para tu show.</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.5 }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {plans.map(plan => (
              <div key={plan.id} style={{ 
                background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                padding: '24px', display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                   <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>{plan.name}</h3>
                   <Crown size={20} color="var(--daw-cyan)" />
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: '950', marginBottom: '4px' }}>
                  ${billingPeriod === 'monthly' ? plan.monthly : plan.yearly}
                  <span style={{ fontSize: '1rem', opacity: 0.5, fontWeight: '400' }}>/{billingPeriod === 'monthly' ? 'mes' : 'año'}</span>
                </div>
                <p style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '24px' }}>
                  {billingPeriod === 'monthly' ? 'Facturado mensualmente' : `Equivale a $${(plan.yearly/12).toFixed(1)} / mes`}
                </p>
                <div style={{ flex: 1, marginBottom: '24px' }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', fontSize: '0.8rem', opacity: 0.8 }}>
                      <Check size={14} color="var(--daw-green)" />
                      {f}
                    </div>
                  ))}
                </div>
                <button 
                  disabled={loading}
                  onClick={() => handleSubscribe(plan.id)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', border: 'none', 
                    background: 'var(--daw-cyan)', color: '#000', fontWeight: '950', fontSize: '0.8rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    opacity: loading === plan.id ? 0.7 : 1
                  }}
                >
                  {loading === plan.id ? <Loader2 className="animate-spin" size={18} /> : 'SELECCIONAR PLAN'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.65rem', opacity: 0.4 }}>
            Pagos procesados de forma segura por Mercado Pago. Puedes cancelar en cualquier momento.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
