#!/usr/bin/env node
/**
 * build_bdb_roots.js — generates bdb_roots.js, a map from Strong's number to
 * its Brown-Driver-Briggs root.
 *
 * Source: openscriptures/HebrewLexicon, LexicalIndex.xml — the meeting point of
 * BDB, Strong's and TWOT. BDB (1906) and Strong's are public domain; the XML
 * build is (c) OpenScriptures, CC BY 4.0.
 *   https://github.com/openscriptures/HebrewLexicon
 *
 * Why: Strong's keys a lexeme, BDB keys a root. A root scorecard wants the
 * root, so that דָּבָר (H1697) and דִּבֶּר (H1696) share one entry.
 *
 * Run: node tools/build_bdb_roots.js [path/to/LexicalIndex.xml]
 */
const fs = require('fs'), path = require('path');
const src = process.argv[2] || '/tmp/LexicalIndex.xml';
const xml = fs.readFileSync(src, 'utf8');
const ents = {};
for (const m of xml.matchAll(/<entry id="([^"]+)">([\s\S]*?)<\/entry>/g)) {
  const id = m[1], b = m[2];
  const w = (b.match(/<w[^>]*>([^<]*)<\/w>/) || [, ''])[1].trim();
  const strong = (b.match(/<xref[^>]*\bstrong="(\d+)/) || [, null])[1];
  const et = b.match(/<etym([^>]*)>([\s\S]*?)<\/etym>|<etym([^>]*)\/>/);
  let type = null, root = null, parent = null;
  if (et) {
    const attrs = et[1] || et[3] || '';
    type = (attrs.match(/type="([^"]+)"/) || [, null])[1];
    root = (attrs.match(/root="([^"]+)"/) || [, null])[1];
    if (type === 'sub') parent = (et[2] || '').trim();
  }
  ents[id] = { w, strong, type, root, parent };
}
const strip = s => (s || '').replace(/[֑-ׇ]/g, '');
function rootFor(id, seen) {
  seen = seen || new Set();
  if (seen.has(id) || !ents[id]) return null;
  seen.add(id);
  const e = ents[id];
  if (e.type === 'main') return e.root || e.w;
  if (e.parent) for (const pid of e.parent.split(/[,\s]+/)) {
    const r = rootFor(pid, seen); if (r) return r;
  }
  return null;
}
const out = {};
for (const [id, e] of Object.entries(ents)) {
  if (!e.strong) continue;
  const r = rootFor(id);
  const key = 'H' + String(e.strong).padStart(4, '0');
  if (r && !out[key]) out[key] = strip(r);
}
const hdr = fs.readFileSync(path.join(__dirname, '..', 'bdb_roots.js'), 'utf8')
              .split('window._bdbRoots')[0];
fs.writeFileSync(path.join(__dirname, '..', 'bdb_roots.js'),
  hdr + 'window._bdbRoots = ' + JSON.stringify(out) + ';\n');
console.log('bdb_roots.js written: %d Strong\'s numbers', Object.keys(out).length);
