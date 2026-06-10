export function getApiUrl(path: string): string {
  // Use absolute URL if defined (e.g., for Capacitor mobile app)
  // Otherwise use relative path (e.g., for web app running on Vercel)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${cleanPath}`;
}
