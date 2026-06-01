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
          <p className="update-date">Última actualización: 26 de mayo de 2026</p>
        </div>

        <section className="legal-section">
          <h2>1. Identificación del servicio</h2>
          <p>Bienvenido a Bandly, una plataforma digital orientada a la gestión de equipos de producción, eventos, repertorios, recursos, multitracks y secuencias desde un solo lugar.</p>
          <p>Estos Términos y Condiciones de Uso regulan el acceso, navegación, registro y uso de Bandly y del sitio web y app (en adelante, la "Plataforma").</p>
          <p>La Plataforma es operada desde Bogotá, Colombia, por <strong>Johan Sebastian Jimenez Calderon</strong>, desarrollador independiente y titular del proyecto Bandly (en adelante, "Bandly", "nosotros" o el "Operador").</p>
          <div className="contact-box">
             <Mail size={16} />
             <span>Correo de contacto: dependent.mix@gmail.com</span>
          </div>
        </section>

        <section className="legal-section">
          <h2>2. Aceptación de los términos</h2>
          <p>Al registrarte, acceder, descargar o usar la Plataforma de cualquier manera, declaras expresamente que has leído, comprendido y aceptado en su totalidad estos Términos. Declaras ser mayor de 18 años y tener plena capacidad legal para celebrar este acuerdo. Si no estás de acuerdo con alguna parte de estos términos, debes abstenerte de usar el servicio.</p>
        </section>

        <section className="legal-section">
          <h2>3. Objeto de la Plataforma</h2>
          <p>Bandly es una herramienta de software como servicio (SaaS) diseñada para la organización y administración integral de ministerios y equipos de producción. El servicio incluye, de manera enunciativa pero no limitativa, la gestión de eventos, calendarios, repertorios, notas, así como el almacenamiento, sincronización y reproducción estrictamente privada de multitracks y secuencias de audio para ensayos y presentaciones en vivo.</p>
        </section>

        <section className="legal-section">
          <h2>4. Registro y Seguridad de la Cuenta</h2>
          <p>Para acceder a funcionalidades avanzadas y de gestión, debes crear una cuenta de usuario proporcionando información veraz y actualizada. Eres enteramente responsable de mantener la confidencialidad de tus credenciales de acceso y de todas las actividades que ocurran bajo tu cuenta. Bandly se reserva el derecho de suspender o cancelar permanentemente cuentas que proporcionen información falsa o violen la integridad del sistema.</p>
        </section>

        <section className="legal-section">
          <h2>5. Planes, Pagos y Suscripciones</h2>
          <p>Bandly puede ofrecer tanto modalidades gratuitas limitadas como planes de pago (suscripciones) que desbloquean mayor almacenamiento y características. Las características, cuotas de almacenamiento y precios están sujetos a cambios. En caso de aplicar modificaciones en los precios de planes activos, se notificará a los usuarios con una antelación razonable mínima de 30 días.</p>
        </section>

        <section className="legal-section">
          <h2>6. Conducta y Uso Prohibido</h2>
          <p>Al utilizar Bandly, te comprometes a NO:</p>
          <ul style={{ paddingLeft: '1.2rem', color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li>Usar la Plataforma con fines ilícitos, fraudulentos o malintencionados.</li>
            <li>Interferir con la seguridad, el código o intentar acceder a servidores, bases de datos o cuentas de otros usuarios de manera no autorizada.</li>
            <li>Cargar software malicioso, virus o código dañino.</li>
            <li>Vender, revender, licenciar o explotar comercialmente el acceso a la plataforma sin nuestro consentimiento explícito.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>7. Responsabilidad sobre los Contenidos del Usuario</h2>
          <p>Todo el contenido cargado a los servidores de Bandly (incluyendo, entre otros, archivos de audio multitrack, pistas, letras, partituras, listas de canciones e imágenes de perfil) seguirá siendo de <strong>exclusiva y total responsabilidad del usuario</strong> que lo sube.</p>
          <p>El usuario declara, garantiza y promete bajo juramento que es el propietario legítimo de dicho contenido o que cuenta con las licencias, permisos de uso justo y autorizaciones expresas para cargarlo, reproducirlo y utilizarlo en la Plataforma.</p>
          <p>Bandly actúa únicamente como un intermediario técnico (proveedor de almacenamiento y software de reproducción). No monitoreamos proactivamente los audios privados de cada organización, y rechazamos rotundamente cualquier responsabilidad por infracciones de derechos de autor cometidas por los usuarios finales.</p>
        </section>

        <section className="legal-section">
          <h2>8. Propiedad Intelectual de Bandly</h2>
          <p>El código fuente, diseño de interfaz (UI/UX), gráficas, bases de datos subyacentes, logotipos, algoritmos de reproducción web y marcas comerciales asociadas a "Bandly" son propiedad intelectual exclusiva de Johan Sebastian Jimenez Calderon. Está estrictamente prohibida la copia, ingeniería inversa, clonación o modificación de la plataforma para crear obras derivadas.</p>
        </section>

        <section className="legal-section">
          <h2>9. DMCA y Notificación de Infracciones</h2>
          <p>Respetamos profundamente los derechos de propiedad intelectual de creadores, productoras y artistas. Si eres titular de derechos de autor y crees de buena fe que un usuario de Bandly ha alojado material tuyo sin autorización, envíanos una notificación formal de retiro (Takedown Notice) a <strong>dependent.mix@gmail.com</strong> incluyendo evidencia de titularidad. Eliminaremos el acceso al material infractor de inmediato.</p>
        </section>

        <section className="legal-section">
          <h2>10. Exclusión de Garantías (Limitación de Responsabilidad)</h2>
          <p>La plataforma se proporciona "TAL CUAL" ("as is") y "SEGÚN DISPONIBILIDAD". Bandly no ofrece garantías expresas o implícitas sobre la disponibilidad ininterrumpida del servicio.</p>
          <p>No seremos legal ni económicamente responsables por pérdida temporal o permanente de datos, interrupciones de eventos en vivo, fallas en la red durante presentaciones, lucro cesante o cualquier daño indirecto que surja de la dependencia o uso del reproductor o la plataforma en general.</p>
        </section>

        <section className="legal-section">
          <h2>11. Modificaciones a este Documento</h2>
          <p>Nos reservamos el derecho unilateral de modificar, agregar o eliminar cláusulas de estos Términos en cualquier momento para reflejar actualizaciones legales o nuevas funcionalidades. Las versiones actualizadas entrarán en vigencia inmediatamente tras su publicación. El uso continuado del servicio constituye tu aceptación de los nuevos términos.</p>
        </section>

        <section className="legal-section">
          <h2>12. Ley Aplicable y Jurisdicción</h2>
          <p>La interpretación y cumplimiento de estos Términos se regirán exclusivamente por las leyes vigentes de la República de Colombia. Cualquier controversia, disputa o reclamación que no pueda resolverse por mediación directa, será sometida a la jurisdicción de los jueces y tribunales ordinarios competentes de la ciudad de Bogotá, Colombia.</p>
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
