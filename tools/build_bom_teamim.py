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
     reader's own phrase-break extraction (tools/build_bom_breaks.py, the
     source of bom/bom_phrase_breaks.js, run live here without its added
     breaths: printed_marks) carries its stops and commas onto the Hebrew
     words, with the Masoretes' veto on breaks they never make. A stop is a
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
from build_bom_breaks import (BOOKS, corpus, english, silent, breaks_for,
                              NEVER_AFTER, BINDS, binds_back, nfc)
from build_volume_breaks import drop_split_pairs, drop_unnatural

N = lambda s: ud.normalize('NFC', s)
POINTS = re.compile(u'[֑-ֽֿ-ׇ]')
HEB = re.compile(u'[א-ת]')
bare = lambda h: POINTS.sub('', h or '')
MIN_OVERLAP = 0.45       # as tools/build_mt_parallels.py
MIN_ALIGNED = 0.6        # of the verse's words must find their MT word for the MT's phrasing to be used
ETNACHTA_MIN = 6         # units: the WLC puts an etnachta in 68% of six-unit verses, 49% of five
FIRST_CUT_MIN = 7        # ...and in 87.5% of seven-unit verses, 92% of eight: a verse that long is
                         # halved even with no mark and no sure link to say where (first_cut)


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
# מִ / מֵ ("from"), לְ / לַ / לִ ("to", "of"), בְּ / בָּ ("in"; "great hopes of them" is בָּם,
# 16:5) and כְּ are prepositions, glossed "of" too
PREP_PREFIX = re.compile(u'^(מ[ִֵ]|ל[ְִַָ]|ב[ְִַָ]|כ[ְִַָ])')
# וְ or וּ, or וַ before an alef with a hataf (וַאֲבוֹתָיו, וַאֲנִי): the coordinating
# waw, not the wayyiqtol's וַ (and not וַהֲ, וַעֲ: וַהֲמִיתִיךָ, וַעֲשִׂיתֶם are verbs)
# And וָ before any letter but alef: the waw of a pair's second member, which
# takes the qamats before the stressed syllable (תֹהוּ וָבֹהוּ, לְעוֹלָם וָעֶד,
# כֶּסֶף וָזָהָב; the WLC divides before one 41.5% of the time against 85.3% before
# a וְ-word). Before an alef it is the wayyiqtol's own וָא (וָאֹמַר, וָאֵרֶא).
PLAIN_WAW = re.compile(u'^ו[ְּ]|^וַא[ֱֲֳ]|^וָ[^א]')
NAME_GLOSS = re.compile(r"^[A-Z][a-z']+$")  # a gloss that is one capitalised word: a name
TENS = {u'עשר', u'עשרה'}                        # the second word of a compound numeral (שְׁנֵים עָשָׂר)
# a title that stands before a name is one breath with it: "my father, Lehi"
# (the reader's own rule, tools/build_volume_breaks.py)
# a kin word, bare or with its suffix (אָבִי, אַחֶיךָ, אֲבוֹתָיו, אִשְׁתּוֹ): the
# title before a name, and a member of a compound subject
# (both mem and nun forms: bare אֵם ends in ם, אִמִּי has the medial מ)
KIN = re.compile(u'^(אב|אח|א[מם]|ב[נן]|בת|אשת|אחות)(ות|י)?(י|ך|ו|ה|נו|כם|כן|הם|הן|יו|יך|יה|ינו|יכם|יהם)?$')
# the pronoun-apposition rule (בִּי נֶפִי) stops short of a divine title, which is
# the sentence's subject after its object (וַיֹּאמֶר אֵלַי יְהוָה, יַעֲזֹר לִי אֲדֹנָי,
# לְךָ אֵל אַחֵר), and of a vocative after a verb of speaking (וַיֹּאמֶר אֵלַי נֶפִי
# מַה תִּרְאֶה, 11:14)
DIVINE = set('God Lord LORD Jehovah Christ Messiah Jesus Father Spirit Son Holy Almighty Eternal Most High'
             ' Redeemer Savior Saviour Creator Lamb King Mighty Shepherd'.split())
SPEECH = re.compile(r'\b(said|saith|say|spake|speak|speaking|saying|cried|crying|answered|called|commanded)\b', re.I)

def title_word(h):
    """the word a name follows as its title: a kin word or אֲנִי (אָבִי לֶחִי,
       אֲנִי נֶפִי); of a group its last word (אֶת־אִמִּי שְׂרָיָה, 5:6, where the
       comma after "mother," used to land as a tifcha between them)"""
    h = nfc(h)
    if PLAIN_WAW.match(h): h = h[2:]            # וַאֲנִי נֶפִי, וְאִמִּי שְׂרָיָה (2:16, 5:1)
    b = bare(h).split(u'־')[-1]
    return b in (u'אני', u'אנכי') or bool(KIN.match(b))
# the pronouns that make a compound subject (אֲנִי וְאַחַי, אַתָּה וְאַחֶיךָ): the first
# and second persons only. Bare הוּא ends a clause or opens the next one far
# more often than it joins a pair (WLC: a disjunctive follows it 81% of the
# time before an and-word; וְהוּא after a name opens a clause: לָמָ֔ן וְה֥וּא הֹלֵ֖ךְ)
PRON = set(u'אני אנכי אתה את אנחנו אתם אתן'.split())
PRON3 = set(u'הוא היא הם המה'.split())
COPULA = re.compile(r'^(he|she|it|they)[- ](is|are|was|were)$|^(is|are|was|were)$', re.I)

