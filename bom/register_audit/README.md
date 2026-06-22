# Register audit snapshots

Run: `node scripts/audit_bom_register_leaks.js --save`

Compare runs using **`totals.leakHits`** (actionable leaks only). Total `hits` includes policy-keeps (מְזִמָּה scheme, biblical עֶצֶם) and documented exceptions (תְּחִיָּה) so the headline count does not drop when you correctly leave forms in place.

| Date | leakHits | notes |
|------|----------|-------|
| 2026-05-30 | 241 | Baseline after זולתי sweep; pile tagging enabled (see git `96a686e` for snapshot) |
| 2026-05-30 | 219 | After אֶלָּא tier cleared (−22); `fix_bom_ella.js` |
