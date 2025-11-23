
const CACHE_NAME = 'shamal-rewards-v10';
const ICON_URL = 'https://cdn-icons-png.flaticon.com/512/2903/2903556.png';

// List of assets to pre-cache
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  ICON_URL
];

// Domains allowed for caching (external fonts, icons, libraries)
const CACHE_DOMAINS = [
  'cdn.tailwindcss.com',
  'aistudiocdn.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn-icons-png.flaticon.com'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients immediately
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin;
  const isHTML = event.request.mode === 'navigate' || url.pathname.endsWith('.html');

  // STRATEGY 1: Network First for HTML/App Shell (Ensures updates are seen immediately)
  if (isLocal && isHTML) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // STRATEGY 2: Stale-While-Revalidate for Assets (Libraries, Icons, etc.)
  // Serves from cache for speed, then updates cache in background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const isAllowedDomain = CACHE_DOMAINS.some(d => url.hostname === d);
          if (isLocal || isAllowedDomain) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }
        return networkResponse;
      }).catch(() => {
        // Network failed, nothing to do
      });

      return cachedResponse || fetchPromise;
    })
  );
});