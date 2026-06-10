"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Eye, Database, HelpCircle, FileText } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function PoliticaPrivacidadPage() {
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
          <span className="hero-tag" style={{ marginBottom: "16px", display: "inline-block" }}>LEY 1581 DE 2012 (COLOMBIA)</span>
          <h1 className="hero-title" style={{ fontSize: "2.8rem", fontWeight: 900, marginBottom: "12px", letterSpacing: "-1.5px" }}>
            Política de <span className="text-gradient art-text">Privacidad y Datos</span>
          </h1>
          <p style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "1rem" }}>Última actualización: 26 de Mayo, 2026</p>
        </div>

        {/* Legal Text Card */}
        <div className="modern-card" style={{ padding: "40px", border: "1px solid var(--glass-border)", background: "var(--bg-card)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-premium)" }}>
          
          <p style={{ fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "30px", fontWeight: 500 }}>
            Para **CLAN Platform** la privacidad de tu información es una prioridad. Esta política detalla de qué forma recolectamos, almacenamos y procesamos los datos personales de nuestros estudiantes, acudientes y docentes, en estricto cumplimiento de la **Ley 1581 de 2012 (Régimen General de Protección de Datos Personales en Colombia)** y demás decretos reglamentarios.
          </p>

          <hr style={{ borderColor: "var(--glass-border)", marginBottom: "30px" }} />

          {/* Section 1 */}
          <section style={{ marginBottom: "35px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-secondary)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Database size={22} /> 1. Datos que Recolectamos
            </h2>
            <p style={{ color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7, marginBottom: "12px" }}>
              Recolectamos información necesaria para la gestión y seguimiento del proceso formativo de los talentos:
            </p>
            <ul style={{ paddingLeft: "24px", color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: "8px" }}>
              <li><strong>Datos de Identificación y Contacto:</strong> Nombre completo, correo electrónico, nombre de usuario y número de teléfono celular (WhatsApp) de estudiantes y acudientes.</li>
              <li><strong>Información Académica:</strong> Registro de asistencia, calificaciones, entregas de proyectos, retroalimentaciones y progresos en cursos de Deporte y Arte.</li>
              <li><strong>Datos de Salud e Historial Médico (Sensibles):</strong> Reportes de lesiones físicas, estado de salud o restricciones de rendimiento cargados en la sección de Novedades Médicas.</li>
              <li><strong>Registro de Medios:</strong> Fotografías, videos o grabaciones de los estudiantes recopiladas durante las actividades artísticas o deportivas.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section style={{ marginBottom: "35px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-secondary)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Eye size={22} /> 2. Finalidad del Tratamiento
            </h2>
            <p style={{ color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7, marginBottom: "12px" }}>
              Tus datos personales y de salud son tratados con las siguientes finalidades:
            </p>
            <ul style={{ paddingLeft: "24px", color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>Gestionar y personalizar la experiencia académica del estudiante en CLAN Platform.</li>
              <li>Ajustar rutinas de entrenamiento o actividades según los reportes médicos registrados, previniendo lesiones y salvaguardando la integridad física.</li>
              <li>Enviar notificaciones rápidas, resúmenes académicos y alertas urgentes al celular registrado a través de nuestro bot de WhatsApp.</li>
              <li>Exhibir evidencias del avance de los estudiantes en paneles administrativos o galerías del ecosistema de manera autorizada.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section style={{ marginBottom: "35px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-secondary)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Shield size={22} /> 3. Protección de Datos Sensibles e Información de Menores
            </h2>
            <p style={{ color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7, marginBottom: "12px" }}>
              En consonancia con la normatividad colombiana, cuando se traten datos sensibles (como la información de salud o registros de menores de edad):
            </p>
            <div style={{ background: "rgba(197, 160, 89, 0.08)", padding: "16px", borderRadius: "12px", borderLeft: "4px solid var(--brand-secondary)", color: "var(--text-main)", fontSize: "0.9rem", fontWeight: 500, display: "flex", flexDirection: "column", gap: "10px", lineHeight: 1.6 }}>
              <p>
                • El suministro de datos sensibles es **totalmente facultativo** para el usuario. No obstante, registrar las novedades de salud es sumamente recomendado para su protección en las prácticas físicas.
              </p>
              <p>
                • En caso de estudiantes menores de edad, esta política y el consentimiento adjunto deberán ser validados o coordinados bajo el conocimiento y supervisión de sus acudientes o representantes legales.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section style={{ marginBottom: "35px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-secondary)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <FileText size={22} /> 4. Derechos de los Titulares (Habeas Data)
            </h2>
            <p style={{ color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7, marginBottom: "12px" }}>
              Como titular de los datos personales, tienes derecho a:
            </p>
            <ul style={{ paddingLeft: "24px", color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7, display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>Conocer, actualizar, rectificar y suprimir tus datos personales de las bases de datos de CLAN.</li>
              <li>Solicitar prueba del consentimiento otorgado para el tratamiento de tus datos.</li>
              <li>Presentar ante la Superintendencia de Industria y Comercio (SIC) quejas por infracciones a lo dispuesto en la Ley 1581 de 2012.</li>
              <li>Revocar la autorización del tratamiento de datos en caso de que consideres que no se han respetado los principios legales establecidos.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section style={{ marginBottom: "35px" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--brand-secondary)", display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <HelpCircle size={22} /> 5. Canales de Atención
            </h2>
            <p style={{ color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.7 }}>
              Para ejercer cualquiera de tus derechos de Habeas Data (consultas, reclamos, solicitudes de actualización o supresión de datos), puedes dirigirte al correo institucional de soporte de CLAN o comunicarte por medio del canal principal de WhatsApp de atención al usuario.
            </p>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer style={{ padding: "40px 0", textAlign: "center", borderTop: "1px solid var(--glass-border)", background: "var(--bg-page)", marginTop: "auto", zIndex: 10 }}>
        <p style={{ opacity: 0.5, fontWeight: 700, letterSpacing: "2px", color: "var(--text-main)", fontSize: "0.8rem" }}>CLAN ECOSYSTEM © 2026</p>
      </footer>
    </main>
  );
}
