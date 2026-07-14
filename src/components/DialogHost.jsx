import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';
import { _setDialogListener, _resolveDialog } from '../utils/dialogService';

// Host único para todos los popups de confirmación/aviso/entrada de texto de
// Bandly — reemplaza window.confirm/alert/prompt en toda la app con un
// popup consistente con el resto de la UI (glass-panel oscuro).
export default function DialogHost() {
  const [request, setRequest] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    _setDialogListener((req) => {
      setRequest(req);
      setInputValue(req?.defaultValue || '');
    });
    return () => _setDialogListener(null);
  }, []);

  useEffect(() => {
    if (request?.mode === 'prompt') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [request]);

  if (!request) return null;

  const isDanger = request.danger;
  const isPrompt = request.mode === 'prompt';
  const isAlertOnly = request.mode === 'alert';

  const handleConfirm = () => {
    _resolveDialog(isPrompt ? inputValue : true);
  };
  const handleCancel = () => {
    _resolveDialog(isPrompt ? null : false);
  };

  const Icon = isDanger ? Trash2 : (isAlertOnly ? Info : AlertTriangle);
  const accentColor = isDanger ? '#ef4444' : 'var(--primary)';

  return createPortal((
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100000000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={handleCancel}
    >
      <div
        className="glass-panel"
        style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '420px', width: '100%', border: `1px solid ${isDanger ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`, animation: 'modalFadeIn 0.2s ease-out', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={handleCancel} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
          <X size={18} />
        </button>

        <div style={{ width: '60px', height: '60px', background: isDanger ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <Icon size={30} color={accentColor} />
        </div>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: '#fff', fontWeight: '800' }}>{request.title}</h3>
        {request.message && (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: isPrompt ? '1.2rem' : '2rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {request.message}
          </p>
        )}

        {isPrompt && (
          <input
            ref={inputRef}
            className="input-field"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') handleCancel(); }}
            style={{ width: '100%', marginBottom: '2rem', textAlign: 'center' }}
          />
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          {!isAlertOnly && (
            <button onClick={handleCancel} className="btn-secondary" style={{ flex: 1, padding: '1rem' }}>
              {request.cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="btn-primary"
            style={{ flex: 1, padding: '1rem', ...(isDanger ? { background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444' } : {}) }}
          >
            {request.confirmText}
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}
