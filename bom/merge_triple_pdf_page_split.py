#!/usr/bin/env python3
"""
Merge two PDFs that are the same edition (same page count), taking an early page range from file A
and the rest from file B. Use when headers (or any per-page content) were fixed in two different files.

Example (1–259 from the copy that still has good early headers, 260–end from the copy you fixed after 260):

  python bom/merge_triple_pdf_page_split.py \\
    "C:\\path\\EARLY_GOOD.pdf" \\
    "C:\\path\\TAIL_GOOD.pdf" \\
    "C:\\path\\Triple Combination Hebrew_MERGED.pdf" \\
    --last-from-a 259 --first-from-b 260

Page numbers are 1-based, inclusive of --last-from-a and of everything from --first-from-b to EOF.
Requires last-from-a + 1 == first-from-b (no gap, no overlap).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import fitz


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Merge PDF: pages 1..N from A, pages N+1..end from B.")
    ap.add_argument("src_a", type=Path, help="PDF for early pages (e.g. good headers through 259)")
    ap.add_argument("src_b", type=Path, help="PDF for later pages (e.g. good headers from 260)")
    ap.add_argument("dst", type=Path, help="Output merged PDF")
    ap.add_argument(
        "--last-from-a",
        type=int,
        required=True,
        help="Last 1-based page number to take entirely from src_a (inclusive).",
    )
    ap.add_argument(
        "--first-from-b",
        type=int,
        required=True,
        help="First 1-based page number to take from src_b through end of document.",
    )
    args = ap.parse_args()

    if not args.src_a.is_file() or not args.src_b.is_file():
        print("Missing src_a or src_b.", file=sys.stderr)
        return 1

    la = int(args.last_from_a)
    fb = int(args.first_from_b)
    if la < 1 or fb < 1:
        print("--last-from-a and --first-from-b must be >= 1.", file=sys.stderr)
        return 1
    if fb != la + 1:
        print(f"Expected --first-from-b ({fb}) == --last-from-a ({la}) + 1; fix so ranges meet.", file=sys.stderr)
        return 1

    da = fitz.open(args.src_a)
    db = fitz.open(args.src_b)
    try:
        n_a = da.page_count
        n_b = db.page_count
        if n_a != n_b:
            print(
                f"Page count mismatch: A has {n_a}, B has {n_b} — only merge same edition.",
                file=sys.stderr,
            )
            return 1
        if la > n_a or fb > n_b:
            print("Page range exceeds document length.", file=sys.stderr)
            return 1

        out = fitz.open()
        try:
            # 1..la from A → indices 0 .. la-1
            out.insert_pdf(da, from_page=0, to_page=la - 1)
            # fb..end from B → indices fb-1 .. last
            out.insert_pdf(db, from_page=fb - 1, to_page=n_b - 1)
            if out.page_count != n_a:
                print(f"Internal error: merged {out.page_count} != {n_a}", file=sys.stderr)
                return 1
            out.save(args.dst, garbage=4, deflate=True, clean=True)
        finally:
            out.close()
    finally:
        da.close()
        db.close()

    n_from_b = n_b - fb + 1
    print(f"Wrote {args.dst} ({la} pages from A, {n_from_b} pages from B, {n_a} total).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