def nominal(h, g):
    """a name, a kin word (my father, thy brethren) or a pronoun, its waw
       stripped: one member of a pair that is a single constituent"""
    h = nfc(h)
    if PLAIN_WAW.match(h): h, g = h[2:], re.sub(r'^and[- ]', '', g.strip(), flags=re.I)
    b = bare(h)
    return b in PRON or bool(KIN.match(b)) or bool(NAME_GLOSS.match(g.strip()))

def pair_link(toks, i):
    """The link inside a pair of names: "Laman and Lemuel", "I and my
       brethren", "thou and thy brethren" are one constituent and are not
       divided before their "and" unless a near divider is forced on them
       (WLC: after a pair a disjunctive follows 87% of the time; inside a list
       of three the cut before the last member, לְאַבְרָהָ֛ם לְיִצְחָ֥ק וּֽלְיַעֲקֹ֖ב, is
       the commoner at 70% against 45%, so every link of a list is held alike
       and the model's own preference settles which)."""
    if i + 1 >= len(toks): return False
    (h, g), (h2, g2) = toks[i], toks[i + 1]
    if u'־' in h2 or not PLAIN_WAW.match(nfc(h2)) or not nominal(h2, g2): return False
    # "I, Nephi, | and I bear record" (14:27): a pronoun after the "and" opens a
    # clause of its own; the pair's second member is a name or a kin word
    if bare(nfc(h2)[2:]) in PRON: return False
    if nominal(h, g): return True
    # a third-person pronoun opens a pair only before a name or a kin word
    # (ה֖וּא וַאֲבוֹתָ֥יו, 5:16); before anything else bare הוּא ends its clause
    return bare(h) in PRON3 and bare(nfc(h2)[2:]) not in PRON

# the most a pair's link may score: a weak link, whatever the model says of it
# (its log-odds for אַתָּה וְאַחֶיךָ are +8.4, the Tanakh's clause-final "thou"; a
# fixed penalty either left that standing or sank אֲנִי וְאַחַי past the point of
# giving up)
NOMINAL = -5.0

SPEECH_COLON = r'\b(saying|said|say|saith|spake|speak|answered|cried)\b'
# the words that carry no content: a token glossed with these alone is not
# placed by them (and "or" is not: it moved the stop of "on the one hand or on
# the other—" past the או, 14:7)
STOP_WORDS = set("""and or nor but for yea even also so then thus that which who whom the a an of to in on at by
                    with from unto into he she it they them him his her their its is are was were be been""".split())
_words = lambda s: re.findall(r"[a-z']+", (s or '').lower())
_stem = lambda w: w[:5]          # "chastened" is "chasten", "spindles" "spindle"

def transposed(toks, i, ent):
    """The comma after "a bow," closes "did make out of wood a bow", and the
       Hebrew says קֶשֶׁת מֵעֵץ, "of wood" after "a bow": the mark the aligner set
       after קֶשֶׁת belongs after מֵעֵץ (16:23), as "exceedingly;" belongs after
       הוֹכִיחָם in הוֹכֵחַ הוֹכִיחָם (16:39). The English segment that ends with this
       token's gloss is found, and the mark moves past each following token
       whose gloss stands just before that gloss inside the segment. Not past
       a waw-word: "the words of my father, | and the words" has "words" in
       the segment and is a new phrase all the same."""
    gi = [_stem(w) for w in _words(toks[i][1])]
    if not gi or not ent: return i
    for seg in re.split(r'[,;:.?!\u2014]+', ent):
        ws = [_stem(w) for w in _words(seg)]
        if len(ws) > len(gi) and ws[-len(gi):] == gi: break
    else: return i
    content = lambda ws: [_stem(w) for w in ws if w not in STOP_WORDS and len(w) >= 3]
    body = content(_words(seg)[:-len(gi)])
    j = i
    while j + 1 < len(toks) - 1 and not nfc(toks[j + 1][0]).startswith(u'ו'):
        gn = content(_words(toks[j + 1][1]))
        if not gn or len(gn) > len(body) or body[-len(gn):] != gn: break
        body = body[:-len(gn)]; j += 1
    return j

def mend_marks(toks, marks, ent):
    """Misplacements of the English's own marks that the alignment makes
       (tools/build_bom_breaks.py), mended before the marks become a tree:
       (1) "blessed art thou, Nephi, because": the comma before the vocative
       name lands after the pronoun; it belongs after the name (11:6, 2:19).
       (2) "I answered him, saying: Yea, it is": the colon that opens a speech
       is lost when the Hebrew's speech verb glosses differently; the first
       English word after the colon finds its token and the stop goes before
       it (11:22); where the speech's own words gloss differently too ("Thou
       speakest" is קָשׁוֹת דִּבַּרְתָּ, 16:3), the stop goes after the verb of
       speaking and whatever the English puts between it and the colon ("said
       unto my father:"). (3) the colon is a comma to the breath table and a
       stop to the Masoretes. (4) the mark of a transposed phrase (transposed)."""
    out = []
    colon = bool(ent and re.search(SPEECH_COLON + r'[^:.;]{0,25}:', ent))
    for i, c in marks:
        if 0 <= i < len(toks) - 2 and bare(toks[i][0]) in PRON2 and NAME_GLOSS.match(toks[i + 1][1].strip()):
            i += 1
        # (5) "saying: These last records": the colon lands after the quote's first
        # token when that token's gloss ("shall establish") comes later in the
        # English; it belongs after לֵאמֹר (13:40 had a zaqef gadol on יְקַיְּמ֕וּ)
        if c == 2 and i >= 1 and bare(toks[i - 1][0]) == u'לאמר' and ':' not in toks[i][1]:
            # ...unless the token is the quote's own first word ("saying: Look!"
            # keeps its stop after רְאֵה, 11:30)
            g0 = _words(toks[i][1])[:1]
            if not (g0 and ent and re.search(r'\bsaying:\s*' + re.escape(g0[0][:4]), ent, re.I)): i -= 1
        if 0 <= i < len(toks) - 1: i = transposed(toks, i, ent)
        # (3) the colon that opens a speech is a comma to the breath table
        # (weight 1); to the Masoretes לֵאמֹר before the speech is a stop (13:40)
        if c == 1 and colon and 0 <= i < len(toks) and SPEECH.search(toks[i][1]): c = 2
        out.append((i, c))
    if ent:
        glosses = [[_stem(w) for w in _words(g)] for h, g in toks]
        for m in re.finditer(SPEECH_COLON + r'([^:]{0,20}):\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)', ent):
            # the speech's first two words where it has them ("I will go" is
            # אֵלְכָה, not the "I" of אֲנִי נֶפִי two words before it, 3:7): the
            # glosses from some token on begin with them
            first = [_stem(w) for w in _words(m.group(3))]
            # what the Hebrew may put between the verb of speaking and the
            # quote: the English's own words round the verb ("unto me again",
            # and the subject, which the Hebrew says after the verb: וַיֹּאמֶר
            # הָרוּחַ אֵלַי שֵׁנִית, 4:11)
            around = set(_stem(w) for w in _words(ent[max(0, m.start() - 30):m.end(2)]))
            for j in range(1, len(toks)):
                seq = sum(glosses[j:j + 2], [])
                if seq[:len(first)] != first or any(k == j - 1 for k, _ in out): continue
                t, ok = j - 1, False
                while t >= 0 and j - 1 - t <= 4:
                    if SPEECH.search(toks[t][1]): ok = True; break
                    g = [w for w in glosses[t] if w not in STOP_WORDS]
                    if not g or not all(w in around for w in g): break
                    t -= 1
                if ok:
                    out.append((j - 1, 2)); break
    return sorted(set(out))

