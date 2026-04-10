const CACHE = 'bom-v2';
const ASSETS = [
  './bom.html',
  './official_verses.js',
  './scripture_verses.js',
  './chapter_headings.js',
  './chapter_headings_heb.js',
  './roots_glossary.js',
  './crossrefs.js',
  './topical_guide.js',
  './verses/frontmatter.js',
  './verses/1nephi.js',
  './verses/2nephi.js',
  './verses/3nephi.js',
  './verses/4nephi.js',
  './verses/alma.js',
  './verses/enos.js',
  './verses/ether.js',
  './verses/helaman.js',
  './verses/jacob.js',
  './verses/jarom.js',
  './verses/mormon.js',
  './verses/moroni.js',
  './verses/mosiah.js',
  './verses/omni.js',
  './verses/words_of_mormon.js',
  './images/cover-dual.jpg',
  './images/cover-hebrew.jpg',
  './images/cover-interlinear.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(
        ASSETS.map(url =>
          cache.add(new Request(url, {cache: 'reload'})).catch(err => {
            console.warn('[SW] Failed to cache:', url, err);
          })
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only handle same-origin requests
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
