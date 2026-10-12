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
from build_bom_breaks import (BOOKS, corpus, english, silent, breaks_for, norm,
                              NEVER_AFTER, BINDS, binds_back, nfc, CONNECTIVES, SENSELESS, connective,
                              align, eng_words, vocative, ALWAYS_AFTER)
from build_volume_breaks import drop_split_pairs, drop_unnatural
from build_ot_teamim import wlc_stream, encode_verse as encode_verbatim

N = lambda s: ud.normalize('NFC', s)
POINTS = re.compile(u'[֑-ֽֿ-ׇ\u034f]')     # (the joiner inside וִירוּשָׁלָ͏ִם is no letter: 2 Nephi 12:1 is Isaiah 2:1 word for word)
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


def same_word(a, b):
    """The same bare word, a plene spelling of a defective one allowed: Nephi's
       מִירוּשָׁלַיִם is Isaiah's מִירוּשָׁלִָם (2 Nephi 12:3), one mater more inside a
       word of four letters or longer (בֵּן is not בֵּין)."""
    if a == b: return True
    if abs(len(a) - len(b)) != 1: return False
    short, long_ = (a, b) if len(a) < len(b) else (b, a)
    if len(short) < 4: return False
    for k in range(1, len(long_)):
        if long_[k] in u'יו' and long_[:k] + long_[k + 1:] == short: return True
    return False

def lcs_map(a, b):
    n, m = len(a), len(b)
    T = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            T[i][j] = T[i + 1][j + 1] + 1 if same_word(a[i], b[j]) else max(T[i + 1][j], T[i][j + 1])
    out, i, j = {}, 0, 0
    while i < n and j < m:
        if same_word(a[i], b[j]): out[i] = j; i += 1; j += 1
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
    # every word its Masoretic word and none left over: the verse IS the
    # Masoretes' (246 of the 442: Nephi's Isaiah where he keeps the text), and
    # its accents are copied as they stand (verbatim) instead of regenerated
    # from the ranks, which the grammar does with a 3% error (2 Nephi 12:2 had
    # a gershayim for Isaiah 2:2's munach legarmeh)
    verbatim = len(m) == len(words) == len(mw)
    bounds, tifchas = [0] * len(words), set()
    for ti, mi in m.items():
        r = us[mi]['rank']
        if r is None: continue
        if r == 0: r = 2 if ti < len(words) - 1 else 0     # the MT's silluq word, not last here: a clause end
        # a tifcha is positional, the near divider of its etnachta or silluq:
        # where the word after it is not the Masoretes' (Isaiah's קָצִ֖ין
        # תִּֽהְיֶה־לָּ֑נוּ is Nephi's קָצִין לָּנוּ) its rank says nothing here
        # (2 Nephi 13:6 had a zaqef gadol on קָצִין before a yetiv on לָּנוּ),
        # unless the printed English marks the link itself (main restores it:
        # "I have refined thee," keeps Isaiah 48:10's division, 1 Nephi 20:10)
        if us[mi]['lab'] == 'tifcha' and m.get(ti + 1) != mi + 1: tifchas.add(ti); continue
        bounds[ti] = r
    # a verse the Masoretes leave without an etnachta (a list: Isaiah 3:18)
    # takes none from the English either, unless Nephi lengthened it
    etnachta_ok = any(u['rank'] == 1 for u in us) or len(words) > len(mw) + 1
    return ref, bounds, len(m) / float(len(words)), verbatim, [us[m[i]]['lab'] for i in range(len(words))] if verbatim else None, set(m), etnachta_ok, tifchas


_WLC = {}
def wlc_verse(ref):
    """the WLC verse behind an OSIS ref ('Isa.2.2') as build_ot_teamim reads it:
       [(consonant, accents, paseq after)], or None"""
    book, ch, v = ref.split('.')
    if book not in _WLC:
        try: _WLC[book] = wlc_stream(book)
        except (IOError, OSError): _WLC[book] = {}
    return _WLC[book].get((int(ch), int(v)))


# ------------------------------------------------------------ the phrasing
def binding():
    t = G.tables()['binding']
    return t['prior'], t['w']


CONSTRUCT_PL = re.compile(u'ֵי$')     # a tsere-yod ending: the plural construct (דִּבְרֵי, בְּנֵי)
# מִ / מֵ ("from"), לְ / לַ / לִ ("to", "of"), בְּ / בָּ ("in"; "great hopes of them" is בָּם,
# 16:5) and כְּ are prepositions, glossed "of" too; before the alef of אֱלֹהִים they
# take a tsere (לֵאלֹהִים "of a God": "the praises of a just God" had the link after
# תְּהִלּוֹת held as a construct's, and the tifcha fell between לֵאלֹהִים and its
# צַדִּיק, Mosiah 2:28)
PREP_PREFIX = re.compile(u'^(מ[ִֵ]|ל[ְִֵַָ]|ב[ְִֵַָ]|כ[ְִֵַָ])')
# וְ or וּ, or וַ before an alef with a hataf (וַאֲבוֹתָיו, וַאֲנִי): the coordinating
# waw, not the wayyiqtol's וַ (and not וַהֲ, וַעֲ: וַהֲמִיתִיךָ, וַעֲשִׂיתֶם are verbs)
# And וָ before any letter but alef: the waw of a pair's second member, which
# takes the qamats before the stressed syllable (תֹהוּ וָבֹהוּ, לְעוֹלָם וָעֶד,
# כֶּסֶף וָזָהָב; the WLC divides before one 41.5% of the time against 85.3% before
# a וְ-word). Before an alef it is the wayyiqtol's own וָא (וָאֹמַר, וָאֵרֶא).
# ...And וַ or וֶ before any guttural with its hataf (וַעֲמוּלֶק, וֶאֱמֶת, וַחֲמִשִּׁים)
# where the word is no verb: the weqatal takes the same vowel (וַעֲשִׂיתֶם), so a
# word the attested table reads, by its reading, and an unread one only as a
# name ("and Amulek"; HATAF_WAW: "Alma | and Amulek" took a zaqef between them
# as no pair, Alma 14:17, and וֶאֱמֶת was never a pair's member)
class _PlainWaw(object):
    BASE = re.compile(u'^ו[ְּ]|^וַא[ֱֲֳ]|^וָ[^א]')
    HATAF = re.compile(u'^וַ[אהחע]\u05b2|^וֶ[אהחע]\u05b1')
    def match(self, h, g=None):
        m = self.BASE.match(h)
        if m or not HATAF_WAW: return m
        m = self.HATAF.match(h)
        if not m: return None
        mo = morph_of(h, last=False)
        if mo: return None if re.search(r'(^H|/)V', mo) else m
        return m if g is not None and NAME_GLOSS.match(re.sub(r'^and[- ]', '', g.strip(), flags=re.I)) else None
PLAIN_WAW = _PlainWaw()
# a gloss that is one capitalised word: a name (not the words a verse capitalises
# for their own sake: "in the mansions of my Father. Amen." joined אָבִי־אָמֵן as a
# title and its name, Enos 1:27)
NAME_GLOSS = re.compile(r"^(?!(Amen|Hosanna|Selah|Behold|Lo|Yea|Nay|Hallelujah|Alleluia|Woe|Wherefore|Therefore|Now)$)[A-Z][a-z']+$")
# a gloss that names a subject or an auxiliary is a verb's, for a form the table cannot read
# ("you remember me", "ye shall be destroyed")
VERB_GLOSS = re.compile(r"\b(i|you|he|she|it|we|they|thou|ye|shall|will|shalt|wilt|was|were|be|is|are|am|art"
                        r"|have|has|hath|had|did|do|does|doth|been|being)\b", re.I)
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
    # (and "the king": הַמֶּ֣לֶךְ דָּוִ֔ד, the WLC dividing the title from its name 30
    # times in 187; "king Benjamin" was split by a pashta, Words of Mormon 1:16)
    # (...and bare מֶלֶךְ, the title as a predicate or the construct "king of": "he was
    # called king Laman" is נִקְרָא מֶלֶךְ לָמָן, and the tifcha fell between them, Mosiah 24:3)
    return b in (u'אני', u'אנכי', u'המלך', u'למלך', u'במלך', u'כמלך') + ((u'מלך',) if BARE_KING else ()) or bool(KIN.match(b))
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
    # (the waw by any of its glosses: "but the Amalekites and the Amulonites were still
    # harder" is וְהָעֲמָלֵקִים וְהָעֲמוּלוֹנִים, and a revia split them, Alma 21:3)
    if PLAIN_WAW.match(h, g): h, g = h[2:], re.sub(r'^(and|but|or|nor|yet)[- ]' if WAW_GLOSSES else r'^and[- ]', '', g.strip(), flags=re.I)
    b = bare(h)
    # (a maqqef group by its noun, and wives and children with the kin: "those who
    # tarried with their wives and their children ‖ caused" is עִם־נְשֵׁיהֶם וְיַלְדֵיהֶם
    # הֶעֱמִידוּ, and the zaqef fell between the two, Mosiah 19:13)
    if FAMILY_PAIR:
        b = b.split(u'\u05be')[-1]
        if re.match(u'^(נשי|ילדי|טפ)', b): return True
        # (...and "his people" after a name, "Alma and his people" אַלְמָא וְעַמּוֹ, which a
        # zaqef split, Mosiah 24:18)
        if re.match(u'^עמ(ו|ם|י|ך|נו|כם|הם)$', b): return True
        # (...and "their seed" after its pronoun: "that they and their seed may be
        # separated" is יִבָּדְלוּ הֵם וְזַרְעָם, and a pashta split them, Alma 3:14)
        if SEED_PAIR and re.match(u'^זרע(ו|ם|י|ך|נו|כם|הם|ה|ן)$', b): return True
        # (...and a kin word with its article: "the son and the daughter" is הַבֵּן
        # וְהַבַּת, and a zaqef fell between them, Mosiah 21:9)
        if b.startswith(u'ה') and KIN.match(b[1:]): return True
    # (and a people by name, "the Nephites": "between the Nephites and Lamanites"
    # took its etnachta between them, Enos 1:24)
    # (...with its preposition: "of the Lamanites and the Amlicites" is מִן־הַלָּמָנִים
    # וְהָעַמְלִיסִים, and a pashta split them, Alma 3:3)
    if PREP_NAME and u'\u05be' in h and re.sub(r'^\S+\s+', '', g.strip()) != g.strip() \
       and re.match(r'^(of|unto|upon|to|with|against|from|by|for|among|in|into|before|over|under|than)\s', g.strip(), re.I):
        g = re.sub(r'^\S+\s+', '', g.strip())
    return b in PRON or bool(KIN.match(b)) or bool(NAME_GLOSS.match(g.strip())) or bool(re.match(r"^the [A-Z][a-z']+$", g.strip()))

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
    # ("and king Limhi" is a member as a name is: "Ammon and king Limhi began" had a
    # pashta between them, Mosiah 22:1)
    king = FAMILY_PAIR and PLAIN_WAW.match(nfc(h2)) and bare(nfc(h2)[2:]) in (u'המלך', u'המלכה') and i + 2 < len(toks) \
        and (bool(re.search(r'(^H|/)Np', morph_of(toks[i + 2][0]))) or bool(NAME_GLOSS.match(toks[i + 2][1].strip())))
    # (...a maqqef group only as the object marker's pair: "Aaron and his brethren" is
    # אֶת־אַהֲרֹן וְאֶת־אֶחָיו, and a revia split them, Alma 22:26)
    et_pair = ET_PAIR and bare(h2).startswith(u'ואת\u05be') and bare(h).startswith(u'את\u05be') \
        and bare(h2).count(u'\u05be') == 1 and bare(h).count(u'\u05be') == 1
    if (u'־' in h2 and not et_pair) or not PLAIN_WAW.match(nfc(h2), g2) or not (king or nominal(h2, g2)): return False
    # (...and a pair's second member closes it: "Ammon and his people, and king
    # Limhi and his people" is two pairs, and the comma between them was dropped as
    # if inside one, Mosiah 21:36)
    # (the first member a name by its gloss or the Tanakh's tag: "of Ammon" is Np)
    if FAMILY_PAIR and i >= 1 and PLAIN_WAW.match(nfc(h), g) and u'־' not in h and nominal(h, g) \
       and u'־' not in toks[i - 1][0] and (nominal(toks[i - 1][0], toks[i - 1][1])
                                           or re.match(r'^H(C/|R/)?Np', morph_of(toks[i - 1][0]))): return False
    # "I, Nephi, | and I bear record" (14:27): a pronoun after the "and" opens a
    # clause of its own; the pair's second member is a name or a kin word
    # (...unless a pronoun stands before the "and": "you and I", אַתֶּם וַאֲנִי, is one
    # subject, אֲנִ֣י וָאָ֑תָּה Genesis 31:44; a revia split it, 2 Nephi 33:11)
    if bare(nfc(h2)[2:]) in PRON and bare(h) not in PRON: return False
    # (their seed pairs with its pronoun only: "until Riplakish was slain, and his
    # descendants were driven out" is נֶהֱרַג רִיפְּלָקִישׁ וְזַרְעוֹ גֹּרְשׁוּ, a new clause,
    # Ether 10:8)
    if SEED_PAIR and re.match(u'^זרע', bare(nfc(h2)[2:])) and bare(h) not in PRON | PRON3: return False
    # (...nor a pronoun that closes its own clause after its predicate: "we are
    # guiltless, and thou, O king, hast not sinned" is נְקִיִּים אֲנַחְנוּ וְאַתָּה, and
    # held as "we and thou" the comma after אֲנַחְנוּ was dropped, Mosiah 12:14)
    if bare(h) in PRON and i >= 1 and re.match(r'^H(Td/)?(Aa|V.r|V.s)', morph_of(toks[i - 1][0])) \
       and not PLAIN_WAW.match(nfc(toks[i - 1][0])): return False
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
# ("chastened" is "chasten", "spindles" "spindle"; and the printed "ye", "thou", "thee"
# are the glosses' "you", as the aligner reads them: "judge ye" ends with the gloss of
# אַתֶּם, and read as "ye" it found "show unto you" two segments on, 2 Nephi 33:11)
_stem = lambda w: norm(w)[:5]

def transposed(toks, i, ent, marks=()):
    """The comma after "a bow," closes "did make out of wood a bow", and the
       Hebrew says קֶשֶׁת מֵעֵץ, "of wood" after "a bow": the mark the aligner set
       after קֶשֶׁת belongs after מֵעֵץ (16:23), as "exceedingly;" belongs after
       הוֹכִיחָם in הוֹכֵחַ הוֹכִיחָם (16:39). The English segment that ends with this
       token's gloss is found, and the mark moves past each following token
       whose gloss stands just before that gloss inside the segment. Not past
       a token that OPENS the next segment: "the words of my father, | and the
       words" has "words" in the segment and is a new phrase all the same, and
       "a land of promise, | a land which is choice" set its segolta on the
       second אֶרֶץ (2 Nephi 1:5). A waw-word may move: "the statutes and the
       judgments of the Lord;" is חֻקֵּי יְהוָה וּמִשְׁפָּטָיו, and the stop belongs
       after וּמִשְׁפָּטָיו (1:16)."""
    gi = [_stem(w) for w in _words(toks[i][1])]
    if not gi or not ent: return i
    segs = re.split(r'[,;:.?!\u2014]+', ent)
    # the segment ends with this token's gloss, or with it and the words the
    # token BEFORE it glosses: "the Holy Messiah;" is הַמָּשִׁיחַ הַקָּדוֹשׁ, the
    # adjective last in Hebrew and first in English (2 Nephi 2:6)
    prev = [_stem(w) for w in _words(toks[i - 1][1])] if i >= 1 else []
    # (...or with the gloss less its article, which the English parts from its
    # noun by the adjectives the Hebrew says after it: "a very high tower," is
    # מִגְדָּל גָּבֹהַּ מְאֹד, Mosiah 11:12)
    # (...and of the segments that end so, the one this mark closes, counted from
    # the verse's start: "seeds of every kind, both of grain of every kind, and
    # also" ends two segments with "of every kind", and the second mark, read as
    # the first segment's, went on to the "seeds" of וְגַם־זֶרַע, 1 Nephi 8:1)
    nth = len([m for m, c in marks if m < i])
    found = None
    for g in ([gi, gi[1:]] if ARTICLE_GLOSS and len(gi) > 1 and gi[0] in ('a', 'an', 'the') else [gi]):
        hits = []
        for k, seg in enumerate(segs):
            ws = [_stem(w) for w in _words(seg)]
            for cut in range(0, 3):
                tail = ws[len(ws) - cut:] if cut else []
                if cut and not all(w in prev or w in STOP_WORDS for w in tail): continue
                core = ws[:len(ws) - cut] if cut else ws
                if len(core) > len(g) and core[-len(g):] == g: break
            else: continue
            hits.append((k, ' '.join(_words(seg)[:len(ws) - cut]) if cut else seg))
            if not (SEG_ORDINAL and marks): break
        if hits:
            k, seg = min(hits, key=lambda h: abs(h[0] - nth)) if SEG_ORDINAL and marks else hits[0]
            gi = g
            found = True
            break
    if not found: return i
    content = lambda ws: [_stem(w) for w in ws if w not in STOP_WORDS and len(w) >= 3]
    body = content(_words(seg)[:-len(gi)])
    # the words the tokens before this one already gloss are theirs, and a noun
    # that only repeats one of them is no transposed word: "he built a tower near
    # the temple; yea, a very high tower" is וַיִּבֶן מִגְדָּל קָרוֹב לַהֵיכָל מִגְדָּל גָּבֹהַּ,
    # and the stop after the temple went on to the second tower, which the first
    # had already said (Mosiah 11:12). (A verb must stand at the body's very end,
    # and keeps the whole body: "I, Nephi, took" is וָאֶקַּח אֲנִי נֶפִי, and the
    # "took" left over carried the stop after "to wife;" on to the next לָקְחוּ,
    # 1 Nephi 16:7)
    # (...within this segment only: the walk stops at the mark before this one,
    # where the last segment ended. "my sons, and my daughters, who are the sons
    # and the daughters of my firstborn," gave the second "daughters" to the
    # first וּבְנֹתַי, and the comma stayed inside בְּנֵי בְכוֹרִי וּבְנֹתָיו, 2 Nephi 4:3)
    free = list(body)
    t, miss = i - 1, 0
    floor = max([m for m, c in marks if m < i] or [-1])
    # (...unless that mark falls inside the floor token's own gloss: "peopled; yea,
    # a land which was covered" glosses the second אֶרֶץ "yea a land", its "land" this
    # segment's, and the stop after "dry bones" went on to the third, Mosiah 21:26)
    if floor >= 0:
        fw = _words(toks[floor][1])
        if len(fw) >= 2 and ent and re.search(r'\b%s[,;:]\s+%s\b' % (re.escape(fw[0]), r'\s+'.join(map(re.escape, fw[1:]))), ent, re.I):
            floor -= 1
    while OWN_WORDS and t > floor and free:
        gt = content(_words(toks[t][1]))
        if gt:
            if all(w in free for w in gt):
                for w in gt: free.remove(w)
                miss = 0
            else:
                miss += 1
                if not OWN_SKIP or miss >= 3: break
        t -= 1
    # (the next segment's first word of sense: "And they did murmur" opens with
    # "murmur", not "they", 1 Nephi 2:12)
    head = [w for w in content(_words(segs[k + 1])) if w not in SENSELESS][:1] if k + 1 < len(segs) else []
    j = at = i
    while at + 1 < len(toks) - 1:
        gn = content(_words(toks[at + 1][1]))
        # a token with no word of sense ("is", הִיא) neither proves nor bars the
        # move: "the Spirit is the same," is אַחַת הִיא הָרוּחַ (2 Nephi 2:4); the
        # mark passes it only when a token of sense is matched beyond it
        if not gn:
            if all(w in SENSELESS for w in _words(toks[at + 1][1])): at += 1; continue
            break
        # a NOUN's words stand anywhere in the segment before this gloss (a
        # subject after its verb keeps the English's order inside itself: "the
        # servants of Laban did not overtake us," is לֹא הִשִּׂיגוּנוּ עַבְדֵי לָבָן,
        # 1 Nephi 3:27); a verb's must stand just before it (the second וָאֵרֶא
        # "and I beheld" found the first "beheld" of 11:24)
        # (not a waw-word: "and upon the plates" opens the next clause, and its
        # "upon" and "plates" were both in "engraven upon them ... plates of
        # ore", 1 Nephi 19:1)
        noun = bool(re.match(r'^H(C/)?(N|Td/|R/N|Rd/N)', morph_of(toks[at + 1][0]))) and not PLAIN_WAW.match(nfc(toks[at + 1][0]))
        # (nor past a verb with its waw: it opens the next clause. "their husbands
        # love their wives, and their wives love" is ... אֶת־נְשֵׁיהֶם וְאֹהֲבוֹת נְשֵׁיהֶם,
        # and the first clause's "love" carried the comma past וְאֹהֲבוֹת, Jacob 3:7)
        if nfc(toks[at + 1][0]).startswith(u'\u05d5') and waw_verb(toks[at + 1]): break
        if noun:
            if not all(w in body and w in free for w in gn): break
        elif len(gn) > len(body) or body[-len(gn):] != gn or (OWN_SKIP and not all(w in free for w in gn)): break
        # (an adjective after its noun is the noun's own phrase whatever the next
        # segment opens with: "a very high tower, even so high" is מִגְדָּל גָּבֹהַּ מְאֹד
        # עַד־אֲשֶׁר, and "high" opened the next segment too, Mosiah 11:12)
        if head and head[0] in gn and not (ARTICLE_GLOSS and attributive(toks[at][0], toks[at + 1][0])): break
        if noun:
            for w in gn: body.remove(w)
        else: body = body[:-len(gn)]
        for w in gn:
            if w in free: free.remove(w)
        at += 1; j = at
    return j

