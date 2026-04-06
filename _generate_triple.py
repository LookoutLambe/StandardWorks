#!/usr/bin/env python3
"""
Hebrew Triple Combination PDF — BOM + D&C + PGP.
ArtScroll-style, KDP 6x9 RTL, two-column justified.
Uses fpdf2 + HarfBuzz for proper nikkud rendering.
Uses cell()/multi_cell() for correct RTL text layout.
"""

import json, re, os, io, unicodedata
from fpdf import FPDF

BASE = 'C:/Users/chris/Desktop/Standard Works Project'
FONT_REG = 'C:/Windows/Fonts/david.ttf'
FONT_BOLD = 'C:/Windows/Fonts/davidbd.ttf'

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

def strip_nikkud(t):
    return ''.join(c for c in t if unicodedata.category(c) != 'Mn')

def clean_heading(t):
    if not t: return t
    t = t.replace('—', ' ').replace('–', ' ')
    t = re.sub(r'[,;:."\'()\[\]]', '', t)
    return re.sub(r'  +', ' ', t).strip()

# ── Book names ──
BOOK_HEB = {
    '1 Nephi':'נֶפִי א','2 Nephi':'נֶפִי ב','Jacob':'יַעֲקֹב',
    'Enos':'אֵנוֹשׁ','Jarom':'יָרוֹם','Omni':'אָמְנִי',
    'Words of Mormon':'דִּבְרֵי מוֹרְמוֹן','Mosiah':'מוֹשִׁיָּה',
    'Alma':'אַלְמָא','Helaman':'הֵילָמָן','3 Nephi':'נֶפִי ג',
    '4 Nephi':'נֶפִי ד','Mormon':'מוֹרְמוֹן','Ether':'אֶתֶר',
    'Moroni':'מוֹרוֹנִי',
    'D&C':'תּוֹרָה וּבְרִיתוֹת','D&C Intro':'מְבוֹא לתו״ב',
    'OD 1':'הַכְרָזָה רִשְׁמִית א','OD 2':'הַכְרָזָה רִשְׁמִית ב',
    'Moses':'מֹשֶׁה','Abraham':'אַבְרָהָם',
    'JS-Matthew':'יוֹסֵף סְמִית — מַתִּתְיָהוּ',
    'JS-History':'יוֹסֵף סְמִית — הִיסְטוֹרְיָה',
    'Articles of Faith':'עִקְרֵי הָאֱמוּנָה',
    'PGP Intro':'מְבוֹא לפמה״ג',
}
BOOK_FILES = {
    '1 Nephi':'1nephi','2 Nephi':'2nephi','Jacob':'jacob',
    'Enos':'enos','Jarom':'jarom','Omni':'omni',
    'Words of Mormon':'words_of_mormon','Mosiah':'mosiah',
    'Alma':'alma','Helaman':'helaman','3 Nephi':'3nephi',
    '4 Nephi':'4nephi','Mormon':'mormon','Ether':'ether','Moroni':'moroni',
}
SINGLE_CH = {'D&C Intro','PGP Intro','OD 1','OD 2','Enos','Jarom','Omni',
             'Words of Mormon','4 Nephi','JS-Matthew','JS-History','Articles of Faith'}

# ── Data loading ──
def load_bom():
    with open(f'{BASE}/bom/official_verses.js','r',encoding='utf-8') as f: t=f.read()
    return json.loads(re.search(r'=\s*(\[.*\])',t,re.DOTALL).group(1))
def load_headings():
    with open(f'{BASE}/bom/chapter_headings_heb.js','r',encoding='utf-8') as f: t=f.read()
    return json.loads(re.search(r'=\s*(\{.*\})',t,re.DOTALL).group(1))
def load_fm():
    with open(f'{BASE}/Hebrew BOM/front_matter.json','r',encoding='utf-8') as f: return json.load(f)
