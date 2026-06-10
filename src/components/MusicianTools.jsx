import React from 'react';
import { Headphones, Disc3 } from 'lucide-react';
import PadBoard from './DAW/PadBoard';
import PercussionPad from './PercussionPad';

export default function MusicianTools() {
  return (
    <div style={{ maxWidth: '100%', width: '100%', margin: '0 auto', paddingBottom: '3rem' }}>
      <div className="library-intro" style={{ marginBottom: '3rem', marginTop: '1rem' }}>
        <h2 className="hero-main-title-large" style={{ fontSize: '3rem', textAlign: 'left', marginBottom: '1.5rem' }}>
          Tus Herramientas. <span className="serif-accent">En Vivo.</span>
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <Headphones size={28} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Studio Live Tools</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Acompaña la música desde tu dispositivo utilizando los <span style={{ color: 'white' }}>Ambient Pads</span> profesionales.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <Disc3 size={28} color="var(--accent)" />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Drum Machine</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Los sonidos de percusión se pueden <span style={{ color: 'white' }}>personalizar</span> para tu interpretación en directo.
            </p>
          </div>
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