def waw_verb(tok):
    """a verb with its waw (וְאֹהֲבוֹת, וַיֹּאמֶר), by the Tanakh's analysis where it has
       the form, else by the gloss: "and love", not "and their wives" (a word the
       table cannot read, וְאֹהֲבוֹת, glosses as the verb it is)"""
    m = morph_of(tok[0], last=False)
    if re.match(r'^H[Cc]/V', m): return True
    if re.match(r'^H[Cc]/', m) and len(m) > 3: return False
    rest = re.sub(r'^and\s+', '', (tok[1] or '').strip().lower())
    return bool(rest) and rest != (tok[1] or '').strip().lower() and not re.match(
        r"(the|a|an|his|her|their|my|our|your|thy|its|all|every|this|these|that|those|many|much)\b", rest)

def verb_first(toks, i, ent):
    """THE HEBREW SETS ITS VERB BEFORE THE SUBJECT THE ENGLISH PUTS FIRST. "all the
       care which we have taken of my vineyard, the trees thereof have become
       corrupted" is ... אֶת־כַּרְמִי נִשְׁחְתוּ הָעֵצִים: the verb, its "corrupted" placed
       nowhere before the comma, sat at the far end of the window and took the
       comma after it (Jacob 5:46). A comma on a bare finite verb whose words of
       sense the English says only in the segment after the comma, when the
       segment before ends with the word before the verb, belongs before the
       verb. The reverse of transposed()."""
    if not ent or i < 1 or i + 1 >= len(toks): return i
    h, g = toks[i]
    m = morph_of(h, last=False)
    if nfc(h).startswith(u'\u05d5') or (m and not re.match(r'^HV.[pivjr]', m)): return i
    # (the verb's last word of sense: "became corrupt" is "corrupt", which the
    # English says as "become corrupted")
    gi = [_stem(w) for w in _words(g) if w not in STOP_WORDS and w not in SENSELESS and len(w) >= 3][-1:]
    prev = [_stem(w) for w in _words(toks[i - 1][1]) if w not in STOP_WORDS]
    # (a bare auxiliary has no word of sense: הָיוּ "would have been" is the "would
    # still have been racked" of the clause after "Zarahemla, these our dearly
    # beloved brethren," and took the comma after it, Alma 26:9. It goes with
    # what follows when the English says its words only beyond the comma)
    aux = [norm(w) for w in _words(g)]
    aux = aux if aux and all(w in AUX_GLOSS for w in aux) else []
    if (not gi and not aux) or not prev: return i
    # (never onto a negation or a word that reaches forward, and not when what
    # follows is a connective opening the next sentence: "lieth not. Wherefore,"
    # took its stop off וְלֹא יְכַזֵּב onto וְלֹא, Jacob 4:13)
    if bare(toks[i - 1][0]).split(u'\u05be')[-1] in (u'לא', u'ולא', u'אל', u'ואל') or nfc(toks[i - 1][0]) in NEVER_AFTER: return i
    if connective(toks[i + 1][1]) or nfc(toks[i + 1][0]) in CLAUSE_OPENERS: return i
    segs = re.split(r'[,;:.?!\u2014]+', ent)
    said = set(_stem(w) for w in _words(ent))
    for k in range(len(segs) - 1):
        ws = [_stem(w) for w in _words(segs[k]) if w not in STOP_WORDS]
        if ws[-len(prev):] != prev: continue
        nxt = [_stem(w) for w in _words(segs[k + 1])]
        # ...and the subject after the verb is in that segment too: "I have refined
        # thee, I have chosen thee" has its comma after the verb, and "behold," before
        # it was another comma (1 Nephi 20:10; "Eat, drink", 2 Nephi 28:7)
        after = [_stem(w) for w in _words(toks[i + 1][1]) if w not in STOP_WORDS and w not in SENSELESS and len(w) >= 3]
        if aux:
            rest = [norm(w) for w in _words(' '.join(segs[k + 1:]))]
            if after and all(w in nxt for w in after) and not any(norm(w) in aux for w in _words(segs[k])) \
               and all(w in rest for w in aux):
                return i - 1
        # (a word of the next token the English never says proves nothing either
        # way: מִשְׁפַּט "the judgment" is the English's "demands", and "an enemy to
        # God, the demands of divine justice do awaken" kept its comma on יָעִיר,
        # Mosiah 2:38)
        if gi and not any(w in ws for w in gi) and after and all(w in nxt or w not in said for w in after) \
           and any(w in nxt for w in after + gi):
            # a form the table cannot read (נִשְׁחְתוּ) proves itself a verb by the
            # inversion: the English says its subject first
            if all(w in nxt for w in gi) and (m or max([nxt.index(w) for w in after if w in nxt] or [len(nxt)]) < min(nxt.index(w) for w in gi)):
                return i - 1
            # a verb the Tanakh reads, glossed otherwise than the English says it
            # (אֹכְלִים "eating" for "feeding": "full of idolatry and filthiness;
            # feeding upon beasts of prey", Enos 1:20) goes with what follows it
            if m and not any(w in _words(ent.lower()) for w in _words(g) if w not in STOP_WORDS and w not in SENSELESS and len(w) >= 3):
                return i - 1
    return i

# THE PARTICLES THE MASORETES ALWAYS JOIN are joined before the accents are laid: אֶל,
# מִן, אֶת and וְאֶת, וּמִן stand free in the WLC 25 times in 3,401, once in 668, 4 in 6,507,
# never in 1,879 (וְאֶל before a bare word 5 in 275). Joined only when a division needed
# it, "and Aaron, and Omner, and Himni" kept וְאֶ֤ת אַהֲרֹן֙ וְאֶ֣ת עָמְנֵ֔ר with an accent on each
# particle (Alma 31:6), and 74 others the same. So too כׇּל before its noun, its qamats
# qatan the vowel of the unstressed word the maqqef makes (proclitic() decides: "and flocks
# of every kind, that" is וְצֹאן מִכׇּל לְמַעַן, 3 Nephi 4:4): וְאֶת־כׇּ֥ל צֹאנָ֖ם, 3 Nephi 3:22
PREJOIN = True
JOIN_AL = True
# (פֶּן "lest" too: joined 92 times in 100, וּפֶן 4 in 4; פֶּ֧ן תִּשָּׂאֲךָ֛ kept an accent of its
# own, Alma 26:10)
ALWAYS_JOINED = set(N(w) for w in u'אֶל מִן אֶת וְאֶת וּמִן פֶּן וּפֶן'.split())
# ...and before a bare word וְאֶל (270 of 275), עַל (2,734 of 2,946) and עִם (355 of 389); before a
# maqqef group they stand free as often as not (עַל 140 of 232). "and also fathers for their
# sons, and the daughter for the brother" is אָבוֹת עַל בְּנֵיהֶם וּבַת עַל אָחִיהָ, and with עַל
# bare the pashta its zaqef needed fell on וּבַת, Alma 28:5
JOINED_BEFORE_BARE = set(N(w) for w in (u'וְאֶל עַל עִם'.split() if JOIN_AL else u'וְאֶל'.split()))
def prejoin(speak):
    if not PREJOIN: return ()
    out = []
    for i in range(len(speak) - 1):
        h, h2 = nfc(speak[i][0]), speak[i + 1][0]
        # (...and a group that ends in the construct כׇּל: "all their people" is אֶת־כׇּל עַמָּם,
        # and the כׇּ֣ל took an accent of its own, Alma 27:14)
        if u'\u05be' in h:
            last = h.split(u'\u05be')[-1]
            if KOL_PREFIX_CSTR and last and u'\u05c7' in last and bare(last) == u'כל' \
               and proclitic([(last, speak[i][1]), speak[i + 1]], 0): out.append(i)
            # (...and a group that ends in a particle the Masoretes always join: "both
            # of the Nephites" is גַּם־מִן הַנֶּפִיִּים, and the מִן took a mahpakh of its
            # own, 3 Nephi 3:14)
            elif GROUP_PROCLITIC and N(last) in ALWAYS_JOINED: out.append(i)
            continue
        if h in ALWAYS_JOINED or (h in JOINED_BEFORE_BARE and u'\u05be' not in h2): out.append(i)
        elif KOL_PREFIX_CSTR and u'\u05c7' in h and re.sub(u'^ו', '', bare(h)) in (u'בכל', u'לכל', u'ככל', u'מכל', u'כל') \
                and proclitic(speak, i): out.append(i)
    return out

def proclitic(toks, i):
    """A particle that reaches forward to its noun (עַל, עַד, מִן, אֶת...): not עַד after
       עוֹלָם, where it is the noun "ever" and ends its phrase: "whose flame ascendeth
       up forever and ever; and then" is לְעוֹלְמֵי עַד וְאָז, and the stop slid off עַד and
       the joiner wrote עַד־וְאָז, Alma 12:17 (לְעוֹלָם וָעֶד, לְעוֹלְמֵי עַד in the Tanakh)"""
    # (...and כׇל with its prefix, the construct by its qamats qatan: "in every assembly of the
    # Lamanites" is בְּכׇל קְהַל הַלָּמָנִים, and the pashta fell on בְּכׇל, Alma 21:16)
    # (only before the noun it governs, or אֲשֶׁר: "and flocks of every kind, that they
    # might" is וְצֹאן מִכׇּל לְמַעַן, the כׇל absolute whatever its pointing, 3 Nephi 4:4)
    if KOL_PREFIX_CSTR and u'\u05c7' in toks[i][0] and u'\u05be' not in toks[i][0] \
       and re.sub(u'^ו', '', bare(toks[i][0])) in (u'בכל', u'לכל', u'ככל', u'מכל', u'כל') and i + 1 < len(toks):
        nx, gx = toks[i + 1]
        mx = morph_of(nx, last=False)
        if re.match(r'^H((C|R|Rd|Td|X)/)*(N|A|V\w?[rs])', mx) or bare(nx).startswith(u'אשר') \
           or (not mx and nfc(nx) not in CLAUSE_OPENERS and not VERB_GLOSS.search(gx)): return True
    if nfc(toks[i][0]) in WAW_PROC_BARE and i + 1 < len(toks) and u'\u05be' not in toks[i + 1][0]: return True
    if kol_holam(toks[i][0], toks[i + 1][0] if i + 1 < len(toks) else None) or nfc(toks[i][0]) not in PROCLITIC: return False
    if EVER_NOUN and bare(toks[i][0]) == u'עד' and i >= 1 and re.search(u'עולם|עולמי', bare(toks[i - 1][0])): return False
    return True

def reaches_forward(toks, i):
    """A MARK ON A WORD THAT REACHES FORWARD BELONGS AFTER WHAT IT REACHES FOR.
       "the judgments, and the statutes, and the commandments of the Lord" is
       מִשְׁפְּטֵי יְהוָה וְחֻקָּיו וּמִצְוֹתָיו: the first comma fell on the construct
       מִשְׁפְּטֵי, the pair filter dropped it (the Tanakh never splits that pair),
       and the list lost its first member, so the etnachta split it (2 Nephi
       5:10). A construct, a gloss the next word continues with "of ...", a
       bare preposition, a word before a bare אֵת: the mark slides to the end
       of the chain, before the filters see it."""
    if not (0 <= i < len(toks) - 2): return False
    h, h2 = toks[i][0], toks[i + 1][0]
    g2 = toks[i + 1][1].strip().lower()
    return bool(construct(h, h2) or (proclitic(toks, i) and nfc(h) not in NEVER_AFTER)
                or (u'\u05be' not in h2 and binds_back(h2))
                or (re.match(r'of\b', g2) and not (PREP_PREFIX.match(nfc(h2)) and real_prefix(h2))
                    and not morph_of(h2, last=False).startswith('HD')
                    # (not into a question: "of what fold are ye?" glosses אֵי־מִזֶּה "of what",
                    # and the comma after "the good shepherd," slid onto it, Alma 5:39)
                    and not (INTERROG_STOP and re.sub(u'^ו', '', bare(h2)).split(u'־')[0] in INTERROG)))

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
        # (a mark on the question's הֲלֹא is the end of what came before it: "more than
        # my fathers have written? For have not they revealed" glossed הֲלֹא "have they
        # not", and its "have" found "have written", Jarom 1:2)
        if 0 < i < len(toks) - 1 and bare(toks[i][0]) in (u'הלא', u'הלוא') and u'\u05b2' in toks[i][0][:3]: i -= 1
        if 0 <= i < len(toks) - 1: i = transposed(toks, i, ent, marks)
        if 0 <= i < len(toks) - 1: i = verb_first(toks, i, ent)
        # (12) a mark on a noun whose adjective follows it in the Hebrew and comes
        # before it in the English: "with one eye," is בְּעַיִן אַחַת, and the comma on
        # בְּעַיִן took the etnachta between them, Mosiah 18:21
        while ADJ_AFTER and 0 <= i < len(toks) - 2 and ent and attributive(toks[i][0], toks[i + 1][0]):
            nw = _words(toks[i][1])[-1:] if _words(toks[i][1]) else []
            aw = _words(toks[i + 1][1])
            if not nw or not aw or not re.search(r'\b%s\s+%s\b' % (r'\s+'.join(map(re.escape, aw)), re.escape(nw[0])), ent, re.I): break
            i += 1
        # (9) a mark on a predicate that its pronoun subject follows: "we are strong,"
        # is חֲזָקִים אֲנַחְנוּ, the English saying the pronoun first, and the comma
        # belongs after אֲנַחְנוּ (Mosiah 12:15)
        # (...the third person too: "that they were a free people, that they were free" is עַם
        # חׇפְשִׁי הֵם חׇפְשִׁים, and the comma on חׇפְשִׁי put the zaqef after the second "free",
        # Alma 21:21)
        if 0 <= i < len(toks) - 2 and ent and u'\u05be' not in toks[i + 1][0] \
           and bare(toks[i + 1][0]) in (PRON | PRON3 if PRED_PRON3 else PRON) \
           and re.match(r'^H(Td/)?(Aa|V.r|V.s)', morph_of(toks[i][0])) \
           and re.search(r'\b%s %s\b' % (re.escape(toks[i + 1][1].strip()), re.escape(toks[i][1].strip())), ent, re.I):
            i += 1
        # (16) a mark on the word before its postposed גַּם־PRONOUN: "he also was pained;"
        # is וַיִּכָּאֵב גַּם־הוּא, and the semicolon on the verb's "pained" put a zaqef
        # between them (Alma 14:10); "their families also," is וּמִשְׁפְּחוֹתֵיהֶם גַּם־הֵם
        # (Ether 1:37). Where the English says "also" or "too" beside the mark's word,
        # the mark is the pronoun's (...where every mark after that word is that one:
        # "if their works be good, then they are good also" keeps the comma of the first
        # "good" on its טוֹבִים, Moroni 7:5)
        if GAM_PRON and 0 <= i < len(toks) - 2 and ent:
            gp = bare(toks[i + 1][0]).split(u'\u05be')
            lw = _words(toks[i][1])[-1:]
            if len(gp) == 2 and gp[0] == u'גם' and gp[1] in PRON | PRON3 and lw:
                w = re.escape(lw[0])
                spans = [m.span() for m in re.finditer(
                    r'\b(also|too)\s+(\w+\s+){0,2}%s\s*[,;:.]|\b%s\s+(also|too)\s*[,;:.]' % (w, w), ent, re.I)]
                plain = [m.start() for m in re.finditer(r'\b%s\s*[,;:.]' % w, ent, re.I)]
                if spans and all(any(a <= q < b for a, b in spans) for q in plain): i += 1
        # (3) the colon that opens a speech is a comma to the breath table
        # (weight 1); to the Masoretes לֵאמֹר before the speech is a stop (13:40)
        if c == 1 and colon and 0 <= i < len(toks) and SPEECH.search(toks[i][1]): c = 2
        # (6) a mark on a word that reaches forward slides to the end of its
        # chain (reaches_forward, 2 Nephi 5:10)
        while reaches_forward(toks, i): i += 1
        # (15) a mark on a bare construct preposition the English never says
        # belongs before it: "both male and female, whether out of the church" is
        # גַּם־נְקֵבָה מִחוּץ לָעֵדָה, and the comma, מִחוּץ's "without" nowhere in the
        # English, stayed on מִחוּץ and split it from its noun (Alma 1:30). A
        # construct form with no suffix reaches forward; when the word before it
        # ends the English segment, the mark is that word's
        if PREP_BACK and 0 < i < len(toks) - 1 and u'\u05be' not in toks[i][0] and (i - 1, c) not in marks \
           and re.match(r'^HR/Nc\w*c$', morph_of(toks[i][0])) and ent \
           and re.match(r'^H(R/|Rd/)?(Td/)?N', morph_of(toks[i + 1][0], last=False)):
            # (...before the noun it governs: מִכֹּל "above all" before לָכֵן is the
            # absolute that ends "most sacred;", Alma 50:38)
            gw = [_stem(w) for w in _words(toks[i][1]) if w not in STOP_WORDS]
            pw = _words(toks[i - 1][1])
            ew = [_stem(w) for w in _words(ent)]
            if gw and not any(w in ew for w in gw) and pw and \
               re.search(r'\b%s\s*[,;:]' % re.escape(pw[-1]), ent, re.I): i -= 1
        # (14) a mark on a "nevertheless" the English sets after its stop belongs
        # before it: "in the land of Helam; nevertheless he should have no power" is
        # הֵלָם וְאַךְ לֹא־יִהְיֶה, and the etnachta fell on וְאַךְ, Mosiah 23:39
        if AKH_BACK and 0 < i < len(toks) - 1 and u'\u05be' not in toks[i][0] \
           and bare(toks[i][0]) in (u'אך', u'ואך', u'אולם', u'ואולם', u'רק', u'ורק') and ent \
           and re.search(r'[,;:]\s+(nevertheless|but|yet|notwithstanding|howbeit|only)\b', ent, re.I) \
           and not re.search(r'\b(nevertheless|yet|notwithstanding|howbeit)[,;:]', ent, re.I) \
           and (i - 1, c) not in marks: i -= 1
        # (13) a mark on בְּלִי "without" before its noun belongs before it: "the walls of
        # the city, unless he took his guards" is הָעִיר בְּלִי שׁוֹמְרָיו, and the comma,
        # its "without" read in "without the walls", fell on בְּלִי and took the
        # etnachta there, Mosiah 21:19
        if BLI_BACK and 0 < i < len(toks) - 1 and u'\u05be' not in toks[i][0] \
           and bare(toks[i][0]) in (u'בלי', u'ובלי', u'מבלי', u'לבלי') and (i - 1, c) not in marks: i -= 1
        # (11) a mark on a bare negation belongs after its verb, which the Hebrew says
        # after it: "and they would not;" is וְלֹא אָבוּ, and the stop on וְלֹא cut the
        # negation from its verb, Mosiah 16:12 (not the answer "Nay")
        # (...and before the negation where the English stop precedes it: "governed by
        # one teacher; neither could they all hear" is בָּם וְלֹא יָכְלוּ, Mosiah 25:20)
        if NEG_FORWARD and 0 <= i < len(toks) - 2 and u'\u05be' not in toks[i][0] and bare(toks[i][0]) in (u'לא', u'ולא') \
           and not re.match(r'(and )?(nay|no)[.,;:!]?$', toks[i][1].strip().lower()) \
           and re.search(r'(^H|/)V', morph_of(toks[i + 1][0], last=False)):
            if ent and re.search(r'[,;:]\s+(neither|nor)\b', ent, re.I) and not re.search(r"\bnot\s*[,;:.!?]", ent, re.I):
                if i > 0 and (i - 1, c) not in marks: i -= 1
            elif (i + 1, c) not in marks: i += 1
        # (10) a mark after a copula pronoun whose predicate follows it belongs before
        # the pronoun, which opens the next clause: "the devil has power over them;
        # yea, even that old serpent" is מוֹשֵׁל בָּם הוּא הַנָּחָשׁ הַקַּדְמוֹנִי, and the stop
        # fell on הוּא, Mosiah 16:3
        # (...glossed "being" too, and before a name the table cannot read: "against their
        # brethren, who consisted of Nephi, Jacob" is בַּאֲחֵיהֶם הֵם נֶפִי וְיַעֲקֹב, and the
        # comma on הֵם gave it the etnachta, Alma 3:6)
        if COPULA_BACK and 0 < i < len(toks) - 1 and u'\u05be' not in toks[i][0] and bare(toks[i][0]) in PRON3 \
           and (COPULA.match(toks[i][1].strip()) or (COPULA_NAME and toks[i][1].strip().lower() == 'being')) \
           and (re.match(r'^H(Td/|Np)', morph_of(toks[i + 1][0], last=False))
                or (COPULA_NAME and not morph_of(toks[i + 1][0], last=False) and NAME_GLOSS.match(toks[i + 1][1].strip())
                    and toks[i + 1][1].strip() not in DIVINE)) \
           and (i - 1, c) not in marks: i -= 1
        # (8) a mark between an infinitive absolute and its verb belongs before the
        # pair, which the English says as one ("Thus saith the Lord, it shall come
        # to pass" is כֹּה־אָמַר יְהוָה הָיֹה יִהְיֶה, and the comma fell on הָיֹה, where the
        # pair's veto dropped it, Mosiah 12:2)
        # (...and with a bare negation between them: "in keeping this commandment, the
        # Lord God will not destroy them" is אוֹתָהּ הַשְׁמֵד לֹא יַשְׁמִידֵם, Jacob 3:6)
        if INF_ABS_BACK and 0 < i < len(toks) - 1 and (shares_root(toks[i][0], toks[i + 1][0]) or (
                i + 2 < len(toks) and bare(toks[i + 1][0]) == u'לא' and shares_root(toks[i][0], toks[i + 2][0]))) \
           and (i - 1, c) not in marks: i -= 1
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
    out = sorted(set(out))
    # (7) a mark right before a vocative that carries its own mark is the
    # speech colon before the name the English sets off: "I said: Lord,
    # whither shall I go" is וָאֹמַר יְהוָה אָנָה, and the Masoretes bind the
    # verb to the name (וָאֹמַ֣ר יְהוָ֔ה, not two zaqef gadols; 1 Nephi 17:9)
    drop = set()
    for (i, c), (i2, c2) in zip(out, out[1:]):
        voc = re.sub(r'^O\s+', '', toks[i2][1].strip()) if 0 <= i2 < len(toks) else ''   # ("O Lord", 1 Nephi 17:9)
        if i2 == i + 1 and 0 <= i2 < len(toks) - 1 and NAME_GLOSS.match(voc) and voc in DIVINE:
            drop.add((i, c))
    return [m for m in out if m not in drop]

