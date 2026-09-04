#!/usr/bin/env python3
"""Rebuild bom/official_verses.js — the English column of the BoM Dual view.

WHY THIS EXISTS. The column was the 1920 Library of Congress scan. That scan is
public domain, and its OCR is not clean: 218 `lie` for `he`, 139 stray `i`
tokens dropped mid-sentence, 30 `he` for `be`, plus `bad`/`had`, `and`/`land`,
`dearth`/`earth`. Readers were seeing "And lie also spake concerning the
prophets" and, in the last verse of Moroni, "both Quick and i dead". An earlier
pass repaired part of it; this class survived.

The translator holds a licence for the 2013 edition on condition it is shown
side by side with the Hebrew, which is exactly what the Dual view is. So the
column is now the 2013 text, fetched from churchofjesuschrist.org.

STRUCTURE IS PRESERVED, NOT REBUILT. This reads the existing file and replaces
only the `english` field of each entry, so the 6,604 book/chapter/verse keys,
their order, and the file's exact formatting are untouched. Anything keyed to
array position -- and the reader is -- cannot shift.

    python3 tools/build_official_verses.py --from <verified.json> [--dry-run]

<verified.json> is a {"<Book>|<ch>|<v>": "english"} map. The one used here came
from the Samoan interlinear's fetch of the same source, checked book by book
against all 10,893 verses with zero differences.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "bom" / "official_verses.js"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="src", required=True)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)

    fresh = json.loads(Path(a.src).read_text(encoding="utf-8"))
    raw = TARGET.read_text(encoding="utf-8")
    prefix = raw[:raw.index("[")]
    rows = json.loads(raw[raw.index("["):].rsplit("]", 1)[0] + "]")

    changed = missing = 0
    ocr_gone = 0
    for d in rows:
        key = "%s|%d|%d" % (d["book"], d["chapter"], d["verse"])
        new = fresh.get(key)
        if new is None:
            missing += 1
            continue
        if new != d["english"]:
            changed += 1
            ocr_gone += len(re.findall(r"\blie\b", d["english"]))
            d["english"] = new

    print(f"entries {len(rows)}   replaced {changed}   not in source {missing}")
    print(f"`lie` occurrences removed from changed verses: {ocr_gone}")
    if missing:
        print("REFUSING: every entry must be present in the source")
        return 1
    if a.dry_run:
        print("(dry run, nothing written)")
        return 0

    out = [prefix + "["]
    for i, d in enumerate(rows):
        out.append(
            ' {\n  "book": %s,\n  "chapter": %d,\n  "verse": %d,\n  "english": %s\n }%s'
            % (json.dumps(d["book"], ensure_ascii=False), d["chapter"], d["verse"],
               json.dumps(d["english"], ensure_ascii=False),
               "," if i < len(rows) - 1 else ""))
    out.append("\n];\n")
    TARGET.write_text("\n".join([out[0]] + out[1:-1]) + out[-1], encoding="utf-8")
    print(f"wrote {TARGET.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
