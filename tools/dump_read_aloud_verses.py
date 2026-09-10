#!/usr/bin/env python3
"""Every verse of all six volumes as (verseKey, tokens), for the read-aloud
   silence sweep. The key MUST match what phrases() looks up in SW_BREAKS —
   get it wrong and the phrasing falls back to the rule path and the sweep
   tests strings the reader never speaks. So the mapping is imported from the
   two generators that ship the tables, never re-derived here."""
import json, os, sys, re

ROOT = '/Users/chrislambe/Desktop/untitled folder/Escrituras'
sys.path.insert(0, os.path.join(ROOT, 'tools'))
os.chdir(ROOT)

import build_volume_breaks as bv
import build_bom_breaks as bb

out = []

# ── the five volumes that share renderVerseSet + a books() prefix map ──
for vol in ('ot', 'nt', 'dc', 'pgp', 'jst'):
    pm = bv.books(vol)
    n = 0
    for key, ref, toks in bv.verses(vol, pm):
        out.append([key, toks]); n += 1
    print('%-4s %7d verses' % (vol, n), file=sys.stderr)

# ── the Book of Mormon ──
n = 0
for file, book, prefix in bb.BOOKS:
    src = open(os.path.join(ROOT, 'bom/verses', file + '.js'), encoding='utf-8').read()
    for m, body in bb.array_bodies(src, r'var %sch(\d+)Verses\s*=\s*\[' % re.escape(prefix)):
        ch = int(m.group(1))
        vs = list(re.finditer(r'\{\s*num:\s*"([^"]*)"\s*,\s*words:\s*\[(.*?)\]\s*\}', body, re.S))
        for vi, vm in enumerate(vs):
            out.append(['%s|%d|%d' % (book, ch, vi + 1),
                        re.findall(r'\["([^"]*)","([^"]*)"\]', vm.group(2))])
            n += 1
print('%-4s %7d verses' % ('bom', n), file=sys.stderr)

json.dump(out, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False)
print('total %d verses' % len(out), file=sys.stderr)
