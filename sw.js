/**
 * Sultan Foods — Service Worker v2.0.0
 * ======================================
 * Cache-first strategy للأصول الثابتة
 * Network-first للبيانات
 */

const CACHE_NAME    = 'sultan-v3.1.0';
const STATIC_CACHE  = 'sultan-static-v3.1.0';
const DATA_CACHE    = 'sultan-data-v3.1.0';

// الملفات التي تُحفظ دائماً offline
const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/pages.css',
  './config/config.js',
  './js/core/events.js',
  './js/core/state.js',
  './js/core/router.js',
  './js/layers/storage.js',
  './js/layers/cart.js',
  './js/layers/favorites.js',
  './js/api/providers/sheets.js',
  './js/api/providers/supabase-client.js',
  './js/api/providers/erp.js',
  './js/api/api.js',
  './js/pages/register.js',
  './js/pages/home.js',
  './js/pages/category.js',
  './js/pages/search.js',
  './js/pages/cart.js',
  './js/pages/favorites.js',
  './js/pages/orders.js',
  './js/pages/profile.js',
  './js/app.js',
  './assets/logo.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap',
];

// ─── Install ──────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] install cache failed:', err))
  );
});

// ─── Activate ─────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Apps Script API → Network ONLY (لا يُحفظ أبداً في الكاش)
  if (url.hostname === 'script.google.com') {
    event.respondWith(fetch(request));
    return;
  }

  // Google Sheets API → Network first, fallback to cache
  if (url.hostname === 'sheets.googleapis.com') {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Google Fonts → Cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // صور خارجية (Imgur, Drive, etc.) → Network first عشان تتحدث دايماً
  const isExternalImage = url.hostname !== self.location.hostname &&
    /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url.pathname);
  if (isExternalImage) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // الملفات الثابتة → Cache first
  if (request.method === 'GET') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

// ─── Strategies ───────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // offline fallback
    const fallback = await caches.match('./offline.html');
    return fallback || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    });
  }
}

// ─── Push Notifications (جاهز للمستقبل) ──────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'سلطان للمواد الغذائية', {
      body:  data.body  || '',
      icon:  data.icon  || './assets/icons/icon-192.png',
      badge: data.badge || './assets/icons/icon-72.png',
      dir:   'rtl',
      lang:  'ar',
      data:  data.url   || './',
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || './')
  );
});
