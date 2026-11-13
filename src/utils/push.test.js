// Pruebas de la detección de notificaciones push por tipo de dispositivo. Se corren con:
//   node --test src/utils/push.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

// User-Agents reales de cada caso.
const UA = {
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  samsungInternet: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  androidWebView: 'Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36',
  instagramAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 330.0.0.0 Android',
  whatsappIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/24.10.80',
  safariIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  installedIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  chromeDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  firefoxDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  tauri: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0 tauri',
};

// Monta un navegador falso y devuelve el resultado de detectPushEnv().
async function detect({ ua, standalone = false, withApi = true, permission = 'default', platform = 'Win32', touch = 0, protocol = 'https:' }) {
  const nav = { userAgent: ua, platform, maxTouchPoints: touch };
  if (standalone) nav.standalone = true;
  if (withApi) nav.serviceWorker = {};
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true, writable: true });
  const win = { location: { protocol }, matchMedia: () => ({ matches: standalone }) };
  if (withApi) { win.Notification = { permission }; win.PushManager = {}; }
  globalThis.window = win;
  globalThis.Notification = win.Notification;
  const mod = await import('./push.js?' + Math.random());
  return mod.detectPushEnv().kind;
}

test('Chrome Android y Chrome/Firefox de escritorio pueden pedir permiso', async () => {
  assert.equal(await detect({ ua: UA.chromeAndroid }), 'default');
  assert.equal(await detect({ ua: UA.samsungInternet }), 'default');
  assert.equal(await detect({ ua: UA.chromeDesktop }), 'default');
  assert.equal(await detect({ ua: UA.firefoxDesktop }), 'default');
});

test('respeta el permiso ya concedido o bloqueado', async () => {
  assert.equal(await detect({ ua: UA.chromeAndroid, permission: 'granted' }), 'granted');
  assert.equal(await detect({ ua: UA.chromeAndroid, permission: 'denied' }), 'denied');
});

test('navegadores internos (WhatsApp, Instagram, WebView) se detectan como in-app', async () => {
  assert.equal(await detect({ ua: UA.instagramAndroid }), 'in-app');
  assert.equal(await detect({ ua: UA.androidWebView }), 'in-app');
  assert.equal(await detect({ ua: UA.whatsappIOS, withApi: false, platform: 'iPhone' }), 'in-app');
});

test('iPhone en Safari sin instalar pide instalar Bandly primero', async () => {
  assert.equal(await detect({ ua: UA.safariIOS, withApi: false, platform: 'iPhone' }), 'ios-install');
});

test('iPadOS que se anuncia como Mac también cuenta como iOS', async () => {
  const ipadAsMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
  assert.equal(await detect({ ua: ipadAsMac, withApi: false, platform: 'MacIntel', touch: 5 }), 'ios-install');
});

test('iPhone con Bandly instalado (standalone) sí puede pedir permiso', async () => {
  assert.equal(await detect({ ua: UA.installedIOS, standalone: true, platform: 'iPhone' }), 'default');
});

test('navegador sin API de push queda como no soportado', async () => {
  assert.equal(await detect({ ua: UA.chromeDesktop, withApi: false }), 'unsupported');
});

test('la app de escritorio (Tauri) no muestra avisos de push', async () => {
  assert.equal(await detect({ ua: UA.tauri }), 'unsupported');
  assert.equal(await detect({ ua: UA.chromeDesktop, protocol: 'tauri:' }), 'unsupported');
});
