/**
 * build_ot_chapter_headings.js
 *
 * Fetch official LDS chapter headings (study summaries) for OT from churchofjesuschrist.org.
 * Outputs: ot_chapter_headings.js
 *
 * Usage: node build_ot_chapter_headings.js
 */

const https = require('https');
const fs = require('fs');

const BOOKS = [
  { name: 'Genesis',         slug: 'gen',     chapters: 50 },
  { name: 'Exodus',          slug: 'ex',      chapters: 40 },
  { name: 'Leviticus',       slug: 'lev',     chapters: 27 },
  { name: 'Numbers',         slug: 'num',     chapters: 36 },
  { name: 'Deuteronomy',     slug: 'deut',    chapters: 34 },
  { name: 'Joshua',          slug: 'josh',    chapters: 24 },
  { name: 'Judges',          slug: 'judg',    chapters: 21 },
  { name: 'Ruth',            slug: 'ruth',    chapters: 4 },
  { name: '1 Samuel',        slug: '1-sam',   chapters: 31 },
  { name: '2 Samuel',        slug: '2-sam',   chapters: 24 },
  { name: '1 Kings',         slug: '1-kgs',   chapters: 22 },
  { name: '2 Kings',         slug: '2-kgs',   chapters: 25 },
  { name: '1 Chronicles',    slug: '1-chr',   chapters: 29 },
  { name: '2 Chronicles',    slug: '2-chr',   chapters: 36 },
  { name: 'Ezra',            slug: 'ezra',    chapters: 10 },
  { name: 'Nehemiah',        slug: 'neh',     chapters: 13 },
  { name: 'Esther',          slug: 'esth',    chapters: 10 },
  { name: 'Job',             slug: 'job',     chapters: 42 },
  { name: 'Psalms',          slug: 'ps',      chapters: 150 },
  { name: 'Proverbs',        slug: 'prov',    chapters: 31 },
  { name: 'Ecclesiastes',    slug: 'eccl',    chapters: 12 },
  { name: 'Song of Solomon', slug: 'song',    chapters: 8 },
  { name: 'Isaiah',          slug: 'isa',     chapters: 66 },
  { name: 'Jeremiah',        slug: 'jer',     chapters: 52 },
  { name: 'Lamentations',    slug: 'lam',     chapters: 5 },
  { name: 'Ezekiel',         slug: 'ezek',    chapters: 48 },
  { name: 'Daniel',          slug: 'dan',     chapters: 12 },
  { name: 'Hosea',           slug: 'hosea',   chapters: 14 },
  { name: 'Joel',            slug: 'joel',    chapters: 3 },
  { name: 'Amos',            slug: 'amos',    chapters: 9 },
  { name: 'Obadiah',         slug: 'obad',    chapters: 1 },
  { name: 'Jonah',           slug: 'jonah',   chapters: 4 },
  { name: 'Micah',           slug: 'micah',   chapters: 7 },
  { name: 'Nahum',           slug: 'nahum',   chapters: 3 },
  { name: 'Habakkuk',        slug: 'hab',     chapters: 3 },
  { name: 'Zephaniah',       slug: 'zeph',    chapters: 3 },
  { name: 'Haggai',          slug: 'hag',     chapters: 2 },
  { name: 'Zechariah',       slug: 'zech',    chapters: 14 },
  { name: 'Malachi',         slug: 'mal',     chapters: 4 },
];

const BASE_URL = 'https://www.churchofjesuschrist.org/study/scriptures/ot';

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
      await sleep(175);
    }
  }

  const js =
    'var _otChapterHeadings = ' + JSON.stringify(out, null, 2) + ';\n';
  fs.writeFileSync('ot_chapter_headings.js', js, 'utf8');
  process.stderr.write('Wrote ot_chapter_headings.js\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

