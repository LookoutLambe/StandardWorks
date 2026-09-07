#!/usr/bin/env node
// check_shared_drift.js — phase 0 of the consolidation: guard the seams.
//
// The volume pages share code by duplication, and bom/bom.html is the canon
// copy several tools extract from. This check fails the commit when a
// supposedly-shared block is edited in one place and not the other — the
// double-edit trap that has already bitten (rootMap/_lexNoPeel had to be
// fixed twice on 2026-08-29).
//
// What it guards (only blocks that are IDENTICAL today; the known intentional
// divergences — per-volume storage prefixes, bom's feature-rich renderer,
// jst's slimmer makeWordUnit — are phase 2 material and NOT checked here):
//
//   1. root_engine.js is THE canonical engine (single source since 2026-08-30):
//      all six pages load it and the concordance builder reads it. bom.html
//      must load it, must NOT contain an inline fork, and the RootEngine
//      export must keep every member bom.html aliases.
//   2. (folded into 1.)
//   3. _paintWordAnnotation and applyAnnotationToWord are identical across
//      all six volume pages.
//   4. The heading-flow builder loop is identical across ot/nt/dc/pgp.
//
// Run directly:  node tools/check_shared_drift.js
// Wired into .git/hooks/pre-commit (hooks are not tracked by git — on a new
// clone, re-add the check line there).

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');   // the transliterator check evaluates both copies
const ROOT = path.join(__dirname, '..');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// Phase 2: a converted sibling's reader lives in reader_core.js/reader_ui.js,
// not inline — resolve each page to page + shared sources so the equality
// checks keep working through the page-by-page conversion.
const CONVERTED = { 'ot.html': 1, 'nt.html': 1, 'dc.html': 1, 'pgp.html': 1, 'jst.html': 1 };
const readPage = f => CONVERTED[f]
  ? read(f) + '\n' + read('reader_core.js') + '\n' + read('reader_ui.js')
  : read(f);
const norm = s => s.replace(/\s+/g, ' ').trim();

let failures = 0;
function fail(msg) { console.error('[drift] FAIL: ' + msg); failures++; }
function ok(msg) { console.log('[drift] ok: ' + msg); }

// Extract a brace-matched `function name(...) {...}` body.
function fnBody(src, name, file) {
  const m = src.match(new RegExp('function ' + name + '\\s*\\('));
  if (!m) { fail(name + ' not found in ' + file); return null; }
  const open = src.indexOf('{', m.index);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(m.index, j + 1); }
  }
  fail(name + ' braces never close in ' + file);
  return null;
}

// Show where two normalized strings first diverge.
function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  const from = Math.max(0, i - 60);
  return '...' + a.slice(from, i + 60) + '...\n            vs\n  ...' + b.slice(from, i + 60) + '...';
}

// ---- 1 + 2. root_engine.js is THE engine; bom.html must load, not fork it --
{
  const bom = read('bom/bom.html');
  const eng = read('root_engine.js');
  if (bom.includes('function stripPrefixes(w) {')) {
    fail('an inline root engine has reappeared in bom/bom.html — since 2026-08-30\n' +
         '  the engine lives ONLY in root_engine.js (all six pages load it and the\n' +
         '  concordance builder reads it). Delete the inline copy; use window.RootEngine.');
  } else ok('bom/bom.html has no inline engine fork');
  if (!/root_engine\.js\?v=\d+/.test(bom)) {
    fail('bom/bom.html no longer loads root_engine.js — its popups, glossary and\n' +
         '  window exports (getRoot/rootMap/...) depend on window.RootEngine.');
  } else ok('bom/bom.html loads root_engine.js');
  const need = ['getRoot', 'getRoots', 'stripPrefixes', 'stripNikkud', 'toSofit', 'normFinals', 'rootMap'];
  const missing = need.filter(n => !new RegExp(n + '\\s*:\\s*' + n).test(eng));
  if (missing.length) {
    fail('root_engine.js RootEngine export lost member(s): ' + missing.join(', ') +
         '\n  bom/bom.html aliases all of these — restore the export.');
  } else ok('root_engine.js exports the full RootEngine surface');
}

