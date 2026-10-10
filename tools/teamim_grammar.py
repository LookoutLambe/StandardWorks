#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""The grammar of the prose te'amim, as the Masoretes used it in the 21 books.

    import teamim_grammar as G
    codes = G.accent_verse(words, bounds, stress_of)   -> one code string per word

THE USER'S CALL (2026-10-09): "based on the cantillation marks in the bible you
can study them and know exactly how to do it to the BOM". So the rules here are
not written from a handbook; every one was COUNTED in the Westminster Leningrad
Codex (tools/learn_teamim.py, 18,701 prose verses, 233,708 accentual units)
and the numbers stand beside the rule. tools/test_teamim_grammar.py strips the
Tanakh's accents, keeps only its phrasing, regenerates them with this file and
reports how many words come back as the Masoretes wrote them.

WHAT THE SYSTEM IS. A verse is divided in two by the etnachta; each half is
divided by the zaqefs, the last division before the etnachta or the silluq
being tifcha; each of those parts is divided again (pashta or yetiv last
before a zaqef, tevir last before a tifcha, zarqa last before a segolta, and
revia for the earlier divisions); and those again (geresh, telisha gedola,
pazer, by distance). Every unit not ending a division is a servant of the next
divider, and each divider allows a fixed number of servants in fixed shapes.
The division itself, where a phrase ends, is the one thing this file does not
decide: it takes the phrasing (the boundary ranks) and names the accents.

A UNIT is a maqqef group: the Masoretes accent it once, on its last word, and
this corpus writes the group as one token.

WHAT IS GENERATED. The te'amim and the silluq. Never a meteg (the ga'ya is
positional, not lexical: 8,963 forms seen four or more times, 229 always carry
one, 4,899 never, the rest sometimes; editions differ and many print none).
Never a plain paseq; the paseq of munach legarmeh, yes. Never the rare forms
(shalshelet 7, merkha kefula 14, qarney para 16, yerah ben yomo 16 in the
whole corpus).

