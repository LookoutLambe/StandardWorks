#!/usr/bin/env node
/**
 * Scan Book of Mormon verse JS for likely mis-glossed Hebrew definite construct chains.
 *
 * Classic pattern: construct head (no ה on noun) + definite second noun (הַ…)
 *   e.g. סֵפֶר + הַיְּהוּדִים → gloss should read like "record-of" + "the-Jews",
 *   not "record" + "the-Jews" or "the-record" + "the-Jews".
 *
 * Also flags consecutive "the-*" + "the-*" gloss pairs where Hebrew suggests construct.
 *
 * Gloss convention: בְּיַד / מִיַּד + construct (in X's hand, from X's hand) should read
 * "in-the-hand-of-X", "from-the-hand-of-X", "by-the-hand-of-X", etc., not "in-hand-of-X".
 *
 * Same idea for other inseparable-style gloss prefixes (in/from/to/by/upon/into/out-of/unto/with):
 * when Hebrew marks definiteness, English hyphen glosses should usually read "prefix-the-N-of-…",
 * not "prefix-N-of-…". Bulk normalization for shared stems lives in apply_definite_prefix_glosses.js
 * at repo root (regex + word boundaries; re-run after adding stems).
 *
 * Usage: node bom/_scan_definite_construct_chains.js
 * Output: bom/_definite_construct_scan.json + .summary.txt
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VERSES_DIR = path.join(__dirname, 'verses');
const ROOT = path.join(__dirname, '..');

function stripNikkud(s) {
  return (s || '').replace(/[\u0591-\u05C7]/g, '');
}

/** After optional leading ו, does surface start with definite article ה + vowel (ha-/ha-)? */
function hasDefiniteArticleOnNoun(h) {
  let s = stripNikkud(h || '').replace(/\u05BE/g, '');
  while (s.startsWith('\u05D5')) s = s.slice(1); // strip narrative/conjunction vav
  // Allow one-layer inseparable prep before article (בכמל often fused with article)
  if (/^[\u05D1\u05DB\u05DC\u05DE]\u05D4/.test(s)) return true;
  return s.startsWith('\u05D4');
}

/** Rough: construct head often lacks ה on first noun (not foolproof). */
function lacksLeadingHayArticle(h) {
  let s = stripNikkud(h || '').replace(/\u05BE/g, '');
  while (s.startsWith('\u05D5')) s = s.slice(1);
  return !s.startsWith('\u05D4');
}

function glossNorm(g) {
  return String(g || '')
    .replace(/-/g, ' ')
    .trim()
    .toLowerCase();
}

function isParticleGloss(g) {
  const x = glossNorm(g);
  return (
    x.length <= 3 ||
    /^(and|or|but|not|that|for|also|now|then|yea|go|come|behold)$/i.test(x) ||
    x.startsWith('[')
  );
}

function glossAlreadyLinksOf(g1) {
  const a = String(g1 || '');
  // Already has construct / periphrastic "of" linking forward
  if (/(^|-)of(-|$)/.test(a)) return true;
  if (/concerning-|according-to-|upon-the-face|from-the-|into-the-|out-of-the-|to-the-|in-the-|by-the-|for-the-|with-the-|without-the-/i.test(a)) return true;
  return false;
}

function looksLikeVerbOrFunctionWordGloss(g1) {
  const x = glossNorm(g1);
  if (x.length <= 3) return true;
  // Leading function / clause markers (not construct heads)
  if (/^(and|or|but|that|for|also|now|then|yea|behold|therefore|nevertheless|wherefore|nevertheless|howbeit)\b/.test(x)) return true;
  if (/^(and-|to-|when-|if-|as-|not-|from-|in-|upon-|concerning-|according-|until-|after-|before-|because-|lest-|whether-)/.test(x)) return true;
  // Finite verb phrases often mis-trigger after refinement
  if (/(eth|est|ing|ould|must|shall|will|have|has|had|were|was|are|is)\b/.test(x)) return true;
  return false;
}

/** Hebrew token begins with inseparable preposition + noun (not bare construct head) */
function startsWithInsepPrepPhrase(h) {
  const s = stripNikkud(h || '').replace(/\u05BE/g, '');
  return /^[\u05D1\u05DB\u05DC\u05DE\u05E9\u05E2]/.test(s);
}

