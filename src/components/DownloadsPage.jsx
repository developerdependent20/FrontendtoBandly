import React from 'react';
import { Lock, Monitor, Apple } from 'lucide-react';
import { alertDialog } from '../utils/dialogService';
import { DOWNLOADS, APPS, planAllows } from '../utils/downloadLinks';

const DESCRIPTIONS = {
  daw: 'La estación de trabajo de audio digital definitiva para tus directos. Reproduce multitracks con latencia cero, controla los volúmenes independientemente y sincroniza a todo tu equipo.',
  presenter: 'Toma el control visual de tus eventos. Proyecta letras, imágenes y videos en pantallas externas de forma instantánea y sincronizada desde el panel de control.',
  lights: 'Control de luces DMX/Art-Net para tu escenario. Las escenas se disparan solas con los marcadores del DAW, con secuencias, strobo y cabezas móviles.',
};

const OSES = [
  { key: 'windows', label: 'Windows (.exe)', icon: <Monitor size={18} /> },
  { key: 'mac', label: 'macOS (.dmg)', icon: <Apple size={18} /> },
];

const btnStyle = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'rgba(255,255,255,0.05)', textDecoration: 'none', color: 'inherit' };

export default function DownloadsPage({ profile }) {
  const plan = (profile?.organizations?.plan || 'free').toLowerCase();
  const hasAnyAccess = Object.keys(APPS).some(app => planAllows(plan, app));

  const handleSoon = (appName, os) => {
    alertDialog(`El instalador de ${appName} para ${os} estará disponible muy pronto. ¡Estamos afinando los últimos detalles!`);
  };

  const handleUpgradePrompt = () => {
    alertDialog('Abre tu perfil o el panel de facturación para realizar el Upgrade.');
  };

  if (!hasAnyAccess) {
    return (
      <div className="view-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '24px', borderRadius: '50%', marginBottom: '24px' }}>
          <Lock size={48} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '500', marginBottom: '1rem' }}>Herramientas Profesionales</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '32px', lineHeight: 1.6 }}>
          Bandly DAW, Bandly Presenter y Bandly Lights son aplicaciones de escritorio nativas de alto rendimiento. El DAW está disponible desde el plan <strong>Starter</strong>, el Presenter desde <strong>Pro</strong> y Lights con <strong>Elite</strong>.
        </p>
        <button
          className="btn-primary"
          onClick={handleUpgradePrompt}
          style={{ padding: '16px 32px', fontSize: '1.1rem', background: 'linear-gradient(135deg, #fd429c, #ff6a4a)', border: 'none' }}
        >
          Hacer Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className="view-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <header className="library-intro" style={{ marginBottom: '3rem' }}>
        <h1 className="hero-main-title-large" style={{ fontSize: '3rem', textAlign: 'left', marginBottom: '1rem' }}>
          Centro de <span className="highlight-text">Descargas</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '800px' }}>
          Instala las aplicaciones nativas de Bandly para obtener el máximo rendimiento en vivo. Menor latencia, soporte multi-monitor y funcionamiento robusto sin depender del navegador web.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {Object.entries(APPS).map(([app, info]) => {
          const allowed = planAllows(plan, app);
          return (
            <div key={app} style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '24px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ background: 'rgba(247, 244, 239, 0.04)', padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img src={info.logo} alt={info.name} width={112} height={112} style={{ display: 'block' }} />
              </div>
              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '500', marginBottom: '12px' }}>{info.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '32px', flex: 1 }}>{DESCRIPTIONS[app]}</p>
                {allowed ? (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {OSES.map(({ key, label, icon }) => {
                      const url = DOWNLOADS[app][key];
                      return url ? (
                        <a key={key} href={url} download className="btn-secondary hover-scale" style={btnStyle}>
                          {icon} {label}
                        </a>
                      ) : (
                        <button key={key} onClick={() => handleSoon(info.name, key === 'mac' ? 'macOS' : 'Windows')} className="btn-secondary hover-scale" style={btnStyle}>
                          {icon} {label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    onClick={handleUpgradePrompt}
                    className="btn-secondary hover-scale"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                  >
                    <Lock size={16} /> Disponible desde el plan {info.minPlanLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
