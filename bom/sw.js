/** Replaced on deploy by scripts/write_build_version.js */
const CACHE = 'bom-2026-08-12T03-00-00';
/** Shell only — verse *.js files are always fetched fresh (see fetch handler). */
const ASSETS = [
  './bom.html',
  './bom_book_loader.js?v=7',
  './bom_lazy_assets.js?v=1',
  '../root_scorecard.js?v=2',
  '../root_engine.js?v=1',
  '../root_concordance.js?v=1',
  '../root_concordance_refs.js?v=1',
  '../xref_study_panel.css',
  '../xref_study_panel.js',
  './official_verses.js?v=10',
  './scripture_verses.js',
  './chapter_headings.js',
  './chapter_headings_heb.js',
  './roots_glossary.js',
  './crossrefs.js',
  './bom_inverse_crossrefs.js',
  './topical_guide.js?v=2',
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

// Activate: drop every bom-* cache (PWA may keep several generations)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k =>
        (k === 'bom-v34' || k.startsWith('bom-')) ? caches.delete(k) : null
      ))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  const url = new URL(e.request.url);
  const isStatic = url.pathname.match(/\.(jpg|jpeg|png|webp|svg|ico|woff2?)$/);

  // Verse payloads change often — never serve a stale precached copy when online
  if (isVerseScript(url.pathname)) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(function () {
        return caches.match(e.request);
      })
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
