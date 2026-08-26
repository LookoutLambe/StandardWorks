#!/bin/sh
# Guard for the site-file fixes that a "pull git" (reset to origin) can silently
# drop, since bom.html / ot.html are regenerated upstream. Run this AFTER every
# pull. Non-zero exit = a fix is missing and must be re-applied before shipping.
#
# NOTE: corpus/MT counts are now owned by root_scorecard.js (RootScorecard) from
# upstream — do NOT re-add the old buildBomWordFreq/ensureFullBomFreq code.
set -eu
ROOT="$(cd "$(dirname "$0")" && pwd)"
fail=0

check() { # file  marker  description
  if grep -qF -- "$2" "$ROOT/$1"; then
    printf '  ok   %s — %s\n' "$1" "$3"
  else
    printf '  MISS %s — %s\n' "$1" "$3"
    fail=1
  fi
}

echo "Verifying site-file fixes..."
# Final-letter normalization on BOTH sides of the glossary filter (e.g. תהום must
# match, not fail on final mem). Applies to BOM and OT readers.
check "bom/bom.html" "rootNorm = normFinals(" "BOM glossary final-letter match"
check "bom/bom.html" "dispNorm = normFinals(" "BOM glossary final-letter match"
check "ot.html"      "rootNorm = normFinals(" "OT glossary final-letter match"
check "ot.html"      "dispNorm = normFinals(" "OT glossary final-letter match"
# Full-screen glossary panel on phones (BOM), matching OT.
check "bom/bom.html" "width: 100vw; max-width: 100vw; left: -100vw;" "BOM full-screen glossary"
# Bundle hygiene: sync excludes build artifacts (leaked .o files break codesign).
check "sync-www.sh"  "--exclude='build/'" "sync excludes build artifacts"
# Cross-volume scorecard present (upstream). If this goes missing, counts regress.
check "bom/bom.html" "RootScorecard" "cross-volume scorecard wired"
# Cross-ref engine loads verse files via <script> injection, not fetch() — fetch()
# is blocked under file:// in the app, which made OT/NT/PGP xrefs show a bare list.
check "crossrefs_engine.js" "WKWebView blocks fetch()" "xref interlinear works in-app (no fetch)"

# Root-aggregated cross-references must show ALONGSIDE the verse footnote, not be
# hidden behind an `else` (that made Matt 1:2 show only the single Gen 25:19).
checkxref() { # file
  if grep -A2 "View Cross-References (' + refCount" "$ROOT/$1" | grep -q "} else {"; then
    printf '  MISS %s — root cross-refs hidden behind else\n' "$1"; fail=1
  else
    printf '  ok   %s — root cross-refs show with footnote\n' "$1"
  fi
}
checkxref nt.html
checkxref ot.html
checkxref pgp.html

if [ "$fail" -ne 0 ]; then
  echo "FAIL: one or more fixes are missing — re-apply before building." >&2
  exit 1
fi
echo "All fixes present."
