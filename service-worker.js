/** Replaced on deploy by scripts/write_build_version.js (GITHUB_SHA). */
const BUILD_ID = '2026-09-02T19-50-20';
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
    '/StandardWorks/images/cover-bom.jpg',
    '/StandardWorks/site_chrome.css',
    '/StandardWorks/sw_theme.css',
    '/StandardWorks/site_chrome.js',
    '/StandardWorks/nav_engine.js',
    '/StandardWorks/verse_search.js',
    '/StandardWorks/nav_engine.css',
    '/StandardWorks/xref_study_panel.css',
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
    '/StandardWorks/_strongs_lookup.json',
    '/StandardWorks/_supplement.json',
    '/StandardWorks/ot_english.js',
    '/StandardWorks/nt_english.js',
    '/StandardWorks/ot_crossrefs.js',
    '/StandardWorks/nt_crossrefs.js',
    '/StandardWorks/dc_crossrefs.js',
    '/StandardWorks/pgp_crossrefs.js',
    '/StandardWorks/dc_english.js',
    '/StandardWorks/pgp_english.js',
    '/StandardWorks/jst_english.js',
    '/StandardWorks/ot_heading_words.js',
    '/StandardWorks/nt_heading_words.js',
    '/StandardWorks/dc_heading_words.js',
    '/StandardWorks/pgp_heading_words.js',
    // BOM page — verse data handled by bom/sw.js
    '/StandardWorks/bom/bom.html',
    '/StandardWorks/bom/bom_book_loader.js?v=2',
    '/StandardWorks/bom/bom_lazy_assets.js',
    '/StandardWorks/bom/roots_glossary.js',
    '/StandardWorks/bom/scripture_verses.js',
  ];

