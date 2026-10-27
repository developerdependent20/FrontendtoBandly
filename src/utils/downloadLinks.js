// Enlaces de descarga de los instaladores. Cuando un instalador esté publicado, pega aquí su URL
// y el botón correspondiente (landing y Centro de Descargas) pasa de "Próximamente" a descargar.
// url: '' = todavía no disponible.
export const DOWNLOADS = {
  daw:       { windows: '', mac: '' },
  presenter: { windows: '', mac: '' },
  lights:    { windows: '', mac: '' },
};

// Qué plan mínimo necesita cada app (el orden de los planes es free < starter < pro < elite).
export const APP_MIN_PLAN = { daw: 'starter', presenter: 'pro', lights: 'elite' };
const PLAN_ORDER = ['free', 'starter', 'pro', 'elite'];
export const planAllows = (plan, app) => PLAN_ORDER.indexOf((plan || 'free').toLowerCase()) >= PLAN_ORDER.indexOf(APP_MIN_PLAN[app]);

export const APPS = {
  daw:       { name: 'Bandly DAW',       logo: '/logos/daw.png',       minPlanLabel: 'Starter' },
  presenter: { name: 'Bandly Presenter', logo: '/logos/presenter.png', minPlanLabel: 'Pro' },
  lights:    { name: 'Bandly Lights',    logo: '/logos/lights.png',    minPlanLabel: 'Elite' },
};
