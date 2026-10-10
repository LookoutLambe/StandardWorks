#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Print a chapter with its cantillation layer applied, for review.

    python3 tools/show_teamim.py "1 Nephi" 1 [--labels]

Each verse: the accented Hebrew as the reader will see it, the printed
English, and with --labels the accent name under every word. The verse data
is read as it is; the accents come from bom/teamim/<book>.js (or
ot_teamim/<prefix>.js for the Tanakh) exactly as teamim.js lays them.
"""
import io, json, os, re, sys, unicodedata as ud

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from build_bom_breaks import BOOKS, corpus, english, silent, nfc
import teamim_grammar as G

NAME = {v: k for k, v in G.CODE.items()}
NAME[0x5a3] = 'munach'
POINTS = re.compile(u'[֑-ׇ]')


def apply(h, code):
    """teamim.js accents(): lay the code's marks over the word."""
    acc, k, paseq = {}, -1, False
    for c in code:
        o = ord(c)
        if o == 0x5c0: paseq = True
        elif o < 0x590: k = o - 0x30; acc[k] = u''
        elif k >= 0: acc[k] += c
    out, n, i = u'', -1, 0
    while i < len(h):
        ch = h[i]; out += ch
        if u'א' <= ch <= u'ת':
            n += 1
            while i + 1 < len(h) and POINTS.match(h[i + 1]) and not (0x591 <= ord(h[i + 1]) <= 0x5af):
                i += 1; out += h[i]
            if acc.get(n): out += acc[n]
        i += 1
    return ud.normalize('NFC', out) + (u' ׀' if paseq else u'')


def labels_of(code):
    names = []
    for c in code:
        o = ord(c)
        if 0x591 <= o <= 0x5ae or o == 0x5bd:
            names.append(NAME.get(o, hex(o)))
    if u'׀' in code: names.append('+paseq')
    return '+'.join(names) if names else '-'


def main():
    book, ch = sys.argv[1], int(sys.argv[2])
    show_labels = '--labels' in sys.argv
    f, pre = [(f, p) for f, en, p in BOOKS if en == book][0]
    src = io.open(os.path.join(ROOT, 'bom', 'teamim', f + '.js'), encoding='utf-8').read()
    T = json.loads(re.search(r'Object\.assign\(window\.SW_TEAMIM \|\| \{\}, (\{.*?\})\);', src, re.S).group(1))
    EN = english(ROOT)
    for (c, pos), (ref, toks) in sorted(corpus(ROOT, f, pre).items()):
        if c != ch: continue
        key = '%s|%d|%d' % (book, c, pos)
        speak = [(nfc(h), g) for h, g in toks if not silent(h)]
        codes = T.get(key, '').split('|')
        words = [apply(h, codes[i] if i < len(codes) else '') for i, (h, g) in enumerate(speak)]
        print('\n%s' % key)
        print('  ' + u' '.join(words) + u'׃')
        if ref and EN.get((book, ref[0], ref[1])): print('  ' + EN[(book, ref[0], ref[1])])
        if show_labels:
            print('  ' + ' | '.join('%s %s' % (h, labels_of(codes[i] if i < len(codes) else '')) for i, (h, g) in enumerate(speak)))


if __name__ == '__main__':
    main()
