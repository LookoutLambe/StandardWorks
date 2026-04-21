// _audit_bom_dc_pgp_glosses.js
// Audits BOM / DC / PGP gloss issues without modifying any scripture text.
//
// Usage (PowerShell):
//   node .\\_audit_bom_dc_pgp_glosses.js
//
// Output:
//   _audit_gloss_report.json
//   _audit_gloss_report.summary.txt
//
// What it flags:
// - empty glosses
// - Hebrew characters inside gloss text
// - glosses that look like transliterations / nonsense tokens
// - words where we can compute a Strong's-derived "morph gloss" but the
//   displayed gloss seems to disagree strongly (heuristic; review needed)
//
// Note:
// - This uses the same *heuristic* morph-gloss algorithm currently wired in the UI.
//   It is not a replacement for real morphology datasets (OSHB/MorphGNT), but it
//   gives a high-signal "fix list" for obvious issues.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function stripHebrewMarks(s) {
  return (s || '').replace(/[\u0591-\u05C7]/g, '');
}

function normalizeHebrewSurface(s) {
  // Remove sof pasuq marker used in datasets and maqaf, strip marks.
  return stripHebrewMarks((s || '').replace(/\u05C3/g, '')).replace(/[\u05BE]/g, '');
}

function guessAffixPartsForMorphGloss(heb) {
  const s = normalizeHebrewSurface(heb);
  const prefixTokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === 'ו') { prefixTokens.push('and'); i++; continue; }
    if (ch === 'ב') { prefixTokens.push('in'); i++; continue; }
    if (ch === 'ל') { prefixTokens.push('to'); i++; continue; }
    if (ch === 'כ') { prefixTokens.push('as'); i++; continue; }
    if (ch === 'מ') { prefixTokens.push('from'); i++; continue; }
    if (ch === 'ש') { prefixTokens.push('that'); i++; continue; }
    if (ch === 'ה') { prefixTokens.push('the'); i++; continue; }
    break;
  }

  let base = s.slice(i);

  let suffixToken = '';
  const sufMap = [
    ['יהם', 'their'], ['יהן', 'their'], ['יכם', 'your'], ['יכן', 'your'],
    ['ינו', 'our'], ['ני', 'my'], ['י', 'my'],
    ['ך', 'your'], ['כם', 'your'], ['כן', 'your'],
    ['ו', 'his'], ['ה', 'her'], ['ם', 'their'], ['ן', 'their'],
  ];
  for (const [suf, tok] of sufMap) {
    if (base.length > suf.length + 1 && base.endsWith(suf)) {
      suffixToken = tok;
      base = base.slice(0, -suf.length);
      break;
    }
  }

  return { prefixTokens, base, suffixToken };
}

function computeMorphGloss(heb, strongsLookup, strongsRoots) {
  try {
    if (!strongsLookup || !strongsRoots) return '';
    const parts = guessAffixPartsForMorphGloss(heb);
    // Try Strong's lookup using surface and prefix-stripped forms (pointed and unpointed),
    // similar to the in-app popup strategy.
    const surface = (heb || '').replace(/\u05C3/g, '');
    const stripped = stripHebrewPrefixes(surface);
    const base = parts.base || stripped;
    if (!base) return '';
    const sNum =
      strongsLookup[surface] ||
      strongsLookup[stripped] ||
      strongsLookup[base] ||
      strongsLookup[stripHebrewMarks(surface)] ||
      strongsLookup[stripHebrewMarks(stripped)] ||
      strongsLookup[stripHebrewMarks(base)] ||
      '';
    if (!sNum || !strongsRoots[sNum]) return '';
    let lemmaGloss = (strongsRoots[sNum].g || '').trim();
    if (!lemmaGloss) return '';
    lemmaGloss = lemmaGloss.replace(/\s+/g, ' ').trim();
    if (lemmaGloss.split(' ').length > 5) lemmaGloss = lemmaGloss.split(' ').slice(0, 3).join(' ');
    const tokens = [];
    for (const t of parts.prefixTokens) if (t) tokens.push(t);
    if (parts.suffixToken) tokens.push(parts.suffixToken);
    const composed = tokens.length ? `${tokens.join('-')}-${lemmaGloss}` : lemmaGloss;
    return composed.replace(/-/g, ' ').trim();
  } catch {
    return '';
  }
}

