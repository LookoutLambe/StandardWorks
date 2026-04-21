// _build_vocab_decks.js
// Build vocabulary decks based on actual word usage in the project verse datasets.
//
// Usage (PowerShell):
//   node .\\_build_vocab_decks.js
//
// Output:
//   vocab_decks.js  (window.VocabDecks / window.VocabDeckMeta)
//
// Notes:
// - Uses Strong's lookup to map surface Hebrew -> H####.
// - Counts occurrences per volume and overall.
// - Produces two decks: all words with gloss, and "no names" (heuristic).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;

function readText(p) { return fs.readFileSync(p, 'utf8'); }

function stripMarks(s) { return (s || '').replace(/[\u0591-\u05C7]/g, ''); }

function stripHebrewPrefixes(w) {
  // Remove maqaf-joined particles first, then strip 1–2 layers of prefixes.
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
  let s = w;
  for (const re of prefixes) {
    if (re.test(s) && s.replace(re, '').length >= 2) { s = s.replace(re, ''); break; }
  }
  for (const re of prefixes) {
    if (re.test(s) && s.replace(re, '').length >= 2) { s = s.replace(re, ''); break; }
  }
  return s;
}

function isLikelyName(gloss) {
  const g = String(gloss || '').trim();
  if (!g) return true;
  const words = g.split(/\s+/);
  return (words.length === 1 && /^[A-Z]/.test(words[0]));
}

function loadStrongs() {
  const strongsRootsJs = readText(path.join(ROOT, 'strongs_roots.js'));
  const strongsLookupJs = readText(path.join(ROOT, 'strongs_lookup.js'));
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(strongsRootsJs, sandbox, { timeout: 20000 });
  vm.runInContext(strongsLookupJs, sandbox, { timeout: 20000 });
  return {
    roots: sandbox.window._strongsRoots || {},
    lookup: sandbox.window._strongsLookup || {},
  };
}

function loadVerseDir(relDir) {
  const dir = path.join(ROOT, relDir);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  const collected = [];
  const sandbox = {
    renderVerseSet: (verseData, containerId) => collected.push({ containerId, verseData }),
  };
  vm.createContext(sandbox);
  for (const f of files) {
    const js = readText(path.join(dir, f));
    try { vm.runInContext(js, sandbox, { timeout: 20000 }); } catch {}
  }
  return collected;
}

function strongsForHebrew(heb, lookup) {
  const surface = (heb || '').replace(/\u05C3/g, '');
  const stripped = stripHebrewPrefixes(surface);
  const unp = stripMarks(surface);
  const unpStripped = stripMarks(stripped);
  return lookup[surface] || lookup[stripped] || lookup[unp] || lookup[unpStripped] || '';
}

function countVolume(volumeKey, verseSets, lookup, roots) {
  const counts = {}; // H#### -> n
  const strongsGlossCounts = {}; // H#### -> { scriptureGloss -> n }
  let words = 0;
  for (const set of verseSets) {
    const vdata = set.verseData || [];
    for (const v of vdata) {
      if (!v || !v.words) continue;
      for (const w of v.words) {
        if (!w || w.length < 2) continue;
        const heb = w[0];
        if (!heb || heb === '׃' || heb === '\u05C3') continue;
        words++;
        const s = strongsForHebrew(heb, lookup);
        if (!s || !/^H\d+$/.test(s)) continue;
        const entry = roots[s];
        if (!entry || !entry.w || !entry.g) continue; // require a gloss
        counts[s] = (counts[s] || 0) + 1;

        // Track the scripture gloss wording for this Strong's entry
        const scriptureGloss = normalizeScriptureGloss(w[1]);
        if (scriptureGloss) {
          if (!strongsGlossCounts[s]) strongsGlossCounts[s] = {};
          strongsGlossCounts[s][scriptureGloss] = (strongsGlossCounts[s][scriptureGloss] || 0) + 1;
        }
      }
    }
  }
  return { volumeKey, counts, words, strongsGlossCounts };
}

function mergeCounts(target, src) {
  for (const k of Object.keys(src)) target[k] = (target[k] || 0) + src[k];
}

