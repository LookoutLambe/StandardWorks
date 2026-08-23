#!/bin/sh
# Bust the local service-worker cache mid-book WITHOUT committing.
# Same two steps the pre-commit hook does, minus the git add:
#   1) stamp version.json + service-worker.js BUILD_ID  -> new cache key
#   2) mirror the site into StandardWorks/www           -> iOS app sees it too
# Safe to run any time; the phone only re-downloads when a push changes the
# deployed site, so this costs nothing until the book is committed.
set -eu
ROOT="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%S)"
ISO="$(date -u +%Y-%m-%dT%H:%M:%S).000Z"
printf '{\n  "build": "%s",\n  "builtAt": "%s"\n}\n' "$STAMP" "$ISO" > "$ROOT/version.json"
sed -i '' "s|const BUILD_ID = '[^']*';|const BUILD_ID = '$STAMP';|" "$ROOT/service-worker.js"
"$ROOT/sync-www.sh" >/dev/null
echo "local refreshed: $STAMP  (version.json + BUILD_ID stamped, www mirrored)"
