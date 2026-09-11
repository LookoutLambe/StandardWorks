/** Replaced on deploy by scripts/write_build_version.js (GITHUB_SHA). */
const BUILD_ID = '2026-09-11T17-36-59';
const CACHE_NAME = 'standard-works-' + BUILD_ID;
const OFFLINE_CACHE = 'standard-works-offline-v2';

/** Resolve repo-relative paths for both GitHub (/StandardWorks/…) and root domains (sefermormon.com). */
function scopedUrl(legacyPath) {
  var s = String(legacyPath || '');
  var tail = s.replace(/^\/StandardWorks\//, '').replace(/^\//, '');
  try {
    return new URL(tail, self.registration.scope).href;
  } catch (e) {
    return s;
  }
}

// Shell assets — HTML pages + shared infrastructure
// These are small and essential; install fails gracefully if any are unavailable
const CORE_ASSETS = [
    '/StandardWorks/index.html',
    '/StandardWorks/dictionary.html',
    '/StandardWorks/dictionary.js',
    '/StandardWorks/ot.html',
    '/StandardWorks/nt.html',
    '/StandardWorks/dc.html',
    '/StandardWorks/pgp.html',
    '/StandardWorks/jst.html',
    '/StandardWorks/manifest.json',
    '/StandardWorks/manifest.github.json',
    '/StandardWorks/icons/icon-180.png?v=2',
    '/StandardWorks/icons/icon-192.png?v=2',
    '/StandardWorks/icons/icon-512.png?v=2',
    '/StandardWorks/icons/icon-maskable.png?v=2',
    '/StandardWorks/site_chrome.css?v=72',
    /* sw_theme.css was precached here and no page links it — checked in the
       browser, document.styleSheets holds david_libre, nav_engine,
       site_chrome, xref_study_panel and reader, and nothing else. The tokens
       it defines (--here, --highlight, --rule) live in reader.css now. The
       file is left on disk; only the download is removed. */
    '/StandardWorks/site_chrome.js?v=48',
    '/StandardWorks/nav_engine.js?v=86',
    '/StandardWorks/verse_search.js?v=3',
    '/StandardWorks/nav_engine.css?v=50',
    '/StandardWorks/xref_study_panel.css?v=14',
    '/StandardWorks/reader.css?v=120',
    '/StandardWorks/xref_study_panel.js?v=6',
    '/StandardWorks/read_aloud.js?v=33',
    /* The five <vol>_phrase_breaks.js tables and imperatives.js were precached
       here — 208 KB gzipped of which one page can use at most 96 — so every
       volume carried the other four volumes' phrasing. They are the same kind
       of thing as <vol>_stress.js, which was never precached and has always
       come cache-first with a background refresh, so they go the same way. */
    '/StandardWorks/notes_engine.js',
    '/StandardWorks/crossrefs_engine.js',
    '/StandardWorks/root_scorecard.js',
    '/StandardWorks/root_engine.js',
    '/StandardWorks/shoroshim_roots.js',
  '/StandardWorks/reader_core.js',
  '/StandardWorks/reader_surface.js',
  '/StandardWorks/reader_ui.js',
  '/StandardWorks/fonts/david_libre.css',
    /* root_concordance.js (1.62 MB gzipped) and attested_forms.js (0.81 MB)
       were precached here and NO page has a script tag for either: the root
       scorecard fetches them itself the first time a word card is opened
       (root_scorecard.js ensure/ensureStrongs). 2.43 MB off every first
       visit, and off every deploy, for two panels most readers never open. */
    '/StandardWorks/strongs_lookup.js',
    '/StandardWorks/strongs_roots.js',
    '/StandardWorks/interlinear_gloss.js',
    '/StandardWorks/version.json',
    '/StandardWorks/sw_register.js',
    /* The four <vol>_crossrefs.js monoliths were precached here — 2.3 MB, of
       which the OT alone was 1.24 MB — to mark up whichever chapter the reader
       opened. Split per book by tools/build_crossref_chunks.js and fetched
       with the book, like the verse and heading chunks below.
       jst_crossrefs.js stays: 9 KB, no chunks, still a plain tag on ot/nt. */
    '/StandardWorks/jst_crossrefs.js',
    /* The four <vol>_heading_words.js monoliths were precached here and are
       no longer fetched by anything: chapter summaries come from
       <vol>_headings/<book>.js since the readers went lazy. 0.82 MB off every
       first visit, downloading files no page asks for. */
    // BOM page — verse data handled by bom/sw.js
    '/StandardWorks/bom/bom.html',
    '/StandardWorks/bom/bom_book_loader.js?v=9',
    '/StandardWorks/bom/bom_lazy_assets.js',
    '/StandardWorks/bom/roots_glossary.js',
    /* scripture_verses.js (1.32 MB gzipped) is fetched by ensureScriptureVerses
       in bom_lazy_assets.js when a cross-reference is first opened, and already
       matches isVerseAssetPath below. */
  ];

// Verse data files for all volumes — cached individually so one failure
// does not abort the install
// Verse files and the Dual-view English chunks are NOT precached. They are
// served cache-first with a background refresh (isVerseAssetPath): a book is
// fetched the first time it is read, comes from CACHE_NAME instantly after
// that while a conditional request updates the copy for the next visit, and
// the whole cache is replaced on deploy. The offline download (nav_engine.js
// → 'offline:download') still stores a whole volume on request.

// Install — cache shell assets atomically, verse data individually (failures allowed)
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS.map(scopedUrl))));
});

