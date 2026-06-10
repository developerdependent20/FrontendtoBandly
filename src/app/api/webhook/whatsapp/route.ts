import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Conexión admin al backend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { studentCode, message, novedadId } = await req.json();

    if (!studentCode || !message) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // 1. Guardar en la base de datos (Cola) primero
    const { data: queueEntry, error: dbError } = await supabase
      .from("whatsapp_queue")
      .insert({
        student_code: studentCode,
        message: message,
        novedad_id: novedadId || null,
        status: "pending"
      })
      .select()
      .single();

    if (dbError || !queueEntry) {
      console.error("Error guardando en whatsapp_queue:", dbError);
      return NextResponse.json({ error: "Fallo al encolar mensaje" }, { status: 500 });
    }

    const queueId = queueEntry.id;
    const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:4000/webhook/send";

    // 2. Intentar enviarlo inmediatamente
    try {
      const res = await fetch(BOT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentCode, message, novedadId })
      });

      if (!res.ok) {
        // Falló el envío directo. Se queda 'pending'.
        await supabase.from("whatsapp_queue").update({ 
          attempts: 1, 
          last_attempt_at: new Date().toISOString() 
        }).eq("id", queueId);
        
        return NextResponse.json({ success: true, queued: true, error: "Bot offline, mensaje encolado." });
      }

      // 3. Envío exitoso, actualizar estado a sent
      await supabase.from("whatsapp_queue").update({ 
        status: "sent",
        attempts: 1, 
        last_attempt_at: new Date().toISOString() 
      }).eq("id", queueId);

      const data = await res.json();
      return NextResponse.json({ success: true, queued: false, data });

    } catch (fetchError: any) {
      // Fallo de red con el bot. Se queda 'pending'.
      await supabase.from("whatsapp_queue").update({ 
        attempts: 1, 
        last_attempt_at: new Date().toISOString() 
      }).eq("id", queueId);
      
      return NextResponse.json({ success: true, queued: true, error: "Conexión rechazada, mensaje encolado." });
    }

  } catch (error: any) {
    console.error("Error crítico en webhook whatsapp:", error.message);
    return NextResponse.json({ error: "Fallo crítico interno" }, { status: 500 });
  }
}