function scanPair(file, containerId, verseNum, i, w1, w2, findings) {
  const [h1, g1o] = w1;
  const [h2, g2o] = w2;
  const g1 = String(g1o || '');
  const g2 = String(g2o || '');
  if (!h1 || !h2 || h1 === '\u05C3' || h2 === '\u05C3') return;

  // Type A: Construct chain — head without ה, tail with ה + gloss "the-…",
  // but head gloss doesn't already carry an "of" link to the next noun.
  if (
    lacksLeadingHayArticle(h1) &&
    hasDefiniteArticleOnNoun(h2) &&
    /^the-/i.test(g2) &&
    !glossAlreadyLinksOf(g1) &&
    !looksLikeVerbOrFunctionWordGloss(g1) &&
    !startsWithInsepPrepPhrase(h1) &&
    !isParticleGloss(g1) &&
    g1.length > 0 &&
    g1.length < 48
  ) {
    findings.push({
      type: 'construct_chain_possible_missing_of',
      file,
      containerId,
      verseNum,
      index: i,
      he1: h1,
      gloss1: g1,
      he2: h2,
      gloss2: g2,
    });
  }

  // Type B: Both Hebrew definite-looking + both gloss "the-*" — sometimes stacked titles OK,
  // sometimes should be "X of the Y".
  if (
    hasDefiniteArticleOnNoun(h1) &&
    hasDefiniteArticleOnNoun(h2) &&
    /^the-/i.test(g1) &&
    /^the-/i.test(g2) &&
    !isParticleGloss(g1)
  ) {
    findings.push({
      type: 'double_the_gloss_pair',
      file,
      containerId,
      verseNum,
      index: i,
      he1: h1,
      gloss1: g1,
      he2: h2,
      gloss2: g2,
    });
  }
}

function main() {
  const files = fs.readdirSync(VERSES_DIR).filter((f) => f.endsWith('.js')).sort();
  const findings = [];
  let verseCount = 0;
  let wordCount = 0;

  for (const file of files) {
    const collected = [];
    const ctx = vm.createContext({
      renderVerseSet: (verseData, containerId) => {
        collected.push({ verseData, containerId });
      },
      // 1nephi.js ends with renderWords(colophonWords, ...) — stub for Node scan only
      renderWords: () => {},
      document: { getElementById: () => ({}) },
      console,
    });
    const code = fs.readFileSync(path.join(VERSES_DIR, file), 'utf8');
    try {
      vm.runInContext(code, ctx, { timeout: 120000 });
    } catch (e) {
      console.error(file, e.message);
      continue;
    }

    for (const { verseData, containerId } of collected) {
      if (!Array.isArray(verseData)) continue;
      for (const verse of verseData) {
        if (!verse || !verse.words) continue;
        verseCount++;
        const words = verse.words;
        const num = verse.num || '';
        for (let i = 0; i < words.length - 1; i++) {
          wordCount++;
          scanPair(file, containerId, num, i, words[i], words[i + 1], findings);
        }
      }
    }
  }

  const byType = {};
  for (const f of findings) {
    byType[f.type] = (byType[f.type] || 0) + 1;
  }

  const outJson = path.join(__dirname, '_definite_construct_scan.json');
  fs.writeFileSync(
    outJson,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totals: { versesSeen: verseCount, pairsScannedApprox: wordCount, findings: findings.length, byType },
        findings,
      },
      null,
      2
    ),
    'utf8'
  );

  const lines = [];
  lines.push('BOM definite construct chain gloss scan');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Findings: ${findings.length}`);
  lines.push(`By type: ${JSON.stringify(byType)}`);
  lines.push('');
  lines.push('First 80 findings (review):');
  for (let i = 0; i < Math.min(80, findings.length); i++) {
    const f = findings[i];
    lines.push(
      `${f.type} | ${f.file} ${f.containerId} v${f.verseNum} [${f.index}]`
    );
    lines.push(`  ${f.he1} → ${f.gloss1}`);
    lines.push(`  ${f.he2} → ${f.gloss2}`);
  }

  const outTxt = path.join(__dirname, '_definite_construct_scan.summary.txt');
  fs.writeFileSync(outTxt, lines.join('\n'), 'utf8');

  console.log(lines.slice(0, 40).join('\n'));
  console.log(`\nWrote:\n  ${outJson}\n  ${outTxt}`);
}

main();
