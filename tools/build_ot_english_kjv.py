#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rebuild ot_english.js — the Old Testament Dual column — from the King James
Version, ALIGNED TO THE MASORETIC VERSE NUMBERS the site's Hebrew uses.

User decision 2026-09-11: the OT column is the KJV (public domain), so the
plain chapter pages can carry it; the Koren column it replaces is
copyrighted and could not go on a crawlable page. The old KJV column (before
2026-08-23) was pasted in by KJV numbers and drifted against the Hebrew in
139 chapters (Psalm superscriptions, Joel 3, Malachi 4, Isaiah 9:1 …). This
build maps every KJV verse to its Hebrew number, half-verses included, so
the column aligns 1:1 with the 23,204 Hebrew verses.

INPUTS (cached in ~/.cache/ot-gloss-audit/kjv/, not in the repo):
  <NN>-<BK>eng-kjv2006.usfm   KJV 1769 text, ebible.org/Scriptures/eng-kjv2006_usfm.zip
                              (public domain). Has the psalm titles as \\d lines.
  tvtms.txt                   STEPBible "TVTMS – Translators Versification
                              Traditions …" (github.com/STEPBible/STEPBible-Data,
                              CC BY 4.0; the licence asks that the raw file not be
                              redistributed, so it stays out of the repo). Its
                              trailing KJV→Hebrew table drives the alignment.
OUTPUT: ot_english.js, same shape as before (the search index, the manifest
builder and the Dual view all read it). The pre-commit hook rebuilds the
per-book chunks (step 5) and the static pages (step 6) from it.

Run:  python3 tools/build_ot_english_kjv.py            (writes ot_english.js)
      python3 tools/build_ot_english_kjv.py --check    (diagnostics only)
