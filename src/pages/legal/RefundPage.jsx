import React from 'react';
import { ArrowLeft, RotateCcw, Mail } from 'lucide-react';

export default function RefundPage({ onBack }) {
  return (
    <div className="legal-page-container">
      <nav className="legal-nav">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={18} />
          <span>Volver</span>
        </button>
        <div className="brand">Bandly / Reembolsos</div>
      </nav>

      <main className="legal-content">
        <div className="legal-doc glass-panel">
        <div className="legal-header">
          <div className="icon-badge"><RotateCcw size={32} className="icon" /></div>
          <h1>Política de Reembolsos</h1>
          <p className="update-date">Última actualización: 11 de julio de 2026</p>
        </div>

        <section className="legal-section">
          <h2>1. Alcance</h2>
          <p>Esta política aplica a todas las suscripciones de pago de Bandly (planes Starter, Pro y superiores), procesadas a través de nuestro proveedor de pagos. El pago de suscripciones es gestionado en su totalidad por dicho proveedor, quien actúa como comerciante registrado (Merchant of Record) de la transacción.</p>
        </section>

        <section className="legal-section">
          <h2>2. Garantía de 14 días</h2>
          <p>Si no estás satisfecho con tu suscripción, puedes solicitar el reembolso de tu <strong>primer pago</strong> dentro de los <strong>14 días calendario</strong> siguientes a la fecha de la transacción, indicando el motivo de tu solicitud (por ejemplo: el producto no cumplió con lo ofrecido, dificultades técnicas no resueltas por soporte, o compra realizada por error).</p>
          <p>Evaluamos cada solicitud dentro de este plazo de buena fe. Nos reservamos el derecho de rechazar solicitudes que evidencien uso extensivo del servicio previo a la cancelación (por ejemplo, uso activo de la plataforma en múltiples eventos o sesiones antes de solicitar el reembolso), o abuso reiterado de esta garantía por parte de una misma cuenta u organización.</p>
          <p>Pasado este plazo de 14 días, los pagos ya realizados no son reembolsables, salvo lo indicado en la sección 4 de esta política.</p>
        </section>

        <section className="legal-section">
          <h2>3. Renovaciones automáticas</h2>
          <p>Las suscripciones se renuevan automáticamente al finalizar cada periodo de facturación (mensual o anual, según el plan elegido), salvo que se cancelen antes de la fecha de renovación. La garantía de 14 días descrita en la sección 2 aplica únicamente al primer cobro de una nueva suscripción, no a las renovaciones posteriores.</p>
          <p>Puedes cancelar tu suscripción en cualquier momento desde tu panel de cuenta. La cancelación evita cobros futuros, pero no genera un reembolso del periodo ya facturado y en curso: mantendrás acceso hasta el final de ese ciclo de facturación.</p>
        </section>

        <section className="legal-section">
          <h2>4. Excepciones: errores técnicos o de cobro</h2>
          <p>Fuera del plazo de 14 días, evaluaremos solicitudes de reembolso caso por caso cuando exista:</p>
          <ul style={{ paddingLeft: '1.2rem', color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li>Un cobro duplicado o un error técnico de facturación comprobable.</li>
            <li>Un cobro realizado sin autorización del titular de la cuenta.</li>
            <li>Una falla del servicio, atribuible a Bandly, que haya impedido de forma continua el uso de las funciones principales del plan contratado durante el periodo facturado.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Cómo solicitar un reembolso</h2>
          <p>Escríbenos a <strong>dependent.mix@gmail.com</strong> indicando el correo asociado a tu cuenta, la fecha del cobro y el motivo de tu solicitud. Responderemos en un plazo máximo de 5 días hábiles. Los reembolsos aprobados se procesan a través del mismo proveedor de pagos y método utilizado en la compra original, y pueden tardar algunos días hábiles adicionales en reflejarse según tu banco o entidad emisora.</p>
          <div className="contact-box">
             <Mail size={16} />
             <span>Solicitudes de reembolso: dependent.mix@gmail.com</span>
          </div>
        </section>

        <section className="legal-section">
          <h2>6. Modificaciones a esta Política</h2>
          <p>Nos reservamos el derecho de actualizar esta Política de Reembolsos para reflejar cambios operativos o legales. Las solicitudes se evalúan según la versión de la política vigente en la fecha de la compra original.</p>
        </section>

        </div>
        <div style={{ height: '60px' }}></div>
      </main>

      <style>{`
        .legal-page-container {
          --legal-accent: #f59e0b;
          background:
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.08), transparent 45%),
            linear-gradient(rgba(247, 244, 239, 0.04), rgba(247, 244, 239, 0.04)),
            var(--bg-dark, #101012);
          color: var(--text-main, #f7f4ef);
          min-height: 100vh;
          font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);
        }
        .legal-nav {
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(23, 23, 26, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.08));
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .legal-nav .brand { font-weight: 500; letter-spacing: 0.3px; font-size: 0.85rem; color: var(--text-muted, #a8a8a6); }
        .back-btn {
          background: transparent;
          border: none;
          color: var(--text-muted, #a8a8a6);
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s;
        }
        .back-btn:hover { color: #fff; }
        .legal-content {
          max-width: 820px;
          margin: 0 auto;
          padding: 3rem 1.5rem 5rem;
        }
        .legal-doc { position: relative; }
        .legal-header {
          text-align: center;
          margin-bottom: 2.5rem;
          padding-bottom: 2.5rem;
          border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.08));
        }
        .legal-header .icon-badge {
          width: 72px; height: 72px; margin: 0 auto 1.5rem;
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, color-mix(in srgb, var(--legal-accent) 20%, transparent), color-mix(in srgb, var(--legal-accent) 5%, transparent));
          border: 1px solid color-mix(in srgb, var(--legal-accent) 30%, transparent);
        }
        .legal-header .icon { color: var(--legal-accent); }
        .legal-header h1 { font-size: clamp(1.7rem, 4vw, 2.3rem); font-weight: 500; letter-spacing: -1px; margin-bottom: 0.6rem; }
        .update-date { color: var(--text-muted, #a8a8a6); font-size: 0.8rem; }
        .legal-section { padding: 1.75rem 0; border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.06)); }
        .legal-section:last-of-type { border-bottom: none; padding-bottom: 0; }
        .legal-section h2 { font-size: 1.05rem; font-weight: 500; color: #fff; margin-bottom: 1rem; border-left: 3px solid var(--legal-accent); padding-left: 1rem; }
        .legal-section p { line-height: 1.7; color: var(--text-muted, #a8a8a6); margin-bottom: 1rem; font-size: 0.92rem; }
        .contact-box {
          background: color-mix(in srgb, var(--legal-accent) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--legal-accent) 25%, transparent);
          padding: 0.9rem 1.2rem; border-radius: 12px;
          display: flex; align-items: center; gap: 10px;
          font-size: 0.85rem; color: var(--legal-accent); font-weight: 500;
        }
      `}</style>
    </div>
  );
}