PRON2 = set(u'אתה את אתם אתן'.split())

def verb_subject(toks, i):
    """A bare wayyiqtol holds the subject that follows it: וַיֹּאמֶר יְהוָה,
       וַיְדַבֵּר אָבִי, וַיֵּצֵא הַמֶּלֶךְ. The WLC divides between a third-person
       wayyiqtol and a following name 14.5% of the time (3,021 pairs), an
       article noun 22.9%, a verb of saying and its subject 11.6%; the
       division falls after the subject (וַיֹּ֥אמֶר יְהוָ֖ה אֵלַ֣י לֵאמֹ֑ר)."""
    if i + 1 >= len(toks): return False
    (h, g), (h2, g2) = toks[i], toks[i + 1]
    h, h2 = nfc(h), nfc(h2)
    if u'־' in h or u'־' in h2: return False
    m1 = morph_of(h)
    # the wayyiqtol by the Tanakh's analysis (Hc/Vqw3ms), or by its shape when
    # the Tanakh lacks the form (וַיְצַו, וַיַּבְטַח); a verb of saying by its gloss
    wayy = bool(re.match(r'^H[cC]/V.w', m1)) or (not m1 and bool(re.match(u'^וַ[יתא]', h))) \
        or (bool(re.search(r'(^H|/)V.[pqiw]', m1)) and bool(SPEECH.search(g)))
    if not wayy: return False
    m2 = re.sub(r'^HTd/', 'H', morph_of(h2, last=False))
    return bool(NAME_GLOSS.match(g2.strip())) or g2.strip() in DIVINE or m2.startswith('HNp') \
        or bool(re.match(r'^HNc..[ac]/Sp', m2)) or bool(KIN.match(bare(h2))) \
        or (h2.startswith(u'הַ') and m2.startswith('HNc'))

def folded_mark(toks, i):
    """A mark after a token whose gloss folds a connective and its comma into
       the verb ("yea, he feared" is וַיִּירָא, 8:36; "yea, and I beheld" is
       וָאֵרֶא): the English comma the aligner carried is that inner one, no
       pause after the word, and the mark is dropped (55 such glosses in the
       volume, most of them אַף "yea, even", which drops its mark anyway)."""
    g = toks[i][1]
    return bool(re.search(r'[,;:]\s*[A-Za-z]', g)) and not g.rstrip().endswith((',', ';', ':'))

def copula_after(toks, i):
    """A printed mark that falls right before a bare הוּא, הִיא or הֵם glossed as
       a copula ("he is", "they are") is the English comma carried one word too
       early: "he is a mighty man," is אִישׁ גִּבּוֹר הוּא, and the aligner, finding
       its "he is" before the comma in the English, set the break in front of
       the pronoun (20 such marks in the volume, Mosiah 20:13 מֶלֶךְ הַלָּמָנִים ׀ הוּא
       נִפְצַע). The mark is dropped and the model decides the link."""
    if i + 1 >= len(toks): return False
    h2, g2 = toks[i + 1]
    return u'־' not in h2 and bare(h2) in PRON3 and bool(COPULA.match(g2.strip()))
PREFIXES = u'והלבכמש'
# particles the Masoretes join forward with a maqqef when they stand bare
# prepositions the Tanakh tags as construct nouns (אֵצֶל HNcbsc, תַּחַת, מוּל) or
# adjectives (אַחֲרֵי, נֶגֶד): they reach forward as surely as אֶל does, and the
# gloss rule misses them when the English is "by" (8:20 אֵ֨צֶל֙ מַעֲקֵ֣ה הַבַּרְזֶ֔ל)
EXTRA_NEVER = set(u'אֵצֶל תַּחַת מוּל נֶגֶד לִפְנֵי אַחֲרֵי בְּתוֹךְ מִתּוֹךְ סְבִיב'.split())
PROCLITIC = set(NEVER_AFTER) | EXTRA_NEVER | set(u'עַל מִן עַד אֵת אֶת בֵּין אַל פֶּן עִם'.split())
DEMONSTRATIVE = set(u'ההוא ההיא הזה הזאת האלה ההם ההן ההמה'.split())
CLAUSE_OPENERS = set(u'כי כאשר וכאשר למען ולמען לבלתי וגם בעבור ובעבור עד והנה ויהי לכן ולכן על־כן ועל־כן'.split())

