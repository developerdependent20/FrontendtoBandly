import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  try {
    const { 
      studentName, 
      semana, 
      corte, 
      clanData, 
      allyData, 
      clanComments, 
      allyComments, 
      reportLink 
    } = await req.json();

    if (!studentName || !semana || !corte) {
      return NextResponse.json({ error: "Faltan datos requeridos (estudiante, semana o corte)." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY environment variable.");
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const prompt = `
Eres el agente educativo de la plataforma CLAN. Tu tarea es generar un mensaje de progreso (Feed) para los padres de un estudiante.

DATOS DEL ESTUDIANTE:
- Nombre: ${studentName}
- Semana Actual: ${semana}
- Corte Actual: ${corte}
- Enlace al reporte completo: ${reportLink}

INFORMACIÓN CLAN (Plataforma Interna):
- Notas materias CLAN: ${JSON.stringify(clanData)}
- Comentarios de los mentores CLAN: ${clanComments || "Sin comentarios adicionales."}

INFORMACIÓN ALIADO (Colegio Americano/Calvert u otro):
- Notas del Aliado: ${JSON.stringify(allyData)}
- Comentarios generales del Aliado: ${allyComments || "Sin comentarios adicionales."}

INSTRUCCIONES DE REDACCIÓN:
Debes generar un mensaje EXACTAMENTE con el siguiente formato, pero reemplazando los corchetes con tu análisis inferido. 

FORMATO OBLIGATORIO:
Buenos dias querida familia

Les comparto el feed correspondiente a la semana ${semana} del corte ${corte}. Por favor revisen el siguiente enlace donde encontrarán el reporte detallado, notas y comentarios sobre el progreso de ${studentName}:
${reportLink}

💡 Comentarios CLAN 
[Aquí debes escribir un párrafo amable resumiendo el progreso en CLAN basándote en las notas enviadas. Si tiene notas bajitas (menores a 60 o 70) o dice "Pend", indícalo y recomiéndale hablar con su mentor. Si un mentor le dejó un comentario específico, menciónalo sutilmente. Sé motivador pero claro con lo que debe mejorar.]

📘 Comentarios – ALIADO
[Aquí debes resumir las notas del aliado. Si notas comentarios del aliado pidiendo sustentar o notas muy bajas, menciónalo como una alerta constructiva. Si no hay notas del aliado aún registradas para este periodo, indícalo educadamente. Sé muy conciso y directo, un solo párrafo de máximo 3 o 4 oraciones.]

REGLAS IMPORTANTES:
- Usa un tono empático, respetuoso y profesional.
- No saludes con hola, empieza exactamente con "Buenos dias querida familia".
- No incluyas información falsa que no esté en los JSON provistos.
- Nunca envíes el JSON puro en el texto, extrae la información relevante (materias bajas, materias excelentes, pendientes) y cuéntala en lenguaje natural.
- Si las notas CLAN están perfectas, felicítalo.
`;

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      temperature: 0.7,
      system: "Eres el agente de notificaciones académicas de CLAN, eres amable, claro y estructurado.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const responseText = msg.content[0].type === "text" ? msg.content[0].text : "";

    return NextResponse.json({ success: true, message: responseText });

  } catch (error: any) {
    console.error("Error generando el feed con IA de Anthropic:", error.message);
    return NextResponse.json({ error: "Ocurrió un error generando el feed con Inteligencia Artificial." }, { status: 500 });
  }
}
