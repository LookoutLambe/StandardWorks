#!/usr/bin/env python3
"""Build ot_phrase_breaks.js — where each Old Testament verse breathes, exactly.

    python3 tools/build_phrase_breaks.py

WHY THIS IS DIFFERENT FROM THE RULES. read_aloud.js phrases by rule, and the
rules were measured against the te'amim rather than guessed
(tools/measure_teamim.py). But a rule is an inference, and for the Old
Testament no inference is needed: this text IS the Masoretic Text, and the
Masoretes marked every break in it a thousand years ago. Genesis 1:9 by rule
comes out in three phrases with "and said God" swallowed into the next clause;
by the accents it is four, with a revia setting it off. Theirs is right.

The Book of Mormon can never have this — nobody accented Nephi — so it keeps
the rules. The OT does not have to.

WHERE IT COMES FROM, AND WHAT IT DOES NOT TOUCH. The corpus has no accents in
it and none are added: this is a separate lookup, exactly as ot_stress.js is.
The Tanakh's Hebrew is untouchable.

    source: ~/Desktop/morphhb/wlc/*.xml   (OpenScriptures, public domain)
    output: ot_phrase_breaks.js  →  window.SW_BREAKS["Genesis|1|1"] = [2]

    meaning: break AFTER word index 2 (0-based) — that is the atnach on
    אֱלֹהִים, the division of the verse.

THE TWO HARD PARTS.

 1. THE TOKENISATIONS DO NOT AGREE. This corpus writes אֵת־הַשָּׁמַיִם as one
    word joined by maqqef; the WLC writes אֵת and הַשָּׁמַיִם as two <w>
    elements. Word indices therefore cannot be compared directly. So the
    alignment walks the letters: consume WLC words until their concatenation
    equals this corpus's token, and the break belongs to the LAST one
    consumed. Everything is NFC-normalised first, because the two sources
    order combining marks differently — the same trap build_stress_map.py
    documents.

 2. THE VERSIFICATION DIVERGES in Psalms, Malachi and Joel, where this corpus
    follows the Masoretic numbering and the WLC's osisID does not always
    agree. Rather than trust the reference, every verse is matched by CONTENT
    and a mismatch is reported, never silently accepted. A verse that cannot
    be aligned simply gets no entry and read_aloud falls back to the rules.

RANK. Only the emperors and kings ship — the divisions of the verse and of its
halves. Taking every disjunctive down to the dukes chops Genesis 1:1 into four
phrases for seven words, which is correct for chant and far too fine to read
along to.
"""
import glob, json, os, re, sys, unicodedata as ud
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

WLC = os.path.expanduser('~/Desktop/morphhb/wlc')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RANK = {0x0591: 1, 0x0592: 2, 0x0593: 2, 0x0594: 2, 0x0595: 2, 0x0597: 2,
        0x0596: 3, 0x0598: 3, 0x0599: 3, 0x059A: 3, 0x059B: 3,
        0x059C: 4, 0x059D: 4, 0x059E: 4, 0x059F: 4, 0x05A0: 4, 0x05A1: 4,
        0x05A2: 2, 0x05AB: 3, 0x05AD: 3, 0x05AE: 3}
BREAK_AT = 2
BARE = lambda h: re.sub(u'[\u0591-\u05BD\u05BF-\u05C7]', '', h or '')
try:
    MT = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     'mt_break_before.json'), encoding='utf-8'))
except Exception:
    MT = {}
ALL_ACC = set(range(0x0591, 0x05B0)) | {0x05BD}

N = lambda s: ud.normalize('NFC', s)
# For ALIGNMENT ONLY, and consonants only. This corpus and the WLC agree on
# every letter and disagree on small points of vocalisation — לָילָה against
# לָיְלָה, הַמָאוֹר against הַמָּאוֹר, וּלְהַבְדִּיל against וּלֲהַבְדִּיל.
# Comparing vowels rejected half the Tanakh over sheva-versus-hataf. The
# consonantal skeleton is what identifies a word, and it matches exactly.
CMP = lambda s: ''.join(c for c in N(s) if 'א' <= c <= 'ת')

