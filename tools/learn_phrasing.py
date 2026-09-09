#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Learn where Hebrew phrases break — from the Masoretes — and ship the model.

    python3 tools/learn_phrasing.py

WHY LEARN IT RATHER THAN WRITE IT DOWN. read_aloud.js carries nine hand-picked
rules, measured against the te'amim one at a time. They are right as far as
they go and they cover perhaps a tenth of the decisions a reader makes. The
Tanakh contains 283,561 worked examples of the same decision, and this corpus
glosses every one of them into the SAME English glossing language the Book of
Mormon uses. So the question "does a phrase break between these two words"
can be answered from evidence for any pair of glosses, not just the nine.

    ground truth   the WLC's disjunctive accents (rank <= 2), aligned to
                   this corpus's tokens by tools/build_phrase_breaks.py
    features       the gloss line and the Hebrew, and nothing else — because
                   that is all the Book of Mormon has
    output         ot_phrasing_model.json, log-odds per feature

WHAT IT IS ALLOWED TO LOOK AT. Only what both volumes have: the pointed
Hebrew word, its English gloss, and the position in the verse. No morphology,
because the Book of Mormon has none. That constraint is the whole design —
a model that needed a treebank could not be carried across.

THE MODEL IS DELIBERATELY SMALL. Log-odds are summed over a handful of
backed-off features, the way a naive Bayes classifier does. Something heavier
would fit the Tanakh's own idiom rather than Hebrew's, and would ship a
480 KB table to a phone to save a rule that reads fine already.
"""
import json, math, os, re, sys, collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_phrase_breaks as B

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIN_COUNT = 12          # a feature needs evidence before it is allowed a vote


def training_pairs():
    """(features, broke_after) for every adjacent word pair the WLC accents."""
    names = B.english_names()
    rows = []
    for prefix, wlcbook in B.BOOKS:
        en = names.get(prefix)
        if not en:
            continue
        by_ref = {}
        for osis, marked in B.wlc_verses(wlcbook):
            p = osis.split('.')
            if len(p) == 3:
                by_ref[(int(p[1]), int(p[2]))] = marked
        for ch, v, toks in corpus_with_glosses(prefix):
            marked = by_ref.get((ch, v))
            if not marked:
                continue
            hebs = [t[0] for t in toks]
            got = B.align(hebs, marked)
            if got is None:
                continue
            brk = set(got)
            for i in range(len(toks) - 1):
                rows.append((feats(toks, i), i in brk))
    return rows


def corpus_with_glosses(prefix):
    """[(chapter, verse, [(hebrew, gloss), ...])] — the same token list
       build_phrase_breaks.py aligns, but keeping the English column."""
    path = os.path.join(ROOT, 'ot_verses', prefix + '.js')
    if not os.path.isfile(path):
        return []
    src = open(path, encoding='utf-8').read()
    out = []
    for m, body in array_bodies(src, r'var _?%s_ch(\d+)Verses\s*=\s*\[' % prefix):
        ch = int(m.group(1))
        for vi, vm in enumerate(re.finditer(
                r'\{\s*num:\s*"[^"]*"\s*,\s*words:\s*\[(.*?)\]\s*\}', body, re.S)):
            toks = [(B.N(h), g) for h, g in
                    re.findall(r'\["([^"]*)","([^"]*)"\]', vm.group(1)) if B.CMP(h)]
            if toks:
                out.append((ch, vi + 1, toks))
    return out


# ------------------------------------------------------------- features
# The feature contract lives in build_bom_breaks.py, which is the file that
# has to reproduce it exactly. Training and applying must never drift apart.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_bom_breaks import feats, array_bodies


def train(rows):
    n_yes = sum(1 for _, y in rows if y)
    n = len(rows)
    prior = math.log(n_yes / float(n - n_yes))
    cy, cn = collections.Counter(), collections.Counter()
    for f, y in rows:
        (cy if y else cn).update(f)
    w = {}
    for k in set(cy) | set(cn):
        a, b = cy[k], cn[k]
        if a + b < MIN_COUNT:
            continue
        # add-one smoothed log-odds, minus the prior so a neutral feature is 0
        v = math.log((a + 1.0) / (b + 1.0)) - prior
        if abs(v) > 0.12:
            w[k] = round(v, 3)
    return prior, w


def scoreof(prior, w, f):
    return prior + sum(w.get(k, 0.0) for k in f)


def main():
    rows = training_pairs()
    if not rows:
        sys.exit('no training rows — is the WLC at ~/Desktop/morphhb/wlc ?')
    dev = [r for i, r in enumerate(rows) if i % 10 == 0]
    tr = [r for i, r in enumerate(rows) if i % 10]
    prior, w = train(tr)

    tp = fp = fn = tn = 0
    for f, y in dev:
        p = scoreof(prior, w, f) > 0
        if p and y: tp += 1
        elif p and not y: fp += 1
        elif y: fn += 1
        else: tn += 1
    base = sum(1 for _, y in dev if y) / float(len(dev))
    print('trained on %s pairs, %s features kept' % (format(len(tr), ','), format(len(w), ',')))
    print('held out %s pairs   a break really falls here %.1f%% of the time' % (format(len(dev), ','), 100 * base))
    print('   accuracy  %.1f%%   (always-say-no would give %.1f%%)'
          % (100.0 * (tp + tn) / len(dev), 100 * (1 - base)))
    print('   precision %.1f%%   recall %.1f%%'
          % (100.0 * tp / max(tp + fp, 1), 100.0 * tp / max(tp + fn, 1)))

    path = os.path.join(ROOT, 'tools', 'ot_phrasing_model.json')
    json.dump({'prior': round(prior, 4), 'w': w}, open(path, 'w'), ensure_ascii=False)
    print('   model: %s KB' % (os.path.getsize(path) // 1024))

    def show(kind, sign):
        items = [(k, v) for k, v in w.items() if k.startswith(kind)]
        items.sort(key=lambda x: -sign * x[1])
        return '  '.join('%s %+.1f' % (k.split('=', 1)[1] or "''", v) for k, v in items[:9])
    print('\nWHAT IT LEARNED — the strongest signals, in its own words:')
    print('  break AFTER a gloss ending in :', show('tail', 1))
    print('  bind  AFTER a gloss ending in :', show('tail', -1))
    print('  break BEFORE a gloss opening  :', show('head', 1))
    print('  bind  BEFORE a gloss opening  :', show('head', -1))


if __name__ == '__main__':
    main()
