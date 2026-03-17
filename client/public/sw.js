/**
 * Service Worker for ReGen Civics
 * Caches static assets and enables offline browsing
 * Strategy: Cache-first for assets, stale-while-revalidate for API calls
 */

const CACHE_VERSION = 'v3';
const CACHE_NAME = `regen-civics-${CACHE_VERSION}`;
const RUNTIME_CACHE = `regen-civics-runtime-${CACHE_VERSION}`;
const API_CACHE = `regen-civics-api-${CACHE_VERSION}`;

// API cache TTL: 5 minutes
const API_CACHE_TTL_MS = 5 * 60 * 1000;

// Assets to cache on install (critical path)
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
];

// File extensions to cache as static assets
const CACHEABLE_EXTENSIONS = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
];

// API endpoint prefixes to cache with stale-while-revalidate
const CACHEABLE_API_PREFIXES = [
  '/api/trpc/blog.',
  '/api/trpc/opportunities.',
  '/api/trpc/applications.',
  '/api/trpc/forum.',
  '/api/trpc/quests.',
  '/api/trpc/players.',
  '/api/trpc/landProjects.',
  '/api/trpc/community.',
];

function isCacheableApi(pathname) {
  return CACHEABLE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Install event - cache critical assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CRITICAL_ASSETS).catch(() => Promise.resolve());
    })
  );
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== RUNTIME_CACHE &&
            cacheName !== API_CACHE &&
            cacheName.startsWith('regen-civics-')
          ) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Cacheable API endpoints — stale-while-revalidate
  if (url.pathname.startsWith('/api/trpc/') && isCacheableApi(url.pathname)) {
    return event.respondWith(staleWhileRevalidate(request, API_CACHE));
  }

  // Other API requests — network only (auth, mutations, etc.)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Static assets — cache-first with network fallback
  if (isStaticAsset(url.pathname)) {
    return event.respondWith(cacheFirstStrategy(request, RUNTIME_CACHE));
  }

  // HTML pages — network-first with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    return event.respondWith(networkFirstStrategy(request, RUNTIME_CACHE));
  }
});

/**
 * Stale-while-revalidate: serve cached immediately, fetch fresh in background.
 * Respects TTL — don't serve stale data older than API_CACHE_TTL_MS.
 */
function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then((cache) => {
    return cache.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            // Store response with timestamp header
            const headers = new Headers(networkResponse.headers);
            headers.set('sw-cached-at', Date.now().toString());
            const responseToCache = new Response(networkResponse.clone().body, {
              status: networkResponse.status,
              statusText: networkResponse.statusText,
              headers,
            });
            cache.put(request, responseToCache);
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cachedResponse) {
        // Check TTL
        const cachedAt = parseInt(cachedResponse.headers.get('sw-cached-at') || '0', 10);
        const isStale = cachedAt && (Date.now() - cachedAt > API_CACHE_TTL_MS);

        if (!isStale) {
          // Serve cache, revalidate in background
          return cachedResponse;
        }
        // Expired — wait for fresh response, fall back to stale if network fails
        return fetchPromise.then((fresh) => fresh || cachedResponse);
      }

      // No cache — wait for network
      return fetchPromise.then((fresh) => fresh || new Response('Offline', { status: 503 }));
    });
  });
}

/**
 * Cache-first strategy: Try cache first, fallback to network
 * Best for: Static assets, images, fonts
 */
function cacheFirstStrategy(request, cacheName) {
  return caches.match(request).then((response) => {
    if (response) return response;

    return fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(cacheName).then((cache) => cache.put(request, responseToCache));
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
          return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' }),
          });
        });
      });
  });
}

/**
 * Network-first strategy: Try network first, fallback to cache
 * Best for: HTML pages
 */
function networkFirstStrategy(request, cacheName) {
  return fetch(request)
    .then((response) => {
      if (!response || response.status !== 200) return response;
      const responseToCache = response.clone();
      caches.open(cacheName).then((cache) => cache.put(request, responseToCache));
      return response;
    })
    .catch(() => {
      return caches.match(request).then((response) => {
        if (response) return response;
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
        return new Response('Offline - Unable to fetch resource', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' }),
        });
      });
    });
}

/**
 * Check if a URL is a static asset
 */
function isStaticAsset(pathname) {
  return CACHEABLE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

/**
 * Message handler for cache control
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('regen-civics-'))
          .map((cacheName) => caches.delete(cacheName))
      );
    });
  }
});
