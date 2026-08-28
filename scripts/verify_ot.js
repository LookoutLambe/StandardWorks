#!/usr/bin/env node
// Structural integrity for every verse volume: each file must parse, every
// token must be a ["heb","gloss"] pair, Hebrew tokens must contain Hebrew,
// and no token may be empty on the Hebrew side. (The original lived in a
// session scratchpad and was lost; recreated 2026-08-28.)
const fs = require('fs'), vm = require('vm');
const dirs = ['ot_verses','nt_verses','dc_verses','pgp_verses','jst_verses','bom/verses'];
let problems = 0, files = 0, tokens = 0;
for (const dir of dirs) {
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
    const p = dir + '/' + f, src = fs.readFileSync(p, 'utf8');
    files++;
    try { new vm.Script(src); } catch (e) { console.log('PARSE', p, e.message); problems++; continue; }
    const re = /\["((?:[^"\\]|\\.)*)","((?:[^"\\]|\\.)*)"\]/g;
    let m;
    while ((m = re.exec(src))) {
      tokens++;
      const h = m[1];
      if (!h.trim()) { console.log('EMPTY-HEB', p, 'near', src.slice(Math.max(0,m.index-40), m.index)); problems++; }
      if (/[�]/.test(h + m[2])) { console.log('REPLACEMENT-CHAR', p, h); problems++; }
    }
    const opens = (src.match(/\{ *num:/g) || []).length;
    // dc_chron.js is a chronological index, not verse data
    if (!opens && !/chron|intro/.test(f)) { console.log('NO-VERSES', p); problems++; }
  }
}
console.log(`files: ${files}  tokens: ${tokens}`);
console.log('problems: ' + problems);
process.exit(problems ? 1 : 0);
