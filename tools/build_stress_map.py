#!/usr/bin/env python3
"""Build <vol>_stress.js — where the accent falls in every word of every volume.

    python3 tools/build_stress_map.py

WHAT THIS IS FOR. The reader shows a small "<" above the stressed vowel, so a
reader who does not know Hebrew can say the word with the accent in the right
place. Hebrew stress is not written, and it is not always final — הוֹרוּנִי is
horu-NÍ but מֶלֶךְ is MÉ-lekh — so it has to come from somewhere.

WHERE IT COMES FROM. The Masoretic accents. Every accented word in the
Westminster Leningrad Codex carries its te'am on the stressed syllable, so the
WLC is a stress lexicon of 45,000 forms if you read it as one. None of that
accentuation is in this repo's text and none is added to it: this builds a
SEPARATE lookup table, and the verse data is not touched. It cannot be — the
Book of Mormon's Hebrew is locked and the Tanakh's is untouchable.

    source: ~/Desktop/morphhb/wlc/*.xml   (OpenScriptures, public domain text)
    output: ot_stress.js, nt_stress.js, dc_stress.js, pgp_stress.js,
            jst_stress.js, bom/stress.js

FOUR THINGS THAT ARE EASY TO GET WRONG, all of which this got wrong first:

 1. THE ACCENT MARKS A CONSONANT, NOT A VOWEL, and its vowel may follow it.
    לְשׁ֣וֹן has munah on the shin while the holam sits on the vav after it —
    the mark belongs over the holam. But מֶ֛לֶךְ has tevir AFTER the segol it
    marks. So: find the letter the accent is attached to, then take that
    letter's own vowel, or the following mater's if it has none.

 2. SEVEN ACCENTS ARE PLACED BY POSITION, NOT BY STRESS. The prepositive ones
    (telisha gedola, yetiv, dehi) always sit on the first letter and the
    postpositive ones (telisha qetana, pashta, segolta, zarqa) on the last,
    whatever the stress. Reading those teaches the wrong syllable, so words
    accented only with them are skipped.

 3. THE WLC AND THIS CORPUS ORDER COMBINING MARKS DIFFERENTLY — the WLC writes
    dagesh before sheva and the shin dot before its vowel; this corpus does the
    reverse. Both sides are NFC-normalised. Without that, בְּרֵאשִׁית, שָׁלוֹם,
    דָּבָר and בְּרִית all silently missed and coverage read 46% instead of 82%.

 4. THE MAQQEF IS NOT A LETTER. Counting it as one shifted every joined word
    a position, which put the mark on the resh of בְּכׇל־מוּסַר instead of the
    samekh it belongs on.

ONLY THE EXCEPTIONS ARE SHIPPED. Hebrew stress is final unless something says
otherwise, and 83% of the corpus's forms are final-stressed, so those get no
entry at all and the reader assumes the last vowel. That is the difference
between 484 KB and 2.8 MB.
"""
import json, glob, os, re, sys, unicodedata as ud

WLC = os.path.expanduser('~/Desktop/morphhb/wlc')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PREPOSITIVE  = {0x05A0, 0x059A, 0x05AD}
POSTPOSITIVE = {0x05A9, 0x0599, 0x0592, 0x0598}
ACCENTS = set(range(0x0591, 0x05B0)) - PREPOSITIVE - POSTPOSITIVE - {0x05AF}
VOWELS  = set(range(0x05B0, 0x05BC)) | {0x05BB, 0x05C7}
ALL_ACC = set(range(0x0591, 0x05B0)) | {0x05BD}

PREFIXES = ('וְהַ', 'וּבְ', 'וְ', 'וּ', 'וַ', 'הַ', 'הָ', 'הֶ', 'בְּ', 'בַּ', 'בִּ', 'בָּ',
            'לְ', 'לַ', 'לִ', 'לָ', 'מִ', 'מֵ', 'כְּ', 'כַּ', 'שֶׁ')

N = lambda s: ud.normalize('NFC', s)
is_letter = lambda c: 'א' <= c <= 'ת'
strip_accents = lambda s: ''.join(c for c in s if ord(c) not in ALL_ACC)


def vowel_slots(w):
    """Every position that DISPLAYS a vowel, in order. A shureq is a dagesh
       sitting inside a vav and carries its syllable's vowel on that vav, so it
       counts; a dagesh anywhere else does not."""
    out = []
    for i, c in enumerate(w):
        if ord(c) in VOWELS:
            out.append(i)
        elif ord(c) == 0x05BC and i > 0 and w[i - 1] == 'ו':
            nxt = w[i + 1] if i + 1 < len(w) else ' '
            if ord(nxt) not in VOWELS:
                out.append(i)
    return out


