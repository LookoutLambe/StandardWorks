#!/usr/bin/env python3
"""
Patch Schottenstein-style running headers on the *triple combination* Hebrew PDF.

Goal (per user):
- Replace incorrect running headers with correct, readable RTL headers for the MAIN BODIES only:
  - Book of Mormon body: chapter/verse ranges per page (some pages span multiple chapters)
  - Doctrine & Covenants body
  - Pearl of Great Price body
- Front matter sections should be left as-is.
- **BoM:** By default, PDF pages **before page 260** are not redacted or redrawn (locked headers through
  page 259). Use ``--bom-from-page 0`` to patch the entire BoM body.
- **BoM verse span:** Default ``outer-inner``: first counted verse in the **outer (right) column** through
  last counted verse in the **inner (left) column**, even when several chapters appear in one column.
  Use ``--bom-reading-order row-rtl`` for row-band RTL ordering. ``--header-mutate title-only`` redraws only
  the book/page line (keeps existing verse text). Optional ``--header-split-x`` tunes partial redaction.
- Gutters/inside margins: provide a switch to flip odd/even spine parity for KDP if needed.

This script is intentionally conservative: it only redacts a thin top band and redraws:
- one header rule
- a short left header (range)
- a short right header (book title + page count marker)

It does not reflow body text or columns.

Usage:
  python bom/patch_triple_pdf_running_headers.py "c:\\Users\\chris\\Desktop\\Tripple Combination Hebrew.pdf" "c:\\Users\\chris\\Desktop\\Tripple Combination Hebrew_HEADERS.pdf"
"""

from __future__ import annotations

import argparse
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import fitz  # PyMuPDF
from bidi.algorithm import get_display

# --- Hebrew numeral helpers (plain, no geresh/gershayim) ---
H1 = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"]
H10 = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"]
H100 = ["", "ק", "ר", "ש", "ת"]


