import React from 'react';
import { createPortal } from 'react-dom';

export const AVATARS = [
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20Sebas.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20David.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/avatar%20Cesar.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20Tani.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20Rodri.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20Santi.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20Pau.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20Vale.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20Caro.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20Vane.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20Nico.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20sol.png',
  'https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Avatar%20Alex.png'
];

export const AvatarPicker = ({ isOpen, onClose, onSelect, currentAvatar }) => {
  if (!isOpen) return null;
  
  const content = (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.9)', zIndex: 999999, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      padding: '20px', backdropFilter: 'blur(10px)'
    }}>
      <div className="glass-panel" style={{ 
        maxWidth: '800px', width: '100%', padding: '3rem', 
        textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)',
        animation: 'dropdownFadeIn 0.3s ease-out',
        boxShadow: '0 0 100px rgba(0,0,0,1)'
      }}>
        <h3 style={{ marginBottom: '2.5rem', fontSize: '2rem', fontWeight: '900' }}>Elige tu Avatar</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '25px', marginBottom: '3rem' }}>
          {AVATARS.map((url, i) => (
            <div 
              key={i} 
              onClick={() => onSelect(url)}
              style={{ 
                cursor: 'pointer', borderRadius: '50%', overflow: 'hidden', 
                border: currentAvatar === url ? '4px solid var(--primary)' : '2px solid rgba(255,255,255,0.05)',
                transition: 'all 0.3s ease', transform: currentAvatar === url ? 'scale(1.15)' : 'none',
                boxShadow: currentAvatar === url ? '0 0 30px var(--primary)' : 'none',
                aspectRatio: '1/1',
                width: '100%',
                background: 'rgba(255,255,255,0.02)'
              }}
              className="hover-scale"
            >
              <img src={url} alt={`Avatar ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
        </div>
        <button onClick={onClose} className="btn-secondary" style={{ width: '100%', padding: '1.2rem', fontSize: '1rem', fontWeight: 'bold' }}>Cancelar</button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
