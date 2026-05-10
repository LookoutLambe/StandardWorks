/**
 * build_pgp_chapter_headings.js
 *
 * Fetch official LDS chapter headings (study summaries) for PGP from churchofjesuschrist.org.
 * Outputs: pgp_chapter_headings.js
 *
 * Usage: node build_pgp_chapter_headings.js
 */

const https = require('https');
const fs = require('fs');

const BOOKS = [
  { name: 'Moses',             slug: 'moses',  chapters: 8 },
  { name: 'Abraham',           slug: 'abr',    chapters: 5 },
  { name: 'JS-Matthew',        slug: 'js-m',   chapters: 1 },
  { name: 'JS-History',        slug: 'js-h',   chapters: 1 },
  { name: 'Articles of Faith', slug: 'a-of-f', chapters: 1 },
];

const BASE_URL = 'https://www.churchofjesuschrist.org/study/scriptures/pgp';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Accept: 'text/html' } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let loc = res.headers.location;
          if (loc.startsWith('/')) loc = 'https://www.churchofjesuschrist.org' + loc;
          fetchPage(loc).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractHeading(html) {
  let m = html.match(/<p[^>]*class="[^"]*study-summary[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (m) return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  m = html.match(/<div[^>]*class="[^"]*studySummary[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (m) return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  // Some pages (e.g., JS-History, Articles of Faith) don't expose the summary with the same classes.
  // Fallback: use meta description when it looks like an actual chapter heading.
  m = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"[^>]*>/i);
  if (m) {
    const desc = String(m[1] || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (desc && desc.length > 30) return desc;
  }
  return '';
}

async function main() {
  const out = {};
  let done = 0;
  const total = BOOKS.reduce((a, b) => a + b.chapters, 0);

  for (const book of BOOKS) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      const key = `${book.name} ${ch}`;
      const url = `${BASE_URL}/${book.slug}/${ch}?lang=eng`;
      done++;
      try {
        const html = await fetchPage(url);
        const heading = extractHeading(html);
        out[key] = heading || '';
        process.stderr.write(`${heading ? '✓' : '✗'} ${done}/${total} ${key}\n`);
      } catch (e) {
        out[key] = '';
        process.stderr.write(`✗ ${done}/${total} ${key} (${e.message})\n`);
      }
      await sleep(200);
    }
  }

  const js =
    'var _pgpChapterHeadings = ' + JSON.stringify(out, null, 2) + ';\n';
  fs.writeFileSync('pgp_chapter_headings.js', js, 'utf8');
  process.stderr.write('Wrote pgp_chapter_headings.js\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

