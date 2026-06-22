# Principled register exceptions (BOM verse text)

This project targets **disciplined pre-exilic Biblical Hebrew** in verse tokens. Chapter headings and front-matter apparatus may use modern editorial Hebrew by design.

Repeatable leak detection: `node scripts/audit_bom_register_leaks.js --save` (see `bom/register_audit/`).

Snapshots report **`totals.leakHits`** (actionable only). Pattern matches tagged `keep` or `exception` (e.g. מְזִמָּה scheme contexts, תְּחִיָּה, biblical עֶצֶם bone/selfsame) stay in the file for transparency but do not inflate the leak count.

## Controlled coinages (theological; flagged for reviewers)

| Term | Role | Note |
|------|------|------|
| **תְּחִיָּה** / **הַתְּחִיָּה** | Resurrection as noun | Policy choice: keep coinage from biblical roots, or move toward verbal resurrection (cf. Isa 26:19) where doctrine requires it. |
| **כַּפָּרָה** / **הַכַּפָּרָה** | Atonement as noun | Same class: root is biblical; abstract noun is late. Held for readability and doctrinal clarity. |

## Concept gaps (English requires a footnote, not a coined -ut noun)

| Concept | Typical English | Approach |
|---------|-----------------|----------|
| Sense and insensibility (2 Nephi 2) | Abstract psychological pair | Footnote or periphrasis; do not invent a Mishnaic abstract. |
| Steel vs copper/brass (2 Nephi 5) | Modern metallurgy | Footnote on anachronism or use period-appropriate metals with note. |
| Generic metal/ore | Broad material class | Same: note or circumlocution, not **מַתֶּכֶת**-style coinages in verse body. |

## Not exceptions (do not list here)

- Chapter headings (`שֵׁרוּת`, `צְלִיבָה`, `הַבְטָחָה`, date ranges): modern apparatus.
- **מְזִמָּה** in evil-scheme contexts (Gadianton, secret combinations): biblical when glossed as scheme, not “purpose.”
- **מְזִמָּה** in Proverbs-register prudence/discretion (positive): keep as `keep_prudence` in audit; defensible pre-exilic usage (cf. Prov 1:4, 8:12). Rare in BOM; if gloss is “prudence” or “discretion,” prefer keep over `leak_purpose`.
- **עֶצֶם** as bone or **בְּעֶצֶם** “the selfsame”: biblical; distinct from reflexive **עַצְמָם** (leak pile in audit).
