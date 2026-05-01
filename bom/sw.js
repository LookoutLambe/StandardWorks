const CACHE = 'bom-v9';
const ASSETS = [
  './bom.html',
  '../xref_study_panel.css',
  '../xref_study_panel.js',
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

// Install: cache all assets, skip waiting immediately
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

// Activate: purge only bom-* caches (leave standard-works-* caches alone)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k =>
        k.startsWith('bom-') && k !== CACHE ? caches.delete(k) : null
      ))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML/JS (always get latest), cache-first for images
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  const url = new URL(e.request.url);
  const isStatic = url.pathname.match(/\.(jpg|jpeg|png|webp|svg|ico|woff2?)$/);

  if (isStatic) {
    // Cache-first for images/fonts
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
  } else {
    // Network-first for HTML/JS — always fetch fresh, fall back to cache offline
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});
