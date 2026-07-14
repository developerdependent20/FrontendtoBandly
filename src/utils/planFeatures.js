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
    features: ['Hasta 3 organizaciones', 'Hasta 25 usuarios', '10 GB almacenamiento', 'Charts en PDF', 'Gestión de repertorios', 'Recursos por canción', 'Reproductor en la app'],
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
    features: ['Hasta 10 organizaciones', 'Hasta 75 usuarios', '45 GB almacenamiento', 'Todo lo de Starter', 'Sala de previsualización', 'Player de secuencias']
  },
  {
    id: 'elite',
    name: 'Elite',
    monthly: 37,
    originalMonthly: 79,
    yearly: 310,
    originalYearly: 790,
    features: ['Organizaciones ilimitadas', 'Usuarios ilimitados', '100 GB almacenamiento', 'Todo lo de Pro', 'Roles y permisos', 'Prioridad en soporte', 'Acceso anticipado']
  }
];

export function getPlanById(planId) {
  return PLANS.find(p => p.id === (planId || 'free').toLowerCase()) || PLANS[0];
}
