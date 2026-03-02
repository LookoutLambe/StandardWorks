#!/usr/bin/env node
/**
 * build_strongs_lookup.js
 *
 * Builds a Hebrew word → Strong's H-number lookup dictionary from two sources:
 *   1. OpenScriptures HebrewStrong.xml — canonical lemma → H-number
 *   2. STEPBible TAHOT files — every inflected form → H-number
 *
 * Output:
 *   _strongs_lookup.json — { "אֱלֹהִים": "H0430", ... }
 *   strongs_lookup.js    — window._strongsLookup = { ... };
 *
 * Usage: node build_strongs_lookup.js
 */

const fs = require('fs');
const path = require('path');

const XML_PATH = path.join(__dirname, '_cache', 'strongs', 'HebrewStrong.xml');
const TAHOT_DIR = path.join(__dirname, '_cache', 'stepbible');
const TAHOT_FILES = [
  'TAHOT_Gen-Deu.txt',
  'TAHOT_Jos-Est.txt',
  'TAHOT_Job-Sng.txt',
  'TAHOT_Isa-Mal.txt',
];
const JSON_OUT = path.join(__dirname, '_strongs_lookup.json');
const JS_OUT = path.join(__dirname, 'strongs_lookup.js');

// Strip cantillation marks (U+0591-U+05AF) but keep nikkud
function stripCantillation(s) {
  return s.replace(/[\u0591-\u05AF]/g, '');
}

// Strip meteg (U+05BD) for lookup normalization
function stripMeteg(s) {
  return s.replace(/\u05BD/g, '');
}

// Pad H-number to 4 digits: H1 → H0001, H430 → H0430
function padHNum(h) {
  const m = h.match(/^H(\d+)/);
  if (!m) return h;
  return 'H' + m[1].padStart(4, '0');
}

// Strip trailing disambiguation letter: H0430G → H0430, H1254A → H1254
function stripDisambig(h) {
  return h.replace(/[A-Za-z]+$/, '');
}

console.log('=== Building Strong\'s H-Number Lookup ===\n');

const lookup = {}; // Hebrew word → H-number
let xmlCount = 0;
let tahotCount = 0;

// ──────────────────────────────────────────────
// Source 1: HebrewStrong.xml — canonical lemmas
// ──────────────────────────────────────────────
console.log('Step 1: Parsing HebrewStrong.xml...');

const xml = fs.readFileSync(XML_PATH, 'utf8');
const entryRegex = /<entry\s+id="(H\d+)">([\s\S]*?)<\/entry>/g;

let match;
while ((match = entryRegex.exec(xml)) !== null) {
  const hNum = padHNum(match[1]);
  const body = match[2];

  // Extract Hebrew word
  const wMatch = body.match(/<w\s+[^>]*xml:lang="([^"]*)"[^>]*>([^<]+)<\/w>/);
  if (!wMatch) continue;

  const lang = wMatch[1];
  if (lang === 'arc') continue; // skip Aramaic

  const hebWord = stripCantillation(wMatch[2].trim()).normalize('NFC');
  const hebNoMeteg = stripMeteg(hebWord);

  if (hebWord && !lookup[hebNoMeteg]) {
    lookup[hebNoMeteg] = hNum;
    xmlCount++;
  }
  if (hebWord !== hebNoMeteg && !lookup[hebWord]) {
    lookup[hebWord] = hNum;
  }

  // Also extract alternate forms from <source> block
  const sourceBlock = body.match(/<source>([\s\S]*?)<\/source>/);
  if (sourceBlock) {
    const altRegex = /<w[^>]*>([^<]+)<\/w>/g;
    let altMatch;
    while ((altMatch = altRegex.exec(sourceBlock[1])) !== null) {
      const altWord = stripCantillation(altMatch[1].trim()).normalize('NFC');
      const altNoMeteg = stripMeteg(altWord);
      if (/[\u05D0-\u05EA]/.test(altWord) && !lookup[altNoMeteg]) {
        lookup[altNoMeteg] = hNum;
        xmlCount++;
      }
    }
  }
}

console.log(`  HebrewStrong.xml: ${xmlCount} entries\n`);

// ──────────────────────────────────────────────
// Source 2: TAHOT files — inflected forms
// ──────────────────────────────────────────────
console.log('Step 2: Parsing TAHOT files...');

