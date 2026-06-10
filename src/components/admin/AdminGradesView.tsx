"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, RefreshCw, Trash2, Filter, Upload, CheckCircle, AlertTriangle, X, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ImportPreviewRow {
  subject_code: string;
  student_code: string;
  student_name_excel: string; // name from excel, used to match
  matched_user_id: string | null;
  term: string;
  w1: number|null; w2: number|null; w3: number|null; w4: number|null;
  w5: number|null; w6: number|null; w7: number|null; w8: number|null;
  w9: number|null; w10: number|null; w11: number|null; w12: number|null;
  definitiva: number|null;
  comments: string;
  recovery: number|null;
  source: string;
  match_status: "matched" | "unmatched" | "skipped";
}

// ─── Column name mapping (Excel header → DB field) ────────────────────────────
const COL_MAP: Record<string, string> = {
  subjectcode: "subject_code",
  materia: "subject_code",
  subject: "subject_code",
  studentcode: "student_code",
  codigoestudiante: "student_code",
  codigo: "student_code",
  nombre: "student_name_excel",
  name: "student_name_excel",
  estudiante: "student_name_excel",
  term: "term",
  bimestre: "term",
  periodo: "term",
  w1: "w1", w2: "w2", w3: "w3", w4: "w4", w5: "w5", w6: "w6",
  w7: "w7", w8: "w8", w9: "w9", w10: "w10", w11: "w11", w12: "w12",
  definitiva: "definitiva",
  def: "definitiva",
  comentarios: "comments",
  comments: "comments",
  recuperacion: "recovery",
  recuperación: "recovery",
  recovery: "recovery",
  source: "source",
  fuente: "source",
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim()
    .replace(/\s+/g, "")
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/ñ/g, "n");
}

function parseNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

