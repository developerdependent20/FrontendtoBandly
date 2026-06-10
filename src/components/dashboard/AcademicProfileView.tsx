"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { User, Shield, AlertTriangle, ChevronDown, ChevronUp, BookOpen, Clock, CheckCircle2, Award, FileText } from "lucide-react";

export const AcademicProfileView = ({ profile }: { profile: any }) => {
  const [grades, setGrades] = useState<any[]>([]);
  const [calvertGrades, setCalvertGrades] = useState<any[]>([]);
  const [novedades, setNovedades] = useState<any[]>([]);
  const [gradedSubmissions, setGradedSubmissions] = useState<any[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<{ subject: string; week: number; grade: any; feedback: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({ clan: true, ally: true, novedades: true });
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;
      setLoading(true);

      const isCalvert = profile.ally?.toLowerCase().includes("calvert");

      const [gradesRes, novedadesRes, calvertRes, submissionsRes, enrollmentsRes] = await Promise.all([
        supabase.from("external_grades").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }),
        supabase.from("novedades").select("*").eq("student_id", profile.id).order("created_at", { ascending: false }),
        isCalvert ? supabase.from("calvert_grades").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
        supabase.from("submissions").select("*").eq("student_id", profile.id).eq("status", "graded").order("created_at", { ascending: false }),
        supabase.from("enrollments").select("course_id").eq("user_id", profile.id)
      ]);

      let finalGrades = gradesRes.data || [];
      if (novedadesRes.data) setNovedades(novedadesRes.data);
      if (calvertRes.data) setCalvertGrades(calvertRes.data);
      
      let blocksData: any[] = [];
      let modsData: any[] = [];
      
      if (submissionsRes.data && submissionsRes.data.length > 0) {
        const blockIds = submissionsRes.data.map((s: any) => s.block_id);
        const { data: bd } = await supabase.from("blocks").select("id, screen").in("id", blockIds);
        blocksData = bd || [];
        const moduleIds = blocksData.map(b => b.screen);
        const { data: md } = await supabase.from("modules").select("id, title, course_id").in("id", moduleIds);
        modsData = md || [];

        const withBlocks = submissionsRes.data.map((sub: any) => {
           const block = blocksData?.find(b => b.id === sub.block_id);
           const mod = modsData?.find(m => m.id === block?.screen);
           return {
              ...sub,
              blockTitle: block?.title || "Actividad",
              moduleTitle: mod?.title || "Módulo"
           };
        });
        setGradedSubmissions(withBlocks);
      }

      let courseIds: string[] = [];
      if (enrollmentsRes.data) {
        courseIds = [...courseIds, ...enrollmentsRes.data.map((e: any) => e.course_id)];
      }
      if (modsData) {
        courseIds = [...courseIds, ...modsData.map((m: any) => m.course_id)];
      }
      courseIds = Array.from(new Set(courseIds)).filter(Boolean);

      if (courseIds.length > 0) {
        const { data: coursesData } = await supabase.from("courses").select("id, title").in("id", courseIds);
        const { data: allModsData } = await supabase.from("modules").select("id, course_id, title").in("course_id", courseIds).order("created_at", { ascending: true });
        const { data: resultsData } = await supabase.from("module_results").select("module_id, score").eq("user_id", profile.id);

        if (coursesData && allModsData) {
          const internalRows = coursesData.map(course => {
            const courseModules = allModsData.filter(m => m.course_id === course.id);
            let sum = 0;
            let count = 0;
            const row: any = {
              id: "internal-" + course.id,
              subject_code: course.title,
              source: "Plataforma",
              term: "CURSOS CLAN",
              comments: "Curso Interactivo de Plataforma",
              recovery: "-"
            };

            for (let i = 0; i < 8; i++) {
              if (i < courseModules.length) {
                const mod = courseModules[i];
                const automaticResult = resultsData?.find(r => r.module_id === mod.id);
                const blockIdsForMod = blocksData.filter(b => b.screen === mod.id).map(b => b.id);
                const subForMod = submissionsRes.data?.find(s => blockIdsForMod.includes(s.block_id));

                let finalScore = null;
                if (automaticResult) finalScore = automaticResult.score;
                if (subForMod && typeof subForMod.score === 'number') {
                   finalScore = subForMod.score;
                   if (subForMod.feedback) row[`feedback_w${i + 1}`] = subForMod.feedback;
                }

                row[`w${i + 1}`] = finalScore !== null ? finalScore : "Pend";
                if (finalScore !== null) {
                  sum += finalScore;
                  count++;
                }
              } else {
                row[`w${i + 1}`] = "-";
              }
            }
            row.definitiva = count > 0 ? (sum / count).toFixed(1) : "-";
            return row;
          });
          finalGrades = [...finalGrades, ...internalRows];
        }
      }

      setGrades(finalGrades);
      setLoading(false);
    };

    fetchData();
  }, [profile]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getColorForGrade = (val: any) => {
    if (val === null || val === undefined || val === "") return "transparent";
    const num = parseFloat(val);
    if (isNaN(num)) return "transparent";
    if (num < 3.0) return "rgba(239, 68, 68, 0.15)";
    if (num >= 4.5) return "rgba(16, 185, 129, 0.15)";
    return "transparent";
  };

  // Group grades
  const clanGrades = grades.filter(g => g.source === "Plataforma");
  const allyGrades = grades.filter(g => g.source !== "Plataforma");

  const clanByTerm = clanGrades.reduce((acc, curr) => {
    const t = curr.term || "General";
    if (!acc[t]) acc[t] = [];
    acc[t].push(curr);
    return acc;
  }, {} as any);

  const allyByTerm = allyGrades.reduce((acc, curr) => {
    const t = curr.term || "General";
    if (!acc[t]) acc[t] = [];
    acc[t].push(curr);
    return acc;
  }, {} as any);

  const renderClanTables = () => {
    if (Object.keys(clanByTerm).length === 0) return <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>No hay calificaciones de CLAN registradas.</p>;

    return Object.keys(clanByTerm).map(term => (
      <div key={term} style={{ marginBottom: "30px" }}>
        <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--brand-secondary)", marginBottom: "15px", textTransform: "uppercase", letterSpacing: "1px" }}>{term}</h4>
        <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: "12px", background: "rgba(0,0,0,0.2)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px", fontSize: "0.85rem" }}>
            <thead style={{ background: "rgba(0, 82, 255, 0.05)", borderBottom: "1px solid var(--glass-border)" }}>
              <tr>
                <th style={{ padding: "15px", textAlign: "left", color: "var(--text-muted)" }}>Materia</th>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(w => (
                  <th key={w} style={{ padding: "15px 8px", textAlign: "center", color: "var(--text-muted)", width: "50px" }}>W{w}</th>
                ))}
                <th style={{ padding: "15px", textAlign: "center", color: "var(--brand-secondary)" }}>Definitiva</th>
                <th style={{ padding: "15px", textAlign: "left", color: "var(--text-muted)" }}>Comentarios</th>
                <th style={{ padding: "15px", textAlign: "center", color: "var(--text-muted)" }}>Recup.</th>
              </tr>
            </thead>
            <tbody>
              {clanByTerm[term].map((row: any) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={{ padding: "15px", fontWeight: 700, color: "var(--text-main)" }}>{row.subject_code}</td>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(w => (
                    <td key={w} style={{ padding: "15px 8px", textAlign: "center", background: getColorForGrade(row[`w${w}`]) }}>
                      {row[`feedback_w${w}`] ? (
                        <div 
                          onClick={() => setSelectedFeedback({ subject: row.subject_code, week: w, grade: row[`w${w}`], feedback: row[`feedback_w${w}`] })}
                          style={{ cursor: "pointer", display: "inline-block", borderBottom: "2px dotted var(--brand-secondary)", color: "var(--brand-secondary)", fontWeight: 900, transition: "0.2s" }}
                          title="Ver retroalimentación del mentor"
                        >
                          {row[`w${w}`] !== null ? row[`w${w}`] : "-"}
                        </div>
                      ) : (
                        <span style={{ fontWeight: 700 }}>{row[`w${w}`] !== null ? row[`w${w}`] : "-"}</span>
                      )}
                    </td>
                  ))}
                  <td style={{ padding: "15px", textAlign: "center", fontWeight: 800, color: "var(--text-main)", background: getColorForGrade(row.definitiva) }}>
                    {row.definitiva !== null ? row.definitiva : "-"}
                  </td>
                  <td style={{ padding: "15px", opacity: 0.8, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.comments || "-"}</td>
                  <td style={{ padding: "15px", textAlign: "center", fontWeight: 700, color: row.recovery ? "#f59e0b" : "inherit" }}>{row.recovery || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ));
  };

  const renderAllyTables = () => {
    if (!profile.ally) return <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>No tienes un aliado configurado en tu perfil.</p>;

    const allyName = profile.ally.toLowerCase();
    
    if (allyName.includes("calvert")) {
      if (calvertGrades.length === 0) return <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>No hay calificaciones de Calvert registradas.</p>;
      
      return (
        <div style={{ marginBottom: "30px" }}>
          <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "#34d399", marginBottom: "15px", textTransform: "uppercase", letterSpacing: "1px" }}>Snapshot Actual</h4>
          <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: "12px", background: "rgba(0,0,0,0.2)" }}>

            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px", fontSize: "0.85rem" }}>
              <thead style={{ background: "rgba(52, 211, 153, 0.05)", borderBottom: "1px solid var(--glass-border)" }}>
                <tr>
                  <th style={{ padding: "15px", textAlign: "left", color: "var(--text-muted)" }}>Materia</th>
                  <th style={{ padding: "15px", textAlign: "center", color: "var(--text-muted)" }}>% de avance</th>
                  <th style={{ padding: "15px", textAlign: "center", color: "#34d399" }}>Nota Actual</th>
                  <th style={{ padding: "15px", textAlign: "center", color: "var(--text-muted)" }}>Fecha de Cierre</th>
                  <th style={{ padding: "15px", textAlign: "left", color: "var(--text-muted)" }}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {calvertGrades.map((row: any) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "15px", fontWeight: 700, color: "var(--text-main)" }}>{row.subject_code}</td>
                    <td style={{ padding: "15px", textAlign: "center" }}>{row.progress_percentage !== null ? `${row.progress_percentage}%` : "-"}</td>
                    <td style={{ padding: "15px", textAlign: "center", fontWeight: 800, background: getColorForGrade(row.current_grade) }}>{row.current_grade !== null ? row.current_grade : "-"}</td>
                    <td style={{ padding: "15px", textAlign: "center" }}>{row.close_date || "-"}</td>
                    <td style={{ padding: "15px", opacity: 0.8 }}>{row.comments || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (Object.keys(allyByTerm).length === 0) return <p style={{ opacity: 0.5, fontSize: "0.9rem" }}>No hay calificaciones de Aliado registradas.</p>;

    const isTrikele = allyName.includes("trikele");
    const numWeeks = isTrikele ? 8 : 12; // TyT, NWDA, etc son 12 semanas
    const themeColor = isTrikele ? "#a855f7" : "#3b82f6";

    return Object.keys(allyByTerm).map(term => (
      <div key={term} style={{ marginBottom: "30px" }}>
        <h4 style={{ fontSize: "1rem", fontWeight: 800, color: themeColor, marginBottom: "15px", textTransform: "uppercase", letterSpacing: "1px" }}>{term}</h4>
        <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: "12px", background: "rgba(0,0,0,0.2)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px", fontSize: "0.85rem" }}>
            <thead style={{ background: `rgba(${isTrikele ? '168, 85, 247' : '59, 130, 246'}, 0.05)`, borderBottom: "1px solid var(--glass-border)" }}>
              <tr>
                <th style={{ padding: "15px", textAlign: "left", color: "var(--text-muted)" }}>Materia</th>
                {Array.from({length: numWeeks}, (_, i) => i + 1).map(w => (
                  <th key={w} style={{ padding: "15px 8px", textAlign: "center", color: "var(--text-muted)", width: "45px" }}>W{w}</th>
                ))}
                <th style={{ padding: "15px", textAlign: "center", color: themeColor }}>Definitiva</th>
                <th style={{ padding: "15px", textAlign: "left", color: "var(--text-muted)" }}>Comentarios</th>
                <th style={{ padding: "15px", textAlign: "center", color: "var(--text-muted)" }}>Recup.</th>
              </tr>
            </thead>
            <tbody>
              {allyByTerm[term].map((row: any) => (
                <tr key={row.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <td style={{ padding: "15px", fontWeight: 700, color: "var(--text-main)" }}>{row.subject_code}</td>
                  {Array.from({length: numWeeks}, (_, i) => i + 1).map(w => (
                    <td key={w} style={{ padding: "15px 8px", textAlign: "center", background: getColorForGrade(row[`w${w}`]) }}>
                      {row[`w${w}`] !== null ? row[`w${w}`] : "-"}
                    </td>
                  ))}
                  <td style={{ padding: "15px", textAlign: "center", fontWeight: 800, color: "var(--text-main)", background: getColorForGrade(row.definitiva) }}>
                    {row.definitiva !== null ? row.definitiva : "-"}
                  </td>
                  <td style={{ padding: "15px", opacity: 0.8, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.comments || "-"}</td>
                  <td style={{ padding: "15px", textAlign: "center", fontWeight: 700, color: row.recovery ? "#f59e0b" : "inherit" }}>{row.recovery || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ));
  };

  if (loading) return <div style={{ padding: "60px", textAlign: "center", opacity: 0.5 }}>Cargando tu expediente...</div>;

  return (
    <div className="admin-view active" style={{ padding: "0 0 60px 0", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header Expediente */}
      <div className="stat-card" style={{ padding: "40px", marginBottom: "30px", border: "1px solid var(--glass-border)", borderRadius: "24px", display: "flex", gap: "30px", alignItems: "center", position: "relative", overflow: "hidden" }}>
         <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: "var(--brand-primary)", filter: "blur(80px)", opacity: 0.2, borderRadius: "50%" }}></div>
         
         <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "var(--bg-dark)", border: "2px solid var(--brand-secondary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, zIndex: 1 }}>
            {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
               <User size={40} color="var(--text-muted)" />
            )}
         </div>

         <div style={{ flex: 1, zIndex: 1 }}>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--text-main)", margin: "0 0 5px 0" }}>{profile?.full_name || "Estudiante"}</h2>
            <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap", marginTop: "10px" }}>
               {profile?.student_code && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, border: "1px solid rgba(255,255,255,0.1)" }}>
                    <Shield size={14} style={{ color: "var(--brand-secondary)" }}/> ID: {profile.student_code}
                  </span>
               )}
               {profile?.ally && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, border: "1px solid rgba(255,255,255,0.1)" }}>
                    <BookOpen size={14} style={{ color: "var(--brand-primary)" }}/> Aliado: {profile.ally}
                  </span>
               )}
               <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(254, 220, 61, 0.1)", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 800, color: "var(--yellow-primary)", border: "1px solid rgba(254, 220, 61, 0.2)" }}>
                 <Award size={14} /> {profile?.ev_points || 0} ClanCoins
               </span>
            </div>
         </div>
      </div>

      {/* Accordion: Notas Plataforma */}
      <div className="stat-card" style={{ padding: "0", marginBottom: "20px", borderRadius: "16px", border: "1px solid var(--glass-border)", overflow: "hidden" }}>
         <button onClick={() => toggleSection("clan")} style={{ width: "100%", padding: "20px 30px", background: "var(--bg-card)", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
               <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(0, 82, 255, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-secondary)" }}>
                  <Shield size={20} />
               </div>
               <div style={{ textAlign: "left" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>Calificaciones CLAN</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Tus notas de los cursos de la plataforma (Cortes de 8 Semanas)</p>
               </div>
            </div>
            {expandedSections["clan"] ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
         </button>
         
         {expandedSections["clan"] && (
            <div style={{ padding: "30px", borderTop: "1px solid var(--glass-border)" }}>
               {renderClanTables()}
            </div>
         )}
      </div>

      {/* Accordion: Notas Aliado */}
      {profile?.ally && (
        <div className="stat-card" style={{ padding: "0", marginBottom: "20px", borderRadius: "16px", border: "1px solid var(--glass-border)", overflow: "hidden" }}>
           <button onClick={() => toggleSection("ally")} style={{ width: "100%", padding: "20px 30px", background: "var(--bg-card)", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                 <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(168, 85, 247, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a855f7" }}>
                    <BookOpen size={20} />
                 </div>
                 <div style={{ textAlign: "left" }}>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>Calificaciones {profile.ally}</h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Tus notas del colegio aliado</p>
                 </div>
              </div>
              {expandedSections["ally"] ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
           </button>
           
           {expandedSections["ally"] && (
              <div style={{ padding: "30px", borderTop: "1px solid var(--glass-border)" }}>
                 {renderAllyTables()}
              </div>
           )}
        </div>
      )}

      {/* Accordion: Novedades */}
      <div className="stat-card" style={{ padding: "0", marginBottom: "20px", borderRadius: "16px", border: "1px solid var(--glass-border)", overflow: "hidden" }}>
         <button onClick={() => toggleSection("novedades")} style={{ width: "100%", padding: "20px 30px", background: "var(--bg-card)", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
               <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(245, 158, 11, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f59e0b" }}>
                  <AlertTriangle size={20} />
               </div>
               <div style={{ textAlign: "left" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>Historial de Eventualidades</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Tus reportes y permisos generados</p>
               </div>
            </div>
            {expandedSections["novedades"] ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
         </button>
         
         {expandedSections["novedades"] && (
            <div style={{ padding: "0", borderTop: "1px solid var(--glass-border)" }}>
               {novedades.length === 0 ? (
                  <p style={{ padding: "30px", opacity: 0.5, fontSize: "0.9rem", margin: 0 }}>No tienes eventualidades reportadas.</p>
               ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                        <th style={{ padding: "15px 30px", color: "var(--text-muted)", fontWeight: 800 }}>Tipo</th>
                        <th style={{ padding: "15px 30px", color: "var(--text-muted)", fontWeight: 800 }}>Fechas</th>
                        <th style={{ padding: "15px 30px", color: "var(--text-muted)", fontWeight: 800 }}>Estado</th>
                        <th style={{ padding: "15px 30px", color: "var(--text-muted)", fontWeight: 800 }}>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {novedades.map(nov => (
                         <tr key={nov.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                            <td style={{ padding: "15px 30px", fontWeight: 800, color: "var(--text-main)" }}>{nov.type}</td>
                            <td style={{ padding: "15px 30px", color: "var(--text-muted)" }}>{nov.start_date} a {nov.end_date}</td>
                            <td style={{ padding: "15px 30px" }}>
                               <span style={{ 
                                 display: "inline-flex", alignItems: "center", gap: 6,
                                 padding: "4px 10px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase",
                                 background: nov.status === 'reviewed' ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                 color: nov.status === 'reviewed' ? "#10b981" : "#f59e0b",
                               }}>
                                 {nov.status === 'reviewed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                 {nov.status === 'reviewed' ? "Revisado" : "Pendiente"}
                               </span>
                            </td>
                            <td style={{ padding: "15px 30px", color: "var(--text-muted)", maxWidth: 250, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                               <div style={{ display: "flex", gap: 6, alignItems: "center" }}><FileText size={14}/> {nov.observations}</div>
                            </td>
                         </tr>
                      ))}
                    </tbody>
                  </table>
               )}
            </div>
         )}
      </div>

      {/* Accordion: Entregables Calificados */}
      <div className="stat-card" style={{ padding: "0", marginBottom: "20px", borderRadius: "16px", border: "1px solid var(--glass-border)", overflow: "hidden" }}>
         <button onClick={() => toggleSection("submissions")} style={{ width: "100%", padding: "20px 30px", background: "var(--bg-card)", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
               <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(16, 185, 129, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                  <FileText size={20} />
               </div>
               <div style={{ textAlign: "left" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>Entregables y Actividades Calificadas</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>Tus entregas evaluadas por los mentores</p>
               </div>
            </div>
            {expandedSections["submissions"] ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
         </button>
         
         {expandedSections["submissions"] && (
            <div style={{ padding: "30px", borderTop: "1px solid var(--glass-border)" }}>
               {gradedSubmissions.length === 0 ? (
                  <p style={{ opacity: 0.5, fontSize: "0.9rem", textAlign: "center", margin: 0 }}>No hay entregables calificados registrados.</p>
               ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                     {gradedSubmissions.map((sub: any) => (
                        <div key={sub.id} style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                 <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--brand-secondary)", background: "var(--brand-glow)", padding: "4px 8px", borderRadius: 6 }}>{sub.moduleTitle}</span>
                                 <div style={{ marginTop: 8, fontSize: "0.95rem", color: "var(--text-main)", fontWeight: 700 }}>
                                    {sub.blockTitle}
                                 </div>
                                 {sub.file_name && (
                                   <div style={{ marginTop: 4, fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                     Archivo entregado: {sub.file_name}
                                   </div>
                                 )}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                                 <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "4px 12px", borderRadius: "8px" }}>
                                    {sub.score}/100
                                 </span>
                              </div>
                           </div>
                           <div style={{ padding: "12px 15px", background: "rgba(0,0,0,0.2)", borderRadius: 8, borderLeft: "3px solid var(--brand-secondary)" }}>
                              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                 "{sub.feedback || "Revisado satisfactoriamente."}"
                              </p>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         )}
      </div>

      {/* MODAL DE RETROALIMENTACIÓN */}
      {selectedFeedback && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "var(--bg-dark)", border: "1px solid var(--brand-secondary)", borderRadius: "24px", padding: "40px", maxWidth: "500px", width: "100%", position: "relative", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <button 
              onClick={() => setSelectedFeedback(null)}
              style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}
            >
              ✕
            </button>
            <h3 style={{ margin: "0 0 5px", fontSize: "1.5rem", color: "white", fontWeight: 800 }}>Retroalimentación</h3>
            <p style={{ margin: "0 0 20px", fontSize: "0.9rem", color: "var(--brand-secondary)", fontWeight: 700 }}>{selectedFeedback.subject} - W{selectedFeedback.week}</p>
            
            <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 25, padding: "15px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "16px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
               <div style={{ fontSize: "2rem", fontWeight: 900, color: "#10b981" }}>{selectedFeedback.grade}</div>
               <div style={{ fontSize: "0.85rem", opacity: 0.6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Calificación Asignada</div>
            </div>

            <div style={{ background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "16px", borderLeft: "4px solid var(--brand-secondary)" }}>
               <p style={{ margin: 0, fontSize: "1rem", lineHeight: 1.6, color: "rgba(255,255,255,0.9)", fontStyle: "italic" }}>"{selectedFeedback.feedback}"</p>
            </div>
            
            <button onClick={() => setSelectedFeedback(null)} className="btn-primary" style={{ width: "100%", marginTop: 30, padding: 15, borderRadius: 12, border: "none", background: "var(--brand-primary)", color: "black", fontWeight: 800, fontSize: "1rem", cursor: "pointer" }}>Entendido</button>
          </div>
        </div>
      )}

    </div>
  );
}
