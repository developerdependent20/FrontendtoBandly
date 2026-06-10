import { useState } from "react";
import { UserMinus, UserPlus, Search } from "lucide-react";

interface CourseMembersViewProps {
  courseEnrollments: any[];
  allProfiles: any[];
  toggleEnrollment: (userId: string, isCurrentlyEnrolled: boolean) => Promise<void>;
}

export function CourseMembersView({ courseEnrollments, allProfiles, toggleEnrollment }: CourseMembersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="members-view">
      <header style={{ marginBottom: 40, borderBottom: "1px solid var(--glass-border)", paddingBottom: 20 }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "var(--brand-secondary)", margin: 0 }}>Gestión de Miembros</h2>
        <p style={{ opacity: 0.5, marginTop: 5 }}>Controla quién tiene acceso a este programa de estudio.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40 }}>
        {/* Lista Actual */}
        <div style={{ background: "rgba(255,255,255,0.02)", padding: 30, borderRadius: 24, border: "1px solid var(--glass-border)" }}>
          <h3 style={{ fontSize: "1.2rem", marginBottom: 20 }}>Alumnos Matriculados ({courseEnrollments.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {courseEnrollments.length === 0 ? (
              <p style={{ opacity: 0.3, textAlign: "center", padding: 40 }}>No hay alumnos asignados aún.</p>
            ) : courseEnrollments.map(e => (
              <div key={e.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 15, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand-primary)", color: "black", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800 }}>{e.profiles?.full_name?.substring(0,2).toUpperCase()}</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>{e.profiles?.full_name}</p>
                      <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.4 }}>ID: {e.user_id.split("-")[0]}</p>
                    </div>
                 </div>
                 <button onClick={() => toggleEnrollment(e.user_id, true)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", opacity: 0.6 }} title="Quitar acceso"><UserMinus size={18} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Buscador para añadir */}
        <div style={{ background: "rgba(255,255,255,0.02)", padding: 30, borderRadius: 24, border: "1px solid var(--glass-border)" }}>
          <h3 style={{ fontSize: "1.2rem", marginBottom: 20 }}>Matricular Alumnos</h3>
          <div style={{ position: "relative", marginBottom: 20 }}>
            <Search size={18} style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} />
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "12px 15px 12px 45px", borderRadius: 12, border: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.2)", color: "white", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 400, overflowY: "auto", paddingRight: 5 }}>
            {allProfiles.filter(p => !courseEnrollments.find(e => e.user_id === p.id) && p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 15px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>{p.full_name}</span>
                <button onClick={() => toggleEnrollment(p.id, false)} className="btn-secondary" style={{ padding: "5px 12px", fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", border: "none", color: "white", cursor: "pointer", borderRadius: "8px", display: "flex", alignItems: "center", gap: 6 }}>
                  <UserPlus size={14} /> Matricular
                </button>
              </div>
            ))}
            {allProfiles.filter(p => !courseEnrollments.find(e => e.user_id === p.id) && p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
              <p style={{ opacity: 0.3, textAlign: "center", fontSize: "0.85rem", padding: "20px 0" }}>No hay coincidencias.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
