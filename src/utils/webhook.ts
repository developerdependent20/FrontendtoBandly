/**
 * Utilidad para enviar webhooks al bot local de WhatsApp (Baileys)
 */

export const sendWhatsAppWebhook = async (studentCode: string, message: string) => {
  try {
    // Si la plataforma y el bot están en el mismo servidor/red local, usan localhost:4000
    // En producción, reemplazar localhost por la IP interna o URL del bot
    const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:4000/webhook/send";

    const res = await fetch(BOT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        studentCode,
        message
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Error de Webhook WhatsApp [${res.status}]:`, errorText);
      return { success: false, error: errorText };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    console.error("Fallo de conexión con el Bot de WhatsApp:", err.message);
    return { success: false, error: err.message };
  }
};