PRON2 = set(u'אתה את אתם אתן'.split())
INTERROG = set(u'אי איה איך איכה מי מה מדוע למה מתי אנה'.split())
EL_EPITHET = set(u'שדי עליון גבור חי קנא רחום אמונה נאמן גדול נורא עולם'.split())   # (אֵ֥ל עוֹלָֽם, Genesis 21:33)

def kin_after_name(toks, i):
    """the link between a name and the kin word in apposition after it
       (יוֹסֵף אָחִי, וְלֶחִי אָבִי): the name by its gloss or the Tanakh's Np, the
       kin word bare, without its own waw or maqqef"""
    if i + 1 >= len(toks): return False
    (h, g), (h2, g2) = toks[i], toks[i + 1]
    if u'\u05be' in h or u'\u05be' in h2 or PLAIN_WAW.match(nfc(h2)): return False
    g = re.sub(r'^and[- ]', '', g.strip(), flags=re.I)
    name = bool(NAME_GLOSS.match(g)) and g not in DIVINE or bool(re.match(r'^H(C/)?Np[mfl]', morph_of(h)))
    return name and bool(KIN.match(bare(h2)))

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

# the English's opening connectives, whose comma is a mark of writing: the
# aligner sets it after the Hebrew verb when the Hebrew says the verb before
# the subject ("Yea, my father spake much" is אַף הִרְבָּה אָבִי, 10:12; "Now, my
# father had begat" וְעַתָּה הוֹלִיד אָבִי, 18:7; "and also, my brethren took"
# וְגַם לָקְחוּ אַחַי, 16:7)
def copula_after(toks, i):
    """A printed mark that falls right before a bare הוּא, הִיא or הֵם glossed as
       a copula ("he is", "they are") is the English comma carried one word too
       early: "he is a mighty man," is אִישׁ גִּבּוֹר הוּא, and the aligner, finding
       its "he is" before the comma in the English, set the break in front of
       the pronoun (20 such marks in the volume, Mosiah 20:13 מֶלֶךְ הַלָּמָנִים ׀ הוּא
       נִפְצַע). The mark is dropped and the model decides the link."""
    if i + 1 >= len(toks): return False
    h2, g2 = toks[i + 1]
    # (not a pronoun that opens its clause, its definite predicate after it: "power
    # over them; yea, even that old serpent" is בָּם הוּא הַנָּחָשׁ, Mosiah 16:3)
    if COPULA_BACK and i + 2 < len(toks) and re.match(r'^H(Td/|Np)', morph_of(toks[i + 2][0], last=False)): return False
    return u'־' not in h2 and bare(h2) in PRON3 and bool(COPULA.match(g2.strip()))
PREFIXES = u'והלבכמש'
# particles the Masoretes join forward with a maqqef when they stand bare
# prepositions the Tanakh tags as construct nouns (אֵצֶל HNcbsc, תַּחַת, מוּל) or
# adjectives (אַחֲרֵי, נֶגֶד): they reach forward as surely as אֶל does, and the
# gloss rule misses them when the English is "by" (8:20 אֵ֨צֶל֙ מַעֲקֵ֣ה הַבַּרְזֶ֔ל)
VA_ASHER = True
EXTRA_NEVER = set(u'אֵצֶל תַּחַת מוּל נֶגֶד לִפְנֵי אַחֲרֵי בְּתוֹךְ מִתּוֹךְ סְבִיב אֵין וְאֵין גַּם גַם הֲלֹא הֲלוֹא'.split()) | (set([u'וַאֲשֶׁר']) if VA_ASHER else set())   # (אֵין before its noun: WLC conjunctive 399, maqqef 149, disjunctive 70; וְאִם־אֵ֔ין צֶ֗דֶק 2 Nephi 2:13;
# (...and וַאֲשֶׁר as אֲשֶׁר: the WLC divides after a bare one 20 times in 114; "and who were in
# the land of Shemlon" had its pashta on וַאֲשֶׁר, Alma 23:12)
# a bare גַּם before what it adds: disjunctive 41 of 437, כִּ֥י גַם֙ לְכׇל־הַנְּבִיאִ֣ים took a
# pashta on גַם, Jacob 4:4; the question's הֲלֹא, 48 of 240)
ENCLITIC = set(u'בלבד'.split())
COMPOUND = set([(u'אף', u'גם')])
PROCLITIC = set(NEVER_AFTER) | EXTRA_NEVER | set(u'עַל מִן עַד אֵת אֶת בֵּין אַל פֶּן עִם'.split())
# ...and the same prepositions with their waw, which the Masoretes join as they do the bare
# ones: "and of the many murders" is וְעַל הַדָּמִים הָרַבִּים, and the tevir its tifcha needed
# fell between the noun and its adjective, Alma 24:9. WLC: וְאֶת joined 1,770 of 1,770, וּמִן
# 109 of 109, וְעִם 24 of 26, always; וְעַל, וְעַד, וְאֶל before a bare word 333 of 420, 163 of
# 201, 270 of 275, but before a maqqef group mostly free, וְעַ֖ל כׇּל־אֳנִיּ֣וֹת תַּרְשִׁ֑ישׁ
# (Isaiah 2:16; proclitic() asks). Not וְאֵת, the tsere form, free 437 of 437, nor וּבֵין, free
# 111 of 118 (וּבֵ֥ין הַחֹֽשֶׁךְ). By the pointing: וְעַם is "and a people", וָעֶד "and ever"
WAW_PROCLITIC = True
WAW_PROC_BARE = set(N(w) for w in u'וְעַל וְעַד וְאֶל'.split()) if WAW_PROCLITIC else set()
if WAW_PROCLITIC: PROCLITIC |= set(N(w) for w in u'וְאֶת וּמִן וְעִם'.split())
# THE ABSOLUTE כֹּל, WITH ITS HOLAM, STANDS FREE: the WLC never writes it with a maqqef (0 of
# 793; joined it is כׇּל־) and divides after it before a noun 265 times in 280 (כֹּ֖ל מִשְׁפְּחֹ֥ת
# הָאֲדָמָֽה, Genesis 12:3), a verb 52 in 56. Before אֲשֶׁר, divided 64 times in 139, it still
# reaches forward (כְּכֹ֥ל אֲשֶׁר־צִוָּ֖ם, 3 Nephi 26:20, took a zaqef of its own when freed).
# Held as a particle, "in his strength I can do all things; yea, behold" became כֹּל־אַף,
# Alma 26:12
KOL_HOLAM = True
def kol_holam(h, h2=None):
    h = nfc(h)
    return KOL_HOLAM and u'\u05be' not in h and u'\u05c7' not in h and u'\u05b9' in h \
        and bool(re.match(u'^ו?[בלמכ]?כל$', bare(h))) and not (h2 and bare(h2).startswith(u'אשר'))
DEMONSTRATIVE = set(u'ההוא ההיא הזה הזאת האלה ההם ההן ההמה'.split())
# (by its pointing, not its letters alone: הֲהוּא "is he?" and הֲזֶה "is this?" are the question's
# הֲ, and "And the king said: Is God that Great Spirit" lost its colon to the demonstrative
# rule, Alma 22:9)
def is_dem(h):
    return bare(h) in DEMONSTRATIVE and not nfc(h).startswith(u'\u05d4\u05b2')
OF_HEADS = set(u'על אל את עד עם מן בין אשר'.split())
# pointed, and matched pointed: the consonants of וְהִנֵּה "and behold" are those
# of וָהֵנָּה "and thither" (הֵנָּה וָהֵנָּה, 17:26)
CLAUSE_OPENERS = set(N(w) for w in u'כִּי כַּאֲשֶׁר וְכַאֲשֶׁר לְמַעַן וּלְמַעַן לְבִלְתִּי וְגַם בַּעֲבוּר וּבַעֲבוּר עַד וְהִנֵּה וַיְהִי לָכֵן וְלָכֵן עַל־כֵּן וְעַל־כֵּן הוֹי הִנֵּה וְאִם אַךְ'.split())
# ("were it not": WLC a disjunctive before לוּלֵא/לוּלֵי 4 times in 5; "I could not have come
# now were it not that the judgment-seat" had a qadma on לָבוֹא before it, Alma 7:2)
CLAUSE_OPENERS |= set(N(w) for w in u'לוּלֵא לוּלֵי וְלוּלֵא וְלוּלֵי'.split())
# (הוֹי: a disjunctive before it 11 of 12 in the WLC, "to fulfil all righteousness, ‖ O then"
# 2 Nephi 31:5; bare הִנֵּה 292 of 315; וְאִם 103 of 113; אַךְ 65 of 70)
KI_MAQQEF = N(u'כִּי־')     # (NFC, as the corpus is read: the marks of a letter in canonical order)

def stem3(h):
    """the first three root letters, past the one-letter prefixes and a maqqef"""
    s = bare(h).split(u'־')[-1]
    while len(s) > 3 and s[0] in PREFIXES: s = s[1:]
    return s[:3]

def shares_root(h, h2):
    """The infinitive absolute before its own verb (עָזֹב לֹא־עֲזָבַנִי, גַּלֵּה גִלּוּ,
       שָׁמוֹר תִּשְׁמְרוּ, אָרֹר אָאֹר): the second word repeats the first's root,
       with or without an imperfect prefix (א י ת נ) in front of it."""
    # the verb follows its infinitive absolute at once, a negation at most
    # between them (עָזֹב לֹא־עֲזָבַנִי): a second word that opens with a waw or
    # the article is a new clause or a noun of the same root, not the verb
    # ("shall write; and that which shall be written" is יִכְתֹּב וְהַנִּכְתָּב, and
    # the stop between them was held hard, 2 Nephi 3:12; the hitpael's
    # infinitive absolute is spelt as its perfect, הִתְאַבֵּל הִתְאַבַּלְנָה, 1 Nephi
    # 16:35, so the form itself cannot decide)
    if PLAIN_WAW.match(nfc(h2)) or re.match(r'^H(C/)?Td/', morph_of(h2)): return False
    # (...nor with the waw of the sequence: "he did teach. And he taught them" is
    # לִמְּדָם וַיְלַמְּדֵם, two verbs, and the stop between them was held hard, Mosiah 18:3)
    if WAW_SEQ_OFF and nfc(h2).startswith(u'\u05d5'): return False
    # (an infinitive with its preposition is the construct, never the absolute:
    # לֵאמֹר before כֹּה־אָמַר shares the root אמר and is the speech's colon, which the
    # Masoretes divide after as a rule; "prophesy, saying: Thus saith the Lord" lost
    # its stop, Mosiah 12:2)
    if re.match(r'^H(R|Rd)/', morph_of(h)): return False
    # the Tanakh's own analysis first: an infinitive absolute and a verb of the same
    # lemma (הַכֵּה יַכּוּ, both H5221: the weak root נכה keeps one radical of three,
    # and "shall scourge you" took a zaqef between them, Jacob 3:3)
    ea, eb = attested(nfc(h).split(u'\u05be')[-1]), attested(nfc(h2).split(u'\u05be')[-1])
    # (an infinitive of either kind: the hollow root's absolute is spelt as its
    # construct, and the table reads בּוֹא in בּוֹא יָבֹאוּ as one, Jacob 2:14)
    if ea and eb and ea[0] and ea[0] == eb[0] and re.match(r'^HV.[ac]', ea[1] or ''): return True
    # (...and a form the Tanakh reads as finite is none: only the hitpael spells its
    # infinitive absolute as its perfect, and the hiphil as its imperative; "the man
    # that is not learned shall say: I am not learned" is הָאִישׁ אֲשֶׁר לֹא לָמַד לֹא
    # לָמַדְתִּי, and the colon after לָמַד went back onto its לֹא, 2 Nephi 27:19)
    # (...unless the second is the infinitive, after its verb: הוֹלֵךְ הָלוֹךְ "goest about
    # much", Jacob 7:6; שָׁמְרוּ לִשְׁמֹר, Alma 30:3)
    if FINITE_NOT_INF and ea and re.match(r'^HV[^t][pqiwjr]', ea[1] or '') \
       and not (eb and re.search(r'(^H|/)V.[ac]', eb[1] or '')): return False
    def match(h, h2):
        a = stem3(h)
        if len(a) < 3: return False
        # a lamed-he root's infinitive absolute ends in ו (הָיוֹ תִהְיֶה, רָאֹה
        # רָאִיתִי): its ה is the root's third letter (2 Nephi 9:7 had a zarqa
        # between הָיוֹ and תִהְיֶה)
        roots = [a] + ([a[:-1] + u'ה'] if a.endswith(u'ו') and len(a) == 3 else [])
        # the verb as written, then with each one-letter prefix off in turn: the
        # hiphil keeps its ה (הוֹכֵחַ הוֹכִיחָם, 16:39: stripped to the bone first,
        # הוכיחם lost its ה, its ו and its כ and nothing was left to match)
        for a in roots:
            b = bare(h2).split(u'־')[-1]        # the verb is the last word of its group (לֹא־עֲזָבַנִי)
            while True:
                if b.startswith(a): return True
                # behind an imperfect prefix the whole root: two letters matched לָבָן
                # to וָאֶלְבַּשׁ (1 Nephi 4:19); a geminate root keeps one of its pair (אָרֹר אָאֹר)
                if len(b) >= 3 and b[0] in u'איתנ' and (b[1:4] == a or (a[1] == a[2] and b[1:3] == a[:2])): return True
                if len(b) > 3 and b[0] in PREFIXES: b = b[1:]
                else: break
        return False
    # the hiphil or hophal infinitive absolute of a hollow root keeps two radicals
    # behind its ה, and the imperfect keeps them behind its prefix and a mater:
    # הָכֵן יוּכַן "must needs be prepared" (1 Nephi 15:34 had a zaqef between them)
    def hollow(h, h2):
        a, b = bare(h).split(u'\u05be')[-1], bare(h2).split(u'\u05be')[-1]
        if len(a) != 3 or a[0] != u'ה' or len(b) < 3 or b[0] not in u'איתנ': return False
        core = re.sub(u'[וי]', '', b[1:])
        return len(core) >= 2 and core[:2] == a[1:] and a[2] not in u'הוי'
    # the pair is a verb and its verb: a noun of the same root is not it
    # (דַבְּרִי אֶת־הַדְּבָרִים, לְדַבֵּר אֶת־הַדְּבָרִים bound as if infinitive absolutes,
    # 1 Nephi 4:4, 10:22), by the Tanakh's analysis where it has the form
    is_verb = lambda m: bool(re.search(r'(^H|/)V', m))        # a V segment anywhere: HVqp3ms/Sp1bs
    m1, m2 = morph_of(h), morph_of(h2)
    if (m1 and not is_verb(m1)) or (m2 and not is_verb(m2)): return False
    # as written, then with the matres out (אָרוֹר תֵּאָרֵר, Jacob 2:29; but הָיֹה
    # יִהְיֶה keeps its yod and matches as written)
    strip = lambda s: re.sub(u'[וי]', '', s)
    return match(h, h2) or match(strip(h), strip(h2)) or hollow(h, h2)

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

# the number words, by the word (the table tags אַחֲרֵי and עוֹד as cardinals, and
# הָאַרְבַּע as a place)
NUM_WORDS = set(u'''אחד אחת שני שתי שנים שתים שתיים שלש שלוש שלשה שלושה שלשת שלושת ארבע ארבעה ארבעת חמש
    חמשה חמשת שש ששה ששת שבע שבעה שבעת שמנה שמונה שמנת שמונת תשע תשעה תשעת עשר עשרה עשרים שלשים
    שלושים ארבעים חמשים חמישים ששים שישים שבעים שמנים שמונים תשעים מאה מאות מאת מאתים אלף אלפים
    אלפי רבבה רבבות רבבת רבוא'''.split())