function buildDeckFromCounts(counts, roots) {
  const arr = [];
  for (const k of Object.keys(counts)) {
    const e = roots[k];
    if (!e || !e.w || !e.g) continue;
    arr.push({ strongs: k, heb: String(e.w).trim(), gloss: String(e.g).trim(), count: counts[k] });
  }
  arr.sort((a, b) => b.count - a.count);
  return arr;
}

function bestGlossFromCounts(glossCounts) {
  let best = '';
  let bestCount = 0;
  for (const g of Object.keys(glossCounts || {})) {
    const c = glossCounts[g];
    if (c > bestCount) { bestCount = c; best = g; }
  }
  return best;
}

function normalizeScriptureGloss(glossRaw) {
  // Verse datasets use hyphenated gloss tokens; keep as displayed English.
  return String(glossRaw || '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

function countSurfaceGlossPairs(verseSets) {
  // Count occurrences of (surfaceHebrew, scriptureGloss) pairs.
  // Then choose the most frequent gloss per Hebrew surface form.
  const hebToGlossCounts = {}; // heb -> { gloss -> n }
  let words = 0;
  for (const set of verseSets) {
    const vdata = set.verseData || [];
    for (const v of vdata) {
      if (!v || !v.words) continue;
      for (const w of v.words) {
        if (!w || w.length < 2) continue;
        const heb = w[0];
        const gl = w[1];
        if (!heb || heb === '׃' || heb === '\u05C3') continue;
        const gloss = normalizeScriptureGloss(gl);
        if (!gloss) continue;
        words++;
        const h = String(heb).trim();
        if (!hebToGlossCounts[h]) hebToGlossCounts[h] = {};
        hebToGlossCounts[h][gloss] = (hebToGlossCounts[h][gloss] || 0) + 1;
      }
    }
  }

  const best = {}; // heb -> { gloss, count }
  for (const heb of Object.keys(hebToGlossCounts)) {
    const gmap = hebToGlossCounts[heb];
    let bestGloss = '';
    let bestCount = 0;
    for (const g of Object.keys(gmap)) {
      const c = gmap[g];
      if (c > bestCount) { bestCount = c; bestGloss = g; }
    }
    if (bestGloss) best[heb] = { heb, gloss: bestGloss, count: bestCount };
  }

  const arr = Object.values(best);
  arr.sort((a, b) => b.count - a.count);
  return { items: arr, words };
}

function main() {
  const { roots, lookup } = loadStrongs();

  const volumes = [
    { key: 'ot', dir: 'ot_verses' },
    { key: 'nt', dir: 'nt_verses' },
    { key: 'bom', dir: path.join('bom', 'verses') },
    { key: 'dc', dir: 'dc_verses' },
    { key: 'pgp', dir: 'pgp_verses' },
    { key: 'jst', dir: 'jst_verses' },
  ];

  const byVolume = {};
  const overallCounts = {};
  const overallNoNamesCounts = {};
  const byVolumeStrongsScriptureGloss = {}; // volume -> H#### -> best scripture gloss
  const overallStrongsGlossCounts = {}; // H#### -> { gloss -> n }
  const meta = { generatedAt: new Date().toISOString(), volumes: {}, totalWordsScanned: 0 };
  const metaSurface = { volumes: {}, totalWordsScanned: 0 };
  const byVolumeSurface = {};
  let overallSurface = [];

  for (const v of volumes) {
    const verseSets = loadVerseDir(v.dir);
    const res = countVolume(v.key, verseSets, lookup, roots);
    byVolume[v.key] = res.counts;
    meta.volumes[v.key] = { wordsScanned: res.words, strongsEntries: Object.keys(res.counts).length };
    meta.totalWordsScanned += res.words;
    mergeCounts(overallCounts, res.counts);

    // Strong's -> scripture-gloss mapping (best per volume)
    byVolumeStrongsScriptureGloss[v.key] = {};
    for (const s of Object.keys(res.strongsGlossCounts || {})) {
      const best = bestGlossFromCounts(res.strongsGlossCounts[s]);
      if (best) byVolumeStrongsScriptureGloss[v.key][s] = best;
      // also merge into overall
      if (!overallStrongsGlossCounts[s]) overallStrongsGlossCounts[s] = {};
      const gm = res.strongsGlossCounts[s];
      for (const g of Object.keys(gm)) {
        overallStrongsGlossCounts[s][g] = (overallStrongsGlossCounts[s][g] || 0) + gm[g];
      }
    }

    // Surface + scripture gloss decks (includes maqaf phrases)
    const surf = countSurfaceGlossPairs(verseSets);
    byVolumeSurface[v.key] = surf.items;
    metaSurface.volumes[v.key] = { wordsScanned: surf.words, entries: surf.items.length };
    metaSurface.totalWordsScanned += surf.words;
  }

  // Build a no-names version for overall + each volume
  function filterNoNames(countMap) {
    const out = {};
    for (const k of Object.keys(countMap)) {
      const e = roots[k];
      if (!e || !e.g) continue;
      if (isLikelyName(e.g)) continue;
      out[k] = countMap[k];
    }
    return out;
  }

  mergeCounts(overallNoNamesCounts, filterNoNames(overallCounts));

  const overallBestScriptureGloss = {};
  for (const s of Object.keys(overallStrongsGlossCounts)) {
    const best = bestGlossFromCounts(overallStrongsGlossCounts[s]);
    if (best) overallBestScriptureGloss[s] = best;
  }

  const deckAll = buildDeckFromCounts(overallCounts, roots).map(it => ({
    strongs: it.strongs,
    heb: it.heb,
    // both glosses, so the UI can choose
    strongsGloss: it.gloss,
    scriptureGloss: overallBestScriptureGloss[it.strongs] || '',
    gloss: it.gloss,
    count: it.count
  }));
  const deckNoNames = deckAll.filter(it => !isLikelyName(it.gloss));

  const decks = {
    overall_all: deckAll,
    overall_no_names: deckNoNames,
    byVolume_all: {},
    byVolume_no_names: {},
    // Surface-form decks (scripture glosses; includes maqaf phrases)
    surface_overall: [],
    surface_byVolume: {},
  };

  for (const v of volumes) {
    const dAll = buildDeckFromCounts(byVolume[v.key], roots).map(it => ({
      strongs: it.strongs,
      heb: it.heb,
      strongsGloss: it.gloss,
      scriptureGloss: (byVolumeStrongsScriptureGloss[v.key] && byVolumeStrongsScriptureGloss[v.key][it.strongs]) ? byVolumeStrongsScriptureGloss[v.key][it.strongs] : '',
      gloss: it.gloss,
      count: it.count
    }));
    decks.byVolume_all[v.key] = dAll;
    decks.byVolume_no_names[v.key] = dAll.filter(it => !isLikelyName(it.gloss));

    decks.surface_byVolume[v.key] = byVolumeSurface[v.key] || [];
  }

  // Build overall surface deck by merging per-volume (sum counts by heb+gloss)
  const overallPairCounts = {}; // key = heb|||gloss -> count
  for (const vk of Object.keys(byVolumeSurface)) {
    for (const it of byVolumeSurface[vk] || []) {
      const k = `${it.heb}|||${it.gloss}`;
      overallPairCounts[k] = (overallPairCounts[k] || 0) + (it.count || 0);
    }
  }
  overallSurface = Object.keys(overallPairCounts).map(k => {
    const parts = k.split('|||');
    return { heb: parts[0], gloss: parts[1], count: overallPairCounts[k] };
  }).sort((a, b) => b.count - a.count);
  decks.surface_overall = overallSurface;

  const outPath = path.join(ROOT, 'vocab_decks.js');
  const js =
    `// vocab_decks.js (generated)\n` +
    `// Generated at: ${meta.generatedAt}\n` +
    `window.VocabDeckMeta = ${JSON.stringify(Object.assign({}, meta, { surface: metaSurface }))};\n` +
    `window.VocabDecks = ${JSON.stringify(decks)};\n`;
  fs.writeFileSync(outPath, js, 'utf8');

  console.log('Wrote vocab_decks.js');
  console.log('Total words scanned:', meta.totalWordsScanned);
  console.log('Overall deck size:', deckAll.length, '(no-names:', deckNoNames.length + ')');
}

main();

