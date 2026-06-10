import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { novedadId, secret } = await req.json();

    if (!novedadId) {
      return NextResponse.json({ error: "Falta el ID de la novedad" }, { status: 400 });
    }

    // Validación básica de seguridad para que nadie más pueda llamar este endpoint
    const expectedSecret = process.env.CLAN_WEBHOOK_SECRET || "clan-secret-123";
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Para modificar la base de datos desde el backend (sin un usuario logueado en sesión)
    // necesitamos inicializar el cliente de Supabase usando el Service Role Key si existe,
    // o al menos las variables de entorno por defecto. 
    // Como las políticas RLS están activas, si usamos el ANON KEY fallará. 
    // Usaremos el SERVICE_ROLE_KEY para bypassear el RLS interno.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase
      .from("novedades")
      .update({ status: "Aprobada" })
      .eq("id", novedadId);

    if (error) {
      console.error("Error al aprobar novedad:", error);
      return NextResponse.json({ error: "Error en la BD" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Novedad aprobada correctamente" });
  } catch (error) {
    console.error("Error procesando webhook de aprobación:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
