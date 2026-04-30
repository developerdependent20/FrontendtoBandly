
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  const { messages, contextText } = await req.json();

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

  try {
    const chat = model.startChat({
      history: messages.slice(0, -1).map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    const result = await chat.sendMessage(messages[messages.length - 1].content);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ role: "assistant", content: text });
  } catch (err: any) {
    console.error("Gemini Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
