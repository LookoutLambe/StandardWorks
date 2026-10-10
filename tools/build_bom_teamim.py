#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build bom/teamim/<book>.js — the cantillation layer of the Book of Mormon.

    python3 tools/build_bom_teamim.py [--check] [--show "1 Nephi|1|1"]

THE USER'S CALL (2026-10-09): "based on the cantillation marks in the bible you
can study them and know exactly how to do it to the BOM". The Tanakh's accents
were studied (tools/learn_teamim.py) and the grammar that came out of them
(tools/teamim_grammar.py) lays the same accents over the Book of Mormon. The
Hebrew is never touched — it is canon — and no accent enters bom/verses: this
is a separate lookup read by teamim.js only while the reader has the layer on,
exactly as ot_teamim/ is for the Tanakh.

WHAT THE MASORETES DECIDED AND WHAT THIS DECIDES. An accent says two things:
where a phrase ends and at what rank (the phrasing), and which mark says so
(the grammar). The grammar is theirs, counted. The phrasing of a Book of
Mormon verse comes from three places, in this order:

  1. THE TANAKH ITSELF, where the verse quotes it. Nephi's Isaiah, Abinadi's
     Isaiah 53, the Malachi of 3 Nephi 24-25, Exodus 20 in Mosiah 12-13: the
     verse is aligned word by word to the MT verse it quotes (the consonants,
     a longest common subsequence) and the Masoretes' own divisions come
     across at their own ranks. Where the Book of Mormon adds or changes a
     word, the grammar fills in.
  2. THE PRINTED ENGLISH, which is where the author put the pauses: the
     reader's own phrase-break table (bom/bom_phrase_breaks.js) carries its
     stops and commas onto the Hebrew words, with the Masoretes' veto on
     breaks they never make and the words that always take one. A stop is a
     division of the clause (zaqef, tifcha), a comma a division within it
     (pashta, revia, tevir); the verse's main division (etnachta) is the
     stop nearest its middle. Ranks are relative, as they are in the Tanakh:
     a clause with no stop is divided by its commas.
  3. THE MASORETES' HABITS, for the divisions neither marks. A tifcha may
     hold one servant and a pashta three, so a long phrase must divide again,
     and it divides at its weakest link: the log-odds that a disjunctive
     follows a word, learned from every adjacent pair in the Tanakh over the
     same gloss-and-Hebrew features the reader's breaths use.

The stress of each word is the reader's own table (bom/stress.js), which is
itself read off the Masoretes' accents.

ENCODING: as ot_teamim/ — per verse, one string, the words in render order
(every token but the bare sof pasuq, the index data-wid carries) joined by
"|"; within a word, chr(0x30 + consonant index) then the mark characters; a
trailing U+05C0 means a paseq follows the word.

