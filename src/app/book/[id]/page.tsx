"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Logo } from "@/components/Logo";
import { Calendar as CalIcon, Clock, CheckCircle2, User, Phone, Tag, MessageSquare, Video, Mail } from "lucide-react";

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const mentorId = resolvedParams.id;
  const supabase = createClient();
  const [mentor, setMentor] = useState<any>(null);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugErr, setDebugErr] = useState<string | null>(null);

  // Booking state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [success, setSuccess] = useState(false);

  // Guest details
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestTalentType, setGuestTalentType] = useState("estudiante");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchMentorData = async () => {
      // 1. Fetch Mentor Profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", mentorId)
        .single();
      
      if (error) {
         console.error("Error fetching mentor profile:", error);
         setDebugErr(error.message || "Error desconocido");
      }
      if (!profile) {
        setLoading(false);
        return;
      }
      setMentor(profile);

      // 2. Fetch Availabilities
      const { data: avData } = await supabase
        .from("availabilities")
        .select("*")
        .eq("mentor_id", mentorId);
      if (avData) setAvailabilities(avData);

      // 3. Fetch Appointments (to block taken slots)
      const { data: appData } = await supabase
        .from("appointments")
        .select("appointment_date, duration_minutes, status")
        .eq("mentor_id", mentorId)
        .eq("status", "confirmed")
        .gte("appointment_date", new Date().toISOString()); // Only future
      if (appData) setAppointments(appData);

      setLoading(false);
    };

    fetchMentorData();
  }, [mentorId]);

  // Generate next 14 days, filtered by Agenda Start and End dates
  const getNextDays = () => {
    let agendaStart: Date | null = null;
    let agendaEnd: Date | null = null;
    let disabledDates: string[] = [];

    if (mentor?.meeting_link) {
      const parts = mentor.meeting_link.split("|");
      if (parts.length > 1 && parts[1]) agendaStart = new Date(parts[1] + "T00:00:00");
      if (parts.length > 2 && parts[2]) agendaEnd = new Date(parts[2] + "T23:59:59");
      if (parts.length > 3 && parts[3]) disabledDates = parts[3].split(",");
    }

    const days = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      // Filter logic
      if (agendaStart && d < agendaStart) continue;
      if (agendaEnd && d > agendaEnd) continue;

      const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
      if (disabledDates.includes(dateStr)) continue;

      days.push(d);
      if (days.length >= 14) break; // Limit to 14 available days
    }
    return days;
  };

  const getAvailableSlots = (date: Date) => {
    const dayOfWeek = date.getDay();
    const blocks = availabilities.filter(a => a.day_of_week === dayOfWeek);
    
    let slots: string[] = [];
    const duration = mentor?.meeting_duration || 30;

    blocks.forEach(b => {
      let current = new Date(date);
      const [startH, startM] = b.start_time.split(":");
      const [endH, endM] = b.end_time.split(":");
      current.setHours(Number(startH), Number(startM), 0, 0);
      
      const end = new Date(date);
      end.setHours(Number(endH), Number(endM), 0);

      while (current < end) {
        // Check if slot is taken
        const currentIso = current.toISOString();
        const isTaken = appointments.some(app => {
           const appDate = new Date(app.appointment_date);
           const timeDiff = Math.abs(current.getTime() - appDate.getTime()) / (1000 * 60);
           return timeDiff < duration; // Overlaps
        });

        // Don't show past slots for today
        const isPast = current < new Date();

        if (!isTaken && !isPast) {
           slots.push(current.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' }));
        }
        
        current.setMinutes(current.getMinutes() + duration);
      }
    });

    return slots;
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    setSubmitting(true);
    
    const appointmentDate = new Date(selectedDate);
    const [h, m] = selectedTime.split(":");
    appointmentDate.setHours(Number(h), Number(m), 0, 0);

    const cleanMeetingLink = mentor.meeting_link ? mentor.meeting_link.split("|")[0] : "";

    const { error } = await supabase.from("appointments").insert({
      mentor_id: mentorId,
      guest_name: guestName,
      guest_phone: guestPhone,
      guest_talent_type: guestTalentType,
      appointment_date: appointmentDate.toISOString(),
      duration_minutes: mentor?.meeting_duration || 30,
      reason: reason,
      meeting_link: cleanMeetingLink,
      status: "confirmed"
    });

    if (error) {
      alert("Error al agendar: " + error.message);
      setSubmitting(false);
      return;
    }

    // Insert to WhatsApp Queue to notify mentor
    if (mentor.phone) {
      const msg = "¡Hola " + mentor.full_name.split(" ")[0] + "! Tienes una nueva cita.\n\n👤 " + guestName + "\n📅 Fecha: " + appointmentDate.toLocaleDateString("es-ES") + " a las " + selectedTime + "\n💬 Motivo: " + reason + "\n✉️ Correo: " + guestEmail + "\n📱 Teléfono: " + guestPhone;
      
      let phoneFormatted = mentor.phone.replace(/\D/g, '');
      if (phoneFormatted.length === 10) phoneFormatted = "57" + phoneFormatted; // Assume Colombia if 10 digits

      await supabase.from("whatsapp_queue").insert({
        student_code: phoneFormatted,
        message: msg,
        status: "pending"
      });
    }

    // Insert to WhatsApp Queue to notify guest (the student)
    if (guestPhone) {
      const msgGuest = "¡Hola " + guestName.split(" ")[0] + "! Tu cita con " + mentor.full_name + " ha sido confirmada.\n\n📅 Fecha: " + appointmentDate.toLocaleDateString("es-ES") + " a las " + selectedTime + "\n🔗 Link de reunión: " + cleanMeetingLink + "\n\n¡Te esperamos!";
      
      let guestPhoneFormatted = guestPhone.replace(/\D/g, '');
      if (guestPhoneFormatted.length === 10) guestPhoneFormatted = "57" + guestPhoneFormatted;

      await supabase.from("whatsapp_queue").insert({
        student_code: guestPhoneFormatted,
        message: msgGuest,
        status: "pending"
      });
    }

    setSubmitting(false);
    setSuccess(true);
  };

  if (loading) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-page)", color: "var(--text-main)" }}>Cargando agenda...</div>;

  if (!mentor) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0a0b10", color: "#fff", padding: "20px", textAlign: "center" }}>
         <h2>Mentor no encontrado.</h2>
         <p style={{color: "var(--text-muted)", marginTop: "10px"}}>Verifica que el link sea correcto.</p>
         {debugErr && <p style={{color: "#ef4444", marginTop: "20px", fontSize: "0.85rem", background: "rgba(239,68,68,0.1)", padding: "10px", borderRadius: "8px"}}>{debugErr}</p>}
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-page)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div className="modern-card" style={{ maxWidth: "500px", textAlign: "center" }}>
          <CheckCircle2 size={60} style={{ color: "var(--brand-secondary)", margin: "0 auto 20px" }} />
          <h2 className="art-text" style={{ fontSize: "2rem", marginBottom: "15px", color: "var(--text-main)" }}>¡Cita Confirmada!</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "30px", lineHeight: 1.6 }}>Tu reunión con <strong>{mentor.full_name}</strong> ha sido agendada con éxito para el <strong>{selectedDate?.toLocaleDateString("es-ES")}</strong> a las <strong>{selectedTime}</strong>.</p>
          <div style={{ background: "rgba(0,0,0,0.03)", padding: "15px", borderRadius: "12px", border: "1px solid var(--glass-border)", marginBottom: "30px" }}>
             <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-main)" }}>Se le ha notificado automáticamente a tu mentor.</p>
             {mentor.meeting_link && (
               <div style={{ marginTop: "15px", padding: "15px", background: "rgba(197, 160, 89, 0.1)", borderRadius: "8px", border: "1px dashed var(--brand-secondary)" }}>
                 <p style={{ margin: "0 0 5px 0", fontSize: "0.85rem", fontWeight: 700, color: "var(--brand-secondary)", textTransform: "uppercase", letterSpacing: "1px" }}>Link de la Reunión</p>
                 <a href={mentor.meeting_link.split("|")[0]} target="_blank" rel="noreferrer" style={{ color: "var(--text-main)", fontWeight: 800, textDecoration: "none", wordBreak: "break-all", fontSize: "1.1rem" }}>{mentor.meeting_link.split("|")[0]}</a>
               </div>
             )}
          </div>
          <button onClick={() => window.location.reload()} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>Agendar otra cita</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", padding: "40px 20px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "30px", background: "var(--bg-card)", borderRadius: "24px", overflow: "hidden", boxShadow: "var(--shadow-premium)" }}>
        
        {/* Mentor Info Sidebar */}
        <div style={{ flex: "1 1 300px", background: "var(--brand-primary)", padding: "40px", color: "#fff" }}>
          <Logo variant="stacked" sizeMultiplier={0.6} />
          <div style={{ marginTop: "50px" }}>
             <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--brand-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 900, marginBottom: "20px", border: "3px solid rgba(255,255,255,0.2)", overflow: "hidden" }}>
                {mentor.avatar_url ? <img src={mentor.avatar_url} alt="avatar" style={{width: "100%", height: "100%", objectFit: "cover"}} /> : mentor.full_name.substring(0,2).toUpperCase()}
             </div>
             <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "5px", fontWeight: 800 }}>Mentoría y Acompañamiento</p>
             <h1 style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1.1, marginBottom: "20px" }}>{mentor.full_name}</h1>
             <p style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", opacity: 0.9, marginBottom: "15px" }}><Clock size={18} /> {mentor.meeting_duration || 30} minutos</p>
             <p style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", opacity: 0.9 }}><Video size={18} /> Reunión Virtual (Teams)</p>
          </div>
        </div>

        {/* Booking Interface */}
        <div style={{ flex: "2 1 500px", padding: "40px" }}>
          {!formVisible ? (
            <>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text-main)", marginBottom: "20px" }}>Selecciona un Fecha y Hora</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px", marginBottom: "30px" }}>
                {getNextDays().length === 0 || getNextDays().every(date => getAvailableSlots(date).length === 0) ? (
                  <div style={{ gridColumn: "1 / -1", padding: "40px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px dashed var(--glass-border)" }}>
                     <CalIcon size={30} style={{ margin: "0 auto 10px", color: "var(--text-muted)", opacity: 0.5 }} />
                     <p style={{ color: "var(--text-muted)", fontWeight: 700 }}>El mentor no tiene disponibilidad abierta en este momento.</p>
                  </div>
                ) : (
                  getNextDays().map((date, i) => {
                    const slots = getAvailableSlots(date);
                    if (slots.length === 0) return null; // Skip days with no availability
                    const isSelected = selectedDate?.toDateString() === date.toDateString();

                    return (
                      <button 
                        key={i} 
                        onClick={() => setSelectedDate(date)}
                        style={{ padding: "15px 10px", borderRadius: "12px", border: isSelected ? "2px solid var(--brand-secondary)" : "1px solid var(--glass-border)", background: isSelected ? "rgba(197, 160, 89, 0.1)" : "var(--bg-page)", cursor: "pointer", transition: "0.2s" }}
                      >
                        <span style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800, color: isSelected ? "var(--brand-secondary)" : "var(--text-muted)", marginBottom: "5px" }}>{date.toLocaleDateString("es-ES", { weekday: "short" })}</span>
                        <span style={{ display: "block", fontSize: "1.4rem", fontWeight: 900, color: "var(--text-main)" }}>{date.getDate()}</span>
                        <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginTop: "5px" }}>{date.toLocaleDateString("es-ES", { month: "short" })}</span>
                      </button>
                    )
                  })
                )}
              </div>

              {selectedDate && (
                <div style={{ animation: "fadeIn 0.3s ease" }}>
                   <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "15px" }}>Horarios Disponibles para el {selectedDate.toLocaleDateString("es-ES")} <span style={{ color: "var(--brand-secondary)", fontWeight: 700, fontSize: "0.8rem", marginLeft: "5px" }}>(Hora Bogotá / COL)</span>:</p>
                   <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                      {getAvailableSlots(selectedDate).map((time, i) => (
                        <button 
                          key={i} 
                          onClick={() => { setSelectedTime(time); setFormVisible(true); }}
                          className="btn-secondary"
                          style={{ padding: "10px 20px", fontSize: "1rem" }}
                        >
                          {time}
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <button onClick={() => setFormVisible(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", marginBottom: "20px" }}>← Volver al calendario</button>
              
              <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text-main)", marginBottom: "5px" }}>Confirma tu Cita</h2>
              <p style={{ color: "var(--brand-secondary)", fontWeight: 800, marginBottom: "30px" }}>{selectedDate?.toLocaleDateString("es-ES")} a las {selectedTime} (Hora Bogotá)</p>
              
              <form onSubmit={handleBook} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}><User size={14}/> Nombre Completo</label>
                  <input required type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Ej. Mariana Pajón" style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "var(--bg-page)", border: "1px solid var(--glass-border)", color: "var(--text-main)", fontSize: "1rem" }} />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}><Mail size={14}/> Correo Electrónico</label>
                  <input required type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="estudiante@correo.com" style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "var(--bg-page)", border: "1px solid var(--glass-border)", color: "var(--text-main)", fontSize: "1rem" }} />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}><Phone size={14}/> Número de WhatsApp (Te notificaremos por aquí)</label>
                  <input required type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+57 300 000 0000" style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "var(--bg-page)", border: "1px solid var(--glass-border)", color: "var(--text-main)", fontSize: "1rem" }} />
                </div>

                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}><MessageSquare size={14}/> Motivo de la Cita</label>
                  <textarea required value={reason} onChange={e => setReason(e.target.value)} placeholder="Por favor indícame sobre qué quieres que hablemos en esta sesión..." rows={4} style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "var(--bg-page)", border: "1px solid var(--glass-border)", color: "var(--text-main)", fontSize: "1rem", resize: "none" }} />
                </div>

                <button type="submit" disabled={submitting} className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "10px", padding: "1.2rem" }}>
                  {submitting ? "Confirmando Cita..." : "Confirmar Cita Ahora"}
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