ENCODING, per word: for each consonant that carries marks, chr(0x30 + its
consonant index) then the mark characters; a trailing U+05C0 means a paseq
follows the word. The same encoding as ot_teamim/, read by teamim.js.
"""
import json, os, re, unicodedata as ud

HERE = os.path.dirname(os.path.abspath(__file__))
N = lambda s: ud.normalize('NFC', s)
IS_CONS = lambda c: u'א' <= c <= u'ת'
VOWEL = {0x5b4, 0x5b5, 0x5b6, 0x5b7, 0x5b8, 0x5b9, 0x5ba, 0x5bb, 0x5c7}
HALF = {0x5b1, 0x5b2, 0x5b3}
SHEVA = 0x5b0
DAGESH = 0x5bc

CODE = {'etnachta': 0x591, 'segolta': 0x592, 'shalshelet': 0x593, 'zaqef_q': 0x594, 'zaqef_g': 0x595,
        'tifcha': 0x596, 'revia': 0x597, 'pashta': 0x599, 'yetiv': 0x59a, 'tevir': 0x59b,
        'geresh': 0x59c, 'gershayim': 0x59e, 'telisha_g': 0x5a0, 'pazer': 0x5a1,
        'munach': 0x5a3, 'mahpakh': 0x5a4, 'merkha': 0x5a5, 'darga': 0x5a7, 'qadma': 0x5a8,
        'telisha_q': 0x5a9, 'zarqa': 0x5ae,    # the WLC writes the prose zarqa as U+05AE
        'silluq': 0x5bd, 'legarmeh': 0x5a3}
# placed by position, not by stress (WLC: 100% / 100% / 100% / 81.5% / 99.7% / 100%)
LAST_LETTER = {'pashta', 'segolta', 'zarqa', 'telisha_q'}
FIRST_LETTER = {'yetiv', 'telisha_g'}

# how many servants a divider may have before it must be divided again
# (the tails counted in the WLC: silluq never more than merkha, tifcha never
# more than merkha, zaqef munach (munach munach 1.0%), segolta up to two,
# pashta telisha_q qadma mahpakh, revia munach darga munach, geresh up to
# munach munach telisha_q qadma, pazer and telisha gedola a string of munachs)
MAX_SERVANTS = {'silluq': 1, 'etnachta': 1, 'tifcha': 1, 'zaqef_q': 1, 'segolta': 2,
                'pashta': 3, 'revia': 2, 'tevir': 3, 'zarqa': 3, 'geresh': 4,
                'pazer': 5, 'telisha_g': 5,
                'zaqef_g': 0, 'yetiv': 0, 'gershayim': 0, 'legarmeh': 0}
# the dividers each governor takes: (the nearest, the others)
NEAR_FAR = {'silluq': ('tifcha', 'zaqef'), 'etnachta': ('tifcha', 'zaqef'),
            'zaqef_q': ('pashta', 'revia'), 'tifcha': ('tevir', 'revia'), 'segolta': ('zarqa', 'revia'),
            'pashta': ('rank4', 'rank4'), 'tevir': ('rank4', 'rank4'), 'zarqa': ('rank4', 'rank4'),
            'revia': ('rank4', 'rank4')}
# a silluq or etnachta clause of two or more units is always divided
# (WLC: a 2-unit clause is "tifcha etnachta" 100%, "tifcha silluq" 100%)
MUST_DIVIDE = {'silluq', 'etnachta'}
# how many units a divider's own domain holds, at the 90-95% point of the WLC's
# counts (tifcha 1-4: 94%; pashta 1-4: 97%; tevir 1-4: 96%; zaqef up to 7: 93%;
# revia up to 5: 92%; segolta up to 8: 93%); beyond this the phrasing divides again
MAX_DOMAIN = {'tifcha': 4, 'pashta': 4, 'tevir': 4, 'zarqa': 4, 'zaqef_q': 7, 'revia': 5,
              'segolta': 8, 'geresh': 5, 'pazer': 6, 'telisha_g': 6,
              'yetiv': 1, 'zaqef_g': 1, 'gershayim': 1, 'legarmeh': 1}

_TABLES = None
def tables():
    """The decision tables tools/learn_teamim.py counted out of the WLC."""
    global _TABLES
    if _TABLES is None:
        with open(os.path.join(HERE, 'teamim_tables.json'), encoding='utf-8') as fh:
            _TABLES = json.load(fh)
    return _TABLES

def lookup(name, key, default):
    """Majority answer for the most specific prefix of `key` the table has seen."""
    t = tables().get(name, {})
    k = list(key)
    while k:
        v = t.get('|'.join(str(x) for x in k))
        if v is not None:
            return v
        k.pop()
    return default


# ------------------------------------------------------------ the word
class Unit(object):
    """One accentual unit: the pointed word (no accents) and where its stress is."""
    def __init__(self, word, stress_slot=None):
        self.w = N(word)
        self.letters = []          # [(char, [vowel codes])] for the consonants
        for ch in self.w:
            o = ord(ch)
            if IS_CONS(ch):
                self.letters.append([ch, []])
            elif self.letters and (o in VOWEL or o in HALF or o == SHEVA or o == DAGESH):
                self.letters[-1][1].append(o)
        self.syl = [i for i, (ch, vs) in enumerate(self.letters) if self._full(ch, vs)]
        # the letter whose full vowel is stressed (one of self.syl)
        self.stress_letter = self._stress_letter(stress_slot)
        self.marks = []            # [(letter index, code)] laid by the grammar
        self.paseq = False
        self.label = ''
        self.locked = False        # a hand ruling: no division may be forced after this unit

    @staticmethod
    def _full(ch, vs):
        if any(v in VOWEL for v in vs): return True
        return ch == u'ו' and DAGESH in vs and not any(v in VOWEL or v in HALF or v == SHEVA for v in vs)

    def _is_mater(self, li):
        """a vav carrying only the syllable's holam or shuruk, after a consonant with no vowel of its own"""
        if li <= 0 or li >= len(self.letters): return False
        ch, vs = self.letters[li]
        return ch == u'ו' and not self.letters[li - 1][1] and \
            (0x5b9 in vs or (DAGESH in vs and not any(v in VOWEL for v in vs)))

    def set_stress_syllable(self, li):
        """Record the stressed syllable from a letter index that may be the letter an
           accent sits on: a consonant before a mater (לְשׁ֣וֹן, ה֣וּא) means the mater's
           syllable; a letter with no full vowel means the syllable before it."""
        if li is None or not self.letters: return
        li = max(0, min(li, len(self.letters) - 1))
        if li not in self.syl and li + 1 < len(self.letters) and (li + 1) in self.syl and self._is_mater(li + 1):
            li += 1
        while li > 0 and li not in self.syl:
            li -= 1
        self.stress_letter = li

    def _stress_letter(self, slot):
        """`slot` is the reader's vowel-slot index (reader_surface.js _swVowelSlots:
           every vowel sign including sheva and hataf, plus a shuruk), None meaning the
           last slot, which is Hebrew's default."""
        slots = []
        w = self.w
        for i, c in enumerate(w):
            o = ord(c)
            if 0x5b0 <= o <= 0x5bb or o == 0x5c7: slots.append(i)
            elif o == DAGESH and i > 0 and w[i - 1] == u'ו':
                nx = ord(w[i + 1]) if i + 1 < len(w) else 32
                if not (0x5b0 <= nx <= 0x5bb or nx == 0x5c7): slots.append(i)
        if not slots or not self.letters:
            return len(self.letters) - 1 if self.letters else None
        default = slot is None or slot >= len(slots)
        k = len(slots) - 1 if default else slot
        p = slots[k]
        li = sum(1 for c in w[:p] if IS_CONS(c)) - 1
        if li < 0: li = 0
        # the stressed vowel is a full one: a closing sheva belongs to the syllable before it
        while li > 0 and li not in self.syl:
            li -= 1
        return self._skip_furtive(li) if default else li

    def _skip_furtive(self, li):
        """The default stress is the last vowel, but a patah under a final ח, ע or
           הּ after another vowel is the furtive patah, a glide and not a syllable
           (רוּחַ, מָשִׁיחַ, שָׂמוֹחַ): the stress, and the accent, sit on the vowel
           before it (WLC ר֣וּחַ, מָשִׁ֣יחַ). The stress table lists the forms the
           Tanakh has; the ones it lacks (בַּמָּשִׁיחַ, שָׂמוֹחַ, לִשְׂמֹחַ) take this rule."""
        if li != len(self.letters) - 1: return li
        ch, vs = self.letters[li]
        furtive = (ch in u'חע' and vs == [0x5b7]) or (ch == u'ה' and sorted(vs) == [0x5b7, DAGESH])
        if not furtive: return li
        prev = [l for l in self.syl if l < li]
        return prev[-1] if prev else li

    def accent_letter(self):
        """Where a stress accent is written: on the stressed syllable's consonant, which
           for a mater vav is the consonant before it (WLC: לְשׁ֣וֹן, ה֣וּא)."""
        li = self.stress_letter
        if li is None: return len(self.letters) - 1
        return li - 1 if self._is_mater(li) else li

    # features the rules ask about
    def syl_before(self):
        return sum(1 for l in self.syl if l < self.stress_letter)
    def syl_after(self):
        return sum(1 for l in self.syl if l > self.stress_letter)
    def half_before(self):
        """letters before the stress carrying only a sheva or hataf (a half syllable)"""
        return sum(1 for i, (ch, vs) in enumerate(self.letters)
                   if i < self.stress_letter and vs and not any(v in VOWEL for v in vs)
                   and any(v in HALF or v == SHEVA for v in vs))
    def half_after(self):
        return sum(1 for i, (ch, vs) in enumerate(self.letters)
                   if i > self.stress_letter and vs and not any(v in VOWEL for v in vs)
                   and any(v in HALF or v == SHEVA for v in vs))
    def stress_final(self):
        return self.syl_after() == 0
    def nsyl(self):
        return len(self.syl)

    def encode(self):
        # a token with no vowel at all (a numeral, a bare letter) carries no mark
        if not any(vs for _, vs in self.letters): return u''
        per = {}
        for li, code in self.marks:
            per.setdefault(li, []).append(code)
        s = u''.join(chr(0x30 + li) + u''.join(chr(c) for c in cs) for li, cs in sorted(per.items()) if li < 0x4f)
        if self.paseq: s += u'׀'
        return s