def load_colophons():
    co={}
    for bk,fn in BOOK_FILES.items():
        for d in [f'{BASE}/Hebrew BOM/verses',f'{BASE}/bom/verses']:
            fp=f'{d}/{fn}.js'
            if os.path.exists(fp): break
        else: continue
        with open(fp,'r',encoding='utf-8') as f: t=f.read()
        m=re.search(r'var \w*[Cc]olophon\w*\s*=\s*\[(.*?)\];',t,re.DOTALL)
        if m:
            w=[x for x in re.findall(r'\["([^"]*)",\s*"[^"]*"\]',m.group(1)) if x not in('׃','')]
            if w: co[bk]=' '.join(w)+'׃'; continue
        m2=re.search(r'var \w+_ch1Verses\s*=\s*\[\s*\{\s*num:\s*"([^"]*)",\s*words:\s*\[(.*?)\]\s*\}',t,re.DOTALL)
        if m2 and m2.group(1) in('∗','','0'):
            w=[x for x in re.findall(r'\["([^"]*)",\s*"[^"]*"\]',m2.group(2)) if x not in('׃','')]
            if w: co[bk]=' '.join(w)+'׃'
    return co
def load_dc():
    with open(f'{BASE}/dc_official_verses.json','r',encoding='utf-8') as f: return json.load(f)
def load_chron():
    with open(f'{BASE}/dc_chronology.json','r',encoding='utf-8') as f: return json.load(f)
def load_pgp():
    with open(f'{BASE}/pgp_official_verses.json','r',encoding='utf-8') as f: return json.load(f)

# ── Layout (mm) ──
PW,PH = 152.4, 228.6  # 6x9 inch
GUTTER = 22.225        # 0.875 inch (KDP 701-828pp)
OUTSIDE = 8.89         # 0.35 inch
M_TOP = 10.0
M_BOT = 10.0
GAP = 4.3              # column gap
HDR_Y = 8.0
TXT_Y = 15.0           # content start
LN = 6.2               # line height
V_GAP = 0.8
C_GAP = 1.5


