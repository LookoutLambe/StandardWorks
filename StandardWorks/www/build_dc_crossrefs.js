/**
 * build_dc_crossrefs.js
 *
 * Scraper for Doctrine and Covenants cross-references from churchofjesuschrist.org
 * Outputs: dc_crossrefs.js
 * Usage: node build_dc_crossrefs.js
 */

const https = require('https');
const fs = require('fs');

// D&C has 138 sections + Official Declarations 1 and 2
const SECTIONS = [];
for (let i = 1; i <= 138; i++) {
  SECTIONS.push({ name: `D&C ${i}`, section: i, slug: `dc/${i}` });
}
SECTIONS.push({ name: 'OD 1', section: 'OD1', slug: 'od/1' });
SECTIONS.push({ name: 'OD 2', section: 'OD2', slug: 'od/2' });

const BASE_URL = 'https://www.churchofjesuschrist.org/study/scriptures/dc-testament';

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

function parseChapter(html, sectionName, section) {
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
    // D&C uses "D&C|section|verse" format
    const verseKey = `${sectionName}|${section}|${verseNum}`;
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

async function scrapeSection(sec, retries = 2) {
  const url = `${BASE_URL}/${sec.slug}?lang=eng`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const html = await fetchPage(url);
      const refs = parseChapter(html, sec.name, sec.section);
      const verseCount = Object.keys(refs).length;
      const markerCount = Object.values(refs).reduce((s, arr) => s + arr.length, 0);
      process.stdout.write(`  ${sec.name}: ${verseCount} verses, ${markerCount} markers\n`);
      return refs;
    } catch (err) {
      if (attempt < retries) {
        console.log(`  ${sec.name}: retry (${err.message})`);
        await sleep(2000);
      } else {
        console.error(`  ${sec.name}: FAILED - ${err.message}`);
        return {};
      }
    }
  }
}

async function main() {
  console.log('=== Building D&C Cross-References ===\n');

  const allRefs = {};
  let totalVerses = 0;
  let totalMarkers = 0;

  for (const sec of SECTIONS) {
    const refs = await scrapeSection(sec);
    for (const key in refs) {
      allRefs[key] = refs[key];
      totalMarkers += refs[key].length;
    }
    totalVerses += Object.keys(refs).length;
    await sleep(500);
  }

  const outputPath = 'dc_crossrefs.js';
  const jsContent = 'window._dcCrossrefsData = ' + JSON.stringify(allRefs, null, 2) + ';\n';
  fs.writeFileSync(outputPath, jsContent, 'utf8');

  const sizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n=== Done ===`);
  console.log(`Sections scraped: ${SECTIONS.length}`);
  console.log(`Verses with footnotes: ${totalVerses}`);
  console.log(`Total footnote markers: ${totalMarkers}`);
  console.log(`Output: ${outputPath} (${sizeMB} MB)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
