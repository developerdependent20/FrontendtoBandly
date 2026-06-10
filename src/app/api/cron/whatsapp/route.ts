import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Buscar mensajes pendientes con menos de 5 intentos
    const { data: pendingMessages, error } = await supabase
      .from("whatsapp_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 5)
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) throw error;
    if (!pendingMessages || pendingMessages.length === 0) {
      return NextResponse.json({ message: "No hay mensajes en cola." });
    }

    const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:4000/webhook/send";
    let sentCount = 0;
    let failedCount = 0;

    for (const msg of pendingMessages) {
      try {
        const res = await fetch(BOT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentCode: msg.student_code, message: msg.message, novedadId: msg.novedad_id })
        });

        if (res.ok) {
          // Éxito
          await supabase.from("whatsapp_queue").update({
            status: "sent",
            attempts: msg.attempts + 1,
            last_attempt_at: new Date().toISOString()
          }).eq("id", msg.id);
          sentCount++;
        } else {
          // Fallo bot
          await supabase.from("whatsapp_queue").update({
            status: msg.attempts + 1 >= 5 ? "failed" : "pending",
            attempts: msg.attempts + 1,
            last_attempt_at: new Date().toISOString()
          }).eq("id", msg.id);
          failedCount++;
        }
      } catch (err) {
        // Fallo red
        await supabase.from("whatsapp_queue").update({
          status: msg.attempts + 1 >= 5 ? "failed" : "pending",
          attempts: msg.attempts + 1,
          last_attempt_at: new Date().toISOString()
        }).eq("id", msg.id);
        failedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: pendingMessages.length, 
      sent: sentCount, 
      failed: failedCount 
    });

  } catch (error: any) {
    console.error("Error procesando la cola de WhatsApp:", error.message);
    return NextResponse.json({ error: "Fallo crítico interno en el Cron" }, { status: 500 });
  }
}