for (const file of TAHOT_FILES) {
  const filePath = path.join(TAHOT_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  MISSING: ${file}`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let fileAdded = 0;

  for (const line of lines) {
    // Skip header/comment lines
    if (!line || line.startsWith('#') || line.startsWith('=') || line.startsWith('Eng ') ||
        line.startsWith('TAHOT') || line.startsWith('(') || line.startsWith('\t')) continue;

    const cols = line.split('\t');
    if (cols.length < 9) continue;

    const ref = cols[0];
    const hebrew = cols[1];     // בְּ/רֵאשִׁ֖ית
    const rootStrong = cols[8]; // H7225G (root dStrong+Instance)

    // Must be a valid data row
    if (!ref || !ref.match(/^[A-Z0-9]/i)) continue;
    if (!hebrew || !rootStrong) continue;

    // Clean Strong's number: strip disambiguation letter, pad to 4 digits
    const cleanStrong = rootStrong.replace(/_[A-Z]$/, ''); // strip instance marker like _A
    const hNum = padHNum(stripDisambig(cleanStrong));
    if (!hNum.match(/^H\d{4}$/)) continue;

    // Strip backslash punctuation from Hebrew
    let heb = hebrew.replace(/\\[^\t/]*/g, '');

    // Split by / to get morpheme parts
    const hebParts = heb.split('/');

    // Map the ROOT part (last element after /) to its Strong's number
    const rootHeb = stripCantillation(hebParts[hebParts.length - 1]).normalize('NFC');
    const rootNoMeteg = stripMeteg(rootHeb);
    if (rootHeb && /[\u05D0-\u05EA]/.test(rootHeb)) {
      if (!lookup[rootNoMeteg]) {
        lookup[rootNoMeteg] = hNum;
        fileAdded++;
        tahotCount++;
      }
      if (rootHeb !== rootNoMeteg && !lookup[rootHeb]) {
        lookup[rootHeb] = hNum;
      }
    }

    // Also map the FULL form (all parts joined) to the root's H-number
    const fullHeb = stripCantillation(hebParts.join('')).normalize('NFC');
    const fullNoMeteg = stripMeteg(fullHeb);
    if (fullHeb && /[\u05D0-\u05EA]/.test(fullHeb) && fullHeb !== rootHeb) {
      if (!lookup[fullNoMeteg]) {
        lookup[fullNoMeteg] = hNum;
        fileAdded++;
        tahotCount++;
      }
      if (fullHeb !== fullNoMeteg && !lookup[fullHeb]) {
        lookup[fullHeb] = hNum;
      }
    }
  }

  console.log(`  ${file}: +${fileAdded} new entries`);
}

console.log(`\n  TAHOT total: +${tahotCount} entries`);
console.log(`  Combined dictionary: ${Object.keys(lookup).length} entries`);

// ──────────────────────────────────────────────
// Output
// ──────────────────────────────────────────────
console.log('\nStep 3: Writing output files...');

// JSON output
fs.writeFileSync(JSON_OUT, JSON.stringify(lookup, null, 0), 'utf8');
const jsonSize = (fs.statSync(JSON_OUT).size / 1024).toFixed(0);
console.log(`  ${JSON_OUT} (${jsonSize} KB)`);

// JS runtime output
const jsContent = '// Strong\'s Hebrew Lookup — auto-generated by build_strongs_lookup.js\n' +
  '// Maps Hebrew word forms to Strong\'s H-numbers\n' +
  '// Sources: OpenScriptures HebrewStrong.xml + STEPBible TAHOT (CC BY 4.0)\n' +
  'window._strongsLookup = ' + JSON.stringify(lookup) + ';\n';
fs.writeFileSync(JS_OUT, jsContent, 'utf8');
const jsSize = (fs.statSync(JS_OUT).size / 1024).toFixed(0);
console.log(`  ${JS_OUT} (${jsSize} KB)`);

// Verification
console.log('\nStep 4: Verification...');
const checks = [
  ['אֱלֹהִים', 'H0430'],
  ['בָּרָא', 'H1254'],
  ['שָׁמַיִם', 'H8064'],
  ['אֶרֶץ', 'H0776'],
  ['אָדָם', 'H0120'],
  ['יוֹם', 'H3117'],
  ['אוֹר', 'H0216'],
  ['מַיִם', 'H4325'],
  ['דָּוִד', 'H1732'],
  ['יְרוּשָׁלַיִם', 'H3389'],
  ['בְּרֵאשִׁית', 'H7225'],
  ['הַשָּׁמַיִם', 'H8064'],
];

let passed = 0;
for (const [heb, expected] of checks) {
  const norm = heb.normalize('NFC');
  const got = lookup[norm] || '(not found)';
  const ok = got === expected;
  console.log(`  ${ok ? '✓' : '✗'} ${heb} → ${got}${ok ? '' : ' (expected ' + expected + ')'}`);
  if (ok) passed++;
}
console.log(`\n  ${passed}/${checks.length} checks passed`);

console.log('\n=== Done! ===');
