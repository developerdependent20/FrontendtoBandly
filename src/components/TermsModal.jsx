import React from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';

export default function TermsModal({ isOpen, onClose, onDecline }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
       <div className="glass-panel modal-content" style={{ maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto', padding: '3rem', background: '#0f172a', border: '1px solid var(--primary)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', marginBottom: '1rem', color: 'var(--primary)' }}>
                <ShieldCheck size={40} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'white' }}>Términos de Servicio</h2>
            <p style={{ color: 'var(--text-muted)' }}>Contrato de Uso Responsable de Bandly Platform</p>
          </div>

          <div className="legal-text" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', textAlign: 'left', paddingRight: '0.5rem' }}>
            <h4 style={{ color: 'white', marginTop: '1rem', fontSize: '0.85rem', fontWeight: '700' }}>1. Uso Responsable de la Plataforma</h4>
            <p>Bandly es una herramienta diseñada para facilitar la organización de equipos musicales. Al utilizar nuestros servicios, usted acepta ser el responsable único de asegurar que el contenido que sube (como pistas o cifrados) cuenta con los permisos o licencias necesarias para su uso privado dentro de su organización.</p>

            <h4 style={{ color: 'white', marginTop: '1rem', fontSize: '0.85rem', fontWeight: '700' }}>2. Responsabilidad de Contenido</h4>
            <p>Usted garantiza que posee los derechos o licencias (como CCLI Rehearsal License u otras equivalentes) sobre el material compartido. Bandly no supervisa el contenido privado de las organizaciones y, por lo tanto, la responsabilidad legal sobre la propiedad intelectual de los archivos subidos recae exclusivamente en el usuario.</p>

            <h4 style={{ color: 'white', marginTop: '1rem', fontSize: '0.85rem', fontWeight: '700' }}>3. Indemnización y Limitaciones</h4>
            <p>Usted acepta mantener a Bandly libre de cualquier reclamación o gasto legal derivado de un uso indebido de la plataforma o de infracciones de derechos de autor cometidas por los miembros de su organización. Nuestra responsabilidad total frente a cualquier inconveniente estará limitada al monto pagado por el servicio en los últimos meses.</p>

            <h4 style={{ color: 'white', marginTop: '1rem', fontSize: '0.85rem', fontWeight: '700' }}>4. Privacidad y Seguridad</h4>
            <p>Los archivos y datos de su organización son privados y solo accesibles para los miembros que usted invite. Nos reservamos el derecho de dar de baja cuentas que violen estas políticas de convivencia y legalidad.</p>
            
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Al hacer clic en el botón de abajo, usted confirma que ha leído y acepta estas condiciones para el uso de Bandly.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2.5rem' }}>
            <button onClick={onClose} className="btn-primary" style={{ width: '100%', padding: '1.2rem' }}>
              He leído y comprendido los términos
            </button>
            <button onClick={onDecline} style={{ background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.6)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
              No acepto los términos (Cerrar sesión)
            </button>
          </div>
       </div>
    </div>
  );
}