// Messages from pages — offline download / removal
self.addEventListener('message', event => {
  const msg = event.data || {};
  if (msg && msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (!msg || !msg.type) return;
  const reply = (payload) => {
    try { event.source && event.source.postMessage(payload); } catch(e) {}
  };

  if (msg.type === 'offline:download') {
    const assets = Array.isArray(msg.assets) ? msg.assets : [];
    event.waitUntil(
      caches.open(OFFLINE_CACHE).then(cache =>
        Promise.all(assets.map(u =>
          fetch(typeof u === 'string' ? u : String(u), { cache: 'reload', credentials: 'same-origin' })
            .then(function(res) {
              if (!res || !res.ok) return null;
              return cache.put(typeof u === 'string' ? u : String(u), res.clone());
            })
            .catch(function() { return null; })
        ))
      ).then(() => reply({ type: 'offline:done', op: 'download' }))
       .catch(() => reply({ type: 'offline:done', op: 'download', error: 1 }))
    );
    return;
  }

  if (msg.type === 'offline:remove') {
    const assets = Array.isArray(msg.assets) ? msg.assets : [];
    event.waitUntil(
      caches.open(OFFLINE_CACHE).then(cache =>
        Promise.all(assets.map(u => cache.delete(u).catch(() => null)))
      ).then(() => reply({ type: 'offline:done', op: 'remove' }))
       .catch(() => reply({ type: 'offline:done', op: 'remove', error: 1 }))
    );
    return;
  }
});

// Activate — purge old **shell** caches only (standard-works-vNN), not the offline bucket
// (standard-works-offline-v*) or bom-* caches.
self.addEventListener('activate', event => {
    event.waitUntil(
          caches.keys().then(keys =>
                  Promise.all(keys.map(k => {
                            if (k.startsWith('standard-works-') && k !== CACHE_NAME && k !== OFFLINE_CACHE) return caches.delete(k);
                            if (k.startsWith('bom-') || k === 'bom-v34') return caches.delete(k);
                            // Drop legacy offline bucket so migrated installs repopulate current assets in v2.
                            if (k === 'standard-works-offline-v1') return caches.delete(k);
                            return null;
                  }))
                                 ).then(() => self.clients.claim())
        );
});

// Network-first with timeout — falls back to cache on slow/hanging/offline
function networkFirst(request, timeoutMs) {
    return new Promise(resolve => {
          let settled = false;
          const done = (resp) => { if (!settled) { settled = true; clearTimeout(timer); resolve(resp); } };

                           const timer = setTimeout(() => {
                                   caches.match(request).then(cached => { if (cached) done(cached); });
                           }, timeoutMs);

                           fetch(request, { cache: 'no-cache' }).then(response => {
                                   if (response && response.ok) {
                                             const clone = response.clone();
                                             caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                                             done(response);
                                   } else {
                                             caches.match(request).then(cached => done(cached || response));
                                   }
                           }).catch(() => {
                                   caches.match(request).then(cached => done(cached || Response.error()));
                           });
    });
}

/** Verse payloads and English chunks — large; cache-first with background refresh, keyed by the deploy (CACHE_NAME). */
function isVerseAssetPath(pathname) {
  /* headings/ and crossrefs/ are the same kind of thing as verses/ and
     english/ — generated per-book chunks, keyed by the deploy — but were
     falling through to the generic network-first branch, so every page turn
     into a new book waited on the network for its chapter summary. */
  return /\/(ot|nt|pgp|jst|dc|bom)_(verses|english|headings|crossrefs)\//.test(pathname) ||
    /\/(ot|nt|pgp|jst|dc)_stress\.js$/.test(pathname) || /\/bom\/stress\.js$/.test(pathname) ||
    /\/(ot|nt|pgp|jst|dc)_phrase_breaks\.js$/.test(pathname) || /\/bom\/bom_phrase_breaks\.js$/.test(pathname) ||
    /\/(imperatives|root_concordance|root_concordance_refs|attested_forms)\.js$/.test(pathname) ||
    /\/bom\/(crossrefs|inverse_crossrefs|english)\//.test(pathname) ||
    /\/bom\/scripture_verses\.js$/.test(pathname) ||
    /\/bom\/verses\//.test(pathname) ||
    /\/bom\/(official_verses|crossrefs|chapter_headings|chapter_headings_heb|topical_guide|roots_glossary|bom_book_loader|bom_lazy_assets)\.js$/.test(pathname) ||
    /* Strong's is a lexicon, not chrome. It sat in isShellUIPath and so went
       network-first: 579 KB revalidated on the wire every time the dictionary
       was opened, to fetch a file that had not changed since it was generated. */
    /\/strongs_(lookup|roots)\.js$/.test(pathname);
}

/** Shell / chrome — must be network-first so deploys never flash stale UI.
    NAME THE FILE, not a prefix. 'reader' matches reader.css and reader.js and
    nothing else: reader_ui.js and root_scorecard.js were absent from this list
    and so served cache-first, which meant a returning reader kept an old word
    card and an old popup until the cache was evicted. Every shared script the
    volume pages load belongs here. */
function isShellUIPath(pathname) {
  return /\.html$/i.test(pathname) ||
    /\/service-worker\.js$/i.test(pathname) ||
    /\/version\.json$/i.test(pathname) ||
    /\/sw_register\.js$/i.test(pathname) ||
    /\/interlinear_gloss\.js$/i.test(pathname) ||
    /\/(site_chrome|sw_theme|nav_engine|reader|reader_ui|reader_surface|root_scorecard|verse_search|xref_study_panel|notes_engine|crossrefs_engine|read_aloud)\.(js|css)$/i.test(pathname);
}

// Cache-first with background refresh — verse files and English chunks. Served
// from CACHE_NAME instantly when present while a conditional fetch updates the
// copy for the next visit (a 304 when nothing changed, so an edited book shows
// on the second load even between deploys); a miss fetches and stores.
function staleWhileRevalidate(request) {
    return caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
            const refresh = fetch(request, { cache: 'no-cache' }).then(response => {
                if (response && response.ok) cache.put(request, response.clone());
                return response;
            }).catch(() => cached);
            return cached || refresh;
        })
    );
}

