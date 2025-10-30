// self.__WB_MANIFEST

const CACHE_VERSION = 'v86';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;

const FILES_TO_CACHE = [
  '/',
  '/manifest',
];

// Install event: Cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('🚀 Service Worker: Installation Started');
      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(new Request(file, { cache: 'reload' }));
          console.log('✅ Cached Successfully:', file);
        } catch (error) {
          console.warn('❌ Cache Failed:', file, error);
        }
      }
      console.log('🎉 Service Worker: Installation Complete');
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  console.log('💪 Service Worker: Activated');
  return self.clients.claim();
});

// Updated fetch event handler with proper dynamic caching
self.addEventListener('fetch', (event) => {
//   console.log('🚀 Fetch event:', event.request.url);

  // Skip non-GET requests and non-same-origin requests
  if (
    !event.request.url.startsWith(self.location.origin) ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // 🚨 FIX: Skip caching for authentication and dynamic API endpoints
  const url = event.request.url;
  if (
    url.includes('/api/auth/') ||          // NextAuth endpoints
    url.includes('/api/liked-songs') ||     // User-specific data
    url.includes('/_next/static/chunks/') ||// Dynamic chunks
    url.includes('/login') ||               // Login page
    url.includes('/api/download')           // Download endpoints
  ) {
    return; // Let these requests bypass the cache entirely
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // console.log('✅ Serving from Cache:', event.request.url);
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200) {
            console.log('❌ Invalid response:', event.request.url);
            return networkResponse;
          }

          // IMPORTANT: Clone the response before caching
          const responseToCache = networkResponse.clone();

          // Cache the fetched response
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
              // console.log('📥 Cached new resource:', event.request.url);
            })
            .catch((error) => {
              console.error('❌ Cache put failed:', error);
            });

          return networkResponse;
        })
        .catch((error) => {
          console.error('❌ Fetch failed:', error);
          // For PWA, just let the app handle offline gracefully
          // No need to redirect to offline page
          return new Response('Network error', { status: 503 });
        });
    })
  );
});

// Optional: Add a message event handler for cache updates
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (msg.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((cacheNames) =>
        Promise.all(cacheNames.map((name) => caches.delete(name)))
      ).then(() => {
        // Notify clients that caches are cleared
        return self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'CACHES_CLEARED' }));
        });
      })
    );
  }
});