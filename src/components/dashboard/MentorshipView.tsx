"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Copy, Plus, Trash2, Calendar as CalIcon, Phone, Video, Clock } from "lucide-react";
import { CustomRangeCalendar } from "./CustomRangeCalendar";

export const MentorshipView = ({ profile }: { profile: any }) => {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState<{isOpen: boolean, type: 'alert' | 'confirm', title: string, message: string, onConfirm?: () => void} | null>(null);
  
  const showAlert = (title: string, message: string) => {
    setPopup({ isOpen: true, type: 'alert', title, message });
  };

  // Profile Settings
  const [phone, setPhone] = useState(profile?.phone || "");
  const [meetingLink, setMeetingLink] = useState("");
  const [agendaStart, setAgendaStart] = useState("");
  const [agendaEnd, setAgendaEnd] = useState("");
  const [disabledDates, setDisabledDates] = useState<string[]>([]);
  const [meetingDuration, setMeetingDuration] = useState(profile?.meeting_duration || 30);

  useEffect(() => {
    if (profile?.meeting_link) {
      const parts = profile.meeting_link.split("|");
      setMeetingLink(parts[0] || "");
      if (parts.length > 1) setAgendaStart(parts[1] || "");
      if (parts.length > 2) setAgendaEnd(parts[2] || "");
      if (parts.length > 3 && parts[3]) setDisabledDates(parts[3].split(","));
    }
  }, [profile]);

  // New Availability Form
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("12:00");

  const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const [origin, setOrigin] = useState("");
  useEffect(() => {
     if (typeof window !== "undefined") {
        setOrigin(window.location.origin);
     }
  }, []);
  const publicLink = `${origin}/book/${profile?.id || "ERROR"}`;

  const fetchData = async () => {
    setLoading(true);
    // Fetch availabilities
    const { data: avData } = await supabase
      .from("availabilities")
      .select("*")
      .eq("mentor_id", profile.id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });
    
    if (avData) setAvailabilities(avData);

    // Fetch appointments
    const { data: appData } = await supabase
      .from("appointments")
      .select("*")
      .eq("mentor_id", profile.id)
      .order("appointment_date", { ascending: true });
    
    if (appData) setAppointments(appData);
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.id) {
       fetchData();
    }
  }, [profile?.id]);

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink);
    showAlert("Enlace Copiado", "¡Link público copiado al portapapeles!");
  };

  const saveProfileSettings = async () => {
    setSaving(true);
    const combinedLink = `${meetingLink}|${agendaStart}|${agendaEnd}|${disabledDates.join(",")}`;
    const { error } = await supabase.from("profiles").update({
      phone,
      meeting_link: combinedLink,
      meeting_duration: meetingDuration
    }).eq("id", profile.id);

    setSaving(false);
    if (error) showAlert("Error", "Error guardando perfil: " + error.message);
    else showAlert("Éxito", "Configuración guardada correctamente.");
  };

  const addAvailability = async () => {
    const { data, error } = await supabase.from("availabilities").insert({
      mentor_id: profile.id,
      day_of_week: newDay,
      start_time: newStart,
      end_time: newEnd
    }).select().single();

    if (error) {
      showAlert("Error", "Error agregando horario: " + error.message);
    } else if (data) {
      setAvailabilities(prev => [...prev, data]);
    }
  };

  const removeAvailability = async (id: string) => {
    const { error } = await supabase.from("availabilities").delete().eq("id", id);
    if (!error) {
      setAvailabilities(prev => prev.filter(a => a.id !== id));
    }
  };

  const requestCancelAppointment = (id: string) => {
    setPopup({
      isOpen: true,
      type: 'confirm',
      title: 'Cancelar Cita',
      message: '¿Seguro que deseas cancelar esta cita?',
      onConfirm: async () => {
        const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
        if (!error) {
          setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a));
        } else {
          showAlert("Error", "Error al cancelar cita: " + error.message + " (Problema de Permisos RLS)");
        }
      }
    });
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Cargando agenda...</div>;

  return (
    <div className="dashboard-view active">
      <h2 className="art-text" style={{ fontSize: "2.8rem", marginBottom: "40px", color: "var(--text-main)" }}>
        Mi <span style={{ color: "var(--brand-secondary)" }}>Agenda.</span>
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "30px" }}>
        
        {/* Link Público y Configuración */}
        <div className="stat-card" style={{ padding: "30px" }}>
          <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "20px" }}>Link Público (Agendamiento)</h3>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "var(--bg-page)", padding: "12px", borderRadius: "12px", border: "1px solid var(--glass-border)", marginBottom: "30px" }}>
            <input type="text" readOnly value={publicLink} style={{ flex: 1, background: "transparent", border: "none", color: "var(--text-main)", outline: "none", fontSize: "0.9rem" }} />
            <button onClick={copyLink} style={{ background: "var(--brand-secondary)", border: "none", padding: "8px", borderRadius: "8px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title="Copiar link">
              <Copy size={16} />
            </button>
          </div>

          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "15px" }}>Configuración Base</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "5px" }}><Phone size={14}/> WhatsApp Notificaciones</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+57 300 000 0000" style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "var(--bg-page)", border: "1px solid var(--glass-border)", color: "var(--text-main)" }} />
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "5px" }}><Video size={14}/> Link de Reunión (Teams/Zoom)</label>
              <input type="url" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://teams.microsoft.com/..." style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "var(--bg-page)", border: "1px solid var(--glass-border)", color: "var(--text-main)" }} />
            </div>
            
            <div style={{ marginBottom: "20px", marginTop: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "15px" }}><CalIcon size={14}/> Rango de Fechas Disponibles</label>
              <CustomRangeCalendar 
                startDate={agendaStart} 
                endDate={agendaEnd} 
                disabledDates={disabledDates} 
                onChange={(s, e, d) => { setAgendaStart(s); setAgendaEnd(e); setDisabledDates(d); }} 
              />
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "5px" }}><Clock size={14}/> Duración por cita (Minutos)</label>
              <input type="number" value={meetingDuration} onChange={e => setMeetingDuration(Number(e.target.value))} min={15} step={15} style={{ width: "100%", padding: "12px", borderRadius: "12px", background: "var(--bg-page)", border: "1px solid var(--glass-border)", color: "var(--text-main)" }} />
            </div>
          </div>
          
          <button onClick={saveProfileSettings} disabled={saving} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "0.9rem" }}>
            {saving ? "Guardando..." : "Guardar Configuración"}
          </button>
        </div>

        {/* Disponibilidad */}
        <div className="stat-card" style={{ padding: "30px" }}>
          <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "20px" }}>Horarios Disponibles</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "25px", maxHeight: "300px", overflowY: "auto" }}>
            {availabilities.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No has definido horarios. Tu link aparecerá sin disponibilidad.</p>
            ) : (
              availabilities.map(av => (
                <div key={av.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 15px", background: "var(--bg-page)", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--brand-secondary)" }}></div>
                    <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>{DAYS[av.day_of_week]}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>{av.start_time.substring(0,5)} - {av.end_time.substring(0,5)}</span>
                  </div>
                  <button onClick={() => removeAvailability(av.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}><Trash2 size={16} /></button>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: "20px", background: "var(--bg-page)", borderRadius: "16px", border: "1px solid var(--glass-border)" }}>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 800, marginBottom: "15px", color: "var(--text-main)" }}>Añadir nuevo bloque</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
              <select value={newDay} onChange={e => setNewDay(Number(e.target.value))} style={{ gridColumn: "1 / -1", padding: "10px", borderRadius: "10px", border: "1px solid var(--glass-border)", background: "var(--bg-card)", color: "var(--text-main)", outline: "none" }}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} style={{ padding: "10px", borderRadius: "10px", border: "1px solid var(--glass-border)", background: "var(--bg-card)", color: "var(--text-main)", outline: "none" }} />
              <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={{ padding: "10px", borderRadius: "10px", border: "1px solid var(--glass-border)", background: "var(--bg-card)", color: "var(--text-main)", outline: "none" }} />
            </div>
            <button onClick={addAvailability} className="btn-secondary" style={{ width: "100%", justifyContent: "center", padding: "0.8rem", fontSize: "0.9rem" }}>
              <Plus size={16} /> Añadir Bloque
            </button>
          </div>
        </div>

      </div>

      {/* Próximas Citas */}
      <h3 className="art-text" style={{ fontSize: "2rem", marginTop: "40px", marginBottom: "25px", color: "var(--text-main)" }}>
        Próximas <span style={{ color: "var(--brand-secondary)" }}>Reuniones.</span>
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {appointments.filter(a => a.status === "confirmed" && new Date(a.appointment_date) >= new Date()).length === 0 ? (
          <div className="stat-card" style={{ textAlign: "center", padding: "50px", border: "1px dashed var(--glass-border)", background: "transparent" }}>
            <CalIcon size={40} style={{ margin: "0 auto 15px", color: "var(--text-muted)", opacity: 0.5 }} />
            <p style={{ color: "var(--text-muted)", fontWeight: 700 }}>No tienes citas pendientes.</p>
          </div>
        ) : (
          appointments.filter(a => a.status === "confirmed" && new Date(a.appointment_date) >= new Date()).map(app => {
            const date = new Date(app.appointment_date);
            return (
              <div key={app.id} className="modern-card" style={{ padding: "25px", display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <span style={{ background: "var(--brand-secondary)", color: "#fff", padding: "4px 10px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
                      {app.guest_talent_type}
                    </span>
                    <span style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "1.1rem" }}>{app.guest_name}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}><strong>Motivo:</strong> {app.reason}</p>
                  <p style={{ margin: "5px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>✉️ {app.guest_phone}</p>
                </div>
                
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--brand-primary)", margin: "0 0 5px" }}>
                    {date.toLocaleDateString("es-ES", { weekday: 'short', day: 'numeric', month: 'short' })} • {date.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 15px" }}>Duración: {app.duration_minutes} min</p>
                  
                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <a href={app.meeting_link || meetingLink || "#"} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: "8px 20px", fontSize: "0.85rem" }}>Ingresar</a>
                    <button onClick={() => requestCancelAppointment(app.id)} className="btn-secondary" style={{ padding: "8px 20px", fontSize: "0.85rem", color: "#ef4444" }}>Cancelar</button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

    
      {/* POPUP MODAL */}
      {popup?.isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)" }}>
          <div className="modern-card" style={{ width: "90%", maxWidth: "400px", padding: "30px", textAlign: "center", animation: "popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text-main)", marginBottom: "15px" }}>{popup.title}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.5, marginBottom: "30px" }}>{popup.message}</p>
            <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
              {popup.type === 'confirm' && (
                <button onClick={() => setPopup(null)} style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-main)", fontWeight: 700, cursor: "pointer", transition: "0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "var(--bg-page)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                  Cancelar
                </button>
              )}
              <button 
                onClick={() => {
                  if (popup.onConfirm) popup.onConfirm();
                  if (popup.type === 'alert') setPopup(null); // auto-close only if alert, confirm closes after action or inside action
                  // wait, onConfirm already calls setPopup(null) if we want, or we close it here.
                  setPopup(null);
                }} 
                className="btn-primary" 
                style={{ padding: "10px 30px", justifyContent: "center", borderRadius: "10px", fontWeight: 800 }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