def heb(n: int) -> str:
    if n <= 0:
        return str(n)
    if n >= 1000:
        return H1[n // 1000] + "׳" + (heb(n % 1000) if n % 1000 else "")
    r = ""
    h = n // 100
    if h > 0:
        r += H100[h] if h <= 4 else ("ת" + H100[h - 4])
        n %= 100
    if n == 15:
        return r + "טו"
    if n == 16:
        return r + "טז"
    if n >= 10:
        r += H10[n // 10]
        n %= 10
    if n > 0:
        r += H1[n]
    return r


def strip_nikkud(t: str) -> str:
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def norm_compact(t: str) -> str:
    return re.sub(r"\s+", "", strip_nikkud(t or ""))


# --- Header geometry (6x9 = 432x648 pt) ---
HEADER_REDACT_Y0 = 7.0
HEADER_RULE_Y = 36.82
HEADER_REDACT_Y1 = HEADER_RULE_Y + 1.8
HEADER_TEXT_BASELINE_Y = HEADER_RULE_Y - 4.35
HEADER_FONT_SIZE = 9.0
RULE_STROKE = 0.35
BODY_MIN_Y = HEADER_RULE_Y + 2.5  # include first verse line (often ~45pt), exclude header band

# --- RTL fonts (Windows) ---
DAVID = str(Path("C:/Windows/Fonts/david.ttf"))
DAVID_BD = str(Path("C:/Windows/Fonts/davidbd.ttf"))

# --- Markers ---
_CHAPTER_HEADING = re.compile(r"^\s*פרק\s*([\u05d0-\u05ea׳']{1,6})\s*$")
_SECTION_HEADING = re.compile(r"^\s*סימן\s*([\u05d0-\u05ea׳']{1,6})\s*$")
# Verse markers at line start (Hebrew editions vary by export):
# - ``ג.`` then body (numeral + sof pasuq)
# - ``.ג`` then body (period + numeral, RTL “dot at end of number” in display)
# - ``. ג`` / ``ג .`` extraction junk
_VERSE_AFTER_DOT = re.compile(r"^\s*([\u05d0-\u05ea׳']{1,6})\s*\.")
_VERSE_BEFORE_DOT = re.compile(r"^\s*\.\s*([\u05d0-\u05ea׳']{1,6})")

# If KDP insists on English odd/even spine mapping, flip this.
# Hebrew RTL paperback typically has spine on the RIGHT for odd pages.


def page_side_margins_pt(doc_page_1based: int, *, inside_pt: float, outside_pt: float, western_parity: bool) -> tuple[float, float]:
    odd = doc_page_1based % 2 == 1
    if odd:
        return (inside_pt, outside_pt) if western_parity else (outside_pt, inside_pt)
    return (outside_pt, inside_pt) if western_parity else (inside_pt, outside_pt)


@dataclass(frozen=True)
class PageRange:
    book: str
    start_1based: int
    end_1based: int


def find_page_containing(doc: fitz.Document, needle: str, *, start: int = 0) -> int | None:
    for i in range(start, doc.page_count):
        if needle in (doc[i].get_text("text") or ""):
            return i
    return None


def normalize_hebrew_pdf_text(s: str) -> str:
    # Fold presentation forms (e.g. ﬋) so spelled-out names match reliably (מרוני vs מורוני glyphs).
    s = unicodedata.normalize("NFKC", (s or ""))
    s = s.replace("\u200f", " ").replace("\u200e", " ")
    # strip common niqqud / cantillation
    s = re.sub(r"[\u0591-\u05AF\u05B0-\u05BD\u05BF\u05C3-\u05C7\uFB1E]+", "", s)
    s = re.sub(r"\s+", " ", s)
    # collapse single spaces between Hebrew letters (PDF often inserts them)
    s = re.sub(r" {2,}", "¶", s)
    s = re.sub(r"(?<=[\u0590-\u05FF]) (?=[\u0590-\u05FF])", "", s)
    s = s.replace("¶", " ")
    return s


def find_page_containing_norm(doc: fitz.Document, needle: str, *, start: int = 0) -> int | None:
    n0 = needle.replace(" ", "")
    for i in range(start, doc.page_count):
        t = normalize_hebrew_pdf_text(doc[i].get_text("text") or "").replace(" ", "")
        if n0 and n0 in t:
            return i
    return None


def guess_main_body_ranges(doc: fitz.Document) -> list[PageRange]:
    """
    Heuristic page ranges:
    - BoM body starts at the first page containing 'פרק א' after first 'נפי א'
    - D&C body starts at first page containing 'סימן א' (or 'סימן א.' variations) after BoM
    - PGP body starts at first page containing 'ספר משה' then first 'פרק א' after it
    Each ends at next body's start-1 or end of document.
    """
    # BoM
    bom_title = find_page_containing(doc, "נפי א", start=0)
    bom_body = None
    if bom_title is not None:
        bom_body = find_page_containing(doc, "פרק א", start=bom_title)

    # D&C body: first occurrence of "סימן א" (normalized, PDF letter-spacing safe)
    dc_body = find_page_containing_norm(doc, "סימן א", start=(bom_body or 0))

    # PGP: go straight to "ספר משה" (title pages may appear earlier in the PDF).
    pgp_body = find_page_containing_norm(doc, "ספר משה", start=(dc_body or 0))
    if pgp_body is not None:
        # body start is usually where chapters begin; keep at Moses if we can't find 'פרק א'
        pgp_ch = find_page_containing_norm(doc, "פרק א", start=pgp_body)
        pgp_body = pgp_ch or pgp_body

    ranges: list[PageRange] = []

    # Optional: locate last PRE-D&C mention of "מורוני" after NFKC (diagnostics only; many PDFs omit it).
    _bom_last_moroni_1based: int | None = None
    scan_hi = dc_body if dc_body is not None else doc.page_count
    scan_hi = min(scan_hi, doc.page_count)
    for i in range(scan_hi):
        tcompact = normalize_hebrew_pdf_text(doc[i].get_text("text") or "").replace(" ", "")
        if "מורוני" in tcompact:
            _bom_last_moroni_1based = i + 1

    if bom_body is not None:
        # BoM always runs through the page before סימן א (last BoM plate page is dc_body / 1-based).
        end = dc_body if dc_body is not None else (_bom_last_moroni_1based or doc.page_count)
        ranges.append(PageRange(book="ספר מורמון", start_1based=bom_body + 1, end_1based=end))

    if dc_body is not None:
        end = (pgp_body + 1) - 1 if pgp_body is not None else doc.page_count
        ranges.append(PageRange(book="הלקח והבריתות", start_1based=dc_body + 1, end_1based=end))

    if pgp_body is not None:
        ranges.append(PageRange(book="פנינת המחיר הגדול", start_1based=pgp_body + 1, end_1based=doc.page_count))
    return ranges


def page_sorted_spans(page: fitz.Page) -> list[tuple[fitz.Rect, str]]:
    d = page.get_text("dict")
    spans: list[tuple[fitz.Rect, str]] = []
    for b in d.get("blocks", []):
        if b.get("type") != 0:
            continue
        for ln in b.get("lines", []):
            for sp in ln.get("spans", []):
                t = (sp.get("text") or "").strip()
                if not t:
                    continue
                spans.append((fitz.Rect(sp["bbox"]), t))
    # sort by y, then right-to-left within same y band
    spans.sort(key=lambda s: (round(s[0].y0, 1), -s[0].x0))
    return spans


def page_lines(page: fitz.Page) -> list[tuple[fitz.Rect, str]]:
    d = page.get_text("dict")
    out: list[tuple[fitz.Rect, str]] = []
    for b in d.get("blocks", []):
        if b.get("type") != 0:
            continue
        for ln in b.get("lines", []):
            txt = "".join(sp.get("text", "") for sp in ln.get("spans", []))
            t = (txt or "").strip()
            if not t:
                continue
            out.append((fitz.Rect(ln["bbox"]), t))
    # sort by y then RTL within a band
    out.sort(key=lambda s: (round(s[0].y0, 1), -s[0].x0))
    return out


def build_heb_map(limit: int = 520) -> dict[str, int]:
    return {heb(n): n for n in range(1, limit + 1)}


HEB2INT = build_heb_map()


def _heb_to_int(token: str) -> int | None:
    t = (token or "").strip().replace("'", "׳")
    t = t.replace("״", "").replace("׳", "׳")
    return HEB2INT.get(t)


def _verse_num_from_leading_dot_line(tc: str) -> int | None:
    """
    Line begins with ASCII period + Hebrew numeral (``.ג``), no space — RTL marker style where the
    sof pasuq sits at the *end* of the numeral in display order (logical storage ``.`` then letters).
    """
    t = (tc or "").lstrip()
    if not t.startswith("."):
        return None
    rest = t[1:]
    if not rest:
        return None
    for n in range(min(6, len(rest)), 0, -1):
        vi = _heb_to_int(rest[:n])
        if vi is not None:
            return int(vi)
    return None


def _reading_key(bb: fitz.Rect, band: float = 10.0) -> tuple[float, float, float]:
    # balanced-column RTL like patch_hebrew_dc_pdf_headers.py: within each row band, read right then left.
    row = round(bb.y0 / band) * band
    xc = (bb.x0 + bb.x1) / 2.0
    return (row, -xc, bb.y0)


# BoM-only: Hebrew restarts numbering at each book, so consecutive books can both show
# "פרק א" while still on the same page (e.g. Moroni chapter א tail → title "מורמון" → Mormon
# "פרק א"). We assign a monotonically increasing verse_stream so ranges can exclude the prior
# book's tail when the duplicate perek heading appears after high verse numbers.
_DUP_PEREK_VERSE_THRESHOLD = 20


def extract_unit_range_on_page(
    page: fitz.Page,
    *,
    unit: str,
    initial_unit: int | None,
    use_bom_verse_stream: bool = False,
    reading_order: str = "outer-inner",
) -> tuple[tuple[int, int] | None, tuple[int, int] | None, int | None]:
    """
    unit='chapter' → returns ((chap_start, verse_start), (chap_end, verse_end))
    unit='section' → returns ((sec_start, verse_start), (sec_end, verse_end))
    Uses in-page reading order with carry-forward current chapter/section.

    ``reading_order`` (BoM two-column pages only):
    - ``outer-inner``: full outer (high-x) column top→bottom, then full inner column (Schottenstein-style).
    - ``row-rtl``: each horizontal band top→bottom; within a band, verses ordered by decreasing x (RTL line flow).
      Use when chapter matter alternates between columns by row instead of strict column fill.
    """
    # Parse by LINE (not spans), then reorder for reading (see prelude + outer + inner below).
    lines = page_lines(page)

    # Determine column split dynamically from text x-centers (robust to gutter-expanded PDFs).
    # We prefer a quantile-based split to avoid picking an intra-column gap by accident.
    xcs: list[float] = []
    for bb, _t in lines:
        if bb.y0 < BODY_MIN_Y:
            continue
        xcs.append((bb.x0 + bb.x1) / 2.0)
    mid = page.rect.width / 2.0
    if len(xcs) >= 10:
        xs = sorted(xcs)
        n = len(xs)
        q25 = xs[int(n * 0.25)]
        q75 = xs[int(n * 0.75)]
        # only accept a meaningful two-column separation
        if (q75 - q25) > 60:
            mid = (q25 + q75) / 2.0
        else:
            gaps = [(xs[i + 1] - xs[i], i) for i in range(len(xs) - 1)]
            gap, idx = max(gaps, key=lambda g: g[0])
            # accept only if the gap is near the page center (a true column gutter)
            cand = (xs[idx] + xs[idx + 1]) / 2.0
            if gap > 30 and (page.rect.width * 0.30) < cand < (page.rect.width * 0.70):
                mid = cand
    band = 10.0

    def col_of(xc: float) -> int:
        return 0 if xc > mid else 1  # 0=right column, 1=left column

    # Per-column current unit (chapter/section), seeded with carryover.
    cur_col = [initial_unit, initial_unit]
    last_heading: int | None = initial_unit

    # Monotonic per page pass; carried in via global for BoM (see main()).
    verse_stream = (
        int(globals().get("_CUR_BOM_VERSE_STREAM", 0) or 0) if (unit == "chapter" and use_bom_verse_stream) else 0
    )
    max_v_since_last_perek = 0

    ordered: list[tuple[float, int, float, int, int, int]] = []  # (row, col, y0, unit, verse, stream)
    headings_seen: set[int] = set()
    # (y0 , chapter_int , col) — only for unit == "chapter" headings
    chapter_heading_rows: list[tuple[float, int, int]] = []

    # Pre-scan headings so we don't propagate RIGHT→LEFT when both columns declare a פרק/siman
    # on the same row band with *different* numbers (dual-chapter divider row — common in Alma).
    same_band_heading_by_col: dict[tuple[float, int], tuple[int, float]] = {}

    def _heading_unit_from_line(bb: fitz.Rect, t: str) -> tuple[float, int | None, float] | None:
        if bb.y0 < BODY_MIN_Y:
            return None
        xc = (bb.x0 + bb.x1) / 2.0
        col = col_of(xc)
        row_band = round(bb.y0 / band) * band
        tc = normalize_hebrew_pdf_text(t).strip()
        mh_ch = _CHAPTER_HEADING.match(tc) if unit == "chapter" else None
        mh_sc = _SECTION_HEADING.match(tc) if unit == "section" else None
        mh = mh_ch or mh_sc
        if not mh:
            return None
        ui = _heb_to_int(mh.group(1))
        if ui is None:
            return None
        return (row_band, int(ui), float(bb.y0))

    for bb, t in lines:
        got = _heading_unit_from_line(bb, t)
        if got is None:
            continue
        rb, ui, _y0 = got
        xc = (bb.x0 + bb.x1) / 2.0
        col_h = col_of(xc)
        key = (rb, col_h)
        # keep earliest y in band if duplicates
        prev = same_band_heading_by_col.get(key)
        if prev is None or _y0 < prev[1]:
            same_band_heading_by_col[key] = (ui, bb.y0)

    for bb, t in lines:
        if bb.y0 < BODY_MIN_Y:
            continue
        xc = (bb.x0 + bb.x1) / 2.0
        col = col_of(xc)
        row = round(bb.y0 / band) * band
        tc = normalize_hebrew_pdf_text(t).strip()

        if unit == "chapter":
            mh = _CHAPTER_HEADING.match(tc)
        else:
            mh = _SECTION_HEADING.match(tc)
        if mh:
            ui = _heb_to_int(mh.group(1))
            if ui is not None:
                if (
                    use_bom_verse_stream
                    and unit == "chapter"
                    and max_v_since_last_perek >= _DUP_PEREK_VERSE_THRESHOLD
                    and cur_col[col] is not None
                    and int(ui) == int(cur_col[col])
                ):
                    # Same "פרק" number after already seeing high verses on this page → new book
                    # instance (e.g. second "פרק א" for Mormon after Moroni's "פרק א").
                    verse_stream += 1
                max_v_since_last_perek = 0
                cur_col[col] = ui
                # In this layout the reading order is: right column top→bottom, then left column.
                # When a new chapter/section heading appears in the RIGHT column, the LEFT column
                # that follows is part of that same new unit even if it doesn't repeat the heading.
                # IMPORTANT: Skip that propagation when the same row-band already has its own heading
                # in the left column with a *different* unit (dual divider row — otherwise we force
                # the wrong perek onto the left column briefly and verse ranges become garbage).
                if col == 0:
                    lk = (row, 1)
                    conflicting = False
                    if lk in same_band_heading_by_col:
                        left_u, _oy = same_band_heading_by_col[lk]
                        if left_u != int(ui):
                            conflicting = True
                    if not conflicting:
                        cur_col[1] = ui
                last_heading = ui
                headings_seen.add(int(ui))
                if unit == "chapter":
                    chapter_heading_rows.append((float(bb.y0), int(ui), int(col)))
            continue

        mv1 = _VERSE_AFTER_DOT.match(tc)
        mv2 = _VERSE_BEFORE_DOT.match(tc)
        mv = mv1 or mv2
        if mv:
            vi = _heb_to_int(mv.group(1))
        else:
            vi = _verse_num_from_leading_dot_line(tc)
        if vi is None:
            continue

        ui = cur_col[col]
        if ui is None:
            continue

        max_v_since_last_perek = max(max_v_since_last_perek, int(vi))
        xc = (bb.x0 + bb.x1) / 2.0
        # ( y0 , -xc , col , unit , verse , stream ) — col 0 = outer / high-x column, col 1 = inner.
        ordered.append((float(bb.y0), -xc, col, int(ui), int(vi), verse_stream))

    if not ordered:
        if use_bom_verse_stream:
            globals()["_CUR_BOM_VERSE_STREAM"] = verse_stream
        return (None, None, last_heading)

    # If this page bridged two book-instances (duplicate perek numbers), keep only final stream first.
    streams = {o[5] for o in ordered}
    if use_bom_verse_stream and unit == "chapter" and len(streams) > 1:
        keep = max(streams)
        ordered = [o for o in ordered if o[5] == keep]

    if not ordered:
        if use_bom_verse_stream:
            globals()["_CUR_BOM_VERSE_STREAM"] = verse_stream
        return (None, None, last_heading)

    def _reading_sort_key(o: tuple[float, float, int, int, int, int]) -> tuple[float, float]:
        return (round(o[0], 2), o[1])

    if reading_order == "row-rtl":
        # Row-major RTL: verses read in visual bands (y), right-to-left within each band (-x).
        reading = sorted(ordered, key=_reading_sort_key)
    else:
        ys_outer = [o[0] for o in ordered if o[2] == 0]
        ys_inner = [o[0] for o in ordered if o[2] == 1]
        if not ys_outer or not ys_inner:
            reading = sorted(ordered, key=_reading_sort_key)
        else:
            # Schottenstein Hebrew two-column rule: read the entire OUTER / high-x column (0) top→bottom,
            # then the entire INNER column (1) top→bottom.
            outer = sorted((o for o in ordered if o[2] == 0), key=_reading_sort_key)
            inner = sorted((o for o in ordered if o[2] == 1), key=_reading_sort_key)
            reading = outer + inner

    # Drop a next-column foot teaser (e.g. פרק ז lines in the inner column with no parallel outer verse of
    # that chapter): any פרק heading whose number exceeds max chapter observed in outer-column verses, at the
    # earliest such heading y.
    if reading_order != "row-rtl" and unit == "chapter" and chapter_heading_rows:
        max_outer_u = max((o[3] for o in reading if o[2] == 0), default=-1)
        if max_outer_u >= 0:
            new_heads = [(y, ch, c) for (y, ch, c) in chapter_heading_rows if ch > max_outer_u]
            if new_heads:
                cut_y = min(y for (y, _ch, _c) in new_heads)
                cut_ch = min(ch for (y, ch, _c) in new_heads if abs(y - cut_y) < 0.75)
                reading = [o for o in reading if not (o[0] >= cut_y - 0.5 and o[3] >= cut_ch)]

    if not reading:
        if use_bom_verse_stream:
            globals()["_CUR_BOM_VERSE_STREAM"] = verse_stream
        return (None, None, last_heading)

    # Header span (BoM two-column, ``outer-inner``):
    #   START = first counted verse in the **outer / right** column (top → bottom, RTL within a line).
    #   END   = last counted verse in the **inner / left** column (same sort).
    # Multiple chapters may appear in a single column; this still anchors the range to those two
    # geometric extremes (not the last token of “outer then inner” if that ever diverged).
    # ``row-rtl``: span is first → last in row-major order across the page.
    if reading_order == "row-rtl":
        start_u, start_v = reading[0][3], reading[0][4]
        end_u, end_v = reading[-1][3], reading[-1][4]
        stream_src = reading[-1]
    else:
        ro = [o for o in reading if o[2] == 0]
        ri = [o for o in reading if o[2] == 1]
        if ro and ri:
            ro_s = sorted(ro, key=_reading_sort_key)
            ri_s = sorted(ri, key=_reading_sort_key)
            start_u, start_v = ro_s[0][3], ro_s[0][4]
            end_u, end_v = ri_s[-1][3], ri_s[-1][4]
            stream_src = ri_s[-1]
        elif ro:
            ro_s = sorted(ro, key=_reading_sort_key)
            start_u, start_v = ro_s[0][3], ro_s[0][4]
            end_u, end_v = ro_s[-1][3], ro_s[-1][4]
            stream_src = ro_s[-1]
        elif ri:
            ri_s = sorted(ri, key=_reading_sort_key)
            start_u, start_v = ri_s[0][3], ri_s[0][4]
            end_u, end_v = ri_s[-1][3], ri_s[-1][4]
            stream_src = ri_s[-1]
        else:
            start_u, start_v = reading[0][3], reading[0][4]
            end_u, end_v = reading[-1][3], reading[-1][4]
            stream_src = reading[-1]

    if use_bom_verse_stream:
        globals()["_CUR_BOM_VERSE_STREAM"] = stream_src[5]

    # Global rule to prevent "tiny tail" from dominating the header:
    # If OUTER column begins with a short tail of a prior chapter before a new dominating פרק, snap start.
    if reading_order != "row-rtl" and unit == "chapter" and start_u != end_u:
        end_has_heading = end_u in headings_seen
        end_has_v1 = any(o[3] == end_u and o[4] == 1 for o in reading)
        if end_has_heading and end_has_v1 and start_v >= 25:
            right_stream = sorted((o for o in reading if o[2] == 0), key=_reading_sort_key)
            first_new_idx = next((i for i, o in enumerate(right_stream) if o[3] == end_u), None)
            if first_new_idx is not None:
                tail = [o for o in right_stream[:first_new_idx] if o[3] == start_u]
                if len(tail) <= 4:
                    start_u, start_v = end_u, 1

    if (start_u, start_v) > (end_u, end_v):
        start_u, start_v, end_u, end_v = end_u, end_v, start_u, start_v

    return ((start_u, start_v), (end_u, end_v), last_heading)


def fmt_pair(pair: tuple[int, int]) -> str:
    return f"{heb(pair[0])} / {heb(pair[1])}"


def fmt_range(start: tuple[int, int], end: tuple[int, int]) -> str:
    """User-requested compact form (logical order):
    - Same unit:  א / א – טו
    - Different: א / טז – ב / יג
    """
    a, b = _range_parts(start, end)
    return f"{a} \u2009\u2013\u2009 {b}"


def fmt_range_dc(start: tuple[int, int], end: tuple[int, int]) -> str:
    """D&C compact form with required 'סימן' labels."""
    su, sv = start
    eu, ev = end
    if su == eu:
        return f"סימן {heb(su)} / {heb(sv)} \u2009\u2013\u2009 {heb(ev)}"
    return f"סימן {heb(su)} / {heb(sv)} \u2009\u2013\u2009 סימן {heb(eu)} / {heb(ev)}"


def _range_parts(start: tuple[int, int], end: tuple[int, int]) -> tuple[str, str]:
    """Return (start_part, end_part) in the user's compact format.
    - start_part: "unit / verse"
    - end_part: "verse" if same unit else "unit / verse"
    """
    su, sv = start
    eu, ev = end
    if su == eu:
        return (f"{heb(su)} / {heb(sv)}", f"{heb(ev)}")
    return (f"{heb(su)} / {heb(sv)}", f"{heb(eu)} / {heb(ev)}")


def _draw_compact_range(
    tw: fitz.TextWriter,
    *,
    x0: float,
    y: float,
    start: tuple[int, int],
    end: tuple[int, int],
    font: fitz.Font,
    fontsize: float,
    mode: str,
) -> None:
    """Draw range as one bidi-shaped string (global fix)."""
    logical = fmt_range_dc(start, end) if mode == "dc" else fmt_range(start, end)
    visual = get_display(logical, base_dir="R")
    tw.append(fitz.Point(x0, y), visual, font=font, fontsize=fontsize, right_to_left=0)


def extract_range_string(page: fitz.Page, *, mode: str) -> tuple[str | None, str | None]:
    """
    mode:
      - 'bom' or 'pgp': chapter/verse
      - 'dc': section/verse (סימן)
    """
    unit = "section" if mode == "dc" else "chapter"
    s, e, _last = extract_unit_range_on_page(page, unit=unit, initial_unit=None)
    if not s or not e:
        return (None, None)
    return (fmt_pair(s), fmt_pair(e))


# English LDS Moroni chapter lengths. Used only to close a running header when verse markers are
# missing mid-page (Hebrew layout often prints a spurious inner "פרק נ+1" teaser while the body still
# completes chapter נ through its last verse—e.g. Moroni 6 numbered only through ב on the outer column).
_MORONI_EN_VERSE_COUNT_BY_CHAPTER: dict[int, int] = {
    1: 4,
    2: 3,
    3: 4,
    4: 3,
    5: 9,
    6: 9,
    7: 48,
    8: 41,
    9: 26,
    10: 34,
}


def extend_bom_moroni_chapter_end_after_teaser_heading_gap(
    doc: fitz.Document,
    p1_1based: int,
    range_end: tuple[int, int] | None,
    *,
    prev_running_book: str,
    bom_body_end_1based: int,
    bom_ch_after_extract: int | None,
    bom_verse_stream_after_extract: int,
    bom_reading_order: str = "outer-inner",
) -> tuple[int, int] | None:
    """If mark-up stopped early on the closing chapter but the next page opens c+1 verse 1, snap end to c's cap."""
    if range_end is None or prev_running_book != "מורוני":
        return range_end
    eu, ev = range_end
    cap = _MORONI_EN_VERSE_COUNT_BY_CHAPTER.get(eu)
    if cap is None or ev >= cap:
        return range_end
    # Only for “almost no verse ticks on closing chapter”: do not inflate real mid-chapter endings.
    if ev > 3:
        return range_end
    if p1_1based >= bom_body_end_1based:
        return range_end
    next_doc_i = p1_1based  # next 1-based → 0-based index equals current 1-based page number
    if next_doc_i >= doc.page_count:
        return range_end

    vs0 = int(bom_verse_stream_after_extract)
    ch0 = bom_ch_after_extract
    next_page = doc[next_doc_i]
    sn, _, _ = extract_unit_range_on_page(
        next_page,
        unit="chapter",
        initial_unit=ch0,
        use_bom_verse_stream=True,
        reading_order=bom_reading_order,
    )
    globals()["_CUR_BOM_VERSE_STREAM"] = vs0
    globals()["_CUR_BOM_CH"] = ch0

    if sn and sn[0] == eu + 1 and sn[1] == 1:
        return (eu, cap)
    return range_end


BOOK_HEADINGS_BOM = [
    "נפי א",
    "נפי ב",
    "יעקב",
    "אנוש",
    "ירום",
    "אמני",
    "דברי מורמון",
    "מושיה",
    "אלמא",
    "הילמן",
    "נפי ג",
    "נפי ד",
    "מורמון",
    "אתר",
    "מורוני",
]

# Canonical order for resolving running heads. Body verses often expose a lone line matching a
# shorter book keyword (especially "יעקב" for the patriarch)—that must NOT move the header
# backward from later books such as נפי ג.
_BOOK_TITLE_ORDER: dict[str, int] = {name: i for i, name in enumerate(BOOK_HEADINGS_BOM)}

# Book titles in the running head match the displayed scripture book (אתר = Ether, מורוני = Moroni).
_BOOK_HEADER_DISPLAY: dict[str, str] = {}


def bom_running_head_display(canonical_book: str) -> str:
    return _BOOK_HEADER_DISPLAY.get(canonical_book, canonical_book)


def bom_format_runner_book_title(header_title: str) -> str:
    """Apply user-facing substitutions (אתר → מורוני) without collapsing duplicate slashes."""
    if " / " not in header_title:
        return bom_running_head_display(header_title.strip())
    parts = [bom_running_head_display(p.strip()) for p in header_title.split(" / ")]
    deduped: list[str] = []
    for p in parts:
        if not deduped or deduped[-1] != p:
            deduped.append(p)
    return " / ".join(deduped)


def resolve_bom_book_from_detections(previous_book: str, detected_lines: list[str]) -> str:
    """
    Choose the scripture book title for headers from raw line matches.

    Only titles at or after ``previous_book`` in canonical BoM sequence are admissible, so stray
    "יעקב" hits inside 3 Nephi do not repaint the header as יעקב / נפי ג.

    If ``previous_book`` is stuck at the end of the sequence (e.g. false "מורוני" body matches on an
    Alma/Helaman page), earlier titles such as הילמן must still be able to recover—otherwise forward
    filtering blocks every lower-index book forever.
    """
    if not detected_lines:
        return previous_book
    pi = _BOOK_TITLE_ORDER.get(previous_book, 0)
    forward = [t for t in detected_lines if _BOOK_TITLE_ORDER.get(t, -1) >= pi]
    if forward:
        return max(forward, key=lambda t: _BOOK_TITLE_ORDER[t])
    # Recovery: prominent/stray "מורוני" + narrative "נפי א" cross-refs left pi at 14 with no forward titles.
    pi_hi = max((_BOOK_TITLE_ORDER.get(t, -1) for t in detected_lines), default=-1)
    if pi_hi >= 0 and pi_hi < pi:
        return max(
            (t for t in detected_lines if _BOOK_TITLE_ORDER.get(t, -1) == pi_hi),
            key=lambda t: _BOOK_TITLE_ORDER[t],
        )
    return previous_book


# Late BoM tail (Helaman → Moroni): header book must follow PDF layout even when plain-text detection
# falsely jumped to מורוני (see resolve_bom_book_from_detections recovery). Map absolute PDF page → title.
_BOM_TAIL_BOOK_SEQUENCE: list[str] = ["הילמן", "נפי ג", "נפי ד", "מורמון", "אתר", "מורוני"]


def compute_tail_book_lookup(doc: fitz.Document, lo: int, hi: int) -> dict[int, str]:
    """
    Build page → running-head book title for ``lo``..``hi`` using first **prominent** heading hit for each
    tail book (avoids narrative Moroni / 1 Nephi cross-ref lines).
    """
    events: list[tuple[int, str]] = []
    for book in _BOM_TAIL_BOOK_SEQUENCE:
        for p1 in range(lo, hi + 1):
            page = doc[p1 - 1]
            if book in _prominent_heading_title_hits(page, [book]):
                events.append((p1, book))
                break
    events.sort(key=lambda x: (x[0], _BOM_TAIL_BOOK_SEQUENCE.index(x[1])))
    deduped: list[tuple[int, str]] = []
    for fp, bk in events:
        if deduped and deduped[-1][0] == fp:
            if _BOM_TAIL_BOOK_SEQUENCE.index(bk) > _BOM_TAIL_BOOK_SEQUENCE.index(deduped[-1][1]):
                deduped[-1] = (fp, bk)
        else:
            deduped.append((fp, bk))

    lookup: dict[int, str] = {}
    cur_book = _BOM_TAIL_BOOK_SEQUENCE[0]
    seg_start = lo
    for fp, bk in deduped:
        if bk == cur_book:
            continue
        for p in range(seg_start, fp):
            lookup[p] = cur_book
        seg_start = fp
        cur_book = bk
    for p in range(seg_start, hi + 1):
        lookup[p] = cur_book
    return lookup


def detect_book_titles_on_page(page: fitz.Page, choices: list[str]) -> list[str]:
    raw = page.get_text("text") or ""
    lines = [x.strip() for x in raw.splitlines() if x.strip()]
    found: list[str] = []
    for ln in lines:
        c = normalize_hebrew_pdf_text(ln).replace(" ", "")
        for title in choices:
            if title.replace(" ", "") == c:
                if title not in found:
                    found.append(title)
    return found


_PROMINENT_TITLE_MIN_FS = 11.25
_PROMINENT_TITLE_MAX_CHARS = 32


def _prominent_heading_title_hits(page: fitz.Page, choices: list[str]) -> list[str]:
    """
    Book headings are rendered large/bold centered above body text; stray body lines rarely match.
    Catches headings that never appear as standalone plain-text extractions alone.
    """
    d = page.get_text("dict")
    found: list[str] = []
    for b in d.get("blocks", []):
        if b.get("type") != 0:
            continue
        for ln in b.get("lines", []):
            bb = fitz.Rect(ln["bbox"])
            if bb.y0 < BODY_MIN_Y:
                continue
            spans = ln.get("spans", [])
            if not spans:
                continue
            fs = float(max(sp.get("size") or 0.0 for sp in spans))
            if fs < _PROMINENT_TITLE_MIN_FS:
                continue
            txt = "".join((sp.get("text") or "") for sp in spans).strip()
            if not txt:
                continue
            c = normalize_hebrew_pdf_text(txt).replace(" ", "")
            if len(c) > _PROMINENT_TITLE_MAX_CHARS:
                continue
            for title in choices:
                if title.replace(" ", "") == c and title not in found:
                    found.append(title)
    return found


def detect_bom_book_title_hits(page: fitz.Page) -> list[str]:
    """Whole-line headings + visually prominent centered book titles."""
    hits = detect_book_titles_on_page(page, BOOK_HEADINGS_BOM)
    for t in _prominent_heading_title_hits(page, BOOK_HEADINGS_BOM):
        if t not in hits:
            hits.append(t)
    return hits


def page_has_norm(page: fitz.Page, needle: str) -> bool:
    n0 = needle.replace(" ", "")
    t = normalize_hebrew_pdf_text(page.get_text("text") or "").replace(" ", "")
    return bool(n0) and n0 in t


def draw_running_head(
    page: fitz.Page,
    *,
    doc_page_1based: int,
    book_title: str,
    left_margin_pt: float,
    right_margin_pt: float,
    range_start: str | None,
    range_end: str | None,
    range_pair: tuple[tuple[int, int], tuple[int, int]] | None = None,
    mode: str = "bom",
    mutate: str = "both",
    header_verse_title_split_x: float | None = None,
) -> None:
    rect = page.rect

    split_x = header_verse_title_split_x
    if split_x is None:
        split_x = rect.width * 0.48

    # Redact only the parts we will redraw (so title-only preserves hand-tuned verse pixels, etc.).
    if mutate == "title-only":
        page.add_redact_annot(fitz.Rect(split_x, HEADER_REDACT_Y0, rect.width + 2, HEADER_REDACT_Y1), fill=(1, 1, 1))
    elif mutate == "range-only":
        page.add_redact_annot(fitz.Rect(0, HEADER_REDACT_Y0, split_x + 1, HEADER_REDACT_Y1), fill=(1, 1, 1))
    else:
        page.add_redact_annot(fitz.Rect(0, HEADER_REDACT_Y0, rect.width, HEADER_REDACT_Y1), fill=(1, 1, 1))
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

    # rule under running head, aligned to actual body text block if possible
    x0 = left_margin_pt
    x1 = rect.width - right_margin_pt
    try:
        spans = page_sorted_spans(page)
        body = [bb for (bb, _t) in spans if bb.y0 >= BODY_MIN_Y]
        if body:
            min_x0 = min(b.x0 for b in body)
            max_x1 = max(b.x1 for b in body)
            # avoid accidental full-width if extraction is weird
            if 10 < min_x0 < rect.width - 10 and 10 < max_x1 < rect.width - 10 and (max_x1 - min_x0) > rect.width * 0.4:
                x0 = min_x0
                x1 = max_x1
    except Exception:
        pass
    page.draw_line((x0, HEADER_RULE_Y), (x1, HEADER_RULE_Y), color=(0, 0, 0), width=RULE_STROKE, overlay=True)

    # header text
    tw = fitz.TextWriter(rect)
    font_reg = fitz.Font(fontfile=DAVID)
    font_bd = fitz.Font(fontfile=DAVID_BD)
    # Right side: page / book (bidi-shaped in one pass).
    right_text_logical = f"{heb(doc_page_1based)} / {book_title}"
    right_text = get_display(right_text_logical, base_dir="R")

    # left side: range
    left_text = None
    if range_start and range_end:
        left_text = range_start

    baseline = HEADER_TEXT_BASELINE_Y

    if range_pair and mutate != "title-only":
        _draw_compact_range(
            tw,
            x0=x0,
            y=baseline,
            start=range_pair[0],
            end=range_pair[1],
            font=font_reg,
            fontsize=HEADER_FONT_SIZE,
            mode=mode,
        )
    elif left_text and mutate != "title-only":
        # Fallback (should be rare): still bidi-shape before drawing.
        tw.append(
            fitz.Point(x0, baseline),
            get_display(left_text, base_dir="R"),
            font=font_reg,
            fontsize=HEADER_FONT_SIZE,
            right_to_left=0,
        )
    rw = font_bd.text_length(right_text, HEADER_FONT_SIZE)
    if mutate != "range-only":
        tw.append(
            fitz.Point(x1 - rw, baseline),
            right_text,
            font=font_bd,
            fontsize=HEADER_FONT_SIZE,
            right_to_left=0,
        )
    tw.write_text(page, color=(0, 0, 0), overlay=True)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Patch triple-combination PDF running headers (RTL).")
    ap.add_argument("src", type=Path, help="Input PDF")
    ap.add_argument("dst", type=Path, help="Output PDF")
    ap.add_argument("--inside-in", type=float, default=0.75, help="Inside margin inches (KDP 501–700 pages: 0.75).")
    ap.add_argument("--outside-in", type=float, default=0.313, help="Outside margin inches.")
    ap.add_argument(
        "--western-parity",
        action="store_true",
        help="Flip spine parity: odd pages treated as spine-left (use if KDP flags gutters on wrong edge).",
    )
    ap.add_argument(
        "--bom-from-page",
        type=int,
        default=260,
        help="Do not redact/redraw BoM headers on PDF pages **strictly before** this 1-based page number. "
        "Default 260 leaves pages 1–259 untouched (locked hand work). Use 0 to patch the full BoM body.",
    )
    ap.add_argument(
        "--bom-tail-fix-lo",
        type=int,
        default=260,
        help="First PDF page (1-based) for Helaman→Moroni tail title fix via prominent headings; 0 disables.",
    )
    ap.add_argument(
        "--bom-tail-fix-hi",
        type=int,
        default=373,
        help="Last PDF page (1-based, inclusive) for tail title fix; ignored if lo is 0.",
    )
    ap.add_argument(
        "--bom-reading-order",
        choices=["outer-inner", "row-rtl"],
        default="outer-inner",
        help="outer-inner: header span = first verse in outer/right column through last verse in inner/left "
        "(several chapters per column OK). row-rtl: row bands, RTL within each band.",
    )
    ap.add_argument(
        "--header-mutate",
        choices=["both", "title-only", "range-only"],
        default="both",
        help="both = redraw verse range + book line. title-only = only book/page line (keeps existing verse text). "
        "range-only = only verse range (keeps existing book line).",
    )
    ap.add_argument(
        "--header-split-x",
        type=float,
        default=0.0,
        help="If >0: x-coordinate (pt) dividing verse (left) vs title (right) for partial redaction. "
        "If 0, uses ~48%% of page width (tune if title-only clips your layout).",
    )
    args = ap.parse_args()

    if not args.src.is_file():
        print(f"Missing: {args.src}", file=sys.stderr)
        return 1

    inside_pt = float(args.inside_in) * 72.0
    outside_pt = float(args.outside_in) * 72.0

    doc = fitz.open(args.src)
    try:
        ranges = guess_main_body_ranges(doc)
        if not ranges:
            raise SystemExit("Could not detect main body ranges in PDF.")
        print("Detected body ranges:")
        for r in ranges:
            print(" ", r.book, r.start_1based, "..", r.end_1based)

        tail_lookup: dict[int, str] = {}
        lo_tail = int(args.bom_tail_fix_lo)
        hi_tail = int(args.bom_tail_fix_hi)
        if lo_tail > 0 and hi_tail >= lo_tail:
            tail_lookup = compute_tail_book_lookup(doc, lo_tail, hi_tail)
            print(f"BoM tail header titles {lo_tail}..{hi_tail}: built {len(tail_lookup)} page map entries.")

        current_bom_book = "נפי א"
        current_pgp_book = None
        for r in ranges:
            for p1 in range(r.start_1based, r.end_1based + 1):
                page = doc[p1 - 1]
                lm, rm = page_side_margins_pt(
                    p1, inside_pt=inside_pt, outside_pt=outside_pt, western_parity=bool(args.western_parity)
                )

                mode = "bom" if r.book == "ספר מורמון" else ("dc" if r.book == "הלקח והבריתות" else "pgp")

                # Range extraction is stateful across pages (chapters/sections continue).
                if mode == "bom":
                    if p1 == r.start_1based:
                        globals()["_CUR_BOM_VERSE_STREAM"] = 0
                    init = globals().get("_CUR_BOM_CH", None)
                    # If we're starting fresh mid-book (because earlier pages were manual-skipped),
                    # seed from an explicit chapter marker on the page.
                    if init is None and page_has_norm(page, "פרק א"):
                        init = 1
                    s, e, last = extract_unit_range_on_page(
                        page,
                        unit="chapter",
                        initial_unit=init,
                        use_bom_verse_stream=True,
                        reading_order=str(args.bom_reading_order),
                    )
                    globals()["_CUR_BOM_CH"] = last
                    effective_book = current_bom_book
                    if tail_lookup and lo_tail <= p1 <= hi_tail and p1 in tail_lookup:
                        effective_book = tail_lookup[p1]
                    e = extend_bom_moroni_chapter_end_after_teaser_heading_gap(
                        doc,
                        p1,
                        e,
                        prev_running_book=effective_book,
                        bom_body_end_1based=r.end_1based,
                        bom_ch_after_extract=last,
                        bom_verse_stream_after_extract=int(globals().get("_CUR_BOM_VERSE_STREAM") or 0),
                        bom_reading_order=str(args.bom_reading_order),
                    )
                elif mode == "dc":
                    s, e, last = extract_unit_range_on_page(page, unit="section", initial_unit=globals().get("_CUR_DC_SEC", None))
                    globals()["_CUR_DC_SEC"] = last
                else:
                    s, e, last = extract_unit_range_on_page(page, unit="chapter", initial_unit=globals().get("_CUR_PGP_CH", None))
                    globals()["_CUR_PGP_CH"] = last

                # title text in header (may depend on detected range across books)
                if mode == "bom":
                    if args.bom_from_page and p1 < int(args.bom_from_page):
                        continue
                    if tail_lookup and lo_tail <= p1 <= hi_tail and p1 in tail_lookup:
                        book_now = tail_lookup[p1]
                        header_title = bom_format_runner_book_title(book_now)
                        current_bom_book = book_now
                    else:
                        titles = detect_bom_book_title_hits(page)
                        prev_book = current_bom_book
                        book_now = resolve_bom_book_from_detections(prev_book, titles)
                        # Dual title only when the page plausibly straddles two scripture books:
                        # chapter-major range regression, or both books appear as detected headings.
                        if book_now != prev_book and s and e and e[0] < s[0]:
                            header_title = f"{prev_book} / {book_now}"
                        elif book_now != prev_book and prev_book in titles and book_now in titles:
                            header_title = f"{prev_book} / {book_now}"
                        else:
                            header_title = book_now
                        current_bom_book = book_now
                        header_title = bom_format_runner_book_title(header_title)
                elif mode == "dc":
                    header_title = "הלקח והבריתות"
                else:
                    # PGP: keep simple; if we see a Heading 1, use it
                    titles = detect_book_titles_on_page(page, ["ספר משה", "ספר אברהם", "יוסף סמית", "מאמרי אמונה"])
                    if titles:
                        current_pgp_book = titles[-1]
                    header_title = current_pgp_book or "פנינת המחיר הגדול"

                start = fmt_pair(s) if s else None
                end = fmt_pair(e) if e else None
                rp = None
                if s and e:
                    # Replace with compact range string (do not duplicate unit when same).
                    start = fmt_range(s, e)
                    end = start  # draw_running_head treats (start==end) as single string
                    rp = (s, e)

                split_x = float(args.header_split_x) if float(args.header_split_x) > 0 else None
                draw_running_head(
                    page,
                    doc_page_1based=p1 - r.start_1based + 1,  # restart per-body block count
                    book_title=header_title,
                    left_margin_pt=lm,
                    right_margin_pt=rm,
                    range_start=start,
                    range_end=end,
                    range_pair=rp,
                    mode=mode,
                    mutate=str(args.header_mutate),
                    header_verse_title_split_x=split_x,
                )

        doc.save(args.dst, garbage=4, deflate=True, clean=True)
    finally:
        doc.close()

    print(f"Wrote: {args.dst}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

