import React from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  LayoutDashboard, 
  CheckCircle2, 
  ShieldAlert, 
  Folder, 
  Edit3, 
  Trash2, 
  X, 
  Trophy, 
  Users,
  Plus
} from "lucide-react";

interface CourseSidebarProps {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean) => void;
  theme: string | undefined;
  setTheme: (theme: any) => void;
  isAdmin: boolean;
  modules: any[];
  enrollment: any;
  activeScreen: string;
  setActiveScreen: (id: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  isModuleLocked: (id: string) => boolean;
  editingModuleId: string | null;
  setEditingModuleId: (id: string | null) => void;
  editingModuleTitle: string;
  setEditingModuleTitle: (title: string) => void;
  supabase: any;
  setModules: React.Dispatch<React.SetStateAction<any[]>>;
  isEditMode: boolean;
  blocks: any[];
  submissions: any[];
  isAddingModule: boolean;
  setIsAddingModule: (val: boolean) => void;
  newModuleTitle: string;
  setNewModuleTitle: (title: string) => void;
  handleAddModule: () => void;
  playUISound: (sound: any, volume?: number) => void;
  setShowModuleCreationModal?: (val: boolean) => void;
}

export function CourseSidebar({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  theme,
  setTheme,
  isAdmin,
  modules,
  enrollment,
  activeScreen,
  setActiveScreen,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isModuleLocked,
  editingModuleId,
  setEditingModuleId,
  editingModuleTitle,
  setEditingModuleTitle,
  supabase,
  setModules,
  isEditMode,
  blocks,
  submissions,
  isAddingModule,
  setIsAddingModule,
  newModuleTitle,
  setNewModuleTitle,
  handleAddModule,
  playUISound,
  setShowModuleCreationModal
}: CourseSidebarProps) {
  const [showLockedModal, setShowLockedModal] = React.useState(false);

  return (
    <aside className={`player-sidebar ${isSidebarCollapsed ? "collapsed" : ""} ${isMobileMenuOpen ? "mobile-open" : ""}`} style={{ 
      width: isSidebarCollapsed ? "80px" : "320px",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      background: "var(--bg-card)",
      borderRight: "1px solid var(--glass-border)",
      display: "flex",
      flexDirection: "column",
      padding: "30px 20px",
      height: "100vh",
      position: "sticky",
      top: 0,
      zIndex: 2000,
      overflow: "hidden"
    }}>
      <div style={{ display: "flex", flexDirection: isSidebarCollapsed ? "column" : "row", justifyContent: isSidebarCollapsed ? "center" : "space-between", alignItems: "center", gap: isSidebarCollapsed ? 20 : 0, marginBottom: 40 }}>
        {!isSidebarCollapsed ? (
          <div style={{ display: "flex", alignItems: "center" }}>
             <Logo variant="stacked" sizeMultiplier={0.35} showText={true} />
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
             <Logo variant="stacked" sizeMultiplier={0.3} showText={false} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: isSidebarCollapsed ? "column" : "row", gap: 8 }}>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "10px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", cursor: "pointer" }}
            title={isSidebarCollapsed ? "Expandir" : "Contraer"}
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "10px", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-main)", cursor: "pointer" }}
            title="Cambiar tema"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      {!isAdmin && modules.length > 0 && !isSidebarCollapsed && (
        <div style={{ marginBottom: 30, padding: "0 10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--brand-secondary)", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
            <span>PROGRESO DEL CURSO</span>
            <span>{(() => {
              const completedCount = (enrollment?.completed_modules || []).length;
              const total = modules.length;
              return total > 0 ? Math.round((completedCount / total) * 100) : 0;
            })()}%</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ 
              height: "100%", 
              background: "var(--brand-primary)", 
              width: `${modules.length > 0 ? Math.round(((enrollment?.completed_modules || []).length / modules.length) * 100) : 0}%`,
              transition: "width 0.5s ease"
            }}></div>
          </div>
        </div>
      )}
      
      <nav className="syllabus-nav" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingRight: "8px", maxHeight: "calc(100vh - 250px)", display: "flex", flexDirection: "column" }}>
        <div className={`syllabus-item ${activeScreen === "overview" ? "active" : ""}`} onClick={() => { setActiveScreen("overview"); setIsMobileMenuOpen(false); }} title="Mapa del Curso" style={{ justifyContent: isSidebarCollapsed ? "center" : "flex-start", padding: isSidebarCollapsed ? "15px 0" : "" }}>
           <LayoutDashboard size={18} /> {!isSidebarCollapsed && <span>Mapa del Curso</span>}
        </div>
        {modules.map(mod => {
          const isCompleted = enrollment?.completed_modules?.includes(mod.id);
          const isLocked = isModuleLocked(mod.id);
          return (
            <div key={mod.id} className={`syllabus-item ${activeScreen === mod.id ? "active" : ""} ${isLocked ? "is-locked" : ""}`} onClick={() => {
                if (isLocked) {
                  playUISound("error");
                  setShowLockedModal(true);
                  return;
                }
                setActiveScreen(mod.id);
                setIsMobileMenuOpen(false);
              }} style={{ display: "flex", justifyContent: isSidebarCollapsed ? "center" : "space-between", alignItems: "center", position: "relative", padding: isSidebarCollapsed ? "15px 0" : "" }}>
               <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isCompleted ? (
                    <CheckCircle2 size={18} color="var(--brand-secondary)" />
                  ) : isLocked ? (
                    <ShieldAlert size={18} style={{ opacity: 0.5 }} />
                  ) : (
                    <Folder size={18} />
                  )}
                  {!isSidebarCollapsed && (
                    editingModuleId === mod.id ? (
                      <div style={{ display: "flex", gap: 5, alignItems: "center", flex: 1 }} onClick={e => e.stopPropagation()}>
                        <input 
                          autoFocus
                          value={editingModuleTitle}
                          onChange={(e) => setEditingModuleTitle(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const { error } = await supabase.from('modules').update({ title: editingModuleTitle }).eq('id', mod.id);
                              if (!error) {
                                setModules(prev => prev.map(m => m.id === mod.id ? { ...m, title: editingModuleTitle } : m));
                                setEditingModuleId(null);
                              } else { alert("Error al renombrar: " + error.message); }
                            }
                            if (e.key === 'Escape') setEditingModuleId(null);
                          }}
                          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--brand-secondary)", color: "white", padding: "4px 8px", borderRadius: 4, width: "100%", fontSize: "0.8rem", outline: "none" }}
                        />
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          const { error } = await supabase.from('modules').update({ title: editingModuleTitle }).eq('id', mod.id);
                          if (!error) {
                            setModules(prev => prev.map(m => m.id === mod.id ? { ...m, title: editingModuleTitle } : m));
                            setEditingModuleId(null);
                          } else { alert("Error al renombrar: " + error.message); }
                        }} style={{ background: "transparent", border: "none", color: "var(--brand-secondary)", cursor: "pointer", padding: 2 }}><CheckCircle2 size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingModuleId(null); }} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}><X size={16} /></button>
                      </div>
                    ) : (
                      <span style={{ opacity: isCompleted ? 0.6 : isLocked ? 0.4 : 1, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {mod.title}
                        {isLocked && <span style={{ fontSize: "0.6rem", display: "block", color: "var(--brand-secondary)", opacity: 0.8, fontWeight: 700 }}>VISTA PREVIA</span>}
                      </span>
                    )
                  )}
               </div>
               {isEditMode && editingModuleId !== mod.id && !isSidebarCollapsed && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         setEditingModuleTitle(mod.title);
                         setEditingModuleId(mod.id);
                       }}
                       style={{ background: "transparent", border: "none", color: "var(--brand-secondary)", cursor: "pointer", opacity: 0.8, padding: 0, display: "flex", alignItems: "center" }}
                       title="Renombrar Módulo"
                    >
                       <Edit3 size={16} />
                    </button>
                    <button 
                       onClick={async (e) => { 
                         e.stopPropagation(); 
                         if(confirm('¿Seguro de borrar este módulo y todo su contenido?')) { 
                           const blocksInModule = blocks.filter(b => b.screen === mod.id);
                           for (const b of blocksInModule) {
                              await supabase.from('submissions').delete().eq('block_id', b.id);
                           }
                           await supabase.from('blocks').delete().eq('screen', mod.id);
                           const { error } = await supabase.from('modules').delete().eq('id', mod.id); 
                           if (error) {
                             alert("Error al borrar el módulo: " + error.message);
                           } else {
                             window.location.reload(); 
                           }
                         } 
                       }}
                       style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", opacity: 0.6, padding: 0, display: "flex", alignItems: "center" }}
                       title="Borrar Módulo"
                    >
                       <Trash2 size={16} />
                    </button>
                  </div>
               )}
            </div>
          );
        })}
        <div className={`syllabus-item ${activeScreen === "grades" ? "active" : ""}`} onClick={() => { setActiveScreen("grades"); setIsMobileMenuOpen(false); }} title="Calificaciones" style={{ justifyContent: isSidebarCollapsed ? "center" : "flex-start", padding: isSidebarCollapsed ? "15px 0" : "" }}>
           <Trophy size={18} /> {!isSidebarCollapsed && <span>Calificaciones {isAdmin && submissions.filter(s => s.status === 'pending').length > 0 && `(${submissions.filter(s => s.status === 'pending').length})`}</span>}
        </div>
        {isAdmin && (
          <>
            <div className={`syllabus-item ${activeScreen === "members" ? "active" : ""}`} onClick={() => { setActiveScreen("members"); setIsMobileMenuOpen(false); }} style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 10, paddingTop: 15, justifyContent: isSidebarCollapsed ? "center" : "flex-start" }} title="Miembros del Curso">
              <Users size={18} /> {!isSidebarCollapsed && <span>Miembros del Curso</span>}
            </div>
          </>
        )}
        {isEditMode && (
          <div style={{ marginTop: 10 }}>
            {isAddingModule ? (
              <div style={{ padding: "10px", background: "var(--glass-bg)", borderRadius: "12px", border: "1px solid var(--brand-secondary)" }}>
                <input 
                  autoFocus
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="Título del módulo..."
                  style={{ width: "100%", background: "transparent", border: "none", color: "var(--text-main)", outline: "none", fontSize: "0.85rem", marginBottom: 8 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddModule();
                    if (e.key === 'Escape') setIsAddingModule(false);
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleAddModule} style={{ background: "var(--brand-primary)", color: "black", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}>AÑADIR</button>
                  <button onClick={() => setIsAddingModule(false)} style={{ background: "transparent", color: "var(--text-muted)", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}>CANCELAR</button>
                </div>
              </div>
            ) : (
              <button 
                className="syllabus-item add-mod" 
                onClick={() => setShowModuleCreationModal ? setShowModuleCreationModal(true) : setIsAddingModule(true)}
                style={{ justifyContent: isSidebarCollapsed ? "center" : "flex-start", padding: isSidebarCollapsed ? "15px 0" : "" }}
                title="Nuevo Módulo"
              >
                <Plus size={18} /> {!isSidebarCollapsed && <span>Nuevo Módulo</span>}
              </button>
            )}
          </div>
        )}
      </nav>

      <footer style={{ marginTop: "auto", padding: "20px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
         <Link href={isAdmin ? "/admin" : "/dashboard"} style={{ display: "flex", alignItems: "center", justifyContent: isSidebarCollapsed ? "center" : "flex-start", gap: 12, color: "var(--text-main)", opacity: 0.5, textDecoration: "none", fontSize: "0.9rem" }} title="Salir del curso">
            <LayoutDashboard size={18} /> {!isSidebarCollapsed && <span>Salir del curso</span>}
         </Link>
      </footer>

      {showLockedModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--brand-secondary)", borderRadius: "24px", padding: "40px", maxWidth: "400px", width: "90%", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", animation: "fadeIn 0.3s ease" }}>
            <div style={{ width: "64px", height: "64px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <ShieldAlert size={32} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "15px" }}>Módulo Bloqueado</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "30px" }}>
              Debes completar todos los entregables de las semanas anteriores para poder acceder a este contenido. Así garantizamos que sigas la ruta de aprendizaje correctamente.
            </p>
            <button 
              onClick={() => setShowLockedModal(false)}
              className="btn-primary" 
              style={{ width: "100%", justifyContent: "center", padding: "14px", borderRadius: "12px", fontSize: "1rem" }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
