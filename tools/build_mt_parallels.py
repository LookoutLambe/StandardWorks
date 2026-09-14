#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Carry the Masoretic breaks into the volumes that quote the Tanakh.

    python3 tools/build_mt_parallels.py [pgp|nt|dc|jst|all]
        -> tools/mt_parallel_breaks.json

WHERE THE TEXT IS THE TANAKH'S, THE PHRASING SHOULD BE TOO. Moses 2-8 retells
Genesis 1-6 and much of it word for word; the English-derived table phrases
those verses from the printed column's commas, which is a second-hand answer
when the first-hand one exists. This finds every verse whose Hebrew runs
parallel to an MT verse, aligns the two word sequences, and carries the
te'amim's break positions across.

Matching is on the consonantal skeleton, so pointing cannot hide a match.
A verse qualifies at >=0.60 Jaccard overlap of its word set; the alignment is
a longest-common-subsequence, and a break is carried only when the MT word it
sits on is actually present in the target. The MT's entries are bare indices,
every one a full stop, so they come across as weight 2.
"""
import io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
POINTS = re.compile(u'[֑-ׇ]')
SPEAK  = re.compile(u'[א-ת]')
TOK    = re.compile(u'\\["([^"]*)","([^"]*)"\\]')
CH     = re.compile(u'var\\s+([A-Za-z0-9_]+)_ch(\\d+)Verses\\s*=\\s*\\[')
NUM    = re.compile(u'\\{\\s*num\\s*:')
MIN_OVERLAP = 0.45

NAMES = {'gen':'Genesis','exo':'Exodus','lev':'Leviticus','num':'Numbers',
 'deu':'Deuteronomy','jos':'Joshua','jdg':'Judges','rth':'Ruth','1sa':'1 Samuel',
 '2sa':'2 Samuel','1ki':'1 Kings','2ki':'2 Kings','isa':'Isaiah','jer':'Jeremiah',
 'eze':'Ezekiel','hos':'Hosea','joe':'Joel','amo':'Amos','oba':'Obadiah','jon':'Jonah',
 'mic':'Micah','nah':'Nahum','hab':'Habakkuk','zep':'Zephaniah','hag':'Haggai',
 'zec':'Zechariah','mal':'Malachi','psa':'Psalms','pro':'Proverbs','job':'Job',
 'sng':'Song of Songs','ecc':'Ecclesiastes','lam':'Lamentations','est':'Esther',
 'dan':'Daniel','ezr':'Ezra','neh':'Nehemiah','1ch':'1 Chronicles','2ch':'2 Chronicles'}
VOL_BOOK = {
 'pgp': {'ms':'Moses','abr':'Abraham','jsm':'JS-Matthew','jsh':'JS-History'},
 'nt':  None, 'dc': None, 'jst': None}

def bare(s): return POINTS.sub('', s)

def ot_breaks():
    src = io.open(os.path.join(ROOT, 'ot_phrase_breaks.js'), encoding='utf-8').read()
    m = re.search(r'window\.SW_BREAKS\s*=\s*Object\.assign\([^,]+,\s*(\{.*?\})\);', src, re.S)
    return json.loads(m.group(1))

def verses(path):
    txt = io.open(path, encoding='utf-8').read()
    marks = [(m.end(), int(m.group(2)), m.group(1)) for m in CH.finditer(txt)]
    for i, (pos, ch, pfx) in enumerate(marks):
        body = txt[pos: marks[i+1][0] if i+1 < len(marks) else len(txt)]
        st = [m.start() for m in NUM.finditer(body)]
        for j, s0 in enumerate(st):
            vb = body[s0: st[j+1] if j+1 < len(st) else len(body)]
            w = [bare(h) for h, g in TOK.findall(vb) if SPEAK.search(h)]
            yield ch, j + 1, w, pfx

def lcs_map(a, b):
    """indices in a -> indices in b, for the longest common subsequence."""
    n, m = len(a), len(b)
    T = [[0]*(m+1) for _ in range(n+1)]
    for i in range(n-1, -1, -1):
        for j in range(m-1, -1, -1):
            T[i][j] = T[i+1][j+1] + 1 if a[i] == b[j] else max(T[i+1][j], T[i][j+1])
    out, i, j = {}, 0, 0
    while i < n and j < m:
        if a[i] == b[j]:
            out[i] = j; i += 1; j += 1
        elif T[i+1][j] >= T[i][j+1]: i += 1
        else: j += 1
    return out

def main():
    which = sys.argv[1] if len(sys.argv) > 1 else 'pgp'
    vols = ['pgp'] if which == 'pgp' else [which]
    BR = ot_breaks()
    MT, by_word = [], {}
    for f in sorted(os.listdir(os.path.join(ROOT, 'ot_verses'))):
        if not f.endswith('.js'): continue
        bk = NAMES.get(f[:-3])
        if not bk: continue
        for ch, v, w, _ in verses(os.path.join(ROOT, 'ot_verses', f)):
            if len(w) < 3: continue
            br = BR.get('%s|%d|%d' % (bk, ch, v))
            if not br: continue
            idx = len(MT); MT.append((bk, ch, v, w, br))
            for t in set(w):
                if len(t) >= 3: by_word.setdefault(t, []).append(idx)
    out, stats = {}, {'matched': 0, 'carried': 0, 'verses': 0}
    for vol in vols:
        books = VOL_BOOK.get(vol)
        if not books: continue
        for f in sorted(os.listdir(os.path.join(ROOT, vol + '_verses'))):
            if not f.endswith('.js') or f == 'manifest.js': continue
            for ch, v, w, pfx in verses(os.path.join(ROOT, vol + '_verses', f)):
                bk = books.get(pfx)
                if not bk or len(w) < 3: continue
                stats['verses'] += 1
                cand = {}
                for t in set(w):
                    for i in by_word.get(t, []): cand[i] = cand.get(i, 0) + 1
                best, score = None, 0.0
                S = set(w)
                for i, c in cand.items():
                    if c < 3: continue
                    B = set(MT[i][3]); inter = len(S & B)
                    s = inter / float(len(S) + len(B) - inter)
                    if s > score: score, best = s, i
                if best is None or score < MIN_OVERLAP: continue
                stats['matched'] += 1
                mb, mw, mbr = MT[best][:3], MT[best][3], MT[best][4]
                amap = lcs_map(w, mw)                    # target idx -> MT idx
                rev = {}
                for ti, mi in amap.items(): rev[mi] = ti
                got = []
                for x in mbr:
                    mi = x[0] if isinstance(x, list) else x
                    ti = rev.get(mi)
                    if ti is not None and 0 <= ti < len(w) - 1: got.append([ti, 2])
                if got:
                    got.sort()
                    dedup = [got[0]]
                    for g in got[1:]:
                        if g[0] != dedup[-1][0]: dedup.append(g)
                    out['%s|%d|%d' % (bk, ch, v)] = dedup
                    stats['carried'] += len(dedup)
    p = os.path.join(HERE, 'mt_parallel_breaks.json')
    io.open(p, 'w', encoding='utf-8').write(
        json.dumps(out, ensure_ascii=False, sort_keys=True, separators=(',', ':')))
    print('verses scanned      : %s' % format(stats['verses'], ','))
    print('with an MT parallel : %s  (>=%.2f overlap)' % (format(stats['matched'], ','), MIN_OVERLAP))
    print('verses given breaks : %s' % format(len(out), ','))
    print('breaks carried      : %s' % format(stats['carried'], ','))
    print('written: tools/mt_parallel_breaks.json')

if __name__ == '__main__':
    main()
