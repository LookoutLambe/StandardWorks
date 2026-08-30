#!/usr/bin/env node
// map_page_units.js — phase 2 scout, block level. Function-level clustering
// lied by omission: much of the reader lives inside IIFEs (the annotation
// system captures closure state), so the movable unit is a whole top-level
// statement of an inline <script>. This tool splits every inline script into
// top-level units, normalizes each page's volume constants to placeholders
// ('ot_notes' → '@VOL_notes', 'ot.html' → '@PAGE'), and clusters units
// across pages. A unit identical across pages AFTER normalization is
// consolidatable with a one-line per-page config. Read-only.

'use strict';
const fs = require('fs');
const crypto = require('crypto');
const PAGES = { ot: 'ot.html', nt: 'nt.html', dc: 'dc.html', pgp: 'pgp.html', jst: 'jst.html', bom: 'bom/bom.html' };

function inlineScripts(src) {
  const out = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(src)) !== null) if (m[1].length > 200) out.push({ text: m[1], at: m.index });
  return out;
}

// split a script into top-level units (brace/paren/bracket + string aware)
function units(text) {
  const out = [];
  let depth = 0, start = 0, i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < n && text[i] !== q) { if (text[i] === '\\') i++; i++; }
    } else if (c === '/' && text[i + 1] === '/') { while (i < n && text[i] !== '\n') i++; }
    else if (c === '/' && text[i + 1] === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; }
    else if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') {
      depth--;
      if (depth === 0) {
        // unit ends at the next ; or newline after a closing at depth 0
        let j = i + 1;
        while (j < n && (text[j] === ';' || text[j] === ')' || text[j] === ' ')) j++;
        const u = text.slice(start, j).trim();
        if (u.length > 150) out.push(u);
        start = j; i = j; continue;
      }
    }
    i++;
  }
  const tail = text.slice(start).trim();
  if (tail.length > 150) out.push(tail);
  return out;
}

function label(u) {
  let m = u.match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)/);
  if (m) return 'fn ' + m[1];
  m = u.match(/^\(function\s*([A-Za-z0-9_$]*)/);
  if (m) return 'iife ' + (m[1] || u.replace(/\s+/g, ' ').slice(0, 48));
  m = u.match(/^(?:var|const|let)\s+([A-Za-z0-9_$]+)/);
  if (m) return 'var ' + m[1];
  return u.replace(/\s+/g, ' ').slice(0, 48);
}

function normalize(u, vol) {
  let s = u.replace(/\s+/g, ' ').trim();
  // volume-scoped storage keys / page names / init literals
  s = s.split("'" + vol + "_").join("'@VOL_").split('"' + vol + '_').join('"@VOL_');
  s = s.split("'" + vol + ".html'").join("'@PAGE'").split('"' + vol + '.html"').join('"@PAGE"');
  s = s.split("'" + vol + "'").join("'@V'").split('"' + vol + '"').join('"@V"');
  if (vol === 'bom') s = s.split("'../").join("'@BASE").split('"../').join('"@BASE');
  else s = s.split("''").join("''"); // no-op, keeps shape
  return s;
}

const inv = new Map();   // hash -> {label, size, pages:{vol:count}}
const perPage = {};
for (const vol in PAGES) {
  const src = fs.readFileSync(PAGES[vol], 'utf8');
  let count = 0, bytes = 0;
  for (const sc of inlineScripts(src)) {
    for (const u of units(sc.text)) {
      count++; bytes += u.length;
      const h = crypto.createHash('md5').update(normalize(u, vol)).digest('hex');
      let e = inv.get(h);
      if (!e) { e = { label: label(u), size: u.length, pages: {} }; inv.set(h, e); }
      e.pages[vol] = (e.pages[vol] || 0) + 1;
    }
  }
  perPage[vol] = { count, bytes };
}

for (const vol in perPage) console.log(vol, perPage[vol].count, 'units,', perPage[vol].bytes, 'bytes');
const rows = [...inv.values()].filter(e => Object.keys(e.pages).length >= 2);
rows.sort((a, b) => b.size * (Object.keys(b.pages).length - 1) - a.size * (Object.keys(a.pages).length - 1));
let dup6 = 0, dup5 = 0, other = 0;
for (const r of rows) {
  const n = Object.keys(r.pages).length;
  const saved = r.size * (n - 1);
  if (n === 6) dup6 += saved; else if (n === 5 && !r.pages.bom) dup5 += saved; else other += saved;
}
console.log('\nconsolidatable (identical after @VOL normalization):');
console.log('  across all 6 pages:', Math.round(dup6 / 1024) + 'KB saved');
console.log('  across the 5 siblings:', Math.round(dup5 / 1024) + 'KB saved');
console.log('  partial groups:', Math.round(other / 1024) + 'KB');
console.log('\ntop units:');
for (const r of rows.slice(0, 45)) {
  const pg = Object.keys(r.pages).join('+');
  console.log(String(r.size).padStart(7), r.label.padEnd(34), pg);
}
