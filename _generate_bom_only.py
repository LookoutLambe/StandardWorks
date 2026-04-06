#!/usr/bin/env python3
"""Generate BOM-only PDF with KDP-safe margins (0.625" both sides for 301-500pp)."""
import sys
sys.path.insert(0, 'C:/Users/chris/Desktop/Standard Works Project')
exec(open('C:/Users/chris/Desktop/Standard Works Project/_generate_triple_v4.py', encoding='utf-8').read().split("if __name__=='__main__':")[0])

# Both margins 0.625" — KDP safe regardless of binding direction
GUT=19.05  # 0.625 inch
OUT=9.525  # 0.625 inch — same as gutter so both sides pass
MT=8; MB=8
BOT=PH-MB

class BOMDoc(Doc):
    def __init__(self):
        super().__init__()
    def lm(self): return OUT if self.apg%2==1 else GUT
    def rm(self): return GUT if self.apg%2==1 else OUT

    def generate_bom(self):
        bom,hdg,fm,cols=ld_bom(),ld_hdg(),ld_fm(),ld_col()
        print("Pass 1...")
        dry=BOMDoc()
        dry.pg_add(); dry.cpg=1; dry.apg=1; dry.set_y(TY)
        cur_bk=cur_ch=None; ch_verses=[]
        for v in bom:
            bk,ch=v['book'],v['chapter']
            if bk!=cur_bk or ch!=cur_ch:
                if ch_verses: dry.render_chapter_block(ch_verses,cur_bk); ch_verses=[]
                if bk!=cur_bk:
                    cur_bk=bk; cur_ch=None; dry.book_title(bk)
                    if bk in cols: dry.colophon(cols[bk])
                    dry.start_two_col()
                cur_ch=ch; h=clean_hdg(hdg.get(f"{bk} {ch}"))
                if bk not in SINGLE_CH or ch!=1: dry.chapter(ch,h)
            ch_verses.append(v)
        if ch_verses: dry.render_chapter_block(ch_verses,cur_bk)
        toc=dry.toc_body()
        print(f"  BOM: {dry.cpg} pages")

        print("Pass 2...")
        fp=0
        self.pg_add(); fp+=1
        self.pg_add(); fp+=1
        self.pg_add(); fp+=1  # half title
        def ctr(y,t,s='',sz=12):
            self.set_font('D',s,sz); tw=self.get_string_width(t)
            self.set_xy(PW/2-tw/2,y); self.cell(tw,8,t)
        ctr(PH*0.38,'ספר מורמון','B',24)
        ctr(PH*0.38+12,'עדות נוספת לישוע המשיח','',13)
        self.pg_add(); fp+=1
        self.pg_add(); fp+=1  # full title
        ctr(PH*0.38,'ספר מורמון','B',24)
        ctr(PH*0.38+12,'עדות נוספת לישוע המשיח','',13)
        cx=PW/2
        self.set_draw_color(136); self.set_line_width(0.25)
        self.line(cx-28,PH*0.38-8,cx+28,PH*0.38-8)
        self.line(cx-22,PH*0.38+22,cx+22,PH*0.38+22)
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
        self.pg_add(); self.apg=fp+1; self.set_y(TY)
        cur_bk=cur_ch=None; ch_verses=[]
        for v in bom:
            bk,ch=v['book'],v['chapter']
            if bk!=cur_bk or ch!=cur_ch:
                if ch_verses: self.render_chapter_block(ch_verses,cur_bk); ch_verses=[]
                if bk!=cur_bk:
                    cur_bk=bk; cur_ch=None; self.book_title(bk)
                    if bk in cols: self.colophon(cols[bk])
                    self.start_two_col()
                cur_ch=ch; h=clean_hdg(hdg.get(f"{bk} {ch}"))
                if bk not in SINGLE_CH or ch!=1: self.chapter(ch,h)
            ch_verses.append(v)
        if ch_verses: self.render_chapter_block(ch_verses,cur_bk)
        self.draw_hf()
        print(f"  BOM: {self.cpg} pages")

out='C:/Users/chris/Desktop/Hebrew_BOM_Sefer_Mormon_ONLY.pdf'
d=BOMDoc(); d.generate_bom(); d.output(out)
print(f"Output: {out}")
