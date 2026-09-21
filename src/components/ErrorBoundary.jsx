import React from 'react';
import { reportError } from '../utils/errorReporter';

// Red de seguridad para el servicio en vivo: si algo revienta a mitad de un
// evento, la ventana quedaba en blanco y no había forma de volver sin matar la
// app. Esto muestra una salida clara y deja el detalle técnico escondido, para
// que el que está operando no tenga que leer un stack trace en pleno culto.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Bandly] Error no capturado:', error, errorInfo);
    this.setState({ errorInfo });
    // Queda registrado: antes esto moría en la consola de alguien y nunca nos
    // enterábamos de que a un equipo se le cayó la app en pleno servicio.
    reportError(error, { app: 'web', context: 'pantalla caída' });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#09090b', color: '#f7f4ef',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '1.5rem', padding: '2rem', textAlign: 'center',
        fontFamily: "'Inter', system-ui, sans-serif", zIndex: 999999
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '20px', fontSize: '2rem',
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>!</div>

        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 500, margin: '0 0 0.6rem' }}>
            Algo se cayó, pero no perdiste nada
          </h1>
          <p style={{ color: '#a8a8a6', fontSize: '0.9rem', margin: 0, maxWidth: '460px', lineHeight: 1.6 }}>
            Tu información está guardada en la nube. Recarga la página y sigue
            donde ibas — no se perdió nada de tu trabajo.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg, #fd429c, #ff6a4a)', color: '#fff', border: 'none',
              padding: '12px 28px', borderRadius: '12px', fontWeight: 500, cursor: 'pointer',
              fontSize: '0.9rem', boxShadow: '0 8px 20px -6px rgba(0, 0, 0, 0.35)'
            }}
          >
            Recargar
          </button>
          <button
            onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
            style={{
              background: 'rgba(255,255,255,0.05)', color: '#a8a8a6',
              border: '1px solid rgba(255,255,255,0.1)', padding: '12px 20px',
              borderRadius: '12px', fontWeight: 500, cursor: 'pointer', fontSize: '0.85rem'
            }}
          >
            {this.state.showDetails ? 'Ocultar detalle' : 'Ver detalle técnico'}
          </button>
        </div>

        {this.state.showDetails && (
          <pre style={{
            maxWidth: '90vw', maxHeight: '30vh', overflow: 'auto', textAlign: 'left',
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
            padding: '14px', borderRadius: '12px', fontSize: '11px', color: '#a8a8a6',
            whiteSpace: 'pre-wrap'
          }}>
            {String(this.state.error)}
            {this.state.errorInfo?.componentStack}
          </pre>
        )}
      </div>
    );
  }
}

export default ErrorBoundary;
