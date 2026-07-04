// Lista blanca de emails con acceso al Panel de Superadmin.
// Configurable vía VITE_SUPER_ADMIN_EMAILS (separado por comas) sin tocar código.
const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || 'dependent.mix@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export const isSuperAdmin = (profile) => {
  return !!profile?.email && SUPER_ADMIN_EMAILS.includes(profile.email.toLowerCase());
};