def stressed_slot(w, accent_pos):
    """Index into vowel_slots(w) of the vowel the accent marks. See note 1."""
    slots = vowel_slots(w)
    if not slots:
        return None
    letter = max((i for i in range(accent_pos + 1) if is_letter(w[i])), default=None)
    if letter is None:
        return None
    nxt = next((i for i in range(letter + 1, len(w)) if is_letter(w[i])), len(w))
    own = [n for n, i in enumerate(slots) if letter < i < nxt]
    if own:
        return own[0]                      # מֶ֛לֶךְ — the accent's own letter has a vowel
    after = [n for n, i in enumerate(slots) if i > nxt]
    return after[0] if after else len(slots) - 1   # שָׁל֔וֹם — it is on the mater


def read_wlc():
    if not os.path.isdir(WLC):
        sys.exit('WLC not found at %s — this needs OpenScriptures morphhb on the Desktop.' % WLC)
    counts = {}
    for f in glob.glob(os.path.join(WLC, '*.xml')):
        src = open(f, encoding='utf-8').read()
        for w in re.findall(r'<w[^>]*>([^<]+)</w>', src):
            w = w.replace('/', '')          # the source marks morpheme cuts
            acc = [i for i, c in enumerate(w) if ord(c) in ACCENTS]
            if not acc:
                continue
            n = stressed_slot(w, acc[-1])
            if n is None:
                continue
            key = N(strip_accents(w))
            if key:
                counts.setdefault(key, {})
                counts[key][n] = counts[key].get(n, 0) + 1
    return {k: max(v, key=v.get) for k, v in counts.items()}


def resolve(word, lex):
    """(slot, source). Falls back through the maqqef and one prefix before
       giving up and assuming final stress."""
    if word in lex:
        return lex[word], 'wlc'
    if '־' in word:                          # the maqqef is not a letter — see note 4
        head, _, tail = word.rpartition('־')
        if tail in lex:
            return len(vowel_slots(head)) + lex[tail], 'maqqef'
    for p in PREFIXES:
        pn = N(p)
        if word.startswith(pn) and word[len(pn):] in lex:
            return len(vowel_slots(pn)) + lex[word[len(pn):]], 'prefix'
    slots = vowel_slots(word)
    return (len(slots) - 1 if slots else 0), 'default'


VOLUMES = [('ot',  'ot_verses/*.js',  'ot_stress.js'),
           ('nt',  'nt_verses/*.js',  'nt_stress.js'),
           ('dc',  'dc_verses/*.js',  'dc_stress.js'),
           ('pgp', 'pgp_verses/*.js', 'pgp_stress.js'),
           ('jst', 'jst_verses/*.js', 'jst_stress.js'),
           ('bom', 'bom/verses/*.js', 'bom/stress.js')]

def main():
    lex = read_wlc()
    print('WLC stress lexicon: %s forms' % format(len(lex), ','))
    print('\n%-5s %10s %10s %11s %9s' % ('vol', 'tokens', 'forms', 'from the MT', 'shipped'))
    for vol, pattern, outfile in VOLUMES:
        tokens = []
        for f in sorted(glob.glob(os.path.join(ROOT, pattern))):
            src = open(f, encoding='utf-8').read()
            tokens += [m.group(1) for m in re.finditer(r'\["([^"]*)","[^"]*"\]', src)]
        tokens = [N(t) for t in tokens if t and t != '׃']
        forms = {}
        for t in tokens:
            forms[t] = forms.get(t, 0) + 1
        evidence = 0
        exceptions = {}
        for w, n in forms.items():
            slot, src = resolve(w, lex)
            if src != 'default':
                evidence += n
            slots = vowel_slots(w)
            if slots and slot != len(slots) - 1:      # only the exceptions travel
                exceptions[w] = slot
        body = json.dumps(exceptions, ensure_ascii=False, separators=(',', ':'))
        path = os.path.join(ROOT, outfile)
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write('// %s — auto-generated by tools/build_stress_map.py. DO NOT EDIT.\n' % outfile)
            fh.write('// Where the accent falls, for the words of this volume whose stress is NOT\n')
            fh.write('// on the last vowel. Everything absent from this table takes the last vowel,\n')
            fh.write('// which is Hebrew\'s default and 83%% of the corpus. Derived from the Masoretic\n')
            fh.write('// accents of the Westminster Leningrad Codex; the verse data is never touched.\n')
            fh.write('window.SW_STRESS = Object.assign(window.SW_STRESS || {}, %s);\n' % body)
            # the table is deferred, so it lands after the first chapter is on
            # screen — tell the reader to sweep what is already there.
            fh.write("if (typeof window.__swStressArrived === 'function') window.__swStressArrived();\n")
        print('%-5s %10s %10s %10.0f%% %9s' % (
            vol, format(len(tokens), ','), format(len(forms), ','),
            100 * evidence / max(len(tokens), 1),
            format(len(exceptions), ',')))

if __name__ == '__main__':
    main()