# THE KETIV IS NOT READ, so it is not a word the break positions count. The
# Masoretes kept both readings where the written text and the spoken one
# diverge: the ketiv parenthesised and unpointed, the qere bracketed and
# pointed. read_aloud.js skips the first, and if this file did not, every
# break after one in the same verse would land a word out. The same test,
# stated twice, in the two languages that need it.
KETIV = re.compile(r'^\(.*\)$')
POINTED = re.compile(u'[\u05B0-\u05BB\u05BD\u05BF\u05C1\u05C2\u05C7]')
def ketiv(h): return bool(KETIV.match(h or '')) and not POINTED.search(h or '')


def drop_ketiv(tokens, breaks):
    """Re-number break positions into the list of words that are SPOKEN.

       THE KETIV STAYS FOR THE ALIGNMENT AND GOES FOR THE INDEX. It has to
       stay, because the WLC word this corpus is being aligned against carries
       the ketiv's own consonants — dropping it before the walk cost two
       points of alignment, 94.1% down to 92.1%, since the qere's consonants
       are by definition the ones that differ. And it has to go from the
       index, because read_aloud.js will not say it. A break landing on the
       ketiv itself moves back to the last word actually spoken."""
    keep = [i for i, t in enumerate(tokens) if not ketiv(t)]
    at = {}
    pos = -1
    for i in range(len(tokens)):
        if not ketiv(tokens[i]): pos += 1
        at[i] = pos                      # a ketiv inherits the word before it
    out = []
    for b in breaks:
        n = at.get(b, -1)
        if n >= 0 and n < len(keep) - 1 and (not out or out[-1] != n):
            out.append(n)
    return out

# this corpus's file prefix -> the WLC's book file
BOOKS = [
    ('gen', 'Gen'), ('exo', 'Exod'), ('lev', 'Lev'), ('num', 'Num'),
    ('deu', 'Deut'), ('jos', 'Josh'), ('jdg', 'Judg'), ('rth', 'Ruth'),
    ('1sa', '1Sam'), ('2sa', '2Sam'), ('1ki', '1Kgs'), ('2ki', '2Kgs'),
    ('1ch', '1Chr'), ('2ch', '2Chr'), ('ezr', 'Ezra'), ('neh', 'Neh'),
    ('est', 'Esth'), ('job', 'Job'), ('psa', 'Ps'), ('pro', 'Prov'),
    ('ecc', 'Eccl'), ('sos', 'Song'), ('isa', 'Isa'), ('jer', 'Jer'),
    ('lam', 'Lam'), ('eze', 'Ezek'), ('dan', 'Dan'), ('hos', 'Hos'),
    ('joe', 'Joel'), ('amo', 'Amos'), ('oba', 'Obad'), ('jon', 'Jonah'),
    ('mic', 'Mic'), ('nah', 'Nah'), ('hab', 'Hab'), ('zep', 'Zeph'),
    ('hag', 'Hag'), ('zec', 'Zech'), ('mal', 'Mal'),
]


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


def english_names():
    """prefix -> the name the reader keys verses by (READER.books[].en)."""
    src = open(os.path.join(ROOT, 'ot.html'), encoding='utf-8').read()
    out = {}
    for m in re.finditer(r"\{prefix:'([a-z0-9]+)',\s*en:'([^']+)'", src):
        out[m.group(1)] = m.group(2)
    return out


def wlc_verses(book):
    """[(osisID, [(word, breaks_after_it), ...]), ...] for one WLC book."""
    path = os.path.join(WLC, book + '.xml')
    if not os.path.isfile(path):
        return []
    src = open(path, encoding='utf-8').read()
    out = []
    for m in re.finditer(r'<verse[^>]*osisID="([^"]+)"[^>]*>(.*?)</verse>', src, re.S):
        ws = [w.replace('/', '') for w in re.findall(r'<w[^>]*>([^<]+)</w>', m.group(2))]
        marked = []
        for i, w in enumerate(ws):
            ranks = [RANK[ord(c)] for c in w if ord(c) in RANK]
            brk = (i == len(ws) - 1) or (bool(ranks) and min(ranks) <= BREAK_AT)
            marked.append((w, brk))
        if marked:
            out.append((m.group(1), marked))
    return out


