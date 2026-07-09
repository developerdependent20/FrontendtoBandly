// Lista blanca de emails con acceso al Panel de Superadmin.
// Configurable vía VITE_SUPER_ADMIN_EMAILS (separado por comas) sin tocar código.

const normalizeEmail = (email) => {
  if (!email) return '';
  let e = email.trim().toLowerCase();
  if (e.endsWith('@gmail.com')) {
    const parts = e.split('@');
    e = parts[0].replace(/\./g, '') + '@' + parts[1];
  }
  return e;
};

const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || 'dependentmix@gmail.com')
  .split(',')
  .map(normalizeEmail)
  .filter(Boolean);

export const isSuperAdmin = (profile) => {
  return !!profile?.email && SUPER_ADMIN_EMAILS.includes(normalizeEmail(profile.email));
};
