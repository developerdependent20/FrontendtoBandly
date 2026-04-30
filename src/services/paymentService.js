import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Servicio para gestionar cobros con Mercado Pago vía Backend de Render.
 */
export const paymentService = {
  /**
   * Crea una preferencia de pago y devuelve la URL del checkout.
   */
  async createCheckout(planId, billingPeriod, userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('[DEBUG] Iniciando pago con:', { planId, billingPeriod, userId, API_URL });
      
      const response = await fetch(`${API_URL}/api/payments/create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ planId, billingPeriod, userId })
      });

      console.log('[DEBUG] Respuesta del servidor:', response.status);
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error || 'Fallo en el pago');

      return data.checkoutUrl;
    } catch (err) {
      console.error('Error al crear checkout:', err);
      alert(`DETALLE DEL ERROR: ${err.message}`);
      throw err;
    }
  },

  /**
   * Abre la URL del checkout de forma segura.
   */
  openCheckout(url) {
    window.open(url, '_blank');
  }
};
