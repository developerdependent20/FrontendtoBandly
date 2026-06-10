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
                {/* HERO SPLIT SCREEN */}
        <header style={{ position: "relative", minHeight: "90vh", display: "flex", overflow: "hidden", marginTop: "-80px" }}>
          
          <div style={{ position: "absolute", zIndex: 10, inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", pointerEvents: "none", padding: "20px" }}>
            <h1 className="art-text" style={{ fontSize: "clamp(3rem, 10vw, 8rem)", color: "#fff", lineHeight: 1, textShadow: "0 10px 40px rgba(0,0,0,0.5)", margin: 0, letterSpacing: "-2px", textTransform: "uppercase" }}>
              TALENTO CLAN
            </h1>
            <p style={{ color: "#fff", fontSize: "clamp(1rem, 2vw, 1.5rem)", fontWeight: 700, textShadow: "0 4px 20px rgba(0,0,0,0.5)", marginTop: "10px", textAlign: "center" }}>
              Educación de élite para artistas y deportistas
            </p>
            <div style={{ pointerEvents: "auto", marginTop: "40px", display: "flex", gap: "20px" }}>
              <a href="#ecosistema" className="btn-primary" style={{ padding: "16px 32px", fontSize: "1.1rem" }}>Conoce el Modelo</a>
            </div>
          </div>

          {/* PANEL 1: T. Beltran (Vinotinto) */}
          <div style={{ flex: 1, position: "relative", minHeight: "100%" }}>
             <img src="https://krmopdpfgrlcoldfsefq.supabase.co/storage/v1/object/public/Images/tbeltran.jpeg" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%" }} alt="Atelier" />
             <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(128, 0, 32, 0.6), rgba(128, 0, 32, 0.8))" }}></div>
          </div>

          {/* PANEL 2: Equipo (Verde) */}
          <div style={{ flex: 1, position: "relative", minHeight: "100%" }}>
             <img src="https://krmopdpfgrlcoldfsefq.supabase.co/storage/v1/object/public/Images/WhatsApp%20Image%202026-04-23%20at%2012.35.59%20PM.jpeg" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%" }} alt="Equipo" />
             <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(22, 101, 52, 0.5), rgba(22, 101, 52, 0.7))" }}></div>
          </div>

          {/* PANEL 3: M. Silva (Azul) */}
          <div style={{ flex: 1, position: "relative", minHeight: "100%" }}>
             <img src="https://krmopdpfgrlcoldfsefq.supabase.co/storage/v1/object/public/Images/msilva.jpeg" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%" }} alt="Mariana Silva" />
             <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0, 82, 255, 0.5), rgba(0, 82, 255, 0.7))" }}></div>
          </div>
        </header>

                {/* ACADEMY SECTION */}
        <section id="academy" style={{ background: "#0D3166", padding: "80px 0" }}>
          <div className="container">
            <div style={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: "40px" }}>
              <img src="https://krmopdpfgrlcoldfsefq.supabase.co/storage/v1/object/public/Images/Logotipo.png" alt="Logo CLAN Academy" style={{ width: "80px", filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.3))", opacity: 0.9 }} />
            </div>
            <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }}>
              <div>
                <h2 className="art-text" style={{ color: "white", fontSize: "3.5rem", marginBottom: "20px", lineHeight: 1 }}>CLAN ACADEMY</h2>
                <h3 style={{ color: "white", fontSize: "1.4rem", fontWeight: 700, marginBottom: "30px", lineHeight: 1.6 }}>
                  En CLAN Academy, el rendimiento se construye cada día.
                </h3>
                <p style={{ color: "white", fontSize: "1.1rem", fontWeight: 500, lineHeight: 1.8 }}>
                  Cada entrenamiento, cada desafío físico y cada objetivo trazado hacen parte de un proceso formativo que fortalece la disciplina, la mentalidad competitiva y la excelencia deportiva.
                </p>
                <div style={{ marginTop: "40px" }}>
                  <p style={{ color: "white", fontSize: "1.1rem", fontWeight: 500, lineHeight: 1.8 }}>
                    Cada sesión, cada reto y cada avance forman parte de un proceso integral que desarrolla disciplina, constancia y una mentalidad orientada a superar límites.
                  </p>
                </div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "20px", overflow: "hidden", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                <iframe style={{ width: "100%", height: "100%" }} src="https://www.youtube.com/embed/joiU-D1lNVU?si=GQ6gl9TzNjw2X0JE" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
              </div>
            </div>
          </div>
        </section>

        {/* ATELIER SECTION */}
        <section id="atelier" style={{ background: "#520A10", padding: "0 0 80px 0" }}>
          <div style={{ background: "#C5A059", padding: "15px 0", textAlign: "center", marginBottom: "40px" }}>
             <h2 className="art-text" style={{ color: "#520A10", margin: 0, fontSize: "3rem", fontWeight: 800 }}>CLAN ATELIER</h2>
          </div>
          <div className="container">
            <div style={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: "40px" }}>
               <img src="https://krmopdpfgrlcoldfsefq.supabase.co/storage/v1/object/public/Images/Logotipo%20atelier.png" alt="Logo CLAN Atelier" style={{ width: "80px", filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.5))" }} />
            </div>
            <div className="mobile-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }}>
              <div>
                <p style={{ color: "#C5A059", fontSize: "1.2rem", fontWeight: 500, lineHeight: 1.8, marginBottom: "30px" }}>
                  Un espacio para compartir cómo la disciplina, la empatía y el respeto en nuestra formación artística ayudan a construir artistas íntegros.
                </p>
                <p style={{ color: "#C5A059", fontSize: "1.2rem", fontWeight: 500, lineHeight: 1.8, marginBottom: "40px" }}>
                  La creatividad se vive con respeto, se fortalece con disciplina y se conecta con los demás a través de la empatía.
                </p>
              </div>
              <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "20px", overflow: "hidden", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(197, 160, 89, 0.2)" }}>
                 <iframe style={{ width: "100%", height: "100%" }} src="https://www.youtube.com/embed/rp3WyM6CWdM?si=reY3Ycj_RTQRsfgs" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
              </div>
            </div>
          </div>
        </section>

        {/* FC SECTION */}
        <section id="fc" style={{ background: "#ffffff", padding: "80px 0" }}>
          <div className="container">
            <div style={{ background: "#2B5A36", padding: "60px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: "20px", marginBottom: "60px" }}>
                <h2 className="art-text" style={{ color: "white", fontSize: "4rem", marginBottom: "30px", lineHeight: 1 }}>CLAN FC</h2>
                <p style={{ color: "white", fontSize: "1.2rem", fontWeight: 600, lineHeight: 1.6, margin: 0, textAlign: "center", maxWidth: "800px" }}>
                  Creemos en el fútbol como una herramienta de formación integral. A través del entrenamiento disciplinado, el trabajo en equipo y la pasión por el juego, acompañamos a nuestros jugadores en el desarrollo de su talento, su carácter y su proyecto de vida, dentro y fuera de la cancha!!
                </p>
              </div>

            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <p style={{ color: "#666", fontSize: "1rem", fontWeight: 500, maxWidth: "900px", margin: "0 auto", lineHeight: 1.6 }}>
                Las experiencias compartidas y el crecimiento de una comunidad que se construye día a día desde el compromiso, la pasión y el sentido de pertenencia. Cada recuerdo es testimonio de los procesos, los aprendizajes y los vínculos que dan forma a CLAN FC.
              </p>
            </div>
            
            <div style={{ background: "#f0f0f0", width: "100%", aspectRatio: "16/9", borderRadius: "20px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                 <iframe style={{ width: "100%", height: "100%" }} src="https://www.youtube.com/embed/48bBhGJORtM?si=IsZ3lsKvmpA-on6F" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
            </div>
          </div>
        </section>

        

        <footer style={{ padding: "80px 0", textAlign: "center", borderTop: "1px solid var(--glass-border)", background: "var(--bg-page)" }}>
          <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "30px" }}>
            <Logo variant="horizontal" sizeMultiplier={0.8} />
            <div style={{ display: "flex", gap: "20px", fontSize: "0.9rem", fontWeight: 600 }}>
              <Link href="/terminos" style={{ color: "var(--text-muted)", textDecoration: "none" }} className="hover:text-brand-secondary">
                Términos y Condiciones
              </Link>
              <span style={{ color: "var(--glass-border)" }}>|</span>
              <Link href="/politica-privacidad" style={{ color: "var(--text-muted)", textDecoration: "none" }} className="hover:text-brand-secondary">
                Política de Privacidad
              </Link>
            </div>
            <p style={{ opacity: 0.5, fontWeight: 700, letterSpacing: "2px", color: "var(--text-main)", fontSize: "0.85rem" }}>CLAN ECOSYSTEM © 2026</p>
          </div>
        </footer>
      </main>
    </>
  );
}
