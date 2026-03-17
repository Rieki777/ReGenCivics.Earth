/**
 * Service Worker for ReGen Civics
 * Caches static assets and enables offline browsing
 * Strategy: Cache-first for assets, network-first for API calls
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `regen-civics-${CACHE_VERSION}`;
const RUNTIME_CACHE = `regen-civics-runtime-${CACHE_VERSION}`;
const API_CACHE = `regen-civics-api-${CACHE_VERSION}`;

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

// API endpoints to cache (with TTL)
const CACHEABLE_API_ENDPOINTS = [
  '/api/trpc/blog.getPosts',
  '/api/trpc/opportunities.list',
  '/api/trpc/applications.getPublic',
];

/**
 * Install event - cache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching critical assets');
      return cache.addAll(CRITICAL_ASSETS).catch((error) => {
        console.warn('[SW] Failed to cache some critical assets:', error);
        // Don't fail the install if some assets are missing
        return Promise.resolve();
      });
    })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== RUNTIME_CACHE &&
            cacheName !== API_CACHE &&
            cacheName.startsWith('regen-civics-')
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
  
  // Claim all clients immediately
  self.clients.claim();
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // API requests - network-first with cache fallback
  if (url.pathname.startsWith('/api/trpc/')) {
    return event.respondWith(networkFirstStrategy(request, API_CACHE));
  }
  
  // Static assets - cache-first with network fallback
  if (isStaticAsset(url.pathname)) {
    return event.respondWith(cacheFirstStrategy(request, RUNTIME_CACHE));
  }
  
  // HTML pages - network-first with cache fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    return event.respondWith(networkFirstStrategy(request, RUNTIME_CACHE));
  }
});

/**
 * Cache-first strategy: Try cache first, fallback to network
 * Best for: Static assets, images, fonts
 */
function cacheFirstStrategy(request, cacheName) {
  return caches.match(request).then((response) => {
    if (response) {
      console.log('[SW] Cache hit:', request.url);
      return response;
    }
    
    console.log('[SW] Cache miss, fetching:', request.url);
    return fetch(request)
      .then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        
        // Clone the response before caching
        const responseToCache = response.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        // Return offline page or cached response
        console.log('[SW] Fetch failed, returning offline response:', request.url);
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Return offline page for HTML requests
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
          
          // Return a generic offline response
          return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
      });
  });
}

/**
 * Network-first strategy: Try network first, fallback to cache
 * Best for: API calls, HTML pages
 */
function networkFirstStrategy(request, cacheName) {
  return fetch(request)
    .then((response) => {
      // Only cache successful responses
      if (!response || response.status !== 200) {
        return response;
      }
      
      // Clone the response before caching
      const responseToCache = response.clone();
      caches.open(cacheName).then((cache) => {
        cache.put(request, responseToCache);
      });
      
      return response;
    })
    .catch(() => {
      // Fallback to cache
      console.log('[SW] Network request failed, checking cache:', request.url);
      return caches.match(request).then((response) => {
        if (response) {
          console.log('[SW] Returning cached response:', request.url);
          return response;
        }
        
        // Return offline page for HTML requests
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
        
        // Return a generic offline response
        return new Response('Offline - Unable to fetch resource', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain',
          }),
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
