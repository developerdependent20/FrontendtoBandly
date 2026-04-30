"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Logo } from "@/components/Logo";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  // Verificar si hay una sesión activa (Supabase la crea automáticamente al hacer clic en el link del correo)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Si no hay sesión, el link puede haber expirado
        // No redirigimos de inmediato para permitir que el usuario vea el mensaje si algo falla
      }
    };
    checkSession();
  }, [supabase]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setSuccess(true);
      // Opcional: Cerrar sesión después de cambiar la clave para forzar nuevo login
      await supabase.auth.signOut();
    } catch (err: any) {
      console.error("Error al restablecer contraseña:", err.message);
      setErrorMsg("Error: El link puede haber expirado. Intenta solicitar uno nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", padding: "20px" }}>
        <div className="modern-card" style={{ width: "100%", maxWidth: "480px", padding: "50px", textAlign: "center" }}>
          <div style={{ background: "rgba(16, 185, 129, 0.1)", width: "80px", height: "80px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 30px" }}>
            <CheckCircle2 size={40} color="#10B981" />
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "12px" }}>¡Contraseña Actualizada!</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: "40px", lineHeight: 1.6 }}>Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tus nuevas credenciales.</p>
          <Link href="/login" className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "18px", borderRadius: "14px", textDecoration: "none" }}>
            Ir al Login <ArrowRight size={20} style={{ marginLeft: "10px" }} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)", padding: "20px", position: "relative", overflow: "hidden" }}>
      {/* Background Ornaments */}
      <div className="bg-ornaments">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="modern-card" style={{ width: "100%", maxWidth: "480px", padding: "50px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ marginBottom: "24px" }}>
            <Logo variant="stacked" sizeMultiplier={1.2} />
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "8px" }}>Nueva Contraseña</h1>
          <p style={{ color: "var(--text-muted)", fontWeight: 500 }}>Escribe tu nueva clave de acceso</p>
        </div>

        <form onSubmit={handleReset}>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.9rem", color: "var(--text-main)", marginBottom: "8px" }}>Nueva Contraseña</label>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "16px 16px 16px 48px", borderRadius: "14px", border: "1px solid var(--glass-border)", fontSize: "1rem", outline: "none", background: "var(--bg-card)", color: "var(--text-main)", fontWeight: 500 }}
                placeholder="Mínimo 6 caracteres"
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

          <div style={{ marginBottom: "32px" }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: "0.9rem", color: "var(--text-main)", marginBottom: "8px" }}>Confirmar Contraseña</label>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: "100%", padding: "16px 16px 16px 48px", borderRadius: "14px", border: "1px solid var(--glass-border)", fontSize: "1rem", outline: "none", background: "var(--bg-card)", color: "var(--text-main)", fontWeight: 500 }}
                placeholder="Repite tu contraseña"
                required 
              />
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: "12px", background: "#FEF2F2", borderRadius: "12px", color: "#B91C1C", fontSize: "0.85rem", fontWeight: 600, marginBottom: "24px", textAlign: "center", border: "1px solid #FEE2E2" }}>
              {errorMsg}
            </div>
          )}

          <button disabled={loading} type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "18px", borderRadius: "14px", fontSize: "1.1rem" }}>
            {loading ? "Actualizando..." : "Restablecer Contraseña"}
          </button>
        </form>
      </div>
    </main>
  );
}
