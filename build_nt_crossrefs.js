/**
 * build_nt_crossrefs.js
 *
 * Scraper for New Testament cross-references from churchofjesuschrist.org
 * Outputs: nt_crossrefs.js
 * Usage: node build_nt_crossrefs.js
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
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'text/html' }
    }, (res) => {
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
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parseChapter(html, bookName, chapter) {
  const result = {};

  const footerStart = html.indexOf('<footer');
  const bodyHtml = footerStart > -1 ? html.substring(0, footerStart) : html;
  const footerHtml = footerStart > -1 ? html.substring(footerStart) : '';

  const inlineMarkers = {};
  const inlineRegex = /<a[^>]*study-note-ref[^>]*data-scroll-id="(note(\d+)_([a-z]))"[^>]*><sup[^>]*data-value="[a-z]"[^>]*><\/sup>([^<]*)<\/a>/gi;
  let im;
  while ((im = inlineRegex.exec(bodyHtml)) !== null) {
    const noteId = im[1];
    const verseNum = im[2];
    const letter = im[3];
    const word = im[4].trim();
    if (!inlineMarkers[verseNum]) inlineMarkers[verseNum] = [];
    inlineMarkers[verseNum].push({ letter, word, noteId });
  }

  const footnoteDefs = {};
  const noteRegex = /<li[^>]*id="(note(\d+)_([a-z]))"[^>]*data-full-marker="(\d+[a-z])"[^>]*>([\s\S]*?)<\/li>/gi;
  let nm;
  while ((nm = noteRegex.exec(footerHtml)) !== null) {
    const noteId = nm[1];
    const content = nm[5];

    const catMatch = content.match(/data-note-category="([^"]*)"/);
    const category = catMatch ? catMatch[1] : '';

    const refs = [];
    const refRegex = /<a[^>]*class="scripture-ref"[^>]*>([^<]*(?:<small>[^<]*<\/small>[^<]*)?)<\/a>/gi;
    let rm;
    while ((rm = refRegex.exec(content)) !== null) {
      let refText = rm[1].replace(/<\/?small>/g, '').replace(/&amp;/g, '&').trim();
      if (refText) refs.push(refText);
    }

    footnoteDefs[noteId] = { category, refs };
  }

  for (const verseNum in inlineMarkers) {
    const verseKey = `${bookName}|${chapter}|${verseNum}`;
    const entries = inlineMarkers[verseNum].map(m => {
      const def = footnoteDefs[m.noteId] || {};
      return {
        marker: m.letter,
        text: m.word,
        refs: def.refs && def.refs.length > 0 ? def.refs : undefined,
        category: def.category || undefined
      };
    });
    if (entries.length > 0) {
      result[verseKey] = entries;
    }
  }

  return result;
}

async function scrapeChapter(book, chapter, retries = 2) {
  const url = `${BASE_URL}/${book.slug}/${chapter}?lang=eng`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const html = await fetchPage(url);
      const refs = parseChapter(html, book.name, chapter);
      const verseCount = Object.keys(refs).length;
      const markerCount = Object.values(refs).reduce((s, arr) => s + arr.length, 0);
      process.stdout.write(`  ${book.name} ${chapter}: ${verseCount} verses, ${markerCount} markers\n`);
      return refs;
    } catch (err) {
      if (attempt < retries) {
        console.log(`  ${book.name} ${chapter}: retry (${err.message})`);
        await sleep(2000);
      } else {
        console.error(`  ${book.name} ${chapter}: FAILED - ${err.message}`);
        return {};
      }
    }
  }
}

async function main() {
  console.log('=== Building NT Cross-References ===\n');

  const allRefs = {};
  let totalVerses = 0;
  let totalMarkers = 0;
  let totalChapters = 0;

  for (const book of BOOKS) {
    console.log(`\n── ${book.name} (${book.chapters} chapters) ──`);

    for (let ch = 1; ch <= book.chapters; ch++) {
      const refs = await scrapeChapter(book, ch);
      for (const key in refs) {
        allRefs[key] = refs[key];
        totalMarkers += refs[key].length;
      }
      totalVerses += Object.keys(refs).length;
      totalChapters++;
      await sleep(500);
    }
  }

  const outputPath = 'nt_crossrefs.js';
  const jsContent = 'window._ntCrossrefsData = ' + JSON.stringify(allRefs, null, 2) + ';\n';
  fs.writeFileSync(outputPath, jsContent, 'utf8');

  const sizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n=== Done ===`);
  console.log(`Chapters scraped: ${totalChapters}`);
  console.log(`Verses with footnotes: ${totalVerses}`);
  console.log(`Total footnote markers: ${totalMarkers}`);
  console.log(`Output: ${outputPath} (${sizeMB} MB)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
