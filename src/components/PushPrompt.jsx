import React, { useState } from 'react';
import { Bell, X, Copy, Check } from 'lucide-react';
import { detectPushEnv, requestPush, copyLink, IOS_INSTALL_STEPS, isPromptDismissed, dismissPrompt } from '../utils/push';

// Aviso suave para activar notificaciones. El permiso se pide al TOCAR el botón (único modo en
// que Safari/iPhone y Firefox lo aceptan), y en dispositivos sin soporte explica qué hacer.
export default function PushPrompt() {
  const [env, setEnv] = useState(() => detectPushEnv());
  const [hidden, setHidden] = useState(() => isPromptDismissed());
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const { kind } = env;
  if (hidden || !['default', 'ios-install', 'in-app'].includes(kind)) return null;

  const close = () => { dismissPrompt(); setHidden(true); };

  const enable = async () => {
    setBusy(true);
    setEnv(await requestPush());
    setBusy(false);
  };

  const copy = async () => {
    if (await copyLink()) { setCopied(true); setTimeout(() => setCopied(false), 2500); }
  };

  return (
    <div role="region" aria-label="Notificaciones" style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      width: 'min(440px, calc(100vw - 24px))', zIndex: 9000, padding: '14px 16px', borderRadius: '18px',
      background: 'rgba(24,24,28,.96)', border: '1px solid rgba(255,255,255,.14)', backdropFilter: 'blur(14px)',
      boxShadow: '0 20px 60px -10px rgba(0,0,0,.8)', color: '#f7f4ef', display: 'flex', gap: '12px', alignItems: 'flex-start',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, flex: 'none', display: 'grid', placeItems: 'center', background: 'rgba(16,185,129,.15)', color: '#10b981' }}>
        <Bell size={18} />
      </div>

      <div style={{ flex: 1, minWidth: 0, fontSize: '.88rem', lineHeight: 1.45 }}>
        {kind === 'default' && (
          <>
            <strong style={{ display: 'block', marginBottom: 2 }}>Activa las notificaciones</strong>
            <span style={{ opacity: .75 }}>Entérate al instante cuando te asignen a un evento o llegue el Call-Sheet.</span>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={enable} disabled={busy} style={{ padding: '8px 16px', borderRadius: 999, border: 0, cursor: 'pointer', fontWeight: 600, fontSize: '.82rem', background: '#10b981', color: '#04130d' }}>
                {busy ? 'Activando…' : 'Activar'}
              </button>
              <button onClick={close} style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,.18)', cursor: 'pointer', fontSize: '.82rem', background: 'transparent', color: 'inherit' }}>
                Ahora no
              </button>
            </div>
          </>
        )}

        {kind === 'ios-install' && (
          <>
            <strong style={{ display: 'block', marginBottom: 2 }}>Para recibir avisos en iPhone, instala Bandly</strong>
            <ol style={{ margin: '4px 0 0', paddingLeft: '1.1rem', opacity: .8 }}>
              {IOS_INSTALL_STEPS.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </>
        )}

        {kind === 'in-app' && (
          <>
            <strong style={{ display: 'block', marginBottom: 2 }}>Ábrelo en tu navegador</strong>
            <span style={{ opacity: .75 }}>Estás dentro de otra app (WhatsApp, Instagram…) y ahí no se pueden activar notificaciones. Abre <b>getbandly.com</b> en Chrome o Safari.</span>
            <div style={{ marginTop: 10 }}>
              <button onClick={copy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,.18)', cursor: 'pointer', fontSize: '.82rem', background: 'transparent', color: 'inherit' }}>
                {copied ? <><Check size={14} /> Enlace copiado</> : <><Copy size={14} /> Copiar enlace</>}
              </button>
            </div>
          </>
        )}
      </div>

      <button onClick={close} aria-label="Cerrar" style={{ background: 'transparent', border: 0, color: 'rgba(247,244,239,.6)', cursor: 'pointer', padding: 4, display: 'grid' }}>
        <X size={16} />
      </button>
    </div>
  );
}