def morph_of(h, last=True):
    """the morph code of a word; of a maqqef group, its last word (the one
       that reaches forward: אֶת־עֶבֶד) or its first"""
    parts = nfc(h).split(u'־')
    w = parts[-1] if last else parts[0]
    e = attested(w)
    # (a number the table reads as a place by its only Tanakh use: הָאַרְבַּע is
    # Kiriath-Arba twice there, and "the fourteenth year" here, Alma 16:12; the
    # reader's root engine settles the same form by its gloss)
    if e and NUM_NOT_NAME and e[1].startswith('HNp') and re.sub(u'^[והב]', '', bare(w)) in NUM_WORDS:
        return ('HTd/' if bare(w)[:1] == u'ה' else 'H') + 'Acbsa'
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
    # מֵ before a guttural or resh is מִן with its vowel lengthened (מֵעוֹרוֹת
    # "of the skins", 17:11; מֵאֶרֶץ, מֵרֹאשׁ): a noun's own מֵ there is rare
    if re.match(u'^מֵ[אהחער]', h): return True
    rest = h[2:]
    return attested(rest) is not None or attested(rest.replace(u'ּ', u'', 1)) is not None

def chief_judge(h, h2):
    """the volume's title "the chief judge": הַשֹּׁפֵט הָרֹאשׁ, and without its articles
       too, שֹׁפֵט רֹאשׁ ("that there should be no more a chief judge" took the tifcha between
       them, Alma 51:4; four in six were divided)"""
    a, b = bare(h), bare(h2)
    if re.search(u'השו?פט$', a) and b == u'הראש': return True
    return CHIEF_BARE and bool(re.match(u'^ו?[לכב]?שו?פט$', a)) and b == u'ראש'

def construct(h, h2, g2=None):
    """an attested construct form (HNcmsc, HAamsc: עֶבֶד, אוֹצַר, גְּדָל) before
       the bare noun, name or adjective it governs: the WLC puts a disjunctive
       after one 21% of the time against 61% for any word. The table's morph is
       the form's commonest reading, so a form that is also an absolute (סֵפֶר,
       עֳנִי) counts only when what follows could be its nomen rectum: before a
       verb or a prefixed word (רַב־עֳנִי רָאוּ, סֵפֶר בִּלְשׁוֹן) it is left to the model."""
    # (read past a preposition or waw: בִּשְׁנַת שְׁלֹשׁ עֶשְׂרֵה "in the thirteenth year" took a
    # revia on its construct, Mosiah 9:14)
    m1 = re.sub(r'^H((C|R|X)/)+', 'H', morph_of(h))
    if not (m1.endswith('c') and m1[:3] in ('HNc', 'HAa')): return False
    m2 = re.sub(r'^HTd/', 'H', morph_of(h2, last=False))     # the article is no bar (עֶבֶד הַמֶּלֶךְ)
    # ...or a participle (מַעֲשֵׂה חֹשֵׁב "the work of a craftsman", 16:10; the WLC
    # divides after a construct before one 26% of the time)
    # (...never a preposition, which the table tags as an adjective in construct:
    # "God gave unto them commandments, after" is מִצְוֹת אַחֲרֵי, and the comma after
    # "commandments," slid past אַחֲרֵי as if into its genitive, Alma 12:32)
    # (a preposition, not אֵין: חַיֵּי אֵין־קֵץ "a life without end" is a genitive, Mosiah 16:9)
    if PREP_NOT_GENITIVE and nfc(h2).split(u'\u05be')[0] in PROCLITIC \
       and re.sub(u'^ו', '', bare(h2).split(u'\u05be')[0]) not in (u'אין', u'את', u'כל', u'גם', u'הלא', u'הלוא'): return False
    # (...and a name the table cannot read, by its gloss: "the river Sidon" is נְהַר סִידוֹן,
    # the Book of Mormon's סִידוֹן no Tanakh form, and a revia split them, Alma 16:6)
    # ("of Middoni" as much as "Sidon": מִדּוֹנִי's מִדּ looks like מִן assimilated, and
    # "to the land | of Middoni" took a pashta inside the construct, Alma 20:2)
    gn = re.sub(r'^of\s+', '', (g2 or '').strip(), flags=re.I)
    if UNREAD_NAME_CSTR and not m2 and g2 is not None and u'\u05be' not in h2 and NAME_GLOSS.match(gn) \
       and gn not in DIVINE: return True
    return (m2[:3] in ('HNc', 'HNp', 'HAa', 'HAc') or bool(re.match(r'HV.[rs]', m2))) and '/' not in m2

