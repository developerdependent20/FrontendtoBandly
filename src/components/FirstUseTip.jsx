import React, { useState } from 'react';
import { X, Lightbulb } from 'lucide-react';

// Tip contextual de "primera vez" por módulo — a diferencia del WelcomeModal
// (checklist genérico de 4 pasos, solo directores), esto se muestra dentro de
// cada herramienta (DAW, ChartStudio, etc.) la primera vez que esa persona la
// abre, explicando justo lo que va a usar ahí. Se recuerda por localStorage,
// una vez cerrado no vuelve a aparecer para ese usuario en ese módulo.
export default function FirstUseTip({ storageKey, title, items, accentColor = 'var(--primary)' }) {
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(storageKey));

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  };

  return (
    <div style={{
      background: 'rgba(59,130,246,0.06)',
      border: `1px solid ${accentColor}33`,
      borderRadius: '14px',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      marginBottom: '1rem',
      position: 'relative'
    }}>
      <Lightbulb size={20} color={accentColor} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff', marginBottom: '6px' }}>{title}</div>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{item}</li>
          ))}
        </ul>
      </div>
      <button
        onClick={handleDismiss}
        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', flexShrink: 0 }}
        onMouseOver={e => e.currentTarget.style.color = '#fff'}
        onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        title="Entendido, no volver a mostrar"
      >
        <X size={16} />
      </button>
    </div>
  );
}
