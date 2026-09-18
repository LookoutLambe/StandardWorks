#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build the phrase-break table for the New Testament, D&C, Pearl of Great
   Price, JST — the four volumes that had none — and the Book of Mormon.

    python3 tools/build_volume_breaks.py [nt|dc|pgp|jst|bom|all]

THE BOOK OF MORMON WAS SKIPPED BECAUSE IT ALREADY HAD A TABLE, and that was
the wrong reason: the table it had came from tools/build_bom_breaks.py, which
reads the printed English and nothing else. So the volume with the most Isaiah
in it was the one volume phrased entirely by an 1830s editor's commas. It gets
neither of the two things this file added — the Masoretes' veto on breaks that
would split a pair the Tanakh never splits, and the te'amim themselves carried
across every verse that runs parallel to an MT verse.

WHY THEY HAD NOTHING. The Old Testament is the Masoretic Text and ships the
te'amim themselves; the Book of Mormon got a table built from its printed
English. These four ran on read_aloud.js's nine hand rules alone, which find
the clause openers and nothing else — so a verse of Delitzsch came out in one
breath from beginning to end.

They have everything the Book of Mormon had. A punctuated English column, in
the same shape. A gloss line in the same glossing language. And the Tanakh's
own accents, which say where a phrase ends in front of any word they have seen
25 times — 63.9% of positions in a volume that is built from their vocabulary.
So this runs the same extraction, unchanged, over four more volumes.

    output: nt_phrase_breaks.js, dc_phrase_breaks.js,
            pgp_phrase_breaks.js, jst_phrase_breaks.js

