#!/bin/sh
# Point git at the hooks that live IN the repo.
#
# WHY THIS EXISTS. The pre-commit hook is not a convenience — it runs the
# shared-code drift guard, the Book of Mormon Hebrew lock, the version stamp
# for both service workers, and the sync into the iOS app bundle. All four are
# load-bearing, and until 2026-09-09 the only copy lived in .git/hooks, which
# git does not track. A fresh clone silently had none of them: no drift guard,
# no Hebrew lock, and a service worker whose cache never rotated.
#
# core.hooksPath points at the tracked directory rather than copying, so the
# hook cannot drift from the one in the repo. It is per-clone local config,
# which is why this script has to be run once after cloning.
set -e
ROOT="$(git rev-parse --show-toplevel)"
git -C "$ROOT" config core.hooksPath tools/hooks
chmod +x "$ROOT"/tools/hooks/*
echo "hooks installed: $(git -C "$ROOT" config --get core.hooksPath)"
echo "  $(ls "$ROOT/tools/hooks" | tr '\n' ' ')"