// Verse data files for all volumes — cached individually so one failure
// does not abort the install
const VERSE_ASSETS = [
    // Old Testament (39 books)
    '/StandardWorks/ot_verses/gen.js',
    '/StandardWorks/ot_verses/exo.js',
    '/StandardWorks/ot_verses/lev.js',
    '/StandardWorks/ot_verses/num.js',
    '/StandardWorks/ot_verses/deu.js',
    '/StandardWorks/ot_verses/jos.js',
    '/StandardWorks/ot_verses/jdg.js',
    '/StandardWorks/ot_verses/1sa.js',
    '/StandardWorks/ot_verses/2sa.js',
    '/StandardWorks/ot_verses/1ki.js',
    '/StandardWorks/ot_verses/2ki.js',
    '/StandardWorks/ot_verses/isa.js',
    '/StandardWorks/ot_verses/jer.js',
    '/StandardWorks/ot_verses/eze.js',
    '/StandardWorks/ot_verses/hos.js',
    '/StandardWorks/ot_verses/joe.js',
    '/StandardWorks/ot_verses/amo.js',
    '/StandardWorks/ot_verses/oba.js',
    '/StandardWorks/ot_verses/jon.js',
    '/StandardWorks/ot_verses/mic.js',
    '/StandardWorks/ot_verses/nah.js',
    '/StandardWorks/ot_verses/hab.js',
    '/StandardWorks/ot_verses/zep.js',
    '/StandardWorks/ot_verses/hag.js',
    '/StandardWorks/ot_verses/zec.js',
    '/StandardWorks/ot_verses/mal.js',
    '/StandardWorks/ot_verses/psa.js',
    '/StandardWorks/ot_verses/pro.js',
    '/StandardWorks/ot_verses/job.js',
    '/StandardWorks/ot_verses/sos.js',
    '/StandardWorks/ot_verses/rth.js',
    '/StandardWorks/ot_verses/lam.js',
    '/StandardWorks/ot_verses/ecc.js',
    '/StandardWorks/ot_verses/est.js',
    '/StandardWorks/ot_verses/dan.js',
    '/StandardWorks/ot_verses/ezr.js',
    '/StandardWorks/ot_verses/neh.js',
    '/StandardWorks/ot_verses/1ch.js',
    '/StandardWorks/ot_verses/2ch.js',
    // New Testament (27 books)
    '/StandardWorks/nt_verses/matt.js',
    '/StandardWorks/nt_verses/mark.js',
    '/StandardWorks/nt_verses/luke.js',
    '/StandardWorks/nt_verses/john.js',
    '/StandardWorks/nt_verses/acts.js',
    '/StandardWorks/nt_verses/rom.js',
    '/StandardWorks/nt_verses/1co.js',
    '/StandardWorks/nt_verses/2co.js',
    '/StandardWorks/nt_verses/gal.js',
    '/StandardWorks/nt_verses/eph.js',
    '/StandardWorks/nt_verses/php.js',
    '/StandardWorks/nt_verses/col.js',
    '/StandardWorks/nt_verses/1th.js',
    '/StandardWorks/nt_verses/2th.js',
    '/StandardWorks/nt_verses/1ti.js',
    '/StandardWorks/nt_verses/2ti.js',
    '/StandardWorks/nt_verses/tit.js',
    '/StandardWorks/nt_verses/phm.js',
    '/StandardWorks/nt_verses/heb.js',
    '/StandardWorks/nt_verses/jas.js',
    '/StandardWorks/nt_verses/1pe.js',
    '/StandardWorks/nt_verses/2pe.js',
    '/StandardWorks/nt_verses/1jn.js',
    '/StandardWorks/nt_verses/2jn.js',
    '/StandardWorks/nt_verses/3jn.js',
    '/StandardWorks/nt_verses/jude.js',
    '/StandardWorks/nt_verses/rev.js',
    // Doctrine & Covenants (18 files)
    '/StandardWorks/dc_verses/dc1_10.js',
    '/StandardWorks/dc_verses/dc11_20.js',
    '/StandardWorks/dc_verses/dc21_30.js',
    '/StandardWorks/dc_verses/dc31_40.js',
    '/StandardWorks/dc_verses/dc41_50.js',
    '/StandardWorks/dc_verses/dc51_60.js',
    '/StandardWorks/dc_verses/dc61_70.js',
    '/StandardWorks/dc_verses/dc71_80.js',
    '/StandardWorks/dc_verses/dc81_90.js',
    '/StandardWorks/dc_verses/dc91_100.js',
    '/StandardWorks/dc_verses/dc101_110.js',
    '/StandardWorks/dc_verses/dc109.js',
    '/StandardWorks/dc_verses/dc111_120.js',
    '/StandardWorks/dc_verses/dc121_130.js',
    '/StandardWorks/dc_verses/dc131_138.js',
    '/StandardWorks/dc_verses/dc_chron.js',
    '/StandardWorks/dc_verses/dc_intro.js',
    '/StandardWorks/dc_verses/od.js',
    // Pearl of Great Price (6 files)
    '/StandardWorks/pgp_verses/moses.js',
    '/StandardWorks/pgp_verses/abraham.js',
    '/StandardWorks/pgp_verses/js_matthew.js',
    '/StandardWorks/pgp_verses/js_history.js',
    '/StandardWorks/pgp_verses/articles_of_faith.js',
    '/StandardWorks/pgp_verses/pgp_intro.js',
  ];

// Install — cache shell assets atomically, verse data individually (failures allowed)
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
          caches.open(CACHE_NAME).then(cache =>
                  cache.addAll(CORE_ASSETS.map(scopedUrl)).then(() =>
                            Promise.all(
                                        VERSE_ASSETS.map(url =>
                                                      cache.add(scopedUrl(url)).catch(err => console.warn('[SW] Verse cache miss:', url))
                                                                   )
                                      )
                                                       )
                                           )
        );
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

/** Verse payloads — large; still refreshed online on each visit (network-first). */
function isVerseAssetPath(pathname) {
  return /\/(ot|nt|pgp|jst|dc|bom)_verses\//.test(pathname) ||
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
    /\/(site_chrome|sw_theme|nav_engine|verse_search|xref_study_panel|notes_engine|crossrefs_engine)\.(js|css)$/i.test(pathname) ||
    /\/(ot|nt|dc|pgp)_(english|crossrefs)\.js$/i.test(pathname) ||
    /\/strongs_(lookup|roots)\.js$/i.test(pathname);
}

// Cache-first — for immutable static assets and verse data
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

                              // Verse + gloss data — network-first when online so deploys apply immediately
                              if (isVerseAssetPath(url.pathname)) {
                                return networkFirst(event.request, 5000);
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
