#!/usr/bin/env node
// map_page_duplication.js — phase 2 scout: cluster every function that appears
// on 2+ volume pages by identical normalized body, so the consolidation moves
// only what is provably shared and names every divergence before it starts.
// Read-only; prints a table. (The same brace-matching as check_shared_drift.)

'use strict';
const fs = require('fs');
const PAGES = ['ot.html', 'nt.html', 'dc.html', 'pgp.html', 'jst.html', 'bom/bom.html'];
const SHORT = { 'ot.html': 'ot', 'nt.html': 'nt', 'dc.html': 'dc', 'pgp.html': 'pgp', 'jst.html': 'jst', 'bom/bom.html': 'bom' };

function extractAll(src) {
  const out = {};
  const re = /function ([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    if (out[name]) continue;                       // first definition wins
    const open = src.indexOf('{', m.index);
    if (open < 0) continue;
    let d = 0, end = -1;
    for (let j = open; j < src.length; j++) {
      const c = src[j];
      if (c === '{') d++;
      else if (c === '}') { d--; if (!d) { end = j + 1; break; } }
    }
    if (end < 0) continue;
    out[name] = src.slice(m.index, end);
  }
  return out;
}

const inv = {};
for (const p of PAGES) {
  const fns = extractAll(fs.readFileSync(p, 'utf8'));
  for (const name in fns) {
    (inv[name] = inv[name] || {})[SHORT[p]] = {
      norm: fns[name].replace(/\s+/g, ' ').trim(),
      len: fns[name].length
    };
  }
}

const rows = [];
for (const name in inv) {
  const pages = Object.keys(inv[name]);
  if (pages.length < 2) continue;
  const groups = {};
  for (const p of pages) (groups[inv[name][p].norm] = groups[inv[name][p].norm] || []).push(p);
  const sig = Object.values(groups).map(g => g.join('+'))
    .sort((a, b) => b.length - a.length).join('  |  ');
  const size = Math.max(...pages.map(p => inv[name][p].len));
  rows.push({ name, n: pages.length, g: Object.keys(groups).length, sig, size });
}
rows.sort((a, b) => b.size - a.size);
let dup = 0;
for (const r of rows) {
  dup += r.size * (r.n - 1);
  console.log(String(r.size).padStart(6), r.n + 'pg', r.g + 'var',
    r.name.padEnd(26), r.sig);
}
console.log('\nfunctions on 2+ pages:', rows.length,
  '  ~duplicated bytes (size × extra copies):', dup);