def attributive(h, h2):
    """a noun and the bare adjective after it (כֹּחַ רַב, זָהָב טָהוֹר), both
       absolute: divided between 21% of the time in the WLC"""
    # a noun and its "one" (נֶפֶשׁ אַחַת): the WLC divides between them 49 times in 374,
    # less often than before an adjective (377 in 1,562); "there was not one soul"
    # had a pashta between them, Mosiah 6:2
    if bare(h2) in (u'אחד', u'אחת') and re.match(r'^H((C|R|Rd|X|Td)/)*Nc', morph_of(h)): return True
    # a noun and its "without"-phrase, which is its adjective: נַפְשׁוֹ בְּלִי־מָוֶת "his
    # immortal soul" (a zaqef between them, Mosiah 2:38; וְרוּחִי ‖ בְּלִי־מָוֶת, 2:28)
    if bare(h2).split(u'־')[0] == u'בלי' and u'־' in h2 and re.match(r'^H((C|R|Rd|X|To)/)*Nc', morph_of(h)): return True
    if u'־' in h2: return False
    # הֶעָנָף הַצַּדִּיק as much as עָנָף צַדִּיק, and בִּקְלָלָה חֲמוּרָה "with a sore curse" as
    # much as קְלָלָה (the noun's preposition or waw is no part of the pair, Jacob 3:3)
    article = lambda m: re.sub(r'^H((C|R|Rd|X|Td)/)+', 'H', m)
    m1, m2 = article(morph_of(h)), article(morph_of(h2, last=False))
    adj = m2.startswith('HAa') and m2.endswith('a')
    # (a definite noun and an adjective without the article are a clause, not a
    # phrase: כִּי הַשָּׁרָשִׁים טוֹבִים "that the roots are good", Jacob 5:36; the noun is
    # definite by its article or its suffix)
    # (...the article fused with a preposition, HRd/, is the article: לַמַּיִם הַגְּדוֹלִים,
    # Omni 1:16. God takes his adjective either way, אֱלֹהִים צַדִּיק Psalm 7:10 and
    # דְּבַר־אֱלֹהִים הַנָּעִים, Jacob 2:8, and is no test of it)
    # (a form read past its prefix, HX/, has the article in the prefix's vowel:
    # בָּאֵל הַקָּדוֹשׁ "the Holy God", 2 Nephi 9:39)
    definite = lambda m, w: bool(re.search(r'(^H|/)(Td|Rd)/|/Sp|(^H|/)Np', m)) or (
        m.startswith('HX/') and bool(re.match(u'^[בלכ][\u05b7\u05b8]', nfc(w))))
    if m1 and adj and not re.search(u'(אלהים|יהוה)$', bare(h)) \
       and definite(morph_of(h), h.split(u'\u05be')[-1]) != definite(morph_of(h2, last=False), h2.split(u'\u05be')[0]): return False
    # a noun the table cannot read, before an adjective that agrees with it in
    # number: עֲנָפִים צְעִירִים "young branches" (Jacob 5:4 had a zaqef between them)
    if not m1 and adj and u'\u05be' not in h and not nfc(h).startswith(u'\u05d5'):
        e1, e2 = bare(h)[-2:], bare(h2)[-2:]
        return e1 == e2 and e1 in (u'ים', u'ות')
    return m1.startswith('HNc') and m1.endswith('a') and adj

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
        if i + 2 < len(toks) and proclitic(toks, i + 1) and u'־' not in toks[i + 1][0]:
            h2, g2 = toks[i + 1]; h3, g3 = toks[i + 2]
            pair = [toks[i], (nfc(h2) + u'־' + nfc(h3), g2 + ' ' + g3)]
            return prior + sum(w.get(k, 0.0) for k in pair_feats(pair, 0))
        return prior + sum(w.get(k, 0.0) for k in pair_feats(toks, i))
    def name_king(i):
        """a name before its "the king" or "the queen" (נֹחַ הַמֶּלֶךְ)"""
        if i + 1 >= len(toks) or bare(toks[i + 1][0]) not in (u'המלך', u'המלכה'): return False
        h, g = toks[i]
        return bool(re.search(r'(^H|/)Np', morph_of(h)) or (
            not morph_of(h) and NAME_GLOSS.match(g.strip()) and g.strip() not in DIVINE))
    def is_imlo(i):
        if i + 1 >= len(toks) or bare(toks[i][0]) not in (u'אם־לא', u'ואם־לא'): return False
        n2 = toks[i + 1][0]
        # (a form the table cannot read is taken for the verb it usually is: אִם־לֹא תָשׁוּבוּ,
        # Jacob 3:4)
        m2 = morph_of(n2, last=False)
        return bare(n2).startswith(u'לא') or bool(m2 and not re.match(r'^H(C/)?V', m2)) or imlo_en(i)
    def imlo_en(i):
        """"if not" before a verb that is the ellipsis all the same, by the English: "inquire of
           the Lord... otherwise we will perish in the land" is וְאִם־לֹא נֹאבַד בָּאָרֶץ (Alma 27:10;
           וְאִם־לֹ֖א אֵדָֽעָה Genesis 18:21). Not "except", the condition itself (Jacob 1:19)"""
        # (only before the verb: אִם־לֹא כֵן "if not so" is the ellipsis with its כֵן, Jacob 1:19)
        if i + 1 >= len(toks): return False
        m2 = morph_of(toks[i + 1][0], last=False)
        if bare(toks[i + 1][0]).startswith(u'לא') or (m2 and not re.match(r'^H(C/)?V', m2)): return False
        return bool(IMLO_EN and ent and re.search(r'\b(otherwise|or else)\b', ent, re.I)
                    and not re.match(r'except\b', toks[i][1].strip().lower()))
    def noun_adj(i):
        """the word at i is an article adjective (or participle) after its noun, and
           a demonstrative follows it: noun, adjective, "this" (הַדָּבָר הַגָּדוֹל הַזֶּה).
           Not after a bare construct, whose genitive the demonstrative goes with:
           כׇּל־דִּבְרֵ֖י הַתּוֹרָ֥ה הַזֹּֽאת (Deuteronomy 29:28), the near divider on the construct"""
        if i < 1 or i + 1 >= len(toks) or u'\u05be' in toks[i][0] or u'\u05be' in toks[i + 1][0]: return False
        # (...or an unread word with the article whose gloss is no noun's: "in these foolish
        # traditions" is בְּמָסֹרוֹת הָאֱוִילוֹת הָאֵלֶּה, and the tifcha fell on the noun, Alma 21:8)
        ma0 = morph_of(toks[i][0])
        unread_adj = ADJ_DEM_UNREAD and not ma0 and bare(toks[i][0])[:1] == u'ה' \
            and not re.match(r'^(the|a|an|of)\b', toks[i][1].strip().lower())
        if not is_dem(toks[i + 1][0]) or not (re.match(r'^HTd/(Aa|Ao|V\w?r)', ma0) or unread_adj): return False
        # (an adjective agrees with its noun: "after this day of life" is אַחֲרֵי יוֹם
        # הַחַיִּים הַזֶּה, the singular יוֹם a construct the table reads as absolute and
        # הַחַיִּים its plural genitive, Alma 34:33; a dual noun takes a plural adjective)
        mp, ma = morph_of(toks[i - 1][0]), morph_of(toks[i][0])
        if mp:
            m1 = re.search(r'(^H|/)(Td/)?Nc(\w)(\w)(a|c/S)', mp)
            m2 = re.search(r'(Aa|Ao|V\w?r)(\w)(\w)', ma)
            if not m1: return False
            num = lambda n: 'p' if n == 'd' else n
            return not (m2 and (num(m1.group(4)) != num(m2.group(3)) or set([m1.group(3), m2.group(2)]) == set('mf')))
        # (an unread noun by its gloss, and no genitive after it: "of life"; definite by its
        # "the", or a noun under its own preposition, the adjective's article its mark: "in that
        # awful state of blindness" is בְּעִוְרוֹן הַנּוֹרָא הַזֶּה, glossed "in blindness", and the
        # pashta fell on the noun, 1 Nephi 13:32)
        gp = toks[i - 1][1].strip().lower()
        return not re.match(r'of\b', toks[i][1].strip().lower()) and \
            bool(re.match(r'^(and |in |to |with |from |unto |upon )?the\b', gp)
                 or (ADJ_DEM_PREP and re.match(r'^(and )?(in|to|with|from|unto|upon|by|for|into|on)\s+\w+$', gp)))
    def hard(i):
        h, g = toks[i]
        if nfc(h) in EXTRA_NEVER: return True
        # a bare preposition is joined to its noun: the WLC writes עַל־ 3,220
        # times against 347 unjoined (עַד 780/312, אֶת 6,718/652, עִם 477/185,
        # בֵּין conjunctive 117 of 134), so the link after one is never a
        # division here and the joiner draws the maqqef (עַ֗ל חֶ֤סֶד יְהוָה֙ took a
        # revia on the preposition, 2 Nephi 4:17)
        if proclitic(toks, i) and nfc(h) not in NEVER_AFTER: return True
        # a maqqef group ends with its last word: וְאִם־אֵין reaches forward as
        # אֵין does (וְאִם־אֵ֔ין צֶ֗דֶק, 2 Nephi 2:13), אֲשֶׁר־לֹא as לֹא
        # (...save "if not" standing for its clause, before a word that is no verb or
        # before the negation of the answer: "if ye are not ye are not prepared" is
        # אִם־לֹא לֹא נְכוֹנִים אַתֶּם, Alma 5:28; WLC a disjunctive after אִם־לֹא before a
        # non-verb 17 times in 28, וְאִם־לֹ֖א אֵדָֽעָה Genesis 18:21, before a verb 5 in 63)
        if IMLO and is_imlo(i): pass
        elif u'\u05be' in nfc(h) and nfc(h).split(u'\u05be')[-1] in (NEVER_AFTER | EXTRA_NEVER) - set([u'כׇּל', u'כֹּל', u'כׇל', u'כֹל']): return True
        if nfc(h) in NEVER_AFTER and not kol_holam(h, toks[i + 1][0] if i + 1 < len(toks) else None):
            # a bare כֹּל reaches forward to its noun (כֹּל הָאָרֶץ), not when the
            # next word opens with a waw: there it is absolute and ends its
            # phrase (מֵעַל כֹּל ׀ וּבָרוּךְ אַתָּה, 11:6 "above all. And blessed")
            nxt = toks[i + 1][0] if i + 1 < len(toks) else u''
            if bare(h) == u'כל' and nfc(nxt).startswith(u'ו'): pass
            # ...and לֹא before כִּי is the answer "Nay", not a verb's negation (לֹּ֔א כִּ֥י
            # בָרְח֖וֹב נָלִֽין Genesis 19:2; WLC a disjunctive on 16 of 21): "I say unto
            # you, Nay; for ye have not come" is לָכֶם לֹא כִּי־לֹא בָּאתֶם, 2 Nephi 31:19
            elif bare(h) == u'לא' and bare(nxt).split(u'\u05be')[0] == u'כי': pass
            # (...or glossed as the answer: "I say unto you, Nay; he will not even
            # suffer" is לָכֶם לֹא גַם לֹא־יִתְּנֶנּוּ, Mosiah 5:14)
            elif bare(h) == u'לא' and re.match(r'(nay|no)[.,;:!]?$', g.strip().lower()): pass
            # (...and a bare כֹּל before "save", "except" is absolute, "all things": "and
            # suffered all things, save it were death" is וְסָבְלוּ כֹּל זוּלָתִי הַמָּוֶת,
            # 1 Nephi 17:20)
            elif bare(h) == u'כל' and bare(nxt).split(u'\u05be')[0] in (u'זולתי', u'זולת', u'בלתי', u'מלבד'): pass
            else: return True
        # a gloss that ends in "of", "the", "that", "which"... reaches forward,
        # except the demonstrative after its noun (\u05d4\u05b7\u05e9\u05b8\u05bc\u05c1\u05e0\u05b8\u05d4 \u05d4\u05b7\u05d4\u05b4\u05d9\u05d0 "that year",
        # \u05d4\u05b7\u05d3\u05b0\u05bc\u05d1\u05b8\u05e8\u05b4\u05d9\u05dd \u05d4\u05b8\u05d0\u05b5\u05dc\u05b6\u05bc\u05d4 "these things"), which closes the phrase
        # (...and not הַכֹּל, which the article makes absolute, the "all" that ends its
        # phrase: וְהִנֵּ֥ה הַכֹּ֛ל הֶ֖בֶל, Ecclesiastes 1:14; WLC a disjunctive after it 34 of 53.
        # "I would ask if all is
        # done? Behold" lost its stop on הַכֹּל, 2 Nephi 31:19)
        # (...and not a noun in the absolute, whose gloss ends in an adverb: מֵעוֹלָם
        # "ever before" reaches forward to nothing, and the full stop after "never
        # before heard nor seen." was held hard, Enos 1:8)
        # (...nor כֹּל with its suffix, "all of them", which the WLC divides after 119
        # times in 150, 38 in 52 before a verb, כֻּלָּ֙נוּ֙ כַּצֹּ֣אן תָּעִ֔ינוּ: "shall all be
        # fulfilled; and ye need not say" is יִמָּלְאוּ כֻלָּם וְאַל־תֹּאמְרוּ, and the stop
        # on כֻלָּם was held hard, 3 Nephi 29:2. By its qubuts: מְכַלֶּה is no כֹּל)
        # (...nor לַכֹּל, בַּכֹּל, כַּכֹּל: the article under the prefix makes them as absolute
        # as הַכֹּל; WLC a disjunctive after them 10 times in 11, לַכֹּ֖ל זְמָ֑ן Ecclesiastes 3:1.
        # "liberal to all, both old and young" lost its comma on לַכֹּל, Alma 1:30)
        # (...nor a preposition with its own pronoun, whose English preposition is stranded
        # by the relative clause: "in the place of which has been spoken" glosses בּוֹ "of", and
        # the semicolon after it was held hard, Alma 27:16)
        # (...nor the "about" of a phrasal verb: "to bring about the work" glosses לְהָבִיא
        # "to bring about", and the tevir its tifcha needed fell between "the work" and
        # "great", Alma 26:3. Not "was about to", nor the preposition, "about my loins")
        # (...nor מִכֹּל with its holam, the absolute "than all": WLC a disjunctive after it 76
        # times in 96, וּמִכֹּל 9 in 9. "my best beloved brethren" is אַחַי הָאֲהוּבִים מִכֹּל, and the
        # comma went back inside the phrase to הָאֲהוּבִים, Alma 24:12. Not מִכׇּל, the construct)
        # (...nor a verb whose gloss ends in its object pronoun and an adverb: "and taken
        # me in, thou art blessed" glosses וַאֲסַפְתָּנִי "and taken me in", and its "in" held
        # the comma before בָּרוּךְ hard, Alma 8:26)
        # (...and a phrasal verb's particle where the next word brings its own preposition:
        # "and came over into the land of Middoni" is וַיָּבֹאוּ אֶל־אֶרֶץ מִדּוֹנִי, its "over"
        # held hard, and the tifcha fell inside "the land | of Middoni", Alma 21:12)
        # (...and "all" on a word that is no form of כֹּל, a pronoun or an adverb: "But this is
        # not all;" is אַךְ לֹא־זֹאת לְבַד, and its "all" held the semicolon hard, Alma 17:3)
        if BINDS.search(g.rstrip(u' ,;:.\u2014').strip()) and not is_dem(h) and bare(h) != u'הכל' and not kol_holam(h, toks[i + 1][0] if i + 1 < len(toks) else None) \
           and not (ROUND_ABOUT and re.search(r'\bround about$', g.rstrip(u' ,;:.\u2014').strip(), re.I)) \
           and not (STRANDED_PREP and re.match(r'^H(C/)?(R|Rd)/Sp', morph_of(h)) and u'\u05be' not in h) \
           and not (PHRASAL_ABOUT and re.search(r'\b(bring|bringing|brought|dig|digged|dug|go|going|went|wander|wandering|'
                                               r'encircled?|encompass(ed)?|compassed)\s+(\w+\s+)?about$', g.rstrip(u' ,;:.\u2014').strip(), re.I)) \
           and not (PHRASAL_GLOSS and re.search(r'\b(me|him|her|it|us|them|you|thee|himself|herself|themselves|ourselves|yourselves|myself)\s+(in|on|up|out|down|away|off|forth|back|over)$',
                                                g.rstrip(u' ,;:.\u2014').strip(), re.I)) \
           and not (KOL_ART and u'\u05be' not in h and bare(h) in (u'לכל', u'בכל', u'ככל', u'ולכל', u'ובכל', u'והכל')
                    and re.search(r'(^H|/)(Rd|Td)/N', morph_of(h))) \
           and not (MIKOL_ABS and u'\u05be' not in h and bare(h) in (u'מכל', u'ומכל') and u'\u05b9' in h) \
           and not (KOL_SUFFIX.match(bare(h)) and u'\u05bb' in h) \
           and not (ALL_PRONOUN and re.search(r'\ball$', g.rstrip(u' ,;:.\u2014').strip()) and u'כל' not in bare(h)
                    and u'כול' not in bare(h)) \
           and not (PHRASAL_PREP and i + 1 < len(toks) and re.search(r'\b(in|on|over|up|out|down|away|off|forth|back)$', g.rstrip(u' ,;:.\u2014').strip(), re.I)
                    and re.match(r'(to|unto|into|from|upon|on|in|with|against|by|before|after|over|among|at|toward|towards|out of|down to)\b',
                                 toks[i + 1][1].strip(), re.I)) \
           and not (re.search(r'\b(before|after|above|beneath)$', g.rstrip(u' ,;:.\u2014').strip()) and re.search(r'(^H|/)N\w*a$', morph_of(h))): return True
        if CONSTRUCT_PL.search(nfc(h).replace(u'\u05be', u'')): return True
        if i + 1 < len(toks):
            h2, g2 = toks[i + 1]
            # a bare אֶת or כׇּל reaches back; joined by a maqqef to its noun it is
            # the noun's own unit and a phrase ends before it as before any other
            # (וַיַּ֥רְא אֱלֹהִ֖ים אֶת־הָא֑וֹר)
            if u'\u05be' not in h2 and binds_back(h2): return True
            # ...and so does an adverb that closes the phrase before it: אֵלֶּה
            # בִלְבַד is "these only", and a revia between them read "these |
            # only have I commanded" (2 Nephi 11:1; the Tanakh has no בִּלְבַד)
            if bare(h2) in ENCLITIC: return True
            # ...and a compound particle is one word: אַף גַּם "yea, even" (27 in
            # the volume; 11 carried a disjunctive on אַף, 2 Nephi 20:21 אַ֕ף גַּ֖ם)
            if (bare(h), bare(h2)) in COMPOUND: return True
            # ...and "each ... his fellow", אִישׁ אֶל־רֵעֵהוּ, one phrase (WLC divided 8 times in
            # 73; "contention one with another" had a pashta on אִישׁ, Mosiah 18:21)
            if bare(h) in (u'איש', u'ואיש') and re.match(u'^[לבומ]?(רעהו|אחיו|רעותה|אחותה)$', bare(h2).split(u'\u05be')[-1]): return True
            # ...and the pronoun that stands after its noun as "himself" (אֱלֹהִים הוּא "God
            # himself": a revia between them, Mosiah 13:28)
            if u'\u05be' not in h2 and bare(h2) in PRON | PRON3 and re.match(r'(him|her|them|my|your|our|it)sel(f|ves)$', g2.strip().lower()): return True
            # ...and בִּלְתִּי אִם "save, unless" (2 Nephi 1:31 had a zaqef between them),
            # and זוּלַת אִם "except" (a revia between them, Mosiah 8:16)
            if bare(h) in (u'בלתי', u'זולת') and bare(h2).split(u'\u05be')[0] == u'אם': return True
            # this volume glosses a construct "the mercy" + "of the Lord": the
            # "of" on the next word says the two are one chain, unless that
            # word carries a preposition ("ask of God" מֵאֱלֹהִים, "of the
            # reign" לְמַלְכוּת)
            # ...and unless this word is an adjective in the absolute (כַּדּוּר עָגֹל
            # מַעֲשֵׂה חֹשֵׁב "a round ball of curious workmanship", 16:10): the WLC
            # divides after one before a construct noun 100% of the time (80)
            # (...or an ordinal, which no more governs: "the tenth year of the reign of the
            # judges" is הַשָּׁנָה הָעֲשִׂירִית לְמִמְשַׁל־הַשֹּׁפְטִים, and the tifcha fell between
            # הַשָּׁנָה and its ordinal, Alma 15:19; בַּשָּׁנָ֣ת הָעֲשִׂירִ֔ית לְצִדְקִיָּ֖הוּ Jeremiah 32:1; and
            # a cardinal in the absolute, "the eleventh year" בַּשָּׁנָה הָאַחַת עֶשְׂרֵה, 16:1; a number
            # by the word, the table tagging עוֹד a cardinal: לֹא־נִשְׁמַע עוֹד עָלָיו, Helaman 16:8)
            # ...and unless the next word is an adverb ("of a truth" is אׇמְנָם, 19:2)
            # ...or opens with a preposition, אֶת or אֲשֶׁר joined to it, which no construct
            # governs ("tell the king of these things" is לַמֶּלֶךְ אֶת־הַדְּבָרִים, and the
            # joiner wrote לַמֶּלֶךְ־אֶת, Mosiah 20:19; "the Redeemer of the world, of whom" is
            # הָעוֹלָם אֲשֶׁר־דִּבֶּר, and the telisha fell inside גּוֹאֵל הָעוֹלָם, 1 Nephi 11:27.
            # Not כׇּל־: "the whore of all the earth" is the construct זוֹנַת כׇּל־הָאָרֶץ)
            if re.match(r'of\b', g2.strip().lower()) and not (PREP_PREFIX.match(nfc(h2)) and real_prefix(h2)) \
               and not (u'\u05be' in h2 and re.sub(u'^ו', '', bare(h2).split(u'\u05be')[0]) in OF_HEADS) \
               and not re.match(r'^H(Td/)?A%s.*a$' % ('[ao]' if ORD_OF else 'a'), morph_of(h)) \
               and not (ORD_OF and re.match(r'^H(Td/)?Ac.*a$', morph_of(h)) and is_num(h.split(u'\u05be')[-1])) \
               and not morph_of(h2, last=False).startswith('HD'): return True
            # the infinitive absolute before its verb (עָזֹב לֹא־עֲזָבַנִי, מוֹת תָּמוּת), a bare
            # negation at most between them (הַשְׁמֵד לֹא יַשְׁמִידֵם, Jacob 3:6)
            if shares_root(h, h2): return True
            if bare(h2) == u'לא' and i + 2 < len(toks) and shares_root(h, toks[i + 2][0]): return True
            # (...and so are the LORD and God, יְהוָה אֱלֹהִים: the WLC never divides them,
            # 0 of 30, וַיַּצְמַ֞ח יְהוָ֤ה אֱלֹהִים֙ Genesis 2:9; "Yet the Lord God saw" had a
            # pashta between them, Mosiah 3:14. Where the English says "the Lord God":
            # "I, the Lord, am God" has its predicate there, 1 Nephi 17:14. And the
            # Almighty after the Name: "the Lord Omnipotent", יְהוָה הַכֹּל־יָכוֹל, took a
            # revia between them, Mosiah 3:5; after a longer title it stands in
            # apposition, "the Creator of heaven and earth, the Almighty", Jacob 2:5)
            if bare(h).split(u'\u05be')[-1].endswith(u'יהוה') and (
                    (bare(h2) == u'אלהים' and ent and re.search(r'\bLord God\b', ent)) or bare(h2) == u'הכל־יכול'): return True
            # (...and the Name before "his God", "their God": יְהוָה אֱלֹהֵיהֶם, WLC divided 58
            # times in 589, mostly a tifcha before the verse's end; "but the Lord
            # their God" had a pashta between them, Mosiah 23:23)
            if NAME_GOD and bare(h).split(u'\u05be')[-1].endswith(u'יהוה') and u'\u05be' not in h2 \
               and re.match(u'^אלהי(ך|כם|הם|נו|ו|ה|י|כן|הן)$', bare(h2)): return True
            # God and his epithet are one name: אֵ֣ל שַׁדַּ֔י, אֵ֣ל גִּבּ֔וֹר, אֵ֥ל עֶלְיֽוֹן (WLC: divided
            # 2 times in 26; עֵין־אֵ֛ל שַׁדַּ֖י took a tevir, Jacob 2:10)
            if re.sub(u'^[ובלכ]', '', bare(h).split(u'\u05be')[-1]) == u'אל' and bare(h2) in EL_EPITHET: return True
            # a compound numeral (שְׁנֵים עָשָׂר) and a title before a name (אָבִי לֶחִי)
            if bare(h2) in TENS: return True
            # a title before its name (אָבִי לֶחִי), and a pronoun before its name in
            # apposition (בִּי נֶפִי "me, Nephi", לוֹ לֶחִי "him, Lehi", 7:1, 7:6: the
            # Tanakh tags the pronoun HR/Sp1bs, HRd/Sp3ms, HTo/Sp3ms)
            # (...not a name in its preposition's phrase: "their father, Lehi, left Jerusalem"
            # is יָצָא לֶחִי אֲבִיהֶם מִירוּשָׁלַיִם, and "their father ‖ Jerusalem" was held as a title
            # and its name, the tifcha going between Lehi and his title, Alma 18:36)
            if NAME_GLOSS.match(g2.strip()) and title_word(h) and not (TITLE_PREP and u'\u05be' not in h2 and PREP_PREFIX.match(nfc(h2)) and real_prefix(h2)
                        and re.search(r'/Np', morph_of(h2))): return True
            # ...and a name before its "the king" (נֹחַ הַמֶּלֶךְ: the WLC divides between
            # them 4 times in 59; "And it came to pass that king Noah built" had a
            # pashta on נֹחַ, Mosiah 11:8; not before "this king", הַמֶּלֶךְ הַזֶּה, a phrase of
            # its own in apposition, which left בִּנְיָמִין־הַמֶּלֶךְ joined, Words of Mormon 1:3)
            if name_king(i) and not (i + 2 < len(toks) and is_dem(toks[i + 2][0])): return True
            # ...and only where the printed English itself sets the name off with
            # a comma ("against me, Nephi,"): without one the name is the subject
            # after its object (וַיְסַפֵּר לוֹ לָמוֹנִי "Lamoni rehearsed unto him")
            if NAME_GLOSS.match(g2.strip()) and re.match(r'^H(R|Rd|To)/Sp', morph_of(h)) \
               and g2.strip() not in DIVINE and not (i > 0 and SPEECH.search(toks[i - 1][1])) \
               and ent and re.search(r',\s*' + re.escape(g2.strip()) + r'\b', ent): return True
            # a bare demonstrative stays with its noun (לוּחוֹת הַנְּחֹשֶׁת הָאֵלֶּה, 5:18:
            # the WLC divides before one 12% of the time against 61% for any word)
            # (...but not from the adjective of a noun before it: noun, adjective, "this"
            # divides before the demonstrative where it divides at all, כַּדָּבָ֤ר הַגָּדוֹל֙
            # הַזֶּ֔ה Deuteronomy 4:32, WLC 27 times in 30, and the noun from its adjective
            # alone never; "and this great sin" had its pashta on וְהַחֵטְא, Alma 15:3)
            if u'־' not in h2 and is_dem(h2) and not (ADJ_DEM and noun_adj(i)): return True
            # (...and bare אֵלֶּה after a noun with its suffix, the volume's "these my brethren",
            # אַחַי אֵלֶּה, which the pashta divided, Alma 30:44, 29:16. Not after a preposition or
            # אוֹתָם, where it opens the next clause: "and said unto me: These are" is אֵלַי אֵלֶּה,
            # 1 Nephi 13:3; nor לְבַדִּי, Isaiah 49:21's "alone; these, where had they been?")
            if DEM_BARE and u'־' not in h2 and bare(h2) == u'אלה' and re.search(r'(^H|/)Nc\w*/Sp', morph_of(h)) \
               and not re.search(u'בד(י|ו|ה|ך|נו|ם)$', bare(h)): return True
        return False
    FINITE = re.compile(r'^HV.[pivj]')                        # a bare finite verb: no waw, no particle in front
    # a noun, a prepositional phrase, an adjective (not a cardinal: the table this
    # volume reads tags עוֹד "still" HAcmsa where the WLC has HD, and כִּי־ע֤וֹד תֶּהְגּוּ֙
    # took a pashta inside its clause, 2 Nephi 32:8)
    NOMINAL_HEAD = re.compile(r'^H(Td/|R/|Rd/|X/)?(Nc|Np|Aa)')     # (X/: a form read past its prefix, מֵחַטֹּאתֵיכֶם ‖ יִהְיֶה, Jacob 3:8)
    # the negative particle the table tags as a noun (בִּלְתִּי H1115, Ncbsc): it reaches
    # forward to its verb (לְבִלְתִּ֨י יֵדְע֤וּ הַיְּהוּדִים֙, 1 Nephi 4:36; the WLC divides
    # after one 40 times in 99, against 84% for a noun)
    # (and זוּלַת "except", which governs the clause after it: "Nay; except ye make our
    # Creator a liar" took a zaqef on זוּלַת as the end of a clause, Alma 5:25)
    PARTICLE_NOUN = set(u'בלתי לבלתי מבלתי'.split()) | (set(u'זולת זולתי'.split()) if ZULAT_HEAD else set())
    def clause_head(i):
        """THE LINK BEFORE A WORD THAT OPENS A CLAUSE, by the Tanakh's habit and
           not the model's log-odds, which run at a quarter of the rate for these:
           a clause opener (CLAUSE_OPENERS, כִּי at the head of its group), or a bare
           finite verb after a noun, a prepositional phrase or an adjective (WLC: a
           disjunctive before one 5,165 of 6,165, 84%; 87% when a verb already stands
           in the clause). The verb of a new clause set down without a waw:
           בְּכֹחַ רוּחַ־הַקֹּדֶשׁ ‖ יִשָּׂא כֹחַ רוּחַ־הַקֹּדֶשׁ had its zaqef on אִישׁ (2 Nephi
           33:1), אַחֲרֵי קַבֶּלְכֶם אֶת־רוּחַ־הַקֹּדֶשׁ ‖ תּוּכְלוּ on קַבֶּלְכֶם, the verb cut
           from its object (32:2); and an opener, יָדַעְתִּי בָּזֹאת ‖ כִּי, on יָדַעְתִּי (31:16).
           A form the table cannot read is no head: בַּמָּשִׁיחַ ‖ תַּאֲמִינוּ (33:10) waits
           on morph_of, which peels בַּ and not the article's dagesh behind it."""
        if i + 1 >= len(toks): return False
        h, h2 = toks[i][0], toks[i + 1][0]
        p2 = nfc(h2)
        if p2 in CLAUSE_OPENERS or (p2.startswith(KI_MAQQEF) and u'\u05be' not in p2[len(KI_MAQQEF):]): return 'open'
        # (a group that opens with a particle is the head of its own clause already:
        # כִּי־עוֹד, אִם־בִּדְבַר, לֹא־...)
        if u'\u05be' in h and re.match(r'^H(T[crni]|C)', morph_of(h, last=False)): return False
        if bare(h).split(u'\u05be')[-1] in PARTICLE_NOUN: return False
        # (...nor an adjective before its copula, the predicate put first: "for the Spirit of
        # God was strong" is כִּי חָזָק הָיָה רוּחַ אֱלֹהִים, and a pashta cut "strong" from "was",
        # 1 Nephi 17:52; WLC divided 16 times in 33, תָּמִ֥ים הָיָ֖ה Genesis 6:9. Not an adjective
        # on the noun before it, the end of a subject: "although there were many churches
        # they were all one church" is גַּם־כִּי הָיוּ עֵדוֹת רַבּוֹת ‖ הָיוּ כֻלָּם, Mosiah 25:22)
        if COPULA_ADJ and u'\u05be' not in h + h2 and re.match(r'^H(C/)?Aa', morph_of(h)) \
           and not (i >= 1 and (attributive(toks[i - 1][0], h) or re.match(r'^H((C|R|Rd|X|Td)/)*Nc\w*$', morph_of(toks[i - 1][0])))) \
           and bare(h2) in (u'היה', u'היתה', u'היו', u'יהיה', u'תהיה', u'יהיו', u'היית', u'הייתי', u'היינו', u'הייתם'): return False
        # (...nor תָּמִיד "always", the table's noun, before the verb it modifies: the WLC
        # divides after it 3 times in 13, and "which always was with the Nephites" had its
        # zaqef between them as subject and verb, Alma 19:27. After its own verb it ends
        # that clause: "if ye do always remember me ‖ ye shall have", 3 Nephi 18:7)
        if TAMID_ADVERB and u'\u05be' not in h and bare(h) == u'תמיד' \
           and not (i >= 1 and (re.search(r'(^H|/)V', morph_of(toks[i - 1][0]))
                                or (not morph_of(toks[i - 1][0]) and VERB_GLOSS.search(toks[i - 1][1])))): return False
        # (...nor בְּלִי, which governs the word after it: "to pray without ceasing" is
        # לְהִתְפַּלֵּל בְּלִי הֶרֶף, the table reading הֶרֶף as a verb, and a zaqef fell on
        # בְּלִי, Mosiah 26:39)
        if bare(h).split(u'\u05be')[-1] in (u'בלי', u'ובלי', u'מבלי', u'לבלי'): return False
        # ...and a demonstrative closing its phrase (בַּיּוֹם הַהוּא ‖ יֵדְעוּ: WLC a disjunctive
        # after one before a finite verb 97 of 98; "And at that day shall the remnant
        # of our seed know", 1 Nephi 15:14). By the word: the table tags them HTd/Tm
        # and HTd/Pp3ms where the WLC has Pd
        head = NOMINAL_HEAD.match(morph_of(h)) or (u'\u05be' not in h and is_dem(h))
        # ...and an infinitive construct ending its clause, with or without its
        # preposition (WLC: a disjunctive before the finite verb 218 of 234 and 21 of
        # 23; וּבְהַחִלָּם לִצְמֹחַ ‖ תְּפַנּוּ "as they begin to grow ye shall clear
        # away", Jacob 5:65)
        # (not the infinitive of "to be" before its predicate: "being dead unto all good
        # works" is בִּהְיוֹתוֹ מֵת, the table reading מֵת as "he died", Alma 5:42)
        head = head or (re.match(r'^H(R/|Rd/|X/)?V.c', morph_of(h))
                        and not (HAYOT_PRED and re.match(u'^[בכלמ]?היות', bare(h))))
        # (...the table unable to read it, known by its lamed and its "to ...": "whosoever
        # suffered the Lamanites to lead him away ‖ was called" is לַלָּמָנִים לְהַתְעוֹתוֹ
        # נִקְרָא, and the zaqef cut the Lamanites from the verb they govern, Alma 3:10)
        # (not "to his astonishment", a noun; nor before a copula, where the infinitive is
        # the predicate: "the labor which they had to perform was to look" is לַעֲשׂוֹת
        # לְהַבִּיט הָיְתָה, 1 Nephi 17:41)
        head = head or (UNREAD_INF and not morph_of(h) and u'\u05be' not in h and bare(h).startswith(u'ל')
                        and re.match(r'^to (?!(his|her|their|my|your|thy|our|its|the|a|an|this|that|him|them|me|us|you)\b)[a-z]', toks[i][1].strip())
                        and bare(h2) not in (u'היה', u'היתה', u'היו', u'יהיה', u'תהיה', u'יהיו'))
        # ...and a preposition with its suffix closing a verb's clause (WLC: a
        # disjunctive before the next bare finite verb 229 of 251, 91%; וַיֹּאמֶר אֵלָיו
        # ‖ לֵךְ; "when they shall cry unto me ‖ I will be slow" is כִּי יִזְעֲקוּ אֵלַי
        # אֶתְאַפַּק, and the tevir under the tifcha cut the "when" from its answer,
        # Mosiah 11:24)
        head = head or (RSP_HEAD and i >= 1 and re.match(r'^H(R|Rd)/Sp', morph_of(h))
                        and re.search(r'(^H|/)V', morph_of(toks[i - 1][0])))
        # ...and a name the Tanakh does not have, known by its gloss (the WLC count
        # had its names as Np: "at the time that Mosiah discovered them, ‖ they
        # had become" is מְצָאָם מוֹשִׁיָּה הָיוּ, Omni 1:17)
        g = toks[i][1].strip()
        head = head or (not morph_of(h) and u'\u05be' not in h and bool(NAME_GLOSS.match(g)) and g not in DIVINE)
        # (not a head with its own waw, which the WLC count left out: the table
        # reads וְיָמֶיךָ past its waw as HX/ like any prefix, 2 Nephi 2:3; nor a verb
        # the Tanakh also reads as another word: יָבֵשׁ is "dried up" and the
        # adjective "dry" (H3002), and כְּקָנֶה ‖ יָבֵשׁ cut the reed from its
        # adjective, 1 Nephi 17:48)
        if nfc(h).startswith(u'\u05d5'): return False
        # (a verb the table cannot read is known by its gloss, which names its
        # subject as only a finite verb's does here: "if they hold out faithful to
        # the end ‖ they are received into heaven" is עַד־הַקֵּץ יִתְקַבְּלוּ, Mosiah 2:41)
        said = lambda t, h3: not nfc(h3).startswith(u'\u05d5') and \
            re.match(r'(I|you|ye|he|she|it|we|they|thou)\b', re.sub(r'^not\s+', '', toks[t][1].strip()))
        # ...and the verb behind its negation: the WLC divides before לֹא־ and its
        # finite verb 359 times in 397 after such a head, before a bare לֹא and its
        # verb 485 in 485 ("if little children could sin ‖ they could not be saved"
        # is לַחֲטֹא לֹא־יוּכְלוּ לְהִוָּשַׁעַ, Mosiah 3:16)
        # ...and the copula between a subject and its predicate: the WLC divides
        # before הוּא, הִיא, הֵם there 129 times in 152 (יְהוָה֙ ה֣וּא הָאֱלֹהִ֔ים); "the king of
        # the people who are in the land of Zarahemla ‖ is the man" had its segolta
        # inside the subject, Mosiah 8:14. Not the copula that closes its clause
        # ("a mighty man he is," copula_after)
        # The subject is a definite noun or a name; an adjective or a bare noun
        # there is the predicate set first, its pronoun the subject: חָזָק הוּא "he
        # is mightier", דְּמוּת הוּא "it was a representation" (1 Nephi 4:1, 15:32)
        if u'\u05be' not in h2 and bare(h2) in PRON3 and i + 2 < len(toks) and (i + 1) not in printed \
           and re.match(r'^H(Td/|R/|Rd/)?(Nc|Np|Aa|V)', morph_of(toks[i + 2][0], last=False)):
            m1 = morph_of(h)
            # (a name the table cannot read, its gloss "Zarahemla" or "of Zarahemla",
            # the end of a construct chain: "the king of the people who are in the
            # land of Zarahemla ‖ is the man", Mosiah 8:14)
            subject = bool(re.search(r'(^H|/)(Td|Rd)/|/Sp|(^H|/)Np', m1) and re.search(r'(^H|/)(Nc|Np)', m1)) or (
                not m1 and bool(re.search(r"(^|\s)[A-Z][a-z']+$", g)) and g not in DIVINE)
            return 'verb' if subject else False
        if bare(h2).split(u'\u05be')[0] == u'לא':
            if u'\u05be' in h2: vm, vt = morph_of(h2), i + 1
            elif i + 2 < len(toks): vm, vt = morph_of(toks[i + 2][0], last=False), i + 2
            else: return False
            finite = FINITE.match(vm) or (not vm and said(vt, toks[vt][0].split(u'\u05be')[-1]))
            return 'verb' if (head and finite) else False
        e2 = attested(nfc(h2).split(u'\u05be')[0])
        if e2 and len(e2) > 4 and e2[4]: return False
        finite = FINITE.match(morph_of(h2, last=False)) or (
            not morph_of(h2, last=False) and u'\u05be' not in h2 and said(i + 1, h2))
        return 'verb' if (head and finite) else False
    def said_first(e):
        """the English says the word after e before e's own last word: "a shallow
           covering" for בְּכִסּוּי דַּק, "precious things" for חֲפָצִים יְקָרִים: the second
           word is the first's adjective, whatever the table can read of them"""
        nw, aw = _words(toks[e][1])[-1:], _words(toks[e + 1][1])
        return bool(ent and nw and aw and
                    re.search(r'\b%s\s+%s\b' % (r'\s+'.join(map(re.escape, aw)), re.escape(nw[0])), ent, re.I))
    def weight(i, hi, glabel, near):
        s = score(i)
        if hard(i): s += HARD
        # a clause head weighs what the Tanakh says of it, whatever the model's
        # figure (the house rules below and the near window still count against it)
        elif clause_head(i): s = max(s, STRONG)
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
            # A NAME HOLDS ITS KIN TITLE: יוֹסֵף אָחִי "Joseph my brother", לֶחִי אָבִי (WLC:
            # a disjunctive between a name and a following kin word 60 times in
            # 488; וְיוֹסֵ֗ף אָחִי֙ took a revia, Jacob 1:18)
            if kin_after_name(toks, i): s = min(s, NOMINAL)
            # A CLOSE PAIR IS ONE PHRASE: the waw pointed with qamats joins a fixed pair
            # (שָׁמַיִם וָאָרֶץ, דָּ֣ם וָאֵ֔שׁ, כִנּ֨וֹר וָנֶ֜בֶל); WLC: a noun before one is divided 21%
            # of the time, by a major divider 13%, against 73% and 51% before a plain
            # וְ, as seldom as a construct ("Creator of heaven ‖ and earth" had a zaqef
            # inside it, Jacob 2:5). Where the pair ends the domain the forced near
            # divider falls on its first member, זָהָ֥ב וָכֶ֖סֶף, as the Masoretes write it
            # (held hard there too, זָהָב־וָכֶסֶף was joined by a maqqef, Jacob 2:12)
            if nfc(h2).startswith(u'\u05d5\u05b8') and re.match(r'^HC/N', morph_of(h2, last=False)) \
               and re.match(r'^H(Td/|R/|Rd/)?N', morph_of(h)):
                s = min(s, NOMINAL) if (hi is not None and i + 1 == hi) else s + HARD
            # A WORD AND ITSELF: הֵנָּה וָהֵנָּה "hither and thither" (4:2; 2 Kings 2:8
            # וַיֵּחָצ֖וּ הֵ֥נָּה וָהֵֽנָּה), דּוֹר וָדוֹר, יוֹם וָיוֹם: one phrase
            if PLAIN_WAW.match(nfc(h2)) and bare(nfc(h2)[2:]) == bare(nfc(h)): s = min(s, NOMINAL)
            # A CONSTRUCT FORM REACHES FORWARD whatever its gloss says (גְּדָל
            # קוֹמָה "large in stature"), and a noun holds its adjective (כֹּחַ
            # רַב): the Tanakh's own analysis of the form, as a weak link
            if construct(h, h2, toks[i + 1][1]) or attributive(h, h2) or adj_pair(toks, i): s = min(s, NOMINAL)
            # (...and an unread noun its adjective, by the English's order: "with a shallow
            # covering" is בְּכִסּוּי דַּק, and the pashta fell between them, Alma 16:11. Not a
            # verb, by its gloss: "ye shall be utterly destroyed" is תֻּשְׁמְדוּ כָּלִיל, Helaman
            # 7:24; nor a definite noun before a bare adjective, its predicate: "our knowledge
            # shall be perfect" is דַעְתֵּנוּ תְּמִימָה, 2 Nephi 9:13)
            if ENG_ADJ and not morph_of(h) and u'\u05be' not in h + h2 \
               and re.match(r'^HAa\w*a$', morph_of(h2, last=False)) and said_first(i) \
               and not VERB_GLOSS.search(toks[i][1]) \
               and not re.match(r"^(and |with |in |of |to |for |by |from |unto |upon )?(the|my|our|his|her|its|their|your|thy)\b",
                                toks[i][1].strip().lower()): s = min(s, NOMINAL)
            # TWO CONSTRUCTS ON ONE HEAD ARE A PAIR: "the land of Nephi and the land of Zarahemla
            # were nearly surrounded" is אֶרֶץ נֶפִי וְאֶרֶץ זָרַהֶמְלָה מֻקָּפוֹת, and a zaqef split the
            # subject while its predicate went undivided, Alma 22:32
            # (not where the pair ends the domain, whose near divider goes inside it as the
            # Masoretes' does, בֵּ֥ין הָא֖וֹר וּבֵ֥ין הַחֹֽשֶׁךְ: "in the land of Zarahemla and in the land
            # round about" kept its revia between them, Alma 50:9)
            if SAME_HEAD_PAIR and i >= 1 and u'\u05be' not in h2 and PLAIN_WAW.match(nfc(h2), toks[i + 1][1]) \
               and u'\u05be' not in toks[i - 1][0] and bare(nfc(h2)[2:]) == bare(toks[i - 1][0]) \
               and construct(toks[i - 1][0], h, toks[i][1]) and (hi is None or i + 2 < hi): s = min(s, NOMINAL)
            # (...and a noun its number with the article, an ordinal by its use: "until the
            # fourteenth year" is עַד הַשָּׁנָה הָאַרְבַּע עֶשְׂרֵה, the table reading הָאַרְבַּע as the
            # place Arba, and a zaqef fell between them, Alma 16:12)
            if NUM_ATTR and u'\u05be' not in h + h2 and re.search(r'(^H|/)(Td/|Rd/)?Nc', morph_of(h)) \
               and bare(h2)[:1] == u'ה' and bare(h2)[1:] in NUMN: s = min(s, NOMINAL)
            # (...and an unread name its "one", as a noun does: "of one Coriantumr" is
            # כָּרִיאַנְתוּמְר אֶחָד, and the tevir fell between them, Omni 1:21)
            if UNREAD_NAME_CSTR and u'\u05be' not in h2 and bare(h2) in (u'אחד', u'אחת') and not morph_of(h) \
               and NAME_GLOSS.match(toks[i][1].strip()): s = min(s, NOMINAL)
            # A WAYYIQTOL HOLDS ITS SUBJECT (verb_subject: the model alone put a
            # zaqef gadol on וַיֹּ֕אמֶר before יְהוָה in 2:19, its "and said" being
            # clause-final so often in the glosses)
            if verb_subject(toks, i): s = min(s, NOMINAL)
            # A CLOSING PAIR IS DIVIDED INSIDE LESS THAN AFTER IT: "between the heavens
            # and the earth, that what he had taught" had its zaqef between the two
            # (the model's 17.7 for a clause-final הַשָּׁמַיִם) and the earth went with
            # the next clause, Alma 1:15; "every priest and teacher ought" the same,
            # 1:3. Where the pair ends a phrase the Masoretes put the higher divider
            # after it (בֵּ֥ין הַשָּׁמַ֖יִם וּבֵ֣ין הָאָ֑רֶץ 2 Samuel 18:9, תֹ֙הוּ֙ וָבֹ֔הוּ); not
            # where the English marks the inside link, nor where the second member
            # reaches on (an adjective, a construct, a third "and"-member)
            # (two members alike: the same preposition, both definite or neither, nouns
            # with nouns or participles, adjectives with adjectives or participles:
            # "in Zion, and he that remaineth" is no pair, Isaiah's בְּצִיּ֗וֹן וְהַנּוֹתָר֙;
            # "a goodly father, and a mother goodly" neither, 1 Nephi 1:1. The second
            # member ends its phrase: not before its own adjective ("war and much
            # contention", Omni 1:10), its apposition (וּבְנוֹ יְחִידוֹ, Jacob 4:5) or a
            # relative clause; and the pair stands clear of the governor, where the
            # forced near divider falls inside it as the Masoretes' often does,
            # לְא֖וֹת וּלְמוֹפֵ֑ת, Deuteronomy 28:46)
            if PAIR_CAP and i not in printed and i + 2 < len(toks) and (hi is None or i + 2 < hi) \
               and PLAIN_WAW.match(nfc(h2)) and (not PLAIN_WAW.match(nfc(h)) or (PAIR_OPENS and i == 0)) \
               and u'\u05be' not in h2 \
               and pair_alike(h, h2) and not (i >= 1 and attributive(toks[i - 1][0], h)) \
               and not PLAIN_WAW.match(nfc(toks[i + 2][0])) and not hard(i + 1) \
               and not (construct(h2, toks[i + 2][0]) or attributive(h2, toks[i + 2][0])) \
               and not bare(toks[i + 2][0]).startswith(u'אשר') and morph_of(toks[i + 2][0], last=False) \
               and not (re.match(r'^H(Td/)?(N[cp]|Aa|V\w?r)', morph_of(toks[i + 2][0], last=False))
                        and definite(morph_of(toks[i + 2][0], last=False)) == definite(morph_of(h2))):
                outer = score(i + 1)
                if clause_head(i + 1): outer = max(outer, STRONG)
                if i + 1 in printed: outer += BOUND
                s = min(s, outer - 1.0)
            # THE ENGLISH'S COMMA AFTER THE "AND"-WORD, AND NONE BEFORE IT: "who believed in
            # the commandments of God and kept them, were called" is בְּמִצְוֹת הָאֱלֹהִים
            # וַיִּשְׁמְרוּם נִקְרְאוּ, and the model's 18.7 after הָאֱלֹהִים took the zaqef from
            # the end of the subject (Alma 3:11). The two words the English joins are
            # divided less than the link it marks after them
            # (the English says the "and"-word's own words just before its mark, "and kept
            # them,": "we did beat them again," is no mark of וַנַּכֵּם's, Mormon 3:7; not a
            # negation, whose clause runs on past it, "they toil not, neither do they
            # spin", 3 Nephi 13:28; and clear of the governor, as the pair rule above)
            g2w = _words(toks[i + 1][1])
            if PAIR_PRINTED and i not in printed and i + 1 in printed and nfc(h2).startswith(u'\u05d5') \
               and not nfc(h).startswith(u'\u05d5') and u'\u05be' not in h2 and not hard(i + 1) \
               and bare(h2) not in (u'ולא', u'ואל', u'ואין', u'ובל') and (hi is None or i + 2 < hi) \
               and g2w and ent and re.search(r'\b%s\s*[,;:.]' % re.escape(g2w[-1]), ent, re.I):
                outer = score(i + 1)
                if clause_head(i + 1): outer = max(outer, STRONG)
                s = min(s, outer + BOUND - 1.0)
            # A NUMBER AND ITS "AND"-NUMBER ARE ONE COUNT: "thousands and tens of thousands
            # of souls" is אֲלָפִים וְרִבְבוֹת נְפָשׁוֹת, and the model's clause-final
            # "thousands" put a segolta between them (Alma 3:26); WLC a disjunctive
            # inside a compound number 155 times in 541, as seldom as after a construct
            if NUM_PAIR and u'\u05be' not in h and u'\u05be' not in h2 and is_num(h) \
               and nfc(h2).startswith(u'\u05d5') and is_num(h2, True): s = min(s, NOMINAL - (4.0 if NUM_TIGHT else 0.0))
            # (...and held below a construct, which takes the forced division instead: "in the
            # commencement of the twenty and first year" is בִּתְחִלַּת שְׁנַת עֶשְׂרִים וְאַחַת, and the
            # tevir fell inside the number, Alma 50:17; after "year of"/"son of" the WLC divides
            # inside the number once in 19, after the construct twice, 1 Kings 16:10 בִּשְׁנַת֙ עֶשְׂרִ֣ים
            # וָשֶׁ֔בַע; inside a compound number 30 times in 241. The volume had it 68 in 135)
            # ("if not" before the answer's own negation is the ellipsis itself)
            if IMLO and is_imlo(i) and (bare(h2).startswith(u'לא') or imlo_en(i)): s = max(s, STRONG)
            # "THE HIGH PRIEST" IS A TITLE: הַכֹּהֵן הַגָּדוֹל, divided once in 21 in the WLC
            # (Nehemiah 3:20); "and am the high priest" put the pashta between them, Alma 8:23.
            # Held just short of the joiner, which would write a maqqef the Masoretes never do
            # (...and "the chief judge", הַשֹּׁפֵט הָרֹאשׁ, the volume's own title: "the chief judge sent
            # a proclamation" put the tevir between them, Alma 27:21)
            if HIGH_PRIEST and u'\u05be' not in h + h2 and ((bare(h).endswith(u'הכהן') and bare(h2) in (u'הגדול', u'הגדל'))
                                                          or (CHIEF_JUDGE and chief_judge(h, h2))):
                s = min(s, GIVE_UP + 1.0)
            # A SUFFIXED NOUN HOLDS ITS ADJECTIVE when the link before the noun is free: "I
            # thank my great God" is אוֹדֶה לֵאלֹהַי הַגָּדוֹל, and the pashta fell between God and
            # great, Alma 24:8. After a finite verb the WLC divides before the noun 21 times in
            # 22 (שֻׁבוּ מִדַּרְכֵיכֶם הָרָעִים) and inside the phrase alone once; a noun divided
            # from its adjective has its own link bound (a construct before it, בֹּהֶן יָדוֹ
            # הַיְמָנִית) or no room left (the domain's last two words, וּמַעַלְלֵיכֶ֖ם הָרָעִ֑ים)
            # (...an unread article word too, by a gloss no noun's or verb's: "my beloved
            # people" is עַמִּי הָאָהוּב, and the tifcha fell between them, Alma 24:7; the article's
            # vowel, not the hiphil's: בִּדְבָרוֹ הִשְׁמִידָם, 1 Nephi 17:31)
            g2s = toks[i + 1][1].strip()
            unread_adj = not morph_of(h2, last=False) and re.match(u'^\u05d4[\u05b6\u05b7\u05b8]', nfc(h2)) \
                and not re.match(r'^(the|a|an|of)\b', g2s.lower()) and not VERB_GLOSS.search(g2s) and not NAME_GLOSS.match(g2s)
            if SFX_ADJ and i >= 1 and u'\u05be' not in h + h2 and re.search(r'(^H|/)Nc\w*/Sp', morph_of(h)) \
               and (re.match(r'^HTd/Aa', morph_of(h2, last=False)) or unread_adj) and not hard(i - 1) \
               and not construct(toks[i - 1][0], h, toks[i][1]):
                outer = score(i - 1)
                if clause_head(i - 1): outer = max(outer, STRONG)
                if i - 1 in printed: outer += BOUND
                # (never below a nominal link: held under the joiner's floor, a domain of the
                # two words alone would get the maqqef the Masoretes never write there)
                s = min(s, max(outer - 1.0, NOMINAL))
            # NOUN, ADJECTIVE, "THIS" IS ONE PHRASE, divided where it must be before the
            # demonstrative (WLC 27 of 30, after the noun alone never; hard() leaves that
            # link open for it): a forced near divider falls on the adjective, כַּדָּבָ֤ר
            # הַגָּדוֹל֙ הַזֶּ֔ה, and a free division looks elsewhere ("and who hath | this great
            # gift from God" kept its zaqef on ל֔וֹ, Mosiah 8:14)
            if ADJ_DEM and noun_adj(i): s = min(s, NOMINAL + 1.0)
            if ADJ_DEM and noun_adj(i + 1): s = min(s, NOMINAL - 1.0)
            # AFTER A BARE וְגַם the Tanakh divides about half the time (VEGAM_FLOOR: log-odds
            # near zero); the model's -7 for it put the tevir between a noun and its adjective
            # instead, וְגַ֥ם עָמָ֛ל רַ֖ב "and also much labor", Alma 17:5
            if VEGAM_FLOOR and u'\u05be' not in h and bare(h) == u'וגם' and not hard(i): s = max(s, -2.0)
            # BARE לְבַד "ALONE, ONLY" STAYS WITH ITS WORD, as this volume uses it ten times in
            # eleven ("But this is not all" is אַךְ לֹא־זֹאת לְבַד, and a pashta fell between
            # them, Alma 17:3); not the preposition, "save it were" (Alma 22:1), which the
            # Tanakh's bare לְבַד always is (divided before 26 times in 28). A weight, not a
            # wall: held hard, the joiner wrote זֹאת־לְבַד, a maqqef the Masoretes never do
            if LEVAD_AFTER and u'\u05be' not in h2 and bare(h2) == u'לבד' \
               and not re.match(r'(save|except|besides?|apart)\b', toks[i + 1][1].strip().lower()): s = min(s, NOMINAL - 2.0)
            # A PARTICIPLE HOLDS ITS PRONOUN SUBJECT: "I say unto you" is אֹמֵר אֲנִי לְךָ, and the
            # pashta fell between the participle and its "I" 125 times in this volume (אֹמֵר֙ אֲנִ֣י
            # לְךָ֔, Alma 36:5) where the WLC divides after the pronoun 52 times in 63 and after the
            # participle alone 9. Held under the link after the pronoun, never below a nominal one
            # (not the article's participle, a noun: "the mother of harlots, she is the church" is
            # אֵם הַזּוֹנוֹת הִיא הָעֵדָה, 1 Nephi 14:17)
            if PTC_PRO and i + 2 < len(toks) and u'\u05be' not in h + h2 and re.match(r'^H(C/)?V.[rs]', morph_of(h)) \
               and bare(h2) in PRON | PRON3 and not hard(i + 1):
                s = min(s, max(score(i + 1) - 1.0, NOMINAL))
            # AFTER A BARE אַךְ the Tanakh divides 29% of the time (log-odds -0.9); the
            # model's "nevertheless" said 2.2 and put a zaqef gadol on אַ֕ךְ alone,
            # Alma 1:16
            if AKH_CAP and u'\u05be' not in h and bare(h) in (u'אך', u'ואך'): s = min(s, -0.9)
        if near is not None and i < near: s += FAR * (near - i)
        return s
    # (by the word: the table tags אַחֲרֵי and עוֹד as cardinals)
    NUMN = NUM_WORDS
    def is_num(h, waw=False):
        b = bare(h)[1:] if waw else bare(h)
        return b in NUMN or (b[:1] in u'בלכמ' and b[1:] in NUMN)
    definite = lambda m: bool(re.search(r'(Td/|Rd/|/S|Np)', m))
    def pair_alike(h, h2):
        # ("from this time forth" closes on its וָהָלְאָה as a pair closes: וּמִיּ֤וֹם
        # הַשְּׁמִינִי֙ וָהָ֔לְאָה, Leviticus 22:27; the zaqef went inside it, Mormon 3:11)
        if bare(h2) == u'והלאה': return True
        # (a pair that opens the verse carries the waw that joins it to the verse before:
        # "The spirit and the body shall be reunited" is וְהָרוּחַ וְהַגְּוִיָּה יִתְאַחֲדוּ, and a
        # revia split them, Alma 11:43)
        m1, m2 = re.sub(r'^HC/', 'H', morph_of(h)), re.sub(r'^HC/', 'H', morph_of(h2))
        k1 = re.match(r'^H(R/|Rd/)?(Td/)?(N[cp]|Aa|V\w?r)', m1)
        k2 = re.match(r'^H(R/|Rd/)?(Td/)?(N[cp]|Aa|V\w?r)', m2)
        if not (k1 and k2): return False
        if bool(k1.group(1)) != bool(k2.group(1)): return False
        if k1.group(1) and nfc(h.split(u'\u05be')[-1])[:1] != bare(h2)[1:2]: return False
        if definite(m1) != definite(m2): return False
        # (a name pairs with a name, or with its kin: "in the name of Jesus, and the
        # very trees obey us" is no pair, Jacob 4:6)
        cat = lambda k: 'A' if k.group(3) == 'Aa' else ('P' if k.group(3).startswith('V') else k.group(3))
        c1, c2 = cat(k1), cat(k2)
        if 'Np' in (c1, c2) and c1 != c2 and not (c1 == 'Np' and KIN.match(bare(h2)[1:])): return False
        return (c1, c2) not in (('Nc', 'A'), ('A', 'Nc'), ('Np', 'A'), ('A', 'Np'))
    printed = set()        # the links the printed English marks, filled per verse by the caller
    def weakest(units, lo, hi, glabel=None, near=None):
        # a link the printed English marks is where a forced division of a
        # higher rank goes, before any link the model alone prefers (the
        # model's own strong links get no such bonus: that would count its
        # opinion twice)
        # (...save the commas inside a list, where a clause is divided: the division
        # that stands for them is the one after the list's last member. "every
        # nation, kindred, tongue, and people shall see" had a zaqef inside the
        # list and none at its end, Mosiah 16:1)
        def total(i):
            if LIST_IN_CLAUSE and glabel in ('silluq', 'etnachta'):
                lc = list_comma(i) if i in printed else None
                if lc is not None and lc != i: return weight(i, hi, glabel, near)
                if any(list_comma(j) == i for j in printed if j < i): return weight(i, hi, glabel, near) + BOUND
            return weight(i, hi, glabel, near) + (BOUND if i in printed else 0.0)
        cands = [i for i in range(lo, hi) if i + 1 < len(toks) and not getattr(units[i], 'locked', False)]
        if not cands: return None
        # A PARTICLE IN THE NEAR WINDOW IS JOINED BEFORE THE SEARCH WIDENS: "can ye
        # withstand these sayings" is הֲתוּכְלוּ לַעֲמֹד נֶגֶד הַדְּבָרִים הָאֵלֶּה, and with
        # only נֶגֶד and its noun beside the zaqef the division went two words back to
        # הֲתוּכְלוּ, a revia between "can ye" and "withstand" (Alma 5:53); the Masoretes
        # write נֶגֶד־ and the pashta falls on the infinitive
        if JOIN_FIRST_NEAR and near is not None:
            win = [i for i in cands if i >= near]
            if win and all(total(i) <= GIVE_UP for i in win) and \
               any(proclitic(toks, i) and not getattr(units[i], 'joined', False)
                   and not getattr(units[i], 'prejoined', False) for i in win):
                return None
        best = max(cands, key=total)
        # A NOUN KEEPS ITS ADJECTIVE WHERE A PARTICLE CAN JOIN INSTEAD: "and there is
        # none other salvation" is וְאֵין יְשׁוּעָה אַחֶרֶת before its zaqef, and the pashta
        # its one servant forced fell between יְשׁוּעָה and אַחֶרֶת (Mosiah 4:8); the
        # Masoretes write the particle with a maqqef, וְאֵין־
        # (...and a title, the chief judge as the high priest: "and also before the chief judge"
        # is וְגַם לִפְנֵי הַשֹּׁפֵט הָרֹאשׁ, and the tevir fell inside the title, Alma 30:21)
        title = lambda k: k + 1 < len(toks) and u'\u05be' not in toks[k][0] + toks[k + 1][0] and (
            (bare(toks[k][0]).endswith(u'הכהן') and bare(toks[k + 1][0]) in (u'הגדול', u'הגדל'))
            or (CHIEF_JUDGE and chief_judge(toks[k][0], toks[k + 1][0])))
        if JOIN_FIRST and best not in printed and (i_attr(best) or title(best) or (best + 1 < len(toks) and construct(toks[best][0], toks[best + 1][0]))) \
           and best - 1 in cands and \
           ((nfc(toks[best - 1][0]) in NEVER_AFTER | PROCLITIC and not kol_holam(toks[best - 1][0], toks[best][0]))
            or bare(toks[best - 1][0]) in (u'אין', u'ואין', u'ולא')
            or (nfc(toks[best - 1][0]) in WAW_PROC_BARE and u'\u05be' not in toks[best][0])):
            return None
        # (...and the negation before its verb and "again": "and they did no more attempt"
        # is וְלֹא נִסּוּ עוֹד, and the pashta fell between the verb and עוֹד, Alma 25:1. Before a
        # zaqef or pashta the WLC joins it 51 times, וְלֹא־יָסְפ֣וּ ע֔וֹד; free, the verb takes
        # the tifcha of a clause's end, וְלֹ֥א יִרְגַּ֖ז ע֑וֹד, 19 of 20)
        if LO_OD and glabel not in ('silluq', 'etnachta') and best not in printed and best - 1 in cands \
           and best + 1 < len(toks) and bare(toks[best + 1][0]) == u'עוד' and u'\u05be' not in toks[best][0] \
           and bare(nfc(toks[best - 1][0]).split(u'\u05be')[-1]) in (u'לא', u'ולא'):
            # (the negation behind a maqqef too: "that ye lead away the hearts of no more" is
            # כִּי־לֹא תַתְעֶה עוֹד, and the pashta fell between the verb and עוֹד, Alma 39:13)
            return None
        # (dividing a merely unlikely link rather than joining was tried for
        # 1 Nephi 4:4 and gave אֶת־אֲשֶׁ֥ר צִוָּ֛ה יְהוָ֖ה and כִּ֥י אֵין֙ יְהוָ֔ה: a verb
        # cut from its subject; the join, אֲשֶׁר־צִוָּ֥ה, is the Masoretes' own)
        return best if total(best) > GIVE_UP else None
    i_attr = lambda i: i + 1 < len(toks) and attributive(toks[i][0], toks[i + 1][0])
    def joiner(units, lo, hi):
        """the word in [lo, hi) to write as if a maqqef joined it to the next: a
           particle first (כִּי, לֹא, אֶל: the ones the Masoretes join), nearest the
           governor; then any word that reaches forward"""
        pre = lambda i: getattr(units[i], 'prejoined', False)
        done = lambda i: pre(i) or (JOIN_SKIP and getattr(units[i], 'joined', False))
        for i in range(hi - 1, lo - 1, -1):
            if done(i): continue
            if i + 1 < len(toks) and ((nfc(toks[i][0]) in NEVER_AFTER and not kol_holam(toks[i][0], toks[i + 1][0]))
                                      or bare(toks[i][0]) in (u'אין', u'ואין', u'ולא')): return i
        # then a bare preposition (עַל, עַד, אֵין: אֲשֶׁר־אֵ֥ין כָּמוֹה֖וּ joins the
        # clause particle first, 1 Nephi 17:42)
        for i in range(hi - 1, lo - 1, -1):
            if done(i): continue
            if i + 1 < len(toks) and proclitic(toks, i): return i
        # (never the Name or God: a maqqef after them is no Masoretic writing, and
        # נָתַן יְהוָה־אֱלֹהִים took one, 2 Nephi 2:16)
        # (nor before a demonstrative, which the Masoretes never join: הַמֶּלֶךְ־הַזֶּה,
        # Words of Mormon 1:3)
        # (...nor a name to its "the king", nor the construct before them: the division
        # goes before the name, מִפְּנֵ֖י שְׁלֹמֹ֣ה הַמֶּ֑לֶךְ, 2 Chronicles 10:2; WLC 7 of 8.
        # נֹחַ־הַמֶּלֶךְ was joined, Mosiah 18:1. Nor "the king" to the name after it: the
        # WLC writes הַמֶּלֶךְ־ before a name 8 times in 154, and וַיְצַ֣ו הַמֶּלֶךְ־נֹ֔חַ had
        # its division due on the verb, Mosiah 12:17)
        king_name = lambda i: bare(toks[i][0]) in (u'המלך', u'המלכה') and i + 1 < len(toks) and (
            bool(re.search(r'(^H|/)Np', morph_of(toks[i + 1][0]))) or (not morph_of(toks[i + 1][0])
            and bool(NAME_GLOSS.match(toks[i + 1][1].strip())) and toks[i + 1][1].strip() not in DIVINE))
        # (...and that only for the first join of a domain: a particle joined, the
        # next join is another particle or none, and the division the tail still
        # needs falls where the Masoretes put it between long words; joined on,
        # "these things which I have spoken" became הָאֵלֶּה־אֲשֶׁר־דִּבַּרְתִּי, 1 Nephi 10:16)
        if JOIN_SKIP and any(done(k) for k in range(lo, hi)): return None
        for i in range(hi - 1, lo - 1, -1):
            if pre(i): continue
            if i + 1 < len(toks) and hard(i) and not re.search(u'(יהוה|אלהים)$', bare(toks[i][0])) and not kol_holam(toks[i][0], toks[i + 1][0]) \
               and not is_dem(toks[i + 1][0]) and not name_king(i) and not name_king(i + 1) \
               and not king_name(i):
                # (...nor after a finite verb or a preposition with its suffix, which end
                # their phrase: past the demonstrative the joiner wrote הֵעִידוּ־עַל־הַדְּבָרִים,
                # 1 Nephi 10:5, and עֲלֵיהֶם־אֶת־הַדְּבָרִים, 2 Nephi 5:31; the division then
                # goes beside the governor, הֵעִ֖ידוּ עַל־הַדְּבָרִ֣ים הָאֵ֑לֶּה)
                # (nor a preposition with its suffix, Rd/ as well as R/: עָלָיו־עֲמוּלֶק, Alma 12:24)
                if JOIN_VERB or not re.search(r'(^H|/)V\w[pqiwhjv]|^H(C/)?Rd?/Sp', morph_of(toks[i][0])): return i
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
        # (an apposition the English sets off on both sides: "into the hands of my
        # son Moroni, behold" closes a clause, and held as an apposition it left
        # the etnachta to "my people, the Nephites", Words of Mormon 1:1)
        if ent and not re.search(r',\s*' + re.escape(g) + r'\b', ent): return False
        return title_word(toks[i - 1][0]) or bool(re.match(r'^H(R|Rd|To)/Sp', morph_of(toks[i - 1][0])))
    def list_comma(i):
        """The commas inside a list of nouns, "nations, kindreds, tongues, and
           people shall dwell" (22:28): a run of two or more marked nouns in a
           row whose next word is the "and"-noun that ends the list. The
           English's commas, which halved the verse inside its subject; the
           division that stands for them is the one after the list's last
           member. Returns that member's index, or None. One marked noun
           before an "and"-noun is no list ("filled with joy, and my mother",
           5:1)."""
        # a member of the list by its last word (כׇּל־הַגּוֹיִם is one), the closing
        # "and"-noun by its first; a form the Tanakh lacks reads past its prefix (HX/)
        noun = lambda k, last=True: bool(re.match(r'^H(Td/)?(Nc|Aa|Np)', re.sub(r'^H[CX]/', 'H', morph_of(toks[k][0], last=last))))
        if i not in printed or not noun(i): return None
        lo, hi = i, i
        while lo - 1 in printed and noun(lo - 1): lo -= 1
        while hi + 1 in printed and noun(hi + 1): hi += 1
        # (...or the closing member is its preposition's maqqef group: "with Abraham, with
        # Isaac, and with Jacob" is עִם־אַבְרָהָם וְעִם־יִצְחָק וְעִם־יַעֲקֹב, and the etnachta
        # fell after Isaac, Alma 5:24)
        # (the same preposition as the members': "against the wicked, according to the
        # truth; and the righteous" is no list, 1 Nephi 16:2)
        head = lambda k: re.sub(u'^ו', '', bare(toks[k][0])).split(u'־')[0] if u'־' in toks[k][0] else None
        def closer(k):
            t = nfc(toks[k][0])
            if not PLAIN_WAW.match(t): return False
            if u'־' not in t: return noun(k, False)
            return LIST_PREP and head(k) in OF_HEADS and noun(k, True) and head(k) == head(k - 1)
        # the last member with its adjective or participle ("and fine-twined
        # linen" is וְשֵׁשׁ מׇשְׁזָר, 13:7: the division after שֵׁשׁ cut the phrase)
        # (...and over a construct chain: "and flocks of herds," is וְעֶדְרֵי בְהֵמוֹת, and
        # the list's end on וְעֶדְרֵי took the etnachta inside it, Enos 1:21)
        # (an unread adjective by the English's order: "and of precious things" is
        # וַחֲפָצִים יְקָרִים, the adjective said first, Ether 9:17)
        adj_said_first = lambda e: not morph_of(toks[e + 1][0], last=False) and said_first(e)
        def member_end(e):
            h = nfc(toks[e][0]); h = h[2:] if PLAIN_WAW.match(h) else h
            if e + 1 < len(toks) and (attributive(h, toks[e + 1][0]) or adj_said_first(e) or
               (re.match(r'^H(Td/)?(Nc|Ac|Aa)', morph_of(h)) and re.match(r'^H(Td/)?V.[rs]', morph_of(toks[e + 1][0], last=False)))): e += 1
            while e + 1 < len(toks) and (construct(toks[e][0], toks[e + 1][0]) or CONSTRUCT_PL.search(nfc(toks[e][0]))):
                e += 1
            return e
        # (a closing member whose adjective ends the verse closes nothing inside it:
        # "and of precious things;" is וַחֲפָצִים יְקָרִים, and the etnachta fell between
        # them, Ether 9:17)
        closed = hi - lo + 1 >= 2 and hi + 1 < len(toks) and closer(hi + 1) \
            and not (member_end(hi + 1) > hi + 1 and member_end(hi + 1) == len(toks) - 1)
        # (...or whose closing "and"-member carries the comma that ends the list:
        # "the great, and the last, and the only sure foundation, upon which" is
        # גָּדוֹל וְאַחֲרוֹן וְיָחִיד אֲשֶׁר, all three marked, and the etnachta fell on the
        # first, Jacob 4:16)
        # (...or two alike, both marked: "upon the poor, and the needy, and in withholding"
        # is לָעֲנִיִּים וְלָאֶבְיוֹנִים וְלִמְנֹעַ, and the etnachta fell between the two, Alma 5:55)
        if not closed and closer(hi) and (hi - lo + 1 >= 3 or (PAIR_LIST and hi - lo + 1 == 2
                                          and u'־' not in toks[lo][0] and pair_alike(toks[lo][0], toks[hi][0]))):
            return hi if i < hi else None
        if not closed: return None
        return member_end(hi + 1)
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
        kind = clause_head(i)
        if kind == 'open' and not hard(i): return True
        if PLAIN_WAW.match(nfc(h2)) and not PLAIN_WAW.match(nfc(h)): return False
        return weight(i, None, None, None) >= STRONG
    strong.kind = clause_head          # (read by main: which sure links may halve a verse)
    def subject_only(i):
        """the clause head ends the subject alone: no verb stands in its clause
           before it (since the last printed mark). After a clause with a verb of
           its own it is that clause's end: "when he had said these words ‖ he
           could say no more" is כַּאֲשֶׁר דִּבֶּר אֶת־הַדְּבָרִים הָאֵלֶּה לֹא־יָכֹל, and the
           verse halves there (Jacob 7:20); "all things ‖ have been done" does
           not (2 Nephi 2:24). A participle with its article is the subject's own."""
        k = max([j for j in printed if j < i] or [-1]) + 1
        for t in range(k, i + 1):
            m = morph_of(toks[t][0])
            if re.match(r'^H((C|c|R|Rd|X)/)*V', m) or re.match(r'^H((C|c|R|Rd|X)/)*V', morph_of(toks[t][0], last=False)):
                return False
        return True
    strong.subject_only = subject_only
    def rated(i):
        """the model's log-odds with the clause head's floor: what settles two stops
           tied for the middle ("to fulfil all righteousness, ‖ O then" against
           "by water, to fulfil", 2 Nephi 31:5, where הוֹי opens the clause)"""
        s = score(i)
        # (the openers only: a noun before its verb is divided 84% of the time but
        # halves the verse less often than any other division, 9.7% against 13.4%,
        # and "all things ‖ have been done" took the etnachta off "have been done
        # ‖ in the wisdom of him", 2 Nephi 2:24)
        if not hard(i) and clause_head(i) == 'open': s = max(s, STRONG)
        return s
    # THE RELATIVE CLAUSE SET INSIDE ITS SENTENCE. "if I, whom ye call your king,
    # do labor to serve you, then ought not ye" (Mosiah 2:18) has a comma on each
    # side of its "whom"-clause, and the predicate resumes after the second
    # ("do labor"): both commas, and any inside the clause, lie between the
    # subject and its verb, and the etnachta on the second had the verse halved
    # between אֲנִי and its עָמֵל. Such a mark divides as an apposition's does,
    # never halving the verse while another mark can. The clause is the English's
    # ", who|whom|which|whose" run on with no stop to a comma and an auxiliary
    # whose own subject does not follow it ("may the Lord bless thee" opens a
    # new clause, 2 Nephi 3:3; "who, if his son ask bread, will give" is the
    # relative's own verb, 3 Nephi 14:9).
    spans = []
    if ent:
        ew = eng_words(ent)
        for j in range(1, len(ew) - 1):
            if not (ew[j - 1][1] == 1 and ew[j][0].lower() in REL_EN and ew[j][1] == 0): continue
            for k in range(j + 1, len(ew) - 1):
                if ew[k - 1][1] == 2: break
                if ew[k - 1][1] == 1 and ew[k][0].lower() in AUX_EN and ew[k][1] == 0 \
                   and ew[k + 1][0].lower() not in SUBJ_EN and not ew[k + 1][0][:1].isupper():
                    spans.append((j, k)); break
    anchor = [-1] * len(toks)
    if spans:
        gw, owner = [], []
        for t, (h, g) in enumerate(toks):
            for wd in re.findall(r"[A-Za-z][A-Za-z'\-]*", g):
                gw.append(norm(wd)); owner.append(t)
        for k, j in enumerate(align(gw, [norm(wd) for wd, _ in ew])):
            if j >= 0 and anchor[owner[k]] < 0: anchor[owner[k]] = j
    def embedded(i):
        nxt = next((anchor[t] for t in range(i + 1, min(i + 3, len(toks))) if anchor[t] >= 0), -1)
        return nxt >= 0 and any(s <= nxt <= e + 1 for s, e in spans)
    appos.embedded = embedded
    return weakest, joiner, hard, strong, printed, rated, appos, list_comma


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


