#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Which adjacent word-pairs do the Masoretes never break apart?

    python3 tools/build_mt_bound_pairs.py     ->  tools/mt_bound_pairs.json

THE COMPANION TO mt_break_before.json. That file says where a phrase may END
in front of a given word; this one says where one may NOT, because the pair is
read as a unit. The English-derived tables need it: they carry the punctuation
of the printed column across, and an English comma does not always fall where
a Hebrew phrase does. "And the earth was without form, and void" has a comma
the Hebrew has no seam at — תֹהוּ וָבֹהוּ is one breath, and the Masoretes put
their break AFTER וָבֹהוּ, not between the two.

A pair qualifies when the Tanakh attests it adjacent at least once and never
once breaks it. The key is the consonantal skeleton of both words, so pointing
and a spelling variant cannot hide a match.
"""
import io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
POINTS = re.compile(u'[֑-ׇ]')
SPEAK  = re.compile(u'[א-ת]')
TOK    = re.compile(u'\\["([^"]*)","([^"]*)"\\]')
CH     = re.compile(u'var\\s+[A-Za-z0-9_]+_ch(\\d+)Verses\\s*=\\s*\\[')
NUM    = re.compile(u'\\{\\s*num\\s*:')

NAMES = {'gen':'Genesis','exo':'Exodus','lev':'Leviticus','num':'Numbers',
 'deu':'Deuteronomy','jos':'Joshua','jdg':'Judges','rth':'Ruth','1sa':'1 Samuel',
 '2sa':'2 Samuel','1ki':'1 Kings','2ki':'2 Kings','isa':'Isaiah','jer':'Jeremiah',
 'eze':'Ezekiel','hos':'Hosea','joe':'Joel','amo':'Amos','oba':'Obadiah','jon':'Jonah',
 'mic':'Micah','nah':'Nahum','hab':'Habakkuk','zep':'Zephaniah','hag':'Haggai',
 'zec':'Zechariah','mal':'Malachi','psa':'Psalms','pro':'Proverbs','job':'Job',
 'sng':'Song of Songs','ecc':'Ecclesiastes','lam':'Lamentations','est':'Esther',
 'dan':'Daniel','ezr':'Ezra','neh':'Nehemiah','1ch':'1 Chronicles','2ch':'2 Chronicles'}

def bare(s):
    return POINTS.sub('', s)

def ot_breaks():
    src = io.open(os.path.join(ROOT, 'ot_phrase_breaks.js'), encoding='utf-8').read()
    m = re.search(r'window\.SW_BREAKS\s*=\s*Object\.assign\([^,]+,\s*(\{.*?\})\);', src, re.S)
    return json.loads(m.group(1))

def verses(path):
    txt = io.open(path, encoding='utf-8').read()
    marks = [(m.end(), int(m.group(1))) for m in CH.finditer(txt)]
    for i, (pos, ch) in enumerate(marks):
        body = txt[pos: marks[i+1][0] if i+1 < len(marks) else len(txt)]
        starts = [m.start() for m in NUM.finditer(body)]
        for j, st in enumerate(starts):
            vb = body[st: starts[j+1] if j+1 < len(starts) else len(body)]
            words = [h for h, g in TOK.findall(vb) if SPEAK.search(h)]
            yield ch, j + 1, words

def main():
    BR = ot_breaks()
    pair = {}
    for f in sorted(os.listdir(os.path.join(ROOT, 'ot_verses'))):
        if not f.endswith('.js'):
            continue
        book = NAMES.get(f[:-3])
        if not book:
            continue
        for ch, v, words in verses(os.path.join(ROOT, 'ot_verses', f)):
            br = BR.get('%s|%d|%d' % (book, ch, v))
            if not br:
                continue
            at = set(x[0] if isinstance(x, list) else x for x in br)
            for i in range(len(words) - 1):
                k = bare(words[i]) + '\t' + bare(words[i+1])
                e = pair.setdefault(k, [0, 0])
                e[1 if i in at else 0] += 1
    bound = {k: v[0] for k, v in pair.items() if v[0] >= 1 and v[1] == 0}
    out = os.path.join(HERE, 'mt_bound_pairs.json')
    io.open(out, 'w', encoding='utf-8').write(
        json.dumps(bound, ensure_ascii=False, sort_keys=True, separators=(',', ':')))
    print('pairs the Masoretes attest : %s' % format(len(pair), ','))
    print('...and never once break     : %s  (%.1f%%)'
          % (format(len(bound), ','), 100.0 * len(bound) / max(len(pair), 1)))
    print('written: tools/mt_bound_pairs.json  (%s KB)' % format(os.path.getsize(out)//1024, ','))

if __name__ == '__main__':
    main()