THE VERSE KEY IS THE ARRAY POSITION, because reader_surface.js builds
data-verse-key that way, and a table keyed any other way is never found.
"""
import io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_bom_breaks import (array_bodies, breaks_for, silent, gem)

# ---- the Masoretes' veto -------------------------------------------------
# An English comma does not always fall where a Hebrew phrase does. The
# printed column reads "without form, and void" and the extraction carries
# that comma across, but תֹהוּ וָבֹהוּ is one breath: the Masoretes break AFTER
# וָבֹהוּ, never between the two. tools/mt_bound_pairs.json lists every
# adjacent pair the Tanakh attests and never once splits; a break that would
# split one of them is dropped. Rebuild it with tools/build_mt_bound_pairs.py.
_POINTS = re.compile(u'[\u0591-\u05C7]')

# ---- and where the text IS the Tanakh's, its phrasing comes with it -------
# tools/build_mt_parallels.py finds every verse running parallel to an MT
# verse, aligns the two word sequences and carries the te'amim's breaks over.
# Those outrank the English-derived extraction for that verse entirely: the
# printed column's commas are a second-hand answer where the first-hand one
# survives. Moses 2-8 retells Genesis 1-6, much of it word for word.
_PARALLEL = None
def mt_parallels():
    global _PARALLEL
    if _PARALLEL is None:
        f = os.path.join(HERE, 'mt_parallel_breaks.json')
        _PARALLEL = json.load(io.open(f, encoding='utf-8')) if os.path.exists(f) else {}
    return _PARALLEL
_BOUND = None
def bound_pairs():
    global _BOUND
    if _BOUND is None:
        f = os.path.join(HERE, 'mt_bound_pairs.json')
        _BOUND = json.load(io.open(f, encoding='utf-8')) if os.path.exists(f) else {}
    return _BOUND

def drop_split_pairs(br, speak):
    """Remove any break that would split a pair the Masoretes never split."""
    B, out, cut = bound_pairs(), [], 0
    for i, c in br:
        if 0 <= i < len(speak) - 1:
            k = _POINTS.sub('', speak[i][0]) + '\t' + _POINTS.sub('', speak[i+1][0])
            if k in B:
                cut += 1
                continue
        out.append((i, c))
    return out, cut

ROOT = os.path.dirname(HERE)


def english(vol):
    """{(book, chapter, verse): english} from <vol>_english.js.

       The Book of Mormon's column is bom/official_verses.js, pretty-printed,
       so the one-line regex below cannot see it; it is plain JSON and is read
       as JSON."""
    if vol == 'bom':
        src = io.open(os.path.join(ROOT, 'bom', 'official_verses.js'),
                      encoding='utf-8').read()
        data = json.loads(src[src.index('['): src.rindex(']') + 1])
        return {(r['book'], r['chapter'], r['verse']): r['english'] for r in data}
    src = io.open(os.path.join(ROOT, vol + '_english.js'), encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'"book":"((?:[^"\\]|\\.)*)","chapter":(\d+),"verse":(\d+),'
                         r'"english":"((?:[^"\\]|\\.)*)"', src):
        book = m.group(1).encode().decode('unicode_escape')
        out[(book, int(m.group(2)), int(m.group(3)))] = \
            m.group(4).encode().decode('unicode_escape')
    return out


def books(vol):
    """array-variable prefix -> (book name, fixed chapter or None).

       Each page names its books differently and all three shapes are real:
       the New Testament lists {prefix:'matt', en:'Matthew'}; the Pearl and the
       JST list {idPrefix:'ms-ch', en:'Moses'}, whose idPrefix is the array
       prefix with '-ch' on it; and the Doctrine and Covenants is ONE book
       whose sections are its chapters, so dc111_ch1Verses is D&C 111 and the
       array's own ch1 means nothing."""
    if vol == 'bom':
        src = io.open(os.path.join(ROOT, 'bom', 'bom.html'), encoding='utf-8').read()
        out = {}
        for m in re.finditer(r"\{\s*prefix:\s*'([a-z0-9-]+)'\s*,\s*name:\s*'([^']+)'", src):
            out[m.group(1).replace('-', '_')] = (m.group(2), None)
        # A JAVASCRIPT VARIABLE CANNOT START WITH A DIGIT, so the three books
        # whose page prefix does — 2n-ch, 3n-ch, 4n-ch — are named something
        # else in the verse data, and it is not a transformation, it is three
        # hand-picked names. Verified against the files: every one of the
        # fifteen books' chapter counts matches the page table.
        for alias, pref in (('n2_ch', '2n_ch'), ('tn_ch', '3n_ch'), ('fn_ch', '4n_ch')):
            if pref in out:
                out[alias] = out[pref]
        return out
    src = io.open(os.path.join(ROOT, vol + '.html'), encoding='utf-8').read()
    out = {}
    for m in re.finditer(r"\{prefix:'([A-Za-z0-9]+)',\s*en:'((?:[^'\\]|\\.)*)'", src):
        out[m.group(1)] = (m.group(2).replace("\\'", "'"), None)
    for m in re.finditer(r"idPrefix:\s*'([A-Za-z0-9]+)-ch\d*'\s*,\s*en:\s*'((?:[^'\\]|\\.)*)'", src):
        out[m.group(1)] = (m.group(2).replace("\\'", "'"), None)
    return out


def verses(vol, prefix_map, english_index=None):
    """[(key, english_ref, tokens)] for one volume."""
    out = []
    vdir = os.path.join(ROOT, 'bom', 'verses') if vol == 'bom' \
           else os.path.join(ROOT, vol + '_verses')
    # THE BOOK OF MORMON NAMES ITS ARRAYS <prefix><n>Verses, and the prefix is
    # the book table's own with the hyphen turned to an underscore: Mosiah 1 is
    # mo_ch1Verses, but 1 Nephi's prefix is bare 'ch' so its first chapter is
    # ch1Verses with no _ch in it at all. One regex for both, the prefix
    # resolved against the table rather than assumed.
    pat = r'var ([A-Za-z0-9_]+?)(\d+)Verses\s*=\s*\[' if vol == 'bom' \
          else r'var (_?[A-Za-z0-9]+)_ch(\d+)Verses\s*=\s*\['
    for path in sorted(os.listdir(vdir)):
        if not path.endswith('.js') or path == 'manifest.js':
            continue
        src = io.open(os.path.join(vdir, path), encoding='utf-8').read()
        for m, body in array_bodies(src, pat):
            pre, ch = m.group(1).lstrip('_'), int(m.group(2))
            if vol == 'bom':
                pre = pre.rstrip('_')
            if vol == 'dc':
                mm = re.match(r'^(dc|od)(\d+)$', pre)
                if not mm:
                    continue
                book, ch = ('D&C' if mm.group(1) == 'dc' else 'OD'), int(mm.group(2))
            else:
                info = prefix_map.get(pre)
                if not info:
                    continue
                book = info[0]
            vs = list(re.finditer(
                r'\{\s*num:\s*"([^"]*)"\s*,\s*words:\s*\[(.*?)\]\s*\}', body, re.S))
            # THE JST IS POSITIONAL ON BOTH AXES. jstgen_ch3Verses is the
            # third Genesis excerpt, not Genesis 3, and its verses carry their
            # REAL numerals — 25 to 32. jst_english.js is numbered the same
            # way the file is: "Genesis" 3, verses 1..n. So both sides agree
            # already, and the numeral is the one thing that must NOT be used.
            # Looking the English up by gematria found nothing for 234 of the
            # 401 verses, which read as missing data and was a wrong join.
            for vi, vm in enumerate(vs):
                g = gem(vm.group(1))
                ref = (book, ch, vi + 1) if vol == 'jst' else ((book, ch, g) if g else None)
                out.append(('%s|%d|%d' % (book, ch, vi + 1), ref,
                            re.findall(r'\["([^"]*)","([^"]*)"\]', vm.group(2))))
    return out


