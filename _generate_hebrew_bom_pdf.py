#!/usr/bin/env python3
"""
Generate a Hebrew-only Book of Mormon PDF — KDP-ready, RTL.
- 6x9 inch trim (KDP standard)
- RTL mirrored margins (gutter on RIGHT for RTL binding)
- Two columns, justified RTL text (BiDi-corrected)
- David font, size 14, bold verse numbers on right
- Hebrew page numbers (bottom center)
- Header: book title on right, chapter on left
- Center divider line
- Chapter headings included
- Book colophons/superscriptions included
- Full front matter
- Two blank pages at start
- No footnotes, no references
"""

import json
import re
import os
from bidi.algorithm import get_display
from reportlab.lib.units import inch
from reportlab.lib.colors import black, HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

pdfmetrics.registerFont(TTFont('David', 'C:/Windows/Fonts/david.ttf'))
pdfmetrics.registerFont(TTFont('David-Bold', 'C:/Windows/Fonts/davidbd.ttf'))

BASE = 'C:/Users/chris/Desktop/Standard Works Project'


def bidi(text):
    return get_display(text)


# ── Hebrew numerals ──
H_ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
H_TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
H_HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת']

def int_to_heb(n):
    if n <= 0: return str(n)
    if n >= 1000:
        return H_ONES[n // 1000] + "׳" + (int_to_heb(n % 1000) if n % 1000 else '')
    r = ''
    h = n // 100
    if h > 0:
        r += H_HUNDREDS[h] if h <= 4 else ('ת' + H_HUNDREDS[h - 4])
        n %= 100
    if n == 15: return r + 'טו'
    if n == 16: return r + 'טז'
    t = n // 10
    if t > 0: r += H_TENS[t]; n %= 10
    if n > 0: r += H_ONES[n]
    return r


BOOK_HEB = {
    '1 Nephi': 'נֶפִי א', '2 Nephi': 'נֶפִי ב', 'Jacob': 'יַעֲקֹב',
    'Enos': 'אֵנוֹשׁ', 'Jarom': 'יָרוֹם', 'Omni': 'אָמְנִי',
    'Words of Mormon': 'דִּבְרֵי מוֹרְמוֹן', 'Mosiah': 'מוֹשִׁיָּה',
    'Alma': 'אַלְמָא', 'Helaman': 'הֵילָמָן', '3 Nephi': 'נֶפִי ג',
    '4 Nephi': 'נֶפִי ד', 'Mormon': 'מוֹרְמוֹן', 'Ether': 'אֶתֶר',
    'Moroni': 'מוֹרוֹנִי',
    # D&C
    'D&C': 'תּוֹרָה וּבְרִיתוֹת', 'D&C Intro': 'מְבוֹא',
    'OD 1': 'הַכְרָזָה רִשְׁמִית א', 'OD 2': 'הַכְרָזָה רִשְׁמִית ב',
    # PGP
    'Moses': 'מֹשֶׁה', 'Abraham': 'אַבְרָהָם',
    'JS-Matthew': 'יוֹסֵף סְמִית — מַתִּתְיָהוּ',
    'JS-History': 'יוֹסֵף סְמִית — הִיסְטוֹרְיָה',
    'Articles of Faith': 'עִקְרֵי הָאֱמוּנָה',
    'PGP Intro': 'מְבוֹא',
}

# Books that use סִימָן (section) instead of פרק (chapter)
SECTION_BOOKS = {'D&C'}

BOOK_FILES = {
    '1 Nephi': '1nephi', '2 Nephi': '2nephi', 'Jacob': 'jacob',
    'Enos': 'enos', 'Jarom': 'jarom', 'Omni': 'omni',
    'Words of Mormon': 'words_of_mormon', 'Mosiah': 'mosiah',
    'Alma': 'alma', 'Helaman': 'helaman', '3 Nephi': '3nephi',
    '4 Nephi': '4nephi', 'Mormon': 'mormon', 'Ether': 'ether',
    'Moroni': 'moroni',
}


def load_verses():
    with open(f'{BASE}/bom/official_verses.js', 'r', encoding='utf-8') as f:
        text = f.read()
    return json.loads(re.search(r'=\s*(\[.*\])', text, re.DOTALL).group(1))

def load_headings():
    with open(f'{BASE}/bom/chapter_headings_heb.js', 'r', encoding='utf-8') as f:
        text = f.read()
    return json.loads(re.search(r'=\s*(\{.*\})', text, re.DOTALL).group(1))

def load_front_matter():
    with open(f'{BASE}/Hebrew BOM/front_matter.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_dc_verses():
    with open(f'{BASE}/dc_official_verses.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_dc_chronology():
    with open(f'{BASE}/dc_chronology.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_pgp_verses():
    with open(f'{BASE}/pgp_official_verses.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_colophons():
    """Extract colophon/superscription text for each book."""
    colophons = {}
    for book, fname in BOOK_FILES.items():
        fpath = f'{BASE}/Hebrew BOM/verses/{fname}.js'
        if not os.path.exists(fpath):
            fpath = f'{BASE}/bom/verses/{fname}.js'
        if not os.path.exists(fpath):
            continue
        with open(fpath, 'r', encoding='utf-8') as f:
            text = f.read()

        # colophonWords or colophonVerses
        m = re.search(r'var \w*[Cc]olophon\w*\s*=\s*\[(.*?)\];', text, re.DOTALL)
        if m:
            pairs = re.findall(r'\["([^"]*)",\s*"[^"]*"\]', m.group(1))
            words = [w for w in pairs if w not in ('׃', '')]
            if words:
                colophons[book] = ' '.join(words) + '׃'
            continue

        # Superscription as first verse with num ∗ or empty
        m2 = re.search(
            r'var \w+_ch1Verses\s*=\s*\[\s*\{\s*num:\s*"([^"]*)",\s*words:\s*\[(.*?)\]\s*\}',
            text, re.DOTALL
        )
        if m2 and m2.group(1) in ('∗', '', '0'):
            pairs = re.findall(r'\["([^"]*)",\s*"[^"]*"\]', m2.group(2))
            words = [w for w in pairs if w not in ('׃', '')]
            if words:
                colophons[book] = ' '.join(words) + '׃'

    return colophons


# ── KDP 6x9 RTL page layout ──
PAGE_W = 6 * inch
PAGE_H = 9 * inch

# RTL binding: gutter (inside) is on the RIGHT side
# KDP 6x9 requirements for ~640 pages:
#   - Outside margins: min 0.25" (we use 0.5" for readability)
#   - Gutter (inside): min 0.375" + 0.012*pagecount/2 ≈ 0.75" for 640pp
#   - Top/Bottom: min 0.25" (we use 0.5")
# KDP 6x9 gutter tiers: 24-150→0.375", 151-300→0.5", 301-500→0.625", 501-700→0.75", 701-828→0.875"
GUTTER = 0.875 * inch    # inside margin (binding side, KDP 701-828pp)
OUTSIDE = 0.38 * inch    # outside margin (above 0.25" min)
MARGIN_TOP = 0.42 * inch
MARGIN_BOTTOM = 0.42 * inch
COLUMN_GAP = 0.18 * inch

HEADER_Y = PAGE_H - 0.38 * inch
FOOTER_Y = 0.3 * inch
TEXT_START = PAGE_H - 0.58 * inch  # content starts below header line

BODY_SIZE = 13
VERSE_NUM_SIZE = 8
HEADER_SIZE = 9
FOOTER_SIZE = 9
CHAPTER_SIZE = 14
HEADING_SIZE = 11
BOOK_TITLE_SIZE = 18
COLOPHON_SIZE = 10
FM_SIZE = 12  # front matter body size

LINE_SPACING = BODY_SIZE * 1.35
VERSE_GAP = 2.0
CHAPTER_GAP_BEFORE = 5


def wrap(c, words, font, size, max_w):
    lines = []
    cur = []
    for w in words:
        test = bidi(' '.join(cur + [w]))
        if c.stringWidth(test, font, size) > max_w and cur:
            lines.append(cur)
            cur = [w]
        else:
            cur.append(w)
    if cur:
        lines.append(cur)
    return lines


class HebrewBOMPdf:
    def __init__(self, path):
        self.c = canvas.Canvas(path, pagesize=(PAGE_W, PAGE_H))
        self.c.setTitle(bidi("סֵפֶר מוֹרְמוֹן"))
        self.c.setAuthor("Standard Works Project")
        self.page_num = 0
        self.col = 0  # 0=right, 1=left
        self.y = 0
        self.page_verses = []
        self._col_start_y = None  # custom column start y (for after colophon)

    def _left_margin(self):
        """RTL KDP: binding on RIGHT. Odd pages gutter on right, even on left."""
        if self.page_num % 2 == 1:
            return OUTSIDE   # odd page: outside on left
        else:
            return GUTTER    # even page: gutter on left

    def _right_margin(self):
        if self.page_num % 2 == 1:
            return GUTTER    # odd page: gutter on right (binding side)
        else:
            return OUTSIDE   # even page: outside on right

    def _content_width(self):
        return PAGE_W - self._left_margin() - self._right_margin()

    def _col_width(self):
        return (self._content_width() - COLUMN_GAP) / 2.0

    def _col_right_edge(self):
        cw = self._col_width()
        if self.col == 0:
            # Right column: right edge is at page width minus right margin
            return PAGE_W - self._right_margin()
        else:
            # Left column: right edge is at left margin + column width
            return self._left_margin() + cw

    def _col_left_edge(self):
        cw = self._col_width()
        if self.col == 0:
            # Right column: left edge is right edge minus column width
            return PAGE_W - self._right_margin() - cw
        else:
            # Left column: left edge is at left margin
            return self._left_margin()

    def _col_center(self):
        return self._col_left_edge() + self._col_width() / 2

    def _content_center(self):
        """Visual center of the content area (between margins)."""
        return self._left_margin() + self._content_width() / 2

    @property
    def text_top(self):
        return TEXT_START

    @property
    def text_bottom(self):
        return MARGIN_BOTTOM

    def _new_page(self):
        self._draw_furniture()
        self.c.showPage()
        self.page_num += 1
        self.col = 0
        self.y = self.text_top
        self._col_start_y = None  # reset custom start
        self.page_verses = []

    def _next_col(self):
        if self.col == 0:
            self.col = 1
            # Use custom start y if set (e.g. after colophon), otherwise text_top
            self.y = self._col_start_y if self._col_start_y else self.text_top
        else:
            self._new_page()

    def _ensure(self, h):
        if self.y - h < self.text_bottom:
            self._next_col()

    def _draw_furniture(self):
        c = self.c
        lm = self._left_margin()
        rm = self._right_margin()

        # Center divider — only in two-column area
        cx = lm + self._content_width() / 2
        divider_top = self._col_start_y if self._col_start_y else self.text_top
        c.setStrokeColor(HexColor('#CCCCCC'))
        c.setLineWidth(0.5)
        c.line(cx, self.text_bottom, cx, divider_top)
        c.setStrokeColor(black)

        # ArtScroll-style header (consistent RTL layout, every page same):
        #   RIGHT: book name / page number
        #   LEFT: chapter / verse range
        #   Line below
        if self.page_verses:
            first = self.page_verses[0]
            last = self.page_verses[-1]
            book_heb = BOOK_HEB.get(first[0], first[0])
            page_heb = int_to_heb(self.page_num)

            # Right side: page / book name
            bp_text = f"{page_heb} / {book_heb}"
            c.setFont('David-Bold', HEADER_SIZE)
            c.drawRightString(PAGE_W - rm, HEADER_Y, bidi(bp_text))

            # Left side: chapter / verse range
            if first[1] == last[1]:
                cv_text = f"{int_to_heb(first[1])} / {int_to_heb(first[2])}–{int_to_heb(last[2])}"
            else:
                cv_text = f"{int_to_heb(first[1])}:{int_to_heb(first[2])}–{int_to_heb(last[1])}:{int_to_heb(last[2])}"
            c.setFont('David', HEADER_SIZE)
            c.drawString(lm, HEADER_Y, bidi(cv_text))

            # Line under header
            c.setStrokeColor(black)
            c.setLineWidth(0.4)
            c.line(lm, HEADER_Y - 5, PAGE_W - rm, HEADER_Y - 5)

            # Line above footer
            c.line(lm, MARGIN_BOTTOM - 2, PAGE_W - rm, MARGIN_BOTTOM - 2)
            c.setStrokeColor(black)

    # ── Justified text drawing ──
    def _just_line(self, words, right_e, left_e, font, size, last):
        c = self.c
        c.setFont(font, size)
        avail = right_e - left_e
        if last or len(words) <= 1:
            # Last line of verse or single word: right-align only
            c.drawRightString(right_e, self.y, bidi(' '.join(words)))
        else:
            # Always justify non-last lines to fill full width
            bw = [bidi(w) for w in words]
            tw = sum(c.stringWidth(b, font, size) for b in bw)
            gap = (avail - tw) / (len(words) - 1)
            x = right_e
            for b in bw:
                ww = c.stringWidth(b, font, size)
                c.drawRightString(x, self.y, b)
                x -= ww + gap

    # ── Verse ──
    def _verse(self, vnum, hebrew, book, chapter):
        c = self.c
        vlabel = bidi(int_to_heb(vnum))
        c.setFont('David-Bold', VERSE_NUM_SIZE)
        nw = c.stringWidth(vlabel, 'David-Bold', VERSE_NUM_SIZE) + 5
        tw = self._col_width() - nw - 3

        words = hebrew.split()
        lines = wrap(c, words, 'David', BODY_SIZE, tw)
        self._ensure(LINE_SPACING)

        # Track verse on the page AFTER ensuring space (correct page)
        self.page_verses.append((book, chapter, vnum))

        for i, lw in enumerate(lines):
            if self.y - LINE_SPACING < self.text_bottom:
                self._next_col()
            last = (i == len(lines) - 1)
            re_ = self._col_right_edge() - 2
            le_ = self._col_left_edge() + 2

            if i == 0:
                c.setFont('David-Bold', VERSE_NUM_SIZE)
                c.drawRightString(re_, self.y + 2, vlabel)
                self._just_line(lw, re_ - nw, le_, 'David', BODY_SIZE, last)
            else:
                self._just_line(lw, re_, le_, 'David', BODY_SIZE, last)
            self.y -= LINE_SPACING
        self.y -= VERSE_GAP

    # ── Chapter title + heading ──
    def _chapter_with_heading(self, ch, heading_text=None, label=None):
        # Only ensure room for chapter title + at least 1 heading line
        min_needed = CHAPTER_GAP_BEFORE + CHAPTER_SIZE + 6 + HEADING_SIZE * 1.35
        self._ensure(min_needed)

        # Draw chapter title — use סִימָן for D&C, פרק for everything else
        ch_label = label or 'פרק'
        self.y -= CHAPTER_GAP_BEFORE
        self.c.setFont('David-Bold', CHAPTER_SIZE)
        self.c.drawCentredString(self._col_center(), self.y, bidi(f"{ch_label} {int_to_heb(ch)}"))
        self.y -= CHAPTER_SIZE + 6

        # Draw heading — allowed to break across columns
        if heading_text:
            heading_lines = wrap(self.c, heading_text.split(), 'David', HEADING_SIZE, self._col_width() - 6)
            self.c.setFillColor(HexColor('#444444'))
            for i, lw in enumerate(heading_lines):
                if self.y - HEADING_SIZE * 1.35 < self.text_bottom:
                    self._next_col()
                is_last = (i == len(heading_lines) - 1)
                re_ = self._col_right_edge() - 3
                le_ = self._col_left_edge() + 3
                self._just_line(lw, re_, le_, 'David', HEADING_SIZE, is_last)
                self.y -= HEADING_SIZE * 1.35
            self.c.setFillColor(black)
            self.y -= BODY_SIZE * 0.2

    # ── Colophon (book superscription) — SINGLE COLUMN, full width ──
    def _colophon(self, text):
        """Draw colophon as single-column full-width text, then reset to two-column."""
        c = self.c
        lm = self._left_margin()
        rm = self._right_margin()
        full_w = PAGE_W - lm - rm - 6
        re_ = PAGE_W - rm - 3
        le_ = lm + 3

        words = text.split()
        lines = wrap(c, words, 'David', COLOPHON_SIZE, full_w)

        # Check if we have room; if not, go to next page
        needed = len(lines) * (COLOPHON_SIZE * 1.4) + 10
        if self.y - needed < self.text_bottom:
            self._new_page()

        c.setFillColor(HexColor('#333333'))
        for i, lw in enumerate(lines):
            if self.y - COLOPHON_SIZE * 1.4 < self.text_bottom:
                self._draw_furniture()
                c.showPage()
                self.page_num += 1
                self.y = self.text_top
                self.page_verses = []
                lm = self._left_margin()
                rm = self._right_margin()
                full_w = PAGE_W - lm - rm - 6
                re_ = PAGE_W - rm - 3
                le_ = lm + 3
            last = (i == len(lines) - 1)
            self._just_line(lw, re_, le_, 'David', COLOPHON_SIZE, last)
            self.y -= COLOPHON_SIZE * 1.4
        c.setFillColor(black)
        self.y -= BODY_SIZE * 0.3

        # Set column start y so both columns begin below the colophon
        self._col_start_y = self.y
        self.col = 0

    # ── Book title (full width, centered on content area) ──
    def _book_title(self, book):
        """Draw book title centered in content area (between margins)."""
        bh = bidi(BOOK_HEB.get(book, book))

        # If we're mid-column, finish the page and start fresh
        if self.y < self.text_top - LINE_SPACING:
            self._new_page()

        self.y -= BOOK_TITLE_SIZE * 0.5
        # Center between margins, not page center
        lm = self._left_margin()
        rm = self._right_margin()
        cx = lm + (PAGE_W - lm - rm) / 2
        c = self.c
        c.setFont('David-Bold', BOOK_TITLE_SIZE)
        c.drawCentredString(cx, self.y, bh)
        # Single decorative line below title
        c.setStrokeColor(HexColor('#666666'))
        c.setLineWidth(0.8)
        c.line(cx - 45, self.y - 5, cx + 45, self.y - 5)
        c.setStrokeColor(black)
        self.y -= BOOK_TITLE_SIZE * 0.8

    # ── Front matter margin helpers ──
    def _fm_margins(self, fm_page_num):
        """Return (left_margin, right_margin) for a front matter page.
        RTL KDP: odd pages gutter on right, even on left."""
        if fm_page_num % 2 == 1:
            return (OUTSIDE, GUTTER)
        else:
            return (GUTTER, OUTSIDE)

    # ── Front matter (single column, full width, gutter-aware) ──
    def _fm_page(self, header, body):
        """Render a front matter section on its own page(s)."""
        c = self.c
        lm, rm = self._fm_margins(self.fm_page_num)
        fw = PAGE_W - lm - rm
        re_ = PAGE_W - rm
        le_ = lm

        # Section with header + body paragraphs
        y = PAGE_H - 0.85 * inch
        cx = lm + fw / 2
        c.setFont('David-Bold', 15)
        c.drawCentredString(cx, y, bidi(header))
        y -= 8
        c.setStrokeColor(HexColor('#999999'))
        c.setLineWidth(0.4)
        c.line(cx - 40, y, cx + 40, y)
        c.setStrokeColor(black)
        y -= 18

        for para in body.split('\n'):
            para = para.strip()
            if not para:
                y -= BODY_SIZE * 0.4
                continue
            words = para.split()
            if not words:
                continue
            lines = wrap(c, words, 'David', FM_SIZE, fw)
            for j, lw in enumerate(lines):
                if y < MARGIN_BOTTOM:
                    c.showPage()
                    self.fm_page_num += 1
                    lm, rm = self._fm_margins(self.fm_page_num)
                    fw = PAGE_W - lm - rm
                    re_ = PAGE_W - rm
                    le_ = lm
                    y = PAGE_H - 0.65 * inch
                last = (j == len(lines) - 1)
                c.setFont('David', FM_SIZE)
                if last or len(lw) <= 1:
                    c.drawRightString(re_, y, bidi(' '.join(lw)))
                else:
                    bw = [bidi(w) for w in lw]
                    tw = sum(c.stringWidth(b, 'David', FM_SIZE) for b in bw)
                    gap = (fw - tw) / (len(lw) - 1)
                    x = re_
                    for b in bw:
                        ww = c.stringWidth(b, 'David', FM_SIZE)
                        c.drawRightString(x, y, b)
                        x -= ww + gap
                y -= FM_SIZE * 1.45
            y -= 3

    def _fm_toc(self, body):
        """Table of contents page."""
        c = self.c
        lm, rm = self._fm_margins(self.fm_page_num)
        cx = lm + (PAGE_W - lm - rm) / 2

        y = PAGE_H - 0.85 * inch
        c.setFont('David-Bold', 15)
        c.drawCentredString(cx, y, bidi('ראשי דברים'))
        y -= 8
        c.setStrokeColor(HexColor('#999999'))
        c.setLineWidth(0.4)
        c.line(cx - 40, y, cx + 40, y)
        c.setStrokeColor(black)
        y -= 22

        re_ = PAGE_W - rm
        le_ = lm

        for line in body.strip().split('\n'):
            line = line.strip()
            if not line:
                continue
            parts = line.split('\t')
            if len(parts) == 2:
                c.setFont('David', FM_SIZE)
                c.drawRightString(re_, y, bidi(parts[0].strip()))
                c.drawString(le_, y, bidi(parts[1].strip()))
                # Dotted leader
                nw = c.stringWidth(bidi(parts[0].strip()), 'David', FM_SIZE)
                pw = c.stringWidth(bidi(parts[1].strip()), 'David', FM_SIZE)
                c.setFillColor(HexColor('#CCCCCC'))
                dx = le_ + pw + 4
                while dx < re_ - nw - 4:
                    c.circle(dx, y + 3, 0.4, fill=1)
                    dx += 5
                c.setFillColor(black)
            y -= FM_SIZE * 1.5
            if y < MARGIN_BOTTOM:
                c.showPage()
                self.fm_page_num += 1
                lm, rm = self._fm_margins(self.fm_page_num)
                re_ = PAGE_W - rm
                le_ = lm
                y = PAGE_H - 0.65 * inch

    # ── Section title page (D&C or PGP) ──
    def _section_title_page(self, title_heb, subtitle_heb=None):
        """Draw a title page for a new scripture volume (D&C or PGP)."""
        # Start on a new right-hand (odd) page
        self._draw_furniture()
        self.c.showPage()
        self.page_num += 1
        # If we're on an even page, add a blank to get to odd
        if self.page_num % 2 == 0:
            self.c.showPage()
            self.page_num += 1

        cx = PAGE_W / 2
        c = self.c
        c.setFont('David-Bold', 24)
        c.drawCentredString(cx, PAGE_H * 0.55, bidi(title_heb))
        if subtitle_heb:
            c.setFont('David', 13)
            c.drawCentredString(cx, PAGE_H * 0.55 - 30, bidi(subtitle_heb))
        # Decorative lines
        c.setStrokeColor(HexColor('#888888'))
        c.setLineWidth(0.8)
        c.line(cx - 60, PAGE_H * 0.55 + 32, cx + 60, PAGE_H * 0.55 + 32)
        c.line(cx - 50, PAGE_H * 0.55 - 48, cx + 50, PAGE_H * 0.55 - 48)
        c.setStrokeColor(black)

        # Translation info at bottom
        c.setFont('David-Bold', 11)
        c.drawCentredString(cx, 1.6 * inch, bidi('תרגם ללשון המקרא בידי'))
        c.setFont('David', 11)
        c.drawCentredString(cx, 1.6 * inch - 16, bidi('כריס לאמב'))
        c.showPage()
        self.page_num += 1
        # Reset columns for content
        self.col = 0
        self.y = self.text_top
        self.page_verses = []
        self._col_start_y = None

    # ── Chronology table ──
    def _chronology_table(self, chron_data):
        """Draw the D&C chronological order table."""
        c = self.c
        # Start fresh page
        self._draw_furniture()
        c.showPage()
        self.page_num += 1
        self.col = 0
        self.y = self.text_top
        self.page_verses = []
        self._col_start_y = None

        lm = self._left_margin()
        rm = self._right_margin()
        fw = PAGE_W - lm - rm

        # Title
        cx = lm + fw / 2
        c.setFont('David-Bold', 16)
        c.drawCentredString(cx, self.y, bidi('סֵדֶר כְּרוֹנוֹלוֹגִי'))
        self.y -= 8
        c.setStrokeColor(HexColor('#999999'))
        c.setLineWidth(0.4)
        c.line(cx - 40, self.y, cx + 40, self.y)
        c.setStrokeColor(black)
        self.y -= 18

        # Column headers
        re_ = PAGE_W - rm
        le_ = lm
        col_date_w = fw * 0.25
        col_place_w = fw * 0.45
        col_sec_w = fw * 0.30

        c.setFont('David-Bold', 10)
        c.drawRightString(re_, self.y, bidi('תאריך'))
        c.drawRightString(re_ - col_date_w, self.y, bidi('מקום'))
        c.drawRightString(re_ - col_date_w - col_place_w, self.y, bidi('סִימָן'))
        self.y -= 4
        c.setStrokeColor(HexColor('#CCCCCC'))
        c.setLineWidth(0.3)
        c.line(le_, self.y, re_, self.y)
        c.setStrokeColor(black)
        self.y -= 12

        row_h = 13
        for row in chron_data:
            if self.y - row_h < MARGIN_BOTTOM:
                c.showPage()
                self.page_num += 1
                self.page_verses = []
                lm = self._left_margin()
                rm = self._right_margin()
                re_ = PAGE_W - rm
                le_ = lm
                self.y = self.text_top

            c.setFont('David', 9)
            c.drawRightString(re_, self.y, bidi(row['date']))
            c.drawRightString(re_ - col_date_w, self.y, bidi(row['place']))
            c.drawRightString(re_ - col_date_w - col_place_w, self.y, bidi(row['sections']))
            self.y -= row_h

    # ── Intro section (D&C or PGP intro rendered as single-column body text) ──
    def _intro_section(self, verses, title_heb):
        """Render intro verses as body text paragraphs (single column, full width)."""
        c = self.c
        # Start fresh page
        self._draw_furniture()
        c.showPage()
        self.page_num += 1
        self.page_verses = []

        lm = self._left_margin()
        rm = self._right_margin()
        fw = PAGE_W - lm - rm
        re_ = PAGE_W - rm
        le_ = lm

        y = PAGE_H - 0.85 * inch
        cx = lm + fw / 2
        c.setFont('David-Bold', 15)
        c.drawCentredString(cx, y, bidi(title_heb))
        y -= 8
        c.setStrokeColor(HexColor('#999999'))
        c.setLineWidth(0.4)
        c.line(cx - 40, y, cx + 40, y)
        c.setStrokeColor(black)
        y -= 18

        for v in verses:
            hebrew = v['hebrew']
            if not hebrew:
                continue
            words = hebrew.split()
            lines = wrap(c, words, 'David', FM_SIZE, fw)
            for j, lw in enumerate(lines):
                if y < MARGIN_BOTTOM:
                    c.showPage()
                    self.page_num += 1
                    self.page_verses = []
                    lm = self._left_margin()
                    rm = self._right_margin()
                    fw = PAGE_W - lm - rm
                    re_ = PAGE_W - rm
                    le_ = lm
                    y = PAGE_H - 0.65 * inch
                last = (j == len(lines) - 1)
                c.setFont('David', FM_SIZE)
                if last or len(lw) <= 1:
                    c.drawRightString(re_, y, bidi(' '.join(lw)))
                else:
                    bw = [bidi(w) for w in lw]
                    tw = sum(c.stringWidth(b, 'David', FM_SIZE) for b in bw)
                    gap = (fw - tw) / (len(lw) - 1)
                    x = re_
                    for b in bw:
                        ww = c.stringWidth(b, 'David', FM_SIZE)
                        c.drawRightString(x, y, b)
                        x -= ww + gap
                y -= FM_SIZE * 1.45
            y -= 3  # paragraph gap

        # Set up for two-column content after intro
        self.col = 0
        self.y = self.text_top
        self._col_start_y = None

    # ── Main generation ──
    def generate(self):
        verses = load_verses()
        headings = load_headings()
        fm = load_front_matter()
        colophons = load_colophons()
        c = self.c

        # Track front matter page numbering for gutter margins
        self.fm_page_num = 1

        # ═══ TWO BLANK PAGES ═══
        c.showPage()  # page 1 (blank)
        self.fm_page_num += 1
        c.showPage()  # page 2 (blank)
        self.fm_page_num += 1

        # ═══ HALF TITLE PAGE (page 3 - just title) ═══
        c.setFont('David-Bold', 24)
        c.drawCentredString(PAGE_W / 2, PAGE_H * 0.55, bidi('סֵפֶר מוֹרְמוֹן'))
        c.setFont('David', 13)
        c.drawCentredString(PAGE_W / 2, PAGE_H * 0.55 - 30, bidi('עֵדוּת נוֹסֶפֶת לְיֵשׁוּעַ הַמָּשִׁיחַ'))
        c.showPage()
        self.fm_page_num += 1

        # ═══ BLANK PAGE (page 4) ═══
        c.showPage()
        self.fm_page_num += 1

        # ═══ FULL TITLE PAGE (page 5 - title + translation at bottom) ═══
        c.setFont('David-Bold', 24)
        c.drawCentredString(PAGE_W / 2, PAGE_H * 0.55, bidi('סֵפֶר מוֹרְמוֹן'))
        c.setFont('David', 13)
        c.drawCentredString(PAGE_W / 2, PAGE_H * 0.55 - 30, bidi('עֵדוּת נוֹסֶפֶת לְיֵשׁוּעַ הַמָּשִׁיחַ'))
        # Decorative lines
        cx = PAGE_W / 2
        c.setStrokeColor(HexColor('#888888'))
        c.setLineWidth(0.8)
        c.line(cx - 60, PAGE_H * 0.55 + 32, cx + 60, PAGE_H * 0.55 + 32)
        c.line(cx - 50, PAGE_H * 0.55 - 48, cx + 50, PAGE_H * 0.55 - 48)
        c.setStrokeColor(black)

        # Translation info at bottom
        c.setFont('David-Bold', 11)
        c.drawCentredString(PAGE_W / 2, 1.6 * inch, bidi('תרגם ללשון המקרא בידי'))
        c.setFont('David', 11)
        c.drawCentredString(PAGE_W / 2, 1.6 * inch - 16, bidi('כריס לאמב'))
        c.setFont('David', 8)
        c.drawCentredString(PAGE_W / 2, 1.6 * inch - 34, bidi('מהדורה עברית ראשונה  ·  תשפ״ו'))
        c.setFont('David', 7)
        c.drawCentredString(PAGE_W / 2, 1.6 * inch - 48, bidi('כל הזכויות שמורות © תשפ״ו'))
        c.showPage()
        self.fm_page_num += 1

        # ═══ FRONT MATTER SECTIONS (skip first 2 which are title/translator) ═══
        for i, section in enumerate(fm):
            if i <= 1:
                continue  # Already handled in title pages
            header = section.get('header', '')
            body = section.get('body', '')

            if i == 9:
                self._fm_toc(body)
                c.showPage()
                self.fm_page_num += 1
            else:
                self._fm_page(header, body)
                c.showPage()
                self.fm_page_num += 1

        # ═══ BLANK PAGES AFTER TOC — ensure content starts on RIGHT (odd) page ═══
        # In RTL binding, odd PDF pages = right-hand (recto) pages
        c.showPage()
        self.fm_page_num += 1
        # If fm_page_num is now even, we need one more blank to land on odd
        if self.fm_page_num % 2 == 0:
            c.showPage()
            self.fm_page_num += 1

        # ═══ CONTENT PAGES ═══
        self.page_num = 1
        self.col = 0
        self.y = self.text_top

        cur_book = None
        cur_ch = None

        for v in verses:
            book = v['book']
            chapter = v['chapter']
            verse = v['verse']
            hebrew = v['hebrew']

            # New book
            if book != cur_book:
                cur_book = book
                cur_ch = None
                self._book_title(book)
                # Colophon/superscription
                if book in colophons:
                    self._colophon(colophons[book])

            # New chapter
            if chapter != cur_ch:
                cur_ch = chapter
                key = f"{book} {chapter}"
                heading_text = headings.get(key, None)
                self._chapter_with_heading(chapter, heading_text)

            self._verse(verse, hebrew, book, chapter)

        # Final page
        self._draw_furniture()
        c.save()
        print(f"PDF: {self.page_num} content pages")


if __name__ == '__main__':
    out = 'C:/Users/chris/Desktop/Hebrew_BOM_Sefer_Mormon_ONLY.pdf'
    HebrewBOMPdf(out).generate()
    print(f"Output: {out}")
