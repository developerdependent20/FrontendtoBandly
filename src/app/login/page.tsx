"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LogIn, Eye, EyeOff, Lock, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      let email = username.trim();
      if (!email.includes("@")) {
        email = `${email}@clanestudiovivo.com`;
      }

      console.log('Iniciando autenticación para:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error de Auth:', error.message);
        setErrorMsg("Credenciales inválidas. Verifica tu usuario.");
        setLoading(false);
        return;
      }

      if (data?.user) {
        console.log('Usuario autenticado, obteniendo perfil...');
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          console.error('Error de Perfil:', profileError.message);
          // Si falla el perfil usamos el rol por defecto
        }

        const userRole = profile?.role || "estudiante";
        console.log('Rol detectado:', userRole);
        localStorage.setItem("clan_role", userRole);
        
        router.refresh(); 
        console.log('Redirigiendo a:', userRole === "admin" ? "/admin" : "/dashboard");
        router.push(userRole === "admin" ? "/admin" : "/dashboard");
      }
    } catch (err: any) {
      console.error('Error crítico en login:', err);
      setErrorMsg("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      // Solo quitamos el loading si NO redirigimos con éxito
      // Aunque router.push no bloquea, a veces es mejor dejar el spinner hasta que cambie de página
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", padding: "20px", position: "relative", overflow: "hidden" }}>
      {/* Background Ornaments */}
      <div className="bg-ornaments">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <Link href="/" style={{ position: "fixed", top: "40px", left: "40px", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontWeight: 600, textDecoration: "none", zIndex: 100 }}>
        <ArrowLeft size={20} /> Volver
      </Link>

      <div className="modern-card" style={{ width: "100%", maxWidth: "480px", padding: "50px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ marginBottom: "24px" }}>
            <Logo variant="stacked" sizeMultiplier={1.2} />
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "8px" }}>Bienvenido</h1>
          <p style={{ color: "var(--text-muted)", fontWeight: 500 }}>Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleAuth}>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.9rem", color: "var(--text-main)", marginBottom: "8px" }}>Usuario</label>
            <div style={{ position: "relative" }}>
              <User size={18} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: "100%", padding: "16px 16px 16px 48px", borderRadius: "14px", border: "1px solid var(--glass-border)", fontSize: "1rem", outline: "none", background: "var(--bg-card)", color: "var(--text-main)", transition: "var(--transition)", fontWeight: 500 }}
                placeholder="nombre_usuario"
                className="input-focus-ring"
                required 
              />
            </div>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-main)" }}>Contraseña</label>
              <a href="#" style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--brand-primary)", textDecoration: "none" }}>¿Olvidaste tu clave?</a>
            </div>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "16px 16px 16px 48px", borderRadius: "14px", border: "1px solid var(--glass-border)", fontSize: "1rem", outline: "none", background: "var(--bg-card)", color: "var(--text-main)", transition: "var(--transition)", fontWeight: 500 }}
                placeholder="••••••••"
                className="input-focus-ring"
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: "12px", background: "#FEF2F2", borderRadius: "12px", color: "#B91C1C", fontSize: "0.9rem", fontWeight: 600, marginBottom: "24px", textAlign: "center", border: "1px solid #FEE2E2" }}>
              {errorMsg}
            </div>
          )}

          <button disabled={loading} type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "18px", borderRadius: "14px", fontSize: "1.1rem" }}>
            {loading ? "Iniciando..." : "Ingresar"}
            <LogIn size={20} style={{ marginLeft: "10px" }} />
          </button>
        </form>
      </div>
    </main>
  );
}