def build(vol):
    EN, bk = english(vol), books(vol)
    idx = {}
    for (b, c, v) in EN:
        idx.setdefault(b, {}).setdefault(c, set()).add(v)
    table, ask, n, noeng, plain = {}, {}, 0, 0, 0
    vetoed = [0]
    fromMT = [0]
    for key, ref, toks in verses(vol, bk, idx):
        speak = [t for t in toks if not silent(t[0])]
        if len(speak) < 3:
            continue
        n += 1
        ent = EN.get(ref) if ref else None
        if not ent:
            noeng += 1
        if ent and ent.rstrip().endswith('?'): ask[key] = 1
        mt = mt_parallels().get(key)
        if mt:
            table[key] = [list(x) for x in mt]
            fromMT[0] += 1
            continue
        br = breaks_for(toks, ent)
        br, cut = drop_split_pairs(br, speak)
        vetoed[0] += cut
        if br:
            table[key] = [[i, c] for i, c in br]
        else:
            plain += 1
    path = os.path.join(ROOT, 'bom', 'bom_phrase_breaks.js') if vol == 'bom' \
           else os.path.join(ROOT, vol + '_phrase_breaks.js')
    with io.open(path, 'w', encoding='utf-8') as fh:
        fh.write(u'// %s_phrase_breaks.js — auto-generated by tools/build_volume_breaks.py.\n'
                 u'// DO NOT EDIT. Where each verse breathes: [index, weight], the index into\n'
                 u"// the verse's speakable words and 1 for a comma, 2 for a stop. Carried\n"
                 u'// across from the printed English and from the Tanakh\'s own accents.\n'
                 u'// The Hebrew is untouched — this is a separate lookup, as stress.js is.\n' % vol)
        fh.write(u'window.SW_BREAKS = Object.assign(window.SW_BREAKS || {}, %s);\n'
                 % json.dumps(table, ensure_ascii=False, separators=(',', ':')))
        fh.write(u'window.SW_ASK = Object.assign(window.SW_ASK || {}, %s);\n'
                 % json.dumps(ask, ensure_ascii=False, separators=(',', ':')))
    print('%-4s %6s verses  %6s with breaks (%.1f%%)  %5s breaks  %4s no English  %s KB'
          % (vol, format(n, ','), format(len(table), ','), 100.0 * len(table) / max(n, 1),
             format(sum(len(x) for x in table.values()), ','), format(noeng, ','),
             format(os.path.getsize(path) // 1024, ',')))
    print('     %s verse(s) phrased by the Masoretes themselves (MT parallel)'
          % format(fromMT[0], ','))
    print('     %s break(s) vetoed: they would have split a pair the Masoretes never split'
          % format(vetoed[0], ','))


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for v in (['nt', 'dc', 'pgp', 'jst', 'bom'] if which == 'all' else [which]):
        build(v)