def between(serv, gov):
    """full syllables between the servant's stressed syllable and its governor's"""
    return serv.syl_after() + gov.syl_before()

def between_all(serv, gov):
    """the same, counting a sheva or hataf letter as a syllable too, which is how
       the choice of the tevir's servant counts them"""
    return serv.syl_after() + serv.half_after() + gov.syl_before() + gov.half_before()


# ------------------------------------------------------------ the rules
def place(u, label):
    """Lay the accent `label` on unit u."""
    u.label = label
    n = len(u.letters)
    if n == 0: return
    code = CODE[label]
    if label in LAST_LETTER:
        u.marks.append((n - 1, code))
        # the pashta is doubled on the stressed syllable when the stress is not
        # final (WLC: 98.6% of those; 0.3% of the final-stressed); the second
        # mark is written as qadma, which has the same shape
        if label == 'pashta' and not u.stress_final() and u.accent_letter() != n - 1:
            u.marks.append((u.accent_letter(), CODE['qadma']))
    elif label in FIRST_LETTER:
        u.marks.append((0, code))
    else:
        u.marks.append((u.accent_letter(), code))
    if label == 'legarmeh':
        u.paseq = True


def zaqef_key(u):
    return ('mq' if u'־' in u.w else 'one', 'h%d' % min(u.half_before(), 2),
            'b%d' % min(u.syl_before(), 3), 'a%d' % min(u.syl_after(), 1))

