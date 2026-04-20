const CACHE_NAME = 'standard-works-v68';

// Shell assets — HTML pages + shared infrastructure
// These are small and essential; install fails gracefully if any are unavailable
const CORE_ASSETS = [
  '/StandardWorks/index.html',
  '/StandardWorks/ot.html',
  '/StandardWorks/nt.html',
  '/StandardWorks/dc.html',
  '/StandardWorks/pgp.html',
  '/StandardWorks/jst.html',
  '/StandardWorks/manifest.json',
  '/StandardWorks/icons/icon-192.png',
  '/StandardWorks/icons/icon-512.png',
  '/StandardWorks/images/cover-bom.jpg',
  '/StandardWorks/nav_engine.js',
  '/StandardWorks/nav_engine.css',
  '/StandardWorks/crossrefs_engine.js',
  '/StandardWorks/strongs_lookup.js',
  '/StandardWorks/strongs_roots.js',
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
  // BOM page — verse data handled by bom/sw.js
  '/StandardWorks/bom/bom.html',
  '/StandardWorks/bom/manifest.json',
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
      cache.addAll(CORE_ASSETS).then(() =>
        Promise.all(
          VERSE_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Verse cache miss:', url))
          )
        )
      )
    )
  );
});

// Activate — purge only standard-works-* caches (leave bom-* caches alone)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k =>
        k.startsWith('standard-works-') && k !== CACHE_NAME ? caches.delete(k) : null
      ))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for HTML/JS/JSON, cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // HTML pages and JS/JSON files — always network-first so updates arrive immediately
  if (url.pathname.match(/\.(html|js|json)$/) || url.pathname.match(/_(verses|cache)\//)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
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