class Triple(FPDF):
    def __init__(self):
        super().__init__(format=(PW, PH))
        self.add_font('David','',FONT_REG)
        self.add_font('David','B',FONT_BOLD)
        self.set_text_shaping(True, direction='rtl')
        self.set_auto_page_break(False)
        self.cpg = 0
        self.aphys = 0
        self.col = 0
        self.pv = []
        self.book_pages = {}
        self._col_start_y = TXT_Y

    def _add_rtl_page(self):
        """Add a page and ensure RTL direction is set."""
        super().add_page()
        from fpdf.enums import TextDirection
        self.text_direction = TextDirection.RTL

    def _lm(self): return OUTSIDE if self.aphys % 2 == 1 else GUTTER
    def _rm(self): return GUTTER if self.aphys % 2 == 1 else OUTSIDE
    def _cw(self): return PW - self._lm() - self._rm()
    def _colw(self): return (self._cw() - GAP) / 2

    def _col_x(self):
        """Left edge x of current column."""
        if self.col == 0:
            return PW - self._rm() - self._colw()
        return self._lm()

    def _col_right(self):
        """Right edge of current column."""
        if self.col == 0:
            return PW - self._rm()
        return self._lm() + self._colw()

    def _col_left(self):
        """Left edge of current column."""
        return self._col_x()

    def _cx(self):
        """Content area center x."""
        return self._lm() + self._cw() / 2

    def _set_col_margins(self):
        """Set page margins to match current column so multi_cell wraps correctly."""
        x = self._col_x()
        self.set_left_margin(x)
        self.set_right_margin(PW - x - self._colw())

    def _set_full_margins(self):
        """Set page margins to full content width."""
        self.set_left_margin(self._lm())
        self.set_right_margin(self._rm())

    # ── Page management ──
    def _hdr(self):
        """Draw header/footer on current page."""
        lm, rm = self._lm(), self._rm()
        # Column divider — full height between header and footer lines
        cx = lm + self._cw() / 2
        dtop = self._col_start_y if self._col_start_y and self._col_start_y > TXT_Y else TXT_Y
        self.set_draw_color(200)
        self.set_line_width(0.15)
        self.line(cx, PH - M_BOT, cx, dtop)
        if self.pv:
            f, l = self.pv[0], self.pv[-1]
            bk = BOOK_HEB.get(f[0], f[0])
            pn = int_to_heb(self.cpg)
            if f[1] == l[1]:
                rng = f"{int_to_heb(f[1])} / {int_to_heb(f[2])}–{int_to_heb(l[2])}"
            else:
                rng = f"{int_to_heb(f[1])}:{int_to_heb(f[2])}–{int_to_heb(l[1])}:{int_to_heb(l[2])}"
            outer = f"{pn} / {bk}"
            hw = PW - lm - rm
            if self.aphys % 2 == 1:
                self.set_xy(lm, HDR_Y - 3)
                self.set_font('David','B',9); self.cell(hw, 4, outer, align='R')
                self.set_xy(lm, HDR_Y - 3)
                self.set_font('David','',9); self.cell(hw, 4, rng, align='L')
            else:
                self.set_xy(lm, HDR_Y - 3)
                self.set_font('David','B',9); self.cell(hw, 4, outer, align='L')
                self.set_xy(lm, HDR_Y - 3)
                self.set_font('David','',9); self.cell(hw, 4, rng, align='R')
            self.set_draw_color(0)
            self.set_line_width(0.12)
            self.line(lm, HDR_Y + 2, PW - rm, HDR_Y + 2)
            self.line(lm, PH - M_BOT, PW - rm, PH - M_BOT)
        self.set_draw_color(0)

    def _newpg(self):
        self._hdr()
        self._add_rtl_page()
        from fpdf.enums import TextDirection
        self.text_direction = TextDirection.RTL
        self.cpg += 1; self.aphys += 1
        self.col = 0; self.pv = []
        self._col_start_y = TXT_Y
        self.set_y(TXT_Y)

    def _nextcol(self):
        if self.col == 0:
            self.col = 1
            # Start left column at same Y as right column started
            # (below colophon if present, otherwise at top)
            self.set_y(self._col_start_y)
        else:
            self._newpg()

    def _room(self, h):
        if self.get_y() + h > PH - M_BOT:
            self._nextcol()

    # ── Manual RTL word wrap + justify ──
    def _wrap_words(self, words, font, style, size, max_w):
        """Word-wrap into lines, returning list of word-lists."""
        self.set_font(font, style, size)
        lines, cur = [], []
        for w in words:
            test_w = self.get_string_width(' '.join(cur + [w]))
            if test_w > max_w and cur:
                lines.append(cur)
                cur = [w]
            else:
                cur.append(w)
        if cur:
            lines.append(cur)
        return lines

    def _draw_rtl_just(self, words, right_x, left_x, font, style, size, is_last):
        """Draw a single line of Hebrew words, justified RTL."""
        self.set_font(font, style, size)
        avail = right_x - left_x
        if is_last or len(words) <= 1:
            # Last line or single word: right-align
            txt = ' '.join(words)
            w = self.get_string_width(txt)
            self.set_xy(right_x - w, self.get_y())
            self.cell(w, LN, txt)
        else:
            # Justify: spread words across the line
            widths = [self.get_string_width(w) for w in words]
            total_w = sum(widths)
            gap = (avail - total_w) / (len(words) - 1)
            x = right_x
            for i, word in enumerate(words):
                x -= widths[i]
                self.set_xy(x, self.get_y())
                self.cell(widths[i], LN, word)
                x -= gap

    def _draw_rtl_block(self, text, right_x, left_x, font, style, size):
        """Draw a block of RTL justified text. Returns final y."""
        words = text.split()
        lines = self._wrap_words(words, font, style, size, right_x - left_x)
        for i, lw in enumerate(lines):
            if self.get_y() + LN > PH - M_BOT:
                self._nextcol()
                right_x = self._col_right()
                left_x = self._col_left()
            self._draw_rtl_just(lw, right_x, left_x, font, style, size, i == len(lines) - 1)
            self.set_y(self.get_y() + LN)

    # ── Verse ──
    def _verse(self, vnum, heb, book, ch):
        vl = int_to_heb(vnum)
        full = f"{vl}  {heb}"
        # Just ensure room for at least one line
        if self.get_y() + LN > PH - M_BOT:
            self._nextcol()
        self.pv.append((book, ch, vnum))
        r = self._col_right()
        l = self._col_left()
        self._draw_rtl_block(full, r, l, 'David', '', 13)
        self.set_y(self.get_y() + V_GAP)

    # ── Chapter ──
    def _chapter(self, ch, heading=None, label='פרק'):
        # Need room for chapter title + heading + at least 3 lines of verse
        min_needed = C_GAP + 8 + LN * 3
        if heading:
            self.set_font('David','',11)
            hw = self.get_string_width(heading)
            hlines = max(1, int(hw / (self._colw() * 0.85)) + 1)
            min_needed += hlines * 11 * 0.48 + 1
        if self.get_y() + min_needed > PH - M_BOT:
            self._nextcol()
        self.set_y(self.get_y() + C_GAP)
        # Centered chapter title
        title = f"{label} {int_to_heb(ch)}"
        self.set_font('David','B',14)
        tw = self.get_string_width(title)
        cx = self._col_x() + self._colw() / 2
        self.set_xy(cx - tw / 2, self.get_y())
        self.cell(tw, 6, title)
        self.set_y(self.get_y() + 7)
        if heading:
            self.set_text_color(68,68,68)
            r = self._col_right()
            l = self._col_left()
            self._draw_rtl_block(heading, r, l, 'David', '', 11)
            self.set_text_color(0)
            self.set_y(self.get_y() + 0.5)

    # ── Book title (always starts new page, full width) ──
    def _booktitle(self, book):
        title = strip_nikkud(BOOK_HEB.get(book, book))
        # Always push to a new page for a new book
        if self.get_y() > TXT_Y + 1:
            self._newpg()
        self.book_pages[book] = self.cpg
        self.set_y(self.get_y() + 2)
        self.set_font('David','B',18)
        tw = self.get_string_width(title)
        cx = self._lm() + self._cw() / 2
        self.set_xy(cx - tw / 2, self.get_y())
        self.cell(tw, 8, title)
        self.set_y(self.get_y() + 10)

    # ── Colophon (full width, page break if overflow, then two columns below) ──
    def _colophon(self, text):
        self.set_text_color(51,51,51)
        r = PW - self._rm() - 1
        l = self._lm() + 1
        # Render full-width with page breaks (not column switches)
        words = text.split()
        lh = 10 * 0.48
        lines = self._wrap_words(words, 'David', '', 10, r - l)
        for i, lw in enumerate(lines):
            if self.get_y() + lh > PH - M_BOT:
                self._newpg()
                r = PW - self._rm() - 1
                l = self._lm() + 1
            self._draw_rtl_just(lw, r, l, 'David', '', 10, i == len(lines) - 1)
            self.set_y(self.get_y() + lh)
        self.set_text_color(0)
        self.set_y(self.get_y() + 1)
        # Both columns start below the colophon
        self._col_start_y = self.get_y()
        self.col = 0

    # ── Volume divider ──
    def _divider(self, title, key=None):
        if self.get_y() > TXT_Y + LN * 3:
            self._newpg()
        if key: self.book_pages[key] = self.cpg
        cx = self._cx()
        y = self.get_y() + 3
        self.set_draw_color(136)
        self.set_line_width(0.2)
        self.line(cx - 25, y, cx + 25, y)
        y += 3
        lm = self._lm()
        self.set_font('David','B',22)
        self.set_xy(lm, y)
        self.cell(self._cw(), 10, title, align='C', new_x='LEFT', new_y='NEXT')
        y = self.get_y()
        self.line(cx - 18, y, cx + 18, y)
        self.set_draw_color(0)
        self.set_y(y + 3)
        self._col_start_y = self.get_y()
        self.col = 0

    # ── Chronological table ──
    def _chron(self, data):
        self._newpg()
        lm = self._lm()
        fw = self._cw()
        self.set_font('David','B',16)
        self.set_xy(lm, self.get_y())
        self.cell(fw, 8, 'סדר כרונולוגי', align='C', new_x='LEFT', new_y='NEXT')
        self.set_y(self.get_y() + 1)
        cx = self._cx()
        self.set_draw_color(153)
        self.line(cx-14, self.get_y(), cx+14, self.get_y())
        self.set_draw_color(0)
        self.set_y(self.get_y() + 4)
        # Header row
        self.set_font('David','B',10)
        y = self.get_y()
        r = PW - self._rm()
        cd, cp = fw*0.25, fw*0.45
        self.set_xy(r - cd, y); self.cell(cd, 5, 'תאריך', align='R')
        self.set_xy(r - cd - cp, y); self.cell(cp, 5, 'מקום', align='R')
        self.set_xy(lm, y); self.cell(fw - cd - cp, 5, 'סימן', align='R')
        self.set_y(y + 6)
        self.set_draw_color(200); self.line(lm, self.get_y(), r, self.get_y()); self.set_draw_color(0)
        self.set_y(self.get_y() + 2)
        self.set_font('David','',9)
        for row in data:
            if self.get_y() + 5 > PH - M_BOT:
                self._hdr(); self._add_rtl_page(); self.cpg += 1; self.aphys += 1; self.pv = []
                self.set_y(TXT_Y)
                lm = self._lm(); r = PW - self._rm()
            y = self.get_y()
            self.set_xy(r - cd, y); self.cell(cd, 4.5, row['date'], align='R')
            self.set_xy(r - cd - cp, y); self.cell(cp, 4.5, row['place'], align='R')
            self.set_xy(lm, y); self.cell(fw - cd - cp, 4.5, row['sections'], align='R')
            self.set_y(y + 4.5)
        self.set_y(self.get_y() + 2)

    # ── Front matter ──
    def _fm_margins(self, p):
        return (OUTSIDE, GUTTER) if p % 2 == 1 else (GUTTER, OUTSIDE)

    def _draw_fm_block(self, text, r, l, font, style, size, fp):
        """Draw RTL justified text for front matter (page breaks, no columns)."""
        words = text.split()
        lh = size * 0.48
        lines = self._wrap_words(words, font, style, size, r - l)
        for i, lw in enumerate(lines):
            if self.get_y() + lh > PH - M_BOT:
                self._add_rtl_page(); fp += 1
                lm, rm = self._fm_margins(fp)
                r = PW - rm; l = lm
                self.set_y(15)
            self._draw_rtl_just(lw, r, l, font, style, size, i == len(lines) - 1)
            self.set_y(self.get_y() + lh)
        return fp

    def _fmpage(self, header, body, fp):
        lm, rm = self._fm_margins(fp)
        fw = PW - lm - rm
        r = PW - rm
        # Header centered
        self.set_font('David','B',15)
        tw = self.get_string_width(strip_nikkud(header))
        cx = lm + fw / 2
        self.set_xy(cx - tw / 2, 20)
        self.cell(tw, 6, strip_nikkud(header))
        self.set_y(27)
        self.set_draw_color(153); self.line(cx-14, 27, cx+14, 27); self.set_draw_color(0)
        self.set_y(31)
        # Body paragraphs — manual RTL justify, single column
        for para in body.split('\n'):
            para = para.strip()
            if not para:
                self.set_y(self.get_y() + 2)
                continue
            if not para.split():
                continue
            fp = self._draw_fm_block(para, r, lm, 'David', '', 12, fp)
            self.set_y(self.get_y() + 0.5)
        return fp

    def _fmtoc(self, body, fp):
        lm, rm = self._fm_margins(fp)
        fw = PW - lm - rm
        r = PW - rm
        self.set_font('David','B',15)
        self.set_xy(lm, 20)
        self.cell(fw, 6, 'ראשי דברים', align='C', new_x='LEFT', new_y='NEXT')
        y = self.get_y() + 1
        cx = lm + fw / 2
        self.set_draw_color(153); self.line(cx-14, y, cx+14, y); self.set_draw_color(0)
        self.set_y(y + 5)
        self.set_font('David','',12)
        for line in body.strip().split('\n'):
            line = line.strip()
            if not line: continue
            parts = line.split('\t')
            if len(parts) == 2:
                y = self.get_y()
                self.set_xy(lm, y); self.cell(fw, 6, parts[0].strip(), align='R')
                self.set_xy(lm, y); self.cell(fw, 6, parts[1].strip(), align='L')
                self.set_y(y + 7)
            if self.get_y() + 7 > PH - M_BOT:
                self._add_rtl_page(); fp += 1
                lm, rm = self._fm_margins(fp)
                fw = PW - lm - rm
                self.set_y(15)
        return fp

    # ── Content ──
    def _content(self, bom, hdg, col, dc, pgp, chron=None):
        cur_bk = cur_ch = None
        for v in bom:
            bk, ch, vs, hb = v['book'], v['chapter'], v['verse'], v['hebrew']
            if bk != cur_bk:
                cur_bk = bk; cur_ch = None
                self._booktitle(bk)
                if bk in col: self._colophon(col[bk])
            if ch != cur_ch:
                cur_ch = ch
                h = clean_heading(hdg.get(f"{bk} {ch}"))
                if bk in SINGLE_CH and ch == 1: pass
                else: self._chapter(ch, h)
            self._verse(vs, hb, bk, ch)
        bpg = self.cpg; print(f"BOM: {bpg} pages")

        self._divider('תורה ובריתות', key='D&C')
        if chron: self._chron(chron)
        cur_bk = cur_ch = None
        for v in dc:
            bk, ch, vs, hb = v['book'], v['chapter'], v['verse'], v['hebrew']
            if bk != cur_bk:
                cur_bk = bk; cur_ch = None
                if bk != 'D&C': self._booktitle(bk)
            if ch != cur_ch:
                cur_ch = ch
                if bk == 'D&C': self._chapter(ch, label='סִימָן')
                elif bk not in SINGLE_CH: self._chapter(ch)
            self._verse(vs, hb, bk, ch)
        dpg = self.cpg - bpg; print(f"D&C: {dpg} pages (total: {self.cpg})")

        self._divider('פנינת המחיר הגדול', key='PGP')
        cur_bk = cur_ch = None
        for v in pgp:
            bk, ch, vs, hb = v['book'], v['chapter'], v['verse'], v['hebrew']
            if bk != cur_bk:
                cur_bk = bk; cur_ch = None
                self._booktitle(bk)
            if ch != cur_ch:
                cur_ch = ch
                if bk not in SINGLE_CH: self._chapter(ch)
            self._verse(vs, hb, bk, ch)
        ppg = self.cpg - bpg - dpg; print(f"PGP: {ppg} pages")
        self._hdr()

    def _toc_body(self):
        entries = [('נפי א׳','1 Nephi'),('נפי ב׳','2 Nephi'),('יעקב','Jacob'),
                   ('אנוש','Enos'),('ירום','Jarom'),('עמני','Omni'),
                   ('דברי מורמון','Words of Mormon'),('מושיה','Mosiah'),
                   ('אלמא','Alma'),('הילמן','Helaman'),('נפי ג׳','3 Nephi'),
                   ('נפי ד׳','4 Nephi'),('מורמון','Mormon'),('אתר','Ether'),
                   ('מורוני','Moroni')]
        return '\n'.join(f"{h}\t{int_to_heb(self.book_pages.get(k,0))}" for h,k in entries if self.book_pages.get(k,0) > 0)

    def generate(self):
        bom, hdg, fm, col = load_bom(), load_headings(), load_fm(), load_colophons()
        dc, chron, pgp = load_dc(), load_chron(), load_pgp()

        # Pass 1: dry run for TOC page numbers
        print("Pass 1: page numbers...")
        dry = Triple()
        dry._add_rtl_page(); dry.cpg = 1; dry.aphys = 1
        dry.set_y(TXT_Y)
        dry._content(bom, hdg, col, dc, pgp, chron)
        toc = dry._toc_body()

        # Pass 2: real render
        print("Pass 2: rendering...")
        fp = 0
        self._add_rtl_page(); fp += 1  # pg 1 RIGHT - blank
        self._add_rtl_page(); fp += 1  # pg 2 LEFT - blank
        self._add_rtl_page(); fp += 1  # pg 3 RIGHT - half title
        self.set_font('David','B',24)
        self.set_xy(0, PH*0.35); self.cell(PW, 10, 'כתבי הקדש', align='C')
        self.set_font('David','',13)
        self.set_xy(0, PH*0.35+12); self.cell(PW, 8, 'ספר מורמון · תורה ובריתות · פנינת המחיר הגדול', align='C')
        self._add_rtl_page(); fp += 1  # pg 4 LEFT - blank
        self._add_rtl_page(); fp += 1  # pg 5 RIGHT - full title
        self.set_font('David','B',24)
        self.set_xy(0, PH*0.35); self.cell(PW, 10, 'כתבי הקדש', align='C')
        self.set_font('David','',13)
        self.set_xy(0, PH*0.35+12); self.cell(PW, 8, 'ספר מורמון · תורה ובריתות · פנינת המחיר הגדול', align='C')
        cx = PW/2
        self.set_draw_color(136); self.set_line_width(0.25)
        self.line(cx-28, PH*0.35-8, cx+28, PH*0.35-8)
        self.line(cx-22, PH*0.35+22, cx+22, PH*0.35+22)
        self.set_draw_color(0)
        self.set_font('David','B',11); self.set_xy(0, PH-42); self.cell(PW, 5, 'תרגם ללשון המקרא בידי', align='C')
        self.set_font('David','',11); self.set_xy(0, PH-37); self.cell(PW, 5, 'כריס לאמב', align='C')
        self.set_font('David','',8); self.set_xy(0, PH-30); self.cell(PW, 4, 'מהדורה עברית ראשונה  ·  תשפ״ו', align='C')
        self.set_font('David','',7); self.set_xy(0, PH-26); self.cell(PW, 4, 'כל הזכויות שמורות © תשפ״ו', align='C')

        # Front matter sections
        for i, sec in enumerate(fm):
            if i <= 1 or i == 9: continue
            self._add_rtl_page(); fp += 1
            fp = self._fmpage(sec.get('header',''), sec.get('body',''), fp)

        # TOC
        self._add_rtl_page(); fp += 1
        fp = self._fmtoc(toc, fp)

        # Ensure content on RIGHT (odd) page
        if fp % 2 == 1:
            self._add_rtl_page(); fp += 1

        # Content
        self.cpg = 1; self.aphys = fp + 1
        self.col = 0; self.pv = []; self.book_pages = {}
        self._add_rtl_page(); self.aphys = fp + 1
        self.set_y(TXT_Y)
        self._content(bom, hdg, col, dc, pgp, chron)
        print(f"Total: {self.cpg} content pages")


if __name__ == '__main__':
    out = 'C:/Users/chris/Desktop/Hebrew_Triple_v2.pdf'
    pdf = Triple()
    pdf.generate()
    pdf.output(out)
    print(f"Output: {out}")
