const CACHE_NAME = 'theoligarchy-v3-shell';
const DYNAMIC_CACHE = 'theoligarchy-v3-articles';
const IMAGE_CACHE = 'theoligarchy-v3-images';

const CURRENT_CACHES = [CACHE_NAME, DYNAMIC_CACHE, IMAGE_CACHE];

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png',
  '/logo_highres.png',
  '/apple-touch-icon.png'
];

// Install Event - Pre-cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old legacy caches (purges theoligarchy-v1 and stale dynamic data)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!CURRENT_CACHES.includes(key)) {
            console.log('[ServiceWorker] Purging legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message Event - Allows application/CMS to explicitly invalidate article and image caches
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    if (event.data.type === 'CLEAR_ARTICLE_CACHE') {
      event.waitUntil(
        Promise.all([
          caches.delete(DYNAMIC_CACHE),
          caches.delete(IMAGE_CACHE)
        ]).then(() => {
          console.log('[ServiceWorker] Dynamic article & image caches successfully cleared on publish/save.');
        })
      );
    }
  }
});

// Fetch Event - Strict data freshness with graceful offline support
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Ignore non-GET requests and unsupported protocols
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 2. Ignore server-side proxy API requests (must always hit the server)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Navigation / HTML requests: Network-First with Cache Fallback
  if (req.mode === 'navigate' || (req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned));
          }
          return response;
        })
        .catch(() => {
          return caches.match(req).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // 4. Firestore API Data & Article Deep Links: Network-First with Dynamic Cache Fallback
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.pathname.startsWith('/post/') ||
    url.pathname.startsWith('/article/')
  ) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes.status === 200) {
            const cloned = networkRes.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(req, cloned));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req);
        })
    );
    return;
  }

  // 5. Images (Firebase Storage, Unsplash, Cloudinary, Local Assets):
  // True Stale-While-Revalidate with background cache revalidation
  const isImageRequest = 
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('firebasestorage.app') ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('res.cloudinary.com') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/i);

  if (isImageRequest) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(req).then((cachedResponse) => {
          // Trigger background network fetch to revalidate and update cache
          const networkFetch = fetch(req)
            .then((networkRes) => {
              if (networkRes && networkRes.status === 200) {
                cache.put(req, networkRes.clone());
              }
              return networkRes;
            })
            .catch((err) => {
              // Network error: gracefully fallback to cached response if available
              return cachedResponse;
            });

          // If cached response exists, return it immediately while background fetch revalidates
          // Otherwise, await the network fetch
          return cachedResponse || networkFetch;
        });
      })
    );
    return;
  }

  // 6. Static Script / Style Assets (Vite chunks with content-hashes): Cache-First
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') || url.pathname.match(/\.(css|js|woff2?|ttf)$/i))
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        return cached || fetch(req).then((networkRes) => {
          if (networkRes.status === 200) {
            const cloned = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned));
          }
          return networkRes;
        });
      })
    );
    return;
  }

  // 7. Default: Network-First with Cache Fallback
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes.status === 200) {
          const cloned = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, cloned));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req);
      })
  );
});

