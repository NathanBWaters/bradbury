/**
 * Bradbury 1000 — Offline-Capable Service Worker (Stale-While-Revalidate + App Shell Cache)
 * Ensures all 62 pre-baked readings (14 Poems, 14 Stories, 14 Essays, 20 Korea/SF Chronicles)
 * and static /read/day-* pages work seamlessly offline.
 */
const CACHE_NAME = 'bradbury-1000-pwa-v5';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Firebase sign-in handler (proxied to Firebase by vercel.json) must never be cached.
  if (url.pathname.startsWith('/__/')) return;

  // In Vite dev server, always use Network-First for unbundled source modules (/src/, /node_modules/, /@vite/)
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/@')
  ) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Stale-While-Revalidate for app shell, built assets, icons, and /read/* static pages
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || caches.match('/index.html'));

        return cachedResponse || networkFetch;
      })
    )
  );
});
