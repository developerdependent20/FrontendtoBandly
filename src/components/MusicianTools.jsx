import React from 'react';
import { Headphones, Disc3 } from 'lucide-react';
import PadBoard from './DAW/PadBoard';
import PercussionPad from './PercussionPad';

export default function MusicianTools() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ 
        background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)', 
        padding: '1.5rem 2rem', 
        borderRadius: '16px', 
        color: 'white',
        marginBottom: '2rem',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '50%', boxShadow: '0 0 20px var(--primary)' }}>
          <Headphones size={28} color="#fff" />
        </div>
        <div>
          <h4 style={{ margin: '0 0 5px', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.5px' }}>STUDIO LIVE TOOLS</h4>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Acompaña la música desde tu dispositivo. Los sonidos del Drum Machine se pueden personalizar.</p>
        </div>
      </div>

      <div style={{ 
        display: 'flex', flexDirection: 'column', gap: '2px', 
        background: '#020617', padding: '10px', borderRadius: '12px',
        border: '2px solid #1e293b', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <section style={{ overflow: 'hidden', borderRadius: '8px 8px 0 0', border: '1px solid #334155' }}>
          <PadBoard />
        </section>

        <section style={{ borderRadius: '0 0 8px 8px', border: '1px solid #334155' }}>
          <PercussionPad />
        </section>
      </div>
    </div>
  );
}
