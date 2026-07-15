import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="center-layout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <style>{`
        @keyframes loadingLogoPulse { 0%, 100% { opacity: 0.4; transform: scale(0.97); } 50% { opacity: 1; transform: scale(1); } }
      `}</style>
      <img
        src="https://cctfjcnxlluipgsfrixy.supabase.co/storage/v1/object/public/org-logos/Bandly%20nuevo.png"
        alt="Bandly"
        style={{ width: '110px', height: 'auto', objectFit: 'contain', animation: 'loadingLogoPulse 1.6s ease-in-out infinite' }}
      />
    </div>
  );
}
