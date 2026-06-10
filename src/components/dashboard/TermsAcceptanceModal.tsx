"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { ShieldAlert, Check, LogOut, ArrowRight, FileText, ExternalLink } from "lucide-react";

interface TermsAcceptanceModalProps {
  userId: string;
  onAccept: () => void;
}

export default function TermsAcceptanceModal({ userId, onAccept }: TermsAcceptanceModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleAccept = async () => {
    if (!isChecked) return;
    setIsLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          accepted_terms: true,
          accepted_terms_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      onAccept();
    } catch (err: any) {
      console.error("Error aceptando términos:", err);
      setError("No se pudo guardar la aceptación. Por favor, vuelve a intentarlo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("clan_role");
      window.location.href = "/login";
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      window.location.href = "/login";
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(2, 6, 23, 0.85)",
      backdropFilter: "blur(20px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}>
      <div className="modern-card" style={{
        width: "100%",
        maxWidth: "600px",
        padding: "40px",
        background: "var(--bg-card)",
        border: "1px solid var(--brand-secondary)",
        boxShadow: "0 25px 60px rgba(197, 160, 89, 0.15)",
        position: "relative",
        overflow: "hidden",
        borderRadius: "28px"
      }}>
        {/* Subtle glowing aura */}
        <div style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "250px",
          height: "250px",
          background: "var(--brand-secondary)",
          opacity: 0.05,
          filter: "blur(60px)",
          borderRadius: "50%",
          pointerEvents: "none"
        }}></div>

        {/* Icon & Title */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "18px",
            background: "rgba(197, 160, 89, 0.1)",
            color: "var(--brand-secondary)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
            border: "1px solid rgba(197, 160, 89, 0.2)"
          }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--text-main)", marginBottom: "8px", letterSpacing: "-0.5px" }}>
            Actualización Legal Obligatoria
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", fontWeight: 500 }}>
            Para continuar usando CLAN Platform, debes leer y aceptar nuestros términos actualizados de protección de datos personales.
          </p>
        </div>

        {/* Content Briefing */}
        <div style={{
          background: "rgba(0, 0, 0, 0.15)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
          border: "1px solid var(--glass-border)",
          fontSize: "0.9rem",
          lineHeight: "1.6",
          color: "var(--text-main)",
          maxHeight: "220px",
          overflowY: "auto",
        }}>
          <h3 style={{ fontWeight: 800, color: "var(--brand-secondary)", marginBottom: "8px", fontSize: "0.95rem" }}>
            Resumen del Consentimiento (Ley 1581 de 2012):
          </h3>
          <p style={{ marginBottom: "12px", opacity: 0.9 }}>
            Al marcar la casilla y presionar "Aceptar", autorizas a CLAN para el tratamiento de tus datos personales, incluyendo:
          </p>
          <ul style={{ paddingLeft: "16px", marginBottom: "12px", opacity: 0.85, display: "flex", flexDirection: "column", gap: "6px" }}>
            <li><strong>Datos Académicos y Progreso:</strong> Registro de tus materias, avance, asistencias y calificaciones.</li>
            <li><strong>Novedades de Salud:</strong> Recolección voluntaria de informes de novedades médicas y lesiones para adaptar el entrenamiento y velar por tu integridad física.</li>
            <li><strong>Comunicaciones por WhatsApp:</strong> Envío automatizado de avisos, alertas del sistema y reportes académicos al celular registrado.</li>
            <li><strong>Derechos ARCO:</strong> Derecho a actualizar, rectificar y suprimir tus datos de nuestras bases de datos en cualquier momento.</li>
          </ul>
          <div style={{ display: "flex", gap: "15px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--glass-border)" }}>
            <Link href="/terminos" target="_blank" style={{ color: "var(--brand-secondary)", fontWeight: 700, textDecoration: "none", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px" }}>
              <FileText size={14} /> Términos Completos <ExternalLink size={12} />
            </Link>
            <Link href="/politica-privacidad" target="_blank" style={{ color: "var(--brand-secondary)", fontWeight: 700, textDecoration: "none", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "4px" }}>
              <FileText size={14} /> Política de Privacidad <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {/* Checkbox Acceptance */}
        <label style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          cursor: "pointer",
          marginBottom: "28px",
          userSelect: "none"
        }}>
          <div style={{ position: "relative", marginTop: "3px" }}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "6px",
                border: "2px solid var(--brand-secondary)",
                appearance: "none",
                outline: "none",
                background: isChecked ? "var(--brand-secondary)" : "transparent",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            />
            {isChecked && (
              <Check size={14} color="#fff" style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none"
              }} />
            )}
          </div>
          <span style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 600, lineHeight: "1.4" }}>
            He leído, comprendo y acepto en su totalidad los Términos y Condiciones de Uso y la Política de Tratamiento de Datos Personales de CLAN.
          </span>
        </label>

        {error && (
          <div style={{
            padding: "12px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "12px",
            color: "#ef4444",
            fontSize: "0.85rem",
            fontWeight: 600,
            marginBottom: "20px",
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "16px" }}>
          <button
            onClick={handleReject}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "12px",
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#ef4444",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)"; }}
          >
            <LogOut size={16} /> Rechazar y Salir
          </button>
          
          <button
            onClick={handleAccept}
            disabled={!isChecked || isLoading}
            style={{
              flex: 1.3,
              padding: "14px",
              borderRadius: "12px",
              background: isChecked ? "var(--brand-primary)" : "var(--glass-border)",
              border: "none",
              color: isChecked ? "var(--brand-secondary)" : "var(--text-muted)",
              fontSize: "0.95rem",
              fontWeight: 800,
              cursor: isChecked && !isLoading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: isChecked ? "0 8px 20px rgba(41, 46, 63, 0.3)" : "none",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => { 
              if (isChecked && !isLoading) {
                e.currentTarget.style.background = "var(--brand-primary-hover)";
              }
            }}
            onMouseOut={(e) => { 
              if (isChecked && !isLoading) {
                e.currentTarget.style.background = "var(--brand-primary)";
              }
            }}
          >
            {isLoading ? "Guardando..." : "Aceptar y Continuar"}
            <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}
