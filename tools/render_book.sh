#!/bin/sh
# Render every chapter of a book to .voice/ for a listening pass.
#   sh tools/render_book.sh pgp moses [wpm]
# Rendering runs far faster than real time; the audio is what the reader
# speaks, not an approximation — same spoken(), same phrases(), same breaks.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VOL="$1"; BOOK="$2"; WPM="${3:-110}"
[ -z "$BOOK" ] && { echo "usage: sh tools/render_book.sh <vol> <book> [wpm]"; exit 1; }
DIR="$ROOT/${VOL}_verses"; [ "$VOL" = bom ] && DIR="$ROOT/bom/verses"
CHS=$(grep -oE "_ch[0-9]+Verses" "$DIR/$BOOK.js" | grep -oE "[0-9]+" | sort -n -u)
for c in $CHS; do
  node "$ROOT/tools/render_chapter.js" "$VOL" "$BOOK" "$c" "$ROOT/.voice" "$WPM" \
    | sed "s|^|  ch$c  |"
done
