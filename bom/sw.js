/** Replaced on deploy by scripts/write_build_version.js */
const CACHE = 'bom-2026-09-07T12-46-22';
/** Shell only — verse *.js files are cached at runtime, refreshed in the background (see fetch handler). */
const ASSETS = [
  './bom.html',
  './bom_book_loader.js?v=10',
  './bom_lazy_assets.js?v=3',
  '../reader_surface.js?v=30',
  '../root_scorecard.js?v=93',
  '../root_engine.js?v=38',
  '../root_concordance.js?v=92',
  '../xref_study_panel.css?v=14',
  '../reader.css?v=96',
  '../xref_study_panel.js?v=6',
  /* official_verses.js (1,852 KB) is split per book into english/<book>.js
     by tools/build_crossref_chunks.js and arrives with the book. */
  './scripture_verses.js',
  './chapter_headings.js',
  './chapter_headings_heb.js?v=7',
  './roots_glossary.js?v=71',
  /* crossrefs.js (785 KB) and bom_inverse_crossrefs.js (632 KB) were precached
     here and are no longer fetched by anything: both are split per book into
     crossrefs/<book>.js and inverse_crossrefs/<book>.js by
     tools/build_crossref_chunks.js, and arrive with the book like the verses. */
  './topical_guide.js?v=3',
  './images/cover-dual.jpg?v=2',
  './images/cover-hebrew.jpg?v=4',
  './images/cover-interlinear.jpg?v=5',
  './images/cover-triple.jpg?v=5'
];

function isVerseScript(pathname) {
  /* The cross-reference chunks are the same kind of thing as the verse files —
     generated per-book data, keyed by the deploy — so they take the same
     cache-first-with-background-refresh path instead of falling through to the
     network on every page turn into a new book. */
  return /\/verses\/[^/]+\.js$/i.test(pathname) ||
         /\/(crossrefs|inverse_crossrefs|english)\/[^/]+\.js$/i.test(pathname);
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
