import { Trash2, Upload, Edit3, Save, X, Trophy } from "lucide-react";

interface CourseOverviewViewProps {
  courseTitle: string;
  courseCover: string | null;
  courseDescription: string;
  isEditMode: boolean;
  isEditingDescription: boolean;
  tempDescription: string;
  setTempDescription: (val: string) => void;
  handleUpdateDescription: () => void;
  setIsEditingDescription: (val: boolean) => void;
  handleRemoveCover: () => void;
  isUploading: boolean;
  handleCoverUpload: (file: File) => void;
  enrollment: any;
  modules: any[];
}

export function CourseOverviewView({
  courseTitle,
  courseCover,
  courseDescription,
  isEditMode,
  isEditingDescription,
  tempDescription,
  setTempDescription,
  handleUpdateDescription,
  setIsEditingDescription,
  handleRemoveCover,
  isUploading,
  handleCoverUpload,
  enrollment,
  modules
}: CourseOverviewViewProps) {
  return (
    <div style={{ position: "relative", marginBottom: "40px" }}>
      {/* Portada Estilo Red Social */}
      <div style={{ 
        width: "100%", 
        height: "350px", 
        borderRadius: "32px", 
        background: courseCover ? `url(${courseCover}) center/cover no-repeat` : "linear-gradient(to right, #1e1e2e, #2d2d44)",
        border: "1px solid var(--glass-border)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
      }}>
        {/* Overlay Gradiente para legibilidad */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)", zIndex: 1 }}></div>
        
        {/* Controles de Mentor (Esquina Superior Derecha) */}
        {isEditMode && (
          <div style={{ position: "absolute", top: "25px", right: "25px", zIndex: 20, display: "flex", gap: "10px" }}>
             {courseCover && (
                <button 
                  onClick={handleRemoveCover}
                  style={{ background: "rgba(239, 68, 68, 0.2)", backdropFilter: "blur(10px)", border: "1px solid rgba(239, 68, 68, 4)", borderRadius: "12px", width: "40px", height: "40px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title="Eliminar Portada"
                >
                   <Trash2 size={18} />
                </button>
             )}
          </div>
        )}

        {/* Cajita de Subida para Mentores */}
        {isEditMode && (
          <div style={{ position: "relative", zIndex: 10 }}>
            <label style={{ 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              gap: "10px", 
              cursor: "pointer", 
              padding: "20px 30px", 
              background: "rgba(0,0,0,0.4)", 
              backdropFilter: "blur(10px)",
              border: "2px dashed rgba(255,255,255,0.3)",
              borderRadius: "20px",
              color: "white",
              transition: "0.2s"
            }} className="hover-scale">
              {isUploading ? (
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>PROCESANDO...</span>
              ) : (
                <>
                  <Upload size={24} color="var(--brand-secondary)" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "1px" }}>{courseCover ? "CAMBIAR PORTADA" : "AÑADIR PORTADA"}</span>
                </>
              )}
              <input type="file" accept="image/*" hidden onChange={(e) => {
                if (e.target.files?.[0]) handleCoverUpload(e.target.files[0]);
              }} />
            </label>
          </div>
        )}

        {/* Contenido de Bienvenida */}
        <div style={{ position: "absolute", bottom: "40px", left: "60px", right: "60px", zIndex: 5, textAlign: "left" }}>
           <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "3.5rem", color: "white", margin: 0, textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{courseTitle}</h1>
           
           {isEditingDescription ? (
              <div style={{ marginTop: "15px", display: "flex", gap: "10px", alignItems: "flex-end" }}>
                 <textarea 
                   value={tempDescription}
                   onChange={(e) => setTempDescription(e.target.value)}
                   autoFocus
                   placeholder="Escribe el mensaje de bienvenida del programa..."
                   style={{ width: "100%", maxWidth: "600px", padding: "15px", borderRadius: "12px", background: "rgba(0,0,0,0.6)", border: "1px solid var(--brand-secondary)", color: "white", fontSize: "1rem", outline: "none", resize: "none" }}
                   rows={3}
                 />
                 <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button onClick={handleUpdateDescription} style={{ background: "var(--brand-primary)", border: "none", borderRadius: "8px", padding: "8px 15px", fontWeight: 700, color: "black", cursor: "pointer" }}><Save size={16} /></button>
                    <button onClick={() => setIsEditingDescription(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "8px", padding: "8px 15px", fontWeight: 700, color: "white", cursor: "pointer" }}><X size={16} /></button>
                 </div>
              </div>
           ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "15px", marginTop: "10px" }}>
                 <p style={{ opacity: 0.8, fontSize: "1.1rem", maxWidth: 650, margin: 0, color: "white" }}>{courseDescription}</p>
                 {isEditMode && <button onClick={() => { setTempDescription(courseDescription); setIsEditingDescription(true); }} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "32px", height: "32px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}><Edit3 size={14} /></button>}
              </div>
           )}
        </div>
      </div>

      {/* Medidor de Progreso Flotante / Minimalista */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "25px", marginTop: "30px" }}>
          <div className="course-stat-card">
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
               <div className="vibrant-icon-bg" style={{ width: "64px", height: "64px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-secondary)" }}>
                  <Trophy size={32} />
               </div>
               <div>
                  <span style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", letterSpacing: "1.5px", fontWeight: 900 }}>PROGRESO ACTUAL</span>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)" }}>{Math.round(((enrollment?.completed_modules || []).length / (modules.length || 1)) * 100)}%</span>
               </div>
            </div>
            <div style={{ width: "250px" }}>
              <div style={{ height: "12px", background: "var(--glass-border)", borderRadius: "20px", overflow: "hidden", position: "relative" }}>
                <div style={{ 
                   height: "100%", 
                   width: `${Math.round(((enrollment?.completed_modules || []).length / (modules.length || 1)) * 100)}%`,
                   background: "linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))",
                   boxShadow: "0 0 20px rgba(0, 82, 255, 0.3)",
                   borderRadius: "20px",
                   transition: "width 1s ease"
                }}></div>
              </div>
              <p style={{ textAlign: "right", fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "12px", fontWeight: 600 }}>
                <strong style={{ color: "var(--brand-secondary)" }}>{(enrollment?.completed_modules || []).length}</strong> de {modules.length} Módulos
              </p>
            </div>
         </div>
         <div className="course-accent-card">
            <span style={{ fontSize: "0.85rem", fontWeight: 900, color: "rgba(255,255,255,0.8)", letterSpacing: "1.5px" }}>SIGUIENTE PASO</span>
            <p style={{ margin: "10px 0 0 0", fontSize: "1.1rem", fontWeight: 800, color: "white" }}>Continúa tu ruta</p>
         </div>
      </div>
    </div>
  );
}