FAR_KEEP = True
CLOSING = re.compile(r"(And thus it is\.\s*)?Amen\.?\s*$|And I make an end( of [a-z ]+)?\.\s*$")
def far_kept(entext, stops, cands):
    """the far stops are all a semicolon or a full stop (matched by order, when the
       English has as many stops as the Hebrew), none of them before a closing
       formula"""
    chars = []
    for m in re.finditer(r"[A-Za-z][A-Za-z'\-]*([^A-Za-z]*)", entext or ''):
        t = re.search(r'[;:.!?\u2014]', m.group(1))
        if t: chars.append(t.group(0))
    chars = chars[:-1]
    if len(chars) != len(stops): return False
    # (not the stop before a closing formula, which never makes a half alone:
    # "the remainder of my words. Amen.", 2 Nephi 9:54; "And thus it is. Amen.",
    # 1 Nephi 14:30; "And I make an end.", Omni 1:11)
    order = dict((i, k) for k, i in enumerate(sorted(stops)))
    m = CLOSING.search(entext or '')
    if m:
        pre = len(chars) - len(re.findall(r'[;:.!?]', m.group(0)))
        if any(order.get(i, -1) >= pre for i in cands): return False
    cmap = dict(zip(sorted(stops), chars))
    return all(cmap.get(i) in (';', '.') for i in cands)


