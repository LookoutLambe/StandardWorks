#!/usr/bin/env node
/**
 * build_strongs_roots.js
 *
 * Parses HebrewStrong.xml to build a Strong's H-number root derivation map.
 * Each entry gets its direct parent H-number (from <source><w src="H####">)
 * and ultimate root (following the chain to the primitive root).
 *
 * Output:
 *   _strongs_roots.json — full data for tooling
 *   strongs_roots.js    — window._strongsRoots = { ... };
 *
 * Usage: node build_strongs_roots.js
 */

const fs = require('fs');
const path = require('path');

const XML_PATH = path.join(__dirname, '_cache', 'strongs', 'HebrewStrong.xml');
const JSON_OUT = path.join(__dirname, '_strongs_roots.json');
const JS_OUT = path.join(__dirname, 'strongs_roots.js');

// Pad H-number to 4 digits: H1 → H0001
function padHNum(h) {
  const m = h.match(/^H(\d+)/);
  if (!m) return h;
  return 'H' + m[1].padStart(4, '0');
}

console.log('=== Building Strong\'s Root Derivation Map ===\n');

const xml = fs.readFileSync(XML_PATH, 'utf8');
const entryRegex = /<entry\s+id="(H\d+)">([\s\S]*?)<\/entry>/g;

const entries = {}; // H-number → { w, x, g, r, type }
let count = 0;

let match;
while ((match = entryRegex.exec(xml)) !== null) {
  const hNum = padHNum(match[1]);
  const body = match[2];

  // Extract Hebrew word + attributes
  const wMatch = body.match(/<w\s+([^>]*)>([^<]+)<\/w>/);
  if (!wMatch) continue;

  const attrs = wMatch[1];
  const hebWord = wMatch[2].trim();

  // Extract transliteration
  const xlitMatch = attrs.match(/xlit="([^"]*)"/);
  const xlit = xlitMatch ? xlitMatch[1] : '';

  // Extract pronunciation
  const pronMatch = attrs.match(/pron="([^"]*)"/);
  const pron = pronMatch ? pronMatch[1] : '';

  // Extract language
  const langMatch = attrs.match(/xml:lang="([^"]*)"/);
  const lang = langMatch ? langMatch[1] : 'heb';

  // Extract source tag
  const sourceMatch = body.match(/<source>([\s\S]*?)<\/source>/);
  const sourceText = sourceMatch ? sourceMatch[1] : '';

  // Extract primary gloss from <meaning><def>...</def></meaning>
  const meaningMatch = body.match(/<meaning>([\s\S]*?)<\/meaning>/);
  let gloss = '';
  if (meaningMatch) {
    const defMatch = meaningMatch[1].match(/<def>([^<]+)<\/def>/);
    if (defMatch) {
      gloss = defMatch[1].trim();
    }
  }

  // Classify derivation type
  let type = 'derived';
  if (/a primitive root/i.test(sourceText)) type = 'primitive root';
  else if (/a primitive word/i.test(sourceText)) type = 'primitive word';
  else if (/foreign origin/i.test(sourceText)) type = 'foreign';
  else if (/uncertain derivation/i.test(sourceText)) type = 'uncertain';
  else if (/unused root/i.test(sourceText)) type = 'unused root';

  // Extract direct parent: first <w src="H####"> in source
  // But NOT for primitive roots/words — their <w src> refs are "compare" refs, not derivations
  let parentH = null;
  const srcRef = sourceText.match(/<w\s+src="(H\d+)"/);
  if (srcRef && type !== 'primitive root' && type !== 'primitive word') {
    parentH = padHNum(srcRef[1]);
  }

  entries[hNum] = {
    w: hebWord,
    x: xlit,
    g: gloss,
    r: parentH,
    type: type,
    lang: lang
  };
  count++;
}

console.log(`Parsed ${count} entries from HebrewStrong.xml`);

// Count by type
const typeCounts = {};
for (const e of Object.values(entries)) {
  typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
}
console.log('\nDerivation types:');
for (const [t, c] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${t}: ${c}`);
}

// Compute ultimate root for each entry
function findUltimateRoot(hNum) {
  let current = hNum;
  const visited = new Set();
  while (true) {
    if (visited.has(current)) break; // cycle protection
    visited.add(current);
    const entry = entries[current];
    if (!entry || !entry.r) break; // no parent = this IS the root
    // If parent doesn't exist in our data, stop here
    if (!entries[entry.r]) break;
    current = entry.r;
  }
  return current === hNum ? null : current;
}

let rootedCount = 0;
let primitiveCount = 0;
for (const [hNum, entry] of Object.entries(entries)) {
  entry.u = findUltimateRoot(hNum);
  if (entry.u) rootedCount++;
  if (!entry.u && (entry.type === 'primitive root' || entry.type === 'primitive word')) primitiveCount++;
}

console.log(`\nUltimate roots computed:`);
console.log(`  Entries with a root ancestor: ${rootedCount}`);
console.log(`  Primitive roots/words (ARE roots): ${primitiveCount}`);

// Build compact output (skip lang field, skip type for 'derived')
const output = {};
for (const [hNum, entry] of Object.entries(entries)) {
  const obj = {
    w: entry.w,
    x: entry.x,
    g: entry.g
  };
  if (entry.r) obj.r = entry.r;
  if (entry.u) obj.u = entry.u;
  if (entry.type === 'primitive root') obj.p = 1;
  else if (entry.type === 'primitive word') obj.p = 2;
  output[hNum] = obj;
}

// Write JSON
fs.writeFileSync(JSON_OUT, JSON.stringify(output, null, 0), 'utf8');
const jsonSize = (fs.statSync(JSON_OUT).size / 1024).toFixed(0);
console.log(`\nWritten: _strongs_roots.json (${jsonSize} KB)`);

// Write JS runtime
const jsContent = '// Strong\'s Root Derivation Map — auto-generated by build_strongs_roots.js\n' +
  '// Maps H-numbers to root derivation data from OpenScriptures HebrewStrong.xml\n' +
  '// Fields: w=Hebrew word, x=transliteration, g=gloss, r=direct parent, u=ultimate root, p=primitive(1=root,2=word)\n' +
  'window._strongsRoots = ' + JSON.stringify(output) + ';\n';
fs.writeFileSync(JS_OUT, jsContent, 'utf8');
const jsSize = (fs.statSync(JS_OUT).size / 1024).toFixed(0);
console.log(`Written: strongs_roots.js (${jsSize} KB)`);

// Verification
console.log('\nVerification:');
const checks = [
  ['H3068', 'H1961', 'יְהֹוָה → הָיָה (to be/exist)'],
  ['H1961', null,    'הָיָה — primitive root'],
  ['H0430', 'H0193', 'אֱלֹהִים → ultimate root'],
  ['H1254', null,    'בָּרָא — primitive root'],
  ['H8064', null,    'שָׁמַיִם — check root chain'],
  ['H1732', null,    'דָּוִד — proper noun'],
];

for (const [hNum, expectedUlt, desc] of checks) {
  const e = output[hNum];
  if (!e) { console.log(`  ✗ ${hNum}: NOT FOUND`); continue; }
  const ult = e.u || '(primitive/self)';
  const parent = e.r || '(none)';
  const ok = expectedUlt === null ? !e.u : e.u === expectedUlt;
  console.log(`  ${ok ? '✓' : '~'} ${hNum} ${e.w}: parent=${parent}, ultimate=${ult} — ${desc}`);
}

console.log('\n=== Done! ===');
