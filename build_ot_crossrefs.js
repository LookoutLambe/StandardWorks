/**
 * build_ot_crossrefs.js
 *
 * Scraper for Old Testament cross-references from churchofjesuschrist.org
 * Outputs: ot_crossrefs.js
 * Usage: node build_ot_crossrefs.js
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
  console.log('=== Building OT Cross-References ===\n');

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

  const outputPath = 'ot_crossrefs.js';
  const jsContent = 'window._otCrossrefsData = ' + JSON.stringify(allRefs, null, 2) + ';\n';
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