// ---- 3. functions identical across all six volume pages -------------------
const SIX = ['bom/bom.html', 'ot.html', 'nt.html', 'dc.html', 'pgp.html', 'jst.html'];
for (const name of ['_paintWordAnnotation', 'applyAnnotationToWord']) {
  let ref = null, refFile = null, bad = false;
  for (const f of SIX) {
    const body = fnBody(readPage(f), name, f);
    if (body === null) { bad = true; continue; }
    const nb = norm(body);
    if (ref === null) { ref = nb; refFile = f; continue; }
    if (nb !== ref) {
      bad = true;
      fail(name + ' differs between ' + refFile + ' and ' + f +
           ' — this function is shared by all six volume pages; apply the same edit everywhere.\n  ' +
           firstDiff(ref, nb));
    }
  }
  if (!bad) ok(name + ' identical across all six volume pages');
}

// ---- 4. heading-flow loop identical across the four generated-heading pages
{
  const FOUR = ['ot.html', 'nt.html', 'dc.html', 'pgp.html'];
  const START = 'var lastGrp = hf.lastElementChild;';
  const END = 'headingEl2.appendChild(hf);';
  let ref = null, refFile = null, bad = false;
  for (const f of FOUR) {
    const src = readPage(f);
    const i = src.indexOf(START);
    const j = i >= 0 ? src.indexOf(END, i) : -1;
    if (i < 0 || j < 0) { fail('heading-flow anchors missing in ' + f); bad = true; continue; }
    const nb = norm(src.slice(i, j));
    if (ref === null) { ref = nb; refFile = f; continue; }
    if (nb !== ref) {
      bad = true;
      fail('heading-flow loop differs between ' + refFile + ' and ' + f +
           ' — it is shared by ot/nt/dc/pgp; apply the same edit to all four.\n  ' +
           firstDiff(ref, nb));
    }
  }
  if (!bad) ok('heading-flow loop identical across ot/nt/dc/pgp');
}

// ---- 5. the transliterator — ONE implementation
// It lived in reader_ui.js AND inline in bom.html, ~200 lines each, and this
// check used to compare the two. Comparing copies is what you do when you have
// given up on removing them; they are removed now, into translit.js, proved
// identical to both predecessors across 20,245 corpus forms before the old
// copies were deleted. What is asserted here is the property that actually
// matters: that there is still only one, and that every page loads it.
{
  const OWNER = 'translit.js';
  const src = read(OWNER);
  if (!/function\s+_tlPointed\s*\(/.test(src)) fail(OWNER + ' no longer defines _tlPointed');
  const strays = [];
  for (const f of ['reader_ui.js', 'bom/bom.html', 'root_scorecard.js', 'crossrefs_engine.js']) {
    const t = read(f);
    for (const n of ['_tlPointed', '_tlPopular', '_translitRaw', '_tlKnown', '_tlReceived']) {
      const re = new RegExp('function\\s+' + n + '\\s*\\(|(?:var|const|let)\\s+' + n + '\\s*=\\s*[{\\[]');
      if (re.test(t)) strays.push(f + ' redefines ' + n);
    }
  }
  if (strays.length) {
    fail('the transliterator has grown a second copy again:\n        ' +
         strays.join('\n        ') + '\n        Its one home is ' + OWNER + '.');
  }
  const PAGES = ['ot.html', 'nt.html', 'dc.html', 'pgp.html', 'jst.html', 'bom/bom.html'];
  const missing = PAGES.filter(p => !/<script[^>]*src="[^"]*translit\.js/.test(read(p)));
  if (missing.length) fail('these pages do not load translit.js: ' + missing.join(', '));
  if (!strays.length && !missing.length) {
    ok('transliterator is one implementation (' + OWNER + '), loaded by all ' + PAGES.length + ' pages');
  }
}