def corpus_verses(prefix):
    """[(chapter, verse_no, [token, ...]), ...] for one book of this corpus."""
    path = os.path.join(ROOT, 'ot_verses', prefix + '.js')
    if not os.path.isfile(path):
        return []
    src = open(path, encoding='utf-8').read()
    out = []
    # A JS identifier cannot begin with a digit, so 1 Samuel's variables are
    # _1sa_ch1Verses, not 1sa_ch1Verses. Seven books read as zero verses until
    # this allowed the leading underscore.
    for m, body in array_bodies(src, r'var _?%s_ch(\d+)Verses\s*=\s*\[' % prefix):
        ch = int(m.group(1))
        for vi, vm in enumerate(re.finditer(r'\{\s*num:\s*"[^"]*"\s*,\s*words:\s*\[(.*?)\]\s*\}',
                                            body, re.S)):
            toks = [t for t in re.findall(r'\["([^"]*)","[^"]*"\]', vm.group(1))]
            toks = [N(t) for t in toks if CMP(t)]      # drop bare punctuation
            if toks:
                out.append((ch, vi + 1, toks))
    return out


def align(tokens, marked):
    """Break indices into `tokens`, or None if the two do not describe the
       same verse. Walks the letters, because the maqqef groups differ."""
    breaks, wi = [], 0
    for ti, tok in enumerate(tokens):
        want, got, last_brk = CMP(tok), '', False
        if not want:
            continue
        while wi < len(marked) and len(got) < len(want):
            w, brk = marked[wi]
            got += CMP(w)
            last_brk = brk
            wi += 1
        if got != want:
            return None
        if last_brk and ti < len(tokens) - 1:
            breaks.append(ti)
    return breaks if wi == len(marked) else None


def main():
    if not os.path.isdir(WLC):
        sys.exit('WLC not found at %s' % WLC)
    names = english_names()
    table, ok, miss, verses = {}, 0, 0, 0
    misses_by_book = {}
    for prefix, wlcbook in BOOKS:
        en = names.get(prefix)
        if not en:
            continue
        wl = wlc_verses(wlcbook)
        by_ref = {}
        for osis, marked in wl:
            parts = osis.split('.')
            if len(parts) == 3:
                by_ref[(int(parts[1]), int(parts[2]))] = marked
        for ch, v, toks in corpus_verses(prefix):
            verses += 1
            marked = by_ref.get((ch, v))
            got = align(toks, marked) if marked else None
            if got is None:
                # THE 1,366 THAT WOULD NOT ALIGN STILL GET AN ANSWER. A
                # versification or spelling divergence loses this verse's own
                # accents, and it used to fall through to read_aloud.js's nine
                # rules with nothing else. But the Tanakh has an opinion about
                # the WORDS in it — how often a break falls in front of each,
                # over every other place it occurs — and that opinion is
                # already built for the Book of Mormon. Same table, same
                # threshold.
                miss += 1
                misses_by_book[en] = misses_by_book.get(en, 0) + 1
                keep = [t for t in toks if not ketiv(t)]
                fb = []
                for i in range(len(keep) - 1):
                    r = MT.get(BARE(keep[i + 1]))
                    if r and r[1] >= 25 and r[0] / float(r[1]) >= 0.75:
                        if not fb or i - fb[-1] >= 2: fb.append(i)
                if fb:
                    table['%s|%d|%d' % (en, ch, v)] = fb
                continue
            ok += 1
            got = drop_ketiv(toks, got)
            if got:
                table['%s|%d|%d' % (en, ch, v)] = got

    body = json.dumps(table, ensure_ascii=False, separators=(',', ':'))
    path = os.path.join(ROOT, 'ot_phrase_breaks.js')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write('// ot_phrase_breaks.js — auto-generated by tools/build_phrase_breaks.py.\n')
        fh.write('// DO NOT EDIT. Where each verse breathes, from the disjunctive te\'amim\n')
        fh.write('// of the Westminster Leningrad Codex: the indices of the words a phrase\n')
        fh.write('// ENDS on. The corpus has no accents and none are added; this is a\n')
        fh.write('// separate lookup, exactly as ot_stress.js is.\n')
        fh.write('window.SW_BREAKS = Object.assign(window.SW_BREAKS || {}, %s);\n' % body)

    print('verses: %s   aligned: %s (%.1f%%)   unaligned: %s'
          % (format(verses, ','), format(ok, ','), 100 * ok / max(verses, 1), format(miss, ',')))
    print('shipped: %s verses carry at least one internal break   (%s KB)'
          % (format(len(table), ','), format(os.path.getsize(path) // 1024, ',')))
    if misses_by_book:
        worst = sorted(misses_by_book.items(), key=lambda x: -x[1])[:8]
        print('\nunaligned by book (versification or spelling differences):')
        for b, n in worst:
            print('   %-16s %s' % (b, format(n, ',')))


if __name__ == '__main__':
    main()
