/** Stamped on every commit by the pre-commit hook, with the same timestamp
    version.json and service-worker.js's BUILD_ID get. A NEW NAME IS WHAT
    RE-RUNS THE PRECACHE — until 2026-09-09 this line was hand-written and
    the hook did not touch it (it pointed at scripts/write_build_version.js,
    which does not exist), so the list below had been frozen for days and
    every Book of Mormon asset change was served stale. Never hand-edit. */
const CACHE = 'bom-2026-09-11T14-52-17';
/** Shell only — verse *.js files are cached at runtime, refreshed in the background (see fetch handler). */
const ASSETS = [
  './bom.html',
  './bom_book_loader.js?v=11',
  './bom_lazy_assets.js?v=3',
  '../reader_surface.js?v=48',
  '../root_scorecard.js?v=95',
  '../root_engine.js?v=39',
  '../xref_study_panel.css?v=14',
  '../reader.css?v=120',
  '../xref_study_panel.js?v=6',
  '../read_aloud.js?v=33',
  /* root_concordance.js (1.62 MB gzipped) and scripture_verses.js (1.32 MB)
     were precached here and neither has a script tag on this page: the root
     scorecard and ensureScriptureVerses fetch them when a word card or a
     cross-reference is first opened. bom_phrase_breaks.js and imperatives.js
     join stress.js on the cache-first path below. 3.0 MB off every first
     visit and off every commit. */
  /* official_verses.js (1,852 KB) is split per book into english/<book>.js
     by tools/build_crossref_chunks.js and arrives with the book. */
  './chapter_headings.js',
  './chapter_headings_heb.js?v=10',
  './roots_glossary.js?v=73',
  /* crossrefs.js (785 KB) and bom_inverse_crossrefs.js (632 KB) were precached
     here and are no longer fetched by anything: both are split per book into
     crossrefs/<book>.js and inverse_crossrefs/<book>.js by
     tools/build_crossref_chunks.js, and arrive with the book like the verses. */
  './topical_guide.js?v=3',
  './images/cover-dual.jpg?v=2',
  './images/cover-hardcover.jpg?v=3',
  './images/cover-hebrew.jpg?v=5',
  './images/cover-interlinear.jpg?v=5',
  './images/cover-triple.jpg?v=5'
];

function isVerseScript(pathname) {
  /* The cross-reference chunks are the same kind of thing as the verse files —
     generated per-book data, keyed by the deploy — so they take the same
     cache-first-with-background-refresh path instead of falling through to the
     network on every page turn into a new book. */
  return /\/verses\/[^/]+\.js$/i.test(pathname) ||
         /\/stress\.js$/i.test(pathname) ||
         /\/(bom_phrase_breaks|imperatives|root_concordance|root_concordance_refs|attested_forms|scripture_verses)\.js$/i.test(pathname) ||
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
