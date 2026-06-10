"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Users, Search, RefreshCw, Eye } from "lucide-react";

interface AdminCaptainViewProps {
  currentAdminProfile: any;
  onOpenProfile: (student: any) => void;
}

export function AdminCaptainView({ currentAdminProfile, onOpenProfile }: AdminCaptainViewProps) {
  const supabase = createClient();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    
    // El capitán solo ve a los estudiantes cuyo 'is_captain' coincide con su 'student_code'
    const captainCode = currentAdminProfile?.student_code;
    
    if (captainCode) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "estudiante")
        .eq("is_captain", captainCode)
        .order("full_name", { ascending: true });
      
      if (data) {
        setStudents(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentAdminProfile) {
      fetchData();
    }
  }, [currentAdminProfile]);

  const filteredStudents = students.filter(s => {
    const search = searchTerm.toLowerCase();
    const name = (s.full_name || "").toLowerCase();
    const code = (s.student_code || "").toLowerCase();
    return name.includes(search) || code.includes(search);
  });

  if (loading) return (
    <div style={{ padding: 40, color: "var(--brand-secondary)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <RefreshCw size={20} className="spin" /> Cargando mi capitanía...
    </div>
  );

  return (
    <div className="admin-view active" style={{ padding: "0 0 60px 0" }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px", flexWrap: "wrap", gap: 15 }}>
        <div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "5px" }}>
            Mi <span style={{ color: "var(--brand-secondary)" }}>Capitanía</span>
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Alumnos a cargo del Capitán {currentAdminProfile?.full_name} ({currentAdminProfile?.student_code})
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {/* Search bar */}
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input 
              type="text" 
              placeholder="Buscar alumno o código..." 
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
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px", fontSize: "0.95rem" }}>
          <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
            <tr style={{ borderBottom: "2px solid var(--glass-border)" }}>
              <th style={{ padding: "18px 20px", color: "var(--text-muted)", fontWeight: 800, width: 250, textAlign: "left" }}>Alumno</th>
              <th style={{ padding: "18px 20px", color: "var(--text-muted)", fontWeight: 800, width: 120, textAlign: "left" }}>Código</th>
              <th style={{ padding: "18px 20px", color: "var(--text-muted)", fontWeight: 800, width: 120, textAlign: "left" }}>Grado</th>
              <th style={{ padding: "18px 20px", color: "var(--text-muted)", fontWeight: 800, width: 150, textAlign: "left" }}>Deporte</th>
              <th style={{ padding: "18px 20px", color: "var(--text-muted)", fontWeight: 800, width: 150, textAlign: "left" }}>Aliado</th>
              <th style={{ padding: "18px 20px", color: "var(--text-muted)", fontWeight: 800, width: 120, textAlign: "right" }}>Perfil Académico</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student.id} style={{ borderBottom: "1px solid var(--glass-border)", transition: "background 0.2s" }} className="hover-bg-card">
                <td style={{ padding: "15px 20px", fontWeight: 800, color: "var(--text-main)" }}>
                  {student.full_name}
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500, marginTop: 4 }}>
                    {student.email}
                  </div>
                </td>
                <td style={{ padding: "15px 20px", color: "var(--brand-secondary)", fontWeight: 700 }}>{student.student_code || "—"}</td>
                <td style={{ padding: "15px 20px", color: "var(--text-muted)" }}>{student.grade || "—"}</td>
                <td style={{ padding: "15px 20px", color: "var(--text-muted)" }}>{student.sport || "—"}</td>
                <td style={{ padding: "15px 20px", color: "var(--text-muted)" }}>
                  {student.ally ? <span className="pill-badge" style={{ margin: 0, background: "rgba(0,82,255,0.1)", color: "var(--brand-primary)" }}>{student.ally}</span> : "—"}
                </td>
                <td style={{ padding: "15px 20px", textAlign: "right" }}>
                  <button 
                    onClick={() => onOpenProfile(student)}
                    style={{ 
                      padding: "8px 16px", background: "var(--brand-glow)", border: "1px solid var(--brand-secondary)", 
                      color: "var(--brand-secondary)", borderRadius: "10px", fontWeight: 800, fontSize: "0.8rem", 
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 
                    }}
                  >
                    <Eye size={14} /> Ver Notas
                  </button>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
                  {currentAdminProfile?.student_code ? (
                    <>
                      <Users size={40} style={{ margin: "0 auto 15px", opacity: 0.3 }} />
                      <p style={{ margin: 0 }}>No tienes alumnos asignados a tu código ({currentAdminProfile.student_code}).</p>
                      <p style={{ margin: "5px 0 0", fontSize: "0.85rem", opacity: 0.7 }}>El administrador debe asignar tu código en la casilla de Capitán de cada alumno.</p>
                    </>
                  ) : (
                    <>
                      <Users size={40} style={{ margin: "0 auto 15px", opacity: 0.3 }} />
                      <p style={{ margin: 0, color: "#ef4444", fontWeight: 800 }}>¡Error! Tu perfil no tiene un "Código CLAN".</p>
                      <p style={{ margin: "5px 0 0", fontSize: "0.85rem", opacity: 0.7 }}>El administrador debe asignarte un código en tu perfil para que puedas tener alumnos a cargo.</p>
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
