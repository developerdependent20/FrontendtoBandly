"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Logo } from "@/components/Logo";

export default function Navbar() {
  const { theme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/20 animate-fade-in navbar">
        <Link href="/" className="flex items-center group gap-3">
          <Logo sizeMultiplier={1.2} />
        </Link>
        
        {/* Desktop Button */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/login" className="px-6 py-2.5 rounded-full bg-brand-primary text-black font-bold text-sm tracking-wide transition-all hover:scale-105 active:scale-95 shadow-[0_10px_20px_var(--brand-glow)]">
            Ingresar a la Plataforma
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-white hover:text-brand-primary transition-colors focus:outline-none"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      <div className={`
        fixed inset-0 z-[60] bg-black/95 backdrop-blur-2xl transition-all duration-500 ease-in-out md:hidden flex flex-col items-center justify-center p-8
        ${isMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"}
      `}>
        <button 
          onClick={() => setIsMenuOpen(false)}
          className="absolute top-6 right-6 p-2 text-white hover:text-yellow-primary transition-colors"
        >
          <X size={32} />
        </button>

        <div className="flex flex-col items-center gap-12 w-full animate-fade-in">
          <Logo variant="stacked" sizeMultiplier={1.6} />
          
          <div className="flex flex-col items-center gap-6 w-full">
            <Link 
              href="/login" 
              onClick={() => setIsMenuOpen(false)}
              className="w-full max-w-xs text-center px-8 py-4 rounded-full bg-brand-primary text-black font-bold text-lg tracking-wide transition-all active:scale-95 shadow-[0_15px_30px_var(--brand-glow)]"
            >
              Ingresar a la Plataforma
            </Link>
            
            <Link 
              href="/" 
              onClick={() => setIsMenuOpen(false)}
              className="text-white/50 hover:text-white transition-colors text-sm uppercase tracking-widest font-bold"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
