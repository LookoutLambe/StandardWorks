#!/usr/bin/env python3
"""
Hebrew Triple Combination PDF — BOM + D&C + PGP
Clean rewrite. fpdf2 + HarfBuzz for nikkud. Manual RTL justify.
Two-column layout. ArtScroll-style headers.
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
    if n >= 1000: return H1[n//1000] + "׳" + (heb(n%1000) if n%1000 else '')
    r = ''
    h = n // 100
    if h > 0:
        r += H100[h] if h <= 4 else ('ת' + H100[h-4])
        n %= 100
    if n == 15: return r + 'טו'
    if n == 16: return r + 'טז'
    if n >= 10: r += H10[n//10]; n %= 10
    if n > 0: r += H1[n]
    return r

def no_nikkud(t):
    return ''.join(c for c in t if unicodedata.category(c) != 'Mn')

def clean_hdg(t):
    if not t: return t
    t = t.replace('—',' ').replace('–',' ')
    t = re.sub(r'[,;:."\'()\[\]]','',t)
    return re.sub(r'  +',' ',t).strip()

# ── Book names ──
BK = {
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
BK_FILES = {
    '1 Nephi':'1nephi','2 Nephi':'2nephi','Jacob':'jacob',
    'Enos':'enos','Jarom':'jarom','Omni':'omni',
    'Words of Mormon':'words_of_mormon','Mosiah':'mosiah',
    'Alma':'alma','Helaman':'helaman','3 Nephi':'3nephi',
    '4 Nephi':'4nephi','Mormon':'mormon','Ether':'ether','Moroni':'moroni',
}
SINGLE = {'D&C Intro','PGP Intro','OD 1','OD 2','Enos','Jarom','Omni',
           'Words of Mormon','4 Nephi','JS-Matthew','JS-History','Articles of Faith'}

# ── Data loading ──
def ld_bom():
    with open(f'{BASE}/bom/official_verses.js','r',encoding='utf-8') as f: t=f.read()
    return json.loads(re.search(r'=\s*(\[.*\])',t,re.DOTALL).group(1))
def ld_hdg():
    with open(f'{BASE}/bom/chapter_headings_heb.js','r',encoding='utf-8') as f: t=f.read()
    return json.loads(re.search(r'=\s*(\{.*\})',t,re.DOTALL).group(1))
def ld_fm():
    with open(f'{BASE}/Hebrew BOM/front_matter.json','r',encoding='utf-8') as f: return json.load(f)
def ld_col():
    co={}
    for bk,fn in BK_FILES.items():
        for d in [f'{BASE}/Hebrew BOM/verses',f'{BASE}/bom/verses']:
            fp=f'{d}/{fn}.js'
            if os.path.exists(fp): break
        else: continue
        with open(fp,'r',encoding='utf-8') as f: t=f.read()
        m=re.search(r'var \w*[Cc]olophon\w*\s*=\s*\[(.*?)\];',t,re.DOTALL)
        if m:
            w=[x for x in re.findall(r'\["([^"]*)",\s*"[^"]*"\]',m.group(1)) if x not in('׃','')]
            if w: co[bk]=' '.join(w)+'׃'
            continue
        m2=re.search(r'var \w+_ch1Verses\s*=\s*\[\s*\{\s*num:\s*"([^"]*)",\s*words:\s*\[(.*?)\]\s*\}',t,re.DOTALL)
        if m2 and m2.group(1) in('∗','','0'):
            w=[x for x in re.findall(r'\["([^"]*)",\s*"[^"]*"\]',m2.group(2)) if x not in('׃','')]
            if w: co[bk]=' '.join(w)+'׃'
    return co
def ld_dc():
    with open(f'{BASE}/dc_official_verses.json','r',encoding='utf-8') as f: return json.load(f)
def ld_chr():
    with open(f'{BASE}/dc_chronology.json','r',encoding='utf-8') as f: return json.load(f)
def ld_pgp():
    with open(f'{BASE}/pgp_official_verses.json','r',encoding='utf-8') as f: return json.load(f)

# ── Layout (mm) ──
PW, PH = 152.4, 228.6
GUT = 22.225   # 0.875"
OUT = 8.89     # 0.35"
MT, MB = 10.0, 10.0
GAP = 4.3
HY = 8.0      # header y
TY = 15.0     # text start y
BOT = PH - MB  # bottom boundary
LH = 6.2      # line height body
LH_SM = 5.0   # line height small (colophon/heading)
LH_FM = 6.0   # front matter line height


class Doc(FPDF):
    def __init__(self):
        super().__init__(format=(PW, PH))
        self.add_font('D','','C:/Windows/Fonts/david.ttf')
        self.add_font('D','B','C:/Windows/Fonts/davidbd.ttf')
        self.set_text_shaping(True, direction='rtl')
        self.set_auto_page_break(False)
        self.cpg = 0       # content page number
        self.apg = 0       # absolute physical page
        self.col = 0       # 0=right, 1=left
        self.pv = []       # page verse tracking
        self.bkp = {}      # book -> page number
        self.csy = TY      # column start y (below colophon)

    # ── Margins (RTL: gutter RIGHT for odd pages) ──
    def lm(self): return OUT if self.apg % 2 == 1 else GUT
    def rm(self): return GUT if self.apg % 2 == 1 else OUT
    def cw(self): return PW - self.lm() - self.rm()
    def colw(self): return (self.cw() - GAP) / 2

    def col_r(self):
        """Right edge of current column."""
        return PW - self.rm() if self.col == 0 else self.lm() + self.colw()

    def col_l(self):
        """Left edge of current column."""
        return PW - self.rm() - self.colw() if self.col == 0 else self.lm()

    # ── RTL page ──
    def rtl_page(self):
        super().add_page()
        self.text_direction = TextDirection.RTL

    # ── Page management ──
    def finish_pg(self):
        """Draw header, footer, column divider on current page."""
        lm, rm = self.lm(), self.rm()
        # Column divider
        cx = lm + self.cw() / 2
        self.set_draw_color(200)
        self.set_line_width(0.15)
        self.line(cx, BOT, cx, self.csy)
        if self.pv:
            f, l = self.pv[0], self.pv[-1]
            bk_h = BK.get(f[0], f[0])
            pn = heb(self.cpg)
            if f[1] == l[1]:
                rng = f"{heb(f[1])} / {heb(f[2])}–{heb(l[2])}"
            else:
                rng = f"{heb(f[1])}:{heb(f[2])}–{heb(l[1])}:{heb(l[2])}"
            outer = f"{pn} / {bk_h}"
            hw = PW - lm - rm
            if self.apg % 2 == 1:
                self.set_xy(lm, HY-3); self.set_font('D','B',9); self.cell(hw, 4, outer, align='R')
                self.set_xy(lm, HY-3); self.set_font('D','',9); self.cell(hw, 4, rng, align='L')
            else:
                self.set_xy(lm, HY-3); self.set_font('D','B',9); self.cell(hw, 4, outer, align='L')
                self.set_xy(lm, HY-3); self.set_font('D','',9); self.cell(hw, 4, rng, align='R')
            self.set_draw_color(0); self.set_line_width(0.12)
            self.line(lm, HY+2, PW-rm, HY+2)
            self.line(lm, BOT, PW-rm, BOT)
        self.set_draw_color(0)

    def new_pg(self):
        self.finish_pg()
        self.rtl_page()
        self.cpg += 1; self.apg += 1
        self.col = 0; self.pv = []
        self.csy = TY
        self.set_y(TY)

    def next_col(self):
        if self.col == 0:
            self.col = 1
            self.set_y(self.csy)
        else:
            self.new_pg()

    def room(self, h):
        """Check if h mm fits. If not, switch column/page."""
        if self.get_y() + h > BOT:
            self.next_col()

    # ── RTL text primitives ──
    def wrap(self, words, size, w):
        """Word-wrap into lines."""
        self.set_font('D','',size)
        lines, cur = [], []
        for wd in words:
            if self.get_string_width(' '.join(cur + [wd])) > w and cur:
                lines.append(cur)
                cur = [wd]
            else:
                cur.append(wd)
        if cur: lines.append(cur)
        return lines

    def rtl_line(self, words, r, l, size, last, style=''):
        """Draw one justified RTL line."""
        self.set_font('D', style, size)
        avail = r - l
        if last or len(words) <= 1:
            txt = ' '.join(words)
            w = self.get_string_width(txt)
            self.set_xy(r - w, self.get_y())
            self.cell(w, LH, txt)
        else:
            ws = [self.get_string_width(w) for w in words]
            gap = (avail - sum(ws)) / (len(words) - 1)
            x = r
            for i, wd in enumerate(words):
                x -= ws[i]
                self.set_xy(x, self.get_y())
                self.cell(ws[i], LH, wd)
                x -= gap

    # ── Content blocks ──
    def verse(self, vnum, text, book, ch):
        vl = heb(vnum)
        full = f"{vl}  {text}"
        self.room(LH)
        self.pv.append((book, ch, vnum))
        r, l = self.col_r(), self.col_l()
        lines = self.wrap(full.split(), 13, r - l)
        for i, lw in enumerate(lines):
            if self.get_y() + LH > BOT:
                self.next_col()
                r, l = self.col_r(), self.col_l()
            self.rtl_line(lw, r, l, 13, i == len(lines) - 1)
            self.set_y(self.get_y() + LH)
        self.set_y(self.get_y() + 0.8)

    def chapter(self, ch, heading=None, label='פרק'):
        # Ensure room for heading + at least 3 verse lines
        needed = 8 + LH * 3
        if heading:
            self.set_font('D','',11)
            hlines = max(1, int(self.get_string_width(heading) / (self.colw() * 0.85)) + 1)
            needed += hlines * LH_SM + 1
        self.room(needed)
        self.set_y(self.get_y() + 2)
        # Centered title in column
        title = f"{label} {heb(ch)}"
        self.set_font('D','B',14)
        tw = self.get_string_width(title)
        cx = self.col_l() + self.colw() / 2
        self.set_xy(cx - tw/2, self.get_y())
        self.cell(tw, 6, title)
        self.set_y(self.get_y() + 7)
        if heading:
            self.set_text_color(68,68,68)
            r, l = self.col_r(), self.col_l()
            hlines = self.wrap(heading.split(), 11, r - l)
            for i, lw in enumerate(hlines):
                if self.get_y() + LH_SM > BOT:
                    self.next_col()
                    r, l = self.col_r(), self.col_l()
                self.rtl_line(lw, r, l, 11, i == len(hlines) - 1)
                self.set_y(self.get_y() + LH_SM)
            self.set_text_color(0)
            self.set_y(self.get_y() + 0.5)

    def book_title(self, book):
        """New book — always new page, full-width title."""
        if self.get_y() > TY + 1:
            self.new_pg()
        self.bkp[book] = self.cpg
        self.set_y(self.get_y() + 3)
        title = no_nikkud(BK.get(book, book))
        self.set_font('D','B',18)
        tw = self.get_string_width(title)
        cx = self.lm() + self.cw() / 2
        self.set_xy(cx - tw/2, self.get_y())
        self.cell(tw, 8, title)
        self.set_y(self.get_y() + 10)

    def colophon(self, text):
        """Full-width colophon, then two columns start below."""
        self.set_text_color(51,51,51)
        r = PW - self.rm() - 1
        l = self.lm() + 1
        lines = self.wrap(text.split(), 10, r - l)
        for i, lw in enumerate(lines):
            if self.get_y() + LH_SM > BOT:
                self.new_pg()
                r = PW - self.rm() - 1
                l = self.lm() + 1
            self.rtl_line(lw, r, l, 10, i == len(lines) - 1)
            self.set_y(self.get_y() + LH_SM)
        self.set_text_color(0)
        self.set_y(self.get_y() + 2)
        self.csy = self.get_y()
        self.col = 0

    def divider(self, title, key=None):
        """Volume divider — inline."""
        if self.get_y() > TY + 1:
            self.new_pg()
        if key: self.bkp[key] = self.cpg
        cx = self.lm() + self.cw() / 2
        y = self.get_y() + 4
        self.set_draw_color(136); self.set_line_width(0.2)
        self.line(cx-25, y, cx+25, y)
        y += 4
        self.set_font('D','B',22)
        tw = self.get_string_width(title)
        self.set_xy(cx - tw/2, y)
        self.cell(tw, 10, title)
        y += 11
        self.line(cx-18, y, cx+18, y)
        self.set_draw_color(0)
        self.set_y(y + 4)
        self.csy = self.get_y()
        self.col = 0

    def chron_table(self, data):
        """D&C chronological order table."""
        self.new_pg()
        lm = self.lm(); fw = self.cw(); r = PW - self.rm()
        self.set_font('D','B',16)
        tw = self.get_string_width('סדר כרונולוגי')
        cx = lm + fw / 2
        self.set_xy(cx - tw/2, self.get_y())
        self.cell(tw, 8, 'סדר כרונולוגי')
        self.set_y(self.get_y() + 9)
        self.set_draw_color(153); self.line(cx-14, self.get_y(), cx+14, self.get_y())
        self.set_draw_color(0); self.set_y(self.get_y() + 5)
        cd, cp = fw*0.25, fw*0.45
        self.set_font('D','B',10)
        y = self.get_y()
        self.set_xy(r-cd, y); self.cell(cd, 5, 'תאריך', align='R')
        self.set_xy(r-cd-cp, y); self.cell(cp, 5, 'מקום', align='R')
        self.set_xy(lm, y); self.cell(fw-cd-cp, 5, 'סימן', align='R')
        self.set_y(y+6)
        self.set_draw_color(200); self.line(lm, self.get_y(), r, self.get_y()); self.set_draw_color(0)
        self.set_y(self.get_y() + 2)
        self.set_font('D','',9)
        for row in data:
            if self.get_y() + 5 > BOT:
                self.finish_pg(); self.rtl_page()
                self.cpg += 1; self.apg += 1; self.pv = []; self.csy = TY
                self.set_y(TY)
                lm = self.lm(); r = PW - self.rm()
            y = self.get_y()
            self.set_xy(r-cd, y); self.cell(cd, 4.5, row['date'], align='R')
            self.set_xy(r-cd-cp, y); self.cell(cp, 4.5, row['place'], align='R')
            self.set_xy(lm, y); self.cell(fw-cd-cp, 4.5, row['sections'], align='R')
            self.set_y(y + 4.5)

    # ── Front matter ──
    def fm_margins(self, p):
        return (OUT, GUT) if p % 2 == 1 else (GUT, OUT)

    def fm_page(self, header, body, fp):
        lm, rm = self.fm_margins(fp)
        fw = PW - lm - rm; r = PW - rm
        cx = lm + fw / 2
        self.set_font('D','B',15)
        tw = self.get_string_width(no_nikkud(header))
        self.set_xy(cx - tw/2, 20); self.cell(tw, 6, no_nikkud(header))
        self.set_y(27)
        self.set_draw_color(153); self.line(cx-14, 27, cx+14, 27); self.set_draw_color(0)
        self.set_y(31)
        for para in body.split('\n'):
            para = para.strip()
            if not para: self.set_y(self.get_y()+2); continue
            words = para.split()
            if not words: continue
            lines = self.wrap(words, 12, fw)
            for i, lw in enumerate(lines):
                if self.get_y() + LH_FM > BOT:
                    self.rtl_page(); fp += 1
                    lm, rm = self.fm_margins(fp)
                    fw = PW - lm - rm; r = PW - rm
                    self.set_y(15)
                self.rtl_line(lw, r, lm, 12, i == len(lines) - 1)
                self.set_y(self.get_y() + LH_FM)
            self.set_y(self.get_y() + 0.5)
        return fp

    def fm_toc(self, body, fp):
        lm, rm = self.fm_margins(fp)
        fw = PW - lm - rm; r = PW - rm; cx = lm + fw / 2
        self.set_font('D','B',15)
        tw = self.get_string_width('ראשי דברים')
        self.set_xy(cx - tw/2, 20); self.cell(tw, 6, 'ראשי דברים')
        self.set_y(27)
        self.set_draw_color(153); self.line(cx-14, 27, cx+14, 27); self.set_draw_color(0)
        self.set_y(32)
        self.set_font('D','',12)
        for line in body.strip().split('\n'):
            parts = line.strip().split('\t')
            if len(parts) == 2:
                y = self.get_y()
                self.set_xy(lm, y); self.cell(fw, 6, parts[0].strip(), align='R')
                self.set_xy(lm, y); self.cell(fw, 6, parts[1].strip(), align='L')
                self.set_y(y + 7)
                if self.get_y() + 7 > BOT:
                    self.rtl_page(); fp += 1
                    lm, rm = self.fm_margins(fp)
                    fw = PW - lm - rm; r = PW - rm
                    self.set_y(15)
        return fp

    # ── Content rendering ──
    def render(self, bom, hdg, cols, dc, pgp, chron):
        cur_bk = cur_ch = None
        for v in bom:
            bk, ch, vs, hb = v['book'], v['chapter'], v['verse'], v['hebrew']
            if bk != cur_bk:
                cur_bk = bk; cur_ch = None
                self.book_title(bk)
                if bk in cols: self.colophon(cols[bk])
            if ch != cur_ch:
                cur_ch = ch
                h = clean_hdg(hdg.get(f"{bk} {ch}"))
                if bk not in SINGLE or ch != 1:
                    self.chapter(ch, h)
            self.verse(vs, hb, bk, ch)
        print(f"BOM: {self.cpg} pages")
        bpg = self.cpg

        self.divider('תורה ובריתות', key='D&C')
        if chron: self.chron_table(chron)
        cur_bk = cur_ch = None
        for v in dc:
            bk, ch, vs, hb = v['book'], v['chapter'], v['verse'], v['hebrew']
            if bk != cur_bk:
                cur_bk = bk; cur_ch = None
                if bk != 'D&C': self.book_title(bk)
            if ch != cur_ch:
                cur_ch = ch
                if bk == 'D&C': self.chapter(ch, label='סִימָן')
                elif bk not in SINGLE: self.chapter(ch)
            self.verse(vs, hb, bk, ch)
        dpg = self.cpg - bpg
        print(f"D&C: {dpg} pages (total: {self.cpg})")

        self.divider('פנינת המחיר הגדול', key='PGP')
        cur_bk = cur_ch = None
        for v in pgp:
            bk, ch, vs, hb = v['book'], v['chapter'], v['verse'], v['hebrew']
            if bk != cur_bk:
                cur_bk = bk; cur_ch = None
                self.book_title(bk)
            if ch != cur_ch:
                cur_ch = ch
                if bk not in SINGLE: self.chapter(ch)
            self.verse(vs, hb, bk, ch)
        ppg = self.cpg - bpg - dpg
        print(f"PGP: {ppg} pages")
        self.finish_pg()

    def toc_body(self):
        entries = [('נפי א׳','1 Nephi'),('נפי ב׳','2 Nephi'),('יעקב','Jacob'),
                   ('אנוש','Enos'),('ירום','Jarom'),('עמני','Omni'),
                   ('דברי מורמון','Words of Mormon'),('מושיה','Mosiah'),
                   ('אלמא','Alma'),('הילמן','Helaman'),('נפי ג׳','3 Nephi'),
                   ('נפי ד׳','4 Nephi'),('מורמון','Mormon'),('אתר','Ether'),
                   ('מורוני','Moroni')]
        return '\n'.join(f"{h}\t{heb(self.bkp.get(k,0))}" for h,k in entries if self.bkp.get(k,0)>0)

    def generate(self):
        bom, hdg, fm, cols = ld_bom(), ld_hdg(), ld_fm(), ld_col()
        dc, chron, pgp = ld_dc(), ld_chr(), ld_pgp()

        # Pass 1: dry run for TOC
        print("Pass 1...")
        dry = Doc()
        dry.rtl_page(); dry.cpg = 1; dry.apg = 1; dry.set_y(TY)
        dry.render(bom, hdg, cols, dc, pgp, chron)
        toc = dry.toc_body()

        # Pass 2: real PDF
        print("Pass 2...")
        fp = 0
        self.rtl_page(); fp += 1  # p1 blank
        self.rtl_page(); fp += 1  # p2 blank
        self.rtl_page(); fp += 1  # p3 half title
        self.set_font('D','B',24)
        tw = self.get_string_width('כתבי הקדש')
        self.set_xy(PW/2 - tw/2, PH*0.35); self.cell(tw, 10, 'כתבי הקדש')
        self.set_font('D','',13)
        sub = 'ספר מורמון · תורה ובריתות · פנינת המחיר הגדול'
        tw2 = self.get_string_width(sub)
        self.set_xy(PW/2 - tw2/2, PH*0.35+12); self.cell(tw2, 8, sub)

        self.rtl_page(); fp += 1  # p4 blank
        self.rtl_page(); fp += 1  # p5 full title
        self.set_font('D','B',24)
        self.set_xy(PW/2 - tw/2, PH*0.35); self.cell(tw, 10, 'כתבי הקדש')
        self.set_font('D','',13)
        self.set_xy(PW/2 - tw2/2, PH*0.35+12); self.cell(tw2, 8, sub)
        cx = PW/2
        self.set_draw_color(136); self.set_line_width(0.25)
        self.line(cx-28, PH*0.35-8, cx+28, PH*0.35-8)
        self.line(cx-22, PH*0.35+22, cx+22, PH*0.35+22)
        self.set_draw_color(0)
        for txt,st,sz,yp in [('תרגם ללשון המקרא בידי','B',11,PH-42),('כריס לאמב','',11,PH-37),
                              ('מהדורה עברית ראשונה  ·  תשפ״ו','',8,PH-30),('כל הזכויות שמורות © תשפ״ו','',7,PH-26)]:
            self.set_font('D',st,sz); tw3=self.get_string_width(txt); self.set_xy(cx-tw3/2,yp); self.cell(tw3,5,txt)

        # Front matter
        for i, sec in enumerate(fm):
            if i <= 1 or i == 9: continue
            self.rtl_page(); fp += 1
            fp = self.fm_page(sec.get('header',''), sec.get('body',''), fp)

        # TOC
        self.rtl_page(); fp += 1
        fp = self.fm_toc(toc, fp)

        # Ensure content starts on odd (right) page
        if fp % 2 == 1:
            self.rtl_page(); fp += 1

        # Content
        self.cpg = 1; self.apg = fp + 1; self.col = 0; self.pv = []; self.bkp = {}; self.csy = TY
        self.rtl_page(); self.apg = fp + 1
        self.set_y(TY)
        self.render(bom, hdg, cols, dc, pgp, chron)
        print(f"Total: {self.cpg} content pages")


if __name__ == '__main__':
    out = 'C:/Users/chris/Desktop/Hebrew_Triple_v3.pdf'
    d = Doc()
    d.generate()
    d.output(out)
    print(f"Output: {out}")