def zaqef_form(u):
    """A zaqef standing alone (no servant, no division of its own): gadol or qatan.
       Counted by whether the unit is a maqqef group and by the syllables before
       and after the stress: gadol on the short word (לֹא, לֵאמֹר, וַיָּבֹא), qatan
       on the long one (וַיִּתְקַדְּשׁוּ, כָּל־הַמֵּבִין)."""
    return lookup('zaqef_alone', zaqef_key(u), 'zaqef_g')


def pashta_form(u):
    """A pashta standing alone is yetiv when the stressed syllable begins the word
       (WLC 99.0%: דָּן, הֵמָּה, אֵלֶּה; but וְאֵלֶּה and בְּנֵי keep pashta)."""
    return 'yetiv' if (u.syl_before() == 0 and u.half_before() == 0) else 'pashta'


def geresh_form(u, standalone):
    """gershayim on a word with no servant and final stress (99.9%); geresh otherwise (99.8%)."""
    return 'gershayim' if (standalone and u.stress_final()) else 'geresh'


def rank4_key(gov, from_near, dist, own, first, u):
    """geresh, telisha gedola, pazer or munach legarmeh: by the governor, the
       divider's index from the nearest, its distance to the governor, the size of
       its own domain, whether it opens the governor's domain, and its length
       (legarmeh stands on a short word two before the revia: 91% at one
       syllable, 65% at two; gershayim on a long one, 94% at three)."""
    return (gov, 'n%d' % min(from_near, 2), 'd%d' % min(dist, 5), 'o%d' % min(own, 2),
            'f' if first else 'm', 's%d' % min(u.nsyl() + u.half_before(), 3))

def rank4_form(gov, from_near, dist, own, first, u):
    key = rank4_key(gov, from_near, dist, own, first, u)
    f = lookup('rank4', key, 'geresh')
    if f in ('geresh', 'gershayim'):
        f = geresh_form(u, own == 1)
    if f == 'legarmeh' and own != 1:
        f = 'geresh'
    return f


