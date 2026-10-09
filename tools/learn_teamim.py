#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Count the te'amim rules out of the Westminster Leningrad Codex.

    python3 tools/learn_teamim.py        -> tools/teamim_tables.json

THE MASORETES LEFT 18,701 WORKED EXAMPLES in the 21 prose books, and the
grammar in tools/teamim_grammar.py is read off them rather than written from
a handbook. Most rules are clean enough to be code there (one merkha before a
silluq, a tifcha nearest the etnachta, gershayim only on a word with no
servant and final stress). Three are lookups, because the choice turns on
several things at once, and those are counted here and shipped as tables:

    zaqef_alone   a zaqef with no servant and no division of its own: gadol or
                  qatan, by the half-syllables and syllables before the stress
                  and the syllables after it
    segolta       the farthest division of the etnachta clause: segolta or
                  zaqef, by how many divisions follow it and how far it stands
                  from the etnachta
    rank4         the fourth-rank dividers (geresh, gershayim, telisha gedola,
                  pazer, munach legarmeh), by the governor, the divider's index
                  from the nearest, its distance to the governor and the size
                  of its own domain

and one model: where a phrase is likeliest to end. tools/build_bom_teamim.py
needs that for the divisions the printed English does not mark (a tifcha
clause may hold one servant, so a three-word clause must divide, and the
question is where). It is the log-odds that a disjunctive of ANY rank follows
a word, over the same gloss-and-Hebrew features tools/learn_phrasing.py uses
for the reader's breaths, counted over every adjacent pair the WLC accents.

    source: ~/Desktop/morphhb/wlc/*.xml   (OpenScriptures, public domain)
"""
import collections, glob, json, math, os, re, sys, unicodedata as ud

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WLC = os.path.expanduser('~/Desktop/morphhb/wlc')
sys.path.insert(0, HERE)
import teamim_grammar as G
from build_bom_breaks import feats as pair_feats, array_bodies

POETIC = {'Ps', 'Prov', 'Job'}
N = lambda s: ud.normalize('NFC', s)
ACC = set(range(0x591, 0x5af))
NAME = {0x591: 'etnachta', 0x592: 'segolta', 0x593: 'shalshelet', 0x594: 'zaqef_q', 0x595: 'zaqef_g',
        0x596: 'tifcha', 0x597: 'revia', 0x598: 'zarqa', 0x599: 'pashta', 0x59a: 'yetiv', 0x59b: 'tevir',
        0x59c: 'geresh', 0x59d: 'geresh_muqdam', 0x59e: 'gershayim', 0x59f: 'qarney_para',
        0x5a0: 'telisha_g', 0x5a1: 'pazer', 0x5a2: 'atnah_hafukh', 0x5a3: 'munach', 0x5a4: 'mahpakh',
        0x5a5: 'merkha', 0x5a6: 'merkha_kef', 0x5a7: 'darga', 0x5a8: 'qadma', 0x5a9: 'telisha_q',
        0x5aa: 'yerah', 0x5ab: 'ole', 0x5ac: 'iluy', 0x5ad: 'dehi', 0x5ae: 'zarqa'}
RANK = {'silluq': 0, 'etnachta': 1,
        'segolta': 2, 'shalshelet': 2, 'zaqef_q': 2, 'zaqef_g': 2, 'tifcha': 2,
        'revia': 3, 'zarqa': 3, 'pashta': 3, 'yetiv': 3, 'tevir': 3,
        'geresh': 4, 'geresh_muqdam': 4, 'gershayim': 4, 'pazer': 4, 'telisha_g': 4,
        'qarney_para': 4, 'legarmeh': 4}
CONJ = {'munach', 'mahpakh', 'merkha', 'merkha_kef', 'darga', 'qadma', 'telisha_q', 'yerah', 'atnah_hafukh'}
POSITIONAL = {0x5a0, 0x59a, 0x5a9, 0x599, 0x592, 0x5ae, 0x598}
IS_CONS = lambda c: u'א' <= c <= u'ת'


def units_of(verse_xml):
    """The verse as accentual units (maqqef groups), each with its accent names,
       whether a paseq follows, and the letter its stress accent sits on."""
    toks = []
    for item in re.finditer(r'<w[^>]*>([^<]+)</w>|<seg type="x-(paseq|maqqef|sof-pasuq)"[^>]*>', verse_xml):
        if item.group(1) is not None:
            toks.append(('w', N(item.group(1).replace('/', ''))))
        else:
            toks.append(('s', item.group(2)))
    groups, cur, i = [], [], 0
    while i < len(toks):
        kind, val = toks[i]
        if kind == 'w':
            cur.append(val)
            if i + 1 < len(toks) and toks[i + 1] == ('s', 'maqqef'):
                i += 2; continue
            groups.append((u'־'.join(cur), i + 1 < len(toks) and toks[i + 1] == ('s', 'paseq')))
            cur = []
        i += 1
    if cur: groups.append((u'־'.join(cur), False))
    out = []
    for word, paseq in groups:
        codes = [ord(c) for c in word if ord(c) in ACC]
        names = {NAME[c] for c in codes if c in NAME}
        bare = u''.join(c for c in word if ord(c) not in ACC and ord(c) != 0x5bd)
        # the letter a non-positional accent sits on = the stress
        li, stress = -1, None
        for ch in word:
            if IS_CONS(ch): li += 1
            elif ord(ch) in ACC and ord(ch) not in POSITIONAL and stress is None: stress = li
        out.append({'w': bare, 'acc': names, 'paseq': paseq, 'stress': stress})
    n = len(out)
    for i, u in enumerate(out):
        if i == n - 1: lab = 'silluq'
        else:
            d = [x for x in u['acc'] if x in RANK]
            if 'munach' in u['acc'] and u['paseq'] and not d: d = ['legarmeh']
            if d: lab = min(d, key=lambda x: RANK[x])
            else:
                c = [x for x in u['acc'] if x in CONJ]
                lab = c[0] if c else ''
        u['lab'] = lab
        u['rank'] = RANK.get(lab)
    return out


def prose_verses():
    for f in sorted(glob.glob(os.path.join(WLC, '*.xml'))):
        b = os.path.basename(f)[:-4]
        if b in POETIC or b == 'VerseMap': continue
        src = open(f, encoding='utf-8').read()
        for m in re.finditer(r'<verse[^>]*osisID="([^"]+)"[^>]*>(.*?)</verse>', src, re.S):
            us = units_of(m.group(2))
            if us: yield b, m.group(1), us


def domains(us):
    """{i: (start, governor)} for every disjunctive unit."""
    out, n = {}, len(us)
    for i, u in enumerate(us):
        r = u['rank']
        if r is None: continue
        g = n - 1
        for j in range(i + 1, n):
            if us[j]['rank'] is not None and us[j]['rank'] < r: g = j; break
        s = 0
        for j in range(i - 1, -1, -1):
            if us[j]['rank'] is not None and us[j]['rank'] <= r: s = j + 1; break
        out[i] = (s, g)
    return out


def gunit(u):
    """The grammar's view of a WLC unit, its stress taken from the accent itself."""
    x = G.Unit(u['w'])
    if u['stress'] is not None:
        x.set_stress_syllable(u['stress'])
    return x


def count_tables():
    T = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))
    for book, ref, us in prose_verses():
        doms = domains(us)
        for i, (s, g) in doms.items():
            lab, r = us[i]['lab'], us[i]['rank']
            L = i - s + 1
            if lab in ('zaqef_q', 'zaqef_g') and L == 1:
                key = G.zaqef_key(gunit(us[i]))
                for k in range(1, len(key) + 1): T['zaqef_alone']['|'.join(key[:k])][lab] += 1
            divs = [j for j in range(s, i) if us[j]['rank'] == r + 1]
            if lab == 'etnachta' and divs:
                f = divs[0]; fs, fg = doms[f]
                if f - fs + 1 >= 2 and us[f]['lab'] in ('segolta', 'zaqef_q', 'zaqef_g'):
                    key = ('k%d' % min(len(divs) - 1, 3), 'd%d' % min(i - f, 9))
                    for k in range(1, 3): T['segolta']['|'.join(key[:k])]['segolta' if us[f]['lab'] == 'segolta' else 'zaqef_q'] += 1
            if lab in ('pashta', 'tevir', 'zarqa', 'revia'):
                for idx, d in enumerate(reversed(divs)):
                    ds, dg = doms[d]
                    f = us[d]['lab']
                    if f == 'gershayim': f = 'geresh'            # the split by stress is the grammar's
                    if f not in ('geresh', 'telisha_g', 'pazer', 'legarmeh'): continue
                    key = G.rank4_key(lab, idx, i - d, d - ds + 1, d == s, gunit(us[d]))
                    for k in range(1, len(key) + 1): T['rank4']['|'.join(key[:k])][f] += 1
    out = {}
    for name, tab in T.items():
        out[name] = {k: c.most_common(1)[0][0] for k, c in tab.items() if sum(c.values()) >= 3}
    return out, T


# ---------------------------------------------------------- the binding model
def english_names():
    src = open(os.path.join(ROOT, 'ot.html'), encoding='utf-8').read()
    return {m.group(1): m.group(2) for m in re.finditer(r"\{prefix:'([a-z0-9]+)',\s*en:'([^']+)'", src)}

BOOKS = [('gen', 'Gen'), ('exo', 'Exod'), ('lev', 'Lev'), ('num', 'Num'), ('deu', 'Deut'), ('jos', 'Josh'),
         ('jdg', 'Judg'), ('rth', 'Ruth'), ('1sa', '1Sam'), ('2sa', '2Sam'), ('1ki', '1Kgs'), ('2ki', '2Kgs'),
         ('1ch', '1Chr'), ('2ch', '2Chr'), ('ezr', 'Ezra'), ('neh', 'Neh'), ('est', 'Esth'), ('ecc', 'Eccl'),
         ('sos', 'Song'), ('isa', 'Isa'), ('jer', 'Jer'), ('lam', 'Lam'), ('eze', 'Ezek'), ('dan', 'Dan'),
         ('hos', 'Hos'), ('joe', 'Joel'), ('amo', 'Amos'), ('oba', 'Obad'), ('jon', 'Jonah'), ('mic', 'Mic'),
         ('nah', 'Nah'), ('hab', 'Hab'), ('zep', 'Zeph'), ('hag', 'Hag'), ('zec', 'Zech'), ('mal', 'Mal')]
CMP = lambda s: u''.join(c for c in N(s) if IS_CONS(c))


def corpus_verses(prefix):
    """[(ch, verse position, [(hebrew, gloss)])] from ot_verses/<prefix>.js"""
    path = os.path.join(ROOT, 'ot_verses', prefix + '.js')
    if not os.path.isfile(path): return []
    src = open(path, encoding='utf-8').read()
    out = []
    for m, body in array_bodies(src, r'var _?%s_ch(\d+)Verses\s*=\s*\[' % prefix):
        ch = int(m.group(1))
        for vi, vm in enumerate(re.finditer(r'\{\s*num:\s*"[^"]*"\s*,\s*words:\s*\[(.*?)\]\s*\}', body, re.S)):
            toks = [(N(h), g) for h, g in re.findall(r'\["([^"]*)","((?:[^"\\]|\\.)*)"\]', vm.group(1)) if CMP(h)]
            if toks: out.append((ch, vi + 1, toks))
    return out


def align(tokens, us):
    """unit index for each corpus token, walking the letters; None if they differ."""
    out, ui = [], 0
    for tok in tokens:
        want, got, last = CMP(tok), u'', None
        if not want: out.append(None); continue
        while ui < len(us) and len(got) < len(want):
            got += CMP(us[ui]['w']); last = ui; ui += 1
        if got != want: return None
        out.append(last)
    return out if ui == len(us) else None


def wlc_by_ref(book):
    out = {}
    for b, ref, us in prose_verses():
        if b != book: continue
        p = ref.split('.')
        out[(int(p[1]), int(p[2]))] = us
    return out


def train_binding():
    """log-odds that a disjunctive of any rank follows token i, by the shared features"""
    MIN = 12
    cy, cn = collections.Counter(), collections.Counter()
    n_yes = n = 0
    names = english_names()
    for prefix, wlcbook in BOOKS:
        if prefix not in names: continue
        byref = wlc_by_ref(wlcbook)
        for ch, v, toks in corpus_verses(prefix):
            us = byref.get((ch, v))
            if not us: continue
            m = align([t[0] for t in toks], us)
            if m is None: continue
            for i in range(len(toks) - 1):
                if m[i] is None or m[i + 1] is None or m[i] == m[i + 1]: continue
                y = us[m[i]]['rank'] is not None
                n += 1; n_yes += y
                (cy if y else cn).update(pair_feats(toks, i))
    prior = math.log(n_yes / float(n - n_yes))
    w = {}
    for k in set(cy) | set(cn):
        a, b = cy[k], cn[k]
        if a + b < MIN: continue
        v = math.log((a + 1.0) / (b + 1.0)) - prior
        if abs(v) > 0.12: w[k] = round(v, 3)
    return {'prior': round(prior, 4), 'pairs': n, 'w': w}


def main():
    if not os.path.isdir(WLC):
        sys.exit('WLC not found at %s' % WLC)
    tabs, raw = count_tables()
    print('tables: ' + ', '.join('%s %d keys' % (k, len(v)) for k, v in tabs.items()))
    bind = train_binding()
    print('binding model: %s pairs, %s features' % (format(bind['pairs'], ','), format(len(bind['w']), ',')))
    tabs['binding'] = bind
    with open(os.path.join(HERE, 'teamim_tables.json'), 'w', encoding='utf-8') as fh:
        json.dump(tabs, fh, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    print('written: tools/teamim_tables.json')


if __name__ == '__main__':
    main()
