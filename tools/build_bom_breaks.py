#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build bom/bom_phrase_breaks.js — where each Book of Mormon verse breathes.

    python3 tools/build_bom_breaks.py

WHY THIS IS NOT ot_phrase_breaks.py. The Old Testament is the Masoretic Text
and the Masoretes marked every break in it; nobody accented Nephi, so the
Book of Mormon had only read_aloud.js's rules — the connectives and the
waw-consecutive. Those get the clause openers right and nothing else, which
is why 1 Nephi 1:1 ran on for eleven words at a stretch.

But this volume has a punctuation system of its own: THE PRINTED ENGLISH. It
is a translation of that English, clause for clause, and the English says
where it pauses. The gloss line is that same English laid out in Hebrew word
order, so the two can be aligned and every comma, semicolon and full stop
carried across onto the Hebrew word it falls after.

    source: bom/verses/*.js  (gloss line)  +  bom/official_verses.js
    output: bom/bom_phrase_breaks.js

    window.SW_BREAKS["1 Nephi|1|1"] = [[1,1],[6,1],[7,1],[11,2], ...]

    an [index, weight] pair: break AFTER speakable word index (0-based),
    weight 1 for a comma-length pause and 2 for a full stop. The Old
    Testament's entries stay bare numbers and every one of them is a full
    stop, so that file is untouched and read_aloud.js reads both.

THE PUNCTUATION IS NOT COPIED TOKEN FOR TOKEN — and this is the whole of the
difficulty. "I, Nephi, having been born of goodly parents" has a comma after
"I", but אֲנִי נֶפִי is one breath: there is no pause inside it. The English
comma there is an appositive, a mark of writing rather than of speech. So a
break that would leave a single word standing alone is dropped, unless that
word is a connective — "therefore", "and now", "behold" — which really does
take a pause after it, and which is exactly what the reader wants marked.

THREE THINGS THE ALIGNMENT NEEDED BEFORE IT WORKED.

 1. THE DIAGONAL PRIOR. 1 Nephi 1:1 says "days" four times and "having been"
    three; with a bare match score every one of them ties and the path is
    settled by noise. "in the days of" took the "days" of the clause after
    it and dragged the break back four words. A gloss word k of K belongs
    near English word k/K of M, so a match is docked for straying from that
    diagonal and the repeats are settled by position.

 2. A TOKEN IS PLACED BY ITS FIRST MATCH, and the break goes BEFORE the first
    token that clearly belongs after the mark. Placing it by the LAST match
    put "in the days of" at the "of" of the NEXT clause.

 3. THE ALIGNMENT GIVES A WINDOW; THE HEBREW CHOOSES THE POINT IN IT. Between
    the last token certainly before a mark and the first certainly after it
    lies a run the alignment cannot place, because the Hebrew renders it with
    words the English does not use — "my life", "and yet", "in no wise". If
    one of those is a clause opener the break belongs in front of it. That is
    why 1 Nephi 1:1 breaks after "my life": וְאַף is the next word.

NOTHING HERE TOUCHES THE HEBREW. This is a separate lookup, exactly as
ot_phrase_breaks.js and stress.js are. The Book of Mormon Hebrew is locked.
"""
import json, sys
import re, io, os, unicodedata as ud

BOOKS = [('1nephi','1 Nephi',''), ('2nephi','2 Nephi','n2_'), ('jacob','Jacob','jc_'),
         ('enos','Enos','en_'), ('jarom','Jarom','jr_'), ('omni','Omni','om_'),
         ('words_of_mormon','Words of Mormon','wm_'), ('mosiah','Mosiah','mo_'),
         ('alma','Alma','al_'), ('helaman','Helaman','he_'), ('3nephi','3 Nephi','tn_'),
         ('4nephi','4 Nephi','fn_'), ('mormon','Mormon','mm_'), ('ether','Ether','et_'),
         ('moroni','Moroni','mr_')]

GEM = {u'א':1,u'ב':2,u'ג':3,u'ד':4,u'ה':5,u'ו':6,u'ז':7,u'ח':8,u'ט':9,u'י':10,
       u'כ':20,u'ל':30,u'מ':40,u'נ':50,u'ס':60,u'ע':70,u'פ':80,u'צ':90,u'ק':100,
       u'ר':200,u'ש':300,u'ת':400,u'ך':20,u'ם':40,u'ן':50,u'ף':80,u'ץ':90}
def gem(s): return sum(GEM.get(c, 0) for c in s)

def array_bodies(src, name_re):
    """[(name, body)] for each `var <name> = [ ... ];`, found by MATCHING THE
       BRACKET rather than by looking for a newline before it.

       Anchoring on "\n];" is the obvious thing and it is wrong: Ether 14
       closes on the same line as its last verse — ...["\u05c3",""]]},]; — so a
       non-greedy match ran straight past it and swallowed Ether 15 whole. The
       book then reported 65 verses in chapter 14 and none in 15, which looked
       exactly like a data fault and was not: the file is valid JavaScript and
       always was. Depth counting is string-aware because a gloss may itself
       contain a bracket."""
    out = []
    for m in re.finditer(name_re, src):
        i = src.index('[', m.end() - 1)
        depth, j, in_str = 0, i, False
        while j < len(src):
            c = src[j]
            if in_str:
                if c == '\\': j += 2; continue
                if c == '"': in_str = False
            elif c == '"': in_str = True
            elif c == '[': depth += 1
            elif c == ']':
                depth -= 1
                if depth == 0: break
            j += 1
        out.append((m, src[i + 1:j]))
    return out


def corpus(root, file, prefix):
    """{(chapter, position): (english_ref, tokens)} for one book.

       THE KEY IS THE POSITION AND THE ENGLISH IS THE NUMERAL. reader_surface.js
       builds data-verse-key from the ARRAY POSITION, so a break table has to be
       keyed that way to be found at all. They are not always the same number:
       Mosiah 9 opens with a ∗ entry, which is the superscription the printed
       book has there — "The Record of Zeniff" — and not verse 1. It carries no
       numeral, so it gets no English and no breaks from one."""
    src = io.open(os.path.join(root,'bom/verses',file+'.js'), encoding='utf-8').read()
    out = {}
    for m, body in array_bodies(src, r'var %sch(\d+)Verses\s*=\s*\[' % re.escape(prefix)):
        ch = int(m.group(1))
        for vi, vm in enumerate(re.finditer(
                r'\{\s*num:\s*"([^"]*)"\s*,\s*words:\s*\[(.*?)\]\s*\}', body, re.S)):
            g = gem(vm.group(1))
            ref = (ch, g) if g else None          # no numeral: a colophon
            out[(ch, vi+1)] = (ref, re.findall(r'\["([^"]*)","([^"]*)"\]', vm.group(2)))
    return out

def english(root):
    src = io.open(os.path.join(root,'bom/official_verses.js'), encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'"book":\s*"([^"]+)",\s*"chapter":\s*(\d+),\s*"verse":\s*(\d+),'
                         r'\s*"english":\s*"((?:[^"\\]|\\.)*)"', src):
        out[(m.group(1), int(m.group(2)), int(m.group(3)))] = \
            m.group(4).encode().decode('unicode_escape')
    return out

# ---------------------------------------------------------------- words
HEB = re.compile(u'[א-ת]')
def silent(h): return not HEB.search(h or '')

STOP = set('a an the of to in and is was be'.split())
def norm(w):
    w = re.sub(r"[^a-z']", '', w.lower())
    return {'mine':'my','thine':'thy','unto':'to','shall':'will','hath':'has',
            'doth':'does','ye':'you','thee':'you','thou':'you'}.get(w, w)
def stem(w):
    for suf in ("'s","ies","es","ed","ing","s"):
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            return w[:-len(suf)]
    return w

def score(g, e):
    """how well one gloss word matches one English word; 0 = no match"""
    if not g or not e: return 0
    if g == e: return 0.5 if g in STOP else 3
    sg, se = stem(g), stem(e)
    if sg == se and len(sg) >= 3: return 3
    if len(sg) >= 4 and len(se) >= 4 and (sg.startswith(se) or se.startswith(sg)): return 2
    return 0

def align(gwords, ewords):
    """Monotone alignment, matches only — never a substitution, so nothing is
       paired that does not actually correspond. Returns eng index per gloss
       word, or -1.

       THE DIAGONAL PRIOR IS WHAT MAKES THIS WORK. 1 Nephi 1:1 says "days"
       four times and "having been" three, so a bare score ties on every one
       of them and the path is decided by noise: "in the days of" took "in
       all my days" from the clause AFTER it, which dragged the break back
       four words. A gloss word k of K belongs near English word k/K of M —
       the two texts say the same things in the same order — so a match is
       docked for how far it strays from that diagonal, and a repeated word
       is settled by position instead of by chance."""
    n, m = len(gwords), len(ewords)
    if not n or not m: return [-1]*n
    GAP, PULL = -0.6, 5.0
    dp = [[0.0]*(m+1) for _ in range(n+1)]
    bk = [[0]*(m+1) for _ in range(n+1)]
    for i in range(1, n+1):
        d0 = (i - 0.5) / n
        for j in range(1, m+1):
            best, b = dp[i-1][j] + GAP, 1                     # skip gloss word
            if dp[i][j-1] + GAP > best: best, b = dp[i][j-1] + GAP, 2
            s = score(gwords[i-1], ewords[j-1])
            if s:
                s -= PULL * abs(d0 - (j - 0.5) / m)
                if s > 0 and dp[i-1][j-1] + s > best:
                    best, b = dp[i-1][j-1] + s, 3
            dp[i][j], bk[i][j] = best, b
    out = [-1]*n
    i, j = n, m
    while i > 0 and j > 0:
        b = bk[i][j]
        if b == 3: out[i-1] = j-1; i -= 1; j -= 1
        elif b == 1: i -= 1
        else: j -= 1
    return out

# ------------------------------------------------------------- the rules
# WORDS THAT ALWAYS TAKE A PAUSE AFTER THEM, whatever the English does with
# its commas. These announce themselves: they end what came before and hand
# over to what follows, and a reader hears the join even where the printed
# page does not mark it. Counted in this corpus, with the gloss they actually
# carry — the POINTED form, because the pointing is the distinction:
#
#   לֵאמֹר   272  saying          הִנֵּה   1158  behold   (הֵנָּה 29 is "hither")
#   אַף      693  yea             וְהִנֵּה  400  and behold
#   לָכֵן    783  therefore       אָמֵן    109  verily / Amen
#   עַל־כֵּן  138  wherefore       הֵן      261  yea
#   וְעַתָּה  678  and now         אָכֵן     14  surely
#                                 עַתָּה     48  now
#
# וְאַף IS NOT ONE OF THEM (user, 2026-09-09). It reads "and yet" and runs
# straight on into its clause — "and yet in no wise hath he forsaken me" — so
# it takes the pause BEFORE it, where the WLC puts one 85% of the time, and
# none after. Bare אַף is different: it is "yea" 588 times of 694, standing at
# the head of its own clause.
#
# אַף is the interesting one: the WLC puts a break after it only 40% of the
# time, which is why read_aloud.js leaves it alone in the Tanakh. In THIS
# volume it is "yea" 588 times out of 694 — a different word doing a
# different job — and it takes the pause.
ALWAYS_AFTER = set([u'לֵאמֹר', u'אַף', u'לָכֵן', u'עַל־כֵּן', u'וְעַתָּה',
                    u'עַתָּה', u'אָכֵן', u'הִנֵּה', u'וְהִנֵּה', u'אָמֵן', u'הֵן'])

# WORDS THAT ARE NEVER LEFT AT THE END OF A PHRASE, because they govern what
# comes next and mean nothing without it. Stranding אֲשֶׁר or כִּי is the same
# fault as splitting a construct chain — the voice stops on a word that is
# still reaching forward.
#
#   אֲשֶׁר  2765  which / who     לֹא    871  not      אֶל   61  to
#   כִּי    3483  that / for      אִם     93  if       אַל   10  do not
#   כִּי־אִם 252  but             כׇּל/כֹּל 82  all
#
# Again by pointing: אֵל (56) is "God" and אֵם (5) is "mother" — neither joins
# anything, and folding the points would have swept them in.
NEVER_AFTER = set([u'אֲשֶׁר', u'כִּי', u'כִּי־אִם', u'לֹא', u'אַל', u'אֶל', u'אִם',
                   u'כׇּל', u'כֹּל', u'כׇל', u'כֹל'])
# STRIP THE POINTS, KEEP THE MAQQEF. U+05BE sits inside the accent range, so
# the obvious [\u0591-\u05C7] silently eats it and עַל־כֵּן stops being a
# compound. The maqqef is a letter's worth of meaning here — it is what makes
# כׇּל־הַיָּמִים one word — so it is excluded by hand.
POINTS = re.compile(u'[\u0591-\u05BD\u05BF-\u05C7]')
def bare(h): return POINTS.sub('', h or '')
def nfc(h): return ud.normalize('NFC', h or '')


BINDS = re.compile(r'\b(of|in|to|unto|with|from|upon|on|all|the|a|an|under|over|before|'
                   r'after|against|among|between|into|through|beneath|above|beside|'
                   r'toward|towards|about|and|nor|or|that|which|who|whom|whose|for|but)$', re.I)
BINDS_HEB = [re.compile(u'^אֵת'), re.compile(u'^אֶת'),
             re.compile(u'^כׇּל'), re.compile(u'^כָּל')]
# the same openers read_aloud.js measured against the accented WLC — 79% to
# 97% of the time the Masoretes put a break in front of one of these
OPENERS = [re.compile(u'^וְעַתָּה'), re.compile(u'^לָכֵן'), re.compile(u'^עַל־?כֵּן'),
           re.compile(u'^וַיְהִי'), re.compile(u'^יַעַן'), re.compile(u'^וְאַף'),
           re.compile(u'^פֶּן'), re.compile(u'^כִּי'), re.compile(u'^ו?ְ?הִנֵּה'),
           re.compile(u'^ו[ַָ][איתנ]')]           # the waw-consecutive
def opens(h):
    return (not binds_back(h)) and any(r.match(h or '') for r in OPENERS)
def binds_back(h):
    return any(r.match(h or '') for r in BINDS_HEB)

# ------------------------------------------------- what the model may see
# THE FEATURE CONTRACT, SHARED WITH tools/learn_phrasing.py, which trains on
# the Tanakh. It may look at nothing the Book of Mormon does not also have:
# the pointed Hebrew word, its English gloss, and the position in the verse.
# No morphology — the Book of Mormon has none, and a model that needed a
# treebank could not be carried across.
#
# THE SEPARATOR IS NOT THE SAME IN THE TWO VOLUMES. The Old Testament writes
# "and-it-came-to-pass" and this one writes "and it came to pass", and inside
# the Tanakh it varies by CHAPTER. A feature learned on the hyphenated form
# is one this volume can never match, so the hyphen is a space on both sides.
WORD = re.compile(r"[A-Za-z']+")
def words(g): return WORD.findall(g.replace('-', ' ').lower())

def feats(toks, i):
    g1, g2 = words(toks[i][1]), words(toks[i + 1][1])
    h1, h2 = bare(toks[i][0]), bare(toks[i + 1][0])
    return ['tail=' + (g1[-1] if g1 else ''),
            'head=' + (g2[0] if g2 else ''),
            'g1=' + ' '.join(g1),
            'g2=' + ' '.join(g2),
            'h1=' + h1,
            'h2=' + h2,
            'join=' + (g1[-1] if g1 else '') + '>' + (g2[0] if g2 else ''),
            'len1=%d' % min(len(g1), 4),
            'pos=%s' % ('start' if i == 0 else
                        ('near-end' if i >= len(toks) - 3 else 'mid'))]

_MODEL = [None]
def model():
    """The Masoretes' own phrasing, learned by tools/learn_phrasing.py from
       283,561 accented words. It shapes this table at BUILD time and is
       never shipped — the browser gets the break positions, not the model."""
    if _MODEL[0] is None:
        f = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ot_phrasing_model.json')
        try:
            m = json.load(io.open(f, encoding='utf-8'))
            _MODEL[0] = (m['prior'], m['w'])
        except Exception:
            _MODEL[0] = (0.0, {})
    return _MODEL[0]

def breakiness(toks, i):
    """log-odds that a phrase ends after token i. 0 is even money."""
    prior, w = model()
    return prior + sum(w.get(k, 0.0) for k in feats(toks, i))


# ------------------------------------------------------------ extraction
MIN_PHRASE = 2      # a phrase of one word must earn it (a connective does)
LONG = 8            # words: past this a clause wants a breath in it
SPLIT_MIN = 0.4     # ... and the model must be surer than even money to add one
VETO = -4.0         # ... and this sure before it overrules the printed English

def eng_words(text):
    """[(word, punct_class)] — 0 none, 1 comma, 2 full stop."""
    out = []
    for m in re.finditer(r"([A-Za-z][A-Za-z'\-]*)([^A-Za-z]*)", text):
        w, tail = m.group(1), m.group(2)
        cls = 0
        if re.search(r'[,]', tail): cls = 1
        if re.search(r'[;:.!?—]', tail): cls = 2
        out.append((w, cls))
    return out

def breaks_for(tokens, entext):
    """[(index_into_speakable, class)] for one verse, or [] if it cannot be read."""
    speak = [(h, g) for (h, g) in tokens if not silent(h)]
    if len(speak) < 3: return []
    n = len(speak)

    marks = {}                                   # speakable index -> class
    from_english = set()
    def put(i, c, eng=False):
        if 0 <= i < n - 1:
            marks[i] = max(marks.get(i, 0), c)
            if eng: from_english.add(i)
            else: from_english.discard(i)

    # 1. THE SOF PASUQ, where the corpus itself ends a sentence mid-verse.
    si = -1
    for h, g in tokens:
        if silent(h):
            if u'׃' in h: put(si, 2)
        else:
            si += 1

    # 2. PUNCTUATION THE GLOSS ITSELF CARRIES.
    for i, (h, g) in enumerate(speak):
        t = g.rstrip()
        if t.endswith((';', ':', '.')): put(i, 2)
        elif t.endswith(','): put(i, 1)

    # 3. THE PRINTED ENGLISH, WHICH IS WHERE THE AUTHOR PUT THE PAUSES.
    #
    #    A TOKEN IS PLACED BY ITS FIRST MATCH, AND THE BREAK GOES BEFORE THE
    #    FIRST TOKEN THAT CLEARLY BELONGS AFTER THE MARK. Placing it by the
    #    LAST match instead put "in the days of" at English 36 — it had
    #    matched the "of" of the NEXT clause — and the break came down after
    #    "my eyes" when it belongs after "my life". Read from the other end
    #    the question is not "how far does this token reach" but "which token
    #    is the first one on the far side of the comma", and an unanchored
    #    token in between simply stays with what precedes it.
    if entext:
        ew = eng_words(entext)
        gw, owner = [], []
        for i, (h, g) in enumerate(speak):
            for w in re.findall(r"[A-Za-z][A-Za-z'\-]*", g):
                gw.append(norm(w)); owner.append(i)
        pos = align(gw, [norm(w) for w, _ in ew])
        anchor = [-1]*n
        for k, j in enumerate(pos):
            if j >= 0 and anchor[owner[k]] < 0: anchor[owner[k]] = j
        for j, (w, cls) in enumerate(ew):
            if not cls: continue
            # THE ALIGNMENT GIVES A WINDOW; THE HEBREW CHOOSES THE POINT IN IT.
            # Between the last token certainly before the mark and the first
            # certainly after it lies a run of tokens the alignment could not
            # place — "my life", "and yet", "in no wise" all rendered with
            # words the English clause does not use. Dropping the break at
            # either end of that run is a guess. But Hebrew announces its
            # clause boundaries, so if one of those tokens is an opener the
            # break belongs in front of it, and 1 Nephi 1:1 breaks after "my
            # life" because וְאַף is the next word.
            lo, hi = -1, n - 1
            for i in range(n):
                if anchor[i] < 0: continue
                if anchor[i] <= j: lo = i
                else: hi = i - 1; break
            if lo < 0: continue
            if hi < lo: hi = lo
            q = hi
            for t in range(lo, hi):
                if opens(speak[t + 1][0]): q = t; break
            else:
                # AN UNPLACED "and X" AT THE FAR END OF THE WINDOW BELONGS TO
                # WHAT FOLLOWS. 1 Nephi 1:4 reads "...Zedekiah, king of Judah,
                # my father, Lehi, having dwelt..." but the Hebrew says וְלֶחִי
                # אָבִי, Lehi before "my father" — so the two cross, only one
                # of them can anchor, and וְלֶחִי came out unplaced at the end
                # of the window. Dropping the break there cut "and Lehi" away
                # from "my father", which is one unit. A coordinator with
                # nothing behind it is opening the next unit, not closing this
                # one. Unless the word carries a mark of its own, in which
                # case the mark knows better.
                #   AND THE COORDINATOR MUST PROVE IT. "and a mother" is
                #   also an unplaced "and X" — וְאֵם, coordinating INSIDE the
                #   clause — and breaking in front of it splits "a goodly
                #   father and a goodly mother", which is the same fault the
                #   plain-waw rule made in read_aloud.js. The proof is what
                #   comes after: וְלֶחִי is followed by אָבִי, which the
                #   alignment places firmly beyond the mark, so that whole
                #   run belongs to the next unit. וְאֵם is followed by
                #   "goodly", which is placed nowhere and belongs to it.
                if hi not in marks:
                    for t in range(lo, hi):
                        nxt_g = speak[t + 1][1].strip().lower()
                        if (anchor[t + 1] < 0 and re.match(r'and\b', nxt_g)
                                and t + 2 < n and anchor[t + 2] > j):
                            q = t; break
            put(q, cls, eng=True)

    # 4. THE WORDS THAT ALWAYS TAKE A PAUSE AFTER THEM.
    for i, (h, g) in enumerate(speak):
        if nfc(h) in ALWAYS_AFTER: put(i, 1)

    # ---- what may not be broken -------------------------------------
    #  AN APPOSITION IS NOT A PAUSE. "Zedekiah, king of Judah" and "my father,
    #  Lehi, having dwelt" are punctuated the way English punctuates a name,
    #  and the Hebrew — צִדְקִיָּהוּ מֶלֶךְ יְהוּדָה, יֹשֵׁב בִּירוּשָׁלַיִם — is one breath
    #  through both. The floor catches this when it strands ONE word; it does
    #  not when the apposition is long enough to look like a clause. The
    #  Tanakh knows the difference, so a break the printed English asked for
    #  is dropped when the Masoretes are firmly against it: -8.53 for
    #  "dwelling | in Jerusalem", against -0.80 for the weakest break in
    #  1 Nephi 1:1 that survives. Only the ENGLISH's breaks are open to this —
    #  the corpus's own marks and the words that always break are not.
    for i in list(marks):
        if i in from_english and breakiness(speak, i) < VETO: marks.pop(i); continue
    for i in list(marks):
        if nfc(speak[i][0]) in ALWAYS_AFTER: continue    # these always win
        gl = speak[i][1].rstrip(u' ,;:.\u2014')
        if nfc(speak[i][0]) in NEVER_AFTER: marks.pop(i)       # reaches forward
        elif BINDS.search(gl.strip()):      marks.pop(i)       # construct chain
        elif binds_back(speak[i+1][0]):     marks.pop(i)       # את / כל

    # ---- A PHRASE HAS A FLOOR ---------------------------------------
    #  This is what keeps "I, Nephi," from becoming "I, / Nephi,". A single
    #  word standing alone is a fragment unless the word is a connective, in
    #  which case the pause after it is the whole point.
    keep, last = [], -1
    for i in sorted(marks):
        length = i - last
        solo = length == 1 and nfc(speak[i][0]) in ALWAYS_AFTER
        if length < MIN_PHRASE and not solo: continue
        keep.append((i, marks[i])); last = i
    #  ... and the tail is a phrase too. A break at the second-to-last word
    #  leaves one word hanging: 46 verses ended "... | saying". Only אָמֵן
    #  really does stand by itself.
    while keep and n - 1 - keep[-1][0] < MIN_PHRASE and \
            bare(speak[-1][0]) not in (u'אמן',):
        keep.pop()

    # ---- AND THE MASORETES FINISH THE JOB ---------------------------
    #  The printed English marks the ends of clauses and nothing inside them,
    #  so a long clause arrives here in one breath: Mosiah 9:2 ran 33 words
    #  without a pause. Splitting it at the midpoint is a guess. The Tanakh
    #  is 283,561 worked examples of exactly this decision, in exactly this
    #  glossing language, so the split goes where its accents say — and the
    #  model has to be MORE than usually sure before it adds a pause the
    #  author did not write, hence a threshold above even money.
    ends = [i for i, _ in keep] + [n - 1]
    starts = [0] + [i + 1 for i, _ in keep]
    extra = []
    for a, b in zip(starts, ends):
        while b - a + 1 > LONG:
            best, at = SPLIT_MIN, -1
            for t in range(a + MIN_PHRASE - 1, b - MIN_PHRASE + 1):
                if nfc(speak[t][0]) in NEVER_AFTER: continue
                if BINDS.search(speak[t][1].rstrip(u' ,;:.\u2014').strip()): continue
                if binds_back(speak[t + 1][0]): continue
                sc = breakiness(speak, t)
                if sc > best: best, at = sc, t
            if at < 0: break
            extra.append((at, 1)); a = at + 1
    if extra:
        keep = sorted(keep + extra)
    return keep


# ------------------------------------------------------------------ main
def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    EN = english(root)
    table, verses, noeng, plain = {}, 0, 0, 0
    for f, en, pre in BOOKS:
        for (ch, v), (ref, toks) in sorted(corpus(root, f, pre).items()):
            speak = [t for t in toks if not silent(t[0])]
            if len(speak) < 3: continue
            verses += 1
            ent = EN.get((en, ref[0], ref[1])) if ref else None
            if not ent: noeng += 1
            br = breaks_for(toks, ent)
            if br: table['%s|%d|%d' % (en, ch, v)] = [[i, c] for i, c in br]
            else: plain += 1

    body = json.dumps(table, ensure_ascii=False, separators=(',', ':'))
    path = os.path.join(root, 'bom', 'bom_phrase_breaks.js')
    with io.open(path, 'w', encoding='utf-8') as fh:
        fh.write(u"// bom_phrase_breaks.js \u2014 auto-generated by tools/build_bom_breaks.py.\n"
                 u"// DO NOT EDIT. Where each verse breathes, carried across from the printed\n"
                 u"// English onto the Hebrew word the mark falls after: [index, weight], the\n"
                 u"// index into the verse's speakable words and 1 for a comma, 2 for a stop.\n"
                 u"// The Hebrew is untouched \u2014 this is a separate lookup, as stress.js is.\n")
        fh.write(u'window.SW_BREAKS = Object.assign(window.SW_BREAKS || {}, %s);\n' % body)

    n = sum(len(x) for x in table.values())
    print('verses: %s   with breaks: %s (%.1f%%)   no printed English: %s'
          % (format(verses, ','), format(len(table), ','),
             100.0 * len(table) / max(verses, 1), noeng))
    print('breaks: %s   commas %s   stops %s'
          % (format(n, ','),
             format(sum(1 for x in table.values() for b in x if b[1] == 1), ','),
             format(sum(1 for x in table.values() for b in x if b[1] == 2), ',')))
    print('size: %s KB' % format(os.path.getsize(path) // 1024, ','))


if __name__ == '__main__':
    main()
