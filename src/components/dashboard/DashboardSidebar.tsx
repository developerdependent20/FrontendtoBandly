"use client";

import React from "react";
import { createClient } from "@/utils/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Compass, Zap, Users, LogOut, ChevronLeft, ChevronRight, Sun, Moon } from "lucide-react";

export const DashboardSidebar = ({ 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  activeView, 
  setActiveView,
  streakData
}: { 
  isMobileMenuOpen: boolean, 
  setIsMobileMenuOpen: (val: boolean) => void, 
  activeView: string, 
  setActiveView: (view: string) => void,
  streakData?: { currentStreak: number, history: string[] } | null
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  return (
    <div className={`sidebar-wrapper ${isMobileMenuOpen ? "mobile-open" : ""} ${isCollapsed ? "collapsed" : ""}`}
         style={{ 
           position: "relative",
           zIndex: 200,
           height: "100vh"
         }}>
      
      {/* Floating Toggle Button - OUTSIDE the scroll area */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: "absolute",
          right: "-14px",
          top: "105px",
          width: "28px",
          height: "28px",
          background: "var(--brand-primary)",
          borderRadius: "50%",
          border: "none",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 300,
          boxShadow: "0 4px 15px rgba(0, 82, 255, 0.4)",
          transition: "all 0.3s ease"
        }}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`} 
             style={{ 
               width: isCollapsed ? "110px" : "320px",
               padding: isCollapsed ? "50px 15px" : "50px 24px",
               transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
               overflowY: "auto",
               overflowX: "hidden",
               height: "100vh"
             }}>
        
        <div className="sidebar-logo" style={{ textAlign: isCollapsed ? "center" : "left", padding: isCollapsed ? "0" : "0 15px", marginBottom: "60px" }}>
          <div className="logo">
            <Logo variant="stacked" sizeMultiplier={isCollapsed ? 0.45 : 0.8} />
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <a href="#" className={`nav-item ${activeView === "dashboard" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveView("dashboard"); setIsMobileMenuOpen(false); }} 
             style={{ 
               color: activeView === "dashboard" ? "#fff" : "var(--text-main)", 
               background: activeView === "dashboard" ? "var(--brand-primary)" : "transparent",
               borderRadius: "14px",
               fontWeight: 700, 
               marginBottom: "12px",
               padding: "14px 20px",
               display: "flex",
               alignItems: "center",
               justifyContent: isCollapsed ? "center" : "flex-start",
               gap: isCollapsed ? "0" : "12px"
             }}>
            <LayoutDashboard size={20} /> {!isCollapsed && <span>Dashboard</span>}
          </a>
          <a href="#" className={`nav-item ${activeView === "courses" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveView("courses"); setIsMobileMenuOpen(false); }} 
             style={{ 
               color: activeView === "courses" ? "#fff" : "var(--text-main)", 
               background: activeView === "courses" ? "var(--brand-primary)" : "transparent",
               borderRadius: "14px",
               fontWeight: 700, 
               marginBottom: "12px",
               padding: "14px 20px",
               display: "flex",
               alignItems: "center",
               justifyContent: isCollapsed ? "center" : "flex-start",
               gap: isCollapsed ? "0" : "12px"
             }}>
            <Compass size={20} /> {!isCollapsed && <span>Mis Rutas</span>}
          </a>
          <a href="#" className={`nav-item ${activeView === "certs" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveView("certs"); setIsMobileMenuOpen(false); }} 
             style={{ 
               color: activeView === "certs" ? "#fff" : "var(--text-main)", 
               background: activeView === "certs" ? "var(--brand-primary)" : "transparent",
               borderRadius: "14px",
               fontWeight: 700, 
               marginBottom: "12px",
               padding: "14px 20px",
               display: "flex",
               alignItems: "center",
               justifyContent: isCollapsed ? "center" : "flex-start",
               gap: isCollapsed ? "0" : "12px"
             }}>
            <Zap size={20} /> {!isCollapsed && <span>Evolución</span>}
          </a>
          <a href="#" className={`nav-item ${activeView === "community" ? "active" : ""}`} onClick={(e) => { e.preventDefault(); setActiveView("community"); setIsMobileMenuOpen(false); }} 
             style={{ 
               color: activeView === "community" ? "#fff" : "var(--text-main)", 
               background: activeView === "community" ? "var(--brand-primary)" : "transparent",
               borderRadius: "14px",
               fontWeight: 700, 
               marginBottom: "12px",
               padding: "14px 20px",
               display: "flex",
               alignItems: "center",
               justifyContent: isCollapsed ? "center" : "flex-start",
               gap: isCollapsed ? "0" : "12px"
             }}>
            <Users size={20} /> {!isCollapsed && <span>Comunidad</span>}
          </a>
        </nav>

        {streakData && (
          <div style={{ padding: "0 20px", marginTop: "40px" }}>
             <p style={{  fontFamily: "'Outfit', sans-serif", fontSize: "0.65rem", fontWeight: 700, opacity: 0.5, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "10px", color: "var(--text-secondary)" }}>Radar de Disciplina</p>
             <div style={{ display: "flex", gap: "6px", justifyContent: "space-between" }}>
               {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => {
                 const isActive = i < (streakData.currentStreak || 0) % 7 || (streakData.currentStreak >= 7);
                 return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <div style={{ 
                          width: "12px", 
                          height: "12px", 
                          background: isActive ? "var(--brand-primary)" : "var(--glass-border)", 
                          borderRadius: "3px", 
                          boxShadow: isActive ? "0 0 10px rgba(0, 82, 255, 0.4)" : "none",
                          transition: "0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                          transform: isActive ? "scale(1.15)" : "scale(1)"
                        }}></div>
                        <span style={{ fontSize: "0.6rem", opacity: 0.5, fontWeight: isActive ? 800 : 500, color: "var(--text-muted)" }}>{day}</span>
                    </div>
                 );
               })}
             </div>
          </div>
        )}

        <div style={{ marginTop: "auto", borderTop: "1px solid var(--glass-border)", paddingTop: "20px" }}>
          <button 
            className="nav-item" 
            aria-label="Cambiar tema"
            style={{ width: "100%", background: "none", border: "none", color: "var(--text-main)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px", padding: "14px 20px", fontWeight: 700, marginBottom: "8px" }}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />} {!isCollapsed && <span>{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>}
          </button>

          <button 
            className="nav-item" 
            aria-label="Cerrar sesión"
            style={{ width: "100%", background: "none", border: "none", color: "var(--text-main)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: isCollapsed ? "center" : "flex-start", gap: isCollapsed ? "0" : "12px", padding: "14px 20px", fontWeight: 700 }}
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            <LogOut size={20} /> {!isCollapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>
    </div>
  );
};
