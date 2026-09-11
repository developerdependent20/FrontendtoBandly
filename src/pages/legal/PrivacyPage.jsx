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
        <div className="legal-doc glass-panel">
        <div className="legal-header">
          <div className="icon-badge"><ShieldCheck size={32} className="icon" /></div>
          <h1>Política de Privacidad y Tratamiento de Datos</h1>
          <p className="update-date">Última actualización: 13 de julio de 2026</p>
        </div>

        <section className="legal-section">
          <h2>1. Introducción</h2>
          <p>En Bandly reconocemos la importancia absoluta de la privacidad y nos comprometemos firmemente al tratamiento ético, transparente y responsable de los datos personales de todos nuestros usuarios.</p>
          <p>Esta política describe en detalle cómo recolectamos, almacenamos, usamos, protegemos y, en su momento, eliminamos tu información personal al utilizar nuestra aplicación web, app móvil, app de escritorio (Bandly y Bandly Presenter) y sitio web (conjuntamente, el "Servicio").</p>
        </section>

        <section className="legal-section">
          <h2>2. Responsable del Tratamiento</h2>
          <p>Para efectos de la legislación aplicable en materia de protección de datos, el responsable legal del tratamiento de la información es:</p>
          <p>
            <strong>Johan Sebastian Jimenez Calderon</strong><br/>
            Desarrollador independiente y creador de Bandly<br/>
            Domicilio principal: Bogotá, Colombia
          </p>
          <div className="contact-box">
             <Mail size={16} />
             <span>Privacidad y reportes: dependent.mix@gmail.com</span>
          </div>
        </section>

        <section className="legal-section">
          <h2>3. ¿Qué datos recolectamos?</h2>
          <p>Para brindarte el servicio, recolectamos los siguientes tipos de información:</p>
          <ul style={{ paddingLeft: '1.2rem', color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li><strong>Información proporcionada por ti:</strong> Tu nombre completo, dirección de correo electrónico, contraseña (cifrada criptográficamente) y foto de perfil opcional cuando creas una cuenta.</li>
            <li><strong>Información de disponibilidad y planeación:</strong> Fechas que marcas como no disponible ("fechas bloqueadas"), rol(es) e instrumento(s) asignados dentro de tu organización, y tu estado de confirmación en cada evento (pendiente, confirmado, declinado).</li>
            <li><strong>Contenido que creas en la Plataforma:</strong> Letras, cifrados/charts musicales, anotaciones, marcadores de sección, listas de repertorio y archivos de audio (multitracks/secuencias) que subas o generes dentro de tu organización.</li>
            <li><strong>Información de pago:</strong> Cuando contratas un plan pagado, tu información de pago (número de tarjeta, dirección de facturación, etc.) es recolectada y procesada directamente por nuestro procesador de pagos, <strong>Paddle</strong>. Bandly nunca recibe, ve ni almacena los datos completos de tu método de pago — solo recibimos confirmaciones de estado de tu suscripción (activa, cancelada, etc.).</li>
            <li><strong>Información técnica y de uso automática:</strong> Direcciones IP temporales, tipo de navegador, sistema operativo, idioma preferido, métricas de rendimiento de la app e identificadores seguros de sesión provistos por nuestros proveedores de autenticación.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Uso y Finalidades de los Datos</h2>
          <p>Tus datos personales NUNCA son vendidos a terceros. Los utilizamos de manera exclusiva para las siguientes finalidades legítimas:</p>
          <ul style={{ paddingLeft: '1.2rem', color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li>Crear y gestionar tu cuenta de acceso a la plataforma.</li>
            <li>Vincularte de forma segura a las organizaciones o equipos de producción a los que te inviten.</li>
            <li>Garantizar la correcta sincronización de tu repertorio y eventos entre dispositivos.</li>
            <li>Brindarte soporte técnico personalizado cuando lo solicites.</li>
            <li>Prevenir el fraude, abusos del sistema, spam o actividad cibernética maliciosa.</li>
            <li>Enviarte notificaciones operativas (alertas de eventos, cambios de contraseña, etc.) y, si lo autorizas, actualizaciones sobre nuevas funciones de Bandly.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Infraestructura y Subencargados (Terceros)</h2>
          <p>Bandly está construido sobre infraestructuras de clase mundial que actúan como nuestros procesadores de datos. Compartimos la información mínima necesaria para que el servicio exista:</p>
          <ul style={{ paddingLeft: '1.2rem', color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li><strong>Supabase:</strong> Se encarga de la base de datos principal (incluyendo eventos, roster, repertorios, secuencias y archivos), autenticación segura de usuarios y cifrado de contraseñas.</li>
            <li><strong>Vercel / Cloudflare:</strong> Proveen el alojamiento web y redes de distribución de contenido (CDN) para entregar la aplicación de forma rápida.</li>
            <li><strong>OneSignal:</strong> Utilizado exclusivamente para entregarte notificaciones push si decides activarlas en tu dispositivo.</li>
            <li><strong>Paddle:</strong> Procesa los pagos de suscripciones, actuando como Merchant of Record. Paddle mantiene su propia política de privacidad respecto a los datos de pago que recolecta directamente, disponible en paddle.com/legal/privacy.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5.1 Visibilidad de tu información dentro de tu organización</h2>
          <p>Bandly es una herramienta colaborativa. Por su propia naturaleza, cierta información tuya es visible para otros miembros de tu misma organización, no solo para nosotros como operador del Servicio:</p>
          <ul style={{ paddingLeft: '1.2rem', color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li>Tu nombre, foto de perfil y rol(es)/instrumento(s) son visibles para los demás miembros de tu organización.</li>
            <li>Tus fechas bloqueadas y estado de confirmación en cada evento son visibles para los directores y administradores de tu organización, con el fin de planear eventos.</li>
            <li>El contenido que subas o generes (letras, cifrados, audio) queda disponible únicamente para los miembros autorizados de tu misma organización, nunca para otras organizaciones ajenas.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Archivos y Multitracks Privados</h2>
          <p>Cualquier archivo de audio, partitura, imagen o lista de canciones que subas a Bandly es considerado <strong>contenido privado</strong> de tu organización.</p>
          <p>Nosotros no indexamos públicamente tus archivos ni los compartimos con otras organizaciones, anunciantes o redes sociales. Solo los miembros autorizados por los administradores de tu equipo de producción podrán acceder y reproducir este material mediante nuestro reproductor seguro.</p>
        </section>

        <section className="legal-section">
          <h2>7. Retención de Datos</h2>
          <p>Mantenemos tus datos personales únicamente mientras tu cuenta permanezca activa. Si decides eliminar tu cuenta definitivamente, tus datos personales serán borrados de nuestras bases de datos en un plazo no mayor a 30 días, salvo aquella información técnica anonimizada (que ya no te identifica) o los datos que debamos retener temporalmente para cumplir con obligaciones legales.</p>
        </section>

        <section className="legal-section">
          <h2>8. Seguridad de la Información</h2>
          <p>Adoptamos estrictas medidas técnicas y operativas para proteger tu información contra el acceso no autorizado, alteración o pérdida. Todo el tráfico de Bandly está encriptado bajo el protocolo HTTPS/TLS. Tus contraseñas están salteadas (hashed) y nunca son visibles para el equipo de desarrollo.</p>
          <p>No obstante, reconoces que ningún método de transmisión por internet o almacenamiento electrónico es 100% infalible, por lo que te instamos a usar contraseñas fuertes y no compartirlas.</p>
        </section>

        <section className="legal-section">
          <h2>9. Uso de Cookies y Tecnologías Similares</h2>
          <p>Usamos "cookies" estrictamente necesarias (tokens JWT en el navegador) para mantener tu sesión activa de manera segura y evitar que tengas que iniciar sesión constantemente. No utilizamos cookies de rastreo publicitario intrusivas ni píxeles de marketing cruzado de terceros ajenos a la operación de Bandly.</p>
        </section>

        <section className="legal-section">
          <h2>10. Derechos del Titular (Derechos ARCO)</h2>
          <p>Como dueño de tu información, tienes derecho en todo momento a:</p>
          <ul style={{ paddingLeft: '1.2rem', color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li><strong>Acceder:</strong> Conocer qué datos tuyos tenemos.</li>
            <li><strong>Rectificar:</strong> Corregir información inexacta desde la configuración de tu perfil.</li>
            <li><strong>Suprimir:</strong> Solicitar la eliminación total de tu cuenta y tus datos.</li>
            <li><strong>Oponerte:</strong> Solicitar que no te enviemos correos que no sean estrictamente operacionales.</li>
          </ul>
          <p>Para ejercer cualquier derecho formal, escribe a <strong>dependent.mix@gmail.com</strong> y procesaremos tu solicitud sin costo y en los tiempos que marca la ley.</p>
        </section>

        <section className="legal-section">
          <h2>11. Menores de Edad</h2>
          <p>Bandly no está diseñado ni dirigido intencionalmente a niños menores de 13 años. Si tienes menos de 13 años, no debes crearte una cuenta sin la supervisión directa de tus padres o tutores legales. Si descubrimos que hemos recopilado datos de un menor de 13 años sin verificación parental, procederemos a eliminar dicha cuenta inmediatamente.</p>
        </section>

        <section className="legal-section">
          <h2>12. Modificaciones a esta Política</h2>
          <p>Si actualizamos nuestras prácticas de privacidad, modificaremos la fecha de "Última actualización" al inicio de este documento. En caso de cambios sustanciales que afecten fundamentalmente tus derechos, te notificaremos vía correo electrónico o mediante un aviso destacado dentro de la aplicación.</p>
        </section>
        
        </div>
        <div style={{ height: '60px' }}></div>
      </main>

      <style>{`
        .legal-page-container {
          --legal-accent: #10b981;
          background:
            radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent 45%),
            radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.05), transparent 50%),
            var(--bg-dark, #020617);
          color: var(--text-main, #f8fafc);
          min-height: 100vh;
          font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);
        }
        .legal-nav {
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.08));
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .legal-nav .brand { font-weight: 700; letter-spacing: 0.3px; font-size: 0.85rem; color: var(--text-muted, #94a3b8); }
        .back-btn {
          background: transparent;
          border: none;
          color: var(--text-muted, #94a3b8);
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
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
        .legal-header h1 { font-size: clamp(1.6rem, 4vw, 2.1rem); font-weight: 800; letter-spacing: -1px; margin-bottom: 0.6rem; }
        .update-date { color: var(--text-muted, #94a3b8); font-size: 0.8rem; }
        .legal-section { padding: 1.75rem 0; border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.06)); }
        .legal-section:last-of-type { border-bottom: none; padding-bottom: 0; }
        .legal-section h2 { font-size: 1.05rem; font-weight: 700; color: #fff; margin-bottom: 1rem; border-left: 3px solid var(--legal-accent); padding-left: 1rem; }
        .legal-section p { line-height: 1.7; color: var(--text-muted, #94a3b8); margin-bottom: 1rem; font-size: 0.92rem; }
        .contact-box {
          background: color-mix(in srgb, var(--legal-accent) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--legal-accent) 25%, transparent);
          padding: 0.9rem 1.2rem; border-radius: 12px;
          display: flex; align-items: center; gap: 10px;
          font-size: 0.85rem; color: var(--legal-accent); font-weight: 600;
        }
      `}</style>
    </div>
  );
}
