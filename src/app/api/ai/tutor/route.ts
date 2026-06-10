import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, contextText } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: apiKey });

    const systemInstruction = `
Eres un Tutor Socrático experto de CLAN. Un estudiante está escribiendo una entrega y tiene dudas sobre su proceso.
Tu objetivo NO es dar respuestas directas, sino guiar al estudiante a través de preguntas poderosas.

Contexto de lo que el estudiante ha escrito hasta ahora: 
"""
${contextText}
"""

Reglas:
1. Analiza lo que el estudiante pregunta en relación con su texto.
2. Ayúdale a identificar si está citando correctamente, si sus afirmaciones son sólidas o si le falta claridad.
3. Usa un tono profesional, inspirador y minimalista. No uses emojis excesivos ni negritas exageradas.
4. Si el estudiante te pide que escribas por él, niégate cortésmente y guíalo para que él lo haga.
`;

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

        const stream = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      system: systemInstruction,
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
