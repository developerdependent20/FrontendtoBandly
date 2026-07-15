import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

const MESSAGES = [
  "Hazlo todo con excelencia.",
  "Donde hay unidad, allí hay bendición.",
  "Que todo lo que respire, haga música.",
  "Brilla con tu talento.",
  "Una cuerda de tres hilos no se rompe fácilmente.",
  "Prepárate con propósito."
];

export default function LoadingScreen() {
  const [msg] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

  return (
    <div className="center-layout" style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', padding: '20px' }}>
      <Loader2 className="spin-slow" size={48} color="var(--primary)" />
      {msg && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', animation: 'fadeIn 1s ease-out', opacity: 0.7 }}>"{msg}"</p>}
    </div>
  );
}
