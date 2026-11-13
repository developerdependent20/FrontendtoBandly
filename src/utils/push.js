// Notificaciones push: detección de qué puede hacer cada dispositivo y cómo pedir el permiso.
//
// Por qué existe: pedir el permiso solo al iniciar sesión (sin que el usuario toque nada) lo
// ignoran Safari/iPhone y Firefox, y Chrome Android a menudo lo silencia. Y en iPhone fuera de
// la app instalada y en los navegadores internos de WhatsApp/Instagram ni siquiera existe
// `window.Notification`, así que antes solo salía "no soportado" sin decir qué hacer.
//
// Tipos de entorno (kind):
//   'granted'     permiso ya concedido
//   'denied'      el usuario lo bloqueó (hay que reactivarlo en el navegador)
//   'default'     se puede pedir ahora (debe ser desde un toque del usuario)
//   'ios-install' iPhone/iPad: hay que instalar Bandly en la pantalla de inicio primero
//   'in-app'      navegador interno de otra app (WhatsApp, Instagram…): abrir en Chrome/Safari
//   'unsupported' el navegador/dispositivo no soporta push (o es la app de escritorio)

const IN_APP_UA = /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Snapchat|TikTok|musical_ly|MicroMessenger|Twitter|LinkedInApp|Pinterest|Line\/|GSA\//i;

export function detectPushEnv() {
  if (typeof window === 'undefined') return { kind: 'unsupported' };

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const isAndroidWebView = /; wv\)/.test(ua) || (/Android/.test(ua) && /Version\/\d/.test(ua) && !/Chrome\/\d/.test(ua));
  // En iOS un WebView (navegador interno) no trae el token "Safari/"; la app instalada tampoco, de ahí `!standalone`.
  const isIOSWebView = isIOS && !standalone && !/Safari\//.test(ua);
  const isDesktopApp = /tauri/i.test(ua) || window.location.protocol === 'tauri:' || '__TAURI__' in window;

  if (isDesktopApp) return { kind: 'unsupported', isIOS, standalone };
  if (IN_APP_UA.test(ua) || isAndroidWebView || isIOSWebView) return { kind: 'in-app', isIOS, standalone };
  if (isIOS && !standalone) return { kind: 'ios-install', isIOS, standalone };

  const hasApi = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  if (!hasApi) return { kind: 'unsupported', isIOS, standalone };

  return { kind: Notification.permission, isIOS, standalone };
}

// Debe llamarse DESDE un clic/toque del usuario: si no, el navegador lo ignora.
export async function requestPush() {
  try {
    const OS = window.OneSignal;
    if (OS && OS.Notifications) {
      await OS.Notifications.requestPermission();
      if (Notification.permission === 'granted' && OS.User && OS.User.PushSubscription && OS.User.PushSubscription.optIn) {
        await OS.User.PushSubscription.optIn().catch(() => {});
      }
    } else if ('Notification' in window) {
      // El SDK de OneSignal no cargó (bloqueador de anuncios, red lenta): al menos pedimos el permiso nativo.
      await Notification.requestPermission();
    }
  } catch (e) {
    console.error('Push permission error:', e);
  }
  return detectPushEnv();
}

// Pasos para instalar Bandly en la pantalla de inicio (iPhone/iPad).
export const IOS_INSTALL_STEPS = [
  'Abre getbandly.com en Safari.',
  "Toca el botón Compartir (el cuadrado con la flecha hacia arriba).",
  "Elige «Agregar a pantalla de inicio».",
  'Abre Bandly desde el ícono nuevo e inicia sesión. Ahí podrás activar las notificaciones.',
];

export async function copyLink() {
  const url = window.location.origin;
  try { await navigator.clipboard.writeText(url); return true; } catch { return false; }
}

// "Ahora no" del aviso: no volver a molestar durante 7 días.
const DISMISS_KEY = 'bandly_push_prompt_dismissed';
const WEEK = 7 * 24 * 3600 * 1000;
export function isPromptDismissed() {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < WEEK; } catch { return false; }
}
export function dismissPrompt() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* sin storage: no pasa nada */ }
}
