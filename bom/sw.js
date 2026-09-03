/** Replaced on deploy by scripts/write_build_version.js */
const CACHE = 'bom-2026-09-03T21-15-00';
/** Shell only — verse *.js files are cached at runtime, refreshed in the background (see fetch handler). */
const ASSETS = [
  './bom.html',
  './bom_book_loader.js?v=8',
  './bom_lazy_assets.js?v=1',
  '../root_scorecard.js?v=74',
  '../root_engine.js?v=38',
  '../root_concordance.js?v=83',
  '../xref_study_panel.css?v=14',
  '../reader.css?v=75',
  '../xref_study_panel.js?v=6',
  './official_verses.js?v=10',
  './scripture_verses.js',
  './chapter_headings.js',
  './chapter_headings_heb.js?v=7',
  './roots_glossary.js?v=68',
  './crossrefs.js',
  './bom_inverse_crossrefs.js?v=1',
  './topical_guide.js?v=3',
  './images/cover-dual.jpg',
  './images/cover-hebrew.jpg',
  './images/cover-interlinear.jpg',
  './images/cover-triple.jpg'
];

function isVerseScript(pathname) {
  return /\/verses\/[^/]+\.js$/i.test(pathname);
}

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Install: cache shell assets only, skip waiting immediately
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

// Activate: drop every OTHER bom-* cache (PWA may keep several generations)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k =>
        (k !== CACHE && k.startsWith('bom-')) ? caches.delete(k) : null
      ))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  const url = new URL(e.request.url);
  const isStatic = url.pathname.match(/\.(jpg|jpeg|png|webp|svg|ico|woff2?)$/);

  // Verse payloads — from the cache instantly, refreshed in the background. A
  // book is fetched the first time it is read; after that it comes from CACHE
  // while a conditional request updates the copy for the next visit (a 304
  // when nothing changed). CACHE is replaced on every deploy.
  if (isVerseScript(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then(c => c.match(e.request).then(cached => {
        const refresh = fetch(e.request, { cache: 'no-cache' }).then(res => {
          if (res && res.ok) c.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || refresh;
      }))
    );
    return;
  }

  if (isStatic) {
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
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});
