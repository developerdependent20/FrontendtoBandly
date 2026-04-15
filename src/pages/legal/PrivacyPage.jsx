import React from 'react';
import { ArrowLeft, ShieldCheck, Mail } from 'lucide-react';

export default function PrivacyPage({ onBack }) {
  return (
    <div className="legal-page-container">
      <nav className="legal-nav">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={18} />
          <span>Volver</span>
        </button>
        <div className="brand">Bandly / Privacidad</div>
      </nav>

      <main className="legal-content">
        <div className="legal-header">
          <ShieldCheck size={48} className="icon" />
          <h1>Política de Privacidad y Tratamiento de Datos</h1>
          <p className="update-date">Última actualización: 13 de abril de 2026</p>
        </div>

        <section className="legal-section">
          <h2>1. Introducción</h2>
          <p>En Bandly reconocemos la importancia de la privacidad y del tratamiento responsable de los datos personales de nuestros usuarios.</p>
          <p>Esta política describe cómo recolectamos, usamos y protegemos tus datos en relación con getbandly.com y la App móvil/escritorio.</p>
        </section>

        <section className="legal-section">
          <h2>2. Responsable del tratamiento</h2>
          <p>El responsable del tratamiento de los datos personales es:</p>
          <p>
            <strong>Johan Sebastian Jimenez Calderon</strong><br/>
            Desarrollador independiente y titular del proyecto Bandly<br/>
            Domicilio: Bogotá, Colombia
          </p>
          <div className="contact-box">
             <Mail size={16} />
             <span>Correo de contacto: dependent.mix@gmail.com</span>
          </div>
        </section>

        <section className="legal-section">
          <h2>4. Datos que tratamos</h2>
          <p>Actualmente recolectamos principalmente: nombre y correo electrónico.</p>
          <p>También registramos datos técnicos de acceso e identificadores de sesión necesarios para la operación segura del servicio sobre infraestructura como Vercel y Supabase.</p>
        </section>

        <section className="legal-section">
          <h2>5. Finalidades</h2>
          <p>Tratamos tus datos para administrar tu cuenta, permitir la integración a equipos, habilitar el reproductor de multitracks/secuencias y brindar soporte técnico.</p>
        </section>

        <section className="legal-section">
          <h2>11. Derechos del titular</h2>
          <p>Como titular puedes conocer, actualizar, rectificar o suprimir tus datos en cualquier momento escribiendo a <strong>dependent.mix@gmail.com</strong>.</p>
        </section>

        <section className="legal-section">
          <h2>18. Seguridad</h2>
          <p>Adoptamos medidas técnicas y administrativas razonables para proteger tus datos contra acceso no autorizado, pérdida o alteración. Ningún sistema es infalible, por lo que recomendamos proteger tus credenciales.</p>
        </section>
        
        <div style={{ height: '100px' }}></div>
      </main>

      <style jsx>{`
        .legal-page-container {
          background: #080809;
          color: #eee;
          min-height: 100vh;
          font-family: 'JetBrains Mono', monospace;
        }
        .legal-nav {
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #000;
          border-bottom: 1px solid #222;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .back-btn {
          background: transparent;
          border: none;
          color: #888;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .back-btn:hover { color: #fff; }
        .legal-content {
          max-width: 800px;
          margin: 0 auto;
          padding: 4rem 2rem;
        }
        .legal-header {
          text-align: center;
          margin-bottom: 4rem;
        }
        .legal-header .icon { color: #10b981; margin-bottom: 1.5rem; }
        .legal-header h1 { font-size: 2.22rem; letter-spacing: -1px; margin-bottom: 0.5rem; }
        .update-date { color: #555; font-size: 0.8rem; }
        .legal-section { margin-bottom: 3rem; }
        .legal-section h2 { font-size: 1.1rem; color: #fff; margin-bottom: 1.2rem; border-left: 3px solid #10b981; padding-left: 1rem; }
        .legal-section p { line-height: 1.6; color: #aaa; margin-bottom: 1rem; font-size: 0.9rem; }
        .contact-box { background: #111; padding: 1rem; border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: #10b981; }
      `}</style>
    </div>
  );
}
