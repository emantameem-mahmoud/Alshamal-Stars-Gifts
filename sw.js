
const CACHE_NAME = 'shamal-rewards-v17';
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
  'cdn-icons-png.flaticon.com',
  'esm.run'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll loosely to prevent failure if one file is missing
      return Promise.all(
        PRECACHE_URLS.map(url => 
          cache.add(url).catch(err => console.warn('Failed to precache:', url, err))
        )
      );
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
  
  // Skip caching for API calls or non-GET requests
  if (event.request.method !== 'GET') return;

  // Network First for HTML and Code to ensure updates
  const isCode = event.request.mode === 'navigate' || 
                 url.pathname.endsWith('.html') || 
                 url.pathname.endsWith('.js') || 
                 url.pathname.endsWith('.tsx') || 
                 url.pathname.endsWith('.ts');

  if (isLocal && isCode) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Verify response is valid before caching
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
             return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Stale-While-Revalidate for Assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache valid responses (200 OK)
        if (networkResponse && networkResponse.status === 200) {
          const isAllowedDomain = CACHE_DOMAINS.some(d => url.hostname === d || url.hostname.endsWith(d));
          // Cache local files (basic) or allowed CORS domains
          if (isLocal || (isAllowedDomain && networkResponse.type === 'cors')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }
        return networkResponse;
      }).catch((e) => {
        // Network failed
        console.warn("Fetch failed", e);
      });

      return cachedResponse || fetchPromise;
    })
  );
});