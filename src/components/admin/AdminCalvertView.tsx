"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Trash2, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, X, Search } from "lucide-react";
import * as XLSX from "xlsx";

interface CalvertGrade {
  id: string;
  user_id: string;
  student_code: string;
  subject_code: string;
  progress_percentage: number | null;
  current_grade: number | null;
  close_date: string;
  comments: string;
}

export const AdminCalvertView = () => {
  const [grades, setGrades] = useState<CalvertGrade[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWiping, setIsWiping] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wipeStatus, setWipeStatus] = useState<{type: "idle" | "loading" | "success" | "error", message?: string}>({type: "idle"});
  
  // Import states
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{text: string, ok: boolean} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const { data: studentsData } = await supabase
      .from("profiles").select("id, full_name, ally, student_code").eq("role", "estudiante");
    if (studentsData) setStudents(studentsData);

    const { data: gradesData } = await supabase
      .from("calvert_grades").select("*").order("created_at", { ascending: false });
    if (gradesData) setGrades(gradesData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleWipeData = () => {
    setShowWipeConfirm(true);
    setWipeStatus({type: "idle"});
  };

  const executeWipeData = async () => {
    setWipeStatus({type: "loading"});
    const { error } = await supabase.from("calvert_grades").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
    
    if (error) {
      setWipeStatus({type: "error", message: error.message});
    } else {
      setWipeStatus({type: "success", message: "Base de datos limpiada exitosamente."});
      setGrades([]);
      setTimeout(() => {
        setShowWipeConfirm(false);
        setWipeStatus({type: "idle"});
      }, 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcelFile(file);
    e.target.value = "";
  };

  const normalizeHeader = (h: string) => h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const COL_MAP: Record<string, string> = {
    "studentcode": "student_code",
    "codigo": "student_code",
    "estudiante": "student_code",
    "materia": "subject_code",
    "subject": "subject_code",
    "deavance": "progress_percentage",
    "avance": "progress_percentage",
    "progress": "progress_percentage",
    "notaactual": "current_grade",
    "definitiva": "current_grade",
    "grade": "current_grade",
    "fechadecierre": "close_date",
    "cierre": "close_date",
    "date": "close_date",
    "observaciones": "comments",
    "comments": "comments",
    "comentarios": "comments"
  };

  const parseNum = (val: any) => {
    if (val === "" || val === null || val === undefined) return null;
    const num = parseFloat(String(val).replace(",", "."));
    return isNaN(num) ? null : num;
  };

  const parseExcelFile = (file: File) => {
    setImportMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (rows.length < 2) {
          setImportMsg({ text: "El archivo no tiene datos suficientes.", ok: false });
          return;
        }

        const rawHeaders: string[] = rows[0].map((h: any) => String(h));
        const headerMap: Record<number, string> = {};
        rawHeaders.forEach((h, i) => {
          const normalized = normalizeHeader(h);
          if (COL_MAP[normalized]) headerMap[i] = COL_MAP[normalized];
        });

        const preview: any[] = [];

        rows.slice(1).forEach((row) => {
          if (row.every((c: any) => c === "" || c === null || c === undefined)) return;

          const obj: any = {
            subject_code: "", student_code: "",
            progress_percentage: null, current_grade: null, close_date: "", comments: ""
          };

          Object.entries(headerMap).forEach(([idxStr, field]) => {
            const val = row[parseInt(idxStr)];
            if (["progress_percentage", "current_grade"].includes(field)) {
              obj[field] = parseNum(val);
            } else {
              obj[field] = String(val).trim();
            }
          });

          if (!obj.student_code && !obj.subject_code) return; // Skip empty structural rows

          const matchedUser = students.find(s => 
            s.student_code?.toLowerCase() === obj.student_code?.toLowerCase()
          );

          preview.push({
            ...obj,
            matched_user_id: matchedUser?.id || null,
            student_name: matchedUser?.full_name || "Desconocido",
            match_status: matchedUser ? "matched" : "unmatched"
          });
        });

        setImportPreview(preview);
        setShowImport(true);
      } catch (err) {
        setImportMsg({ text: "Error procesando el archivo Excel.", ok: false });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    setImportMsg(null);

    const toInsert = importPreview
      .filter(r => r.match_status === "matched" && r.matched_user_id)
      .map(({ student_name, match_status, matched_user_id, ...rest }) => ({
        ...rest,
        user_id: matched_user_id,
      }));

    if (toInsert.length === 0) {
      setImportMsg({ text: "No hay filas vinculadas a estudiantes para importar.", ok: false });
      setImporting(false);
      return;
    }

    const { error } = await supabase.from("calvert_grades").insert(toInsert);
    if (error) {
      setImportMsg({ text: "Error al guardar: " + error.message, ok: false });
    } else {
      setImportMsg({ text: `✓ ${toInsert.length} filas importadas exitosamente.`, ok: true });
      await fetchData();
      setTimeout(() => {
        setShowImport(false);
        setImportPreview([]);
        setImportMsg(null);
      }, 2000);
    }
    setImporting(false);
  };

  const filteredGrades = grades.filter(g => 
    g.subject_code?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.student_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{ padding: "60px", textAlign: "center", opacity: 0.5 }}>Cargando base Calvert...</div>;

  return (
    <div className="admin-view active">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h2 style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-main)", marginBottom: "5px" }}>Calificaciones <span style={{ color: "#34d399" }}>Calvert</span></h2>
          <p style={{ color: "var(--text-muted)" }}>Sincronización semanal (Snapshot) de datos de Calvert.</p>
        </div>
        <div style={{ display: "flex", gap: "15px" }}>
          <button 
            onClick={handleWipeData}
            disabled={isWiping}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#ef4444", borderRadius: "12px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", transition: "0.2s" }}
            className="hover-glow"
          >
            <Trash2 size={18} /> {isWiping ? "Borrando..." : "Limpiar Base Actual"}
          </button>
          
          <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", background: "rgba(52, 211, 153, 0.1)", border: "1px solid #34d399", color: "#34d399", borderRadius: "12px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}
            className="hover-glow"
          >
            <Upload size={18} /> Subir Nuevo Excel
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
          <input 
            type="text" 
            placeholder="Buscar por código de estudiante o materia..." 
            className="input-focus-ring" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ 
              padding: "12px 20px", 
              borderRadius: "12px", 
              border: "1px solid var(--glass-border)", 
              background: "var(--bg-card)", 
              color: "var(--text-main)", 
              width: "100%", 
              maxWidth: "350px", 
              fontWeight: 500,
              outline: "none"
            }} 
          />
      </div>

      {showImport && (
         <div style={{ background: "rgba(0,0,0,0.3)", border: "1px dashed #34d399", borderRadius: "16px", padding: "30px", marginBottom: "30px", animation: "slideDown 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
               <div>
                  <h3 style={{ margin: "0 0 5px 0", color: "#34d399", display: "flex", alignItems: "center", gap: 8 }}><FileSpreadsheet size={20}/> Vista Previa de Importación Calvert</h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>Verifica que las columnas se hayan reconocido correctamente.</p>
               </div>
               <button onClick={() => { setShowImport(false); setImportPreview([]); }} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  <X size={20} />
               </button>
            </div>

            <div style={{ overflow: "auto", maxHeight: "300px", border: "1px solid var(--glass-border)", borderRadius: "12px" }}>
               <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                  <thead style={{ background: "var(--bg-card)", position: "sticky", top: 0 }}>
                     <tr>
                        <th style={{ padding: "10px", color: "var(--text-muted)" }}>Estudiante</th>
                        <th style={{ padding: "10px", color: "var(--text-muted)" }}>Materia</th>
                        <th style={{ padding: "10px", color: "var(--text-muted)" }}>% Avance</th>
                        <th style={{ padding: "10px", color: "var(--text-muted)" }}>Nota Actual</th>
                        <th style={{ padding: "10px", color: "var(--text-muted)" }}>Fecha Cierre</th>
                     </tr>
                  </thead>
                  <tbody>
                     {importPreview.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--glass-border)", opacity: row.match_status === "unmatched" ? 0.5 : 1 }}>
                           <td style={{ padding: "10px" }}><strong>{row.student_code}</strong> <br/><span style={{opacity: 0.5}}>{row.student_name}</span></td>
                           <td style={{ padding: "10px" }}>{row.subject_code}</td>
                           <td style={{ padding: "10px" }}>{row.progress_percentage}%</td>
                           <td style={{ padding: "10px", fontWeight: 800 }}>{row.current_grade}</td>
                           <td style={{ padding: "10px" }}>{row.close_date}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               {importMsg && <p style={{ margin: 0, color: importMsg.ok ? "#34d399" : "#ef4444", fontWeight: 700 }}>{importMsg.text}</p>}
               {!importMsg && <p style={{ margin: 0, opacity: 0.5, fontSize: "0.85rem" }}>Se ignorarán las filas marcadas en rojo.</p>}
               
               <button onClick={handleConfirmImport} disabled={importing} className="btn-primary" style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, background: "#34d399", color: "#000" }}>
                  {importing ? "Guardando..." : "Confirmar e Importar"}
               </button>
            </div>
         </div>
      )}

      {/* Main Table */}
      <div className="stat-card" style={{ padding: 0, overflow: "auto", border: "1px solid var(--glass-border)", borderRadius: "16px", maxHeight: "60vh" }}>
         <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px", fontSize: "0.85rem", textAlign: "left" }}>
            <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
               <tr>
                  <th style={{ padding: "15px", color: "var(--text-muted)", fontWeight: 800 }}>Student Code</th>
                  <th style={{ padding: "15px", color: "var(--text-muted)", fontWeight: 800 }}>Materia</th>
                  <th style={{ padding: "15px", color: "var(--text-muted)", fontWeight: 800 }}>% Avance</th>
                  <th style={{ padding: "15px", color: "#34d399", fontWeight: 800 }}>Nota Actual</th>
                  <th style={{ padding: "15px", color: "var(--text-muted)", fontWeight: 800 }}>Fecha Cierre</th>
                  <th style={{ padding: "15px", color: "var(--text-muted)", fontWeight: 800 }}>Observaciones</th>
               </tr>
            </thead>
            <tbody>
               {filteredGrades.map(row => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                     <td style={{ padding: "15px", fontWeight: 800, color: "var(--text-main)" }}>{row.student_code}</td>
                     <td style={{ padding: "15px" }}>{row.subject_code}</td>
                     <td style={{ padding: "15px", fontWeight: 700 }}>{row.progress_percentage !== null ? `${row.progress_percentage}%` : "-"}</td>
                     <td style={{ padding: "15px", fontWeight: 900 }}>{row.current_grade !== null ? row.current_grade : "-"}</td>
                     <td style={{ padding: "15px", color: "var(--text-muted)" }}>{row.close_date || "-"}</td>
                     <td style={{ padding: "15px", opacity: 0.6, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.comments || "-"}</td>
                  </tr>
               ))}
               {filteredGrades.length === 0 && (
                  <tr>
                     <td colSpan={6} style={{ padding: "40px", textAlign: "center", opacity: 0.5 }}>
                        La base de datos de Calvert está limpia. Sube el último reporte para ver información.
                     </td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>

      {/* Wipe Confirmation Modal */}
      {showWipeConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--bg-card)", border: wipeStatus.type === "error" ? "1px solid #ef4444" : wipeStatus.type === "success" ? "1px solid #10b981" : "1px solid #ef4444", borderRadius: 24, width: "100%", maxWidth: 450, padding: 40, boxShadow: "0 30px 60px rgba(0,0,0,0.5)", textAlign: "center", animation: "slideDown 0.3s ease" }}>
            
            {wipeStatus.type === "idle" && (
              <>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(239,68,68,0.1)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <AlertTriangle size={32} />
                </div>
                <h3 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text-main)", margin: "0 0 10px 0" }}>¿Borrar TODA la base?</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: 30, lineHeight: 1.5 }}>
                  Esta acción <strong>no se puede deshacer</strong> y eliminará absolutamente todas las calificaciones de Calvert.
                </p>
                <div style={{ display: "flex", gap: 15, justifyContent: "center" }}>
                  <button onClick={() => setShowWipeConfirm(false)} style={{ padding: "12px 24px", background: "transparent", border: "1px solid var(--glass-border)", color: "var(--text-main)", borderRadius: 12, fontWeight: 700, cursor: "pointer", flex: 1 }}>
                    Cancelar
                  </button>
                  <button onClick={executeWipeData} style={{ padding: "12px 24px", background: "#ef4444", border: "none", color: "#fff", borderRadius: 12, fontWeight: 800, cursor: "pointer", flex: 1, boxShadow: "0 10px 20px rgba(239,68,68,0.3)" }}>
                    Sí, borrar todo
                  </button>
                </div>
              </>
            )}

            {wipeStatus.type === "loading" && (
              <div style={{ padding: "30px 0" }}>
                <div style={{ width: 40, height: 40, border: "3px solid rgba(239,68,68,0.2)", borderTopColor: "#ef4444", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }}></div>
                <p style={{ fontWeight: 800, color: "var(--text-main)", margin: 0, fontSize: "1.1rem" }}>Borrando registros...</p>
              </div>
            )}

            {wipeStatus.type === "success" && (
              <div style={{ padding: "20px 0" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(16,185,129,0.1)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#10b981", margin: "0 0 10px 0" }}>¡Completado!</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: 0 }}>{wipeStatus.message}</p>
              </div>
            )}

            {wipeStatus.type === "error" && (
              <div style={{ padding: "20px 0" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(239,68,68,0.1)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <AlertTriangle size={32} />
                </div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#ef4444", margin: "0 0 10px 0" }}>Error</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: 25 }}>{wipeStatus.message}</p>
                <button onClick={() => setWipeStatus({type: "idle"})} style={{ padding: "12px 24px", background: "#ef4444", border: "none", color: "#fff", borderRadius: 12, fontWeight: 800, cursor: "pointer", width: "100%" }}>
                  Reintentar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
