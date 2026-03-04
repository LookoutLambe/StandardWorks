const CACHE_NAME = 'standard-works-v25';

const CORE_ASSETS = [
  '/StandardWorks/index.html',
  '/StandardWorks/ot.html',
  '/StandardWorks/nt.html',
  '/StandardWorks/dc.html',
  '/StandardWorks/pgp.html',
  '/StandardWorks/talks.html',
  '/StandardWorks/study_plans.html',
  '/StandardWorks/manifest.json',
  '/StandardWorks/icons/icon-192.png',
  '/StandardWorks/icons/icon-512.png',
  '/StandardWorks/images/cover-bom.jpg',
  '/StandardWorks/strongs_lookup.js',
  '/StandardWorks/_strongs_lookup.json',
  '/StandardWorks/_supplement.json',
  '/StandardWorks/crossrefs_engine.js'
];

// Install — cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for HTML/JS, cache-first for static assets (images, fonts)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // HTML pages and JS files — always network-first so updates arrive immediately
  // Falls back to cache when offline
  if (url.pathname.match(/\.(html|js|json)$/) || url.pathname.match(/_(verses|cache)\//) || url.pathname.match(/talks_data\//)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets (images, icons, fonts) — cache-first for speed
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
