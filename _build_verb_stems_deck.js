// _build_verb_stems_deck.js
//
// Builds a deck of real Hebrew verb forms from the project's verse datasets,
// auto-classified into likely binyan (qal/nifal/piel/pual/hifil/hofal/hitpael)
// using niqqud/prefix pattern heuristics.
//
// Usage:
//   node .\\_build_verb_stems_deck.js
//
// Output:
//   verb_stems_deck.js  (window.VerbStemsDeckMeta / window.VerbStemsDeck)
//
// Notes:
// - This is heuristic (not OSHB morphology). It's meant for practice, not scholarship.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;

function readText(p) { return fs.readFileSync(p, 'utf8'); }

function loadVerseDir(relDir) {
  const dir = path.join(ROOT, relDir);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  const collected = [];
  const sandbox = { renderVerseSet: (verseData, containerId) => collected.push({ containerId, verseData }) };
  vm.createContext(sandbox);
  for (const f of files) {
    const js = readText(path.join(dir, f));
    try { vm.runInContext(js, sandbox, { timeout: 20000 }); } catch {}
  }
  return collected;
}

function stripMarks(s) { return (s || '').replace(/[\u0591-\u05C7]/g, ''); }

function hasDagesh(letter) {
  // letter + dagesh U+05BC
  return /\u05BC/.test(letter || '');
}

function classifyBinyan(heb) {
  // Return { stem, confidence } or null
  const w = String(heb || '').replace(/\u05C3/g, '').trim();
  if (!/[\u05D0-\u05EA]/.test(w)) return null;
  if (w.length < 2) return null;

  // Quick reject: maqaf chains are often phrases; still allow.

  // Hitpael: הִת / הִתְ
  if (/^הִת/.test(w)) return { stem: 'Hitpael', confidence: 0.9 };

  // Nifal: נִ prefix (e.g., נִקְטַל) or נֶ prefix sometimes
  if (/^נִ/.test(w)) return { stem: 'Nifal', confidence: 0.75 };

  // Hifil: הִ prefix (not hitpael)
  if (/^הִ/.test(w)) return { stem: 'Hifil', confidence: 0.7 };

  // Hofal: הֻ / הָ + u/o-class often; simplest strong signal is הֻ
  if (/^הֻ/.test(w)) return { stem: 'Hofal', confidence: 0.75 };

  // Pual: typically has dagesh in middle radical and u-class vowels; hard to detect robustly.
  // Heuristic: has dagesh somewhere not at first letter and contains ֻ (qubuts)
  if (/\u05BB/.test(w) && /[\u05D0-\u05EA]\u05BC/.test(w.slice(1))) return { stem: 'Pual', confidence: 0.55 };

  // Piel: strong signal is dagesh forte in second radical (letter+dagesh not first char)
  if (/[\u05D0-\u05EA]\u05BC/.test(w.slice(1))) return { stem: 'Piel', confidence: 0.55 };

  // Qal: default bucket (very common) — but low confidence.
  return { stem: 'Qal', confidence: 0.25 };
}

function looksVerbCandidate(heb) {
  const w = String(heb || '').replace(/\u05C3/g, '').trim();
  if (!w) return false;
  if (w === '׃') return false;
  // filter very common particles by consonants
  const c = stripMarks(w).replace(/[־]/g, '');
  if (c.length <= 1) return false;
  const stop = new Set(['כי','אשר','לא','את','על','אל','עם','מן','בין','גם','או','אך','כן','זה','זאת','אלה','הוא','היא','הם','הן']);
  if (stop.has(c)) return false;
  return true;
}

function addCount(map, key) { map[key] = (map[key] || 0) + 1; }

function main() {
  const volumes = [
    { key: 'ot', dir: 'ot_verses' },
    { key: 'nt', dir: 'nt_verses' },
    { key: 'bom', dir: path.join('bom', 'verses') },
    { key: 'dc', dir: 'dc_verses' },
    { key: 'pgp', dir: 'pgp_verses' },
    { key: 'jst', dir: 'jst_verses' },
  ];

  const counts = {}; // stem -> { heb -> count }
  const stemTotals = {};
  let totalTokens = 0;

  for (const vol of volumes) {
    const verseSets = loadVerseDir(vol.dir);
    for (const set of verseSets) {
      for (const v of (set.verseData || [])) {
        if (!v || !v.words) continue;
        for (const pair of v.words) {
          if (!pair || pair.length < 2) continue;
          const heb = pair[0];
          if (!looksVerbCandidate(heb)) continue;
          totalTokens++;
          const cls = classifyBinyan(heb);
          if (!cls) continue;
          // Ignore low-confidence Qal by default; keep only when it has a vav-consecutive (wayyiqtol) look.
          if (cls.stem === 'Qal' && cls.confidence < 0.5) continue;
          if (!counts[cls.stem]) counts[cls.stem] = {};
          addCount(counts[cls.stem], heb);
          stemTotals[cls.stem] = (stemTotals[cls.stem] || 0) + 1;
        }
      }
    }
  }

  // Build deck: take top N forms per stem
  const deck = [];
  const STEMS = ['Qal','Nifal','Piel','Pual','Hifil','Hofal','Hitpael'];
  for (const stem of STEMS) {
    const m = counts[stem] || {};
    const arr = Object.keys(m).map(heb => ({ heb, stem, count: m[heb] }));
    arr.sort((a, b) => b.count - a.count);
    arr.slice(0, 300).forEach(it => deck.push(it));
  }

  // Shuffle deck deterministically-ish (simple)
  deck.sort((a, b) => b.count - a.count);

  const meta = {
    generatedAt: new Date().toISOString(),
    totalTokensScanned: totalTokens,
    stemTotals,
    deckSize: deck.length,
    notes: 'Heuristic stem detection from pointed Hebrew forms.',
  };

  const out = path.join(ROOT, 'verb_stems_deck.js');
  const js =
    `// verb_stems_deck.js (generated)\n` +
    `window.VerbStemsDeckMeta = ${JSON.stringify(meta)};\n` +
    `window.VerbStemsDeck = ${JSON.stringify(deck)};\n`;
  fs.writeFileSync(out, js, 'utf8');

  console.log('Wrote verb_stems_deck.js');
  console.log('Deck size:', deck.length);
  console.log('Stem totals:', stemTotals);
}

main();

