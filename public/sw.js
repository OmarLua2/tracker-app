// ============================================================
// Service Worker — Tracker App PWA
// ============================================================
const CACHE_NAME = 'tracker-app-v1';
const ASSETS_TO_CACHE = [
  '/admin',
  '/manifest.json'
];

// Install
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Kalau ada asset gagal, skip
      });
    })
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fallback ke cache
self.addEventListener('fetch', (event) => {
  // Skip API requests (selalu online)
  if (event.request.url.includes('/api/')) return;
  // Skip non-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache response baru
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone).catch(() => {});
        });
        return response;
      })
      .catch(() => {
        // Kalau offline, ambil dari cache
        return caches.match(event.request);
      })
  );
});