def stem3(h):
    """the first three root letters, past the one-letter prefixes and a maqqef"""
    s = bare(h).split(u'־')[-1]
    while len(s) > 3 and s[0] in PREFIXES: s = s[1:]
    return s[:3]

def shares_root(h, h2):
    """The infinitive absolute before its own verb (עָזֹב לֹא־עֲזָבַנִי, גַּלֵּה גִלּוּ,
       שָׁמוֹר תִּשְׁמְרוּ, אָרֹר אָאֹר): the second word repeats the first's root,
       with or without an imperfect prefix (א י ת נ) in front of it."""
    def match(h, h2):
        a = stem3(h)
        if len(a) < 3: return False
        b = bare(h2).split(u'־')[-1]        # the verb is the last word of its group (לֹא־עֲזָבַנִי)
        # the verb as written, then with each one-letter prefix off in turn: the
        # hiphil keeps its ה (הוֹכֵחַ הוֹכִיחָם, 16:39: stripped to the bone first,
        # הוכיחם lost its ה, its ו and its כ and nothing was left to match)
        while True:
            if b.startswith(a): return True
            # behind an imperfect prefix the whole root: two letters matched לָבָן
            # to וָאֶלְבַּשׁ (1 Nephi 4:19); a geminate root keeps one of its pair (אָרֹר אָאֹר)
            if len(b) >= 3 and b[0] in u'איתנ' and (b[1:4] == a or (a[1] == a[2] and b[1:3] == a[:2])): return True
            if len(b) > 3 and b[0] in PREFIXES: b = b[1:]
            else: return False
    # the pair is a verb and its verb: a noun of the same root is not it
    # (דַבְּרִי אֶת־הַדְּבָרִים, לְדַבֵּר אֶת־הַדְּבָרִים bound as if infinitive absolutes,
    # 1 Nephi 4:4, 10:22), by the Tanakh's analysis where it has the form
    is_verb = lambda m: bool(re.search(r'(^H|/)V', m))        # a V segment anywhere: HVqp3ms/Sp1bs
    m1, m2 = morph_of(h), morph_of(h2)
    if (m1 and not is_verb(m1)) or (m2 and not is_verb(m2)): return False
    # as written, then with the matres out (אָרוֹר תֵּאָרֵר, Jacob 2:29; but הָיֹה
    # יִהְיֶה keeps its yod and matches as written)
    strip = lambda s: re.sub(u'[וי]', '', s)
    return match(h, h2) or match(strip(h), strip(h2))

# ---- the Tanakh's own analysis of a form (attested_forms.js: OSHB + TAHOT,
# [Strong's, morph, segments, n, alts]; keys by RootEngine.pointedKey)
_ATTESTED = None

def pointed_key(s):
    """root_engine.js pointedKey, ported: accents, meteg, maqqef and sof pasuq
       out, qamats qatan to qamats, the marks of each letter sorted"""
    s = re.sub(u'[֑-ֽֿ֯׀׃-׆/]', '', s or '').replace(u'ׇ', u'ָ')
    s = re.sub(u'[^ְ-ּׁׂא-ת]', '', s)
    out, i = [], 0
    while i < len(s):
        ch = s[i]; i += 1
        marks = []
        while i < len(s) and ord(s[i]) < 0x5d0:
            marks.append(s[i]); i += 1
        out.append(ch + u''.join(sorted(marks)))
    return u''.join(out)

def attested(h):
    """the table's entry for a pointed form, or None"""
    global _ATTESTED
    if _ATTESTED is None:
        s = io.open(os.path.join(ROOT, 'attested_forms.js'), encoding='utf-8').read()
        _ATTESTED = json.loads(s[s.index('{'):s.rindex('}') + 1])
    return _ATTESTED.get(pointed_key(nfc(h)))

def morph_of(h, last=True):
    """the morph code of a word; of a maqqef group, its last word (the one
       that reaches forward: אֶת־עֶבֶד) or its first"""
    parts = nfc(h).split(u'־')
    w = parts[-1] if last else parts[0]
    e = attested(w)
    if e: return e[1]
    # a form the Tanakh lacks only for its prefix (הֶעָנָף, וְהָאָרֶץ): peel the
    # article or a one-letter prefix and read the rest, as the table's own
    # segments do (HTd/Ncmsa)
    m = re.match(u'^(ו[ְַּ]|ה[ֶַָ]|[בלכמש][ְִֵַָּ])', w)
    if m:
        rest = w[m.end():]
        e = attested(rest) or attested(rest.replace(u'ּ', u'', 1))
        if e: return ('HTd/' if m.group(1)[0] == u'ה' else 'HX/') + e[1][1:]
    return ''

def real_prefix(h):
    """The מֵ or לְ this word opens with is a preposition (מֵאֱלֹהִים, לְמַלְכוּת),
       not the first letter of a name (לָבָן, לְמוּאֵל, מִצְרַיִם): the Tanakh's
       analysis of the form shows the segment, and a form the Tanakh lacks is
       a prefix only if what follows the prefix is a form the Tanakh has."""
    h = nfc(h).split(u'־')[0]          # of a group, the word that opens it (מִן־הַפְּרִי)
    e = attested(h)
    # the morph opens with the language letter: HR/Ncfsc (לְמַלְכוּת), HR/R (מֵאֵת), HR (מִן), HC/R/...
    if e: return bool(re.search(r'(^H|/)R[a-z]?(/|$)', e[1]))
    # a form the Tanakh lacks: מִ or לַ before a doubled letter is the assimilated
    # מִן or the article (מִגִּבּוֹרֵיהֶם, לַמֶּלֶךְ); otherwise what follows must be a form it has
    # (NFC puts the letter's vowel before its dagesh: גִּ is ג, hiriq, dagesh)
    if re.match(u'^[מל][ִַ][א-ת][ְ-ֻ]?ּ', h): return True
    rest = h[2:]
    return attested(rest) is not None or attested(rest.replace(u'ּ', u'', 1)) is not None

