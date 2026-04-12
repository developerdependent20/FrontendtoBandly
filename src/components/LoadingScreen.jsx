import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="center-layout">
      <Loader2 className="spin-slow" size={48} color="var(--primary)" />
    </div>
  );
}
