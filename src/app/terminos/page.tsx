"use client";

import Link from "next/link";
import { ArrowLeft, Shield, CheckCircle, Smartphone, Award, Heart } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function TerminosPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-page)", color: "var(--text-main)", position: "relative", overflow: "hidden" }}>
      {/* Background Ornaments */}
      <div className="bg-ornaments">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Header */}
      <header style={{ 
        width: "100%", 
        height: "90px", 
        borderBottom: "1px solid var(--glass-border)", 
        backdropFilter: "blur(16px)", 
        position: "sticky", 
        top: 0, 
        zIndex: 100, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: "0 4%" 
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <Logo variant="horizontal" sizeMultiplier={1.1} />
        </Link>
        <Link href="/login" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontWeight: 600, textDecoration: "none" }}>
          <ArrowLeft size={18} /> Volver al Login
        </Link>
      </header>

      {/* Container */}
      <div className="container" style={{ flexGrow: 1, padding: "60px 24px", maxWidth: "900px", zIndex: 10 }}>
        
        {/* Title Block */}
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <span className="hero-tag" style={{ marginBottom: "16px", display: "inline-block" }}>LEGAL & TRANSPARENCIA</span>
          <h1 className="hero-title" style={{ fontSize: "2.8rem", fontWeight: 900, marginBottom: "12px", letterSpacing: "-1.5px" }}>
            Términos y <span className="text-gradient art-text">Condiciones de Uso</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "1rem" }}>Última actualización: 26 de Mayo, 2026</p>
        </div>

        {/* Legal Text Card */}
        <div className="modern-card" style={{ padding: "40px", border: "1px solid var(--glass-border)", background: "var(--bg-card)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-premium)" }}>
          
          <p style={{ fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "30px", fontWeight: 500 }}>
            Bienvenido a **CLAN Platform**. Al acceder y utilizar nuestra plataforma de desarrollo integral para jóvenes talentos, aceptas cumplir con los siguientes términos y condiciones de uso. Por favor, léelos atentamente.
          </p>

          <hr style={{ borderColor: "var(--glass-border)", marginBottom: "30px" }} />

          {/* Section 1 */}
          <section style={{ marginBottom: "35px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-secondary)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Award size={22} /> 1. Propósito de la Plataforma
            </h2>
            <p style={{ color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7 }}>
              CLAN es un ecosistema diseñado para potenciar y acompañar el desarrollo integral de jóvenes atletas y artistas. A través de la plataforma, se realiza el seguimiento académico (calificaciones, avance en módulos), de desarrollo del talento, y de bienestar integral del estudiante.
            </p>
          </section>

          {/* Section 2 */}
          <section style={{ marginBottom: "35px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-secondary)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Heart size={22} /> 2. Registro de Novedades Médicas y Salud
            </h2>
            <p style={{ color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7, marginBottom: "12px" }}>
              Dado que acompañamos el desarrollo de talentos en disciplinas de alta exigencia física (deporte y artes escénicas), la plataforma permite y requiere registrar reportes de novedades médicas, lesiones, incapacidades o particularidades de salud de los alumnos.
            </p>
            <div style={{ background: "rgba(197, 160, 89, 0.08)", padding: "16px", borderRadius: "12px", borderLeft: "4px solid var(--brand-secondary)", color: "var(--text-main)", fontSize: "0.9rem", fontWeight: 500, lineHeight: 1.6 }}>
              <strong>Nota sobre Datos Sensibles:</strong> Esta información médica es de carácter estrictamente confidencial. Se utiliza exclusivamente para adaptar las cargas de entrenamiento, proteger el bienestar del estudiante y notificar a los profesores a cargo.
            </div>
          </section>

          {/* Section 3 */}
          <section style={{ marginBottom: "35px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-secondary)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Smartphone size={22} /> 3. Notificaciones e Integración con WhatsApp
            </h2>
            <p style={{ color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7, marginBottom: "12px" }}>
              Para garantizar una comunicación fluida e inmediata entre el ecosistema, los estudiantes y sus acudientes, CLAN utiliza un canal automatizado de notificaciones vía WhatsApp.
            </p>
            <ul style={{ paddingLeft: "24px", color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>Autorizas el envío de notificaciones automáticas relacionadas con asistencia, calificaciones, y alertas del sistema al número celular registrado.</li>
              <li>Aceptas que el Bot de WhatsApp de CLAN procesará las interacciones y solicitudes enviadas por este canal mediante el uso de inteligencia artificial.</li>
              <li>Es responsabilidad del usuario mantener actualizado su número de contacto en su perfil académico.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section style={{ marginBottom: "35px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-secondary)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Shield size={22} /> 4. Uso de la Cuenta y Seguridad
            </h2>
            <p style={{ color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7 }}>
              Cada cuenta de acceso (estudiante, experto o administrador) es personal e intransferible. El usuario es responsable de mantener la confidencialidad de sus credenciales. Queda prohibido cualquier uso indebido de la plataforma que vulnere la integridad del software, modifique los datos no autorizados o intente burlar las restricciones de seguridad (RLS).
            </p>
          </section>

          {/* Section 5 */}
          <section style={{ marginBottom: "35px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-secondary)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <CheckCircle size={22} /> 5. Modificaciones y Aceptación
            </h2>
            <p style={{ color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7 }}>
              CLAN se reserva el derecho de modificar estos términos en cualquier momento para adaptarlos a nuevas exigencias legales o cambios operativos. El uso continuado de la plataforma tras una modificación constituirá la aceptación de los nuevos términos.
            </p>
          </section>

          {/* Footer Card */}
          <div style={{ marginTop: "40px", paddingTop: "30px", borderTop: "1px solid var(--glass-border)", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: 600 }}>
              Si tienes preguntas sobre nuestros Términos de Uso, por favor contáctanos a través del canal de soporte CLAN.
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: "40px 0", textAlign: "center", borderTop: "1px solid var(--glass-border)", background: "var(--bg-page)", marginTop: "auto", zIndex: 10 }}>
        <p style={{ opacity: 0.5, fontWeight: 700, letterSpacing: "2px", color: "var(--text-main)", fontSize: "0.8rem" }}>CLAN ECOSYSTEM © 2026</p>
      </footer>
    </main>
  );
}
