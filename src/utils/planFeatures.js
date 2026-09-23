// Catálogo de planes: fuente compartida entre SubscriptionModal (checkout)
// y WelcomeModal (explicación de derechos al primer ingreso), para que
// nunca queden desincronizados entre sí.

export const PLANS = [
  {
    id: 'free',
    name: 'Gratis',
    monthly: 0,
    yearly: 0,
    features: ['1 organización', 'Hasta 10 usuarios', '300 MB almacenamiento', 'Calendario de eventos', 'Repertorios básicos', 'Letras', 'Enlaces de YouTube']
  },
  {
    id: 'starter',
    name: 'Starter',
    monthly: 7,
    originalMonthly: 19,
    yearly: 59,
    originalYearly: 190,
    features: ['Bandly DAW (Windows y Mac)', 'Hasta 3 organizaciones', 'Hasta 25 usuarios', '10 GB almacenamiento', 'Reproductor multitrack en web y celular', 'Charts en PDF y recursos por canción'],
    promo: true,
    recommended: true
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: 17,
    originalMonthly: 39,
    yearly: 145,
    originalYearly: 390,
    features: ['Todo lo de Starter', 'Bandly Presenter (letras en pantalla)', 'Hasta 10 organizaciones', 'Hasta 75 usuarios', '45 GB almacenamiento', 'Sala de previsualización']
  },
  {
    id: 'elite',
    name: 'Elite',
    monthly: 37,
    originalMonthly: 79,
    yearly: 310,
    originalYearly: 790,
    features: ['Todo lo de Pro', 'Bandly Lights (luces DMX/Art-Net)', 'Organizaciones y usuarios ilimitados', '100 GB almacenamiento', 'Roles y permisos', 'Soporte prioritario y acceso anticipado']
  }
];

export function getPlanById(planId) {
  return PLANS.find(p => p.id === (planId || 'free').toLowerCase()) || PLANS[0];
}