def construct(h, h2):
    """an attested construct form (HNcmsc, HAamsc: עֶבֶד, אוֹצַר, גְּדָל) before
       the bare noun, name or adjective it governs: the WLC puts a disjunctive
       after one 21% of the time against 61% for any word. The table's morph is
       the form's commonest reading, so a form that is also an absolute (סֵפֶר,
       עֳנִי) counts only when what follows could be its nomen rectum: before a
       verb or a prefixed word (רַב־עֳנִי רָאוּ, סֵפֶר בִּלְשׁוֹן) it is left to the model."""
    m1 = morph_of(h)
    if not (m1.endswith('c') and m1[:3] in ('HNc', 'HAa')): return False
    m2 = re.sub(r'^HTd/', 'H', morph_of(h2, last=False))     # the article is no bar (עֶבֶד הַמֶּלֶךְ)
    # ...or a participle (מַעֲשֵׂה חֹשֵׁב "the work of a craftsman", 16:10; the WLC
    # divides after a construct before one 26% of the time)
    return (m2[:3] in ('HNc', 'HNp', 'HAa', 'HAc') or bool(re.match(r'HV.[rs]', m2))) and '/' not in m2

def attributive(h, h2):
    """a noun and the bare adjective after it (כֹּחַ רַב, זָהָב טָהוֹר), both
       absolute: divided between 21% of the time in the WLC"""
    if u'־' in h2: return False
    article = lambda m: re.sub(r'^HTd/', 'H', m)        # הֶעָנָף הַצַּדִּיק as much as עָנָף צַדִּיק
    m1, m2 = article(morph_of(h)), article(morph_of(h2, last=False))
    return m1.startswith('HNc') and m1.endswith('a') and m2.startswith('HAa') and m2.endswith('a')

def adj_pair(toks, i):
    """a noun's two adjectives, "the great and spacious building" (הַבִּנְיָן
       הַגָּדוֹל וְהָרָחָב): the link between them holds like the one before them
       (the Tanakh's clause-final הַגָּדוֹל scored it +11.7 in 11:36 and the
       segolta fell inside the phrase)"""
    if i < 1 or i + 1 >= len(toks) or u'־' in toks[i + 1][0]: return False
    article = lambda m: re.sub(r'^HTd/', 'H', m)
    h1, h2 = nfc(toks[i][0]), nfc(toks[i + 1][0])
    m0, m1, m2 = article(morph_of(toks[i - 1][0])), article(morph_of(h1)), morph_of(h2, last=False)
    # an adjective or a participle (הַבְּרוּרִים וְהַיְקָרִים "plain and precious",
    # הַגְּדוֹלָה וְהַנִּתְעָבָה "great and abominable"); a form the Tanakh lacks
    # passes on its shape when both carry the article, the attributive's mark
    adj = lambda m: bool(re.match(r'H(Aa|V.[rs])', m))        # HAamsa; HVqrmsa, HVNrfsa: the stem, then r/s
    if not m0.startswith('HNc') or not (adj(m1) or (not m1 and h1.startswith(u'ה'))): return False
    if m2: return bool(re.match(r'HC/(Td/)?(Aa|V.[rs])', m2))
    return h1.startswith(u'ה') and h2.startswith(u'וְה')


