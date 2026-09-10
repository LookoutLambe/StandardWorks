# Finding the phrases Carmit will not say

Carmit renders SILENCE for certain word PAIRS and reports nothing — onend
fires, no error, no audio, and the reading walks straight past the phrase.
A full stop between the two words brings the whole utterance back, so the
cure is `SAY_STOP` in `read_aloud.js`; the job of these tools is to FIND the
pairs.

    python3 tools/dump_read_aloud_verses.py      /tmp/verses.json
    node    tools/dump_read_aloud_utterances.js  /tmp/verses.json /tmp/phrases.tsv
    cut -f2 /tmp/phrases.tsv | sort -u | awk 'NF>1' > /tmp/in.txt
    split -l 240 /tmp/in.txt /tmp/sh_
    for f in /tmp/sh_*; do tools/carmit_silence_worker.sh < "$f" > "$f.out" & done; wait

`say -v Carmit -o f.aiff` IS the detector: a swallowed phrase writes a
header-only 4096-byte AIFF, so no ear and no transcription are needed.

## What the numbers were on 2026-09-10

    42,500 verses -> 163,715 phrases -> 137,236 distinct multi-word phrases
    Book of Mormon swept in full: 9 silent, reducing to 6 pairs (all shipped)
    1 Nephi re-swept after the vav change: 2,855 phrases, 0 silent
    Tanakh, NT, D&C, PGP and JST: NEVER SWEPT

## The two things that decide how you run it

**Throughput is ~5 phrases/sec and MORE WORKERS DO NOT HELP** — the speech
daemon serialises. Measured on 14 cores: 12 workers 4.9/sec, 24 workers
5.2/sec, 40 workers 4.8/sec. So the remaining five volumes are ~7.6 hours
of brute force.

**Group testing is the way to cut that, and the noise is the catch.** Join
K phrases into one utterance with ". " between them — the period isolates
each, so a silent one only removes its own audio — then flag any batch
whose size falls short and bisect it. But audio size per Hebrew letter has
a standard deviation of 14% (mean 5,004 bytes/letter, n=160), so one
missing phrase in a large batch is inside the noise. K must stay small
enough that a missing phrase moves the total well past 14%: K=5 removes
~20%, K=8 removes ~12% and is already marginal. Expect ~5x, not 50x.