def punctuation_bounds(n, breaks, entext=None, strong=None, score=None, appos=None, first_cut=None, list_comma=None,
                       soft=None):
    """stops -> rank 2, commas -> rank 3, and the links the Tanakh all but
       always divides -> rank 3 too; the etnachta goes to the stop nearest the
       middle, and a sentence's end outranks a clause's: a verse that holds two
       sentences divides between them (Genesis 1:5 divides at לָיְלָה).
       `score(i)`: the model's log-odds for a division after unit i, which
       settles two stops tied for the middle; `appos(i)`: the mark closes an
       apposition ("I, Nephi,") and is not the etnachta while any other is;
       `first_cut()`: where the grammar itself would first divide the verse,
       the etnachta of a verse with no mark and no sure link; `soft(i)`: a
       mark `appos` holds back from the etnachta that still outranks a sure
       link when no other printed mark is left (a relative clause's commas)."""
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
        # the commas of a list are one division, after the list's last member
        ends = sorted(set(list_comma(i) for i in printed if list_comma and list_comma(i)))
        for e in ends:
            if e < n - 1 and not b[e]: b[e] = 3
        clean = lambda i: i >= 1 and not (appos and appos(i)) and not (list_comma and list_comma(i))
        marked = [i for i in printed if clean(i)] + [e for e in ends if 1 <= e < n - 1 and e not in printed]
        # (the commas of a relative clause set inside its sentence stand down for
        # any other printed mark, but not for a link the English never marked:
        # with only "of the people of Ammon, who were Lamanites by birth," marked,
        # a sure link took the etnachta between רַבִּים and its מֵעַם, Helaman 3:12)
        if soft and not [i for i in printed if clean(i)]:
            marked = [i for i in printed if i >= 1 and soft(i) and not (list_comma and list_comma(i))] + marked
        marked = marked or [i for i in range(n - 1) if b[i] and clean(i)]
        # ...though against the chooser's bare guess the apposition's comma does
        # stand: the end of the subject is a division the Masoretes make (וְעַתָּה
        # לֹא אֲדַבֵּר אֲנִי נֶפִ֑י אֶת־כׇּל־דִּבְרֵי אָבִי, 8:29, which the guess halved
        # at אֲדַבֵּ֑ר); the list's comma does not
        if not marked: marked = [i for i in printed if i >= 1 and not (list_comma and list_comma(i))]
        # a sure link with no printed mark halves the verse only from its middle
        # half: אַ֖ף הֲתַחְשְׁב֑וּ כִּ֤י (17:24, two units against nine) is the
        # chooser's own call instead
        if marked and not printed and first_cut and n >= FIRST_CUT_MIN \
           and all(abs(i + 0.5 - (n - 1) / 2.0) > n / 4.0 for i in marked):
            at = first_cut()
            if at is not None and abs(at + 0.5 - (n - 1) / 2.0) <= n / 4.0: marked = [at]
        if not marked and first_cut and n >= FIRST_CUT_MIN:
            # no mark and no sure link: the verse is halved all the same, at the
            # chooser's weakest link (WLC: an etnachta in 92% of eight-unit
            # verses and nearly every longer one)
            at = first_cut()
            if at is not None and 1 <= at < n - 1: b[at] = 1; p = at
        if not marked and p is None: marked = [i for i in printed if i >= 1]
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
                # half of the verse when any mark stands there...
                # ...BUT A SENTENCE'S END LATE IN THE VERSE IS THE MASORETES' OWN
                # DIVISION: the WLC sets 13% of its etnachtas in the last quarter
                # of a verse and 3% in the first. A semicolon or full stop there,
                # with three units or more after it, keeps the etnachta: "to perish
                # in the wilderness. ‖ And this they said he had done" (1 Nephi 2:11)
                # had it on "a visionary man," inside the sentence. Not an early
                # stop (3%), and not the stop before a closing "Amen." (far_kept)
                # (and a second half of three units at least and a tenth of the verse:
                # the WLC's is shorter in 1.3% of its verses of twenty units or more;
                # "wars and contentions; ‖ wherefore, we did mourn out our days" was
                # four units of forty-nine, Jacob 7:26)
                late = [i for i in cands if i + 0.5 > mid and n - 1 - i >= max(3, 0.1 * n)]
                if FAR_KEEP and late and min(abs(i + 0.5 - mid) for i in cands) > n / 4.0 \
                   and far_kept(entext, [i for i in printed if b[i] == 2], late):
                    # (of the far stops, the late ones: "And king Mosiah did cause his
                    # people that they should till the earth." is an early full stop
                    # and the end of the next sentence a late one, Mosiah 6:7)
                    cands = late
                elif min(abs(i + 0.5 - mid) for i in cands) > n / 4.0 and any(abs(i + 0.5 - mid) <= n / 4.0 for i in marked):
                    # ...a clause's stop inside the middle half before any comma
                    # there ("with you; ‖ but behold", not "of God, ‖ which was in
                    # him", 2 Nephi 1:26)
                    cands = [i for i in marked if b[i] == 2 and abs(i + 0.5 - mid) <= n / 4.0] or marked
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
       (tools/phrase_break_overrides.json). The alignment's misplacements are
       mended (mend_marks) before the filters judge the marks: the veto on a
       connective would otherwise drop the stop the mend moves back off אַךְ
       (2 Nephi 11:1) before the mend ever saw it."""
    br = mend_marks(speak, [tuple(x) for x in hand[key]] if key in hand else breaks_for(toks, ent, finish=False), ent)
    if key in hand: return br
    # (both filters are the breath table's and judge commas only: a full stop
    # after עוֹד, גַּם, אַף is the author's clause end, "I speak unto you again;"
    # is אֲדַבֵּר אֲלֵיכֶם עוֹד and the stop belongs on עוֹד, 2 Nephi 6:3)
    stops = [(i, c) for i, c in br if c >= 2]
    # (...nor the comma after a connective the Masoretes divide after as a rule:
    # the breath table never pauses after לָכֵן, and the WLC divides after it 157
    # times in 185, after וְעַתָּה 211 in 256, עַתָּה 96 in 131, אָכֵן 10 in 14; after
    # הִנֵּה, אַךְ, אַף, גַּם the veto stands, at 28%, 29%, 18%, 9%. "wherefore, when
    # they saw" lost the comma after לָכֵן, 1 Nephi 18:20; after וְעוֹד 11 in 20, and
    # "And moreover, I say unto you" lost its comma, Mosiah 2:29)
    own = [(i, c) for i, c in br if c < 2 and 0 <= i < len(speak) and bare(speak[i][0]) in DIVIDED_AFTER]
    # (...nor the comma that closes a vocative the English sets off: the pairs the
    # Masoretes never split are kept by their letters, and אַחַי "my brethren" is
    # spelt as the אָחִי of אָחִי אָנִי; "And now, my brethren, I would that" lost
    # its comma, Mosiah 2:31. The Tanakh divides after the vocative, אַל־נָ֥א אַחַ֖י
    # תָּרֵֽעוּ, Genesis 19:7)
    own += [(i, c) for i, c in br if c < 2 and 0 <= i < len(speak) and vocative(speak[i][1], ent)]
    # (...nor the comma after "Thus saith the Lord,": the WLC divides after כֹּה אָמַר
    # יְהוָה 211 times in 293, כֹּ֚ה אָמַ֣ר יְהוָ֔ה, and the breath table's veto on a two-word
    # phrase dropped it, Mosiah 12:2)
    koh = lambda i: bare(speak[i][0]) == u'יהוה' and i >= 1 and (
        bare(speak[i - 1][0]) in (u'כה\u05beאמר', u'וכה\u05beאמר') or
        (i >= 2 and bare(speak[i - 1][0]) == u'אמר' and bare(speak[i - 2][0]) in (u'כה', u'וכה')))
    own += [(i, c) for i, c in br if c < 2 and 0 <= i < len(speak) - 1 and koh(i)]
    br, _ = drop_split_pairs([(i, c) for i, c in br if c < 2], speak)
    br, _ = drop_unnatural(br, speak)
    return sorted(set(br) | set(stops) | set(own))

JOIN_FIRST = True
JOIN_VERB = False
OWN_WORDS = True
ARTICLE_GLOSS = True
RSP_HEAD = True
INF_ABS_BACK = True
OWN_SKIP = True
SEG_ORDINAL = True
LIST_IN_CLAUSE = True
COPULA_BACK = True
NEG_FORWARD = True
WAW_SEQ_OFF = True
ADJ_AFTER = True
FAMILY_PAIR = True
BLI_BACK = True
NAME_GOD = True
AKH_BACK = True
BARE_KING = True
PAIR_CAP = True
HATAF_WAW = True
GAM_PRON = True
ADJ_DEM = True
CONN_OWN = True
ORD_OF = True
UNREAD_NAME_CSTR = True
ENG_ADJ = True
NUM_ATTR = True
NUM_NOT_NAME = True
ALL_PRONOUN = True
LEVAD_AFTER = True
VEGAM_FLOOR = True
TITLE_PREP = True
TAMID_ADVERB = True
KOL_PREFIX_CSTR = True
GROUP_PROCLITIC = True
ADJ_DEM_UNREAD = True
WAW_GLOSSES = True
PHRASAL_PREP = True
PRED_PRON3 = True
ET_PAIR = True
SAME_HEAD_PAIR = True
KOL_ART = True
AKH_CAP = True
PREP_BACK = True
ATTR_MINOR = True
PREP_NAME = True
UNREAD_INF = True
COPULA_NAME = True
SEED_PAIR = True
PAIR_PRINTED = True
NUM_PAIR = True
JOIN_SKIP = True
FINITE_NOT_INF = True
IMLO = True
LIST_PREP = True
ZULAT_HEAD = True
PAIR_LIST = True
JOIN_FIRST_NEAR = True
INTERROG_STOP = True
HAYOT_PRED = True
PHRASAL_GLOSS = True
HIGH_PRIEST = True
SFX_ADJ = True
MIKOL_ABS = True
LO_OD = True
PHRASAL_ABOUT = True
COPULA_ADJ = True
STRANDED_PREP = True
ADJ_DEM_PREP = True
IMLO_EN = True
CHIEF_JUDGE = True
PTC_PRO = True
NUM_TIGHT = True
CHIEF_BARE = True
PAIR_STOP = True
DEM_BARE = True
PAIR_OPENS = True
EVER_NOUN = True
ROUND_ABOUT = True
PREP_NOT_GENITIVE = True
DIVIDED_AFTER = set(u'לכן ולכן ועתה עתה אכן ועוד'.split())
KOL_SUFFIX = re.compile(u'^[ובלכמ]?כל(ם|ו|ה|נו|כם|הם|הן|ן|ך)$')
AUX_GLOSS = set('would have has had been be was were will should could may might must does did is are am'.split())
REL_EN = set('who whom which whose'.split())
AUX_EN = set('do did doth dost am is are art was were have has hath hast had shall shalt will wilt '
             'would should could can canst may might must ought'.split())
SUBJ_EN = set('i ye you he she it they we thou there the a an this these those my thy his her our '
              'your their every each'.split())


# ------------------------------------------------------------ main
def main():
    if not os.path.isdir(G.WLC):
        sys.exit('WLC not found at %s: the verbatim copies and the binding model both need it' % G.WLC)
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
            weakest, joiner, hard, strong, printed, score, appos, list_comma = make_weakest(speak, prior, w, ent)
            # ...and one inside a pair of names ("Laman | and Lemuel", 3:28) is the
            # English comma landed a word or two off by the alignment (a comma: a stop
            # there is the end of a clause, "the captivity of my fathers; and that same
            # God who delivered them" is אֲבוֹתַי וְהָאֱלֹהִים הַהוּא, Alma 29:12)
            marks = sorted(set((i, c) for i, c in printed_marks(key, toks, speak, ent, HAND)
                     if not (0 <= i < n - 1 and (hard(i) or copula_after(speak, i) or (pair_link(speak, i) and not (PAIR_STOP and c >= 2))
                                                 or folded_mark(speak, i)))))
            printed.update(i for i, c in marks)
            # a noun before its verb with no printed mark there divides but does not
            # halve the verse, as an apposition's comma does not: the WLC divides
            # there 84% of the time and puts its etnachta there less often than on
            # any other division (9.7% against 13.4%); "all things ‖ have been done
            # in the wisdom of him" was the sure link's etnachta, 2 Nephi 2:24
            # ...nor the link between a noun and the article participle or adjective
            # that describes it: "the river Sidon, ‖ which ran by the land of
            # Zarahemla" (Alma 2:15) is נְהַר סִידוֹן הַשּׁוֹטֵף; the WLC divides there
            # 83.5% of the time but sets its etnachta there 3.2% (8.1% on any link),
            # and before an article adjective never (0 of 362)
            attr_next = lambda i: ATTR_MINOR and 0 <= i < n - 1 and u'\u05be' not in words[i + 1] \
                and re.match(r"^HTd/(V\w?r|Aa)", morph_of(speak[i + 1][0], last=False)) \
                and (re.search(r"(^H|/)N[cp]", morph_of(speak[i][0])) or (not morph_of(speak[i][0])
                     and NAME_GLOSS.match(re.sub(r'^(and|of)[- ]', '', speak[i][1].strip(), flags=re.I))))
            # ...nor the pause a connective takes after itself where the link before it
            # is marked: "Alma having seen all these things, therefore he took Amulek"
            # is הָאֵלֶּה לָכֵן לָקַח, and the mark after לָכֵן, which the English never
            # writes, took the etnachta for standing nearer the middle (Alma 15:18);
            # the division is before the connective (not לֵאמֹר, whose mark opens the speech)
            mark_at = set(j for j, c in marks)
            conn_own = lambda i: CONN_OWN and 1 <= i < n - 1 and (i - 1) in mark_at \
                and nfc(speak[i][0]) in ALWAYS_AFTER and nfc(speak[i][0]) not in (u'לֵאמֹר', u'אָמֵן')
            minor = lambda i: appos(i) or appos.embedded(i) or (strong.kind(i) == 'verb' and i not in printed
                                                                 and strong.subject_only(i)) or attr_next(i) or conn_own(i)
            pb = punctuation_bounds(n, marks, ent, strong, score, minor,
                                    lambda: G.first_cut(words, STRESS.get, weakest, [i for i in range(n) if minor(i)]),
                                    list_comma, appos.embedded)
            if par:
                bounds, how = list(par[1]), 'mt'
                # the Masoretes rule the words they accented; the printed English
                # rules the words Nephi set between them: "Therefore, O Lord,"
                # before Isaiah 2:6 had its vocative's comma dropped and the Name
                # served the verb with a qadma (2 Nephi 12:6)
                for i, c in marks:
                    if 0 <= i < n - 1 and (i not in par[5] or i in par[7]) and not bounds[i]: bounds[i] = 2 if c >= 2 else 3
                # the MT's etnachta fell on a word the alignment could not pair
                # (the clauses cross: Isaiah's וּמִמֵּי יְהוּדָה יָצָאוּ is 1 Nephi
                # 20:1's וַאֲשֶׁר יָצְאוּ מִמֵּי יְהוּדָה, and the verse ran 25 units
                # with no main division): the printed English's stands in
                if 1 not in bounds and par[6] and n >= ETNACHTA_MIN and 1 in pb:
                    bounds = list(bounds); bounds[pb.index(1)] = 1
                # the MT's etnachta on a word the printed English leaves unmarked,
                # with the English's own stop a word or three on: Nephi lengthened
                # the sentence ("a word in season unto thee, O house of Israel."
                # after Isaiah 50:4's דָּבָ֑ר, 2 Nephi 7:4) and the stop is its end
                # ...only where every word from the MT's etnachta to that stop is
                # Nephi's own (Isaiah 48:7's פֶּן־תֹּאמַר carries the dash of 1 Nephi
                # 20:7 and is the Masoretes' word: their etnachta stands)
                if 1 in bounds:
                    i1 = bounds.index(1)
                    if not any(i == i1 for i, c in marks):
                        later = [i for i, c in marks if c >= 2 and i1 < i <= i1 + 3 and i < n - 1
                                 and all(k not in par[5] for k in range(i1 + 1, i + 1))]
                        if later: bounds[i1] = 2; bounds[later[0]] = 1
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
            stream = wlc_verse(par[0]) if par and par[3] and key not in OVER else None
            if stream: how = 'verbatim'
            stats[how] += 1
            if stream:
                # the Masoretes' own accents, consonant by consonant (the OT layer's encoder)
                code, _, _ = encode_verbatim(words, stream)
                codes, labels = code.split('|'), par[4]
            else:
                codes, labels = G.accent_verse(words, bounds, STRESS.get, weakest, None, joiner, prejoin(speak))
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
    print('verses %s · phrased by the Tanakh %s (%s of them its accents verbatim) · by the printed English %s · by hand %s · %s KB in bom/teamim/'
          % (format(stats['verses'], ','), stats['mt'] + stats['verbatim'], stats['verbatim'], format(stats['english'], ','), stats['override'], format(size // 1024, ',')))
    tot = sum(labels_count.values())
    print('accents: ' + ', '.join('%s %.1f%%' % (k or 'none', 100.0 * v / tot) for k, v in labels_count.most_common(12)))
    if check and agree[2]:
        print('on the verses that quote the Tanakh, the English route alone puts the Masoretes\' own accent on %d of %d words (%.1f%%)'
              ' and divides where they divide on %d (%.1f%%)'
              % (agree[0], agree[2], 100.0 * agree[0] / agree[2], agree[1], 100.0 * agree[1] / agree[2]))


if __name__ == '__main__':
    main()