function stripHebrewPrefixes(w) {
  // Prefix stripping similar to reader pages; removes maqaf-joined particles and
  // strips 1–2 layers of common prefixes.
  w = (w || '').replace(/\u05C3/g, '');
  w = w.replace(/^.*־/, '');
  const prefixes = [
    /^וְ/, /^וַ/, /^וּ/, /^וָ/, /^וֶ/,
    /^הַ/, /^הָ/, /^הֶ/,
    /^בְּ/, /^בַּ/, /^בִּ/, /^בָּ/, /^בֶּ/, /^בְ/, /^בַ/, /^בִ/,
    /^לְ/, /^לַ/, /^לִ/, /^לָ/, /^לֶ/,
    /^מִ/, /^מֵ/, /^מְ/, /^מַ/,
    /^כְּ/, /^כַּ/, /^כְ/, /^כַ/,
    /^שֶׁ/, /^שֶ/
  ];
  let stripped = w;
  for (const re of prefixes) {
    if (re.test(stripped) && stripped.replace(re, '').length >= 2) { stripped = stripped.replace(re, ''); break; }
  }
  for (const re of prefixes) {
    if (re.test(stripped) && stripped.replace(re, '').length >= 2) { stripped = stripped.replace(re, ''); break; }
  }
  return stripped;
}

function looksLikeName(heb) {
  // Heuristic: many proper names appear unprefixed and have no Strong's gloss entry,
  // or gloss is a capitalized name. We can't reliably detect; this is conservative.
  const s = stripHebrewMarks(heb || '');
  // If includes geresh/gershayim or is very short, skip.
  if (s.length <= 1) return true;
  return false;
}

function isHebrewInGloss(gloss) {
  return /[\u0590-\u05FF]/.test(gloss || '');
}

function isEmptyGloss(gloss) {
  return !gloss || !String(gloss).trim();
}

function looksLikeTransliteration(gloss) {
  // Flags single-token or hyphenated tokens that look like consonant strings,
  // not English words. This is intentionally simple and "review-needed".
  const g = String(gloss || '').trim();
  if (!g) return false;
  if (isHebrewInGloss(g)) return true;
  // If it contains mostly letters + hyphens and is short, and has no vowels.
  const noPunct = g.toLowerCase().replace(/[^a-z- ]/g, '');
  if (noPunct.length !== g.toLowerCase().length) return false;
  const tokens = noPunct.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  // Many of your glosses are hyphenated English like "and-said" which are fine.
  // Transliteration-like tends to be a single token with few vowels.
  if (tokens.length === 1) {
    const t = tokens[0].replace(/-/g, '');
    if (t.length >= 4 && t.length <= 10) {
      const vowels = (t.match(/[aeiou]/g) || []).length;
      if (vowels === 0) return true;
    }
  }
  return false;
}

