const CACHE = 'bom-v1';
const ASSETS = [
  '/StandardWorks/bom/bom.html',
  '/StandardWorks/bom/official_verses.js',
  '/StandardWorks/bom/scripture_verses.js',
  '/StandardWorks/bom/chapter_headings.js',
  '/StandardWorks/bom/chapter_headings_heb.js',
  '/StandardWorks/bom/roots_glossary.js',
  '/StandardWorks/bom/crossrefs.js',
  '/StandardWorks/bom/topical_guide.js',
  '/StandardWorks/bom/verses/frontmatter.js',
  '/StandardWorks/bom/verses/1nephi.js',
  '/StandardWorks/bom/verses/2nephi.js',
  '/StandardWorks/bom/verses/3nephi.js',
  '/StandardWorks/bom/verses/4nephi.js',
  '/StandardWorks/bom/verses/alma.js',
  '/StandardWorks/bom/verses/enos.js',
  '/StandardWorks/bom/verses/ether.js',
  '/StandardWorks/bom/verses/helaman.js',
  '/StandardWorks/bom/verses/jacob.js',
  '/StandardWorks/bom/verses/jarom.js',
  '/StandardWorks/bom/verses/mormon.js',
  '/StandardWorks/bom/verses/moroni.js',
  '/StandardWorks/bom/verses/mosiah.js',
  '/StandardWorks/bom/verses/omni.js',
  '/StandardWorks/bom/verses/words_of_mormon.js',
  '/StandardWorks/bom/images/cover-dual.jpg',
  '/StandardWorks/bom/images/cover-hebrew.jpg',
  '/StandardWorks/bom/images/cover-interlinear.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
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
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
