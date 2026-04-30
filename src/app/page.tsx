"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { ArrowRight, CheckCircle2, Target, Zap, Rocket, Heart } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Home() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [targetPath, setTargetPath] = useState("/login");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          const role = profile?.role || localStorage.getItem("clan_role") || "estudiante";
          setTargetPath(role === "admin" || role === "profesor" ? "/admin" : "/dashboard");
        } catch (e) {
          setTargetPath("/dashboard");
        }
      }
    };
    checkSession();
  }, []);

  const loginLabel = user ? "Ir a la Plataforma" : "Iniciar Sesión";

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .mobile-stack { grid-template-columns: 1fr !important; gap: 40px !important; }
          .mobile-text-center { text-align: center !important; }
          .mobile-hide { display: none !important; }
          .mobile-logo-scale { transform: scale(0.9); transform-origin: left; }
          .responsive-title { font-size: 2.5rem !important; }
          .responsive-hero-title { font-size: 2.8rem !important; }
          .container { padding: 0 20px !important; }
          .mobile-order-1 { order: 1 !important; }
          .mobile-order-2 { order: 2 !important; }
          .full-width-btn { width: 100% !important; justify-content: center !important; }
        }
      `}</style>

      <nav className="navbar-modern">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "0 4%" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }} className="mobile-logo-scale">
            <Logo variant="horizontal" sizeMultiplier={1.3} />
            <span style={{ 
              fontFamily: "var(--font-outfit)", 
              fontSize: "0.8rem", 
              color: "var(--brand-primary)", 
              fontWeight: 900, 
              letterSpacing: "6px", 
              textTransform: "uppercase",
              marginLeft: "20px",
              opacity: 0.9 
            }} className="mobile-hide">
              Platform
            </span>
          </Link>

          <Link href={targetPath} className="btn-primary">
            {loginLabel}
          </Link>
        </div>
      </nav>

      <main style={{ position: "relative" }}>
        <div className="bg-ornaments">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>

        {/* HERO */}
        <header className="hero-wrapper" style={{ paddingTop: "110px", paddingBottom: "110px" }}>
          <div className="container" style={{ position: "relative" }}>
            <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "80px", alignItems: "center" }}>
              <div className="mobile-text-center">
                <span className="hero-tag" style={{ marginBottom: "24px", display: "inline-block" }}>Ecosistema de Alto Rendimiento</span>
                <h1 className="hero-title responsive-hero-title" style={{ textAlign: "left", fontSize: "3.5rem", marginBottom: "32px", letterSpacing: "-2px" }}>
                  Desarrollo integral para <br className="mobile-hide"/>
                  <span className="text-gradient art-text">Jóvenes Talentos</span> <br className="mobile-hide"/>
                  en deporte y artes.
                </h1>
                <p style={{ textAlign: "left", marginBottom: "48px", maxWidth: "620px", color: "var(--text-main)", fontWeight: 500, fontSize: "1.25rem", lineHeight: 1.5 }} className="mobile-text-center">
                  CLAN es un ecosistema diseñado para potenciar el talento mientras continúas tu formación académica.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-start", gap: "20px" }} className="mobile-stack">
                  <a href="#ecosistema" className="btn-primary full-width-btn">Conoce el Modelo</a>
                  <Link href="/login" className="btn-secondary full-width-btn">Entrar ahora</Link>
                </div>
              </div>

              <div className="mobile-order-1">
                <div style={{ background: "var(--brand-primary)", borderRadius: "var(--radius-xl)", padding: "32px", boxShadow: "0 30px 70px rgba(0, 82, 255, 0.3)", position: "relative", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      {[
                        { icon: <Target size={28} />, label: "Talento" },
                        { icon: <Zap size={28} />, label: "Propósito" },
                        { icon: <Target size={28} />, label: "Ecosistema" },
                        { icon: <Heart size={28} />, label: "Comunidad" }
                      ].map((item, idx) => (
                        <div key={idx} style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "12px", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}>
                          {item.icon}
                          <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>{item.label}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ECOSISTEMA */}
        <section id="ecosistema" style={{ padding: "120px 0", background: "transparent" }}>
          <div className="container">
            <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "80px", alignItems: "center" }}>
              <div className="mobile-text-center">
                <h2 className="responsive-title" style={{ fontSize: "2.8rem", fontWeight: 900, marginBottom: "32px", letterSpacing: "-1px", lineHeight: 1.1, color: "var(--text-main)" }}>
                  Un entorno diseñado para el <span className="text-gradient art-text">desarrollo integral</span>.
                </h2>
                <p style={{ fontSize: "1.25rem", color: "var(--text-main)", marginBottom: "40px", lineHeight: 1.6, fontWeight: 500, opacity: 0.9 }}>
                  CLAN es un ecosistema diseñado para el desarrollo integral de jóvenes talentos. Acompañamos a atletas y artistas en la construcción de rutas personalizadas.
                </p>
                <div style={{ display: "grid", gap: "20px" }}>
                  {["Acompañamiento académico", "Formación complementaria", "Comunidad conectada"].map((item) => (
                    <div key={item} style={{ display: "flex", gap: "15px", alignItems: "center" }} className="mobile-text-center">
                        <CheckCircle2 color="var(--brand-primary)" size={20} />
                        <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-main)" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modern-card mobile-order-2" style={{ border: "1px solid var(--brand-primary)", background: "var(--bg-card)", opacity: 0.95 }}>
                <h3 style={{ fontSize: "1.8rem", marginBottom: "24px", fontWeight: 800, color: "var(--brand-primary)" }}>Modelo de Ejecución</h3>
                <p style={{ fontSize: "1.1rem", lineHeight: 1.7, color: "var(--text-muted)", fontWeight: 500 }}>
                  Nuestro modelo integra formación deportiva o artística, acompañamiento académico y desarrollo humano en una comunidad de alto rendimiento.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PILARES */}
        <section id="misión" style={{ padding: "80px 0", background: "transparent" }}>
          <div className="container">
              <div style={{ textAlign: "center", marginBottom: "60px" }}>
                <h2 className="responsive-title" style={{ fontSize: "3rem", fontWeight: 900, marginBottom: "20px" }}>Pilares del Ecosistema</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "1.2rem", fontWeight: 500 }}>Estructura diseñada para el desarrollo del talento.</p>
              </div>
              <div className="pillar-grid mobile-stack">
                {[
                  { title: "Desarrollo Integral", icon: <Target />, desc: "Acompañamiento que integra talento y formación." },
                  { title: "Rutas Personalizadas ⚡", icon: <Zap />, desc: "Construimos el camino hacia el alto rendimiento." },
                  { title: "Comunidad de Talentos 🐺", icon: <Heart />, desc: "Un entorno de crecimiento con talentos reales." },
                  { title: "Entorno de Crecimiento", icon: <Rocket />, desc: "Espacio seguro para la excelencia y disciplina." }
                ].map((pilar, idx) => (
                  <div key={idx} className="pillar-card" style={{ border: "1px solid var(--glass-border)" }}>
                      <div className="pillar-icon">{pilar.icon}</div>
                      <h4 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "16px", color: "var(--text-main)" }}>{pilar.title}</h4>
                      <p style={{ color: "var(--text-muted)", fontWeight: 500, lineHeight: 1.5, fontSize: "0.9rem" }}>{pilar.desc}</p>
                  </div>
                ))}
              </div>
          </div>
        </section>

        {/* SECCIÓN MATEO SILVA */}
        <section style={{ padding: "100px 0", background: "rgba(255,255,255,0.01)", borderTop: "1px solid var(--glass-border)" }}>
          <div className="container">
            <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "80px", alignItems: "center" }}>
              <div className="mobile-order-1" style={{ position: "relative", maxWidth: "480px", margin: "0 auto" }}>
                <div style={{ position: "absolute", bottom: "-20px", right: "-20px", width: "100%", height: "100%", border: "2px solid var(--brand-primary)", borderRadius: "40px", opacity: 0.15, zIndex: 1 }}></div>
                <img src="https://krmopdpfgrlcoldfsefq.supabase.co/storage/v1/object/public/Images/msilva.jpeg" alt="Mateo Silva" style={{ width: "100%", borderRadius: "40px", boxShadow: "0 60px 100px rgba(0,0,0,0.4)", position: "relative", zIndex: 2, objectFit: "cover" }} />
              </div>
              <div className="mobile-text-center">
                <h2 className="art-text responsive-title" style={{ fontSize: "4.5rem", color: "var(--text-main)", marginBottom: "24px", lineHeight: 1.0, letterSpacing: "-3px" }}>CLAN <span style={{ color: "var(--brand-primary)" }}>PLATFORM.</span></h2>
                <p style={{ fontFamily: "var(--font-outfit)", fontSize: "1.2rem", color: "var(--brand-primary)", fontWeight: 900, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "32px" }}>Ecosistema de Formación</p>
                <p style={{ fontSize: "1.2rem", color: "var(--text-muted)", lineHeight: 1.7, fontWeight: 500, maxWidth: "600px" }} className="mobile-text-center">
                  CLAN es un ecosistema diseñado para el desarrollo integral de jóvenes talentos en el deporte y las artes. Acompañamos a atletas y artistas en la construcción de rutas personalizadas que les permitan desarrollar su talento mientras continúan su formación académica.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN TOMAS BELTRAN */}
        <section style={{ padding: "100px 0", background: "rgba(0,82,255,0.02)", borderTop: "1px solid var(--glass-border)", paddingBottom: "140px" }}>
          <div className="container">
            <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
              <div className="mobile-order-2 mobile-text-center">
                <h2 className="art-text responsive-title" style={{ fontSize: "4.5rem", color: "var(--text-main)", marginBottom: "24px", lineHeight: 1.0, letterSpacing: "-3px" }}>ALTO <span style={{ color: "var(--brand-primary)" }}>IMPACTO.</span></h2>
                <p style={{ fontFamily: "var(--font-outfit)", fontSize: "1.2rem", color: "var(--brand-primary)", fontWeight: 900, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "32px" }}>Metodología CLAN</p>
                <p style={{ fontSize: "1.2rem", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: "48px", fontWeight: 500, maxWidth: "600px" }} className="mobile-text-center">
                  Nuestro modelo integra formación deportiva o artística, acompañamiento académico y desarrollo humano dentro de una comunidad que entiende los desafíos y las exigencias de los procesos de alto rendimiento.
                </p>
                <Link href="/login" className="btn-primary full-width-btn" style={{ padding: "1.4rem 4rem", fontSize: "1.2rem", display: "inline-flex", boxShadow: "0 20px 40px rgba(0, 82, 255, 0.3)" }}>
                  Entrar a la plataforma <ArrowRight size={22} style={{ marginLeft: "14px" }} />
                </Link>
              </div>
              <div className="mobile-order-1" style={{ position: "relative", maxWidth: "340px", margin: "0 auto" }}>
                <div style={{ position: "absolute", bottom: "-15px", left: "-15px", width: "100%", height: "100%", border: "2px solid var(--brand-primary)", borderRadius: "30px", opacity: 0.1, zIndex: 1 }}></div>
                <img src="https://krmopdpfgrlcoldfsefq.supabase.co/storage/v1/object/public/Images/tbeltran.jpeg" alt="Tomas Beltran" style={{ width: "100%", borderRadius: "30px", boxShadow: "0 40px 80px rgba(0,0,0,0.3)", position: "relative", zIndex: 2, objectFit: "cover" }} />
              </div>
            </div>
          </div>
        </section>

        <footer style={{ padding: "80px 0", textAlign: "center", borderTop: "1px solid var(--glass-border)", background: "var(--bg-main)" }}>
          <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "30px" }}>
            <Logo variant="horizontal" sizeMultiplier={0.8} />
            <p style={{ opacity: 0.5, fontWeight: 700, letterSpacing: "2px", color: "var(--text-main)", fontSize: "0.85rem" }}>CLAN ECOSYSTEM © 2026</p>
          </div>
        </footer>
      </main>
    </>
  );
}
