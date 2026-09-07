#!/bin/sh
# Single source of truth: the website lives at the repo root (served by GitHub Pages).
# This mirrors it into StandardWorks/www so the iOS app bundles the same content.
# Run this before building/committing the app after editing site files at the root.
set -eu
ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="$ROOT/StandardWorks/www"
mkdir -p "$DEST"
# --delete-excluded so newly-excluded files are also purged from the mirror.
rsync -a --delete --delete-excluded \
  --exclude='.git/' \
  --exclude='.gitignore' \
  --exclude='.claude/' \
  --exclude='.DS_Store' \
  --exclude='StandardWorks/' \
  --exclude='StandardWorks.xcodeproj/' \
  --exclude='build/' \
  --exclude='DerivedData/' \
  --exclude='README*' \
  --exclude='*.sh' \
  --exclude='*.py' \
  --exclude='CNAME' \
  --exclude='*.docx' \
  `# ── BUILD SOURCES — regenerated into chunks, never fetched at runtime ──
   # <vol>_english.js became <vol>_english/<book>.js, and the three heading
   # files became <vol>_headings/<book>.js, when the readers went lazy. The
   # monoliths stay in the repo because tools/build_verse_manifests.js and
   # tools/build_heading_manifests.js read them to make the chunks — but the
   # app was carrying 7.9 MB of them into the bundle and never opening one.
   # Verified: no runtime file fetches any of these by name, and the loader
   # in reader_core.js has no fallback to a monolith.
   # ANCHORED with a leading slash: bom/chapter_headings.js is a DIFFERENT
   # file and IS loaded by bom.html. It must keep shipping. ` \
  --exclude='/ot_english.js'   --exclude='/nt_english.js' \
  --exclude='/dc_english.js'   --exclude='/pgp_english.js' \
  --exclude='/jst_english.js' \
  --exclude='/ot_chapter_headings.js'     --exclude='/ot_chapter_headings_heb.js' \
  --exclude='/nt_chapter_headings.js'     --exclude='/nt_chapter_headings_heb.js' \
  --exclude='/dc_chapter_headings.js'     --exclude='/dc_chapter_headings_heb.js' \
  --exclude='/pgp_chapter_headings.js'    --exclude='/pgp_chapter_headings_heb.js' \
  --exclude='/ot_heading_words.js'  --exclude='/nt_heading_words.js' \
  --exclude='/dc_heading_words.js'  --exclude='/pgp_heading_words.js' \
  `# build-time only: nothing on a page or in a service worker asks for these ` \
  --exclude='/tools/' \
  --exclude='/scripts/' \
  "$ROOT/" "$DEST/"
echo "Synced repo root -> StandardWorks/www"
