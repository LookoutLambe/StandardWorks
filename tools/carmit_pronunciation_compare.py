#!/usr/bin/env python3
"""What Carmit actually said, against what she SHOULD have said.

The yardstick is the source converted to modern ktiv male by read_aloud.js's
own ktivMale() — not the bare consonant skeleton. That is the whole trick:
modern spelling writes /o/ and /u/ with a VAV, so if the source has a holam
and the transcript has no vav, she said /a/. That is a real error and it is
the class the hataf qamats belonged to.

Two earlier versions of this were both wrong. Folding ו and י out of both
sides hid exactly that signal. Keeping every ו/י difference flagged הייתה
against היתה — correct modern orthography — as a defect. Doubled yod and vav
are orthography and are normalised away; a MISSING vav is not.
"""
import re, json, os, collections
HERE = os.path.dirname(os.path.abspath(__file__))
POINTS = re.compile('[֑-ֽֿ-ׇ]')
FINALS = str.maketrans('ךםןףץ', 'כמנפצ')
KM = json.load(open(HERE + '/ktivmale.json', encoding='utf-8'))

def norm(w):
    w = POINTS.sub('', w)
    w = re.sub('[^א-ת]', '', w)          # punctuation, incl. the phrase periods
    w = w.translate(FINALS)
    return w.replace('וו', 'ו').replace('יי', 'י')

verses = dict(l.rstrip('\n').split('\t', 1) for l in open(HERE+'/verses.tsv', encoding='utf-8') if '\t' in l)
occ = collections.Counter(); vowel = collections.Counter(); other = collections.Counter()
where = collections.defaultdict(list)
n = 0
for line in open(HERE+'/transcripts.tsv', encoding='utf-8'):
    if '\t' not in line: continue
    key, heard = line.rstrip('\n').split('\t', 1)
    if key not in verses: continue
    n += 1
    htok = {norm(w) for w in re.split(r'\s+', heard) if norm(w)}
    hnv  = {t.replace('ו', '') for t in htok}
    for raw in verses[key].split():
        src = re.sub('[^֐-׿]', '', raw)
        if not src or not re.search('[א-ת]', src): continue
        want = norm(KM.get(src, src))
        if not want: continue
        occ[src] += 1
        if want in htok: continue
        if want.replace('ו', '') in hnv:
            vowel[src] += 1; where[src].append(key)     # only the vav differs
        else:
            other[src] += 1; where[src].append(key)

print('verses compared: %d   distinct forms: %s\n' % (n, format(len(occ), ',')))
for label, c in (('VOWEL — the vav is missing: an /o/ or /u/ she read as /a/', vowel),
                 ('OTHER — a consonant or syllable is wrong', other)):
    rep = sorted([(occ[w], w) for w in c if occ[w] >= 3 and c[w] == occ[w]], reverse=True)
    print('%s\n  wrong in EVERY occurrence, 3+ occurrences: %d forms' % (label, len(rep)))
    for o, w in rep[:20]:
        print('    %3dx  %-20s %-14s %s' % (o, w, norm(KM.get(w, w)), where[w][0]))
    print()
