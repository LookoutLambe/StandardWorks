/**
 * build_nt_chapter_headings.js
 *
 * Fetch official LDS chapter headings (study summaries) for NT from churchofjesuschrist.org.
 * Outputs: nt_chapter_headings.js
 *
 * Usage: node build_nt_chapter_headings.js
 */

const https = require('https');
const fs = require('fs');

const BOOKS = [
  { name: 'Matthew',        slug: 'matt',    chapters: 28 },
  { name: 'Mark',           slug: 'mark',    chapters: 16 },
  { name: 'Luke',           slug: 'luke',    chapters: 24 },
  { name: 'John',           slug: 'john',    chapters: 21 },
  { name: 'Acts',           slug: 'acts',    chapters: 28 },
  { name: 'Romans',         slug: 'rom',     chapters: 16 },
  { name: '1 Corinthians',  slug: '1-cor',   chapters: 16 },
  { name: '2 Corinthians',  slug: '2-cor',   chapters: 13 },
  { name: 'Galatians',      slug: 'gal',     chapters: 6 },
  { name: 'Ephesians',      slug: 'eph',     chapters: 6 },
  { name: 'Philippians',    slug: 'philip',  chapters: 4 },
  { name: 'Colossians',     slug: 'col',     chapters: 4 },
  { name: '1 Thessalonians',slug: '1-thes',  chapters: 5 },
  { name: '2 Thessalonians',slug: '2-thes',  chapters: 3 },
  { name: '1 Timothy',      slug: '1-tim',   chapters: 6 },
  { name: '2 Timothy',      slug: '2-tim',   chapters: 4 },
  { name: 'Titus',          slug: 'titus',   chapters: 3 },
  { name: 'Philemon',       slug: 'philem',  chapters: 1 },
  { name: 'Hebrews',        slug: 'heb',     chapters: 13 },
  { name: 'James',          slug: 'james',   chapters: 5 },
  { name: '1 Peter',        slug: '1-pet',   chapters: 5 },
  { name: '2 Peter',        slug: '2-pet',   chapters: 3 },
  { name: '1 John',         slug: '1-jn',    chapters: 5 },
  { name: '2 John',         slug: '2-jn',    chapters: 1 },
  { name: '3 John',         slug: '3-jn',    chapters: 1 },
  { name: 'Jude',           slug: 'jude',    chapters: 1 },
  { name: 'Revelation',     slug: 'rev',     chapters: 22 },
];

const BASE_URL = 'https://www.churchofjesuschrist.org/study/scriptures/nt';

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
    'var _ntChapterHeadings = ' + JSON.stringify(out, null, 2) + ';\n';
  fs.writeFileSync('nt_chapter_headings.js', js, 'utf8');
  process.stderr.write('Wrote nt_chapter_headings.js\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

