#!/bin/zsh
# One phrase per line on stdin: "key<TAB>text". Prints the ones Carmit
# renders as a header-only AIFF — i.e. no audio at all.
tmp="$(mktemp -t sil).aiff"
while IFS=$'\t' read -r key text; do
  [ -z "$text" ] && continue
  say -v Carmit -o "$tmp" "$text" 2>/dev/null
  sz=$(stat -f%z "$tmp" 2>/dev/null || echo 0)
  if [ "$sz" -le 5000 ]; then printf '%s\t%s\t%s\n' "$sz" "$key" "$text"; fi
done
rm -f "$tmp"