def make_weakest(toks, prior, w, ent=None):
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
    HARD, PAIR, FAR, GIVE_UP, STRONG, BOUND = -20.0, -6.0, -3.0, -10.0, 6.5, 8.0
    def score(i):
        # a bare particle that reaches forward (אֶל יַם־סוּף, עַל אַחֶיךָ) is
        # scored as the Masoretes wrote it, joined to its noun by a maqqef:
        # the link before it is the link before the whole phrase
        if i + 2 < len(toks) and nfc(toks[i + 1][0]) in PROCLITIC and u'־' not in toks[i + 1][0]:
            h2, g2 = toks[i + 1]; h3, g3 = toks[i + 2]
            pair = [toks[i], (nfc(h2) + u'־' + nfc(h3), g2 + ' ' + g3)]
            return prior + sum(w.get(k, 0.0) for k in pair_feats(pair, 0))
        return prior + sum(w.get(k, 0.0) for k in pair_feats(toks, i))
    def hard(i):
        h, g = toks[i]
        if nfc(h) in EXTRA_NEVER: return True
        if nfc(h) in NEVER_AFTER:
            # a bare כֹּל reaches forward to its noun (כֹּל הָאָרֶץ), not when the
            # next word opens with a waw: there it is absolute and ends its
            # phrase (מֵעַל כֹּל ׀ וּבָרוּךְ אַתָּה, 11:6 "above all. And blessed")
            if not (bare(h) in (u'כל',) and i + 1 < len(toks) and nfc(toks[i + 1][0]).startswith(u'ו')): return True
        # a gloss that ends in "of", "the", "that", "which"... reaches forward,
        # except the demonstrative after its noun (\u05d4\u05b7\u05e9\u05b8\u05bc\u05c1\u05e0\u05b8\u05d4 \u05d4\u05b7\u05d4\u05b4\u05d9\u05d0 "that year",
        # \u05d4\u05b7\u05d3\u05b0\u05bc\u05d1\u05b8\u05e8\u05b4\u05d9\u05dd \u05d4\u05b8\u05d0\u05b5\u05dc\u05b6\u05bc\u05d4 "these things"), which closes the phrase
        if BINDS.search(g.rstrip(u' ,;:.\u2014').strip()) and bare(h) not in DEMONSTRATIVE: return True
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
            # ...and unless this word is an adjective in the absolute (כַּדּוּר עָגֹל
            # מַעֲשֵׂה חֹשֵׁב "a round ball of curious workmanship", 16:10): the WLC
            # divides after one before a construct noun 100% of the time (80)
            if re.match(r'of\b', g2.strip().lower()) and not (PREP_PREFIX.match(nfc(h2)) and real_prefix(h2)) \
               and not re.match(r'^H(Td/)?Aa.*a$', morph_of(h)): return True
            # the infinitive absolute before its verb (עָזֹב לֹא־עֲזָבַנִי, מוֹת תָּמוּת)
            if shares_root(h, h2): return True
            # a compound numeral (שְׁנֵים עָשָׂר) and a title before a name (אָבִי לֶחִי)
            if bare(h2) in TENS: return True
            # a title before its name (אָבִי לֶחִי), and a pronoun before its name in
            # apposition (בִּי נֶפִי "me, Nephi", לוֹ לֶחִי "him, Lehi", 7:1, 7:6: the
            # Tanakh tags the pronoun HR/Sp1bs, HRd/Sp3ms, HTo/Sp3ms)
            if NAME_GLOSS.match(g2.strip()) and title_word(h): return True
            # ...and only where the printed English itself sets the name off with
            # a comma ("against me, Nephi,"): without one the name is the subject
            # after its object (וַיְסַפֵּר לוֹ לָמוֹנִי "Lamoni rehearsed unto him")
            if NAME_GLOSS.match(g2.strip()) and re.match(r'^H(R|Rd|To)/Sp', morph_of(h)) \
               and g2.strip() not in DIVINE and not (i > 0 and SPEECH.search(toks[i - 1][1])) \
               and ent and re.search(r',\s*' + re.escape(g2.strip()) + r'\b', ent): return True
            # a bare demonstrative stays with its noun (לוּחוֹת הַנְּחֹשֶׁת הָאֵלֶּה, 5:18:
            # the WLC divides before one 12% of the time against 61% for any word)
            if u'־' not in h2 and bare(h2) in DEMONSTRATIVE: return True
        return False
    def weight(i, hi, glabel, near):
        s = score(i)
        if hard(i): s += HARD
        if i + 1 < len(toks):
            h, h2 = toks[i][0], toks[i + 1][0]
            # A PAIR STAYS A PAIR: "great and marvelous", "saw and heard" are not
            # divided before their "and" when that leaves the second to end the
            # phrase alone; the division falls earlier and the pair keeps one
            # accent between them (אֲשֶׁר־רָאָ֣ה וְשָׁמַ֔ע). Only there: inside a
            # phrase the "and" may open a new clause ("by the sword | and many")
            # or a parallel phrase ("a goodly father | and a goodly mother"), and
            # penalising those tore "and a mother | goodly" instead.
            # (a penalty, not a cap: capped, it moved the pashta off מוּסַ֤ר אָבִי֙
            # וּבְדַעְתּ֔וֹ in 1 Nephi 1:1, and the Masoretes split a closing pair
            # with pashta + zaqef or tifcha + etnachta routinely: תֹ֙הוּ֙ וָבֹ֔הוּ,
            # אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ)
            if (hi is None or i + 1 == hi) and PLAIN_WAW.match(nfc(h2)) and not PLAIN_WAW.match(nfc(h)):
                s += PAIR
            # A PAIR OF NAMES IS ONE CONSTITUENT wherever it stands (pair_link:
            # the model alone put a tifcha after אֲנִי in וַנִּסַּע אֲנִי וְאַחַי, the
            # Tanakh's clause-final הוּא speaking for every pronoun). Names
            # only: "a goodly father | and a goodly mother" is the parallel
            # the pair rule above must leave alone.
            if pair_link(toks, i): s = min(s, NOMINAL)
            # A WORD AND ITSELF: הֵנָּה וָהֵנָּה "hither and thither" (4:2; 2 Kings 2:8
            # וַיֵּחָצ֖וּ הֵ֥נָּה וָהֵֽנָּה), דּוֹר וָדוֹר, יוֹם וָיוֹם: one phrase
            if PLAIN_WAW.match(nfc(h2)) and bare(nfc(h2)[2:]) == bare(nfc(h)): s = min(s, NOMINAL)
            # A CONSTRUCT FORM REACHES FORWARD whatever its gloss says (גְּדָל
            # קוֹמָה "large in stature"), and a noun holds its adjective (כֹּחַ
            # רַב): the Tanakh's own analysis of the form, as a weak link
            if construct(h, h2) or attributive(h, h2) or adj_pair(toks, i): s = min(s, NOMINAL)
            # A WAYYIQTOL HOLDS ITS SUBJECT (verb_subject: the model alone put a
            # zaqef gadol on וַיֹּ֕אמֶר before יְהוָה in 2:19, its "and said" being
            # clause-final so often in the glosses)
            if verb_subject(toks, i): s = min(s, NOMINAL)
        if near is not None and i < near: s += FAR * (near - i)
        return s
    printed = set()        # the links the printed English marks, filled per verse by the caller
    def weakest(units, lo, hi, glabel=None, near=None):
        # a link the printed English marks is where a forced division of a
        # higher rank goes, before any link the model alone prefers (the
        # model's own strong links get no such bonus: that would count its
        # opinion twice)
        def total(i):
            return weight(i, hi, glabel, near) + (BOUND if i in printed else 0.0)
        cands = [i for i in range(lo, hi) if i + 1 < len(toks) and not getattr(units[i], 'locked', False)]
        if not cands: return None
        best = max(cands, key=total)
        # (dividing a merely unlikely link rather than joining was tried for
        # 1 Nephi 4:4 and gave אֶת־אֲשֶׁ֥ר צִוָּ֛ה יְהוָ֖ה and כִּ֥י אֵין֙ יְהוָ֔ה: a verb
        # cut from its subject; the join, אֲשֶׁר־צִוָּ֥ה, is the Masoretes' own)
        return best if total(best) > GIVE_UP else None
    def joiner(units, lo, hi):
        """the word in [lo, hi) to write as if a maqqef joined it to the next: a
           particle first (כִּי, לֹא, אֶל: the ones the Masoretes join), nearest the
           governor; then any word that reaches forward"""
        for i in range(hi - 1, lo - 1, -1):
            if i + 1 < len(toks) and nfc(toks[i][0]) in NEVER_AFTER: return i
        for i in range(hi - 1, lo - 1, -1):
            if i + 1 < len(toks) and hard(i): return i
        return None
    def appos(i):
        """The mark after the name of "I, Nephi," or "my father, Lehi," is the
           English's closing comma of an apposition, not the end of a clause:
           it may divide the clause (Daniel's אֲנִ֣י דָנִיֵּ֔אל takes zaqef, revia,
           tifcha, mahpakh) but never halves the verse (15:1 had its etnachta on
           נֶפִי between "carried away" and "in the Spirit")."""
        g = toks[i][1].strip()
        # ("the Son of the Eternal Father!" is בֶּן־אֲבִי עוֹלָם: "Eternal" is capitalised
        # as a name and is no name, 11:21)
        if i < 1 or not NAME_GLOSS.match(g) or g in DIVINE: return False
        return title_word(toks[i - 1][0]) or bool(re.match(r'^H(R|Rd|To)/Sp', morph_of(toks[i - 1][0])))
    def strong(i):
        """A link the Tanakh divides at all but surely, with no mark from the
           English to say so: וַיְהִי before כַּאֲשֶׁר, עַל־כֵּן before its clause, a verb
           of knowing before כִּי. The model's log-odds at 6.5 and above are a
           disjunctive 92-99% of the time in the WLC; such a link is divided as
           a comma would be, with the house rules still counting against it."""
        if i + 1 >= len(toks): return False
        h, h2 = toks[i][0], toks[i + 1][0]
        # the link before a word that opens a clause (CLAUSE_OPENERS:
        # the Tanakh breaks before a bare כִּי 88.7% of the time, כַּאֲשֶׁר 84.1%,
        # לְמַעַן 83.7%, לְבִלְתִּי 92.2%, וְגַם 94.9%, בַּעֲבוּר 83.3%, עַד 85.5%, וְהִנֵּה
        # 87.3%, וַיְהִי 95.2%, לָכֵן 93.8%, עַל־כֵּן 90.7%: tools/mt_break_before.json),
        # whose log-odds here never reach 6.5: the model's prior for a כִּי-link
        # is a quarter of that. Such a link divides as a comma would and halves
        # a verse that has no printed mark (וָאֵדַ֖ע גַּ֣ם אֲנִ֑י כִּ֧י, 4:16), but it
        # is no printed mark: as one it took the etnachta off the comma of 2:3.
        # Not the phrase heads the same table rates as high (עַל 86%, כֹּל 88%,
        # וְאֵת 89%): before those the division is a verb's from its complement.
        # The bare word, or כִּי at the head of its group (כִּי־אִם, כִּי־הוּא): עַד־הַקֵּץ
        # "unto the end" is a preposition's phrase, not a clause (13:37).
        # (Before the pair guard below: וְגַם and וְהִנֵּה open with the plain waw.)
        b2 = bare(h2)
        if (b2 in CLAUSE_OPENERS or (b2.startswith(u'כי־') and u'־' not in b2[3:])) and not hard(i): return True
        if PLAIN_WAW.match(nfc(h2)) and not PLAIN_WAW.match(nfc(h)): return False
        return weight(i, None, None, None) >= STRONG
    return weakest, joiner, hard, strong, printed, score, appos


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


