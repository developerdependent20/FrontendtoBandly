"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { AlertTriangle, Calendar, FileText, CheckCircle2, Clock } from "lucide-react";

export const AdminNovedadesView = () => {
  const [novedades, setNovedades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active">("all");
  const supabase = createClient();

  // Edit states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [type, setType] = useState("Incapacidad Médica");
  const [observations, setObservations] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNovedades = async () => {
    setLoading(true);
    // Fetch all novedades along with student profiles
    const { data } = await supabase
      .from("novedades")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false });
    
    if (data) setNovedades(data);
    setLoading(false);
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString("es-CO", { timeZone: "America/Bogota", day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  useEffect(() => {
    fetchNovedades();
  }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "pending" ? "reviewed" : "pending";
    const { error } = await supabase.from("novedades").update({ status: newStatus }).eq("id", id);
    if (!error) {
       setNovedades(prev => prev.map(n => n.id === id ? { ...n, status: newStatus } : n));
    } else {
       alert("Error al actualizar estado: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta novedad de la base de datos?")) {
      const { error } = await supabase.from("novedades").delete().eq("id", id);
      if (error) alert("Error al eliminar: " + error.message);
      else fetchNovedades();
    }
  };

  const openEditModal = (nov: any) => {
    setEditingId(nov.id);
    setEditingStudentId(nov.student_id);
    
    // Parse timestamp back to date and time inputs for Colombia time
    try {
      const dStart = new Date(nov.start_date);
      const dEnd = new Date(nov.end_date);
      
      const formatLocal = (d: Date) => {
        const str = d.toLocaleString("sv-SE", { timeZone: "America/Bogota" });
        const [date, time] = str.split(" ");
        return { date, time: time.substring(0, 5) };
      };
      
      const startParts = formatLocal(dStart);
      const endParts = formatLocal(dEnd);
      
      setStartDate(startParts.date);
      setStartTime(startParts.time);
      setEndDate(endParts.date);
      setEndTime(endParts.time);
    } catch {
      setStartDate(nov.start_date.split("T")[0]);
      setEndDate(nov.end_date.split("T")[0]);
    }
    
    setType(nov.type);
    setObservations(nov.observations);
    setIsModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !startTime || !endDate || !endTime || !observations.trim() || !editingId) return;
    
    setIsSubmitting(true);
    
    const startIso = `${startDate}T${startTime}:00-05:00`;
    const endIso = `${endDate}T${endTime}:00-05:00`;
    
    const { data: updatedNov, error } = await supabase.from("novedades").update({
      start_date: startIso,
      end_date: endIso,
      type,
      observations
    }).eq("id", editingId).select("*, profiles(full_name, student_code)").single();

    setIsSubmitting(false);
    if (error) {
      alert("Error al actualizar la novedad: " + error.message);
    } else {
      // ─── LÓGICA DE ALERTA WHATSAPP (EDICIÓN ADMIN) ──────────────────────────
      try {
        if (updatedNov?.profiles?.student_code) {
          const formattedStart = formatDateTime(startIso);
          const formattedEnd = formatDateTime(endIso);
          const msg = `¡Hola querida familia! 🐺\nTenemos un reporte actualizado desde administración.\n\n👤 *Estudiante:* ${updatedNov.profiles.full_name}\n📌 *Tipo:* ${type}\n📅 *Fechas:* ${formattedStart} al ${formattedEnd}\n📝 *Detalles:* ${observations}\n\n*¿Todo en orden?* Si estás de acuerdo, solo responde a este mensaje con un "ok" o "aprobado" y yo me encargo de actualizar la plataforma. 💪🏽`;
          
          fetch("/api/webhook/whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentCode: updatedNov.profiles.student_code, message: msg, novedadId: updatedNov.id })
          }).catch(err => console.error("Error disparando Webhook:", err));
        }
      } catch (err) {
        console.error("Error consultando webhook (admin):", err);
      }
      // ────────────────────────────────────────────────────────────────────────
      
      setIsModalOpen(false);
      fetchNovedades();
    }
  };

    const nowTime = new Date().getTime();
  const activeNovedades = novedades.filter(n => {
    const start = new Date(n.start_date).getTime();
    const end = new Date(n.end_date).getTime();
    return start <= nowTime && end >= nowTime;
  });

  return (
    <div className="admin-view active" style={{ padding: "0 0 60px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px" }}>
          <div>
            <h2 style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-main)", marginBottom: "5px" }}>Panel de <span style={{ color: "var(--brand-secondary)" }}>Eventualidades</span></h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Bandeja de entrada general de reportes estudiantiles.</p>
          </div>
          <div style={{ display: "flex", gap: 15 }}>
             <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: 12, padding: "10px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#f59e0b" }}>{novedades.filter(n => n.status === "pending").length}</span>
                <span style={{ fontSize: "0.6rem", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-muted)" }}>Pendientes</span>
             </div>
             <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 12, padding: "10px 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#10b981" }}>{novedades.filter(n => n.status === "reviewed").length}</span>
                <span style={{ fontSize: "0.6rem", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: "var(--text-muted)" }}>Revisadas</span>
             </div>
          </div>
      </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
          <button 
             onClick={() => setActiveTab("all")} 
             className={activeTab === "all" ? "btn-primary" : "btn-secondary"}
             style={{ padding: "10px 20px", borderRadius: "12px", fontSize: "0.9rem", height: "auto" }}>
             Bandeja Completa
          </button>
          <button 
             onClick={() => setActiveTab("active")} 
             className={activeTab === "active" ? "btn-primary" : "btn-secondary"}
             style={{ padding: "10px 20px", borderRadius: "12px", fontSize: "0.9rem", height: "auto" }}>
             Manada en Tiempo Real
          </button>
      </div>

      <div className="stat-card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--glass-border)", borderRadius: "20px" }}>
           {loading ? (
              <div style={{ padding: "60px", textAlign: "center", opacity: 0.5 }}>Cargando reportes...</div>
           ) : (activeTab === "all" ? novedades : activeNovedades).length === 0 ? (
              <div style={{ padding: "80px 40px", textAlign: "center" }}>
                 <CheckCircle2 size={48} style={{ color: "var(--brand-secondary)", opacity: 0.3, marginBottom: 20 }} />
                 <h3 style={{ margin: "0 0 10px", fontSize: "1.2rem", fontWeight: 800 }}>{activeTab === "all" ? "Bandeja Limpia" : "Manada Completa"}</h3>
                 <p style={{ margin: 0, opacity: 0.5, fontSize: "0.9rem" }}>{activeTab === "all" ? "No hay novedades reportadas por los estudiantes." : "No hay ninguna eventualidad cruzándose con la hora actual."}</p>
              </div>
           ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
                  <thead>
                    <tr style={{ background: "rgba(0, 82, 255, 0.02)", borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Estudiante</th>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Fechas</th>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Novedad y Observaciones</th>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)", textAlign: "center" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === "all" ? novedades : activeNovedades).map(nov => (
                       <tr key={nov.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                          <td style={{ padding: "20px 30px" }}>
                             <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                               <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand-glow)", color: "var(--brand-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.8rem" }}>
                                  {nov.profiles?.full_name ? nov.profiles.full_name.substring(0,2).toUpperCase() : "ES"}
                               </div>
                               <div>
                                  <p style={{ margin: 0, fontWeight: 800, color: "var(--text-main)", fontSize: "0.95rem" }}>{nov.profiles?.full_name || "Estudiante"}</p>
                                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{new Date(nov.created_at).toLocaleDateString()}</p>
                               </div>
                             </div>
                          </td>
                           <td style={{ padding: "20px 30px", whiteSpace: "nowrap" }}>
                             <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                               <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 700 }}>
                                 <Calendar size={14} style={{ color: "var(--text-muted)" }} /> 
                                 {formatDateTime(nov.start_date)}
                               </div>
                               <div style={{ paddingLeft: 20, color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600 }}>
                                 hasta {formatDateTime(nov.end_date)}
                               </div>
                             </div>
                           </td>
                          <td style={{ padding: "20px 30px" }}>
                             <div style={{ marginBottom: 6 }}>
                               <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--brand-secondary)", background: "var(--brand-glow)", padding: "4px 8px", borderRadius: 6 }}>{nov.type}</span>
                             </div>
                             <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 400, lineHeight: 1.5 }}>
                               {nov.observations}
                             </p>
                          </td>
                           <td style={{ padding: "20px 30px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexDirection: "column" }}>
                                <button 
                                  onClick={() => toggleStatus(nov.id, nov.status)}
                                  className={nov.status === 'pending' ? "btn-primary" : "btn-secondary"}
                                  style={{ padding: "8px 16px", borderRadius: "10px", fontSize: "0.85rem", height: "auto" }}
                                >
                                  {nov.status === 'pending' ? "Marcar Revisado" : "Desmarcar"}
                                </button>
                                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                                  <button onClick={() => openEditModal(nov)} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: "10px", fontSize: "0.85rem", height: "auto", flex: 1 }}>Editar</button>
                                  <button onClick={() => handleDelete(nov.id)} className="btn-secondary" style={{ padding: "8px 16px", borderRadius: "10px", fontSize: "0.85rem", height: "auto", flex: 1, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}>Borrar</button>
                                </div>
                              </div>
                           </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           )}
      </div>

      {/* Modal Formulario de Edición */}
      {isModalOpen && (
         <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div className="stat-card" style={{ width: "600px", maxWidth: "100%", padding: "40px", borderRadius: "24px", background: "var(--bg-card)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", border: "1px solid var(--glass-border)" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--text-main)", margin: "0 0 5px 0" }}>Editar Eventualidad</h3>
                    <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.9rem" }}>Corrigiendo reporte desde Administración.</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} style={{ background: "var(--bg-page)", border: "1px solid var(--glass-border)", color: "var(--text-main)", cursor: "pointer", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }} className="hover-glow">✕</button>
               </div>

               <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "flex", gap: "20px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>INICIO</label>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 2, padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                        <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>FIN</label>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 2, padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                        <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>TIPO DE NOVEDAD</label>
                    <select value={type} onChange={e => setType(e.target.value)} style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem" }}>
                      <option value="Incapacidad Médica">Incapacidad Médica</option>
                      <option value="Fallo Técnico / Internet">Fallo Técnico / Internet</option>
                      <option value="Calamidad Doméstica">Calamidad Doméstica</option>
                      <option value="Entrenamiento">Entrenamiento</option>
                      <option value="Partido">Partido</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "8px", color: "var(--text-muted)", letterSpacing: "1px" }}>OBSERVACIONES Y EXPLICACIÓN</label>
                    <textarea required placeholder="Explica brevemente la situación..." value={observations} onChange={e => setObservations(e.target.value)} rows={4} style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem", resize: "vertical" }} />
                  </div>

                  <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: "16px", borderRadius: "12px", fontSize: "1rem", fontWeight: 800, display: "flex", justifyContent: "center", marginTop: "10px" }}>
                    {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                  </button>
               </form>
            </div>
         </div>
      )}

    </div>
  );
}
