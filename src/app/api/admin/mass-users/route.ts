import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { users } = await req.json();

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        error: "ERROR CRÍTICO: No se ha configurado la SUPABASE_SERVICE_ROLE_KEY en el archivo .env.local. Esta llave maestra es obligatoria para crear usuarios masivamente sin ser bloqueado." 
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (const u of users) {
      const email = u.email?.trim();
      const password = u.password?.toString() || "ClanAcademy2026!";
      const fullName = u.nombre_completo ? u.nombre_completo.trim() : `${u.nombre?.trim() || ""} ${u.apellido?.trim() || ""}`.trim();
      
      if (!email || !fullName) {
        failedCount++;
        errors.push({ email: email || "Sin correo", error: "Faltan datos obligatorios (email o nombre)" });
        continue;
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm for mass upload
        user_metadata: { full_name: fullName }
      });

      if (error) {
        failedCount++;
        errors.push({ email, error: error.message });
      } else if (data.user) {
        // Update profile table
        const profileUpdates = {
          full_name: fullName,
          role: u.rol?.toLowerCase() || "estudiante",
          grade: u.grado?.toString() || "",
          sport: `${u.rama || "Deporte"} - ${u.disciplina || ""}`,
          ally: u.aliado || "",
          student_code: u.codigo_clan || "",
          captain: u.capitan || "",
          is_captain: false
        };

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update(profileUpdates)
          .eq("id", data.user.id);

        if (profileError) {
          failedCount++;
          errors.push({ email, error: "Usuario creado, pero falló el perfil: " + profileError.message });
        } else {
          successCount++;
        }
      }
    }

    return NextResponse.json({ 
      success: successCount, 
      failed: failedCount, 
      errors 
    });

  } catch (err: any) {
    console.error("Mass upload error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
