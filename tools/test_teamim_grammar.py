#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regenerate the Tanakh's te'amim from its own phrasing and count the matches.

    python3 tools/test_teamim_grammar.py [--show N] [--book Gen]

The Masoretes' accents encode two things: WHERE each phrase ends and at what
rank (the phrasing), and WHICH mark says so (the grammar). This strips every
accent from a WLC verse, keeps only the phrasing as boundary ranks, and asks
tools/teamim_grammar.py to put the marks back. A word counts as right when it
gets the accent the Masoretes gave it. The grammar never saw the answer: it
was counted from the same corpus, but it chooses by rule, so the figure is
how far the rules reach.

Known and accepted misses: the metigah-zaqef (counted as zaqef qatan with a
meteg this never writes), the rare forms it never generates (shalshelet,
merkha kefula, qarney para, yerah ben yomo), and two munachs before one
etnachta or zaqef, which the grammar caps at one.
"""
import collections, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import teamim_grammar as G
from learn_teamim import prose_verses, RANK, ROOT

def ot_stress():
    """ot_stress.js: the reader's own stress table, for the words whose WLC accent
       is positional and so says nothing about the stress."""
    src = open(os.path.join(ROOT, 'ot_stress.js'), encoding='utf-8').read()
    return json.loads(re.search(r'Object\.assign\(window\.SW_STRESS \|\| \{\}, (\{.*\})\);', src, re.S).group(1))

def main():
    STRESS = ot_stress()
    show = 0; only = None
    a = sys.argv[1:]
    while a:
        x = a.pop(0)
        if x == '--show': show = int(a.pop(0))
        elif x == '--book': only = a.pop(0)
    tot = ok = verses = perfect = 0
    conf = collections.Counter()
    per_label = collections.defaultdict(lambda: [0, 0])
    shown = 0
    for book, ref, us in prose_verses():
        if only and book != only: continue
        words = [u['w'] for u in us]
        bounds = [(u['rank'] if u['rank'] else 0) for u in us]
        codes, labels = G.accent_verse(words, bounds, STRESS.get, None, [u['stress'] for u in us])
        verses += 1
        allok = True
        for u, got in zip(us, labels):
            want = u['lab'] or ''
            if u['rank'] is None and not want: continue      # an unaccented word in the WLC
            tot += 1
            per_label[want][1] += 1
            if got == want:
                ok += 1; per_label[want][0] += 1
            else:
                allok = False
                conf[(want, got or '-')] += 1
        if allok: perfect += 1
        elif shown < show:
            shown += 1
            print(ref, ' '.join('%s[%s>%s]' % (u['w'], u['lab'], g) for u, g in zip(us, labels) if (u['lab'] or '') != g))
    print('verses %s · words %s · right %s (%.2f%%) · verses fully right %s (%.1f%%)'
          % (format(verses, ','), format(tot, ','), format(ok, ','), 100.0 * ok / max(tot, 1),
             format(perfect, ','), 100.0 * perfect / max(verses, 1)))
    print('\nby accent (right / seen):')
    for lab, (r, s) in sorted(per_label.items(), key=lambda x: -x[1][1]):
        print('  %-14s %7d / %-7d %.1f%%' % (lab or '(none)', r, s, 100.0 * r / s))
    print('\ncommonest confusions (wanted > got):')
    for (w, g), c in conf.most_common(24):
        print('  %-14s > %-14s %d' % (w, g, c))

if __name__ == '__main__':
    main()
