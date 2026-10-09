#!/usr/bin/env python3
"""Build ot_teamim/<prefix>.js — the cantillation layer of the Old Testament.

    python3 tools/build_ot_teamim.py

THE USER'S CALL (2026-10-09): "put it as a layer in the website in the
settings". The Tanakh's verse data has no te'amim and none are added to it:
ot_verses stays exactly as it is (it is untouchable). This is a separate lookup,
like ot_phrase_breaks.js and ot_stress.js, read by teamim.js only while the
reader has the layer switched on, and laid over the DISPLAY of each word (the
.hw span). data-h, search, the scorecards, transliteration and read-aloud never
see an accent.

    source: ~/Desktop/morphhb/wlc/*.xml   (OpenScriptures Hebrew Bible, the
            Westminster Leningrad Codex, public domain)
    output: ot_teamim/<prefix>.js  →  window.SW_TEAMIM["Genesis|1|1"] = "…"

ALIGNED BY LETTER, NOT BY WORD. The two texts cut words differently (this
corpus joins אֵת־הַשָּׁמַיִם with a maqqef where the WLC has two <w>), and
here and there they spell differently. So the whole verse is reduced to its
consonants on both sides, the two consonant strings are matched (identical in
the great majority of verses; difflib's matching blocks where they are not),
and every corpus consonant that matches a WLC consonant takes that consonant's
accents. A consonant with no counterpart takes none: an accent is only ever
copied onto the letter the Masoretes put it on.

WHAT IS AN ACCENT HERE. The te'amim U+0591–U+05AE and meteg U+05BD. Not the
masora circle U+05AF (the apparatus is not shown, see feedback-no-masoretic-
apparatus), not the vowels (the corpus has its own and they are not touched),
and not paseq, which is a separate mark between words: it is carried as a flag
on the word it follows.

ENCODING, per verse, one string: the words of the verse in render order (every
token but the bare sof pasuq, which is exactly the index renderWords gives
data-wid) joined by "|". Within a word: for each consonant that carries
accents, one ASCII character chr(0x30 + its consonant index) followed by the
accent characters; a trailing U+05C0 means a paseq follows the word. An empty
word string means nothing to lay over it. Ketiv words (unpointed, in
parentheses) are never accented.
"""
import difflib, glob, json, os, re, sys, unicodedata as ud

WLC = os.path.expanduser('~/Desktop/morphhb/wlc')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'ot_teamim')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_phrase_breaks import BOOKS, array_bodies, english_names  # noqa: E402

N = lambda s: ud.normalize('NFC', s)
IS_CONS = lambda c: 'א' <= c <= 'ת'
ACCENT = set(range(0x0591, 0x05AF)) | {0x05BD}
KETIV = re.compile(r'^\(.*\)$')
POINTED = re.compile('[ְ-ׇֻֽֿׁׂ]')
def is_ketiv(t): return bool(KETIV.match(t)) and not POINTED.search(t)


def wlc_stream(book):
    """{(ch, v): [(consonant, accents, paseq_after)]} for one WLC book."""
    src = open(os.path.join(WLC, book + '.xml'), encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'<verse[^>]*osisID="[^".]+\.(\d+)\.(\d+)"[^>]*>(.*?)</verse>', src, re.S):
        stream = []
        for item in re.finditer(r'<w[^>]*>([^<]+)</w>|<seg type="x-paseq">', m.group(3)):
            if item.group(1) is None:                       # paseq: after the word before it
                if stream:
                    c, a, _ = stream[-1]
                    stream[-1] = (c, a, True)
                continue
            for ch in N(item.group(1).replace('/', '')):
                if IS_CONS(ch):
                    stream.append((ch, '', False))
                elif ord(ch) in ACCENT and stream:
                    c, a, p = stream[-1]
                    stream[-1] = (c, a + ch, p)
        out[(int(m.group(1)), int(m.group(2)))] = stream
    return out


def corpus_book(prefix):
    """[(ch, v, [token, ...])] in render order: every token but the bare sof pasuq."""
    path = os.path.join(ROOT, 'ot_verses', prefix + '.js')
    src = open(path, encoding='utf-8').read()
    out = []
    for m, body in array_bodies(src, r'var _?%s_ch(\d+)Verses\s*=\s*\[' % prefix):
        ch = int(m.group(1))
        for vi, vm in enumerate(re.finditer(r'\{\s*num:\s*"[^"]*"\s*,\s*words:\s*\[(.*?)\]\s*\}', body, re.S)):
            toks = [N(t) for t in re.findall(r'\["([^"]*)","(?:[^"\\]|\\.)*"\]', vm.group(1)) if t != '׃']
            out.append((ch, vi + 1, toks))
    return out