/* ── xref_common.js must load BEFORE anything that reads window.SWXref ──────
   The shared book table and reference parser live there now, and the engine
   builds its own table from them at parse time — so a page that loads the
   engine first gets an EMPTY table and silently resolves no reference at all.
   Ordering used to be free (both sides carried their own literal); it is a
   real constraint now, so it is checked rather than remembered. */
{
  const PAGES = ['ot.html', 'nt.html', 'dc.html', 'pgp.html', 'jst.html', 'bom/bom.html'];
  let bad = 0;
  for (const page of PAGES) {
    const src = read(page);
    const tag = n => src.search(new RegExp('<script[^>]*\\ssrc="[^"]*' + n + '[^"]*"'));
    const common = tag('xref_common\\.js');
    const engine = tag('crossrefs_engine\\.js');
    if (common < 0) { fail(page + ' does not load xref_common.js, which owns the shared book table'); bad++; continue; }
    if (engine >= 0 && engine < common) {
      fail(page + ' loads crossrefs_engine.js BEFORE xref_common.js. The engine reads\n' +
           '        window.SWXref at parse time, so it would build an empty book table and\n' +
           '        resolve no scripture reference on that page.');
      bad++;
    }
  }
  if (!bad) ok('xref_common.js loads before the engine on all ' + PAGES.length + ' pages');
}

/* ── bom.html's cross-reference panel is a FORK of crossrefs_engine.js ──────
   The five sibling volumes load crossrefs_engine.js; bom.html carries its own
   inline copy of the same UI, built on BOM-specific data. It is too entangled
   to fold in casually, and nothing warned when the two drifted — so on
   2026-09-07 a single day's work had to be done twice, three times, and once
   was missed entirely:

     · reference hrefs went through nav_engine (engine) vs a stale local table
       whose '#genesis-3' ids no reader has ever recognised (BOM),
     · the "All N occurrences" card learned the reference cap (engine) and did
       not (BOM), so the BOM went on opening a panel with nothing on it,
     · non-BOM references were inert spans in the BOM — no way to follow a
       cross-reference out of the volume at all.

   This does not diff the code; the two are legitimately different. It asserts
   the INVARIANTS both must hold, so the next divergence is caught here rather
   than by the reader. Each is a behaviour, not a spelling. */
{
  /* Comments must not satisfy an invariant. The first cut of this check passed
     because a COMMENT in bom.html mentioned NavEngineFollow by name while the
     call itself had been removed — a test a comment can satisfy tests nothing. */
  const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  /* The engine side of a given behaviour is not always crossrefs_engine.js:
     the popup's own close guards live in reader_ui.js on the five volumes,
     while bom.html holds every one of them inline. Each invariant names the
     file that owns it. */
  const SRC = {
    'crossrefs_engine.js': stripComments(read('crossrefs_engine.js')),
    'reader_ui.js':        stripComments(read('reader_ui.js')),
  };
  const bom = stripComments(read('bom/bom.html'));
  const INVARIANTS = [
    ['crossrefs_engine.js', 'reference hrefs come from nav_engine, not a local book table',
     /NavEngineRefHref\s*\(/],
    ['crossrefs_engine.js', 'following a reference marks a return point',
     /NavEngine(?:Follow|GoRef|MarkReturn)\s*\(/],
    ['crossrefs_engine.js', 'the occurrences card respects the reference cap',
     /RootScorecard\.listable\s*\(/],
    ['crossrefs_engine.js', 'a scripture reference heading is a link, not an inert span',
     /['"]xref-ref-goto['"]/],
    ['crossrefs_engine.js', 'the reference count on the card is what the panel will list',
     /CrossrefsRootRefCount\b/],
    ['reader_ui.js', 'the word card survives opening the panel it launches',
     /closest\('#xref-panel'\)\)\s*return/],
  ];
  let drifted = 0;
  for (const [file, what, re] of INVARIANTS) {
    const a = re.test(SRC[file]), b = re.test(bom);
    if (a !== b) {
      drifted++;
      fail('bom.html and ' + file + ' disagree on an invariant they must share:\n' +
           '        "' + what + '"\n' +
           '        ' + file + ': ' + (a ? 'yes' : 'NO') +
           '   bom/bom.html: ' + (b ? 'yes' : 'NO') + '\n' +
           '        bom.html forks this UI — apply the change to both copies.');
    }
  }
  if (!drifted) ok('bom.html’s cross-reference fork holds all ' + INVARIANTS.length +
                   ' shared invariants');
}

if (failures) {
  console.error('[drift] ' + failures + ' shared-code drift problem(s). Commit blocked.');
  process.exit(1);
}
console.log('[drift] all shared blocks in sync');