"""
import io, os, re, sys, json, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.expanduser('~/.cache/ot-gloss-audit/kjv')
CHECK = '--check' in sys.argv
NOMARK = []

# SIL/USFM code → ot_english.js book key, in the file's book order.
BOOKS = [
 ('GEN','Gen','Genesis'),('EXO','Exo','Exodus'),('LEV','Lev','Leviticus'),('NUM','Num','Numbers'),
 ('DEU','Deu','Deuteronomy'),('JOS','Jos','Joshua'),('JDG','Jdg','Judges'),('RUT','Rut','Ruth'),
 ('1SA','1Sa','1 Samuel'),('2SA','2Sa','2 Samuel'),('1KI','1Ki','1 Kings'),('2KI','2Ki','2 Kings'),
 ('1CH','1Ch','1 Chronicles'),('2CH','2Ch','2 Chronicles'),('EZR','Ezr','Ezra'),('NEH','Neh','Nehemiah'),
 ('EST','Est','Esther'),('JOB','Job','Job'),('PSA','Psa','Psalms'),('PRO','Pro','Proverbs'),
 ('ECC','Ecc','Ecclesiastes'),('SNG','Sng','Song of Songs'),('ISA','Isa','Isaiah'),('JER','Jer','Jeremiah'),
 ('LAM','Lam','Lamentations'),('EZK','Ezk','Ezekiel'),('DAN','Dan','Daniel'),('HOS','Hos','Hosea'),
 ('JOL','Jol','Joel'),('AMO','Amo','Amos'),('OBA','Oba','Obadiah'),('JON','Jon','Jonah'),('MIC','Mic','Micah'),
 ('NAM','Nam','Nahum'),('HAB','Hab','Habakkuk'),('ZEP','Zep','Zephaniah'),('HAG','Hag','Haggai'),
 ('ZEC','Zec','Zechariah'),('MAL','Mal','Malachi'),
]
SIL2KEY = {sil: key for _, sil, key in BOOKS}

# ---------- 1. the KJV text ----------
def strip_usfm(t):
    t = re.sub(r'\\f\s.*?\\f\*', '', t)                       # footnotes
    t = re.sub(r'\\\+?w\s([^|\\]*)\|[^\\]*\\\+?w\*', r'\1', t)  # \w word|strong="…"\w*
    t = re.sub(r'\\\+?(nd|add|wj|qs|it|bd)\s', '', t)          # inline openers
    t = re.sub(r'\\\+?(nd|add|wj|qs|it|bd)\*', '', t)          # inline closers
    t = re.sub(r'\\[a-z]+\d?\s?', ' ', t)                      # any other marker
    t = t.replace('¶', '').replace('\u2019', "'")             # pilcrows; straight apostrophes like the other five columns
    return re.sub(r'\s+', ' ', t).strip()

def load_kjv():
    """{(Book key, chapter, verse): text}; verse 0 is the psalm title."""
    kjv = {}
    for usfm, sil, key in BOOKS:
        files = glob.glob(os.path.join(CACHE, '*-%seng-kjv2006.usfm' % usfm))
        if not files: sys.exit('missing USFM for %s in %s' % (usfm, CACHE))
        ch, v, buf = 0, None, []
        def flush():
            if v is not None: kjv[(key, ch, v)] = strip_usfm(' '.join(buf))
        for line in io.open(files[0], encoding='utf-8'):
            line = line.rstrip('\n')
            m = re.match(r'\\c (\d+)', line)
            if m: flush(); ch, v, buf = int(m.group(1)), None, []; continue
            m = re.match(r'\\d (.*)', line)
            if m: flush(); v, buf = 0, [m.group(1)]; continue
            m = re.match(r'\\v (\d+)\s?(.*)', line)
            if m: flush(); v, buf = int(m.group(1)), [m.group(2)]; continue
            if re.match(r'\\(id|h|toc\d|mt\d?|s\d?|r|ms\d?)\b', line): continue
            if v is not None: buf.append(line)                # \q1/\p continuation lines
        flush()
    return kjv

# ---------- 2. KJV → Hebrew numbering (TVTMS trailing table) ----------
REF = re.compile(r'^([1-3]?[A-Za-z]{2,3})\.(\d+):(\d+)([ab]?)$')
def refs(cell, book_hint=None):
    """'Psa.51:1,2' / '1Sa.20:42; 21:1' / 'Isa.63:19; 64:1' → [(sil,ch,v,part)…]"""
    out, book, ch = [], book_hint, None
    for piece in re.split(r'\s*[;,]\s*', cell.strip()):
        if not piece: continue
        m = REF.match(piece)
        if m: book, ch = m.group(1), int(m.group(2)); out.append((book, ch, int(m.group(3)), m.group(4)))
        elif re.match(r'^\d+:\d+[ab]?$', piece):
            c, v = piece.split(':'); ch = int(c); out.append((book, ch, int(re.sub('[ab]', '', v)), v[-1] if v[-1] in 'ab' else ''))
        elif re.match(r'^\d+[ab]?$', piece):
            out.append((book, ch, int(re.sub('[ab]', '', piece)), piece[-1] if piece[-1] in 'ab' else ''))
        else: return None
    return out

def load_map():
    """{(sil,ch,v) KJV: [(sil,ch,v,part) Hebrew…]} for every KJV verse the table moves."""
    lines = io.open(os.path.join(CACHE, 'tvtms.txt'), encoding='utf-8-sig').read().split('\n')
    end = next(i for i, l in enumerate(lines) if l.startswith('#DataEnd(Expanded)'))
    mp = {}
    for l in lines[end:]:
        cells = [c.strip() for c in l.split('\t')]
        if len(cells) < 2 or not cells[0]: continue
        src, dst = refs(cells[0]), refs(cells[1], None)
        if src is None or dst is None or not src: continue
        if src[0][0] not in SIL2KEY: continue
        if dst == []: continue                                   # 'Neh.7:69' has an empty cell: OVERRIDE covers it
        for s in src:
            mp.setdefault(s[:3], []).append((s, dst))
    return mp

# Where the site's Hebrew departs from the numbering TVTMS assumes for the
# Hebrew tradition, the site wins (its Hebrew is untouchable). KJV verse →
# list of Hebrew verses, or None when the Hebrew has no such text.
OVERRIDE = {}
def _ov(book, kjv_vs, heb_vs, ch):
    for kv, hv in zip(kjv_vs, heb_vs): OVERRIDE[(book, ch, kv)] = None if hv is None else [(book, ch, hv)]
# Joshua 21 keeps 43 verses (user, 2026-08-22): the Leningrad codex lacks KJV
# 21:36-37 (Reuben's cities); TVTMS numbers the Hebrew chapter with 45.
_ov('Joshua', range(36, 46), [None, None] + list(range(36, 44)), 21)
# Nehemiah 7:68 (horses and mules) is likewise absent from the Leningrad text;
# TVTMS folds it into 7:67, but the Hebrew does not contain it.
_ov('Nehemiah', range(68, 74), [None, 68, 69, 70, 71, 72], 7)
# Psalm 38: TVTMS has no row for KJV 38:16 and would join it into 38:16;
# the site's 38:17 IS that verse ("For I said, lest they rejoice over me").
_ov('Psalms', [16], [17], 38)
# The Ten Commandments: the site's Hebrew keeps the traditional verse count
# (Exodus 20 = 23, Deuteronomy 5 = 30) — the four short commandments are one
# verse; TVTMS assumes the 26/33-verse numbering.
for kv in (13, 14, 15, 16): OVERRIDE[('Exodus', 20, kv)] = [('Exodus', 20, 13)]
_ov('Exodus', range(17, 27), range(14, 24), 20)
for kv in (17, 18, 19, 20): OVERRIDE[('Deuteronomy', 5, kv)] = [('Deuteronomy', 5, 17)]
_ov('Deuteronomy', range(21, 34), range(18, 31), 5)

# Where one KJV verse feeds two Hebrew verses, the KJV text has to be cut.
# The marker begins the SECOND part. Checked against the Hebrew of each verse.
SPLIT = {
 ('1 Samuel', 20, 42): 'And he arose and departed',   # MT 21:1 begins here
 ('1 Kings', 22, 43):  'nevertheless the high places', # MT 22:44
 ('1 Chronicles', 12, 4): 'and Jeremiah, and Jahaziel', # MT 12:5
 ('Psalms', 51, 0): 'when Nathan',                    # MT 51:2 בְּבוֹא־אֵלָיו נָתָן
 ('Psalms', 52, 0): 'when Doeg',                      # MT 52:2
 ('Psalms', 54, 0): 'when the Ziphims',               # MT 54:2
 ('Psalms', 60, 0): 'when he strove',                 # MT 60:2 בְּהַצּוֹתוֹ
}

def build(keys):
    have = set(keys)
    kjv = load_kjv()
    mp = load_map()
    # Hebrew verse → [(KJV key, part-index, part-count)] in KJV order
    heb = collections.defaultdict(list)
    joins, splits, dropped = [], [], []
    for (key, ch, v), text in kjv.items():
        sil = next(s for u, s, k in BOOKS if k == key)
        rows = mp.get((sil, ch, v))
        if (key, ch, v) in OVERRIDE:
            tgt = OVERRIDE[(key, ch, v)]
            if tgt is None: dropped.append((key, ch, v)); continue
            for hk in tgt: heb[hk].append(((key, ch, v), 0, 1))
            continue
        if not rows:
            # a psalm title the table does not move is part of the Hebrew verse 1
            heb[(key, ch, max(v, 1))].append(((key, ch, v), 0, 1)); continue
        # the table lists a KJV verse once; a KJV verse named in a many-to-one
        # row ('Isa.63:19; 64:1 → Isa.63:19') appears under each source ref
        src, dst = rows[0]
        if dst is None:                                  # no Hebrew verse for it
            dropped.append((key, ch, v)); continue
        if len(dst) == 1:
            d = dst[0]; heb[(SIL2KEY[d[0]], d[1], d[2])].append(((key, ch, v), 0, 1))
        else:                                            # one KJV verse → several Hebrew
            # The table follows BHS; where the site's Hebrew does not number a
            # target (Num 25:19 — the site keeps "after the plague" inside 26:1),
            # the whole KJV verse goes to the target that exists.
            dst = [d for d in dst if (SIL2KEY[d[0]], d[1], d[2]) in have] or dst
            if len(dst) == 1:
                d = dst[0]; heb[(SIL2KEY[d[0]], d[1], d[2])].append(((key, ch, v), 0, 1)); continue
            splits.append(((key, ch, v), dst))
            for i, d in enumerate(dst):
                heb[(SIL2KEY[d[0]], d[1], d[2])].append(((key, ch, v), i, len(dst)))
    # assemble text per Hebrew verse
    out = {}
    for hk, parts in heb.items():
        parts.sort(key=lambda p: p[0][1:])               # KJV order (chapter, verse; title 0 first)
        pieces = []
        for (kk, i, n) in parts:
            t = kjv[kk]
            if n > 1:
                marker = SPLIT.get(kk)
                if not marker or marker not in t:
                    print('NO SPLIT MARKER for KJV %s → %d Hebrew verses: %s' % (kk, n, t)); NOMARK.append(kk); continue
                a, b = t.split(marker, 1); halves = [a.strip(), (marker + b).strip()]
                if n != 2: sys.exit('three-way split unsupported: %s' % (kk,))
                t = halves[i]
            pieces.append(t)
        if len(parts) > 1: joins.append((hk, [p[0] for p in parts]))
        out[hk] = re.sub(r'\s+', ' ', ' '.join(pieces)).strip()
    return kjv, out, joins, splits, dropped

# ---------- 3. the site's Hebrew: the key space ----------
def hebrew_keys():
    """Every (book, chapter, verse) the readers show, from the current column's keys
    (they were verified 1:1 against ot_verses when the Koren column was built)."""
    raw = io.open(os.path.join(ROOT, 'ot_english.js'), encoding='utf-8').read()
    data = json.loads(raw[raw.index('['):raw.rindex(']') + 1])
    return [(e['book'], e['chapter'], e['verse']) for e in data]

def main():
    keys = hebrew_keys()
    kjv, out, joins, splits, dropped = build(keys)
    missing = [k for k in keys if k not in out]
    unused = sorted(set(out) - set(keys))
    print('KJV verses read: %d (+%d psalm titles)' % (sum(1 for k in kjv if k[2] > 0), sum(1 for k in kjv if k[2] == 0)))
    print('Hebrew verses: %d   with English: %d   missing: %d   unused English: %d   dropped KJV: %s'
          % (len(keys), len(keys) - len(missing), len(missing), len(unused), dropped))
    if CHECK or missing or unused:
        for k in missing[:40]: print('  MISSING', k)
        for k in unused[:40]: print('  UNUSED ', k, out[k][:60])
    if CHECK:
        print('\nsplits (one KJV verse → two Hebrew verses):')
        for kk, dst in splits:
            for i, d in enumerate(dst):
                hk = (SIL2KEY[d[0]], d[1], d[2]); print('  %s part %d → %s: %s' % (kk, i + 1, hk, out[hk][:90]))
        print('\njoins (several KJV pieces → one Hebrew verse), excluding plain psalm titles:')
        for hk, parts in sorted(joins):
            if hk[0] == 'Psalms' and len(parts) == 2 and parts[0][2] == 0 and parts[1][1:] == hk[1:]: continue
            print('  %s ← %s: %s' % (hk, [p[1:] for p in parts], out[hk][:100]))
        n_title = sum(1 for hk, parts in joins if hk[0] == 'Psalms' and parts[0][2] == 0)
        print('\npsalm titles folded into a Hebrew verse together with verse text: %d' % n_title)
    if missing or unused or NOMARK:
        sys.exit('alignment incomplete — not writing')
    if CHECK: return
    rows = [{'book': b, 'chapter': c, 'verse': v, 'english': out[(b, c, v)]} for (b, c, v) in keys]
    body = ','.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in rows)
    io.open(os.path.join(ROOT, 'ot_english.js'), 'w', encoding='utf-8').write('window._otEnglishData = [' + body + '];\n')
    print('wrote ot_english.js: %d rows' % len(rows))

if __name__ == '__main__':
    main()