def servants(gov_label, gov, tail):
    """Name the servants `tail` (nearest last) of the governor unit `gov`."""
    n = len(tail)
    out = [''] * n
    if n == 0: return out
    g = gov_label
    def nearest(u):
        if g in ('silluq', 'tifcha'): return 'merkha'
        if g in ('etnachta', 'zaqef_q', 'segolta', 'revia', 'pazer', 'telisha_g'): return 'munach'
        if g == 'pashta':
            # merkha when nothing at all lies between the two stresses, not even a
            # sheva (WLC 98-99%: בֵּית לֶחֶם, לְךָ אִישׁ); else mahpakh (97-100%)
            return 'merkha' if between_all(u, gov) == 0 else 'mahpakh'
        if g == 'tevir':
            # merkha when the stresses are close, darga when they are not; counted
            # with the shevas: 0 syllables between 92% merkha, 1 (84-86%), 2 darga (69-82%)
            return 'merkha' if between_all(u, gov) <= 1 else 'darga'
        if g == 'zarqa':
            return 'merkha' if between(u, gov) == 0 else 'munach'
        if g == 'geresh': return 'qadma'
        return 'munach'
    def second(u, first):
        if g in ('etnachta', 'zaqef_q', 'segolta', 'pazer', 'telisha_g'): return 'munach'
        if g == 'revia': return 'darga'
        if g in ('pashta', 'tevir', 'zarqa'):
            # qadma, but munach on a true monosyllable, one with no sheva or hataf
            # either (WLC 100%: כִּי, לוֹ, אֶת; but בְּנֵי and אֲשֶׁר take qadma, 95-100%)
            if u.nsyl() == 1 and u.half_before() + u.half_after() == 0: return 'munach'
            return 'qadma'
        if g == 'geresh': return 'telisha_q'
        return 'munach'
    def third(u):
        if g in ('pashta', 'tevir', 'zarqa'): return 'telisha_q'
        return 'munach'
    out[n - 1] = nearest(tail[n - 1])
    if n >= 2: out[n - 2] = second(tail[n - 2], tail[n - 1])
    if n >= 3: out[n - 3] = third(tail[n - 3])
    for i in range(n - 3):
        out[i] = 'munach'
    return out