function tokenizeEnglish(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[–—]/g, ' ')
    .replace(/[.,;:!?'"()\[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function disagreementScore(curatedGloss, morphGloss) {
  // Returns 0..1 (higher = more different)
  const a = new Set(tokenizeEnglish(curatedGloss));
  const b = new Set(tokenizeEnglish(morphGloss));
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union ? 1 - inter / union : 0;
}

function extractBomVerseArraysFromHtml(html) {
  // Extract const/var <name>Verses = [ ... ] arrays using bracket depth scan.
  const results = {};
  const declRegex = /(const|var)\s+(\w+Verses)\s*=\s*\[/g;
  let match;
  while ((match = declRegex.exec(html)) !== null) {
    const varName = match[2];
    const startIdx = match.index + match[0].length - 1; // points at '['
    let depth = 1;
    let i = startIdx + 1;
    while (i < html.length && depth > 0) {
      const ch = html[i];
      if (ch === '[') depth++;
      else if (ch === ']') depth--;
      i++;
    }
    if (depth !== 0) continue;
    const slice = html.substring(startIdx, i);
    try {
      const arr = vm.runInNewContext(`(${slice})`, {});
      results[varName] = arr;
    } catch {
      // ignore malformed
    }
  }
  return results;
}

function loadStrongs() {
  const strongsRootsJs = readText(path.join(ROOT, 'strongs_roots.js'));
  const strongsLookupJs = readText(path.join(ROOT, 'strongs_lookup.js'));
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(strongsRootsJs, sandbox, { timeout: 20000 });
  vm.runInContext(strongsLookupJs, sandbox, { timeout: 20000 });
  return { strongsRoots: sandbox.window._strongsRoots || {}, strongsLookup: sandbox.window._strongsLookup || {} };
}

function loadDcVerses() {
  const dir = path.join(ROOT, 'dc_verses');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  const collected = [];
  const sandbox = {
    renderVerseSet: (verseData, containerId) => {
      collected.push({ containerId, verseData });
    }
  };
  vm.createContext(sandbox);
  for (const f of files) {
    const js = readText(path.join(dir, f));
    try { vm.runInContext(js, sandbox, { timeout: 20000 }); } catch {}
  }
  return collected;
}

function loadPgpVerses() {
  const dir = path.join(ROOT, 'pgp_verses');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  const collected = [];
  const sandbox = {
    renderVerseSet: (verseData, containerId) => {
      collected.push({ containerId, verseData });
    }
  };
  vm.createContext(sandbox);
  for (const f of files) {
    const js = readText(path.join(dir, f));
    try { vm.runInContext(js, sandbox, { timeout: 20000 }); } catch {}
  }
  return collected;
}

function loadBomVerses() {
  const dir = path.join(ROOT, 'bom', 'verses');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  const collected = [];
  const sandbox = {
    renderVerseSet: (verseData, containerId) => {
      collected.push({ containerId, verseData });
    }
  };
  vm.createContext(sandbox);
  for (const f of files) {
    const js = readText(path.join(dir, f));
    try { vm.runInContext(js, sandbox, { timeout: 20000 }); } catch {}
  }
  return collected;
}

function auditVerseSets(label, verseSets, strongsLookup, strongsRoots, verseKeyFrom) {
  const issues = [];
  let totalWords = 0;

  for (const set of verseSets) {
    const verseData = set.verseData || set;
    const containerId = set.containerId || '';
    for (let vi = 0; vi < verseData.length; vi++) {
      const v = verseData[vi];
      if (!v || !v.words) continue;
      const verseKey = verseKeyFrom(containerId, vi, v) || `${label}|${containerId}|${vi + 1}`;

      for (let wi = 0; wi < v.words.length; wi++) {
        const pair = v.words[wi];
        if (!pair || pair.length < 2) continue;
        const heb = pair[0];
        const glossRaw = pair[1];
        if (heb === '׃' || heb === '\u05C3') continue;
        totalWords++;

        const curated = String(glossRaw || '').replace(/-/g, ' ').trim();
        const morph = computeMorphGloss(heb, strongsLookup, strongsRoots);

        const rec = {
          volume: label,
          verseKey,
          wordIndex: wi,
          hebrew: heb,
          curatedGloss: curated,
          morphGloss: morph,
          containerId,
        };

        if (isEmptyGloss(curated)) {
          issues.push({ type: 'empty_gloss', ...rec });
          continue;
        }
        if (isHebrewInGloss(curated)) {
          issues.push({ type: 'hebrew_in_gloss', ...rec });
        }
        if (looksLikeTransliteration(curated)) {
          issues.push({ type: 'transliteration_like_gloss', ...rec });
        }

        if (morph) {
          // If morph gloss exists but curated differs a lot, flag as review-needed.
          // Exclude some common acceptable differences like "and-..." formatting already normalized.
          const score = disagreementScore(curated, morph);
          if (score >= 0.85 && !looksLikeName(heb)) {
            issues.push({ type: 'curated_vs_morph_disagree', score, ...rec });
          }
        } else {
          // If we cannot compute a morph gloss but curated is clearly not a name,
          // this could indicate missing Strong's mapping.
          const noHeb = normalizeHebrewSurface(heb);
          if (noHeb.length >= 2 && !looksLikeName(heb)) {
            issues.push({ type: 'no_morph_gloss_available', ...rec });
          }
        }
      }
    }
  }

  return { issues, totalWords };
}

function verseKeyFromDc(containerId, vi) {
  // containerId like "dc1-ch1-verses" or "od1-ch1-verses"
  const cid = (containerId || '').replace('-verses', '');
  const m = cid.match(/^(dc(\d+)-ch1)$/);
  if (m) return `D&C|${parseInt(m[2], 10)}|${vi + 1}`;
  if (cid === 'od1-ch1') return `OD|1|${vi + 1}`;
  if (cid === 'od2-ch1') return `OD|2|${vi + 1}`;
  return `DC|${cid}|${vi + 1}`;
}

function verseKeyFromPgp(containerId, vi) {
  const cid = (containerId || '').replace('-verses', '');
  const m = cid.match(/^(ms-ch|ab-ch)(\d+)$/);
  if (m) return `${m[1] === 'ms-ch' ? 'Moses' : 'Abraham'}|${parseInt(m[2], 10)}|${vi + 1}`;
  if (cid.startsWith('jsm-ch')) return `JS-Matthew|1|${vi + 1}`;
  if (cid.startsWith('jsh-ch')) return `JS-History|1|${vi + 1}`;
  if (cid.startsWith('aof-ch')) return `A-of-F|1|${vi + 1}`;
  return `PGP|${cid}|${vi + 1}`;
}

function verseKeyFromBom(varName, vi, v) {
  // For BOM we don't have canonical ids here; keep it stable and searchable.
  const num = v && v.num ? v.num : '';
  return `BOM|${varName}|${vi + 1}|${num}`;
}

function main() {
  const { strongsLookup, strongsRoots } = loadStrongs();

  // BOM: verse files in bom/verses/*.js
  const bomVerseSets = loadBomVerses();

  // DC + PGP: js files in directories
  const dcVerseSets = loadDcVerses();
  const pgpVerseSets = loadPgpVerses();

  const bom = auditVerseSets('BOM', bomVerseSets, strongsLookup, strongsRoots, (cid, vi, v) => verseKeyFromBom(cid, vi, v));
  const dc = auditVerseSets('DC', dcVerseSets, strongsLookup, strongsRoots, verseKeyFromDc);
  const pgp = auditVerseSets('PGP', pgpVerseSets, strongsLookup, strongsRoots, verseKeyFromPgp);

  const allIssues = [...bom.issues, ...dc.issues, ...pgp.issues];

  const byType = {};
  for (const it of allIssues) {
    byType[it.type] = (byType[it.type] || 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      bomWords: bom.totalWords,
      dcWords: dc.totalWords,
      pgpWords: pgp.totalWords,
      issues: allIssues.length,
      byType,
    },
    issues: allIssues,
  };

  const outJson = path.join(ROOT, '_audit_gloss_report.json');
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');

  const lines = [];
  lines.push(`Gloss audit report (BOM / DC / PGP)`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push(`Total words scanned: BOM=${bom.totalWords}, DC=${dc.totalWords}, PGP=${pgp.totalWords}`);
  lines.push(`Total issues flagged: ${allIssues.length}`);
  lines.push('');
  lines.push(`By type:`);
  Object.keys(byType).sort().forEach(k => lines.push(`  - ${k}: ${byType[k]}`));
  lines.push('');
  lines.push(`Top 50 disagreements (curated_vs_morph_disagree):`);
  const topDis = allIssues
    .filter(x => x.type === 'curated_vs_morph_disagree')
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 50);
  for (const d of topDis) {
    lines.push(`  ${d.volume} ${d.verseKey} [${d.wordIndex}] ${d.hebrew}`);
    lines.push(`    curated: ${d.curatedGloss}`);
    lines.push(`    morph:   ${d.morphGloss}`);
  }

  const outTxt = path.join(ROOT, '_audit_gloss_report.summary.txt');
  fs.writeFileSync(outTxt, lines.join('\n'), 'utf8');

  console.log(lines.slice(0, 60).join('\n'));
  console.log(`\nWrote:\n  ${outJson}\n  ${outTxt}\n`);
}

main();

