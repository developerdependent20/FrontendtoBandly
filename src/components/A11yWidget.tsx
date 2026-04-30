"use client";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { Sliders, Moon, Sun, Eye, Volume2, VolumeX } from "lucide-react";
import { setMuteSounds, areSoundsEnabled, playUISound } from "@/utils/audio";

export default function A11yWidget() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [soundsEnabled, setSoundsEnabled] = useState(areSoundsEnabled());

  const toggleSounds = () => {
    const newState = !soundsEnabled;
    setSoundsEnabled(newState);
    setMuteSounds(!newState);
    if (newState) playUISound("click");
  };

  return (
    <div style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 9999 }}>
      {open && (
        <div style={{ 
          position: "absolute", bottom: "60px", right: "0", 
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)", borderRadius: "16px",
          padding: "16px", display: "flex", flexDirection: "column", gap: "10px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)", width: "230px"
        }}>
          <h4 style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Accesibilidad Visual</h4>
          
          <button 
            onClick={() => setTheme("light")} 
            style={{ display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", color: theme === "light" ? "var(--brand-primary)" : "var(--text-main)", cursor: "pointer", textAlign: "left", padding: "10px", borderRadius: "8px", backgroundColor: theme === "light" ? "rgba(0,82,255,0.05)" : "transparent", transition: "0.2s" }}
          >
            <Sun size={18} aria-hidden={true} /> Modo Claro (Predeterminado)
          </button>

          <button 
            onClick={() => setTheme("dark")} 
            style={{ display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", color: theme === "dark" ? "var(--brand-primary)" : "var(--text-main)", cursor: "pointer", textAlign: "left", padding: "10px", borderRadius: "8px", backgroundColor: theme === "dark" ? "rgba(0,82,255,0.05)" : "transparent", transition: "0.2s" }}
          >
            <Moon size={18} aria-hidden={true} /> Modo Noche (Oscuro)
          </button>
          
          <button 
            onClick={() => setTheme("colorblind")} 
            style={{ display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", color: theme === "colorblind" ? "var(--brand-primary)" : "var(--text-main)", cursor: "pointer", textAlign: "left", padding: "10px", borderRadius: "8px", backgroundColor: theme === "colorblind" ? "rgba(0,82,255,0.05)" : "transparent", transition: "0.2s" }}
          >
            <Eye size={18} aria-hidden={true} /> Filtro Daltonismo
          </button>

          <div style={{ height: "1px", background: "rgba(0,0,0,0.05)", margin: "5px 0" }}></div>
          <h4 style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>Efectos Sonoros</h4>

          <button 
            onClick={toggleSounds} 
            style={{ display: "flex", alignItems: "center", gap: "12px", background: "none", border: "none", color: soundsEnabled ? "var(--brand-primary)" : "var(--text-main)", cursor: "pointer", textAlign: "left", padding: "10px", borderRadius: "8px", backgroundColor: soundsEnabled ? "rgba(0,82,255,0.05)" : "transparent", transition: "0.2s" }}
          >
            {soundsEnabled ? <Volume2 size={18} aria-hidden={true} /> : <VolumeX size={18} aria-hidden={true} />} 
            {soundsEnabled ? "Sonido Activado" : "Silencio Activo"}
          </button>
        </div>
      )}
      
      <button 
        onClick={() => setOpen(!open)}
        aria-label="Abrir menú de accesibilidad visual"
        style={{
          background: "var(--glass-bg)",
          color: "var(--text-primary)",
          width: "55px", height: "55px",
          borderRadius: "50%",
          display: "flex", justifyContent: "center", alignItems: "center",
          border: "1px solid var(--glass-border)", cursor: "pointer",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          transition: "transform 0.3s, border-color 0.3s"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.borderColor = "var(--yellow-primary)" }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "var(--glass-border)" }}
      >
        <Sliders size={24} aria-hidden={true} />
      </button>
    </div>
  );
}
