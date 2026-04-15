import React from 'react';
import { ShieldCheck, Mail } from 'lucide-react';

export default function TermsModal({ isOpen, onClose, onDecline }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 2000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <div className="glass-panel modal-content" style={{ maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', padding: '2.5rem', background: '#0a0a0b', border: '1px solid #333', borderRadius: '16px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', marginBottom: '1rem', color: '#3b82f6' }}>
                <ShieldCheck size={40} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: 'white', margin: 0 }}>Acuerdo Legal de Bandly</h2>
            <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '0.5rem' }}>Actualización Obligatoria: 13 de Abril, 2026</p>
          </div>

          <div className="legal-text-mini" style={{ fontSize: '0.8rem', color: '#999', lineHeight: '1.6', textAlign: 'left', fontFamily: 'JetBrains Mono, monospace' }}>
            <p style={{ marginBottom: '1rem' }}>Hola. Para continuar usando Bandly, es necesario que aceptes nuestro nuevo marco legal operado por <strong>Johan Sebastian Jimenez Calderon</strong> en Bogotá, Colombia.</p>
            
            <ul style={{ paddingLeft: '1.2rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
               <li><strong>Uso Responsable:</strong> Declaras ser mayor de 18 años y usar la plataforma para fines lícitos de gestión musical.</li>
               <li><strong>Propiedad Intelectual:</strong> Garantizas que posees los derechos o permisos sobre cualquier multitrack, secuencia o recurso que cargues a la plataforma.</li>
               <li><strong>Privacidad:</strong> Autorizas el tratamiento de tus datos básicos (nombre/email) para la operación técnica y soporte del servicio.</li>
               <li><strong>Responsabilidad:</strong> Bandly es una herramienta tecnológica; no nos hacemos responsables por conflictos internos de equipos o infracciones de derechos cometidas por usuarios.</li>
            </ul>

            <div style={{ background: '#111', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
               <p style={{ margin: 0, fontSize: '0.75rem' }}>Puedes consultar los documentos completos en <strong>getbandly.com/terminos</strong> y <strong>getbandly.com/privacidad</strong>.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2.5rem' }}>
            <button onClick={onClose} className="btn-primary" style={{ width: '100%', padding: '1.1rem', fontSize: '0.9rem', fontWeight: '800' }}>
              ACEPTO LOS NUEVOS TÉRMINOS
            </button>
            <button onClick={onDecline} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}>
              No acepto (Cerrar sesión)
            </button>
          </div>
       </div>
    </div>
  );
}