# ------------------------------------------------------------ the verse
def accent_verse(words, bounds, stress_of=None, weakest=None, stress_letters=None, joiner=None):
    """Lay the te'amim over one verse.

       words      the units in reading order (pointed, no accents; maqqef groups as one)
       bounds     for each unit i, the rank of the division AFTER it: 1 (the
                  verse's main division), 2, 3, 4, or 0 for no division. The last
                  unit's own entry is ignored (it ends the verse).
       stress_of  word -> the reader's vowel-slot index of the stress, or None
       weakest    (units, lo, hi, governor label, near) -> index in [lo, hi)
                  after which to divide a tail that is too long for its governor
                  (units[hi]); `near` is where the window begins in which the
                  near divider would leave the governor its servants; None when
                  every word there reaches forward. Without it the earliest
                  position that leaves the governor its servants
       joiner     (units, lo, hi) -> index in [lo, hi) of a word to join to the
                  one after it, as a maqqef would, when a tail cannot be divided
                  (לֹא נִרְאָה becomes לֹא־נִרְאָה: no accent of its own); None
                  when nothing there joins
       stress_letters  per unit, the index of the stressed consonant when it is
                  known outright (the test hands over the Masoretes' own); None
                  falls back to stress_of
       returns    [code string per unit], [label per unit]"""
    units = [Unit(w, stress_of(w) if stress_of else None) for w in words]
    if stress_letters:
        for u, li in zip(units, stress_letters):
            if li is not None: u.set_stress_syllable(li)
    n = len(units)
    if n == 0: return [], []
    b = list(bounds) + [0] * (n - len(bounds))
    # a bound of -1 is a ruling that the link after this unit stays closed
    for i in range(n):
        if b[i] == -1:
            b[i] = 0; units[i].locked = True
        units[i].bound = b[i]          # what the chooser may see of the tree
    b[n - 1] = 0
    joined = set()
    place(units[n - 1], 'silluq')
    if n == 1:
        return [u.encode() for u in units], [u.label for u in units]

    def dividers(s, e, clause=False):
        """the divisions inside [s, e): the strongest rank present (smallest number).
           A silluq or etnachta clause is divided by its rank-2 boundaries only:
           a comma's boundary (rank 3) stays under the tifcha the clause will be
           forced to take, and rises to a zaqef only when that domain outgrows
           its accent (וַיְהִ֗י כַּאֲשֶׁ֥ר הָלַ֛ךְ שְׁלֹ֥שֶׁת יָמִ֖ים בַּמִּדְבָּ֑ר: a revia under
           the tifcha, not a zaqef of its own)."""
        if clause:
            return [i for i in range(s, e) if b[i] == 2]
        rs = [b[i] for i in range(s, e) if b[i]]
        if not rs: return []
        r = min(rs)
        return [i for i in range(s, e) if b[i] == r]

    def assign(s, e, glabel, grank):
        """units[e] carries glabel (rank grank); name everything in [s, e)."""
        g = units[e]
        is_clause = glabel in ('silluq', 'etnachta')
        divs = dividers(s, e, is_clause)
        limit = MAX_SERVANTS.get(glabel, 0)
        # a tail longer than the governor allows is divided again, at the weakest
        # link; a silluq or etnachta clause is divided whatever its length
        guard = 0
        while guard < 64:
            guard += 1
            last = divs[-1] if divs else s - 1
            tail_len = sum(1 for i in range(last + 1, e) if i not in joined)
            need = tail_len > limit or (glabel in MUST_DIVIDE and e > s and not divs)
            if not need: break
            # THE NEAR DIVIDER STANDS NEAR ITS GOVERNOR: the tifcha within a word
            # or two of the etnachta, the pashta of the zaqef. So the division
            # goes at the best link among the positions that leave the governor
            # its servants; what lies before it becomes the new divider's own
            # domain, with any lesser divisions already marked there as its
            # sub-divisions. Only when every word there reaches forward (a
            # construct, אֲשֶׁר, לֹא) does the search widen to the whole tail, and
            # when the whole tail reaches forward a word is joined to the next
            # instead, as the Masoretes' maqqef does (לֹא־נִרְאָה).
            lo = last + 1
            near = max(lo, e - 1 - limit)
            at = weakest(units, lo, e, glabel, near) if weakest else near
            if at is None and joiner:
                j = joiner(units, lo, e)
                if j is not None and j not in joined and j <= e - 1:
                    joined.add(j)
                    continue
            if at is None or at < lo or at > e - 1: at = near
            while at in joined and at > lo: at -= 1
            b[at] = b[divs[0]] if divs else min(grank + 1, 4)
            units[at].bound = b[at]
            divs = dividers(s, e, is_clause)

        def label_divs(divs):
            k = len(divs)
            near, far = NEAR_FAR.get(glabel, ('rank4', 'rank4'))
            labels = []
            for idx, d in enumerate(divs):
                from_near = k - 1 - idx
                dist = e - d
                own = d - (divs[idx - 1] if idx > 0 else s - 1)
                u = units[d]
                if glabel in ('silluq', 'etnachta'):
                    if from_near == 0:
                        lab = 'tifcha'
                    else:
                        lab = zaqef_form(u) if own == 1 else 'zaqef_q'
                        # the farthest division of the etnachta clause, far from the
                        # etnachta, is segolta (WLC: 87.5% at 9+ units, 80% with three
                        # divisions after it at 6+)
                        if glabel == 'etnachta' and idx == 0 and own >= 2:
                            if lookup('segolta', ('k%d' % min(from_near, 3), 'd%d' % min(dist, 9)), 'zaqef_q') == 'segolta':
                                lab = 'segolta'
                elif near == 'rank4':
                    lab = rank4_form(glabel, from_near, dist, own, idx == 0, u)
                else:
                    # the nearest division takes the near form; so does the second
                    # when a third stands behind it (WLC zaqef: "revia pashta pashta"
                    # 86-100% with three divisions, "revia pashta" with two); the
                    # farther ones are revia
                    lab = near if (from_near == 0 or (from_near == 1 and k >= 3)) else far
                    if lab == 'pashta' and own == 1: lab = pashta_form(u)
                labels.append(lab)
            return labels

        labels = label_divs(divs)
        # A DOMAIN HAS A SIZE ITS ACCENT CARRIES. A tifcha governs one to four
        # units in the Tanakh (94%), a pashta or tevir the same, a zaqef up to
        # seven, a revia five; a tifcha left with eleven words is a shape the
        # Masoretes never wrote. So a divider whose domain outgrows its accent
        # takes a division of its own rank before it, at the best link within
        # reach, and the clause becomes a chain: zaqef, zaqef, tifcha. Only for
        # phrasing this file is asked to make (weakest given): the Tanakh's own
        # trees are taken as they are.
        guard = 0
        while weakest and guard < 32:
            guard += 1
            grew = False
            for idx in range(len(divs) - 1, -1, -1):
                d = divs[idx]
                prev = divs[idx - 1] if idx > 0 else s - 1
                own = sum(1 for i in range(prev + 1, d + 1) if i not in joined)
                cap = MAX_DOMAIN.get(labels[idx], 99)
                # a domain that opens with a division of its own, a one-word
                # clause like וַיְהִי, may run one unit over: its five units are
                # "revia ... tevir ... tifcha" (וַיְהִ֗י כַּאֲשֶׁ֥ר הָלַ֛ךְ שְׁלֹ֥שֶׁת יָמִ֖ים)
                if d > prev + 1 and b[prev + 1]: cap += 1
                if own <= cap: continue
                lo = prev + 1
                at = weakest(units, lo, d, labels[idx], max(lo, d - cap))
                if at is None: continue
                b[at] = b[d]
                units[at].bound = b[at]
                divs = dividers(s, e, is_clause)
                labels = label_divs(divs)
                grew = True
                break
            if not grew: break
        for idx, d in enumerate(divs):
            place(units[d], labels[idx])
        for idx, d in enumerate(divs):
            prev = divs[idx - 1] if idx > 0 else s - 1
            assign(prev + 1, d, labels[idx], (b[d] if b[d] else grank + 1))
        last = divs[-1] if divs else s - 1
        tail = [units[i] for i in range(last + 1, e) if i not in joined]
        for u, lab in zip(tail, servants(glabel, g, tail)):
            if lab: place(u, lab)

    # THE VERSE DIVIDES AT THE ETNACHTA, and each half is a clause of its own:
    # the one ending in the etnachta and the one ending in the silluq, each
    # divided by its zaqefs and its tifcha. A verse short enough has no
    # etnachta (WLC: none under four units, 11% at four, 49% at five, 68% at
    # six, 92% at eight) and the silluq clause is the whole of it.
    p = [i for i in range(n - 1) if b[i] == 1]
    if p:
        p = p[0]
        for i in range(p + 1, n - 1):
            if b[i] == 1: b[i] = 2
        place(units[p], 'etnachta')
        assign(0, p, 'etnachta', 1)
        assign(p + 1, n - 1, 'silluq', 1)
    else:
        assign(0, n - 1, 'silluq', 1)
    codes = [u.encode() for u in units]
    # a joined word is written as the Masoretes write it: a maqqef to the next
    # word and no accent of its own (מִצְוֺת־יְהוָֽה); the layer draws the maqqef
    for i in joined:
        if codes[i] == u'' and any(vs for _, vs in units[i].letters): codes[i] = u'־'
    return codes, [u.label for u in units]
