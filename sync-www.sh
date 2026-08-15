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
  --exclude='README*' \
  --exclude='sync-www.sh' \
  --exclude='CNAME' \
  --exclude='*.docx' \
  "$ROOT/" "$DEST/"
echo "Synced repo root -> StandardWorks/www"
