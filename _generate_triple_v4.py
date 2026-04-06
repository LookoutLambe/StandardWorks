#!/usr/bin/env python3
"""
Hebrew Triple Combination PDF — BOM + D&C + PGP
v4: Uses DOCX-style logic for section flow.
fpdf2 + HarfBuzz for nikkud. Manual RTL cell() for justification.
Single-column for titles/colophons, two-column for verses.
Clear section boundaries — no mixing modes on same page area.
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
    if h>0: r+=H100[h] if h<=4 else ('ת'+H100[h-4]); n%=100
    if n==15: return r+'טו'
    if n==16: return r+'טז'
    if n>=10: r+=H10[n//10]; n%=10
    if n>0: r+=H1[n]
    return r

def no_nikkud(t): return ''.join(c for c in t if unicodedata.category(c)!='Mn')
def clean_hdg(t):
    if not t: return t
    t=t.replace('—',' ').replace('–',' ')
    t=re.sub(r'[,;:."\'()\[\]]','',t)
    return re.sub(r'  +',' ',t).strip()

# ── Book names ──
BK={'1 Nephi':'נֶפִי א','2 Nephi':'נֶפִי ב','Jacob':'יַעֲקֹב','Enos':'אֵנוֹשׁ',
    'Jarom':'יָרוֹם','Omni':'אָמְנִי','Words of Mormon':'דִּבְרֵי מוֹרְמוֹן',
    'Mosiah':'מוֹשִׁיָּה','Alma':'אַלְמָא','Helaman':'הֵילָמָן',
    '3 Nephi':'נֶפִי ג','4 Nephi':'נֶפִי ד','Mormon':'מוֹרְמוֹן',
    'Ether':'אֶתֶר','Moroni':'מוֹרוֹנִי',
    'D&C':'תּוֹרָה וּבְרִיתוֹת','D&C Intro':'מְבוֹא לתו״ב',
    'OD 1':'הַכְרָזָה רִשְׁמִית א','OD 2':'הַכְרָזָה רִשְׁמִית ב',
    'Moses':'מֹשֶׁה','Abraham':'אַבְרָהָם',
    'JS-Matthew':'יוֹסֵף סְמִית — מַתִּתְיָהוּ',
    'JS-History':'יוֹסֵף סְמִית — הִיסְטוֹרְיָה',
    'Articles of Faith':'עִקְרֵי הָאֱמוּנָה','PGP Intro':'מְבוֹא לפמה״ג'}
BKF={'1 Nephi':'1nephi','2 Nephi':'2nephi','Jacob':'jacob','Enos':'enos',
     'Jarom':'jarom','Omni':'omni','Words of Mormon':'words_of_mormon',
     'Mosiah':'mosiah','Alma':'alma','Helaman':'helaman','3 Nephi':'3nephi',
     '4 Nephi':'4nephi','Mormon':'mormon','Ether':'ether','Moroni':'moroni'}
SINGLE_CH={'D&C Intro','PGP Intro','OD 1','OD 2','Enos','Jarom','Omni',
           'Words of Mormon','4 Nephi','JS-Matthew','JS-History','Articles of Faith'}

# ── Data loading ──
def ld(name):
    p=f'{BASE}/{name}'
    with open(p,'r',encoding='utf-8') as f:
        t=f.read()
        try: return json.loads(t)
        except: return json.loads(re.search(r'=\s*(\[.*?\]|\{.*?\})',t,re.DOTALL).group(1))
def ld_bom(): return ld('bom/official_verses.js')
def ld_hdg(): return ld('bom/chapter_headings_heb.js')
def ld_fm():
    with open(f'{BASE}/Hebrew BOM/front_matter.json','r',encoding='utf-8') as f: return json.load(f)
def ld_col():
    co={}
    for bk,fn in BKF.items():
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
def ld_dc(): return ld('dc_official_verses.json')
def ld_chr(): return ld('dc_chronology.json')
def ld_pgp(): return ld('pgp_official_verses.json')
def ld_dch():
    with open(f'{BASE}/dc_section_headers_heb.json','r',encoding='utf-8') as f: return json.load(f)

# ── Layout (mm) ──
PW,PH=152.4,228.6
GUT=22.225; OUT=9.525; MT=8; MB=8; GAP=4.3
HY=9.5; TY=17; BOT=PH-MB  # header at 9.5mm (~0.37"), content at 17mm (~0.67")
LH=5.5; LH_S=4.5; LH_FM=5.5


class Doc(FPDF):
    def __init__(self):
        super().__init__(format=(PW,PH))
        self.add_font('D','','C:/Windows/Fonts/david.ttf')
        self.add_font('D','B','C:/Windows/Fonts/davidbd.ttf')
        self.set_text_shaping(True, direction='rtl')
        self.set_auto_page_break(False)
        self.cpg=0; self.apg=0; self.col=0; self.pv=[]; self.bkp={}
        self.csy=TY  # column start y (below colophon on colophon pages)

    def pg_add(self):
        super().add_page()
        self.text_direction=TextDirection.RTL

    # margins
    def lm(self): return OUT if self.apg%2==1 else GUT
    def rm(self): return GUT if self.apg%2==1 else OUT
    def cw(self): return PW-self.lm()-self.rm()
    def colw(self): return (self.cw()-GAP)/2
    def col_r(self): return PW-self.rm() if self.col==0 else self.lm()+self.colw()
    def col_l(self): return PW-self.rm()-self.colw() if self.col==0 else self.lm()

    # ── Header/footer ──
    def draw_hf(self):
        lm,rm=self.lm(),self.rm()
        # Column divider
        cx=lm+self.cw()/2
        self.set_draw_color(200); self.set_line_width(0.15)
        self.line(cx,BOT,cx,self.csy)
        if self.pv:
            f,l=self.pv[0],self.pv[-1]
            bh=BK.get(f[0],f[0]); pn=heb(self.cpg)
            rng=f"{heb(f[1])} / {heb(f[2])}–{heb(l[2])}" if f[1]==l[1] else f"{heb(f[1])}:{heb(f[2])}–{heb(l[1])}:{heb(l[2])}"
            outer=f"{pn} / {bh}"; hw=PW-lm-rm
            self.set_font('D','B',9)
            ow=self.get_string_width(outer)
            self.set_xy(PW-rm-ow,HY-3); self.cell(ow,4,outer)
            self.set_font('D','',9)
            self.set_xy(lm,HY-3); self.cell(hw,4,rng,align='L')
            self.set_draw_color(0); self.set_line_width(0.12)
            self.line(lm,HY+2,PW-rm,HY+2)
            self.line(lm,BOT,PW-rm,BOT)
        self.set_draw_color(0)

    # ── Page management ──
    def new_pg(self):
        self.draw_hf()
        self.pg_add()
        self.cpg+=1; self.apg+=1; self.col=0; self.pv=[]; self.csy=TY
        self.set_y(TY)

    def next_col(self):
        if self.col==0: self.col=1; self.set_y(self.csy)
        else: self.new_pg()

    # ── RTL text ──
    def wrap(self, words, sz, w):
        self.set_font('D','',sz)
        lines,cur=[],[]
        for wd in words:
            if self.get_string_width(' '.join(cur+[wd]))>w and cur:
                lines.append(cur); cur=[wd]
            else: cur.append(wd)
        if cur: lines.append(cur)
        return lines

    def rtl_line(self, words, r, l, sz, last, style=''):
        self.set_font('D',style,sz)
        avail=r-l
        ws=[self.get_string_width(w) for w in words]
        total_w=sum(ws)
        # Only right-align last line or single word — otherwise always justify
        if last or len(words)<=1:
            txt=' '.join(words)
            w=self.get_string_width(txt)
            self.set_xy(r-w,self.get_y()); self.cell(w,LH,txt)
        else:
            gap=(avail-total_w)/(len(words)-1)
            x=r
            for i,wd in enumerate(words):
                x-=ws[i]; self.set_xy(x,self.get_y()); self.cell(ws[i],LH,wd); x-=gap

    # ── SINGLE-COLUMN methods (titles, colophons, headings before 2-col) ──
    def single_text(self, text, sz, style=''):
        """Render RTL justified text in single-column (full width). Page breaks if needed."""
        r=PW-self.rm(); l=self.lm()
        lh=sz*0.48
        lines=self.wrap(text.split(),sz,r-l)
        for i,lw in enumerate(lines):
            if self.get_y()+lh>BOT:
                self.new_pg()
                r=PW-self.rm(); l=self.lm()
            self.rtl_line(lw,r,l,sz,i==len(lines)-1,style)
            self.set_y(self.get_y()+lh)

    def book_title(self, book):
        """New book — always new page, centered title (single-col)."""
        if self.get_y()>TY+1: self.new_pg()
        self.bkp[book]=self.cpg
        self.set_y(self.get_y()+3)
        title=no_nikkud(BK.get(book,book))
        self.set_font('D','B',18)
        tw=self.get_string_width(title)
        cx=self.lm()+self.cw()/2
        self.set_xy(cx-tw/2,self.get_y()); self.cell(tw,8,title)
        self.set_y(self.get_y()+10)

    def colophon(self, text):
        """Single-column colophon text. Sets csy so 2-col starts below."""
        self.set_text_color(51,51,51)
        self.single_text(text,10)
        self.set_text_color(0)
        self.set_y(self.get_y()+2)

    def start_two_col(self):
        """Mark the boundary: everything below here is two-column."""
        self.csy=self.get_y()
        self.col=0

    def volume_divider(self, title, key=None):
        """Volume title (D&C or PGP) — new page, centered."""
        if self.get_y()>TY+1: self.new_pg()
        if key: self.bkp[key]=self.cpg
        cx=self.lm()+self.cw()/2
        y=self.get_y()+4
        self.set_draw_color(136); self.set_line_width(0.2)
        self.line(cx-25,y,cx+25,y); y+=4
        self.set_font('D','B',22)
        tw=self.get_string_width(title)
        self.set_xy(cx-tw/2,y); self.cell(tw,10,title); y+=11
        self.line(cx-18,y,cx+18,y)
        self.set_draw_color(0)
        self.set_y(y+4)

    # ── TWO-COLUMN methods (verses, chapter headings) ──
    def chapter(self, ch, heading=None, label='פרק'):
        """Chapter heading. Only push פרק line if completely stranded (no room for even the title).
        The heading summary text flows to next column just like verses."""
        # Need room for פרק title + at least one line after it (summary or verse)
        # If only the title fits but nothing else, it's stranded — move it
        if self.get_y()+8+LH>BOT: self.next_col()
        self.set_y(self.get_y()+2)
        title=f"{label} {heb(ch)}"
        self.set_font('D','B',14)
        tw=self.get_string_width(title)
        cx=self.col_l()+self.colw()/2
        self.set_xy(cx-tw/2,self.get_y()); self.cell(tw,6,title)
        self.set_y(self.get_y()+7)
        if heading:
            self.set_text_color(68,68,68)
            r,l=self.col_r(),self.col_l()
            hlines=self.wrap(heading.split(),11,r-l)
            for i,lw in enumerate(hlines):
                if self.get_y()+LH_S>BOT:
                    self.next_col(); r,l=self.col_r(),self.col_l()
                self.rtl_line(lw,r,l,11,i==len(hlines)-1)
                self.set_y(self.get_y()+LH_S)
            self.set_text_color(0)
            self.set_y(self.get_y()+0.5)

    def verse(self, vnum, text, book, ch):
        """Single verse — just tracks for header. Actual rendering done by render_chapter_block."""
        self.pv.append((book,ch,vnum))

    def render_chapter_block(self, verses, book):
        """Render verses — each verse own paragraph, bold number same size.
        Verses split across columns, no white space gaps."""
        for v in verses:
            vl=heb(v['verse'])
            # Track verse on the page where its first line actually renders
            if self.get_y()+LH>BOT: self.next_col()
            self.pv.append((book,v['chapter'],v['verse']))
            r,l=self.col_r(),self.col_l()
            # First word is bold verse number, rest is regular text
            text_words=v['hebrew'].split()
            all_words=[vl]+text_words
            lines=self.wrap(all_words,13,r-l)
            for i,lw in enumerate(lines):
                if self.get_y()+LH>BOT:
                    self.next_col(); r,l=self.col_r(),self.col_l()
                    # Re-track verse on the new page
                    self.pv.append((book,v['chapter'],v['verse']))
                last=(i==len(lines)-1)
                # Measure all words
                ws=[]
                for j,wd in enumerate(lw):
                    is_vnum=(i==0 and j==0)
                    self.set_font('D','B' if is_vnum else '',13)
                    ws.append(self.get_string_width(wd))
                total_w=sum(ws)
                avail=r-l
                if last or len(lw)<=1:
                    # Right-align
                    x=r
                    for j,wd in enumerate(lw):
                        is_vnum=(i==0 and j==0)
                        self.set_font('D','B' if is_vnum else '',13)
                        if j>0:
                            self.set_font('D','',13)
                            x-=self.get_string_width(' ')
                        x-=ws[j]
                        self.set_xy(x,self.get_y()); self.cell(ws[j],LH,wd)
                else:
                    gap=(avail-total_w)/(len(lw)-1)
                    x=r
                    for j,wd in enumerate(lw):
                        is_vnum=(i==0 and j==0)
                        self.set_font('D','B' if is_vnum else '',13)
                        x-=ws[j]
                        self.set_xy(x,self.get_y()); self.cell(ws[j],LH,wd)
                        x-=gap
                self.set_y(self.get_y()+LH)

    # ── D&C section (1-col heading+colophon, then 2-col verses) ──
    def dc_section(self, ch, header, verses):
        """Render one D&C section: heading+colophon in 1-col, verses in 2-col."""
        # End previous two-column mode cleanly
        # If in left column (col=1), we're partway through — go to new page
        # If in right column (col=0), check if enough room for heading
        if self.col==1:
            self.new_pg()
        else:
            # Need room for heading + colophon + a few verse lines
            if self.get_y()+30>BOT:
                self.new_pg()
        # Reset to single-column mode for heading
        self.col=0
        self.csy=BOT  # suppress column divider in heading area
        # Section heading centered full-width
        self.set_y(self.get_y()+3)
        title=f"סִימָן {heb(ch)}"
        self.set_font('D','B',14)
        tw=self.get_string_width(title)
        cx=self.lm()+self.cw()/2
        self.set_xy(cx-tw/2,self.get_y()); self.cell(tw,6,title)
        self.set_y(self.get_y()+7)
        # Single-column colophon
        if header:
            self.set_font('D','',10)  # reset font explicitly
            self.colophon(header)
        # Switch to two-column for verses
        self.start_two_col()
        self.render_chapter_block(verses,'D&C')

    # ── Chronological table ──
    def chron_table(self, data):
        self.new_pg()
        self.csy=BOT  # prevents column divider from drawing on this page
        lm=self.lm(); fw=self.cw(); r=PW-self.rm()
        self.set_font('D','B',16)
        tw=self.get_string_width('סדר כרונולוגי')
        cx=lm+fw/2
        self.set_xy(cx-tw/2,self.get_y()); self.cell(tw,8,'סדר כרונולוגי')
        self.set_y(self.get_y()+9)
        self.set_draw_color(153); self.line(cx-14,self.get_y(),cx+14,self.get_y())
        self.set_draw_color(0); self.set_y(self.get_y()+5)
        cd,cp=fw*0.25,fw*0.45
        self.set_font('D','B',10)
        y=self.get_y()
        self.set_xy(r-cd,y); self.cell(cd,5,'תאריך',align='R')
        self.set_xy(r-cd-cp,y); self.cell(cp,5,'מקום',align='R')
        self.set_xy(lm,y); self.cell(fw-cd-cp,5,'סימן',align='R')
        self.set_y(y+6)
        self.set_draw_color(200); self.line(lm,self.get_y(),r,self.get_y())
        self.set_draw_color(0); self.set_y(self.get_y()+2)
        self.set_font('D','',9)
        for row in data:
            if self.get_y()+5>BOT:
                self.draw_hf(); self.pg_add(); self.cpg+=1; self.apg+=1
                self.pv=[]; self.csy=BOT; self.set_y(TY)  # BOT suppresses divider
                lm=self.lm(); r=PW-self.rm()
            y=self.get_y()
            self.set_xy(r-cd,y); self.cell(cd,4.5,row['date'],border=0,align='R')
            self.set_xy(r-cd-cp,y); self.cell(cp,4.5,row['place'],border=0,align='R')
            self.set_xy(lm,y); self.cell(fw-cd-cp,4.5,row['sections'],border=0,align='R')
            self.set_y(y+4.5)

    # ── Front matter ──
    def fm_margins(self,p): return (OUT,GUT) if p%2==1 else (GUT,OUT)

    def fm_page(self, header, body, fp):
        lm,rm=self.fm_margins(fp); fw=PW-lm-rm; r=PW-rm
        self.set_font('D','B',15)
        tw=self.get_string_width(no_nikkud(header))
        cx=lm+fw/2
        self.set_xy(cx-tw/2,20); self.cell(tw,6,no_nikkud(header))
        self.set_y(27)
        self.set_draw_color(153); self.line(cx-14,27,cx+14,27); self.set_draw_color(0)
        self.set_y(31)
        for para in body.split('\n'):
            para=para.strip()
            if not para: self.set_y(self.get_y()+2); continue
            words=para.split()
            if not words: continue
            lines=self.wrap(words,12,fw)
            for i,lw in enumerate(lines):
                if self.get_y()+LH_FM>BOT:
                    self.pg_add(); fp+=1
                    lm,rm=self.fm_margins(fp); fw=PW-lm-rm; r=PW-rm
                    self.set_y(15)
                self.rtl_line(lw,r,lm,12,i==len(lines)-1)
                self.set_y(self.get_y()+LH_FM)
            self.set_y(self.get_y()+0.5)
        return fp

    def fm_toc(self, body, fp):
        lm,rm=self.fm_margins(fp); fw=PW-lm-rm; r=PW-rm
        self.set_font('D','B',15)
        tw=self.get_string_width('ראשי דברים')
        cx=lm+fw/2
        self.set_xy(cx-tw/2,20); self.cell(tw,6,'ראשי דברים')
        self.set_y(27)
        self.set_draw_color(153); self.line(cx-14,27,cx+14,27); self.set_draw_color(0)
        self.set_y(32)
        self.set_font('D','',12)
        for line in body.strip().split('\n'):
            parts=line.strip().split('\t')
            if len(parts)==2:
                y=self.get_y()
                name=parts[0].strip()
                pg=parts[1].strip()
                # Draw book name on right
                self.set_font('D','',12)
                nw=self.get_string_width(name)
                self.set_xy(r-nw,y); self.cell(nw,6,name)
                # Draw page number on left
                pw=self.get_string_width(pg)
                self.set_xy(lm,y); self.cell(pw,6,pg)
                # Dot leaders between
                self.set_text_color(180,180,180)
                dot_start=lm+pw+2
                dot_end=r-nw-2
                dx=dot_start
                while dx<dot_end:
                    self.set_xy(dx,y+2.5)
                    self.cell(1,1,'.')
                    dx+=2
                self.set_text_color(0)
                self.set_y(y+7)
                if self.get_y()+7>BOT:
                    self.pg_add(); fp+=1
                    lm,rm=self.fm_margins(fp); fw=PW-lm-rm; r=PW-rm
                    self.set_y(15)
        return fp

    # ── Content rendering ──
    def render(self, bom, hdg, cols, dc, pgp, chron, dch):
        # ── BOM ──
        cur_bk=cur_ch=None
        ch_verses=[]
        for v in bom:
            bk,ch=v['book'],v['chapter']
            if bk!=cur_bk or ch!=cur_ch:
                # Flush previous chapter block
                if ch_verses:
                    self.render_chapter_block(ch_verses,cur_bk)
                    ch_verses=[]
                if bk!=cur_bk:
                    cur_bk=bk; cur_ch=None
                    self.book_title(bk)
                    if bk in cols: self.colophon(cols[bk])
                    self.start_two_col()
                cur_ch=ch
                h=clean_hdg(hdg.get(f"{bk} {ch}"))
                if bk not in SINGLE_CH or ch!=1:
                    self.chapter(ch,h)
            ch_verses.append(v)
        if ch_verses: self.render_chapter_block(ch_verses,cur_bk)
        print(f"BOM: {self.cpg} pages")

        # ── D&C ──
        # Reset page numbering for D&C
        self.cpg=1
        self.volume_divider('תורה ובריתות',key='D&C')
        # D&C Introduction
        dc_intro=[v for v in dc if v['book']=='D&C Intro']
        if dc_intro:
            self.set_y(self.get_y()+2)
            title='מבוא'
            self.set_font('D','B',14)
            tw=self.get_string_width(title)
            cx=self.lm()+self.cw()/2
            self.set_xy(cx-tw/2,self.get_y()); self.cell(tw,6,title)
            self.set_y(self.get_y()+7)
            for iv in dc_intro:
                self.single_text(iv['hebrew'],12)
                self.set_y(self.get_y()+1)
        # Chronological table
        if chron: self.chron_table(chron)
        # D&C Sections 1-138
        dc_main=[v for v in dc if v['book']=='D&C']
        sections={}
        for v in dc_main:
            sections.setdefault(v['chapter'],[]).append(v)
        for ch in sorted(sections.keys()):
            header=dch.get(str(ch))
            self.dc_section(ch,header,sections[ch])
        print(f"D&C: {self.cpg} pages")

        # Official Declarations
        for od_name,od_title in [('OD 1','הכרזה רשמית א'),('OD 2','הכרזה רשמית ב')]:
            od_vv=[v for v in dc if v['book']==od_name]
            if od_vv:
                self.book_title(od_name)
                self.start_two_col()
                self.render_chapter_block(od_vv,od_name)

        # ── PGP — reset page numbering ──
        self.cpg=1
        self.volume_divider('פנינת המחיר הגדול',key='PGP')
        pgp_intro=[v for v in pgp if v['book']=='PGP Intro']
        if pgp_intro:
            for iv in pgp_intro:
                self.single_text(iv['hebrew'],12)
                self.set_y(self.get_y()+1)

        cur_bk=cur_ch=None
        ch_verses=[]
        for v in pgp:
            if v['book']=='PGP Intro': continue
            bk,ch=v['book'],v['chapter']
            if bk!=cur_bk or ch!=cur_ch:
                if ch_verses:
                    self.render_chapter_block(ch_verses,cur_bk)
                    ch_verses=[]
                if bk!=cur_bk:
                    cur_bk=bk; cur_ch=None
                    self.book_title(bk)
                    self.start_two_col()
                cur_ch=ch
                if bk not in SINGLE_CH or ch!=1:
                    self.chapter(ch)
            ch_verses.append(v)
        if ch_verses: self.render_chapter_block(ch_verses,cur_bk)
        print(f"PGP: {self.cpg} pages")
        self.draw_hf()

    def toc_body(self):
        entries=[('נפי א׳','1 Nephi'),('נפי ב׳','2 Nephi'),('יעקב','Jacob'),
                 ('אנוש','Enos'),('ירום','Jarom'),('עמני','Omni'),
                 ('דברי מורמון','Words of Mormon'),('מושיה','Mosiah'),
                 ('אלמא','Alma'),('הילמן','Helaman'),('נפי ג׳','3 Nephi'),
                 ('נפי ד׳','4 Nephi'),('מורמון','Mormon'),('אתר','Ether'),
                 ('מורוני','Moroni')]
        return '\n'.join(f"{h}\t{heb(self.bkp.get(k,0))}" for h,k in entries if self.bkp.get(k,0)>0)

    def generate(self):
        bom,hdg,fm,cols=ld_bom(),ld_hdg(),ld_fm(),ld_col()
        dc,chron,pgp,dch=ld_dc(),ld_chr(),ld_pgp(),ld_dch()

        # Pass 1: dry run for TOC
        print("Pass 1...")
        dry=Doc()
        dry.pg_add(); dry.cpg=1; dry.apg=1; dry.set_y(TY)
        dry.render(bom,hdg,cols,dc,pgp,chron,dch)
        toc=dry.toc_body()

        # Pass 2: real PDF
        print("Pass 2...")
        fp=0
        self.pg_add(); fp+=1
        self.pg_add(); fp+=1
        self.pg_add(); fp+=1  # half title
        self.set_font('D','B',24)
        tw=self.get_string_width('כתבי הקדש')
        self.set_xy(PW/2-tw/2,PH*0.35); self.cell(tw,10,'כתבי הקדש')
        self.set_font('D','',13)
        sub='ספר מורמון · תורה ובריתות · פנינת המחיר הגדול'
        tw2=self.get_string_width(sub)
        self.set_xy(PW/2-tw2/2,PH*0.35+12); self.cell(tw2,8,sub)
        self.pg_add(); fp+=1
        self.pg_add(); fp+=1  # full title
        self.set_font('D','B',24)
        self.set_xy(PW/2-tw/2,PH*0.35); self.cell(tw,10,'כתבי הקדש')
        self.set_font('D','',13)
        self.set_xy(PW/2-tw2/2,PH*0.35+12); self.cell(tw2,8,sub)
        cx=PW/2
        self.set_draw_color(136); self.set_line_width(0.25)
        self.line(cx-28,PH*0.35-8,cx+28,PH*0.35-8)
        self.line(cx-22,PH*0.35+22,cx+22,PH*0.35+22)
        self.set_draw_color(0)
        for txt,st,sz,yp in [('תרגם ללשון המקרא בידי','B',11,PH-42),('כריס לאמב','',11,PH-37),
                              ('מהדורה עברית ראשונה  ·  תשפ״ו','',8,PH-30),('כל הזכויות שמורות © תשפ״ו','',7,PH-26)]:
            self.set_font('D',st,sz); tw3=self.get_string_width(txt); self.set_xy(cx-tw3/2,yp); self.cell(tw3,5,txt)

        for i,sec in enumerate(fm):
            if i<=1 or i==9: continue
            self.pg_add(); fp+=1
            fp=self.fm_page(sec.get('header',''),sec.get('body',''),fp)

        self.pg_add(); fp+=1
        fp=self.fm_toc(toc,fp)

        if fp%2==1: self.pg_add(); fp+=1

        self.cpg=1; self.apg=fp+1; self.col=0; self.pv=[]; self.bkp={}; self.csy=TY
        self.pg_add(); self.apg=fp+1
        self.set_y(TY)
        self.render(bom,hdg,cols,dc,pgp,chron,dch)
        print(f"Total: {self.cpg} content pages")


if __name__=='__main__':
    out='C:/Users/chris/Desktop/Hebrew_Triple_v4.pdf'
    d=Doc(); d.generate(); d.output(out)
    print(f"Output: {out}")
