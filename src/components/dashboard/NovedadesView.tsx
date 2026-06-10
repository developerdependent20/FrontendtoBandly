"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { AlertTriangle, Plus, Calendar, FileText, CheckCircle2, Clock } from "lucide-react";
import { CustomRangeCalendar } from "./CustomRangeCalendar";

export const NovedadesView = ({ userId }: { userId: string }) => {
  const [novedades, setNovedades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClient();

  // Form states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState("Incapacidad Médica");
  const [observations, setObservations] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNovedades = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("novedades")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false });
    
    if (data) setNovedades(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNovedades();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !observations.trim()) return alert("Por favor completa todos los campos requeridos.");
    
    setIsSubmitting(true);
    const { error } = await supabase.from("novedades").insert({
      student_id: userId,
      start_date: startDate,
      end_date: endDate,
      type,
      observations
    });

    setIsSubmitting(false);
    if (error) {
      alert("Error al reportar la novedad: " + error.message);
    } else {
      // ─── LÓGICA DE ALERTA WHATSAPP ──────────────────────────────────────────
      try {
        const { data: profile } = await supabase.from("profiles").select("student_code, full_name").eq("id", userId).single();
        if (profile && profile.student_code) {
          const msg = `🚨 *NUEVA NOVEDAD REGISTRADA*\n\nEstudiante: *${profile.full_name}*\nTipo: *${type}*\nFechas: ${startDate} al ${endDate}\nObservaciones: ${observations}\n\n_Este mensaje fue generado automáticamente por la Plataforma CLAN._`;
          
          fetch("/api/webhook/whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentCode: profile.student_code, message: msg })
          }).catch(err => console.error("Error disparando Webhook:", err));
        }
      } catch (err) {
        console.error("Error consultando perfil para webhook:", err);
      }
      // ────────────────────────────────────────────────────────────────────────

      setIsModalOpen(false);
      setStartDate("");
      setEndDate("");
      setType("Incapacidad Médica");
      setObservations("");
      fetchNovedades();
    }
  };

  return (
    <div className="admin-view active" style={{ padding: "0 0 60px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "30px" }}>
          <div>
            <h2 style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-main)", marginBottom: "5px" }}>Reporte de <span style={{ color: "var(--brand-secondary)" }}>Novedades</span></h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Incapacidades, permisos, fallos técnicos y más.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary" 
            style={{ padding: "12px 24px", borderRadius: "12px", fontSize: "0.9rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8, height: "auto" }}>
            <Plus size={18} /> Reportar Novedad
          </button>
      </div>

      <div className="stat-card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--glass-border)", borderRadius: "20px" }}>
           {loading ? (
              <div style={{ padding: "60px", textAlign: "center", opacity: 0.5 }}>Cargando tus reportes...</div>
           ) : novedades.length === 0 ? (
              <div style={{ padding: "80px 40px", textAlign: "center" }}>
                 <AlertTriangle size={48} style={{ color: "var(--brand-secondary)", opacity: 0.3, marginBottom: 20 }} />
                 <h3 style={{ margin: "0 0 10px", fontSize: "1.2rem", fontWeight: 800 }}>No has reportado ninguna novedad</h3>
                 <p style={{ margin: 0, opacity: 0.5, fontSize: "0.9rem" }}>Si tienes algún problema técnico, ausencia o incapacidad, repórtalo aquí.</p>
              </div>
           ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                  <thead>
                    <tr style={{ background: "rgba(0, 82, 255, 0.02)", borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Tipo de Novedad</th>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Periodo</th>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Estado</th>
                      <th style={{ padding: "20px 30px", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 800, color: "var(--text-muted)" }}>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {novedades.map(nov => (
                       <tr key={nov.id} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                          <td style={{ padding: "20px 30px", fontWeight: 800, color: "var(--text-main)", fontSize: "0.95rem" }}>
                             {nov.type}
                          </td>
                          <td style={{ padding: "20px 30px" }}>
                             <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>
                               <Calendar size={14} /> {nov.start_date} al {nov.end_date}
                             </div>
                          </td>
                          <td style={{ padding: "20px 30px" }}>
                             <span style={{ 
                               display: "inline-flex", alignItems: "center", gap: 6,
                               padding: "6px 12px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1,
                               background: nov.status === 'reviewed' ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                               color: nov.status === 'reviewed' ? "#10b981" : "#f59e0b",
                               border: `1px solid ${nov.status === 'reviewed' ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"}`
                             }}>
                               {nov.status === 'reviewed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                               {nov.status === 'reviewed' ? "Revisado" : "Pendiente"}
                             </span>
                          </td>
                          <td style={{ padding: "20px 30px", fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 300 }}>
                             <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                               <FileText size={14} style={{ flexShrink: 0, marginTop: 2, opacity: 0.5 }} />
                               <p style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nov.observations}</p>
                             </div>
                          </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           )}
      </div>

      {/* Modal Formulario */}
      {isModalOpen && (
         <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div className="stat-card" style={{ width: "600px", maxWidth: "100%", padding: "40px", borderRadius: "24px", background: "var(--bg-card)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", border: "1px solid var(--glass-border)" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--text-main)", margin: "0 0 5px 0" }}>Reportar Eventualidad</h3>
                    <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.9rem" }}>Por favor llena los detalles de tu novedad.</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} style={{ background: "var(--bg-page)", border: "1px solid var(--glass-border)", color: "var(--text-main)", cursor: "pointer", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" }} className="hover-glow">✕</button>
               </div>

               <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, opacity: 0.8, marginBottom: "15px", color: "var(--text-muted)", letterSpacing: "1px" }}>RANGO DE FECHAS</label>
                    <CustomRangeCalendar 
                      startDate={startDate} 
                      endDate={endDate} 
                      disabledDates={[]} 
                      onChange={(s, e) => { setStartDate(s); setEndDate(e); }} 
                    />
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
                    <textarea required placeholder="Explica brevemente tu situación..." value={observations} onChange={e => setObservations(e.target.value)} rows={4} style={{ width: "100%", padding: "14px 20px", borderRadius: "12px", border: "1px solid var(--glass-border)", background: "var(--bg-page)", color: "var(--text-main)", fontSize: "0.95rem", resize: "vertical" }} />
                  </div>

                  <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: "16px", borderRadius: "12px", fontSize: "1rem", fontWeight: 800, display: "flex", justifyContent: "center", marginTop: "10px" }}>
                    {isSubmitting ? "Enviando..." : "Enviar Reporte"}
                  </button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
