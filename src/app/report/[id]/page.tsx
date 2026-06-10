"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { FileText, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StudentReportPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const studentId = params.id;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    const fetchReport = async () => {
      // Verificamos si hay sesión iniciada
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        // Redirigir a login
        router.push(`/login`);
        return;
      }

      // Obtener el perfil del estudiante
      const { data: studentProfile, error: profileError } = await supabase.from("profiles").select("*").eq("id", studentId).single();
      if (profileError || !studentProfile) {
        setErrorMsg("No se encontró el estudiante o no tienes permiso para ver este reporte.");
        setLoading(false);
        return;
      }

      // Verificamos permisos (solo el mismo estudiante o un admin pueden verlo)
      const currentUser = authData.user;
      const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", currentUser.id).single();
      if (currentUser.id !== studentId && currentProfile?.role !== "admin") {
         setErrorMsg("Privado: Solo el dueño de la cuenta puede acceder a este reporte de notas.");
         setLoading(false);
         return;
      }

      setSelectedProfileStudent(studentProfile);

      // Traer las notas externas y eventualidades
      const { data: externalGrades } = await supabase.from("external_grades").select("*").eq("user_id", studentId).order("created_at", { ascending: false });
      const { data: eventualities } = await supabase.from("novedades").select("*").eq("student_id", studentId).order("created_at", { ascending: false });

      // Traer entregables calificados
      const { data: gradedSubmissions } = await supabase.from("submissions").select("*").eq("student_id", studentId).eq("status", "graded").order("created_at", { ascending: false });
      let submissionsWithBlocks = [];
      if (gradedSubmissions && gradedSubmissions.length > 0) {
        const blockIds = gradedSubmissions.map((s: any) => s.block_id);
        const { data: blocksData } = await supabase.from("blocks").select("id, screen").in("id", blockIds);
        const moduleIds = blocksData ? blocksData.map(b => b.screen) : [];
        const { data: modsData } = await supabase.from("modules").select("id, title").in("id", moduleIds);

        submissionsWithBlocks = gradedSubmissions.map((sub: any) => {
           const block = blocksData?.find(b => b.id === sub.block_id);
           const mod = modsData?.find(m => m.id === block?.screen);
           return {
              ...sub,
              blockTitle: block?.title || "Actividad",
              moduleTitle: mod?.title || "Módulo"
           };
        });
      }


      // Traer las notas CLAN internas
      const { data: userEnrollments } = await supabase.from("enrollments").select("course_id").eq("user_id", studentId);
      if (!userEnrollments || userEnrollments.length === 0) {
        setProfileData({ rows: [], totalAvg: "0.0", maxModules: 0, externalGrades: externalGrades || [], eventualities: eventualities || [], gradedSubmissions: submissionsWithBlocks });
        setLoading(false);
        return;
      }

      const courseIds = userEnrollments.map((e: any) => e.course_id);
      const { data: coursesData } = await supabase.from("courses").select("id, title").in("id", courseIds);
      if (!coursesData) {
        setLoading(false);
        return;
      }

      const { data: modulesData } = await supabase.from("modules").select("id, course_id, title").in("course_id", courseIds).order("created_at", { ascending: true });
      const { data: resultsData } = await supabase.from("module_results").select("module_id, score").eq("user_id", studentId);

      let maxModules = 0;
      const rows = coursesData.map((course: any) => {
        const courseModules = (modulesData || []).filter((m: any) => m.course_id === course.id);
        if (courseModules.length > maxModules) maxModules = courseModules.length;

        const weeks: any = {};
        let totalScore = 0;
        let scoreCount = 0;

        courseModules.forEach((m: any, index: number) => {
          const result = (resultsData || []).find((r: any) => r.module_id === m.id);
          
          let finalScore = null;
          if (result) finalScore = result.score;
          
          // Check if there is a manual submission for this module
          // submissionsWithBlocks is already calculated above and contains blockTitle and moduleTitle, but we need module_id!
          // Luckily, submissionsWithBlocks maps back to the module!
          // Wait, submissionsWithBlocks has `moduleTitle` but we need `module_id` to be safe.
          // Let's find it by looking up blocksData from gradedSubmissions
          const blockIdsForMod = (blocksData || []).filter((b: any) => b.screen === m.id).map((b: any) => b.id);
          const subForMod = (gradedSubmissions || []).find((s: any) => blockIdsForMod.includes(s.block_id));
          if (subForMod && typeof subForMod.score === 'number') {
             finalScore = subForMod.score;
          }

          if (finalScore !== null) {
            weeks[index] = finalScore;
            totalScore += finalScore;
            scoreCount++;
          } else {
            weeks[index] = "Pend";
          }
        });

        const def = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : "0.0";
        return { courseId: course.id, courseTitle: course.title, weeks, def };
      });

      let globalScore = 0;
      let globalCount = 0;
      rows.forEach(r => {
        if (r.def !== "0.0") {
           globalScore += parseFloat(r.def);
           globalCount++;
        }
      });
      const totalAvg = globalCount > 0 ? (globalScore / globalCount).toFixed(1) : "0.0";

      setProfileData({ rows, totalAvg, maxModules, externalGrades: externalGrades || [], eventualities: eventualities || [], gradedSubmissions: submissionsWithBlocks });
      setLoading(false);
    };

    fetchReport();
  }, [studentId, router, supabase]);

  if (loading) {
    return <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg-page)", color: "var(--text-main)" }}>Cargando reporte...</div>;
  }

  if (errorMsg) {
     return <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg-page)", color: "var(--text-main)" }}>{errorMsg}</div>;
  }

  return (
     <div style={{ minHeight: "100vh", background: "var(--bg-page)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ background: "var(--bg-card)", width: "100%", maxWidth: "1000px", borderRadius: "24px", border: "1px solid var(--glass-border)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
            
            {/* 1. Datos del Deportista */}
            <div style={{ padding: "30px 40px", borderBottom: "1px solid var(--glass-border)", background: "linear-gradient(to right, rgba(0,82,255,0.05), transparent)", position: "relative", flexShrink: 0 }}>
               <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <div style={{ width: "70px", height: "70px", borderRadius: "18px", background: "var(--brand-glow)", color: "var(--brand-secondary)", border: "1px solid rgba(0, 82, 255, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.8rem" }}>
                     {selectedProfileStudent.full_name ? selectedProfileStudent.full_name.substring(0,2).toUpperCase() : "ES"}
                  </div>
                  <div>
                     <h2 style={{ margin: "0 0 5px", fontSize: "1.8rem", fontWeight: 900, color: "var(--text-main)" }}>{selectedProfileStudent.full_name}</h2>
                     <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600 }}>Reporte de Progreso del Deportista {selectedProfileStudent.student_code ? `| ID: ${selectedProfileStudent.student_code}` : ""}</p>
                  </div>
               </div>
               <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "20px" }}>
                    {selectedProfileStudent.grade && <span style={{ padding: "6px 14px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 800, color: "var(--text-main)", border: "1px solid rgba(255,255,255,0.1)" }}>Grado: {selectedProfileStudent.grade}</span>}
                    {selectedProfileStudent.sport && <span style={{ padding: "6px 14px", background: "var(--brand-glow)", color: "var(--brand-secondary)", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 800, border: "1px solid rgba(0,82,255,0.2)" }}>{selectedProfileStudent.sport}</span>}
                    {selectedProfileStudent.ally && <span style={{ padding: "6px 14px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 800, color: "var(--text-main)", border: "1px solid rgba(255,255,255,0.1)" }}>Aliado: {selectedProfileStudent.ally}</span>}
                    {selectedProfileStudent.captain && <span style={{ padding: "6px 14px", background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 800, border: "1px solid rgba(245, 158, 11, 0.2)" }}>★ Capitán: {selectedProfileStudent.captain}</span>}
               </div>
            </div>

            <div style={{ padding: "30px 40px", display: "flex", flexDirection: "column", gap: 40, flex: 1 }}>
               {!profileData ? (
                  <div style={{ padding: "50px", textAlign: "center", opacity: 0.5 }}>Cargando información cruzada...</div>
               ) : (
                  <>
                     {/* 2. Notas Materias CLAN */}
                     <div>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-main)", marginBottom: 15, display: "flex", alignItems: "center", gap: 10 }}>
                           <FileText size={20} style={{ color: "var(--brand-secondary)" }}/> Notas Materias CLAN
                        </h3>
                        
                        {profileData.rows && profileData.rows.length > 0 ? (
                           <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
                              {/* Corte 1 */}
                              <div>
                                 <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: 10 }}>Corte 1 (Semanas 1-8)</h4>
                                 <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 16 }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", minWidth: 600 }}>
                                       <thead>
                                          <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                                             <th style={{ padding: "15px", textAlign: "left", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, borderRight: "1px solid var(--glass-border)" }}>MATERIA</th>
                                             {Array.from({ length: 8 }).map((_, i) => (
                                                <th key={i} style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, borderRight: "1px solid var(--glass-border)" }}>W{i + 1}</th>
                                             ))}
                                             <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-main)", letterSpacing: 1 }}>DEF. C1</th>
                                          </tr>
                                       </thead>
                                       <tbody>
                                          {profileData.rows.map((row: any) => {
                                             let sumC1 = 0; let countC1 = 0;
                                             for(let i=0; i<8; i++) {
                                                if (typeof row.weeks[i] === "number") { sumC1 += row.weeks[i]; countC1++; }
                                             }
                                             const defC1 = countC1 > 0 ? (sumC1 / countC1).toFixed(1) : "-";
                                             
                                             return (
                                                <tr key={row.courseId} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                                   <td style={{ padding: "15px", textAlign: "left", fontWeight: 800, fontSize: "0.85rem", borderRight: "1px solid var(--glass-border)", color: "var(--text-main)" }}>{row.courseTitle}</td>
                                                   {Array.from({ length: 8 }).map((_, i) => {
                                                      const val = row.weeks[i] !== undefined ? row.weeks[i] : "—";
                                                      let color = "var(--text-muted)";
                                                      if (typeof val === "number") {
                                                         if (val === 0) color = "#ef4444";
                                                         else if (val >= 80) color = "#10b981";
                                                         else color = "#f59e0b";
                                                      } else if (val === "Pend") {
                                                         color = "var(--brand-primary)";
                                                      }
                                                      return (
                                                         <td key={i} style={{ padding: "15px", fontWeight: 800, fontSize: "0.85rem", borderRight: "1px solid var(--glass-border)", color }}>{val}</td>
                                                      );
                                                   })}
                                                   <td style={{ padding: "15px", fontWeight: 900, color: "var(--brand-secondary)", fontSize: "0.95rem", background: "rgba(255,255,255,0.02)" }}>{defC1}</td>
                                                </tr>
                                             );
                                          })}
                                       </tbody>
                                    </table>
                                 </div>
                              </div>

                              {/* Corte 2 */}
                              <div>
                                 <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: 10 }}>Corte 2 (Semanas 9-16)</h4>
                                 <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 16 }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", minWidth: 600 }}>
                                       <thead>
                                          <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                                             <th style={{ padding: "15px", textAlign: "left", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, borderRight: "1px solid var(--glass-border)" }}>MATERIA</th>
                                             {Array.from({ length: 8 }).map((_, i) => (
                                                <th key={i + 8} style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, borderRight: "1px solid var(--glass-border)" }}>W{i + 9}</th>
                                             ))}
                                             <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-main)", letterSpacing: 1 }}>DEF. C2</th>
                                          </tr>
                                       </thead>
                                       <tbody>
                                          {profileData.rows.map((row: any) => {
                                             let sumC2 = 0; let countC2 = 0;
                                             for(let i=8; i<16; i++) {
                                                if (typeof row.weeks[i] === "number") { sumC2 += row.weeks[i]; countC2++; }
                                             }
                                             const defC2 = countC2 > 0 ? (sumC2 / countC2).toFixed(1) : "-";
                                             
                                             return (
                                                <tr key={row.courseId} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                                   <td style={{ padding: "15px", textAlign: "left", fontWeight: 800, fontSize: "0.85rem", borderRight: "1px solid var(--glass-border)", color: "var(--text-main)" }}>{row.courseTitle}</td>
                                                   {Array.from({ length: 8 }).map((_, i) => {
                                                      const val = row.weeks[i + 8] !== undefined ? row.weeks[i + 8] : "—";
                                                      let color = "var(--text-muted)";
                                                      if (typeof val === "number") {
                                                         if (val === 0) color = "#ef4444";
                                                         else if (val >= 80) color = "#10b981";
                                                         else color = "#f59e0b";
                                                      } else if (val === "Pend") {
                                                         color = "var(--brand-primary)";
                                                      }
                                                      return (
                                                         <td key={i + 8} style={{ padding: "15px", fontWeight: 800, fontSize: "0.85rem", borderRight: "1px solid var(--glass-border)", color }}>{val}</td>
                                                      );
                                                   })}
                                                   <td style={{ padding: "15px", fontWeight: 900, color: "var(--brand-secondary)", fontSize: "0.95rem", background: "rgba(255,255,255,0.02)" }}>{defC2}</td>
                                                </tr>
                                             );
                                          })}
                                       </tbody>
                                    </table>
                                 </div>
                              </div>

                              {/* Promedio General */}
                              <div>
                                 <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: 10 }}>Promedio de Cortes</h4>
                                 <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 16 }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", minWidth: 400 }}>
                                       <thead>
                                          <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                                             <th style={{ padding: "15px", textAlign: "left", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, borderRight: "1px solid var(--glass-border)" }}>MATERIA</th>
                                             <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, borderRight: "1px solid var(--glass-border)" }}>DEF. C1</th>
                                             <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, borderRight: "1px solid var(--glass-border)" }}>DEF. C2</th>
                                             <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-main)", letterSpacing: 1 }}>PROMEDIO FINAL</th>
                                          </tr>
                                       </thead>
                                       <tbody>
                                          {profileData.rows.map((row: any) => {
                                             let sumC1 = 0; let countC1 = 0;
                                             for(let i=0; i<8; i++) { if (typeof row.weeks[i] === "number") { sumC1 += row.weeks[i]; countC1++; } }
                                             const defC1 = countC1 > 0 ? (sumC1 / countC1).toFixed(1) : "-";
                                             
                                             let sumC2 = 0; let countC2 = 0;
                                             for(let i=8; i<16; i++) { if (typeof row.weeks[i] === "number") { sumC2 += row.weeks[i]; countC2++; } }
                                             const defC2 = countC2 > 0 ? (sumC2 / countC2).toFixed(1) : "-";
                                             
                                             let finalDef: string | number = "-";
                                             if (defC1 !== "-" && defC2 !== "-") {
                                                finalDef = ((parseFloat(defC1) + parseFloat(defC2)) / 2).toFixed(1);
                                             } else if (defC1 !== "-") {
                                                finalDef = defC1;
                                             } else if (defC2 !== "-") {
                                                finalDef = defC2;
                                             }

                                             return (
                                                <tr key={row.courseId} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                                   <td style={{ padding: "15px", textAlign: "left", fontWeight: 800, fontSize: "0.85rem", borderRight: "1px solid var(--glass-border)", color: "var(--text-main)" }}>{row.courseTitle}</td>
                                                   <td style={{ padding: "15px", fontWeight: 800, fontSize: "0.85rem", borderRight: "1px solid var(--glass-border)", color: "var(--text-muted)" }}>{defC1}</td>
                                                   <td style={{ padding: "15px", fontWeight: 800, fontSize: "0.85rem", borderRight: "1px solid var(--glass-border)", color: "var(--text-muted)" }}>{defC2}</td>
                                                   <td style={{ padding: "15px", fontWeight: 900, color: "var(--brand-secondary)", fontSize: "1rem", background: "rgba(255,255,255,0.02)" }}>{finalDef}</td>
                                                </tr>
                                             );
                                          })}
                                       </tbody>
                                    </table>
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <div style={{ padding: "20px", textAlign: "center", opacity: 0.5, border: "1px dashed var(--glass-border)", borderRadius: 16 }}>El estudiante no está inscrito en ningún curso interno.</div>
                        )}
                     </div>

                     {/* 3. Comentarios CLAN */}
                     <div>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-main)", marginBottom: 15, display: "flex", alignItems: "center", gap: 10 }}>
                           <FileText size={20} style={{ color: "var(--brand-secondary)" }}/> Comentarios CLAN
                        </h3>
                        <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: 16 }}>
                           <p style={{ margin: 0, color: selectedProfileStudent.clan_comments ? "var(--text-main)" : "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                              {selectedProfileStudent.clan_comments || "No hay comentarios registrados por parte del equipo CLAN."}
                           </p>
                        </div>
                     </div>

                     {/* 4. Notas Aliado (Por Term) */}
                     <div>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-main)", marginBottom: 15, display: "flex", alignItems: "center", gap: 10 }}>
                           <FileText size={20} style={{ color: "var(--brand-secondary)" }}/> Notas Aliado
                        </h3>
                        
                        {profileData.externalGrades && profileData.externalGrades.length > 0 ? (
                           <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
                              {Array.from(new Set(profileData.externalGrades.map((g: any) => g.term))).sort().map(term => {
                                 const termGrades = profileData.externalGrades.filter((g: any) => g.term === term);
                                 return (
                                    <div key={term as string}>
                                       <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: 10 }}>Term: {term as string}</h4>
                                       <div style={{ overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: 16 }}>
                                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", minWidth: 600 }}>
                                             <thead>
                                                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--glass-border)" }}>
                                                   <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, textAlign: "left", borderRight: "1px solid var(--glass-border)" }}>MATERIA</th>
                                                   <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, borderRight: "1px solid var(--glass-border)" }}>W1-W12 (PROMEDIO)</th>
                                                   <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-main)", letterSpacing: 1, borderRight: "1px solid var(--glass-border)" }}>DEFINITIVA</th>
                                                   <th style={{ padding: "15px", fontWeight: 900, fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: 1, textAlign: "left" }}>COMENTARIOS MATERIA</th>
                                                </tr>
                                             </thead>
                                             <tbody>
                                                {termGrades.map((grade: any) => {
                                                   let colorDef = "var(--text-muted)";
                                                   if (grade.definitiva !== null) {
                                                      if (grade.definitiva < 60) colorDef = "#ef4444";
                                                      else if (grade.definitiva >= 80) colorDef = "#10b981";
                                                      else colorDef = "#f59e0b";
                                                   }
                                                   const weeks = [grade.w1, grade.w2, grade.w3, grade.w4, grade.w5, grade.w6, grade.w7, grade.w8, grade.w9, grade.w10, grade.w11, grade.w12];
                                                   const validWeeks = weeks.filter(w => w !== null && w !== undefined).length;
                                                   
                                                   return (
                                                      <tr key={grade.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                                         <td style={{ padding: "15px", textAlign: "left", fontWeight: 800, fontSize: "0.85rem", color: "var(--text-main)", borderRight: "1px solid var(--glass-border)" }}>{grade.subject_code}</td>
                                                         <td style={{ padding: "15px", fontWeight: 800, fontSize: "0.85rem", color: "var(--text-muted)", borderRight: "1px solid var(--glass-border)" }}>{validWeeks} semanas registradas</td>
                                                         <td style={{ padding: "15px", fontWeight: 900, color: colorDef, fontSize: "1rem", borderRight: "1px solid var(--glass-border)", background: "rgba(255,255,255,0.02)" }}>{grade.definitiva ?? "-"} {grade.recovery ? `(Rec: ${grade.recovery})` : ""}</td>
                                                         <td style={{ padding: "15px", textAlign: "left", fontSize: "0.85rem", color: "var(--text-muted)" }}>{grade.comments || "-"}</td>
                                                      </tr>
                                                   );
                                                })}
                                             </tbody>
                                          </table>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        ) : (
                           <div style={{ padding: "20px", textAlign: "center", opacity: 0.5, border: "1px dashed var(--glass-border)", borderRadius: 16 }}>No hay calificaciones externas registradas.</div>
                        )}
                     </div>

                     {/* 5. Comentarios Aliado */}
                     <div>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-main)", marginBottom: 15, display: "flex", alignItems: "center", gap: 10 }}>
                           <FileText size={20} style={{ color: "var(--brand-secondary)" }}/> Comentarios Aliado
                        </h3>
                        <div style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: 16 }}>
                           <p style={{ margin: 0, color: selectedProfileStudent.ally_comments ? "var(--text-main)" : "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                              {selectedProfileStudent.ally_comments || "No hay comentarios generales registrados por parte del aliado."}
                           </p>
                        </div>
                     </div>

                     {/* 6. Eventualidades */}
                     <div>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-main)", marginBottom: 15, display: "flex", alignItems: "center", gap: 10 }}>
                           <AlertTriangle size={20} style={{ color: "var(--brand-secondary)" }}/> Eventualidades
                        </h3>
                        {profileData.eventualities && profileData.eventualities.length > 0 ? (
                           <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                              {profileData.eventualities.map((nov: any) => (
                                 <div key={nov.id} style={{ padding: "20px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)", borderRadius: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                       <div>
                                          <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--brand-secondary)", background: "var(--brand-glow)", padding: "4px 8px", borderRadius: 6 }}>{nov.type}</span>
                                          <div style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 700 }}>
                                             {new Date(nov.start_date).toLocaleDateString()} a {new Date(nov.end_date).toLocaleDateString()}
                                          </div>
                                       </div>
                                       <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "4px 10px", borderRadius: "20px", border: `1px solid ${nov.status === 'reviewed' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`, color: nov.status === 'reviewed' ? '#10b981' : '#f59e0b', background: nov.status === 'reviewed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }}>
                                          {nov.status === 'reviewed' ? 'Revisado' : 'Pendiente'}
                                       </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                                       {nov.observations}
                                    </p>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div style={{ padding: "20px", textAlign: "center", opacity: 0.5, border: "1px dashed var(--glass-border)", borderRadius: 16 }}>No hay eventualidades reportadas para este estudiante.</div>
                        )}
                     </div>

                     {/* 7. Entregables Calificados */}
                     <div>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-main)", marginBottom: 15, display: "flex", alignItems: "center", gap: 10 }}>
                           <FileText size={20} style={{ color: "var(--brand-secondary)" }}/> Entregables y Actividades Calificadas
                        </h3>
                        {profileData.gradedSubmissions && profileData.gradedSubmissions.length > 0 ? (
                           <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                              {profileData.gradedSubmissions.map((sub: any) => (
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
                        ) : (
                           <div style={{ padding: "20px", textAlign: "center", opacity: 0.5, border: "1px dashed var(--glass-border)", borderRadius: 16 }}>No hay entregables calificados para este estudiante.</div>
                        )}
                     </div>
                  </>
               )}
            </div>
        </div>
     </div>
  );
}
