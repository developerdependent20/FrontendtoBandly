import { Trash2, Paperclip, FileText, ExternalLink } from "lucide-react";
import { CLANEditor } from "@/components/course/CLANEditor";
import { createClient } from "@/utils/supabase/client";
import { playUISound } from "@/utils/audio";
import { useState, useMemo } from "react";

interface CourseGradesViewProps {
  isAdmin: boolean;
  submissions: any[];
  setSubmissions: React.Dispatch<React.SetStateAction<any[]>>;
  blocks: any[];
  modules: any[];
  setActiveScreen: (screen: string) => void;
}

export function CourseGradesView({
  isAdmin,
  submissions,
  setSubmissions,
  blocks,
  modules,
  setActiveScreen
}: CourseGradesViewProps) {
  const supabase = createClient();
  const [viewMode, setViewMode] = useState<"feed" | "table">("table");

  // Matriz de Notas por Estudiante
  const studentMatrix = useMemo(() => {
    const studentsMap = new Map<string, any>();
    
    submissions.forEach(sub => {
      if (!studentsMap.has(sub.student_id)) {
        studentsMap.set(sub.student_id, {
          id: sub.student_id,
          name: sub.profiles?.full_name || "Estudiante",
          scores: {},
          totalSubmissions: 0,
          gradedSubmissions: 0,
          totalScore: 0
        });
      }
      
      const st = studentsMap.get(sub.student_id);
      st.totalSubmissions += 1;
      
      const block = blocks.find(b => b.id === sub.block_id);
      if (block) {
         if (sub.status === 'graded') {
           st.scores[block.screen] = sub.score; // store by module id
           st.gradedSubmissions += 1;
           st.totalScore += (sub.score || 0);
         } else {
           st.scores[block.screen] = "Pend";
         }
      }
    });
    
    return Array.from(studentsMap.values());
  }, [submissions, blocks]);

  return (
    <div className="grades-summary-view" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px" }}>
      {isAdmin ? (
        <>
          {/* PANEL MENTOR: DASHBOARD DE MÉTRICAS */}
          <header style={{ marginBottom: 40, borderBottom: "1px solid var(--glass-border)", paddingBottom: 25 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: "var(--brand-secondary)", margin: 0 }}>Gestión Académica</h2>
                <p style={{ opacity: 0.5, marginTop: 5 }}>Visión global del rendimiento y retroalimentación de este programa.</p>
              </div>
              <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 4, gap: 5 }}>
                <button onClick={() => setViewMode("table")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: viewMode === "table" ? "var(--brand-primary)" : "transparent", color: viewMode === "table" ? "black" : "white", fontWeight: 700, cursor: "pointer", transition: "0.2s" }}>Boletín de Notas</button>
                <button onClick={() => setViewMode("feed")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: viewMode === "feed" ? "var(--brand-primary)" : "transparent", color: viewMode === "feed" ? "black" : "white", fontWeight: 700, cursor: "pointer", transition: "0.2s" }}>Feed de Corrección</button>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 20, marginTop: 25 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px 25px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)", flex: 1, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}>
                  <label style={{ fontSize: "0.65rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, display: "block", marginBottom: 5 }}>TOTAL ENTREGAS</label>
                  <span style={{ fontSize: "2rem", fontWeight: 800 }}>{submissions.length}</span>
              </div>
              <div style={{ background: "var(--brand-glow)", padding: "20px 25px", borderRadius: 24, border: "1px solid var(--brand-glow)", flex: 1, boxShadow: "0 10px 30px var(--brand-glow)" }}>
                  <label style={{ fontSize: "0.65rem", fontWeight: 900, color: "black", letterSpacing: 1.5, display: "block", marginBottom: 5 }}>PENDIENTES</label>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "black" }}>{submissions.filter(s => s.status === 'pending').length}</span>
              </div>
            </div>
          </header>

          {submissions.length === 0 ? (
            <div style={{ padding: 100, textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 32, border: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ opacity: 0.4, fontSize: "1.2rem", fontWeight: 800 }}>Ningún alumno ha enviado proyectos para calificar.</p>
            </div>
          ) : viewMode === "table" ? (
             <div style={{ overflowX: "auto", background: "var(--bg-dark)", border: "1px solid var(--glass-border)", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 800 }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                       <th style={{ padding: "20px 25px", fontSize: "0.75rem", fontWeight: 900, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1, position: "sticky", left: 0, background: "var(--bg-dark)", zIndex: 10, borderRight: "1px solid rgba(255,255,255,0.05)" }}>Estudiante</th>
                       <th style={{ padding: "20px 25px", fontSize: "0.75rem", fontWeight: 900, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1, borderRight: "1px solid rgba(255,255,255,0.05)" }}>Promedio</th>
                       {modules.map((m, i) => (
                          <th key={m.id} style={{ padding: "20px 25px", fontSize: "0.75rem", fontWeight: 900, opacity: 0.5, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }} title={m.title}>Mod {i + 1}</th>
                       ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentMatrix.map(st => (
                       <tr key={st.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                         <td style={{ padding: "20px 25px", fontWeight: 800, position: "sticky", left: 0, background: "var(--bg-dark)", zIndex: 10, borderRight: "1px solid rgba(255,255,255,0.05)" }}>{st.name}</td>
                         <td style={{ padding: "20px 25px", fontWeight: 900, color: "var(--brand-secondary)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>{st.gradedSubmissions > 0 ? (st.totalScore / st.gradedSubmissions).toFixed(1) : "—"}</td>
                         {modules.map(m => {
                            const val = st.scores[m.id];
                            return (
                               <td key={m.id} style={{ padding: "20px 25px", fontWeight: 600, color: val === "Pend" ? "#f59e0b" : val !== undefined ? "#10b981" : "rgba(255,255,255,0.1)" }}>
                                 {val !== undefined ? val : "—"}
                               </td>
                            )
                         })}
                       </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
              {submissions.map(sub => {
                  const block = blocks.find(b => b.id === sub.block_id);
                  const module = modules.find(m => m.id === block?.screen);
                  return (
                    <div key={sub.id} style={{ background: "var(--bg-dark)", border: "1px solid var(--glass-border)", borderRadius: 32, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
                        {/* Header de Entrega */}
                        <div style={{ padding: 30, borderBottom: "1px solid rgba(255,255,255,0.05)", background: sub.status === 'pending' ? "rgba(254, 220, 61, 0.02)" : "transparent" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                                <div style={{ width: 50, height: 50, borderRadius: "50%", background: "var(--brand-primary)", color: "black", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.1rem" }}>{sub.profiles?.full_name?.substring(0,2).toUpperCase() || "?"}</div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700 }}>{sub.profiles?.full_name || "Estudiante"}</h4>
                                    <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.5, fontWeight: 600 }}>{module?.title || "Módulo General"} » {block?.type === 'delivery' ? "Proyecto Final" : "Actividad"}</p>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ padding: "6px 12px", border: "1px solid", borderColor: sub.status === 'graded' ? "#10b981" : "var(--brand-primary)", borderRadius: 20, color: sub.status === 'graded' ? "#10b981" : "var(--brand-primary)", fontSize: "0.65rem", fontWeight: 900, letterSpacing: 1 }}>{sub.status.toUpperCase()}</span>
                                <button 
                                    onClick={async () => {
                                      if (confirm("¿Estás seguro de eliminar permanentemente esta entrega?")) {
                                          const { error } = await supabase.from("submissions").delete().eq("id", sub.id);
                                          if (!error) setSubmissions(prev => prev.filter(s => s.id !== sub.id));
                                      }
                                    }}
                                    style={{ background: "rgba(239, 68, 68, 0.1)", border: "none", borderRadius: 12, width: 40, height: 40, color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                    title="Eliminar Entrega"
                                >
                                    <Trash2 size={18} />
                                </button>
                              </div>
                          </div>
                        </div>
                        {/* Archivo Adjunto (si aplica) */}
                        {sub.file_url && (
                          <div style={{ padding: "20px 30px", background: "rgba(0,82,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <p style={{ fontSize: "0.65rem", opacity: 0.4, marginBottom: 12, fontWeight: 900, letterSpacing: 1 }}>ARCHIVO ADJUNTO DEL ESTUDIANTE:</p>
                            <a
                              href={sub.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 20px", textDecoration: "none", color: "var(--text-main)", transition: "border-color 0.2s" }}
                            >
                              <Paperclip size={18} style={{ color: "var(--brand-secondary)", flexShrink: 0 }} />
                              <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{sub.file_name || "Archivo adjunto"}</span>
                              <ExternalLink size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                            </a>
                          </div>
                        )}
                        {/* Contenido con Bisturí */}
                        <div style={{ padding: 30, flexGrow: 1, background: "rgba(255,255,255,0.01)" }}>
                          <p style={{ fontSize: "0.7rem", opacity: 0.4, marginBottom: 15, fontWeight: 900, letterSpacing: 1 }}>TRABAJO ENTREGADO (USA EL BISTURÍ PARA RESALTAR):</p>
                          <div className="mentor-editor-box" style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                              <CLANEditor 
                                    blockId={block?.id || ""} 
                                    initialHtml={sub.content} 
                                    isAdmin={true} 
                                    mode="grading"
                                    onGrade={(updatedContent: string) => { (sub as any).pending_content = updatedContent; }}
                                  />
                          </div>
                        </div>
                        {/* Footer Evaluación */}
                        <div style={{ padding: 30, background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                              <div style={{ display: "flex", gap: 20 }}>
                                <div style={{ width: 120 }}>
                                    <label style={{ fontSize: "0.65rem", opacity: 0.5, display: "block", marginBottom: 5 }}>NOTA /100</label>
                                    <input id={`score-${sub.id}`} type="number" defaultValue={sub.score || ""} style={{ width: "100%", padding: "15px", borderRadius: 16, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", fontWeight: 800, textAlign: "center", fontSize: "1.2rem" }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: "0.65rem", opacity: 0.5, display: "block", marginBottom: 5 }}>RETROALIMENTACIÓN</label>
                                    <input id={`fdbk-${sub.id}`} type="text" defaultValue={sub.feedback || ""} placeholder="Excelente trabajo, pero considera..." style={{ width: "100%", padding: "15px 20px", borderRadius: 16, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none" }} />
                                </div>
                              </div>
                              <button onClick={async () => {
                                const score = (document.getElementById(`score-${sub.id}`) as HTMLInputElement).value;
                                const feedback = (document.getElementById(`fdbk-${sub.id}`) as HTMLInputElement).value;
                                const finalContent = (sub as any).pending_content || sub.content;
                                if (!score) return alert("Por favor asigna una nota.");
                                const { error } = await supabase.from("submissions").update({ score: parseFloat(score), feedback, content: finalContent, status: 'graded' }).eq("id", sub.id);
                                if (!error) {
                                    playUISound("success");
                                    setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, score: parseFloat(score), feedback, content: finalContent, status: 'graded' } : s));
                                    alert("¡Evaluación enviada con éxito!");
                                } else alert(error.message);
                              }} className="btn-primary" style={{ height: 50, borderRadius: 16, fontWeight: 800, fontSize: "1rem", border: "none", cursor: "pointer", color: "white" }}>{sub.status === 'graded' ? "ACTUALIZAR NOTA" : "ENVIAR EVALUACIÓN"}</button>
                          </div>
                        </div>
                    </div>
                  );
              })}
            </div>
        )}
        </>
      ) : (
        <>
        {/* PANEL ALUMNO: RESUMEN DE PROGRESO */}
        <header style={{ marginBottom: 40, borderBottom: "1px solid var(--glass-border)", paddingBottom: 25 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: "var(--brand-secondary)", margin: 0 }}>Mis Calificaciones</h2>
            <p style={{ opacity: 0.5, marginTop: 5 }}>Resumen detallado de tus entregas y retroalimentación de mentores.</p>
            
            <div style={{ display: "flex", gap: 20, marginTop: 25 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px 25px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.05)", flex: 1 }}>
                  <label style={{ fontSize: "0.65rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, display: "block", marginBottom: 5 }}>PROYECTOS ENVIADOS</label>
                  <span style={{ fontSize: "2rem", fontWeight: 800 }}>{submissions.length}</span>
              </div>
              <div style={{ background: "rgba(16, 185, 129, 0.05)", padding: "20px 25px", borderRadius: 24, border: "1px solid rgba(16, 185, 129, 0.1)", flex: 1 }}>
                  <label style={{ fontSize: "0.65rem", fontWeight: 900, color: "#10b981", letterSpacing: 1.5, display: "block", marginBottom: 5 }}>TU PROMEDIO</label>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981" }}>
                    {submissions.filter(s => s.status === 'graded').length > 0 
                        ? (submissions.reduce((acc, s) => acc + (s.score || 0), 0) / submissions.filter(s => s.status === 'graded').length).toFixed(1)
                        : "—"}
                  </span>
              </div>
            </div>
        </header>

        <div style={{ background: "var(--bg-dark)", border: "1px solid var(--glass-border)", borderRadius: 32, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <th style={{ padding: "25px 30px", fontSize: "0.7rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, textTransform: "uppercase" }}>Módulo & Actividad</th>
                    <th style={{ padding: "25px 30px", fontSize: "0.7rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, textTransform: "uppercase" }}>Estado</th>
                    <th style={{ padding: "25px 30px", fontSize: "0.7rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, textTransform: "uppercase" }}>Puntaje</th>
                    <th style={{ padding: "25px 30px", fontSize: "0.7rem", fontWeight: 900, opacity: 0.4, letterSpacing: 1.5, textTransform: "uppercase" }}>Comentario del Mentor</th>
                  </tr>
              </thead>
              <tbody>
                  {submissions.length === 0 ? (
                    <tr>
                        <td colSpan={4} style={{ padding: 80, textAlign: "center", opacity: 0.3, fontSize: "1.1rem" }}>Aún no has realizado ninguna entrega por calificar.</td>
                    </tr>
                  ) : submissions.map(sub => {
                    const block = blocks.find(b => b.id === sub.block_id);
                    const module = modules.find(m => m.id === block?.screen);
                    return (
                        <tr key={sub.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer", transition: "0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.01)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"} onClick={() => { if(module) { setActiveScreen(module.id); playUISound("click"); } }}>
                          <td style={{ padding: "30px" }}>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem", color: "white" }}>{block?.type === 'delivery' || block?.type === 'file_delivery' ? "Proyecto Final" : "Actividad Interactiva"}</p>
                              <p style={{ margin: "5px 0 0", fontSize: "0.8rem", opacity: 0.4 }}>{module?.title}</p>
                          </td>
                          <td style={{ padding: "30px" }}>
                              <span style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: sub.status === 'graded' ? "#10b981" : "var(--brand-primary)", color: sub.status === 'graded' ? "#10b981" : "var(--brand-primary)", fontSize: "0.6rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>{sub.status === 'graded' ? "REVISADO" : "PENDIENTE"}</span>
                          </td>
                          <td style={{ padding: "30px" }}>
                              <span style={{ fontSize: "1.8rem", fontWeight: 900, color: sub.status === 'graded' ? "white" : "rgba(255,255,255,0.1)" }}>{sub.score || "—"}</span>
                              <span style={{ opacity: 0.3, fontSize: "0.85rem", marginLeft: 6 }}>/100</span>
                          </td>
                          <td style={{ padding: "30px" }}>
                              <p style={{ margin: 0, fontSize: "0.95rem", opacity: 0.7, maxWidth: 350, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontStyle: sub.feedback ? "italic" : "normal" }}>{sub.feedback || "Sin comentarios adicionales."}</p>
                          </td>
                        </tr>
                    );
                  })}
              </tbody>
            </table>
        </div>
        </>
      )}
    </div>
  );
}
