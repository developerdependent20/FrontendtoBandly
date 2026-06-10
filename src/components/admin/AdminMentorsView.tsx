"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Users, Search, Save, CheckCircle, RefreshCw } from "lucide-react";

export function AdminMentorsView() {
  const supabase = createClient();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "estudiante")
      .order("full_name", { ascending: true });
    
    if (data) {
      setStudents(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCellChange = (id: string, field: string, value: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleCellBlur = async (id: string, field: string, value: string) => {
    setSavingId(`${id}-${field}`);
    await supabase.from("profiles").update({ [field]: value }).eq("id", id);
    setTimeout(() => setSavingId(null), 1000);
  };

  const filteredStudents = students.filter(s => {
    const search = searchTerm.toLowerCase();
    const name = (s.full_name || "").toLowerCase();
    const code = (s.student_code || "").toLowerCase();
    const ally = (s.ally || "").toLowerCase();
    return name.includes(search) || code.includes(search) || ally.includes(search);
  });

  if (loading) return (
    <div style={{ padding: 40, color: "var(--brand-secondary)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <RefreshCw size={20} className="spin" /> Cargando base de mentores...
    </div>
  );

  return (
    <div className="admin-view active" style={{ padding: "0 0 60px 0" }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px", flexWrap: "wrap", gap: 15 }}>
        <div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "5px" }}>
            Base de <span style={{ color: "var(--brand-secondary)" }}>Mentores</span>
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Seguimiento cualitativo de alumnos · Guardado automático
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {/* Search bar */}
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input 
              type="text" 
              placeholder="Buscar alumno, código, aliado..." 
              className="input-focus-ring" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ 
                padding: "12px 20px 12px 42px", 
                borderRadius: "12px", 
                border: "1px solid var(--glass-border)", 
                background: "var(--bg-card)", 
                color: "var(--text-main)", 
                width: "100%", 
                minWidth: "300px", 
                fontWeight: 500,
                outline: "none"
              }} 
            />
          </div>
        </div>
      </div>

      {/* ── Main Table ─────────────────────────────────── */}
      <div className="stat-card" style={{ padding: 0, overflowX: "auto", border: "1px solid var(--glass-border)", borderRadius: "16px", maxHeight: "75vh" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1200px", fontSize: "0.9rem" }}>
          <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
            <tr style={{ borderBottom: "2px solid var(--glass-border)" }}>
              <th style={{ padding: "18px 20px", color: "var(--text-muted)", fontWeight: 800, width: 250, textAlign: "left" }}>Alumno</th>
              <th style={{ padding: "18px 20px", color: "var(--text-muted)", fontWeight: 800, width: 150, textAlign: "left" }}>Código</th>
              <th style={{ padding: "18px 20px", color: "var(--text-muted)", fontWeight: 800, width: 150, textAlign: "left" }}>Aliado</th>
              <th style={{ padding: "18px 20px", color: "var(--brand-primary)", fontWeight: 800, width: 300, textAlign: "left" }}>Comentarios Aliado</th>
              <th style={{ padding: "18px 20px", color: "var(--brand-secondary)", fontWeight: 800, width: 300, textAlign: "left" }}>Comentarios CLAN</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s" }} className="hover-bg-card">
                <td style={{ padding: "15px 20px", fontWeight: 700, color: "var(--text-main)" }}>
                  {student.full_name}
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, marginTop: 4 }}>
                    Grado: {student.grade || "N/A"} | Cap: {student.is_captain || "N/A"}
                  </div>
                </td>
                <td style={{ padding: "15px 20px", color: "var(--text-muted)", fontWeight: 600 }}>{student.student_code || "—"}</td>
                <td style={{ padding: "15px 20px", color: "var(--text-muted)" }}>{student.ally || "—"}</td>
                
                {/* Comentarios Aliado */}
                <td style={{ padding: "10px", position: "relative" }}>
                  <textarea 
                    value={student.ally_comments || ""} 
                    onChange={e => handleCellChange(student.id, "ally_comments", e.target.value)} 
                    onBlur={e => handleCellBlur(student.id, "ally_comments", e.target.value)}
                    placeholder="Escribe comentarios del aliado..." 
                    style={{ 
                      width: "100%", minHeight: "60px", padding: "12px", 
                      background: "rgba(0,82,255,0.03)", border: "1px solid rgba(0,82,255,0.1)", 
                      color: "var(--text-main)", outline: "none", borderRadius: "10px",
                      resize: "vertical", fontSize: "0.85rem", lineHeight: 1.4, transition: "0.2s"
                    }} 
                    onFocus={e => e.target.style.background = "var(--bg-page)"}
                  />
                  {savingId === `${student.id}-ally_comments` && (
                    <CheckCircle size={14} color="#10b981" style={{ position: "absolute", bottom: 20, right: 20, animation: "fadeInOut 1.5s ease" }} />
                  )}
                </td>

                {/* Comentarios CLAN */}
                <td style={{ padding: "10px", position: "relative" }}>
                  <textarea 
                    value={student.clan_comments || ""} 
                    onChange={e => handleCellChange(student.id, "clan_comments", e.target.value)} 
                    onBlur={e => handleCellBlur(student.id, "clan_comments", e.target.value)}
                    placeholder="Escribe comentarios internos CLAN..." 
                    style={{ 
                      width: "100%", minHeight: "60px", padding: "12px", 
                      background: "rgba(14,165,233,0.03)", border: "1px solid rgba(14,165,233,0.1)", 
                      color: "var(--text-main)", outline: "none", borderRadius: "10px",
                      resize: "vertical", fontSize: "0.85rem", lineHeight: 1.4, transition: "0.2s"
                    }} 
                    onFocus={e => e.target.style.background = "var(--bg-page)"}
                  />
                  {savingId === `${student.id}-clan_comments` && (
                    <CheckCircle size={14} color="#10b981" style={{ position: "absolute", bottom: 20, right: 20, animation: "fadeInOut 1.5s ease" }} />
                  )}
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
                  <Users size={40} style={{ margin: "0 auto 15px", opacity: 0.3 }} />
                  <p>No se encontraron estudiantes.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