def encode_verse(toks, stream):
    """The verse string, and how many of the corpus's pointed consonants took a match."""
    corpus = []                                   # (token index, consonant index within token)
    for ti, t in enumerate(toks):
        k = 0
        for ch in t:
            if IS_CONS(ch):
                corpus.append((ti, k)); k += 1
    cs =''.join(ch for t in toks for ch in t if IS_CONS(ch))
    ws = ''.join(c for c, _, _ in stream)
    per_tok = [{} for _ in toks]
    paseq = [False] * len(toks)
    matched = 0
    sm = difflib.SequenceMatcher(None, cs, ws, autojunk=False)
    for blk in sm.get_matching_blocks():
        if blk.size < 2 and cs != ws:             # a lone matching letter proves nothing
            continue
        for j in range(blk.size):
            ti, k = corpus[blk.a + j]
            _, acc, ps = stream[blk.b + j]
            matched += 1
            if is_ketiv(toks[ti]):
                continue
            if acc:
                per_tok[ti][k] = per_tok[ti].get(k, '') + acc
            # a paseq after the word's LAST consonant belongs to the word
            if ps and (blk.a + j + 1 == len(corpus) or corpus[blk.a + j + 1][0] != ti):
                paseq[ti] = True
    words = []
    for ti in range(len(toks)):
        s = ''.join(chr(0x30 + k) + acc for k, acc in sorted(per_tok[ti].items()) if k < 0x4F)
        if paseq[ti]: s += '׀'
        words.append(s)
    return '|'.join(words), matched, len(cs)


def main():
    if not os.path.isdir(WLC):
        sys.exit('WLC not found at %s' % WLC)
    os.makedirs(OUT, exist_ok=True)
    names = english_names()
    tot_cons = tot_match = verses = full = moved = empty = 0
    worst = []
    for prefix, wlcbook in BOOKS:
        en = names.get(prefix)
        if not en or not os.path.isfile(os.path.join(ROOT, 'ot_verses', prefix + '.js')):
            continue
        wl = wlc_stream(wlcbook)
        table = {}
        b_cons = b_match = 0
        for ch, v, toks in corpus_book(prefix):
            verses += 1
            cs = ''.join(c for t in toks for c in t if IS_CONS(c))
            # the same reference first; where the versification diverges, the
            # best of its neighbours, and only if it is plainly the same verse
            cands = [(ch, v), (ch, v - 1), (ch, v + 1), (ch - 1, v), (ch + 1, v - 1), (ch + 1, v)]
            best = None
            for ref in cands:
                st = wl.get(ref)
                if not st: continue
                ws = ''.join(c for c, _, _ in st)
                r = 1.0 if ws == cs else difflib.SequenceMatcher(None, cs, ws, autojunk=False).ratio()
                if best is None or r > best[0]: best = (r, ref, st)
                if r == 1.0: break
            if not best or best[0] < 0.6:
                empty += 1
                b_cons += len(cs)
                continue
            if best[1] != (ch, v): moved += 1
            enc, matched, n = encode_verse(toks, best[2])
            b_cons += n; b_match += matched
            if matched == n: full += 1
            elif n: worst.append((matched / n, '%s %d:%d' % (en, ch, v)))
            if enc.replace('|', ''):
                table['%s|%d|%d' % (en, ch, v)] = enc
        tot_cons += b_cons; tot_match += b_match
        body = json.dumps(table, ensure_ascii=False, separators=(',', ':'))
        with open(os.path.join(OUT, prefix + '.js'), 'w', encoding='utf-8') as fh:
            fh.write('// ot_teamim/%s.js — auto-generated by tools/build_ot_teamim.py. DO NOT EDIT.\n' % prefix)
            fh.write('// The cantillation layer for %s: the Masoretic accents of the Westminster\n' % en)
            fh.write('// Leningrad Codex, by word and consonant. Read only while the layer is on;\n')
            fh.write('// the verse data is never touched.\n')
            fh.write('window.SW_TEAMIM = Object.assign(window.SW_TEAMIM || {}, %s);\n' % body)
    size = sum(os.path.getsize(p) for p in glob.glob(os.path.join(OUT, '*.js')))
    print('verses %s · fully aligned %s (%.1f%%) · from a neighbouring reference %s · no match %s'
          % (format(verses, ','), format(full, ','), 100.0 * full / max(verses, 1), moved, empty))
    print('consonants %s · matched %s (%.2f%%) · %s KB in ot_teamim/'
          % (format(tot_cons, ','), format(tot_match, ','), 100.0 * tot_match / max(tot_cons, 1), format(size // 1024, ',')))
    worst.sort()
    print('lowest partial matches:', ', '.join('%s %.0f%%' % (r, 100 * f) for f, r in worst[:12]))


if __name__ == '__main__':
    main()
