import React from 'react';
import { ArrowLeft, FileText, Mail } from 'lucide-react';

export default function TermsPage({ onBack }) {
  return (
    <div className="legal-page-container">
      <nav className="legal-nav">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={18} />
          <span>Volver</span>
        </button>
        <div className="brand">Bandly / Legal</div>
      </nav>

      <main className="legal-content">
        <div className="legal-header">
          <FileText size={48} className="icon" />
          <h1>Términos y Condiciones de Uso</h1>
          <p className="update-date">Última actualización: 13 de abril de 2026</p>
        </div>

        <section className="legal-section">
          <h2>1. Identificación del servicio</h2>
          <p>Bienvenido a Bandly, una plataforma digital orientada a la gestión de equipos musicales, eventos, repertorios, recursos, multitracks y secuencias desde un solo lugar.</p>
          <p>Estos Términos y Condiciones de Uso regulan el acceso, navegación, registro y uso de Bandly y del sitio oficial getbandly.com (en adelante, la “Plataforma”).</p>
          <p>La Plataforma es operada desde Bogotá, Colombia, por <strong>Johan Sebastian Jimenez Calderon</strong>, desarrollador independiente y titular del proyecto Bandly (en adelante, “Bandly”, “nosotros” o el “Operador”).</p>
          <div className="contact-box">
             <Mail size={16} />
             <span>Correo de contacto: dependent.mix@gmail.com</span>
          </div>
        </section>

        <section className="legal-section">
          <h2>2. Aceptación de los términos</h2>
          <p>Al registrarte, acceder o usar la Plataforma, declaras que has leído y comprendido estos Términos, eres mayor de 18 años y tienes capacidad legal para celebrar este acuerdo.</p>
        </section>

        <section className="legal-section">
          <h2>3. Objeto de la Plataforma</h2>
          <p>Bandly es una herramienta tecnológica para la organización y gestión de equipos musicales. Incluye gestión de eventos, repertorios, charts, y almacenamiento/reproducción privada de multitracks y secuencias.</p>
        </section>

        <section className="legal-section">
          <h2>9. Conducta del usuario</h2>
          <p>Está prohibido usar la Plataforma con fines ilícitos, interferir con su seguridad, suplantar identidades o cargar contenido respecto del cual no se tengan los permisos, licencias o autorizaciones necesarias.</p>
        </section>

        <section className="legal-section">
          <h2>10. Contenidos del usuario</h2>
          <p>Todo el contenido cargado (canciones, multitracks, secuencias, etc.) seguirá siendo responsabilidad del usuario. El usuario garantiza que es titular del contenido o cuenta con autorización para usarlo en Bandly.</p>
        </section>

        <section className="legal-section">
          <h2>13. Contenidos de terceros y propiedad intelectual</h2>
          <p>Bandly respeta los derechos de terceros. No autorizamos ni promovemos la carga de contenido infractor. Si consideras que se infringen tus derechos, escribe a dependent.mix@gmail.com.</p>
        </section>

        <section className="legal-section">
          <h2>20. Ley aplicable y jurisdicción</h2>
          <p>Estos Términos se regirán por las leyes de la República de Colombia. Cualquier controversia será conocida por los jueces competentes de la ciudad de Bogotá.</p>
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
        .legal-header .icon { color: #3b82f6; margin-bottom: 1.5rem; }
        .legal-header h1 { font-size: 2.5rem; letter-spacing: -1px; margin-bottom: 0.5rem; }
        .update-date { color: #555; font-size: 0.8rem; }
        .legal-section { margin-bottom: 3rem; }
        .legal-section h2 { font-size: 1.1rem; color: #fff; margin-bottom: 1.2rem; border-left: 3px solid #3b82f6; padding-left: 1rem; }
        .legal-section p { line-height: 1.6; color: #aaa; margin-bottom: 1rem; font-size: 0.9rem; }
        .contact-box { background: #111; padding: 1rem; border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: #3b82f6; }
      `}</style>
    </div>
  );
}
