// ── Paddle Billing: checkout overlay (Paddle.js) ──
// A diferencia de Mercado Pago (que devolvía una URL para redirigir), Paddle
// abre un overlay de checkout directo en la página vía Paddle.js. El backend
// solo necesita el webhook (ver bandly-backend/index.js) para activar el plan.
// En escritorio el checkout no corre dentro de la app: Paddle solo acepta
// dominios aprobados, así que se abre getbandly.com en el navegador.

import { openUrl } from '@tauri-apps/plugin-opener';
import { isTauri } from '../utils/tauri';

const WEB_APP_URL = 'https://getbandly.com';
const PENDING_CHECKOUT_KEY = 'bandly_pending_checkout';
const PENDING_CHECKOUT_TTL_MS = 60 * 60 * 1000;

const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || 'live_db644114e852757ba1f49f2cfa7';

// Debe coincidir 1:1 con PADDLE_PRICE_MAP en bandly-backend/index.js
const PADDLE_PRICE_IDS = {
  starter: { monthly: 'pri_01kxa5x9fphr7ja5gy7fntqqh6', yearly: 'pri_01kxa5x9mhtcvz9md9g8rcrj7e' },
  pro: { monthly: 'pri_01kxa5xa0crayczzq92bkva8ap', yearly: 'pri_01kxa5xa4wr05jh3hg3145mrzw' },
  elite: { monthly: 'pri_01kxa5xafh39z0pbx8fqqhf1zn', yearly: 'pri_01kxa5xam5bg2q7kcmxaez5k6t' },
};

let paddleLoadPromise = null;

function loadPaddleScript() {
  if (window.Paddle) return Promise.resolve();
  if (paddleLoadPromise) return paddleLoadPromise;

  paddleLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Paddle.js'));
    document.head.appendChild(script);
  });
  return paddleLoadPromise;
}

let initialized = false;
async function ensurePaddleReady() {
  await loadPaddleScript();
  if (!initialized) {
    window.Paddle.Environment.set('production');
    window.Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
    initialized = true;
  }
}

export const paddleService = {
  /**
   * Abre el checkout overlay de Paddle para el plan/periodo elegido.
   * userId viaja en customData para que el webhook sepa a quién activarle el plan.
   * Devuelve 'browser' si el pago se abrió fuera de la app (escritorio).
   */
  async openCheckout(planId, billingPeriod, userId, email) {
    const priceId = PADDLE_PRICE_IDS[planId]?.[billingPeriod];
    if (!priceId) throw new Error(`Plan/periodo no válido: ${planId} (${billingPeriod})`);

    if (isTauri()) {
      await openUrl(`${WEB_APP_URL}/?checkout=${planId}&period=${billingPeriod}`);
      return 'browser';
    }

    await ensurePaddleReady();

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: email ? { email } : undefined,
      customData: { userId },
      settings: {
        successUrl: `${window.location.origin}${window.location.pathname}?paddle=success`,
      },
    });
    return 'overlay';
  },

  /**
   * Guarda el plan de un enlace ?checkout=&period= (viene del escritorio) y limpia
   * la URL. Queda en localStorage para sobrevivir al login y a la confirmación de
   * correo, que puede abrir otra pestaña. Devuelve true si había un plan válido.
   */
  capturePendingCheckout() {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('checkout');
    const billingPeriod = params.get('period');
    if (!planId) return false;

    window.history.replaceState({}, '', window.location.pathname);
    if (!PADDLE_PRICE_IDS[planId]?.[billingPeriod]) return false;

    localStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({ planId, billingPeriod, savedAt: Date.now() }));
    return true;
  },

  /** Devuelve y borra el checkout pendiente, ignorándolo si ya venció. */
  takePendingCheckout() {
    const raw = localStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_CHECKOUT_KEY);
    try {
      const pending = JSON.parse(raw);
      return Date.now() - pending.savedAt < PENDING_CHECKOUT_TTL_MS ? pending : null;
    } catch {
      return null;
    }
  },
};
