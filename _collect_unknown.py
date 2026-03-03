#!/usr/bin/env python3
"""
_collect_unknown.py
Scans all .js verse files across ot_verses/, nt_verses/, bom/verses/,
dc_verses/, pgp_verses/, jst_verses/ and collects every Hebrew word
whose gloss contains "???".

Output:  _unknown_hebrew_words.json  (sorted by frequency descending)
"""

import sys, os, re, json, glob
from collections import Counter

# Force UTF-8 on Windows console
sys.stdout.reconfigure(encoding="utf-8")

BASE = os.path.dirname(os.path.abspath(__file__))

# Directories to scan (relative to BASE)
VERSE_DIRS = [
    os.path.join(BASE, "ot_verses"),
    os.path.join(BASE, "nt_verses"),
    os.path.join(BASE, "bom", "verses"),
    os.path.join(BASE, "dc_verses"),
    os.path.join(BASE, "pgp_verses"),
    os.path.join(BASE, "jst_verses"),
]

# Regex: matches ["HebrewWord","<anything containing ???>"]
PATTERN = re.compile(r'\["([^"]+)","[^"]*\?\?\?[^"]*"\]')

# Common Hebrew prefixes to strip when looking for root forms
PREFIXES = [
    "\u05D1\u05BC\u05B0",  # בְּ
    "\u05D4\u05B7",        # הַ
    "\u05DC\u05B0",        # לְ
    "\u05DE\u05B4",        # מִ
    "\u05D5\u05B0",        # וְ
    "\u05DB\u05BC\u05B0",  # כְּ
    "\u05E9\u05C1\u05B6",  # שֶׁ
]


def strip_prefix(word):
    """Strip one common Hebrew prefix, return root form."""
    for pfx in PREFIXES:
        if word.startswith(pfx) and len(word) > len(pfx):
            return word[len(pfx):]
    return word


def scan_files():
    """Walk all verse dirs, return Counter of hebrew words -> count."""
    counter = Counter()
    total_files = 0
    total_instances = 0

    for vdir in VERSE_DIRS:
        if not os.path.isdir(vdir):
            print(f"  [skip] directory not found: {vdir}")
            continue
        js_files = glob.glob(os.path.join(vdir, "*.js"))
        for fpath in js_files:
            with open(fpath, encoding="utf-8") as f:
                content = f.read()
            matches = PATTERN.findall(content)
            if matches:
                total_files += 1
                for hebrew_word in matches:
                    total_instances += 1
                    counter[hebrew_word] += 1

    return counter, total_files, total_instances


def main():
    print("=" * 65)
    print("  Collecting unknown (???) Hebrew words from all verse files")
    print("=" * 65)
    print()

    print("Scanning directories:")
    for d in VERSE_DIRS:
        exists = os.path.isdir(d)
        tag = "OK" if exists else "MISSING"
        print(f"  [{tag}] {d}")
    print()

    counter, total_files, total_instances = scan_files()

    if not counter:
        print("No unknown words found.")
        return

    # Build root-form mapping
    root_counter = Counter()
    word_to_root = {}
    for word, count in counter.items():
        root = strip_prefix(word)
        word_to_root[word] = root
        root_counter[root] += count

    # Sort by frequency descending
    sorted_words = counter.most_common()
    sorted_roots = root_counter.most_common()

    # Save full surface-form results
    output = {word: count for word, count in sorted_words}
    out_path = os.path.join(BASE, "_unknown_hebrew_words.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # ---- Summary ----
    print(f"Total unique surface forms:   {len(counter)}")
    print(f"Total unique root forms:      {len(root_counter)}")
    print(f"Total ??? instances:          {total_instances}")
    print(f"Files containing ???:         {total_files}")
    print()

    print("-" * 65)
    print(f"  Top 50 unknown Hebrew words  (by frequency)")
    print("-" * 65)
    print(f"  {'#':<5} {'Count':<8} {'Hebrew':<22} {'Root form'}")
    print(f"  {'---':<5} {'------':<8} {'--------------------':<22} {'--------------------'}")

    for i, (word, count) in enumerate(sorted_words[:50], 1):
        root = word_to_root[word]
        root_display = root if root != word else "(same)"
        print(f"  {i:<5} {count:<8} {word:<22} {root_display}")

    print()
    print(f"Results saved to: {out_path}")
    print()

    # Also show top 30 root forms
    print("-" * 65)
    print(f"  Top 30 root forms  (prefixes stripped, merged counts)")
    print("-" * 65)
    print(f"  {'#':<5} {'Count':<8} {'Root form'}")
    print(f"  {'---':<5} {'------':<8} {'--------------------'}")
    for i, (root, count) in enumerate(sorted_roots[:30], 1):
        print(f"  {i:<5} {count:<8} {root}")

    print()
    print("Done.")


if __name__ == "__main__":
    main()
