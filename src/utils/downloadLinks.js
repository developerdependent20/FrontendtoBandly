// Los instaladores no tienen enlace público: el Centro de Descargas pide uno temporal a
// /api/downloads/:app/:os, que valida el plan en el servidor.

// Qué plan mínimo necesita cada app (el orden de los planes es free < starter < pro < elite).
// Debe coincidir con APP_MIN_PLAN en bandly-backend/index.js.
export const APP_MIN_PLAN = { daw: 'starter', presenter: 'pro', lights: 'elite' };
const PLAN_ORDER = ['free', 'starter', 'pro', 'elite'];
// Una app que no está en la lista nunca se permite (antes daba acceso: su plan
// mínimo salía como -1 y cualquier plan lo superaba).
export const planAllows = (plan, app) => Object.hasOwn(APP_MIN_PLAN, app)
  && PLAN_ORDER.indexOf((plan || 'free').toLowerCase()) >= PLAN_ORDER.indexOf(APP_MIN_PLAN[app]);

export const APPS = {
  daw:       { name: 'Bandly Tracker',       logo: '/logos/daw.png',       minPlanLabel: 'Starter' },
  presenter: { name: 'Bandly Presenter', logo: '/logos/presenter.png', minPlanLabel: 'Pro' },
  lights:    { name: 'Bandly Lights',    logo: '/logos/lights.png',    minPlanLabel: 'Elite' },
};
