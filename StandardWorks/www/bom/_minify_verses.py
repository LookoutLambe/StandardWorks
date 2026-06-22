"""Produce minified copies of verse files for App Store upload.

Reads StandardWorks/www/bom/verses/*.js and writes minified copies to
StandardWorks/www/bom/verses_min/*.js. Source files are not modified.

Minification = strip indentation + newlines outside string literals. The
actual token data (Hebrew, English glosses, num labels) is preserved
byte-for-byte. To use in the app, swap the loader paths to point at
verses_min/ before building for the App Store.

Usage:
    python3 _minify_verses.py
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(HERE, "verses")
OUT_DIR = os.path.join(HERE, "verses_min")


def minify(text: str) -> str:
    """Strip whitespace outside string literals.

    JavaScript single/double-quoted strings are preserved exactly. Newlines
    and runs of horizontal whitespace outside strings collapse to nothing
    (or to a single space where required to keep tokens separate).
    """
    out = []
    i = 0
    n = len(text)
    in_string = False
    quote = ""
    while i < n:
        c = text[i]
        if in_string:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(text[i + 1])
                i += 2
                continue
            if c == quote:
                in_string = False
            i += 1
            continue
        if c in ('"', "'"):
            in_string = True
            quote = c
            out.append(c)
            i += 1
            continue
        if c in (" ", "\t", "\n", "\r"):
            # Collapse whitespace runs. Keep one space when both neighbours
            # are word-like characters (identifier/keyword); otherwise drop.
            j = i
            while j < n and text[j] in (" ", "\t", "\n", "\r"):
                j += 1
            prev_c = out[-1] if out else ""
            next_c = text[j] if j < n else ""
            if (prev_c and re.match(r"[A-Za-z0-9_$]", prev_c)) and (
                next_c and re.match(r"[A-Za-z0-9_$]", next_c)
            ):
                out.append(" ")
            i = j
            continue
        out.append(c)
        i += 1
    return "".join(out)


def main() -> int:
    if not os.path.isdir(SRC_DIR):
        print(f"Source directory not found: {SRC_DIR}", file=sys.stderr)
        return 1
    os.makedirs(OUT_DIR, exist_ok=True)
    total_in = 0
    total_out = 0
    rows = []
    for name in sorted(os.listdir(SRC_DIR)):
        if not name.endswith(".js"):
            continue
        src_path = os.path.join(SRC_DIR, name)
        out_path = os.path.join(OUT_DIR, name)
        with open(src_path, "r", encoding="utf-8") as f:
            src = f.read()
        minified = minify(src)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(minified)
        in_size = len(src.encode("utf-8"))
        out_size = len(minified.encode("utf-8"))
        total_in += in_size
        total_out += out_size
        saved = 100 * (1 - out_size / in_size) if in_size else 0
        rows.append((name, in_size, out_size, saved))

    name_w = max(len(r[0]) for r in rows) if rows else 4
    print(f"{'file'.ljust(name_w)}  {'src KB':>8}  {'min KB':>8}  {'saved':>7}")
    print(f"{'-' * name_w}  {'-' * 8}  {'-' * 8}  {'-' * 7}")
    for name, in_size, out_size, saved in rows:
        print(
            f"{name.ljust(name_w)}  {in_size / 1024:>8.1f}  "
            f"{out_size / 1024:>8.1f}  {saved:>6.1f}%"
        )
    if total_in:
        total_saved = 100 * (1 - total_out / total_in)
        print(f"{'-' * name_w}  {'-' * 8}  {'-' * 8}  {'-' * 7}")
        print(
            f"{'TOTAL'.ljust(name_w)}  {total_in / 1024:>8.1f}  "
            f"{total_out / 1024:>8.1f}  {total_saved:>6.1f}%"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
