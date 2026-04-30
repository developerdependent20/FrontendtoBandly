"use client";

import React from "react";
import { Logo } from "./Logo";

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black" style={{ background: "var(--bg-main)" }}>
      <style jsx>{`
        .loading-pulse {
          animation: logo-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes logo-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            filter: drop-shadow(0 0 30px rgba(0, 82, 255, 0.2));
          }
          50% {
            opacity: 0.8;
            transform: scale(0.96);
            filter: drop-shadow(0 0 50px rgba(0, 82, 255, 0.4));
          }
        }
      `}</style>
      
      <div className="loading-pulse">
        <Logo variant="stacked" sizeMultiplier={1.5} />
      </div>
      
      <div className="mt-12 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-brand-primary animate-bounce [animation-delay:-0.3s]" style={{ background: "var(--brand-primary)" }}></div>
        <div className="w-2 h-2 rounded-full bg-brand-primary animate-bounce [animation-delay:-0.15s]" style={{ background: "var(--brand-primary)" }}></div>
        <div className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" style={{ background: "var(--brand-primary)" }}></div>
      </div>
      
      <p className="mt-6 font-outfit text-[0.65rem] uppercase tracking-[6px] opacity-40 text-brand-primary" style={{ color: "var(--brand-primary)", fontWeight: 900 }}>
        Acceso Seguro en Proceso
      </p>
    </div>
  );
};
