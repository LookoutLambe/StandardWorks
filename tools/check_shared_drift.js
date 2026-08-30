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
const ROOT = path.join(__dirname, '..');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
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
    const body = fnBody(read(f), name, f);
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
    const src = read(f);
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

if (failures) {
  console.error('[drift] ' + failures + ' shared-code drift problem(s). Commit blocked.');
  process.exit(1);
}
console.log('[drift] all shared blocks in sync');