// Cache-first — for immutable static assets
function cacheFirst(request) {
    return caches.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request, { cache: 'no-cache' }).then(response => {
                  if (response && response.ok) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                  }
                  return response;
          }).catch(() => cached);
    });
}

// Online-first with timeout, fallback to OFFLINE_CACHE then default caches
function networkFirstWithOfflineFallback(request, timeoutMs) {
  return new Promise(resolve => {
    let settled = false;
    const done = (resp) => { if (!settled) { settled = true; clearTimeout(timer); resolve(resp); } };

    const timer = setTimeout(() => {
      caches.open(OFFLINE_CACHE).then(c => c.match(request)).then(cached => {
        if (cached) done(cached);
        else caches.match(request).then(any => done(any || Response.error()));
      });
    }, timeoutMs || 2500);

    fetch(request, { cache: 'no-cache' }).then(response => {
      if (response && response.ok) {
        const clone = response.clone();
        // Refresh both caches: shell cache + offline cache (if it exists there)
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone.clone())).catch(() => {});
        caches.open(OFFLINE_CACHE).then(cache => cache.put(request, clone)).catch(() => {});
        done(response);
      } else {
        caches.open(OFFLINE_CACHE).then(c => c.match(request)).then(cached => done(cached || response));
      }
    }).catch(() => {
      caches.open(OFFLINE_CACHE).then(c => c.match(request)).then(cached => {
        if (cached) done(cached);
        else caches.match(request).then(any => done(any || Response.error()));
      });
    });
  });
}

// Fetch — route by asset type
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);

                        // Offline downloaded assets — ONLINE FIRST (opposite of cache-first),
                        // fallback to offline cache when offline/slow.
                        event.respondWith(
                          caches.open(OFFLINE_CACHE).then(c =>
                            c.match(event.request).then(hit => {
                              if (hit) return networkFirstWithOfflineFallback(event.request, 2500);

                              // Verse + gloss data — from the cache instantly, refreshed in the background
                              if (isVerseAssetPath(url.pathname)) {
                                return staleWhileRevalidate(event.request);
                              }

                              // Shell HTML/CSS/JS — network-first (never paint stale chrome)
                              if (isShellUIPath(url.pathname)) {
                                return networkFirst(event.request, 5000);
                              }

                              // Other scripts/json — network-first, cache fallback
                              if (/\.(js|json)$/i.test(url.pathname)) {
                                return networkFirst(event.request, 4000);
                              }

                              // Stylesheets — network-first so theme updates apply immediately
                              if (/\.css$/i.test(url.pathname)) {
                                return networkFirst(event.request, 4000);
                              }

                              // Images, icons, fonts — cache-first for speed
                              return cacheFirst(event.request);
                            })
                          )
                        );
                        return;

});
