// build_strongs_dict.js — Parse OpenScriptures Strong's Hebrew Lexicon → JSON dictionary
// Usage: node build_strongs_dict.js
// Outputs: _strongs_hebrew.json (Hebrew word → English gloss)

const fs = require('fs');
const path = require('path');

const XML_PATH = path.join(__dirname, '_cache', 'strongs', 'HebrewStrong.xml');
const OUTPUT_PATH = path.join(__dirname, '_strongs_hebrew.json');

console.log('=== Building Strong\'s Hebrew Dictionary ===\n');

const xml = fs.readFileSync(XML_PATH, 'utf8');

// Parse entries
const entryRegex = /<entry\s+id="(H\d+)">([\s\S]*?)<\/entry>/g;
const dict = {};
let total = 0, added = 0, skippedAramaic = 0, skippedProper = 0;

let match;
while ((match = entryRegex.exec(xml)) !== null) {
  total++;
  const id = match[1];
  const body = match[2];

  // Extract Hebrew word
  const wMatch = body.match(/<w\s+[^>]*xml:lang="([^"]*)"[^>]*>([^<]+)<\/w>/);
  if (!wMatch) continue;

  const lang = wMatch[1];
  const hebWord = wMatch[2].trim();

  // Skip Aramaic entries (lang="arc") — keep only Hebrew
  if (lang === 'arc') { skippedAramaic++; continue; }

  // Extract part of speech
  const posMatch = body.match(/<w\s+[^>]*pos="([^"]*)"/);
  const pos = posMatch ? posMatch[1] : '';

  // Skip proper nouns (n-pr-*) — we handle those with our own supplement
  if (pos.startsWith('n-pr')) { skippedProper++; continue; }

  // Extract <def> tags from <meaning> — prefer the "i.e." meaning over etymological root
  const meaningMatch = body.match(/<meaning>([\s\S]*?)<\/meaning>/);
  if (!meaningMatch) {
    // Fall back to usage if no <meaning> exists
    const usageMatch = body.match(/<usage>([^<]+)<\/usage>/);
    if (usageMatch) {
      let usage = usageMatch[1].trim();
      usage = usage.split(',')[0].replace(/[×+]/g, '').replace(/\(.*?\)/g, '').trim();
      if (usage && usage.length > 1 && usage.length < 30) {
        dict[hebWord.normalize('NFC')] = usage;
        added++;
      }
    }
    continue;
  }

  const meaningText = meaningMatch[1];
  // Extract all <def> tags
  const allDefs = [];
  const defRe = /<def>([^<]+)<\/def>/g;
  let dm;
  while ((dm = defRe.exec(meaningText)) !== null) {
    allDefs.push(dm[1].trim());
  }

  if (allDefs.length === 0) {
    const usageMatch = body.match(/<usage>([^<]+)<\/usage>/);
    if (usageMatch) {
      let usage = usageMatch[1].trim().split(',')[0].replace(/[×+]/g, '').replace(/\(.*?\)/g, '').trim();
      if (usage && usage.length > 1 && usage.length < 30) {
        dict[hebWord.normalize('NFC')] = usage;
        added++;
      }
    }
    continue;
  }

  // Prefer the def after "i.e." — that's the actual meaning, not etymology
  let gloss = allDefs[0];
  if (allDefs.length > 1 && /i\.e\./.test(meaningText)) {
    // Find the def that comes after "i.e."
    const ieIdx = meaningText.indexOf('i.e.');
    for (let d = 0; d < allDefs.length; d++) {
      const defIdx = meaningText.indexOf(`<def>${allDefs[d]}</def>`);
      if (defIdx > ieIdx) { gloss = allDefs[d]; break; }
    }
  } else if (allDefs.length > 1) {
    // If no "i.e.", use second def if first is very abstract
    if (allDefs[0].length < 4 || /^(a |an |the )/.test(allDefs[0])) {
      gloss = allDefs[1];
    }
  }

  // Clean up gloss
  gloss = gloss.replace(/\s+/g, ' ').trim();
  if (gloss.split(' ').length > 3) {
    gloss = gloss.split(' ').slice(0, 2).join(' ');
  }

  if (gloss && gloss.length > 0) {
    dict[hebWord.normalize('NFC')] = gloss;
    added++;

    // Also extract alternate forms from <source> text
    // e.g., <source>... <w pron="..." xlit="...">לַיְלָה</w>; from ...</source>
    const sourceBlock = body.match(/<source>([\s\S]*?)<\/source>/);
    if (sourceBlock) {
      const altRegex = /<w[^>]*>([^<]+)<\/w>/g;
      let altMatch;
      while ((altMatch = altRegex.exec(sourceBlock[1])) !== null) {
        const altWord = altMatch[1].trim().normalize('NFC');
        // Only add if it's a Hebrew word (has Hebrew chars) and not just a number
        if (/[\u05D0-\u05EA]/.test(altWord) && !dict[altWord]) {
          dict[altWord] = gloss;
        }
      }
    }
  }
}

console.log(`  Total entries: ${total}`);
console.log(`  Added: ${added}`);
console.log(`  Skipped Aramaic: ${skippedAramaic}`);
console.log(`  Skipped proper nouns: ${skippedProper}`);

// Show some sample entries
console.log('\n  Sample entries:');
const samples = ['אָב', 'אֱלֹהִים', 'לַיְלָה', 'יוֹם', 'שָׁמַיִם', 'אֶרֶץ', 'מַיִם', 'אוֹר', 'חֹשֶׁךְ', 'רוּחַ'];
for (const s of samples) {
  const norm = s.normalize('NFC');
  console.log(`    ${s}: ${dict[norm] || '(not found)'}`);
}

// Write JSON
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dict, null, 0), 'utf8');
console.log(`\n  Written to ${OUTPUT_PATH} (${Object.keys(dict).length} entries, ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(0)} KB)`);
console.log('\n=== Done! ===');
