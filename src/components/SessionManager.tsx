"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function SessionManager() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Tiempo de inactividad: 2 Horas (7200 segundos)
  const INACTIVITY_LIMIT = 2 * 60 * 60 * 1000;

  const handleLogout = async () => {
    console.log("Inactividad detectada. Cerrando sesión...");
    await supabase.auth.signOut();
    localStorage.removeItem("clan_role");
    router.push("/login");
    router.refresh();
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // No activar el timer si ya estamos en el login o landing
    if (pathname === "/login" || pathname === "/") return;

    timerRef.current = setTimeout(handleLogout, INACTIVITY_LIMIT);
  };

  useEffect(() => {
    // Eventos que reiniciarán el contador de actividad
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click"
    ];

    const resetHandler = () => resetTimer();

    // Solo monitorear si el usuario está autenticado (asumimos por ruta protegida)
    if (pathname !== "/login" && pathname !== "/") {
      events.forEach((event) => {
        window.addEventListener(event, resetHandler);
      });
      
      // Iniciar el primer timer
      resetTimer();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetHandler);
      });
    };
  }, [pathname]);

  return null; // Componente invisible
}
