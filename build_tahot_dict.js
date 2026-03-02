#!/usr/bin/env node
/**
 * build_tahot_dict.js
 *
 * Parses STEPBible TAHOT data (Translators Amalgamated Hebrew OT) to build
 * a comprehensive Hebrew word → English gloss dictionary.
 *
 * TAHOT has EVERY word in the Hebrew Bible pre-analyzed with:
 *   - Hebrew text (with prefixes separated by /)
 *   - English gloss for each morpheme
 *   - Strong's numbers
 *   - Full morphological codes
 *
 * Output: _tahot_dict.json — maps Hebrew word forms to English glosses
 *
 * Data source: github.com/STEPBible/STEPBible-Data (CC BY 4.0)
 */

const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '_cache', 'stepbible');
const FILES = [
  'TAHOT_Gen-Deu.txt',
  'TAHOT_Jos-Est.txt',
  'TAHOT_Job-Sng.txt',
  'TAHOT_Isa-Mal.txt',
];

// Strip cantillation marks (U+0591-U+05AF) but keep nikkud (U+05B0-U+05BD, U+05C1-U+05C2)
function stripCantillation(s) {
  return s.replace(/[\u0591-\u05AF]/g, '');
}

// Strip meteg (U+05BD) for lookup normalization
function stripMeteg(s) {
  return s.replace(/\u05BD/g, '');
}

// Clean translation text: strip <angle brackets> markers, keep [square bracket] content
function cleanTranslation(t) {
  // Remove <angle bracket> markers and their content (Hebrew-only markers like <obj.>)
  t = t.replace(/<[^>]*>/g, '').trim();
  // Remove [square bracket] markers but keep content (implied words)
  t = t.replace(/[\[\]]/g, '');
  // Clean up whitespace
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

console.log('=== Building TAHOT Dictionary ===\n');

const dict = {};       // full word form → gloss
const rootDict = {};   // root form (no prefixes) → gloss
let totalEntries = 0;
let skipped = 0;

for (const file of FILES) {
  const filePath = path.join(CACHE_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  MISSING: ${file}`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fileEntries = 0;

  for (const line of lines) {
    // Skip comment lines, headers, empty lines
    if (!line || line.startsWith('#') || line.startsWith('=') || line.startsWith('Eng ') ||
        line.startsWith('TAHOT') || line.startsWith('(') || line.startsWith('\t')) continue;

    const cols = line.split('\t');
    if (cols.length < 4) continue;

    const ref = cols[0];       // Gen.1.1#01=L
    const hebrew = cols[1];    // בְּ/רֵאשִׁ֖ית
    const translit = cols[2];  // be./re.Shit
    const translation = cols[3]; // in/ beginning

    // Must be a valid data row (starts with book reference)
    if (!ref || !ref.match(/^[A-Z0-9]/i)) continue;
    if (!hebrew || !translation) continue;

    // Strip backslash punctuation from Hebrew (e.g., \׃ \־)
    let heb = hebrew.replace(/\\[^\t]*/g, '').replace(/\\./g, '');

    // Process translation: join prefix/suffix parts with hyphens
    let trans = translation.replace(/\\[^\t]*/g, '');

    // Split by / to get morpheme parts
    const hebParts = heb.split('/');
    const transParts = trans.split('/').map(p => cleanTranslation(p));

    // Build full word (join Hebrew parts, strip cantillation)
    const fullHeb = stripCantillation(hebParts.join('')).normalize('NFC');
    const fullHebNoMeteg = stripMeteg(fullHeb);

    // Build full gloss (join translation parts with hyphens)
    const fullGloss = transParts.filter(p => p.length > 0).join('-');

    if (!fullHeb || !fullGloss || fullGloss === '-') {
      skipped++;
      continue;
    }

    // Store full word form → gloss (first occurrence wins for full forms)
    if (!dict[fullHebNoMeteg]) {
      dict[fullHebNoMeteg] = fullGloss;
    }
    // Also store without meteg variant
    if (fullHeb !== fullHebNoMeteg && !dict[fullHeb]) {
      dict[fullHeb] = fullGloss;
    }

    // Extract root (the part in {curly brackets} in dStrongs, or the last Hebrew part)
    if (hebParts.length > 1) {
      // Has prefixes — extract root and its translation
      const rootHeb = stripCantillation(hebParts[hebParts.length - 1]).normalize('NFC');
      const rootGloss = cleanTranslation(transParts[transParts.length - 1] || '');
      if (rootHeb && rootGloss && rootGloss.length > 0) {
        const rootHebNoMeteg = stripMeteg(rootHeb);
        if (!rootDict[rootHebNoMeteg]) {
          rootDict[rootHebNoMeteg] = rootGloss;
        }
      }
    }

    fileEntries++;
    totalEntries++;
  }

  console.log(`  ${file}: ${fileEntries} word entries`);
}

// Merge root dict into main dict (root entries don't override full-form entries)
let rootAdded = 0;
for (const [k, v] of Object.entries(rootDict)) {
  if (!dict[k]) {
    dict[k] = v;
    rootAdded++;
  }
}

console.log(`\n  Total entries: ${totalEntries}`);
console.log(`  Unique full forms: ${Object.keys(dict).length - rootAdded}`);
console.log(`  Root forms added: ${rootAdded}`);
console.log(`  Final dictionary: ${Object.keys(dict).length} entries`);
console.log(`  Skipped: ${skipped}`);

// Write output
const outPath = path.join(__dirname, '_tahot_dict.json');
fs.writeFileSync(outPath, JSON.stringify(dict, null, 0));
const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
console.log(`\n  Written to: _tahot_dict.json (${sizeMB} MB)`);

// Show sample entries
console.log('\n  Sample entries:');
const samples = ['בְּרֵאשִׁית', 'בָּרָא', 'אֱלֹהִים', 'הַשָּׁמַיִם', 'הָאָרֶץ',
                 'וַיֹּאמֶר', 'יְהִי', 'אוֹר', 'וַיְהִי', 'עֶרֶב', 'בֹקֶר',
                 'לָיְלָה', 'דָּוִיד', 'שְׁלֹמֹה', 'יְרוּשָׁלַיִם'];
for (const s of samples) {
  const norm = s.normalize('NFC');
  console.log(`    ${s} → ${dict[norm] || '(not found)'}`);
}

console.log('\n=== Done! ===');
