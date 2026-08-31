# Hebrew morphology tooling

Built 2026-08-31 while auditing why the root scorecard shows a wrong root for
some words. **Nothing here is wired into the site.** These are offline tools:
a rule set, a measurement harness, and a review-queue generator.

## The finding that matters

**Generation beats analysis, and it is not close.**

| approach | accuracy |
|---|---|
| `strongs_lookup.js` — 83,061 pre-computed forms | **89.5%** |
| the engine's morphological analysis at runtime | 43.9% |
| the analyser in this folder, after every rule below | 75% |

Pealim (pealim.com) does not analyse at all. Its `scripts.js` contains zero
morphology; the only request is `GET /search/?q=<pointed form>` returning
server-rendered HTML. It stores one row per lexeme —

    pointed_form | r1 r2 r3 (WITH shin/sin dots) | part_of_speech | pattern|binyan | gender | meaning

— generates every inflection from it, and indexes the result. Ambiguity is then
two index hits rather than a ranking problem, and the nikkud separates them:
`וַיֵּאָנְסוּ` (tsere+qamats, Nif'al, "were compelled") vs `וַיֶּאֶנְסוּ`
(segol+segol, Pa'al, "compelled"). Strip the points and both are `ויאנסו`.

So the next step is a **generator**, not more analysis rules: enumerate
root x binyan x person/gender/number, emit the pointed form, index it, and merge
into `strongs_lookup.js` where 83,061 such entries already do the real work.
Every input exists — 3,726 roots, plus the tables below.

Pealim's dictionary itself was NOT copied. It is that site's product, and it is
Modern Hebrew besides (`שַׁמְרָן` "conservative", `שִׁימּוּר` "canned food") —
the wrong inventory for the MT and Delitzsch. Only the schema was taken.

## The rules (all supplied by the translator, then encoded)

| file | what it encodes |
|---|---|
| `radical.js` | radical identification: אית״ן preformatives, משה וכלב proclitics, binyan markers, weak-root classes, ל״י ("the yod hides the he"), feminine ה→ת, הַקְטָלָה |
| `mishkal.js` | noun patterns: kotel, katul, katil, ktila, kittul, miktal, miktelet, katlan, taktil, haktala, katla/katlat |
| `pgn.js` | person/gender/number paradigm — preformative and afformative as a PAIR (תִּ־…־ִי is 2fs, יִ־…־וּ is 3mp), not an unordered affix bag |
| `assim.js` | which letter is inside a dagesh: נ, the ל of לקח, the ת of Hitpael; and what is NOT a lost letter (the article's doubling, Piel R2, dagesh lene). Gutturals cannot double, so nothing hides in them |
| `paradigm.js` | 58 binyan x conjugation templates over the consonant skeleton |
| `split.js` | maqqef splitting, ignoring exactly five markers: `אֶת־ מִן־ לֹא־ כׇּל־ וְאֶת־` |
| `morph.js`, `morph2.js` | the earlier heuristic peel/restore analysers, kept as fallback |

**`pgn.js` is built but not integrated.** `radical.js` still uses an unordered
affix list. Wiring PGN in is the first thing to finish.

## Traps that cost real time — all the same bug, four times

`norm()`/`cons()` fold final letters (ך ם ן ף ץ). **Every affix table must be
folded through the same function.** Written with a final mem, `ים` never matched
a normalised stem; the same broke the particle list, the proper-names key, and
the possessive of `שִׂמְחָתְךָ`. If a table of Hebrew strings is compared
against normalised text, fold it first.

Two more:

- **The frequency prior is circular.** `root_concordance.js` is produced by the
  engine being fixed, so roots it handles badly have tiny families and get
  deprioritised — `כון` sits at 6 occurrences when it belongs in the hundreds.
  Use Strong's own counts instead.
- **A hand-picked test set flatters.** 83% on 30 chosen verbs was 45% on a random
  sample. `harness/fair2.js` runs the honest one.

## Harness

    node harness/truth.js truth.json          # 72,343 (form -> root) ground-truth pairs
    node harness/fair2.js truth.json          # accuracy on a hand-checked random sample
    node harness/radtest.js truth.json        # targeted verb classes
    node harness/trace2.js truth.json <word>  # every candidate a word produces, with its rule
    node harness/gaplist2.js engine_gaps.tsv  # Hebrew-only gaps (ketiv + Aramaic excluded)
    node harness/newlist.js truth.json out.tsv# review queue with proposed root + rule

`../../engine_gaps.tsv` and `engine_gaps_reviewed.tsv` are the current queue:
4,136 Hebrew-only gaps, 3,515 with a proposal. The **rule column is the
confidence signal** — a named rule is evidence-backed, `heuristic` is a guess.

## Do not ship this as an automatic fallback

At 75% roughly one card in four is wrong, and a wrong root card misleads in a way
a blank one does not. It is a review queue. The 31 pins in `strongs_lookup.js`
that fixed `שֵׁרְתוּנִי` were made this way — proposed, then checked by hand.