def punctuation_bounds(n, breaks, entext=None, strong=None, score=None, appos=None, first_cut=None):
    """stops -> rank 2, commas -> rank 3, and the links the Tanakh all but
       always divides -> rank 3 too; the etnachta goes to the stop nearest the
       middle, and a sentence's end outranks a clause's: a verse that holds two
       sentences divides between them (Genesis 1:5 divides at לָיְלָה).
       `score(i)`: the model's log-odds for a division after unit i, which
       settles two stops tied for the middle; `appos(i)`: the mark closes an
       apposition ("I, Nephi,") and is not the etnachta while any other is;
       `first_cut()`: where the grammar itself would first divide the verse,
       the etnachta of a verse with no mark and no sure link."""
    b = [0] * n
    for i, wgt in breaks:
        if 0 <= i < n - 1: b[i] = 2 if wgt >= 2 else 3
    printed = [i for i in range(n - 1) if b[i]]
    if strong:
        for i in range(n - 1):
            if not b[i] and strong(i): b[i] = 3
    p = None
    if n >= ETNACHTA_MIN:
        # the printed marks name the etnachta, the sure links only when there are
        # none (never after the first unit alone: WLC 0.18% of verses; 1 Nephi
        # 13:4 had וָאֵ֑רֶא as a one-word first half off a strong link), and the
        # comma that closes an apposition is neither (12:12 "I, Nephi," had its
        # etnachta on the name when that comma was the verse's only mark)
        ok = lambda i: i >= 1 and not (appos and appos(i))
        marked = [i for i in printed if ok(i)] or [i for i in range(n - 1) if b[i] and ok(i)]
        # ...though against the chooser's bare guess it does stand: the end of
        # the subject is a division the Masoretes make (וְעַתָּה לֹא אֲדַבֵּר אֲנִי
        # נֶפִ֑י אֶת־כׇּל־דִּבְרֵי אָבִי, 8:29, which the guess halved at אֲדַבֵּ֑ר)
        if not marked: marked = [i for i in printed if i >= 1]
        if not marked and first_cut and n >= FIRST_CUT_MIN:
            # no mark and no sure link: the verse is halved all the same, at the
            # chooser's weakest link (WLC: an etnachta in 92% of eight-unit
            # verses and nearly every longer one)
            at = first_cut()
            if at is not None and 1 <= at < n - 1: b[at] = 1; p = at
        if marked:
            top = min(b[i] for i in marked)
            cands = [i for i in marked if b[i] == top]
            mid = (n - 1) / 2.0
            if top == 2:
                kinds = stop_kinds(entext)
                if len(kinds) == len(cands) and any(kinds):
                    cands = [i for i, k in zip(cands, kinds) if k]
                # A STOP FAR FROM THE MIDDLE YIELDS TO A COMMA NEAR IT: the speech
                # colon four words from the end of 16:3 ("and say: Thou speakest
                # hard things against us") took the etnachta off "give heed unto
                # it," at the verse's middle. The etnachta keeps to the middle
                # half of the verse when any mark stands there.
                if min(abs(i + 0.5 - mid) for i in cands) > n / 4.0 and any(abs(i + 0.5 - mid) <= n / 4.0 for i in marked):
                    cands = marked
            # TWO STOPS THE SAME DISTANCE FROM THE MIDDLE: the one the Tanakh
            # rates the stronger boundary (the model's log-odds at the link:
            # 1 Nephi 1:11's semicolon over its comma, 1:13's speech end over
            # the dash, 2:7's second clause of three as in Genesis 1:5). Taking
            # the later of the two outright (the Masoretes' second half is the
            # shorter, 58.8%) moved 310 etnachtas and the model backed only
            # 162 of them; taking the earlier is no better. Position is the
            # last resort only.
            p = min(cands, key=lambda i: (abs(i + 0.5 - mid), -(score(i) if score else 0.0), -i))
            b[p] = 1
    if p is not None:
        thin(b, 0, p); thin(b, p + 1, n - 1)
    else:
        thin(b, 0, n - 1)
    return b


