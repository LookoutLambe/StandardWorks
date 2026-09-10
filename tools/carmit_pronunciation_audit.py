#!/usr/bin/env python3
"""Read the Pearl of Great Price aloud and check what came back.

WHAT THIS CAN AND CANNOT SEE. Hebrew ASR returns UNPOINTED text, so a wrong
VOWEL is invisible unless it changes the spelling. This finds consonant and
syllable errors — a dropped letter, a word split in two, the wrong binyan —
which is the class that produced "vehi" for וַיְהִי.

WHISPER HAS ITS OWN ERROR RATE, so a single miss means nothing. The signal is
a FORM THAT COMES BACK WRONG EVERY TIME IT OCCURS. Everything is aggregated
per source form and single occurrences are reported separately, quietly.
"""
import sys, os, re, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from faster_whisper import WhisperModel

HERE = os.path.dirname(os.path.abspath(__file__))
POINTS = re.compile('[֑-ֽֿ-ׇ]')
MATRES = re.compile('[וי]')
FINALS = str.maketrans('ךםןףץ', 'כמנפצ')

def bare(w):
    return POINTS.sub('', w).replace('־', ' ').strip()
def skel(w):
    return bare(w).translate(FINALS)
def loose(w):
    """same word allowing ktiv male — whisper writes אלוהים for אלהים"""
    return MATRES.sub('', skel(w))

rows = [l.rstrip('\n').split('\t', 1) for l in open(os.path.join(HERE, 'verses.tsv'), encoding='utf-8') if l.strip()]
model = WhisperModel('medium', device='cpu', compute_type='int8')

occ  = collections.Counter()      # how often each source form appears
miss = collections.Counter()      # ... and how often it did not come back
where = collections.defaultdict(list)
done = 0
out = open(os.path.join(HERE, 'transcripts.tsv'), 'w', encoding='utf-8')

for key, text in rows:
    wav = os.path.join(HERE, 'wav', key.replace('|', '_') + '.wav')
    if not os.path.exists(wav):
        continue
    segs, _ = model.transcribe(wav, language='he', beam_size=5)
    heard = ' '.join(s.text for s in segs)
    out.write(key + '\t' + heard.strip() + '\n')
    htok = set()
    for w in re.split(r'[\s,.:;!?"\'()\[\]־-]+', heard):
        if not w: continue
        htok.add(skel(w)); htok.add(loose(w))
    for w in text.split():
        s = skel(w)
        if not s or not re.search('[א-ת]', s):
            continue
        occ[w] += 1
        if s not in htok and loose(w) not in htok:
            miss[w] += 1
            where[w].append(key)
    done += 1
    if done % 50 == 0:
        print('  %d/%d verses' % (done, len(rows)), flush=True)
out.close()

repeat = [(w, occ[w], miss[w]) for w in occ if occ[w] >= 2 and miss[w] == occ[w]]
repeat.sort(key=lambda r: -r[1])
print('\nverses transcribed: %d' % done)
print('distinct source forms heard: %s' % format(len(occ), ','))
print('\nFORMS THAT NEVER CAME BACK, in every occurrence (%d):' % len(repeat))
for w, n, m in repeat[:60]:
    print('  %2dx  %-22s  %s' % (n, w, ', '.join(where[w][:3])))
once = [w for w in occ if occ[w] == 1 and miss[w] == 1]
print('\nsingle-occurrence misses (mostly whisper noise, not reported): %d' % len(once))
json.dump({'occ': occ, 'miss': miss, 'where': {k: v for k, v in where.items()}},
          open(os.path.join(HERE, 'audit.json'), 'w', encoding='utf-8'), ensure_ascii=False)
