#!/usr/bin/env python3
"""
Dual Hebrew-English Book of Mormon PDF — fpdf2 + HarfBuzz for correct nikkud.
- 7x10 inch (177.8 x 254mm)
- Right column: Hebrew (RTL, David font, HarfBuzz shaped)
- Left column: English (LTR, David font)
- Artscroll-style headers with verse ranges
- Manual RTL justification via cell()
- Front matter from dual DOCX data
- Two-pass for correct TOC page numbers
"""

import json, re, os, unicodedata
from fpdf import FPDF
from fpdf.enums import TextDirection

BASE = 'C:/Users/chris/Desktop/Standard Works Project'

# ── Hebrew numerals ──
H1 = ['','א','ב','ג','ד','ה','ו','ז','ח','ט']
H10 = ['','י','כ','ל','מ','נ','ס','ע','פ','צ']
H100 = ['','ק','ר','ש','ת']
def heb(n):
    if n <= 0: return str(n)
    if n >= 1000: return H1[n//1000]+"׳"+(heb(n%1000) if n%1000 else '')
    r=''
    h=n//100
    while h > 0:
        if h <= 4: r += H100[h]; h = 0
        else: r += 'ת'; h -= 4
    n %= 100
    if n==15: return r+'טו'
    if n==16: return r+'טז'
    if n>=10: r+=H10[n//10]; n%=10
    if n>0: r+=H1[n]
    return r

def no_nikkud(t): return ''.join(c for c in t if unicodedata.category(c) != 'Mn')

BK = {
    '1 Nephi':'נֶפִי א','2 Nephi':'נֶפִי ב','Jacob':'יַעֲקֹב','Enos':'אֵנוֹשׁ',
    'Jarom':'יָרוֹם','Omni':'אָמְנִי','Words of Mormon':'דִּבְרֵי מוֹרְמוֹן',
    'Mosiah':'מוֹשִׁיָּה','Alma':'אַלְמָא','Helaman':'הֵילָמָן',
    '3 Nephi':'נֶפִי ג','4 Nephi':'נֶפִי ד','Mormon':'מוֹרְמוֹן',
    'Ether':'אֶתֶר','Moroni':'מוֹרוֹנִי',
}
BKF = {
    '1 Nephi':'1nephi','2 Nephi':'2nephi','Jacob':'jacob','Enos':'enos',
    'Jarom':'jarom','Omni':'omni','Words of Mormon':'words_of_mormon',
    'Mosiah':'mosiah','Alma':'alma','Helaman':'helaman','3 Nephi':'3nephi',
    '4 Nephi':'4nephi','Mormon':'mormon','Ether':'ether','Moroni':'moroni',
}

# ── Data loading ──
def ld_verses():
    with open(f'{BASE}/bom/official_verses.js','r',encoding='utf-8') as f:
        return json.loads(re.search(r'=\s*(\[.*\])',f.read(),re.DOTALL).group(1))

def ld_hdg_heb():
    with open(f'{BASE}/bom/chapter_headings_heb.js','r',encoding='utf-8') as f:
        return json.loads(re.search(r'=\s*(\{.*\})',f.read(),re.DOTALL).group(1))

def ld_hdg_en():
    with open(f'{BASE}/bom/chapter_headings.js','r',encoding='utf-8') as f:
        return json.loads(re.search(r'=\s*(\{.*\})',f.read(),re.DOTALL).group(1))

def ld_fm():
    with open(f'{BASE}/_dual_fm_data.json','r',encoding='utf-8') as f:
        return json.load(f)

def ld_fm_json():
    with open(f'{BASE}/Hebrew BOM/front_matter.json','r',encoding='utf-8') as f:
        return json.load(f)

def ld_col():
    co = {}
    for bk, fn in BKF.items():
        fp = f'{BASE}/bom/verses/{fn}.js'
        if not os.path.exists(fp): continue
        with open(fp,'r',encoding='utf-8') as f: t = f.read()
        m = re.search(r'var \w*[Cc]olophon\w*\s*=\s*\[(.*?)\];',t,re.DOTALL)
        if m:
            w = [x for x in re.findall(r'\["([^"]*)",\s*"[^"]*"\]',m.group(1)) if x not in ('׃','')]
            if w: co[bk] = ' '.join(w) + '׃'
    return co

COLOPHON_EN = {
    '1 Nephi': 'An account of Lehi and his wife Sariah, and his four sons, being called, (beginning at the eldest) Laman, Lemuel, Sam, and Nephi. The Lord warns Lehi to depart out of the land of Jerusalem, because he prophesieth unto the people concerning their iniquity and they seek to destroy his life. He taketh three days\u2019 journey into the wilderness with his family. Nephi taketh his brethren and returneth to the land of Jerusalem after the record of the Jews. The account of their sufferings. They take the daughters of Ishmael to wife. They take their families and depart into the wilderness. Their sufferings and afflictions in the wilderness. The course of their travels. They come to the large waters. Nephi\u2019s brethren rebel against him. He confoundeth them, and buildeth a ship. They call the name of the place Bountiful. They cross the large waters into the promised land, and so forth. This is according to the account of Nephi; or in other words, I, Nephi, wrote this record.',
    '2 Nephi': 'An account of the death of Lehi. Nephi\u2019s brethren rebel against him. The Lord warns Nephi to depart into the wilderness. His journeyings in the wilderness, and so forth.',
    'Jacob': 'The words of his preaching unto his brethren. He confoundeth a man who seeketh to overthrow the doctrine of Christ. A few words concerning the history of the people of Nephi.',
}

# ── Layout (mm) — 7x10 inch = 177.8 x 254mm ──
PW = 177.8
PH = 254.0
GUT = 22.225  # 0.875 inch
OUT = 12.7    # 0.5 inch (increased from 0.4)
MT = 11
MB = 11
COL_GAP = 5   # gap between Hebrew and English columns

HEB_RATIO = 0.45
EN_RATIO = 0.55

HY = 10       # header y
TY = 18       # text starts
BOT = PH - MB

# Font sizes
HEB_SZ = 12
EN_SZ = 10
HDR_SZ = 9
CHAP_SZ = 14
HDG_SZ = 10
TITLE_SZ = 20

# Line heights
HEB_LH = HEB_SZ * 0.42
EN_LH = EN_SZ * 0.42
CHAP_GAP = 3


class DualDoc(FPDF):
    def __init__(self):
        super().__init__(format=(PW, PH))
        self.add_font('D', '', 'C:/Windows/Fonts/david.ttf')
        self.add_font('D', 'B', 'C:/Windows/Fonts/davidbd.ttf')
        self.set_text_shaping(True, direction='rtl')
        self.set_auto_page_break(False)
        self.cpg = 0       # content page number
        self.apg = 0       # absolute/physical page number
        self.pv = []        # page verses for header
        self.bkp = {}       # book -> page number
        self.is_fm = True   # front matter mode

    def pg_add(self):
        super().add_page()
        self.text_direction = TextDirection.RTL

    # Margins (RTL binding)
    def lm(self): return OUT if self.apg % 2 == 1 else GUT
    def rm(self): return GUT if self.apg % 2 == 1 else OUT
    def cw(self): return PW - self.lm() - self.rm()

    # Column edges
    def heb_w(self): return (self.cw() - COL_GAP) * HEB_RATIO
    def en_w(self): return (self.cw() - COL_GAP) * EN_RATIO
    def heb_r(self): return PW - self.rm()
    def heb_l(self): return PW - self.rm() - self.heb_w()
    def en_l(self): return self.lm()
    def en_r(self): return self.lm() + self.en_w()

    # ── Header/footer ──
    def draw_hf(self):
        if self.is_fm or not self.pv:
            return
        lm, rm = self.lm(), self.rm()
        f, l = self.pv[0], self.pv[-1]
        bh = BK.get(f[0], f[0])
        be = f[0]
        pn = heb(self.cpg)

        # Header line
        self.set_draw_color(150)
        self.set_line_width(0.15)
        self.line(lm, HY + 3, PW - rm, HY + 3)

        # Hebrew side: page/book on right
        outer = f"{pn} / {bh}"
        self.set_font('D', '', HDR_SZ)
        ow = self.get_string_width(outer)
        self.set_xy(PW - rm - ow, HY - 2)
        self.cell(ow, 4, outer)

        # Verse range near Hebrew
        if f[1] == l[1]:
            vr = f"{heb(f[1])} / {heb(f[2])}\u2013{heb(l[2])}"
        else:
            vr = f"{heb(f[1])}:{heb(f[2])}\u2013{heb(l[1])}:{heb(l[2])}"
        self.set_font('D', '', HDR_SZ)
        self.set_xy(self.heb_l(), HY - 2)
        self.cell(self.heb_w(), 4, vr, align='L')

        # English side: page/book on left, verse range on right
        self.ltr_mode()
        en_hdr = f"{self.cpg} / {be}"
        self.set_font('D', '', HDR_SZ)
        self.set_xy(lm, HY - 2)
        self.cell(self.en_w() / 2, 4, en_hdr, align='L')

        # English verse range — right side of English column
        if f[1] == l[1]:
            en_vr = f"{f[1]}:{f[2]}-{l[2]}"
        else:
            en_vr = f"{f[1]}:{f[2]}-{l[1]}:{l[2]}"
        vr_w = self.get_string_width(en_vr)
        self.set_xy(self.en_r() - vr_w, HY - 2)
        self.cell(vr_w, 4, en_vr)
        self.rtl_mode()

        # Footer line + page numbers
        self.line(lm, BOT, PW - rm, BOT)
        self.set_font('D', '', HDR_SZ)
        # Hebrew page far right
        pw2 = self.get_string_width(pn)
        self.set_xy(PW - rm - pw2, BOT + 1)
        self.cell(pw2, 4, pn)
        # English page far left
        self.ltr_mode()
        ep = str(self.cpg)
        self.set_font('D', '', HDR_SZ)
        self.set_xy(lm, BOT + 1)
        self.cell(20, 4, ep, align='L')
        self.rtl_mode()

        self.set_draw_color(0)

    # ── Page management ──
    def new_pg(self):
        if self.apg > 0:
            self.draw_hf()
        self.pg_add()
        self.apg += 1
        if not self.is_fm:
            self.cpg += 1
        self.pv = []
        self.hy = TY
        self.ey = TY

    def fm_pg(self):
        """Front matter page — no headers."""
        if self.apg > 0:
            self.pg_add()
        else:
            self.pg_add()
        self.apg += 1

    # ── Direction switching ──
    def ltr_mode(self):
        self.set_text_shaping(True, direction='ltr')
        self.text_direction = TextDirection.LTR

    def rtl_mode(self):
        self.set_text_shaping(True, direction='rtl')
        self.text_direction = TextDirection.RTL

    # ── Text wrapping ──
    def wrap_heb(self, words, w):
        """Wrap Hebrew words to fit width w, breaking at maqqef.
        Maqqef-connected words stay glued (no space) when on same line."""
        MAQQEF = '\u05BE'
        # Build token list with glue flags
        # Each token is (text, glue_to_next) where glue=True means no space after
        tokens = []
        for wd in words:
            if MAQQEF in wd:
                parts = wd.split(MAQQEF)
                for i, p in enumerate(parts):
                    if i < len(parts) - 1:
                        tokens.append((p + MAQQEF, True))  # glued to next
                    else:
                        tokens.append((p, False))
            else:
                tokens.append((wd, False))

        self.set_font('D', '', HEB_SZ)
        lines, cur = [], []
        for tok_text, glue in tokens:
            # Build test string respecting glue
            test_parts = [t for t, _ in cur] + [tok_text]
            # Join with spaces only where not glued
            test_str = ''
            all_items = list(cur) + [(tok_text, glue)]
            for j, (t, g) in enumerate(all_items):
                if j > 0 and not cur[j-1][1]:  # previous was not glued
                    test_str += ' '
                test_str += t

            if self.get_string_width(test_str) > w and cur:
                # Build the line string from cur, respecting glue
                lines.append(cur)
                cur = [(tok_text, glue)]
            else:
                cur.append((tok_text, glue))
        if cur: lines.append(cur)

        # Convert back to word lists, merging glued tokens
        result = []
        for line_tokens in lines:
            merged = []
            buf = ''
            for t, g in line_tokens:
                buf += t
                if not g:
                    merged.append(buf)
                    buf = ''
            if buf:
                merged.append(buf)
            result.append(merged)
        return result

    def wrap_en(self, words, w):
        self.set_text_shaping(True, direction='ltr')
        self.set_font('D', '', EN_SZ)
        lines, cur = [], []
        for wd in words:
            if self.get_string_width(' '.join(cur + [wd])) > w and cur:
                lines.append(cur)
                cur = [wd]
            else:
                cur.append(wd)
        if cur: lines.append(cur)
        self.set_text_shaping(True, direction='rtl')
        return lines

    # ── RTL Hebrew line (justified) ──
    def heb_line(self, words, y, is_last, bold_first=False):
        r = self.heb_r()
        l = self.heb_l()
        avail = r - l

        # Measure words
        ws = []
        for j, wd in enumerate(words):
            self.set_font('D', 'B' if (bold_first and j == 0) else '', HEB_SZ)
            ws.append(self.get_string_width(wd))
        total = sum(ws)

        if is_last or len(words) <= 1:
            x = r
            for j, wd in enumerate(words):
                self.set_font('D', 'B' if (bold_first and j == 0) else '', HEB_SZ)
                if j > 0:
                    self.set_font('D', '', HEB_SZ)
                    x -= self.get_string_width(' ')
                x -= ws[j]
                self.set_xy(x, y)
                self.cell(ws[j], HEB_LH, wd)
        else:
            gap = (avail - total) / (len(words) - 1) if len(words) > 1 else 0
            x = r
            for j, wd in enumerate(words):
                self.set_font('D', 'B' if (bold_first and j == 0) else '', HEB_SZ)
                x -= ws[j]
                self.set_xy(x, y)
                self.cell(ws[j], HEB_LH, wd)
                x -= gap

    # ── LTR English line (justified) ──
    def en_line(self, words, y, is_last, bold_first=False):
        # Switch to LTR for English text
        self.ltr_mode()

        l = self.en_l()
        avail = self.en_w()

        ws = []
        for j, wd in enumerate(words):
            self.set_font('D', 'B' if (bold_first and j == 0) else '', EN_SZ)
            ws.append(self.get_string_width(wd))
        total = sum(ws)

        if is_last or len(words) <= 1:
            # Left-align
            x = l
            for j, wd in enumerate(words):
                self.set_font('D', 'B' if (bold_first and j == 0) else '', EN_SZ)
                self.set_xy(x, y)
                self.cell(ws[j], EN_LH, wd)
                x += ws[j] + self.get_string_width(' ')
        else:
            gap = (avail - total) / (len(words) - 1) if len(words) > 1 else 0
            x = l
            for j, wd in enumerate(words):
                self.set_font('D', 'B' if (bold_first and j == 0) else '', EN_SZ)
                self.set_xy(x, y)
                self.cell(ws[j], EN_LH, wd)
                x += ws[j] + gap

        # Switch back to RTL for Hebrew
        self.set_text_shaping(True, direction='rtl')
        self.text_direction = TextDirection.RTL

    # ── Render verse ──
    def render_verse(self, vnum, heb_text, en_text, book, ch):
        heb_vn = f"{heb(vnum)}."
        en_vn = f"{vnum}."

        heb_words = [heb_vn] + heb_text.split()
        en_words = [en_vn] + en_text.split()

        heb_lines = self.wrap_heb(heb_words, self.heb_w())
        en_lines = self.wrap_en(en_words, self.en_w())

        # Sync y
        y = max(self.hy, self.ey)
        min_lh = max(HEB_LH, EN_LH)

        if y + min_lh > BOT:
            self.new_pg()
            y = TY

        hi, ei = 0, 0
        hy, ey = y, y

        while hi < len(heb_lines) or ei < len(en_lines):
            check = max(hy, ey)
            if check + min_lh > BOT:
                self.new_pg()
                hy = TY
                ey = TY
                self.pv.append((book, ch, vnum))

            if hi < len(heb_lines):
                is_last = (hi == len(heb_lines) - 1)
                self.heb_line(heb_lines[hi], hy, is_last, bold_first=(hi == 0))
                hy += HEB_LH
                hi += 1

            if ei < len(en_lines):
                is_last = (ei == len(en_lines) - 1)
                self.en_line(en_lines[ei], ey, is_last, bold_first=(ei == 0))
                ey += EN_LH
                ei += 1

        self.hy = max(hy, ey) + 0.5
        self.ey = self.hy

        if not self.pv or self.pv[-1] != (book, ch, vnum):
            self.pv.append((book, ch, vnum))

    # ── Chapter heading ──
    def chapter_heading(self, ch, hdg_heb, hdg_en):
        y = max(self.hy, self.ey)
        # Need room for: gap + chapter title + heading summary + at least 2 verse lines
        min_needed = CHAP_GAP + 8 + HEB_LH * 4
        if y + min_needed > BOT:
            self.new_pg()
            y = TY

        y += CHAP_GAP

        # Chapter title centered over each column
        chap_heb = f"פֶּרֶק {heb(ch)}"
        chap_en = f"Chapter {ch}"

        self.set_font('D', 'B', CHAP_SZ)
        tw = self.get_string_width(chap_heb)
        cx = self.heb_l() + self.heb_w() / 2
        self.set_xy(cx - tw / 2, y)
        self.cell(tw, 6, chap_heb)

        self.ltr_mode()
        self.set_font('D', 'B', CHAP_SZ)
        tw2 = self.get_string_width(chap_en)
        cx2 = self.en_l() + self.en_w() / 2
        self.set_xy(cx2 - tw2 / 2, y)
        self.cell(tw2, 6, chap_en)
        self.rtl_mode()

        y += 8

        # Chapter summary — Hebrew right, English left, justified
        if hdg_heb:
            hdg_heb = hdg_heb.replace('\u2014', ',').replace('\u2013', ',')
            hlines = self.wrap_heb(hdg_heb.split(), self.heb_w())
            for i, lw in enumerate(hlines):
                if y + HEB_LH > BOT:
                    self.new_pg()
                    y = TY
                self.heb_line(lw, y, i == len(hlines) - 1)
                y += HEB_LH * 0.9

        ey = max(self.hy, self.ey)
        if ey < y:
            ey = max(self.hy, self.ey) + CHAP_GAP + 8

        if hdg_en:
            elines = self.wrap_en(hdg_en.split(), self.en_w())
            ey2 = max(self.hy, self.ey) + CHAP_GAP + 8
            for i, lw in enumerate(elines):
                if ey2 + EN_LH > BOT:
                    self.new_pg()
                    ey2 = TY
                self.en_line(lw, ey2, i == len(elines) - 1)
                ey2 += EN_LH * 0.9
            y = max(y, ey2)

        y += 2
        self.hy = y
        self.ey = y

    # ── Book title ──
    def book_title(self, book):
        self.new_pg()
        self.bkp[book] = self.cpg

        y = TY + 2
        bh = BK.get(book, book)
        title_heb = f"סֵפֶר {bh}"
        self.set_font('D', 'B', TITLE_SZ)
        tw = self.get_string_width(title_heb)
        cx = self.lm() + self.cw() / 2
        self.set_xy(cx - tw / 2, y)
        self.cell(tw, 8, title_heb)

        y += TITLE_SZ
        title_en = f"The Book of {book}"
        if book == 'Words of Mormon': title_en = "The Words of Mormon"
        self.ltr_mode()
        self.set_font('D', 'B', TITLE_SZ - 2)
        tw2 = self.get_string_width(title_en)
        self.set_xy(cx - tw2 / 2, y)
        self.cell(tw2, 8, title_en)
        self.rtl_mode()

        y += TITLE_SZ + 2
        self.set_draw_color(150)
        self.set_line_width(0.2)
        self.line(cx - 25, y, cx + 25, y)
        self.set_draw_color(0)

        self.hy = y + 3
        self.ey = y + 3

    # ── Colophon ──
    def colophon(self, heb_text, en_text):
        if not heb_text and not en_text:
            return
        y = max(self.hy, self.ey) + 1

        if heb_text:
            hlines = self.wrap_heb(heb_text.split(), self.heb_w())
            hy = y
            for i, lw in enumerate(hlines):
                if hy + HEB_LH > BOT:
                    self.new_pg()
                    hy = TY
                self.heb_line(lw, hy, i == len(hlines) - 1)
                hy += HEB_LH

        if en_text:
            elines = self.wrap_en(en_text.split(), self.en_w())
            ey = y
            for i, lw in enumerate(elines):
                if ey + EN_LH > BOT:
                    self.new_pg()
                    ey = TY
                self.en_line(lw, ey, i == len(elines) - 1)
                ey += EN_LH

        self.hy = max(hy if heb_text else y, ey if en_text else y) + 3
        self.ey = self.hy

    # ── Front matter ──
    def render_fm(self):
        try:
            fm = ld_fm()
        except:
            return

        for sec in fm:
            en_full = sec['english']
            heb_full = sec['hebrew']

            en_paras_all = en_full.split('\n')
            heb_paras_all = heb_full.split('\n')

            header_en = en_paras_all[0].strip() if en_paras_all else ''
            header_heb = heb_paras_all[0].strip() if heb_paras_all else ''

            en_paras = [p.strip() for p in en_paras_all[1:] if p.strip()]
            heb_paras = [p.strip() for p in heb_paras_all[1:] if p.strip()]

            self.fm_pg()
            y = TY

            # Dual headers
            if header_heb:
                self.set_font('D', 'B', 14)
                tw = self.get_string_width(header_heb)
                hcx = self.heb_l() + self.heb_w() / 2
                self.set_xy(hcx - tw / 2, y)
                self.cell(tw, 6, header_heb)

            if header_en:
                self.ltr_mode()
                self.set_font('D', 'B', 12)
                tw2 = self.get_string_width(header_en)
                ecx = self.en_l() + self.en_w() / 2
                self.set_xy(ecx - tw2 / 2, y)
                self.cell(tw2, 6, header_en)
                self.rtl_mode()

            y += 10

            # Render paragraphs aligned
            max_p = max(len(heb_paras), len(en_paras))
            for pi in range(max_p):
                hp = heb_paras[pi] if pi < len(heb_paras) else ''
                ep = en_paras[pi] if pi < len(en_paras) else ''

                hlines = self.wrap_heb(hp.split(), self.heb_w()) if hp else []
                elines = self.wrap_en(ep.split(), self.en_w()) if ep else []

                if y + HEB_LH > BOT:
                    self.fm_pg()
                    y = TY

                hy, ey2 = y, y
                hli, eli = 0, 0

                while hli < len(hlines) or eli < len(elines):
                    check = max(hy, ey2)
                    if check + max(HEB_LH, EN_LH) > BOT:
                        self.fm_pg()
                        hy = TY
                        ey2 = TY

                    if hli < len(hlines):
                        self.heb_line(hlines[hli], hy, hli == len(hlines) - 1)
                        hy += HEB_LH
                        hli += 1

                    if eli < len(elines):
                        self.en_line(elines[eli], ey2, eli == len(elines) - 1)
                        ey2 += EN_LH
                        eli += 1

                y = max(hy, ey2) + 2

    # ── TOC ──
    def render_toc(self):
        try:
            fm_json = ld_fm_json()
        except:
            return

        toc_sec = None
        for s in fm_json:
            if no_nikkud(s.get('header', '').strip()) == 'ראשי דברים':
                toc_sec = s
                break
        if not toc_sec:
            return

        self.fm_pg()
        y = TY
        self.set_font('D', 'B', 14)
        hdr = toc_sec['header']
        tw = self.get_string_width(hdr)
        cx = self.lm() + self.cw() / 2
        self.set_xy(cx - tw / 2, y)
        self.cell(tw, 6, hdr)
        y += 12

        heb_to_en = {}
        for en, hb in BK.items():
            heb_to_en[no_nikkud(hb)] = en
        # Add alternate spellings
        heb_to_en['עמני'] = 'Omni'  # TOC uses ayin, book dict uses aleph

        for toc_line in toc_sec['body'].strip().split('\n'):
            toc_line = toc_line.strip()
            if not toc_line: continue
            parts = toc_line.split('\t')
            bname = parts[0].strip()

            en_name = heb_to_en.get(no_nikkud(bname), '')
            if not en_name:
                for hb_s, en in heb_to_en.items():
                    if no_nikkud(bname) in hb_s or hb_s in no_nikkud(bname):
                        en_name = en
                        break

            pg = self.bkp.get(en_name, 0)
            pg_heb = heb(pg) if pg > 0 else ''

            self.set_font('D', 'B', 11)
            nw = self.get_string_width(bname)
            rx = PW - self.rm() - 5
            self.set_xy(rx - nw, y)
            self.cell(nw, 5, bname)

            self.set_font('D', '', 11)
            pw2 = self.get_string_width(pg_heb)
            lx = self.lm() + 5
            self.set_xy(lx, y)
            self.cell(pw2, 5, pg_heb)

            # Dots
            dot_l = lx + pw2 + 3
            dot_r = rx - nw - 3
            if dot_r > dot_l:
                self.set_font('D', '', 11)
                dots = ''
                while self.get_string_width(dots + ' .') < (dot_r - dot_l):
                    dots += ' .'
                dw2 = self.get_string_width(dots)
                mid = dot_l + (dot_r - dot_l) / 2
                self.set_xy(mid - dw2 / 2, y)
                self.cell(dw2, 5, dots)

            y += 8

    # ── Build ──
    def build(self):
        verses = ld_verses()
        hdg_heb = ld_hdg_heb()
        hdg_en = ld_hdg_en()
        cols = ld_col()

        cur_book = ''
        cur_ch = 0

        # Title page
        self.fm_pg()
        y = PH * 0.35
        self.set_font('D', 'B', 24)
        t1 = "סֵפֶר מוֹרְמוֹן"
        tw = self.get_string_width(t1)
        self.set_xy(PW / 2 - tw / 2, y)
        self.cell(tw, 10, t1)
        y += 14
        self.set_font('D', '', 14)
        t2 = "עֵדוּת אַחֶרֶת לְיֵשׁוּעַ הַמָּשִׁיחַ"
        tw2 = self.get_string_width(t2)
        self.set_xy(PW / 2 - tw2 / 2, y)
        self.cell(tw2, 6, t2)

        # Bottom
        y = PH * 0.7
        self.set_font('D', '', 12)
        t3 = "תרגם ללשון המקרא בידי"
        tw3 = self.get_string_width(t3)
        self.set_xy(PW / 2 - tw3 / 2, y)
        self.cell(tw3, 5, t3)
        y += 8
        self.set_font('D', 'B', 13)
        t4 = "כריס לאמב"
        tw4 = self.get_string_width(t4)
        self.set_xy(PW / 2 - tw4 / 2, y)
        self.cell(tw4, 5, t4)
        y += 9
        self.set_font('D', '', 11)
        t5 = "מהדורה עברית ראשונה · תשפ״ו"
        tw5 = self.get_string_width(t5)
        self.set_xy(PW / 2 - tw5 / 2, y)
        self.cell(tw5, 5, t5)

        # Blank page
        self.fm_pg()

        # Front matter
        self.render_fm()

        # TOC
        self.render_toc()

        # Ensure content starts on right side page for RTL binding
        # In KDP RTL, odd physical pages are on the RIGHT (front of book)
        # So page 1 of content needs to land on an odd physical page
        self.fm_pg()  # finalize FM
        if self.apg % 2 == 1:
            self.fm_pg()  # add blank so next page is odd

        self.is_fm = False
        self.cpg = 0

        # Content
        for v in verses:
            book = v['book']
            ch = v['chapter']
            vn = v['verse']
            ht = v.get('hebrew', '')
            et = v.get('english', '')
            if not ht or not et:
                continue

            if book != cur_book:
                cur_book = book
                self.book_title(book)
                col_heb = cols.get(book, '')
                col_en = COLOPHON_EN.get(book, '')
                self.colophon(col_heb, col_en)
                cur_ch = 0

            if ch != cur_ch:
                cur_ch = ch
                key = f"{book} {ch}"
                hh = hdg_heb.get(key, '')
                he = hdg_en.get(key, '')
                self.chapter_heading(ch, hh, he)

            self.render_verse(vn, ht, et, book, ch)

        # Final page
        self.draw_hf()


if __name__ == '__main__':
    import tempfile

    out = 'C:/Users/chris/Desktop/Hebrew_English_BOM.pdf'

    # Pass 1
    print("Pass 1: calculating page numbers...")
    tmp = tempfile.mktemp(suffix='.pdf')
    d1 = DualDoc()
    d1.build()
    d1.output(tmp)
    bkp = dict(d1.bkp)
    try: os.remove(tmp)
    except: pass

    # Pass 2
    print("Pass 2: generating final PDF...")
    d2 = DualDoc()
    d2.bkp = bkp
    d2.build()
    d2.output(out)
    print(f"Done! {d2.cpg} pages -> {out}")