function calculateDef(row: any): number | null {
  const weeks = [row.w1, row.w2, row.w3, row.w4, row.w5, row.w6, row.w7, row.w8, row.w9, row.w10, row.w11, row.w12];
  let sum = 0, count = 0;
  weeks.forEach(w => { if (w !== null && w !== undefined) { sum += w; count++; } });
  return count === 0 ? null : parseFloat((sum / count).toFixed(1));
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AdminGradesView() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [filterAlly, setFilterAlly] = useState("Todos");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: "asc"|"desc"} | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Import modal state
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // Wipe modal state
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wipeStatus, setWipeStatus] = useState<{type: "idle" | "loading" | "success" | "error", message?: string}>({type: "idle"});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: studentsData } = await supabase
      .from("profiles").select("id, full_name, ally, student_code, phone").eq("role", "estudiante");
    if (studentsData) setStudents(studentsData);

    const { data: gradesData } = await supabase
      .from("external_grades").select("*").order("created_at", { ascending: false });
    if (gradesData) setGrades(gradesData);
    setLoading(false);
  };

  const handleWipeData = () => {
    setShowWipeConfirm(true);
    setWipeStatus({type: "idle"});
  };

  const executeWipeData = async () => {
    setWipeStatus({type: "loading"});
    const { error } = await supabase.from("external_grades").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
    
    if (error) {
      setWipeStatus({type: "error", message: error.message});
    } else {
      setWipeStatus({type: "success", message: "Base de datos externa limpiada exitosamente."});
      setGrades([]);
      setTimeout(() => {
        setShowWipeConfirm(false);
        setWipeStatus({type: "idle"});
      }, 2000);
    }
  };



  // ─── Excel parsing ─────────────────────────────────────────────────────────
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

        // Build header map
        const rawHeaders: string[] = rows[0].map((h: any) => String(h));
        const headerMap: Record<number, string> = {};
        rawHeaders.forEach((h, i) => {
          const normalized = normalizeHeader(h);
          if (COL_MAP[normalized]) headerMap[i] = COL_MAP[normalized];
        });

        const preview: ImportPreviewRow[] = [];

        rows.slice(1).forEach((row) => {
          if (row.every((c: any) => c === "" || c === null || c === undefined)) return;

          const obj: any = {
            subject_code: "", student_code: "", student_name_excel: "",
            term: "Plataforma", w1: null, w2: null, w3: null, w4: null,
            w5: null, w6: null, w7: null, w8: null, w9: null, w10: null,
            w11: null, w12: null, definitiva: null, comments: "", recovery: null,
            source: "Excel",
          };

          Object.entries(headerMap).forEach(([idxStr, field]) => {
            const val = row[parseInt(idxStr)];
            if (["w1","w2","w3","w4","w5","w6","w7","w8","w9","w10","w11","w12","definitiva","recovery"].includes(field)) {
              obj[field] = parseNum(val);
            } else {
              obj[field] = val !== undefined && val !== null ? String(val).trim() : "";
            }
          });

          // Recalculate definitiva if not present
          if (obj.definitiva === null) obj.definitiva = calculateDef(obj);

          // Try to match student by student_code (CLAN-XXX) or by name
          let matchedStudent = null;
          if (obj.student_code) {
            matchedStudent = students.find(
              s => s.student_code?.toLowerCase().trim() === obj.student_code?.toLowerCase().trim()
            );
          }
          if (!matchedStudent && obj.student_name_excel) {
            matchedStudent = students.find(
              s => s.full_name?.toLowerCase().trim() === obj.student_name_excel?.toLowerCase().trim()
            );
          }

          preview.push({
            ...obj,
            matched_user_id: matchedStudent?.id || null,
            match_status: matchedStudent ? "matched" : obj.student_name_excel ? "unmatched" : "skipped",
          });
        });

        setImportPreview(preview);
        setShowImport(true);
      } catch (err: any) {
        setImportMsg({ text: "Error al leer el archivo: " + err.message, ok: false });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseExcelFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseExcelFile(file);
  };

  // Manual match override in preview
  const handlePreviewUserMatch = (idx: number, userId: string) => {
    setImportPreview(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      const student = students.find(s => s.id === userId);
      return { ...row, matched_user_id: userId || null, match_status: userId ? "matched" : "unmatched" };
    }));
  };

  const handleToggleSkip = (idx: number) => {
    setImportPreview(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      return { ...row, match_status: row.match_status === "skipped" ? (row.matched_user_id ? "matched" : "unmatched") : "skipped" };
    }));
  };

  // ─── Confirm import ────────────────────────────────────────────────────────
  const handleConfirmImport = async () => {
    setImporting(true);
    setImportMsg(null);

    const toInsert = importPreview
      .filter(r => r.match_status === "matched" && r.matched_user_id)
      .map(({ student_name_excel, match_status, matched_user_id, ...rest }) => ({
        ...rest,
        user_id: matched_user_id,
      }));

    if (toInsert.length === 0) {
      setImportMsg({ text: "No hay filas vinculadas a estudiantes para importar.", ok: false });
      setImporting(false);
      return;
    }

    const { error } = await supabase.from("external_grades").insert(toInsert);
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

  // ─── Inline editing ────────────────────────────────────────────────────────
  const getColorForGrade = (val: any) => {
    if (val === null || val === undefined || val === "") return "transparent";
    const num = parseFloat(val);
    if (isNaN(num)) return "transparent";
    if (num >= 80) return "rgba(34, 197, 94, 0.12)"; // Softer green
    if (num >= 60) return "rgba(234, 179, 8, 0.12)"; // Softer yellow
    if (num > 0) return "rgba(239, 68, 68, 0.12)";  // Softer red
    return "rgba(239, 68, 68, 0.25)";
  };

  const handleCellChange = (id: string, field: string, value: any) => {
    setGrades(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: value };
      if (field.startsWith("w") || field === "recovery") updated.definitiva = calculateDef(updated);
      return updated;
    }));
  };

  const handleCellBlur = async (id: string, field: string, value: any, row: any) => {
    setSavingId(id);
    const isTemp = String(id).startsWith("temp-");
    const payload = { ...row };
    delete payload.id;

    if (isTemp) {
      if (payload.user_id && payload.subject_code) {
        const { data } = await supabase.from("external_grades").insert([payload]).select();
        if (data?.[0]) setGrades(prev => prev.map(r => r.id === id ? data[0] : r));
      }
    } else {
      await supabase.from("external_grades").update({ [field]: value, definitiva: row.definitiva }).eq("id", id);
    }
    setSavingId(null);
  };

  const handleAddRow = () => {
    const newRow = {
      id: "temp-" + Date.now(), user_id: null, subject_code: "", student_code: "",
      term: "", w1: null, w2: null, w3: null, w4: null, w5: null, w6: null,
      w7: null, w8: null, w9: null, w10: null, w11: null, w12: null,
      definitiva: null, comments: "", recovery: null, source: "Plataforma"
    };
    setGrades([newRow, ...grades]);
  };

  const handleDeleteRow = async (id: string) => {
    if (String(id).startsWith("temp-")) { setGrades(prev => prev.filter(r => r.id !== id)); return; }
    if (confirm("¿Estás seguro de eliminar esta fila?")) {
      setGrades(prev => prev.filter(r => r.id !== id));
      await supabase.from("external_grades").delete().eq("id", id);
    }
  };

  const allies = ["Todos", ...Array.from(new Set(students.map(s => s.ally).filter(Boolean)))];
  const filteredGrades = grades.filter(row => {
    let matchAlly = true;
    const student = students.find(s => s.id === row.user_id);
    if (filterAlly !== "Todos") {
      matchAlly = student?.ally === filterAlly;
    }

    let matchSearch = true;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const studentName = (student?.full_name || "").toLowerCase();
      const studentCode = (row.student_code || "").toLowerCase();
      const subject = (row.subject_code || "").toLowerCase();
      matchSearch = studentName.includes(search) || studentCode.includes(search) || subject.includes(search);
    }

    return matchAlly && matchSearch;
  });

  const sortedGrades = [...filteredGrades].sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Special handling for student name which is linked to user_id
    if (sortConfig.key === "student_name") {
      const sA = students.find(s => s.id === a.user_id);
      const sB = students.find(s => s.id === b.user_id);
      aValue = sA ? sA.full_name : "";
      bValue = sB ? sB.full_name : "";
    }

    if (aValue === null || aValue === undefined) aValue = "";
    if (bValue === null || bValue === undefined) bValue = "";

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? " ↑" : " ↓";
  };

  const matchedCount = importPreview.filter(r => r.match_status === "matched").length;
  const unmatchedCount = importPreview.filter(r => r.match_status === "unmatched").length;
  const skippedCount = importPreview.filter(r => r.match_status === "skipped").length;

  if (loading) return (
    <div style={{ padding: 40, color: "var(--brand-secondary)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <RefreshCw size={20} /> Cargando notas...
    </div>
  );

  return (
    <div className="admin-view active" style={{ padding: "0 0 60px 0" }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px", flexWrap: "wrap", gap: 15 }}>
        <div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "5px" }}>
            Libro de <span style={{ color: "var(--brand-secondary)" }}>Calificaciones</span>
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Ingreso manual o importación directa desde Excel · Auto-guardado activado
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {/* Ally filter */}
          <div style={{ display: "flex", alignItems: "center", background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: "12px", padding: "0 15px" }}>
            <Filter size={16} color="var(--text-muted)" style={{ marginRight: 8 }} />
            <select value={filterAlly} onChange={e => setFilterAlly(e.target.value)}
              style={{ background: "transparent", border: "none", color: "var(--text-main)", padding: "12px 0", outline: "none", fontSize: "0.9rem" }}>
              {allies.map(ally => <option key={ally} value={ally}>{ally}</option>)}
            </select>
          </div>

          {/* Search bar */}
          <input 
            type="text" 
            placeholder="Buscar por nombre, código o materia..." 
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

          {/* Import Excel button */}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleFileChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", background: "var(--brand-glow)", border: "1px solid var(--brand-secondary)", color: "var(--brand-secondary)", borderRadius: "12px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", transition: "0.2s" }}
            className="hover-glow"
          >
            <Upload size={18} /> Importar Excel
          </button>

          {/* Wipe button */}
          <button 
            onClick={handleWipeData}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#ef4444", borderRadius: "12px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", transition: "0.2s" }}
          >
            <Trash2 size={18} /> Limpiar Base
          </button>

          {/* Add row */}
          <button className="btn-primary" onClick={handleAddRow} style={{ padding: "12px 20px" }}>
            <Plus size={18} /> Nueva Fila
          </button>
        </div>
      </div>

      {/* ── Main Table ─────────────────────────────────── */}
      <div className="stat-card" style={{ padding: 0, overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: "16px", maxHeight: "70vh" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1500px", fontSize: "0.85rem" }}>
          <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
            <tr style={{ borderBottom: "2px solid var(--glass-border)" }}>
              <th onClick={() => handleSort("subject_code")} style={{ padding: "18px 15px", color: "var(--text-muted)", fontWeight: 800, width: 160, cursor: "pointer", textAlign: "left" }}>Materia{renderSortIndicator("subject_code")}</th>
              <th onClick={() => handleSort("student_code")} style={{ padding: "18px 15px", color: "var(--text-muted)", fontWeight: 800, width: 120, cursor: "pointer", textAlign: "left" }}>Código{renderSortIndicator("student_code")}</th>
              <th onClick={() => handleSort("student_name")} style={{ padding: "18px 15px", color: "var(--text-muted)", fontWeight: 800, width: 220, cursor: "pointer", textAlign: "left" }}>Estudiante{renderSortIndicator("student_name")}</th>
              <th onClick={() => handleSort("term")} style={{ padding: "18px 15px", color: "var(--text-muted)", fontWeight: 800, width: 120, cursor: "pointer", textAlign: "left" }}>Periodo{renderSortIndicator("term")}</th>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(w => (
                <th key={w} onClick={() => handleSort(`w${w}`)} style={{ padding: "18px 8px", color: "var(--text-muted)", fontWeight: 800, width: 50, textAlign: "center", cursor: "pointer" }}>W{w}{renderSortIndicator(`w${w}`)}</th>
              ))}
              <th onClick={() => handleSort("definitiva")} style={{ padding: "18px 15px", color: "var(--brand-secondary)", fontWeight: 800, width: 90, textAlign: "center", cursor: "pointer" }}>Definitiva{renderSortIndicator("definitiva")}</th>
              <th style={{ padding: "18px 15px", color: "var(--text-muted)", fontWeight: 800, width: 200, textAlign: "left" }}>Comentarios</th>
              <th onClick={() => handleSort("recovery")} style={{ padding: "18px 15px", color: "var(--text-muted)", fontWeight: 800, width: 90, cursor: "pointer", textAlign: "center" }}>Recup.{renderSortIndicator("recovery")}</th>
              <th onClick={() => handleSort("source")} style={{ padding: "18px 15px", color: "var(--text-muted)", fontWeight: 800, width: 100, cursor: "pointer", textAlign: "left" }}>Origen{renderSortIndicator("source")}</th>
              <th style={{ padding: "18px 15px", width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {sortedGrades.map(row => (
              <tr key={row.id} style={{ borderBottom: "1px solid var(--glass-border)", background: savingId === row.id ? "rgba(255,255,255,0.02)" : "transparent" }}>
                <td style={{ padding: "6px" }}>
                  <input value={row.subject_code || ""} onChange={e => handleCellChange(row.id, "subject_code", e.target.value)} onBlur={e => handleCellBlur(row.id, "subject_code", e.target.value, row)}
                    placeholder="Matemáticas" style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.02)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "var(--text-main)", outline: "none", transition: "0.2s" }} className="hover-bg-card" />
                </td>
                <td style={{ padding: "6px" }}>
                  <input value={row.student_code || ""} onChange={e => handleCellChange(row.id, "student_code", e.target.value)} onBlur={e => handleCellBlur(row.id, "student_code", e.target.value, row)}
                    placeholder="CLAN-001" style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.02)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "var(--text-main)", outline: "none", transition: "0.2s" }} className="hover-bg-card" />
                </td>
                <td style={{ padding: "6px" }}>
                  <select value={row.user_id || ""} onChange={e => { handleCellChange(row.id, "user_id", e.target.value); handleCellBlur(row.id, "user_id", e.target.value, row); }}
                    style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.02)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "var(--text-main)", outline: "none", transition: "0.2s", textOverflow: "ellipsis" }} className="hover-bg-card">
                    <option value="" style={{ color: "black" }}>Seleccionar...</option>
                    {students.map(s => <option key={s.id} value={s.id} style={{ color: "black" }}>{s.student_code ? `[${s.student_code}] ` : ""}{s.full_name}</option>)}
                  </select>
                </td>
                <td style={{ padding: "6px" }}>
                  <input value={row.term || ""} onChange={e => handleCellChange(row.id, "term", e.target.value)} onBlur={e => handleCellBlur(row.id, "term", e.target.value, row)}
                    placeholder="Bimestre" style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.02)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "var(--text-main)", outline: "none", transition: "0.2s" }} className="hover-bg-card" />
                </td>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(w => {
                  const field = `w${w}`;
                  return (
                    <td key={w} style={{ padding: "6px 2px" }}>
                      <input type="number" value={row[field] === null ? "" : row[field]}
                        onChange={e => handleCellChange(row.id, field, e.target.value)}
                        onBlur={e => handleCellBlur(row.id, field, e.target.value, row)}
                        style={{ width: "100%", padding: "10px 0", background: getColorForGrade(row[field]), border: "1px solid var(--glass-border)", borderRadius: "6px", color: "var(--text-main)", outline: "none", textAlign: "center", fontWeight: 700, transition: "0.2s" }} className="hover-bg-card" />
                    </td>
                  );
                })}
                <td style={{ padding: "6px" }}>
                  <div style={{ padding: "10px 0", textAlign: "center", fontWeight: 900, color: "var(--brand-secondary)", background: "var(--brand-glow)", border: "1px solid rgba(14, 165, 233, 0.2)", borderRadius: "8px" }}>
                    {row.definitiva ?? "—"}
                  </div>
                </td>
                <td style={{ padding: "6px" }}>
                  <input value={row.comments || ""} onChange={e => handleCellChange(row.id, "comments", e.target.value)} onBlur={e => handleCellBlur(row.id, "comments", e.target.value, row)}
                    placeholder="Comentarios..." style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.02)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "var(--text-main)", outline: "none", transition: "0.2s" }} className="hover-bg-card" />
                </td>
                <td style={{ padding: "6px" }}>
                  <input type="number" value={row.recovery === null ? "" : row.recovery}
                    onChange={e => handleCellChange(row.id, "recovery", e.target.value)}
                    onBlur={e => handleCellBlur(row.id, "recovery", e.target.value, row)}
                    style={{ width: "100%", padding: "10px 4px", background: getColorForGrade(row.recovery), border: "1px solid var(--glass-border)", borderRadius: "6px", color: "var(--text-main)", outline: "none", textAlign: "center", transition: "0.2s" }} className="hover-bg-card" />
                </td>
                <td style={{ padding: "6px" }}>
                  <input value={row.source || ""} onChange={e => handleCellChange(row.id, "source", e.target.value)} onBlur={e => handleCellBlur(row.id, "source", e.target.value, row)}
                    style={{ width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.02)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "var(--text-main)", outline: "none", transition: "0.2s" }} className="hover-bg-card" />
                </td>
                <td style={{ padding: "0 10px", textAlign: "center" }}>
                  <button onClick={() => handleDeleteRow(row.id)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {sortedGrades.length === 0 && (
              <tr><td colSpan={20} style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
                <FileSpreadsheet size={40} style={{ margin: "0 auto 15px", opacity: 0.3 }} />
                <p>Sin registros. Importa tu Excel o añade una fila manual.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Import Modal ───────────────────────────────── */}
      {showImport && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 24, width: "100%", maxWidth: 1100, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
            
            {/* Modal header */}
            <div style={{ padding: "28px 36px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "var(--text-main)" }}>
                  Vista Previa de Importación
                </h3>
                <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  Revisa y ajusta los vínculos antes de confirmar
                </p>
              </div>
              <button onClick={() => { setShowImport(false); setImportPreview([]); }} style={{ background: "var(--bg-page)", border: "1px solid var(--glass-border)", color: "var(--text-main)", cursor: "pointer", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={18} />
              </button>
            </div>

            {/* Stats bar */}
            <div style={{ padding: "16px 36px", borderBottom: "1px solid var(--glass-border)", display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <CheckCircle size={16} color="#22c55e" />
                <span style={{ fontWeight: 800, color: "#22c55e", fontSize: "0.9rem" }}>{matchedCount} vinculados</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
                <AlertTriangle size={16} color="#eab308" />
                <span style={{ fontWeight: 800, color: "#eab308", fontSize: "0.9rem" }}>{unmatchedCount} sin vincular</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)" }}>
                <span style={{ fontWeight: 800, color: "var(--text-muted)", fontSize: "0.9rem" }}>{skippedCount} omitidos</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", alignSelf: "center" }}>
                Solo se importarán las filas <strong style={{ color: "#22c55e" }}>vinculadas</strong> · Las sin vincular se omitirán a menos que asignes manualmente un estudiante
              </p>
            </div>

            {/* Preview table */}
            <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900, fontSize: "0.82rem" }}>
                <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 5 }}>
                  <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 800, textAlign: "left" }}>Estado</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 800, textAlign: "left" }}>Materia</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 800, textAlign: "left" }}>Código</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 800, textAlign: "left" }}>Nombre en Excel</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 800, textAlign: "left", minWidth: 200 }}>Vincular a Alumno ▾</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 800 }}>Term</th>
                    <th style={{ padding: "12px 16px", color: "var(--brand-secondary)", fontWeight: 800 }}>Definitiva</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 800 }}>Recup.</th>
                    <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: 800, textAlign: "left" }}>Omitir</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row, idx) => {
                    const statusColor = row.match_status === "matched" ? "#22c55e" : row.match_status === "unmatched" ? "#eab308" : "var(--text-muted)";
                    const statusLabel = row.match_status === "matched" ? "✓" : row.match_status === "unmatched" ? "⚠" : "—";
                    const rowOpacity = row.match_status === "skipped" ? 0.4 : 1;
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", opacity: rowOpacity }}>
                        <td style={{ padding: "10px 16px", fontWeight: 900, color: statusColor, fontSize: "1rem" }}>{statusLabel}</td>
                        <td style={{ padding: "10px 16px", color: "var(--text-main)", fontWeight: 700 }}>{row.subject_code}</td>
                        <td style={{ padding: "10px 16px", color: "var(--text-muted)" }}>{row.student_code}</td>
                        <td style={{ padding: "10px 16px", color: "var(--text-muted)" }}>{row.student_name_excel}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <select
                            value={row.matched_user_id || ""}
                            onChange={e => handlePreviewUserMatch(idx, e.target.value)}
                            disabled={row.match_status === "skipped"}
                            style={{ width: "100%", padding: "8px 10px", background: "var(--bg-page)", border: `1px solid ${row.matched_user_id ? "rgba(34,197,94,0.5)" : "var(--glass-border)"}`, color: "var(--text-main)", borderRadius: 8, outline: "none", fontSize: "0.8rem" }}
                          >
                            <option value="" style={{ color: "black" }}>Sin vincular...</option>
                            {students.map(s => <option key={s.id} value={s.id} style={{ color: "black" }}>{s.student_code ? `[${s.student_code}] ` : ""}{s.full_name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "10px 16px", color: "var(--text-muted)", textAlign: "center" }}>{row.term}</td>
                        <td style={{ padding: "10px 16px", textAlign: "center", fontWeight: 800, color: "var(--brand-secondary)" }}>{row.definitiva ?? "—"}</td>
                        <td style={{ padding: "10px 16px", textAlign: "center", color: "var(--text-muted)" }}>{row.recovery ?? "—"}</td>
                        <td style={{ padding: "10px 16px", textAlign: "center" }}>
                          <button onClick={() => handleToggleSkip(idx)}
                            style={{ background: row.match_status === "skipped" ? "rgba(255,255,255,0.05)" : "transparent", border: "1px solid var(--glass-border)", color: "var(--text-muted)", cursor: "pointer", padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700 }}>
                            {row.match_status === "skipped" ? "Restaurar" : "Omitir"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal footer */}
            <div style={{ padding: "20px 36px", borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
              {importMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, background: importMsg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${importMsg.ok ? "#22c55e" : "#ef4444"}`, color: importMsg.ok ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                  {importMsg.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />} {importMsg.text}
                </div>
              )}
              <div style={{ display: "flex", gap: 12, marginLeft: "auto" }}>
                <button onClick={() => { setShowImport(false); setImportPreview([]); }} style={{ padding: "12px 24px", background: "transparent", border: "1px solid var(--glass-border)", color: "var(--text-muted)", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button onClick={handleConfirmImport} disabled={importing || matchedCount === 0} className="btn-primary" style={{ padding: "12px 28px", opacity: matchedCount === 0 ? 0.5 : 1 }}>
                  {importing ? <><RefreshCw size={16} /> Importando...</> : <><CheckCircle size={16} /> Confirmar {matchedCount} filas</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wipe Confirmation Modal */}
      {showWipeConfirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--bg-card)", border: wipeStatus.type === "error" ? "1px solid #ef4444" : wipeStatus.type === "success" ? "1px solid #10b981" : "1px solid #ef4444", borderRadius: 24, width: "100%", maxWidth: 450, padding: 40, boxShadow: "0 30px 60px rgba(0,0,0,0.5)", textAlign: "center", animation: "slideDown 0.3s ease" }}>
            
            {wipeStatus.type === "idle" && (
              <>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(239,68,68,0.1)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <AlertTriangle size={32} />
                </div>
                <h3 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text-main)", margin: "0 0 10px 0" }}>¿Borrar TODA la base externa?</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: 30, lineHeight: 1.5 }}>
                  Esta acción <strong>no se puede deshacer</strong> y eliminará absolutamente todas las calificaciones de la base de datos externa (TyT, Trikele, etc.).
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
                  <CheckCircle size={32} />
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
}
