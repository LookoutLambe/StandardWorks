#!/usr/bin/env python3
"""Measure where the Masoretes break, to derive read_aloud.js's phrasing rules.

    python3 tools/measure_teamim.py

WHY THIS EXISTS. read_aloud.js reads a chapter a clause at a time and has to
decide where to breathe. That decision was a list of rules I wrote by
intuition. The te'amim are a punctuation system — every Masoretic accent is
either DISJUNCTIVE (break after this word) or CONJUNCTIVE (bind it forward) —
so the Tanakh is 283,561 worked examples of exactly this question, and the
rules can be measured instead of guessed.

This SHIPS NOTHING. It prints a table; the rules that survive it are written
into read_aloud.js by hand, with their measured rate beside them. A first
version generated per-volume lookup tables of "forms that end a phrase" and
they were quietly wrong: אֱלֹהִים carries the atnach in Genesis 1:1 — the
main division of the verse — but across its ~2,600 occurrences it usually is
NOT phrase-final, so a form-level table missed the very break it should have
caught. Position decides, not the word. Hence rules, not a table.

    source: ~/Desktop/morphhb/wlc/*.xml   (OpenScriptures, public domain)

WHAT IT FOUND, and two things it corrected:

  - the waw-consecutive rule was right (79.0%, 3.58x chance)
  - a PLAIN waw was being treated as continuing a phrase — never break before
    it. Backwards: 57.8%, 2.62x. But the morphology splits it — וְ+verb 70.2%
    against וְ+noun 48.2% — so a waw before a verb opens a clause while a waw
    before a noun coordinates inside one. The reader has no morphology, so the
    blanket rule is dropped rather than reversed.
  - the discourse connectives measured near chance (28.5%) until I stopped
    lumping לָכֵן in with the preposition עַל. Alone it is 96.8%.

Rank<=2 means the emperors and kings — the divisions of the verse and of its
halves. Taking every disjunctive down to the dukes chops Genesis 1:1 into four
phrases for seven words, which is right for chant and too fine to read along.
"""
import glob, os, re, sys, unicodedata as ud

WLC = os.path.expanduser('~/Desktop/morphhb/wlc')
RANK = {0x0591: 1, 0x0592: 2, 0x0593: 2, 0x0594: 2, 0x0595: 2, 0x0597: 2,
        0x0596: 3, 0x0598: 3, 0x0599: 3, 0x059A: 3, 0x059B: 3,
        0x059C: 4, 0x059D: 4, 0x059E: 4, 0x059F: 4, 0x05A0: 4, 0x05A1: 4,
        0x05A2: 2, 0x05AB: 3, 0x05AD: 3, 0x05AE: 3}
ALL_ACC = set(range(0x0591, 0x05B0)) | {0x05BD}
N = lambda s: ud.normalize('NFC', s)
bare = lambda s: ''.join(c for c in s if ord(c) not in ALL_ACC)

# Each rule asks: when the NEXT word looks like this, did the Masoretes break?
RULES = [
    ('וְעַתָּה',        r'^וְעַתָּה'),
    ('לָכֵן',           r'^לָכֵן'),
    ('וַיְהִי',         r'^וַיְהִי'),
    ('יַעַן',           r'^יַעַן'),
    ('וְאַף',           r'^וְאַף'),
    ('פֶּן',            r'^פֶּן'),
    ('כִּי',            r'^כִּי'),
    ('הִנֵּה',          r'^ו?ְ?הִנֵּה'),
    ('wayyiqtol',       r'^ו[ַָ][איתנ]'),
    ('אִם',             r'^אִם'),
    ('plain waw',       r'^וְ'),
    ('אֲשֶׁר',          r'^אֲשֶׁר'),
    ('עַתָּה',          r'^עַתָּה'),
    ('אַף',             r'^אַף'),
    ('לֹא',             r'^לֹא'),
    ('אֵת / אֶת',       r'^א[ֵֶ]ת'),
    ('כֹּל / כׇּל',     r'^כׇּל|^כָּל'),
]


def main():
    if not os.path.isdir(WLC):
        sys.exit('WLC not found at %s — needs OpenScriptures morphhb on the Desktop.' % WLC)
    tot = brk = 0
    hits = {name: [0, 0] for name, _ in RULES}
    for f in glob.glob(os.path.join(WLC, '*.xml')):
        src = open(f, encoding='utf-8').read()
        for verse in re.findall(r'<verse[^>]*>(.*?)</verse>', src, re.S):
            ws = [w.replace('/', '') for w in re.findall(r'<w[^>]*>([^<]+)</w>', verse)]
            for i, w in enumerate(ws[:-1]):        # the last word is sof pasuq
                ranks = [RANK[ord(c)] for c in w if ord(c) in RANK]
                is_break = bool(ranks) and min(ranks) <= 2
                tot += 1
                brk += is_break
                nxt = N(bare(ws[i + 1]))
                for name, pat in RULES:
                    if re.match(pat, nxt):
                        hits[name][0] += 1
                        hits[name][1] += is_break
    base = brk / tot
    print('%s non-verse-final words; %.1f%% carry a rank<=2 disjunctive.\n'
          % (format(tot, ','), 100 * base))
    print('  %-14s %9s %8s %8s' % ('next word', 'cases', 'break', 'lift'))
    for name, _ in RULES:
        n, b = hits[name]
        if n < 20:
            print('  %-14s %9s   (too few to measure)' % (name, format(n, ',')))
            continue
        print('  %-14s %9s %7.1f%% %7.2fx' % (name, format(n, ','), 100 * b / n, (b / n) / base))
    print('\nread_aloud.js breaks before everything above ~79%%, binds on the two')
    print('below chance, and leaves the middle alone — near chance is not a rule.')


if __name__ == '__main__':
    main()
