/** Replaced on deploy by scripts/write_build_version.js (GITHUB_SHA). */
const BUILD_ID = '2026-09-03T20-13-34';
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
    '/StandardWorks/icons/icon-180.png',
    '/StandardWorks/icons/icon-192.png',
    '/StandardWorks/icons/icon-512.png',
    '/StandardWorks/icons/icon-maskable.png',
    '/StandardWorks/site_chrome.css',
    '/StandardWorks/sw_theme.css',
    '/StandardWorks/site_chrome.js',
    '/StandardWorks/nav_engine.js',
    '/StandardWorks/verse_search.js',
    '/StandardWorks/nav_engine.css',
    '/StandardWorks/xref_study_panel.css',
    '/StandardWorks/reader.css',
    '/StandardWorks/xref_study_panel.js',
    '/StandardWorks/notes_engine.js',
    '/StandardWorks/crossrefs_engine.js',
    '/StandardWorks/root_scorecard.js',
    '/StandardWorks/root_engine.js',
    '/StandardWorks/shoroshim_roots.js',
  '/StandardWorks/reader_core.js',
  '/StandardWorks/reader_ui.js',
  '/StandardWorks/fonts/david_libre.css',
  '/StandardWorks/fonts/davidlibre-400-hebrew.woff2',
  '/StandardWorks/fonts/davidlibre-400-latin.woff2',
  '/StandardWorks/fonts/davidlibre-500-hebrew.woff2',
  '/StandardWorks/fonts/davidlibre-500-latin.woff2',
  '/StandardWorks/fonts/davidlibre-700-hebrew.woff2',
  '/StandardWorks/fonts/davidlibre-700-latin.woff2',
    '/StandardWorks/root_concordance.js',
    '/StandardWorks/strongs_lookup.js',
    '/StandardWorks/strongs_roots.js',
    '/StandardWorks/interlinear_gloss.js',
    '/StandardWorks/version.json',
    '/StandardWorks/sw_register.js',
    '/StandardWorks/ot_crossrefs.js',
    '/StandardWorks/nt_crossrefs.js',
    '/StandardWorks/dc_crossrefs.js',
    '/StandardWorks/pgp_crossrefs.js',
    '/StandardWorks/ot_heading_words.js',
    '/StandardWorks/nt_heading_words.js',
    '/StandardWorks/dc_heading_words.js',
    '/StandardWorks/pgp_heading_words.js',
    // BOM page — verse data handled by bom/sw.js
    '/StandardWorks/bom/bom.html',
    '/StandardWorks/bom/bom_book_loader.js?v=8',
    '/StandardWorks/bom/bom_lazy_assets.js',
    '/StandardWorks/bom/roots_glossary.js',
    '/StandardWorks/bom/scripture_verses.js',
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
  return /\/(ot|nt|pgp|jst|dc|bom)_(verses|english)\//.test(pathname) ||
    /\/bom\/scripture_verses\.js$/.test(pathname) ||
    /\/bom\/verses\//.test(pathname) ||
    /\/bom\/(official_verses|crossrefs|chapter_headings|chapter_headings_heb|topical_guide|roots_glossary|bom_book_loader|bom_lazy_assets)\.js$/.test(pathname);
}

/** Shell / chrome — must be network-first so deploys never flash stale UI. */
function isShellUIPath(pathname) {
  return /\.html$/i.test(pathname) ||
    /\/service-worker\.js$/i.test(pathname) ||
    /\/version\.json$/i.test(pathname) ||
    /\/sw_register\.js$/i.test(pathname) ||
    /\/interlinear_gloss\.js$/i.test(pathname) ||
    /\/(site_chrome|sw_theme|nav_engine|reader|verse_search|xref_study_panel|notes_engine|crossrefs_engine)\.(js|css)$/i.test(pathname) ||
    /\/(ot|nt|dc|pgp)_crossrefs\.js$/i.test(pathname) ||
    /\/strongs_(lookup|roots)\.js$/i.test(pathname);
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
