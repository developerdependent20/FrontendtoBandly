import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { clanTechSystemPrompt } from "./systemPrompt";

import { createClient } from "@supabase/supabase-js";

// Background async process so the API doesn't time out
async function processBroadcastFeeds(config: any) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: students } = await supabase.from('profiles').select('*').eq('role', 'estudiante');
    if (!students) return;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const anthropic = new Anthropic({ apiKey });

    for (const student of students) {
      if (!student.student_code) continue;
      
      // Si el estudiante fue excluido explícitamente, saltar
      if (config.excludedStudents && config.excludedStudents[student.id]) {
         continue;
      }

      // Traer datos consolidados
      const { data: externalGrades } = await supabase.from('external_grades').select('*').eq('user_id', student.id);
      const { data: eventualities } = await supabase.from('eventualities').select('*').eq('student_id', student.id).order('created_at', { ascending: false }).limit(2);
      const { data: submissions } = await supabase.from('submissions').select('*').eq('student_id', student.id).eq('status', 'graded').order('created_at', { ascending: false }).limit(3);

      let reportStr = "[DATOS ACTUALES DEL ESTUDIANTE]\n";
      reportStr += "- Aliado Calvert: " + (externalGrades && externalGrades.length > 0 ? externalGrades.map((g: any) => `${g.subject_code} (${g.current_grade || g.w1 || 'Pendiente'}) - ${g.comments || ''}`).join(', ') : 'Sin avance reciente.') + "\n";
      reportStr += "- Cursos Internos CLAN: " + (submissions && submissions.length > 0 ? submissions.map((s: any) => `Nota: ${s.score}/100. Feedback: ${s.feedback || ''}`).join(' | ') : 'Sin entregas recientes.') + "\n";
      reportStr += "- Eventualidades (Soporte/Disciplina): " + (eventualities && eventualities.length > 0 ? eventualities.map((e: any) => `${e.type}: ${e.description}`).join(' | ') : 'Sin reportes recientes.') + "\n";

      let weekContext = config.week && config.term ? `Actualmente nos encontramos en la ${config.week} del ${config.term}.\n` : "";
      
      let targetsContext = "";
      if (config.expectedCalvert || config.expectedTrikele || config.expectedTyT) {
        targetsContext = `METAS ESPERADAS PARA ESTA SEMANA POR LA ACADEMIA:\n`;
        if (config.expectedCalvert) targetsContext += `- Calvert: ${config.expectedCalvert}\n`;
        if (config.expectedTrikele) targetsContext += `- Trikele: ${config.expectedTrikele}\n`;
        if (config.expectedTyT) targetsContext += `- TyT: ${config.expectedTyT}\n`;
        targetsContext += `Compara el avance actual del estudiante con estas metas para determinar sutilmente si está al día o atrasado en su respectivo aliado.\n`;
      }

      let specialNoteContext = (config.specialNotes && config.specialNotes[student.id]) ? `\n[INSTRUCCIÓN ESPECIAL DEL STAFF PARA ESTE ESTUDIANTE. ÉSTA INSTRUCCIÓN SOBREESCRIBE CUALQUIER OTRA META]: ${config.specialNotes[student.id]}\n` : "";

      const prompt = `Eres la tutora de CLAN. Redacta un reporte semanal de WhatsApp para la familia del estudiante ${student.full_name} basándote en los datos proporcionados.
${weekContext}${targetsContext}${specialNoteContext}
Debes mantener ESTRICTAMENTE la siguiente estructura y formato con emojis. Haz los resúmenes MUY cortos y al grano (1 o 2 oraciones máximo por sección).

Buenas tardes familia 👋🏼
Comparto feed de la ${config.week ? config.week.toLowerCase() : 'semana'} de ${student.full_name}.

Eventualidades: [Resumen MUY corto de eventualidades, o "Sin novedades"] ⚠️

🐺Clan
[Resumen MUY corto del avance en CLAN]

🛡️ Calvert (o Aliado):
[Resumen MUY corto del avance en Calvert/Aliado]

 📝Plan de acción 
1. [Primera recomendación de mejora corta]
2. [Segunda recomendación corta]

Por favor informar de la lectura de este informe y el anterior con un emoji ✨
Link del reporte completo: https://plataformaclan.vercel.app/report/${student.id}

---
Datos para usar:
${reportStr}

Genera únicamente el mensaje, sin saludos extra ni texto adicional tuyo.`;

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 450,
        messages: [{ role: "user", content: prompt }]
      });

      const block = response.content.find((b: any) => b.type === 'text');
      const aiMessage = block ? block.text : "";

      if (aiMessage) {
        try {
           const webhookUrl = process.env.WHATSAPP_BOT_WEBHOOK_URL || 'http://localhost:4000/webhook/send';
           await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ studentCode: student.student_code, message: aiMessage })
           });
        } catch (e) {
           console.error("Error sending to webhook for", student.student_code);
        }
      }
    }
  } catch (error) {
    console.error("Error in processBroadcastFeeds:", error);
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const { messages, studentProfile, action } = payload;

    if (action === "broadcast_feeds") {
      processBroadcastFeeds(payload); // Run in background
      return NextResponse.json({ success: true, message: "Broadcast enqueued" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: apiKey });

    // Dynamic instructions injected on top of the base manual
    const profileDetails = studentProfile 
      ? `Nombre: ${studentProfile.full_name}\nRol: ${studentProfile.role}\nRama/Deporte: ${studentProfile.sport || studentProfile.category || "No especificado"}`
      : "Perfil no especificado";

    const isArtist = studentProfile?.category === "Arte" || studentProfile?.category === "Cultura";
    const audienceNote = isArtist 
      ? "Este talento es un ARTISTA (CLAN Atelier). Usa términos relacionados con el arte, creatividad y expresión."
      : "Este talento es un DEPORTISTA (CLAN Academy/FC). Usa términos relacionados con el deporte, rendimiento y competencia.";

    const customInstructions = `
======================================================
INSTRUCCIONES ESPECÍFICAS PARA CLANTECH (TUTOR VIRTUAL)
======================================================
Adicional a todo el manual base de CLAN (que tienes arriba), AHORA estás operando como **CLANTech**, el Tutor Educativo integrado directamente en la plataforma digital. 

PERFIL DEL TALENTO QUE TE ESTÁ HABLANDO:
${profileDetails}

REGLAS ESTRICTAS PARA CLANTECH:
1. ${audienceNote} Adapta tu lenguaje a su perfil.
2. Eres un tutor, no solo una IA. Tu fuerte es EXPLICAR conceptos académicos o dudas sobre la plataforma de forma ultra-clara.
3. CONCISIÓN EXTREMA: Ahorra tokens. No des discursos largos. Responde directo al punto con máximo 2-3 párrafos cortos.
4. CERO COPIAR Y PEGAR: NUNCA des las respuestas directas a los ejercicios, ni redactes reflexiones para que el alumno solo copie y pegue. Oblígalo a pensar.
5. Usa el conocimiento de CLAN (aliados, horarios, reglas) para guiarlo si pregunta sobre la plataforma.
======================================================
`;

    const finalSystemPrompt = `${clanTechSystemPrompt}\n\n${customInstructions}`;

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

    const stream = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 400,
      system: finalSystemPrompt,
      messages: anthropicMessages,
      stream: true,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    console.error("Anthropic Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
