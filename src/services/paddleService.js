// ── Paddle Billing: checkout overlay (Paddle.js) ──
// A diferencia de Mercado Pago (que devolvía una URL para redirigir), Paddle
// abre un overlay de checkout directo en la página vía Paddle.js. El backend
// solo necesita el webhook (ver bandly-backend/index.js) para activar el plan.

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
   */
  async openCheckout(planId, billingPeriod, userId, email) {
    const priceId = PADDLE_PRICE_IDS[planId]?.[billingPeriod];
    if (!priceId) throw new Error(`Plan/periodo no válido: ${planId} (${billingPeriod})`);

    await ensurePaddleReady();

    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: email ? { email } : undefined,
      customData: { userId },
      settings: {
        successUrl: `${window.location.origin}${window.location.pathname}?paddle=success`,
      },
    });
  },
};
