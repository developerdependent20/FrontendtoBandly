import { createClient } from "./client";

export const trackDailyActivity = async () => {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Get current profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_streak, last_active_date, active_days_history")
      .eq("id", user.id)
      .single();

    if (!profile) return null;

    const todayDateObj = new Date();
    // Convert to ISO Date String YYYY-MM-DD in local time
    const today = todayDateObj.toLocaleDateString('en-CA'); // 'en-CA' forces YYYY-MM-DD
    
    // Si no hay un registro histórico
    let history: string[] = profile.active_days_history || [];
    let currentStreak = profile.current_streak || 0;
    const lastActive = profile.last_active_date;

    // Si ya tuvo actividad hoy, no hacer transacciones innecesarias
    if (lastActive === today && history.includes(today)) {
      return { currentStreak, history };
    }

    // Lógica del Streak
    if (!lastActive) {
      // Primer día de uso en la vida
      currentStreak = 1;
    } else {
      const lastDateObj = new Date(lastActive + 'T00:00:00'); // Tratar como media noche loca
      const diffTime = Math.abs(todayDateObj.getTime() - lastDateObj.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        // Entró el día siguiente correctamente
        currentStreak += 1;
      } else if (diffDays > 1) {
        // Perdió la racha
        currentStreak = 1;
      }
    }

    // Añadir al historial (mantener solo los últimos 14 para no sobrecargar)
    if (!history.includes(today)) {
       history.push(today);
       if (history.length > 14) history.shift();
    }

    // Persistir base de datos
    await supabase.from("profiles").update({
      current_streak: currentStreak,
      last_active_date: today,
      active_days_history: history
    }).eq("id", user.id);

    return { currentStreak, history };

  } catch (error) {
    console.error("Error tracking daily activity:", error);
    return null;
  }
};