--check reports, over the verses that quote the Tanakh, how many accents the
English-punctuation route alone would have put where the Masoretes did.
"""
import collections, io, json, os, re, sys, unicodedata as ud

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'bom', 'teamim')
sys.path.insert(0, HERE)
import teamim_grammar as G
from learn_teamim import prose_verses, RANK
from learn_teamim import pair_feats
from build_bom_breaks import (BOOKS, corpus, english, silent,
                              NEVER_AFTER, BINDS, binds_back, nfc)

N = lambda s: ud.normalize('NFC', s)
POINTS = re.compile(u'[֑-ֽֿ-ׇ]')
HEB = re.compile(u'[א-ת]')
bare = lambda h: POINTS.sub('', h or '')
MIN_OVERLAP = 0.45       # as tools/build_mt_parallels.py
MIN_ALIGNED = 0.6        # of the verse's words must find their MT word for the MT's phrasing to be used
ETNACHTA_MIN = 6         # units: the WLC puts an etnachta in 68% of six-unit verses, 49% of five


def load_js_table(path, var):
    src = io.open(path, encoding='utf-8').read()
    # non-greedy: bom_phrase_breaks.js carries a second table after this one
    m = re.search(r'window\.%s\s*=\s*Object\.assign\(window\.%s\s*\|\|\s*\{\},\s*(\{.*?\})\);' % (var, var), src, re.S)
    return json.loads(m.group(1))


# ------------------------------------------------------------ the Tanakh
def mt_index():
    """Every prose verse of the WLC as [(ref, units, bare words)], and an index by word."""
    MT, by_word = [], {}
    for book, ref, us in prose_verses():
        words = [bare(u['w']) for u in us]
        idx = len(MT)
        MT.append((ref, us, words))
        for w in set(words):
            if len(w) >= 3: by_word.setdefault(w, []).append(idx)
    return MT, by_word


def lcs_map(a, b):
    n, m = len(a), len(b)
    T = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            T[i][j] = T[i + 1][j + 1] + 1 if a[i] == b[j] else max(T[i + 1][j], T[i][j + 1])
    out, i, j = {}, 0, 0
    while i < n and j < m:
        if a[i] == b[j]: out[i] = j; i += 1; j += 1
        elif T[i + 1][j] >= T[i][j + 1]: i += 1
        else: j += 1
    return out


def mt_parallel(words, MT, by_word):
    """(ref, bounds, aligned fraction) from the MT verse this one quotes, or None."""
    S = set(words)
    cand = collections.Counter()
    for w in S:
        for i in by_word.get(w, []): cand[i] += 1
    best, score = None, 0.0
    for i, c in cand.items():
        if c < 3: continue
        B = set(MT[i][2]); inter = len(S & B)
        sc = inter / float(len(S) + len(B) - inter)
        if sc > score: score, best = sc, i
    if best is None or score < MIN_OVERLAP: return None
    ref, us, mw = MT[best]
    m = lcs_map(words, mw)
    if len(m) < MIN_ALIGNED * len(words): return None
    bounds = [0] * len(words)
    for ti, mi in m.items():
        r = us[mi]['rank']
        if r is None: continue
        if r == 0: r = 2 if ti < len(words) - 1 else 0     # the MT's silluq word, not last here: a clause end
        bounds[ti] = r
    return ref, bounds, len(m) / float(len(words))


# ------------------------------------------------------------ the phrasing
def binding():
    t = G.tables()['binding']
    return t['prior'], t['w']


CONSTRUCT_PL = re.compile(u'ֵי$')     # a tsere-yod ending: the plural construct (דִּבְרֵי, בְּנֵי)
# מִ / מֵ ("from") and לְ / לַ / לִ ("to", "of") are prepositions, glossed "of" too
PREP_PREFIX = re.compile(u'^(מ[ִֵ]|ל[ְִַָ])')
PLAIN_WAW = re.compile(u'^ו[ְּ]')      # וְ or וּ: the coordinating waw (not the wayyiqtol's וַ)
NAME_GLOSS = re.compile(r"^[A-Z][a-z']+$")  # a gloss that is one capitalised word: a name
TENS = {u'עשר', u'עשרה'}                        # the second word of a compound numeral (שְׁנֵים עָשָׂר)
# a title that stands before a name is one breath with it: "my father, Lehi"
# (the reader's own rule, tools/build_volume_breaks.py)
TITLE_BEFORE_NAME = set(u'אני אנכי אבי אמי אחי אחיו אביו אמו בני בנו בתו אשתו אביהם אחיהם אחיך אביך בנך'.split())
PREFIXES = u'והלבכמש'

def stem3(h):
    """the first three root letters, past the one-letter prefixes and a maqqef"""
    s = bare(h).split(u'־')[-1]
    while len(s) > 3 and s[0] in PREFIXES: s = s[1:]
    return s[:3]

def make_weakest(toks, prior, w):
    """Where a phrase most plausibly ends, by the Tanakh's log-odds that a
       disjunctive follows a word, with the rules of the house laid on as
       penalties rather than walls: a wall narrows a window down to whatever is
       left in it ("and a mother | goodly"), a penalty lets the best link win and
       tips only the close calls. HARD (the Masoretes do not do it): after a word
       that reaches forward (אֲשֶׁר, כִּי, a construct: the WLC puts a disjunctive
       after a tsere-yod construct 17.6% of the time against 60.8% for any word),
       before a bare אֶת or כׇּל, inside a compound numeral, between a title and
       its name, between the infinitive absolute and its verb. SOFT: before the
       "and" of a pair that ends the phrase ("great and marvelous"), and outside
       the window where the near divider stands (a tifcha within a word or two of
       its etnachta). When even the best link is a hard one, the answer is to
       join a word instead (the joiner)."""
    HARD, PAIR, FAR, GIVE_UP = -20.0, -4.0, -3.0, -10.0
    def score(i):
        return prior + sum(w.get(k, 0.0) for k in pair_feats(toks, i))
    def hard(i):
        h, g = toks[i]
        if nfc(h) in NEVER_AFTER: return True
        if BINDS.search(g.rstrip(u' ,;:.\u2014').strip()): return True
        if CONSTRUCT_PL.search(nfc(h).replace(u'\u05be', u'')): return True
        if i + 1 < len(toks):
            h2, g2 = toks[i + 1]
            # a bare אֶת or כׇּל reaches back; joined by a maqqef to its noun it is
            # the noun's own unit and a phrase ends before it as before any other
            # (וַיַּ֥רְא אֱלֹהִ֖ים אֶת־הָא֑וֹר)
            if u'\u05be' not in h2 and binds_back(h2): return True
            # this volume glosses a construct "the mercy" + "of the Lord": the
            # "of" on the next word says the two are one chain, unless that
            # word carries a preposition ("ask of God" מֵאֱלֹהִים, "of the
            # reign" לְמַלְכוּת)
            if re.match(r'of\b', g2.strip().lower()) and not PREP_PREFIX.match(nfc(h2)): return True
            # the infinitive absolute before its verb (עָזֹב לֹא־עֲזָבַנִי, מוֹת תָּמוּת)
            if len(stem3(h)) == 3 and stem3(h) == stem3(h2): return True
            # a compound numeral (שְׁנֵים עָשָׂר) and a title before a name (אָבִי לֶחִי)
            if bare(h2) in TENS: return True
            if bare(h) in TITLE_BEFORE_NAME and NAME_GLOSS.match(g2.strip()): return True
        return False
    def weight(i, hi, glabel, near):
        s = score(i)
        if hard(i): s += HARD
        if i + 1 < len(toks):
            h, h2 = toks[i][0], toks[i + 1][0]
            # A PAIR STAYS A PAIR: "great and marvelous", "saw and heard" are not
            # divided before their "and" when that leaves the second to end the
            # phrase alone; the division falls earlier and the pair keeps one
            # accent between them (אֲשֶׁר־רָאָ֣ה וְשָׁמַ֔ע). Not before a silluq or
            # etnachta: there a list's last two words take tifcha and the clause
            # accent (גֵּרְשׁ֛וּ וְסָקְל֖וּ וְהָרָ֑גוּ), and the clause must divide.
            if i + 1 == hi and PLAIN_WAW.match(nfc(h2)) and not PLAIN_WAW.match(nfc(h)) and glabel not in ('silluq', 'etnachta'):
                s += PAIR
        if near is not None and i < near: s += FAR * (near - i)
        return s
    def weakest(units, lo, hi, glabel=None, near=None):
        cands = [i for i in range(lo, hi) if i + 1 < len(toks)]
        if not cands: return None
        best = max(cands, key=lambda i: weight(i, hi, glabel, near))
        return best if weight(best, hi, glabel, near) > GIVE_UP else None
    def joiner(units, lo, hi):
        """the word in [lo, hi) to write as if a maqqef joined it to the next: a
           particle first (כִּי, לֹא, אֶל: the ones the Masoretes join), nearest the
           governor; then any word that reaches forward"""
        for i in range(hi - 1, lo - 1, -1):
            if i + 1 < len(toks) and nfc(toks[i][0]) in NEVER_AFTER: return i
        for i in range(hi - 1, lo - 1, -1):
            if i + 1 < len(toks) and hard(i): return i
        return None
    return weakest, joiner


MAX_CHAIN = 3            # dividers of one rank in one domain: the WLC's zaqef chains run to three (four in 0.2%)

def thin(b, s, e):
    """Nest the divisions of a segment the way the Masoretes do: never more than
       MAX_CHAIN of one rank under one governor. "God, the Eternal Father, in the
       name of Christ, if these things are not true" is five commas, and five
       zaqefs is a chain the Tanakh almost never makes; the shortest of them step
       down a rank and divide the clause they fall in instead."""
    rs = [b[i] for i in range(s, e) if b[i]]
    if not rs: return
    r = min(rs)
    divs = [i for i in range(s, e) if b[i] == r]
    while len(divs) > MAX_CHAIN and r < 4:
        own = [(d - (divs[k - 1] if k else s - 1), -d) for k, d in enumerate(divs)]
        victim = divs[own.index(min(own))]
        b[victim] = r + 1
        divs = [i for i in range(s, e) if b[i] == r]
    prev = s - 1
    for d in divs:
        thin(b, prev + 1, d); prev = d
    thin(b, prev + 1, e)


HARD_STOP = re.compile(r'[.]')     # a full stop; ! and ? end a cry inside a speech as often as a sentence

def stop_kinds(entext):
    """For each stop the printed English carries before its last word, in order,
       whether it ends a sentence (a full stop) rather than a clause (; : ! ? and
       the dash: "O Lord God Almighty! Thy throne is high" runs on inside one
       speech, and the Masoretes divide at the "saying" before it)."""
    kinds = []
    for m in re.finditer(r"[A-Za-z][A-Za-z'\-]*([^A-Za-z]*)", entext or ''):
        tail = m.group(1)
        if re.search(r'[;:.!?—]', tail): kinds.append(bool(HARD_STOP.search(tail)))
    return kinds[:-1]


def punctuation_bounds(n, breaks, entext=None):
    """stops -> rank 2, commas -> rank 3; the etnachta goes to the stop nearest
       the middle, and a sentence's end outranks a clause's: a verse that holds
       two sentences divides between them (Genesis 1:5 divides at לָיְלָה)."""
    b = [0] * n
    for i, wgt in breaks:
        if 0 <= i < n - 1: b[i] = 2 if wgt >= 2 else 3
    p = None
    if n >= ETNACHTA_MIN:
        marked = [i for i in range(n - 1) if b[i]]
        if marked:
            top = min(b[i] for i in marked)
            cands = [i for i in marked if b[i] == top]
            if top == 2:
                kinds = stop_kinds(entext)
                if len(kinds) == len(cands) and any(kinds):
                    cands = [i for i, k in zip(cands, kinds) if k]
            mid = (n - 1) / 2.0
            p = min(cands, key=lambda i: (abs(i + 0.5 - mid), i))
            b[p] = 1
    if p is not None:
        thin(b, 0, p); thin(b, p + 1, n - 1)
    else:
        thin(b, 0, n - 1)
    return b


# ------------------------------------------------------------ main
def main():
    check = '--check' in sys.argv
    show = set(sys.argv[sys.argv.index('--show') + 1].split(',')) if '--show' in sys.argv else set()
    STRESS = load_js_table(os.path.join(ROOT, 'bom', 'stress.js'), 'SW_STRESS')
    EN = english(ROOT)
    BREAKS = load_js_table(os.path.join(ROOT, 'bom', 'bom_phrase_breaks.js'), 'SW_BREAKS')
    over_path = os.path.join(HERE, 'teamim_overrides.json')
    OVER = json.load(io.open(over_path, encoding='utf-8')) if os.path.exists(over_path) else {}
    prior, w = binding()
    MT, by_word = mt_index()
    os.makedirs(OUT, exist_ok=True)
    stats = collections.Counter()
    agree = [0, 0, 0]                 # same accent, same class (divider or servant), words
    labels_count = collections.Counter()
    for f, en, pre in BOOKS:
        table = {}
        for (ch, pos), (ref, toks) in sorted(corpus(ROOT, f, pre).items()):
            key = '%s|%d|%d' % (en, ch, pos)
            speak = [(N(h), g) for h, g in toks if not silent(h)]
            n = len(speak)
            if n == 0: continue
            stats['verses'] += 1
            words = [h for h, g in speak]
            par = mt_parallel([bare(h) for h in words], MT, by_word)
            ent = EN.get((en, ref[0], ref[1])) if ref else None
            pb = punctuation_bounds(n, BREAKS.get(key, []), ent)
            if par:
                bounds, how = par[1], 'mt'
            else:
                bounds, how = pb, 'english'
            if key in OVER:
                # a hand ruling (tools/teamim_overrides.json): {"index": rank} laid
                # over the computed phrasing; 0 = no division, 1 moves the etnachta
                bounds = list(bounds)
                for idx, r in OVER[key].items():
                    idx, r = int(idx), int(r)
                    if r == 1: bounds = [2 if x == 1 else x for x in bounds]
                    if 0 <= idx < n: bounds[idx] = r
                how = 'override'
            stats[how] += 1
            weakest, joiner = make_weakest(speak, prior, w)
            codes, labels = G.accent_verse(words, bounds, STRESS.get, weakest, None, joiner)
            labels_count.update(labels)
            if check and par:
                # the English route against the Masoretes, on the verses that quote them
                _, lab_en = G.accent_verse(words, list(pb), STRESS.get, weakest, None, joiner)
                for a, c in zip(labels, lab_en):
                    agree[2] += 1; agree[0] += (a == c)
                    agree[1] += ((a in RANK) == (c in RANK))
            if key in show:
                print(key, how, par[0] if par else '')
                for (h, g), c, l, bd in zip(speak, codes, labels, bounds):
                    print('  %-24s %-12s r%d  %s' % (h, l, bd, c))
            table[key] = '|'.join(codes)
        body = json.dumps(table, ensure_ascii=False, separators=(',', ':'))
        with io.open(os.path.join(OUT, f + '.js'), 'w', encoding='utf-8') as fh:
            fh.write(u'// bom/teamim/%s.js — auto-generated by tools/build_bom_teamim.py. DO NOT EDIT.\n' % f)
            fh.write(u'// The cantillation layer for %s: the te’amim laid by the rules of the\n' % en)
            fh.write(u'// Masoretes (tools/teamim_grammar.py), by word and consonant. Read only while\n')
            fh.write(u'// the layer is on; the verse data is never touched.\n')
            fh.write(u'window.SW_TEAMIM = Object.assign(window.SW_TEAMIM || {}, %s);\n' % body)
    size = sum(os.path.getsize(os.path.join(OUT, p)) for p in os.listdir(OUT) if p.endswith('.js'))
    print('verses %s · phrased by the Tanakh %s · by the printed English %s · by hand %s · %s KB in bom/teamim/'
          % (format(stats['verses'], ','), stats['mt'], format(stats['english'], ','), stats['override'], format(size // 1024, ',')))
    tot = sum(labels_count.values())
    print('accents: ' + ', '.join('%s %.1f%%' % (k or 'none', 100.0 * v / tot) for k, v in labels_count.most_common(12)))
    if check and agree[2]:
        print('on the verses that quote the Tanakh, the English route alone puts the Masoretes\' own accent on %d of %d words (%.1f%%)'
              ' and divides where they divide on %d (%.1f%%)'
              % (agree[0], agree[2], 100.0 * agree[0] / agree[2], agree[1], 100.0 * agree[1] / agree[2]))


if __name__ == '__main__':
    main()
