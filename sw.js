// Sultanoo — the new app's service worker (17/10/2026). It replaces the old app's worker at the same address:
//  * removes every old cache (the old worker served the old page from its cache), then reloads open windows once so a
//    customer who had the old app open lands in the new one;
//  * pages: network first, the saved copy (or offline.html) when there is no internet;
//  * the app's files (hashed names under assets/): saved once, served from the device;
//  * the server (another address) always goes to the network — prices, stock and orders are never served from a copy;
//  * phone notifications: shown the same way as before (same payload: title, body, icon, image, url).
const CACHE = 'sultanoo-new-v2';
const SHELL = ['./', './index.html', './offline.html', './manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // only Sultanoo's own caches: the old app's (sultan-static-…, sultan-data-…) and older versions of this one — never the rep app's (same site)
    const old = keys.filter((k) => k !== CACHE && (k.startsWith('sultan-static-') || k.startsWith('sultan-data-') || k.startsWith('sultanoo-')));
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
    if (old.some((k) => k.startsWith('sultan-'))) {   // coming from the old app: open windows move to the new one
      const wins = await self.clients.matchAll({ type: 'window' });
      for (const w of wins) { try { await w.navigate(w.url); } catch (e) { /* the window will get it next time */ } }
    }
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); }
      return res;
    }).catch(async () => (await caches.match('./index.html')) || (await caches.match('./offline.html')) || new Response('offline', { status: 503 })));
    return;
  }
  if (url.pathname.includes('/assets/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { body: event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'سلطانو', {
    body: data.body || '',
    icon: data.icon || './assets/icons/icon-192.png',
    badge: data.badge || './assets/icons/icon-72.png',
    image: data.image || undefined,
    dir: 'rtl', lang: 'ar',
    data: data.url || './',
    vibrate: [100, 50, 100],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data || './'));
});
