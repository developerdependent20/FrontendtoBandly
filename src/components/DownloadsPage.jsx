import React from 'react';
import { Download, MonitorPlay, Sliders, Lock, Monitor, Apple } from 'lucide-react';

export default function DownloadsPage({ profile }) {
  const plan = (profile?.organizations?.plan || 'free').toLowerCase();
  
  // Disponible solo para Pro y Elite
  const hasAccess = plan === 'pro' || plan === 'elite';

  const handleDownload = (appName, os) => {
    alert(`El instalador de ${appName} para ${os} estará disponible muy pronto. ¡Estamos afinando los últimos detalles!`);
  };

  if (!hasAccess) {
    return (
      <div className="view-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '24px', borderRadius: '50%', marginBottom: '24px' }}>
          <Lock size={48} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem' }}>Herramientas Profesionales</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '32px', lineHeight: 1.6 }}>
          Bandly DAW y Bandly Presenter son aplicaciones de escritorio nativas de alto rendimiento, exclusivas para los planes <strong>Pro</strong> y <strong>Elite</strong>.
        </p>
        <button 
          className="btn-primary" 
          onClick={() => {
            alert('Abre tu perfil o el panel de facturación para realizar el Upgrade.');
          }}
          style={{ padding: '16px 32px', fontSize: '1.1rem', background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none' }}
        >
          Hacer Upgrade a Pro
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Bandly DAW Card */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: '24px', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.1))', padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Sliders size={80} color="var(--daw-cyan)" style={{ filter: 'drop-shadow(0 0 20px rgba(56, 189, 248, 0.5))' }} />
          </div>
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '12px' }}>Bandly DAW</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '32px', flex: 1 }}>
              La estación de trabajo de audio digital definitiva para tus directos. Reproduce multitracks con latencia cero, controla los volúmenes independientemente y sincroniza a todo tu equipo.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => handleDownload('Bandly DAW', 'Windows')}
                className="btn-secondary hover-scale" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'rgba(255,255,255,0.05)' }}
              >
                <Monitor size={18} /> Windows (.exe)
              </button>
              <button 
                onClick={() => handleDownload('Bandly DAW', 'macOS')}
                className="btn-secondary hover-scale" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'rgba(255,255,255,0.05)' }}
              >
                <Apple size={18} /> macOS (.dmg)
              </button>
            </div>
          </div>
        </div>

        {/* Bandly Presenter Card */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: '24px', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(249, 115, 22, 0.1))', padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <MonitorPlay size={80} color="#ef4444" style={{ filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.5))' }} />
          </div>
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '12px' }}>Bandly Presenter</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '32px', flex: 1 }}>
              Toma el control visual de tus eventos. Proyecta letras, imágenes y videos en pantallas externas de forma instantánea y sincronizada desde el panel de control.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => handleDownload('Bandly Presenter', 'Windows')}
                className="btn-secondary hover-scale" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'rgba(255,255,255,0.05)' }}
              >
                <Monitor size={18} /> Windows (.exe)
              </button>
              <button 
                onClick={() => handleDownload('Bandly Presenter', 'macOS')}
                className="btn-secondary hover-scale" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'rgba(255,255,255,0.05)' }}
              >
                <Apple size={18} /> macOS (.dmg)
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