def printed_marks(key, toks, speak, ent, hand):
    """The printed English's marks on the Hebrew words: the reader's own
       extraction (tools/build_bom_breaks.py, the filters of
       tools/build_volume_breaks.py) run live, as the breath table is built,
       with two differences. The breaths the extraction adds inside a long
       clause are left out: they are the breath model's guess at a division,
       and this builder makes that guess itself from the Tanakh's log-odds (an
       added breath took the +8 of a printed mark and tore עֹז ׀ וּמָזוֹן,
       1 Nephi 15:15). And the Masoretes' veto on a pair they never split is
       kept off a full stop: "unto him. And also" lost its sentence's end to the
       Tanakh's one לוֹ וְגַם (16:8). A verse the hand phrased stands as phrased
       (tools/phrase_break_overrides.json)."""
    if key in hand: return [tuple(x) for x in hand[key]]
    br = breaks_for(toks, ent, finish=False)
    stops = [(i, c) for i, c in br if c >= 2]
    br, _ = drop_split_pairs([(i, c) for i, c in br if c < 2], speak)
    br, _ = drop_unnatural(sorted(set(br) | set(stops)), speak)
    return br


# ------------------------------------------------------------ main
def main():
    check = '--check' in sys.argv
    show = set(sys.argv[sys.argv.index('--show') + 1].split(',')) if '--show' in sys.argv else set()
    STRESS = load_js_table(os.path.join(ROOT, 'bom', 'stress.js'), 'SW_STRESS')
    EN = english(ROOT)
    hand_path = os.path.join(HERE, 'phrase_break_overrides.json')
    HAND = json.load(io.open(hand_path, encoding='utf-8')).get('bom', {}) if os.path.exists(hand_path) else {}
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
            # the reader's breaths were marked for the ear; one after a word that
            # reaches forward (an infinitive absolute, a construct) is no division
            weakest, joiner, hard, strong, printed, score, appos = make_weakest(speak, prior, w, ent)
            # ...and one inside a pair of names ("Laman | and Lemuel", 3:28) is the
            # English comma landed a word or two off by the alignment
            marks = [(i, c) for i, c in mend_marks(speak, printed_marks(key, toks, speak, ent, HAND), ent)
                     if not (0 <= i < n - 1 and (hard(i) or copula_after(speak, i) or pair_link(speak, i) or folded_mark(speak, i)))]
            printed.update(i for i, c in marks)
            pb = punctuation_bounds(n, marks, ent, strong, score, appos,
                                    lambda: G.first_cut(words, STRESS.get, weakest, [i for i in range(n) if appos(i)]))
            if par:
                bounds, how = par[1], 'mt'
            else:
                bounds, how = pb, 'english'
            if key in OVER:
                # a hand ruling (tools/teamim_overrides.json): {"index": rank} laid
                # over the computed phrasing; 0 = no division, 1 moves the
                # etnachta, -1 = the link after this word stays closed
                bounds = list(bounds)
                for idx, r in OVER[key].items():
                    idx, r = int(idx), int(r)
                    if r == 1: bounds = [2 if x == 1 else x for x in bounds]
                    if 0 <= idx < n: bounds[idx] = r
                how = 'override'
            stats[how] += 1
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
