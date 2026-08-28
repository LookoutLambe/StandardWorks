# -*- coding: utf-8 -*-
import re,pickle,collections,json,sys
def strip_pts(s): return re.sub(r'[֑-ׇ]','',s)
SCR='/private/tmp/claude-501/-Users-chrislambe-Desktop-untitled-folder/cd0c051d-11f0-4cd4-bda7-f780f38d44b0/scratchpad/'
REPO='/Users/chrislambe/Desktop/untitled folder/Escrituras/'
import glob
pointed=collections.defaultdict(collections.Counter)
gloss=collections.defaultdict(collections.Counter)
for _f in glob.glob(REPO+'*_verses/*.js')+glob.glob(REPO+'bom/verses/*.js'):
    _s=open(_f,encoding='utf-8').read()
    for _m in re.finditer(r'\["([^"]+)","([^"]*)"\]',_s):
        _h,_g=_m.group(1),_m.group(2)
        if not re.search(r'[א-ת]',_h): continue
        _h=_h.rstrip('׃').strip()
        if not _h: continue
        pointed[strip_pts(_h).replace('־','')][_h]+=1
        if _g.strip(): gloss[_h][_g.strip()]+=1
s=open(REPO+'bom/chapter_headings_heb.js',encoding='utf-8').read()
for v in re.findall(r'":\s*"((?:[^"\\]|\\.)*)"',s):
    for w in re.split(r'[\s—–]+',v):
        w=re.sub(r'^[("\'״]+|[)."\',;:״?]+$','',w)
        if re.search(r'[א-ת]',w): pointed[strip_pts(w).replace('־','')][w]+=5
s2=open(REPO+'bom/bom.html',encoding='utf-8').read()
j=s2.find('var _headGloss'); end=s2.find('};',j)
for m in re.finditer(r"'([^']+)':'([^']*)'",s2[j:end]):
    h,g=m.group(1),m.group(2)
    if re.search(r'[א-ת]',h):
        gloss[h][g]+=50
        pointed[strip_pts(h).replace('־','')][h]+=5
best_p={k:c.most_common(1)[0][0] for k,c in pointed.items()}
def pick_gloss(p):
    c=gloss.get(p)
    if not c: return ''
    for g,n in c.most_common(6):
        if re.fullmatch(r'[A-Z][a-z]{0,4}\.',g): continue
        return g
    return c.most_common(1)[0][0]
def variants(b):
    out=[]
    for i in range(1,len(b)-1):
        if b[i] in 'וי': out.append(b[:i]+b[i+1:])
    return out
import os


VOLHAND={
 'nt': {
  'מסיים':('מְסַיֵּם','concludes'),'בכוחה':('בְּכֹחָהּ','by the power'),'היא':('הִיא','she'),
  'יעקב':('יַעֲקֹב','James'),'מטרף':('מְטֹרָף','a lunatic'),'מטורף':('מְטֹרָף','a lunatic'),'הקרוב':('הַקָּרוֹב','coming'),
  'ומשלם':('וּמְשַׁלֵּם','and pays'),'למרים':('לְמִרְיָם','to Mary'),'מציין':('מְצַיֵּן','acclaims'),
  'בפרושים':('בַּפְּרוּשִׁים','the Pharisees'),'להידרש':('לְהִדָּרֵשׁ','required'),
  'שסימנים':('שֶׁסִּימָנִים','that signs'),'מתקיימים':('מִתְקַיְּמִים','endure'),
  'הציווי':('הַצִּוּוּי','the commandment'),'נישואי':('נִשּׂוּאֵי','the marriage of'),
  'מופיע':('מוֹפִיעַ','appears'),'שולח':('שׁוֹלֵחַ','sends'),'נותן':('נוֹתֵן','gives'),
  'ונותן':('וְנוֹתֵן','and gives'),'מצווה':('מְצַוֶּה','commands'),'תשפוט':('תִּשְׁפֹּט','judge'),
  'בקש':('בַּקֵּשׁ','ask'),'כגדול':('כַּגָּדוֹל','as greater'),'עשוי':('עָשׂוּי','may be'),
  'מלמד':('מְלַמֵּד','teaches'),'מנבא':('מְנַבֵּא','prophesies'),'משבח':('מְשַׁבֵּחַ','praises'),
  'מכריז':('מַכְרִיז','proclaims'),'מגלה':('מְגַלֶּה','reveals'),'סולח':('סוֹלֵחַ','forgives'),
  'מאכיל':('מַאֲכִיל','feeds'),'מרפא':('מְרַפֵּא','heals'),'מגרש':('מְגָרֵשׁ','casts out'),
  'ומטיף':('וּמַטִּיף','and preaches'),'מטיף':('מַטִּיף','preaches'),'מטיפים':('מַטִּיפִים','preach'),
  'מזהיר':('מַזְהִיר','warns'),'מסביר':('מַסְבִּיר','explains'),'שואל':('שׁוֹאֵל','asks'),
  'עונה':('עוֹנֶה','answers'),'מברך':('מְבָרֵךְ','blesses'),'בוחר':('בּוֹחֵר','chooses'),
  'ומסמיך':('וּמַסְמִיךְ','and ordains'),'מסמיך':('מַסְמִיךְ','ordains'),
  'קדושים':('קְדוֹשִׁים','saints'),'הקדושים':('הַקְּדוֹשִׁים','the saints'),
  'אמיתיים':('אֲמִתִּיִּים','true'),'צריכים':('צְרִיכִים','should'),
 }
}

def context_rule(vol,prev,b,nxt):
    """Homographs the flat map cannot decide: the neighbouring words do."""
    if b=='ממרים': return ('מִמִּרְיָם','of Mary')
    if b=='מרים' and vol=='nt': return ('מִרְיָם','Mary')
    if b=='פול': return ('פּוֹל','Paul')
    if b in ('מסים','מסיים','מיסים'):
        if nxt=='את': return ('מְסַיֵּם','concludes')
        return ('מִסִּים','taxes')
    if b=='משלם': return ('מְשַׁלֵּם','pays')
    if b=='תשלם': return ('תַּשְׁלוּם','the paying of')
    if b=='גוביי': return ('גּוֹבֵי','gatherers of')
    if b=='אוכל' and vol=='nt': return ('אוֹכֵל','eats')
    if b=='עם' and (prev in ('אוכל','מופיע','לאכול','סועד') or nxt in ('חוטאים','גוביי','גוף','מכשול')):
        return ('עִם','with')
    if b=='דן' and vol=='nt': return ('דָּן','discusses')
    if b=='רכב' and vol=='nt': return ('רוֹכֵב','rides')
    if b=='מספר' and nxt=='על': return ('מְסַפֵּר','tells')
    if b=='עולה' and (nxt or '').startswith('ל'): return ('עוֹלֶה','ascends')
    if b=='שנים' and nxt=='עשר': return ('שְׁנֵים־','the Twelve')
    if b=='עשר':
        if prev=='שנים': return ('עָשָׂר','')
        return ('עֶשֶׂר','ten')
    if b=='שטן' and vol=='nt': return ('שָׂטָן','a devil')
    if b=='רוח' and nxt in ('הקדש','הקודש'): return ('רוּחַ','the Ghost')
    if nxt is None and prev=='רוח' and b in ('הקדש','הקודש'): return None
    if b in ('הקדש','הקודש') and prev=='רוח': return ('הַקֹּדֶשׁ','the Holy')
    if b=='יהודה' and vol=='nt': return ('יְהוּדָה','Judas')
    if b=='זכה': return ('זוֹכֶה','is accorded')
    if b=='מעיד': return ('מֵעִיד','testifies')
    if b=='ואומר': return ('וְאוֹמֵר','and says')
    if b=='בצורה': return ('בְּצוּרָה','in a manner')
    if b=='מופלאה': return ('מֻפְלָאָה','miraculous')
    if b=='בגט' and nxt=='שמנים': return ('בְּגַת','in Geth-')
    if b=='שמנים' and prev=='בגט': return ('שְׁמָנִים','semane')
    if b=='משחרר': return ('מְשֻׁחְרָר','is released')
    if b=='להציל' and vol=='nt': return ('לְהַצִּיל','to save')
    if b in ('חלק','חלוק') and nxt=='כבוד': return ('חֲלֹק','render')
    if b=='בחיי': return ('בְּחַיֵּי','in the life of')
    if b=='קם': return ('קָם','is risen')
    if b=='מצדק': return ('מֻצְדָּק','is justified')
    if b=='אל' and nxt and nxt[:1]=='ת': return ('אַל','not')
    if b=='נשואים': return ('נִשּׂוּאִים','marriage')
    if b=='אמתיים': return ('אֲמִתִּיִּים','true')
    if b=='בכחה': return ('בְּכֹחָהּ','by the power')
    if b=='בעלי' and nxt=='הבעל': return ('בַּעֲלֵי','the husbandmen of')
    if b=='הבעל' and prev=='בעלי': return ('הַכֶּרֶם','the vineyard')
    return None

HAND=eval(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'heading_hand_map.py'),encoding='utf-8').read())
def lookup(core):
    b=strip_pts(core).replace('־','')
    if b in HAND: return HAND[b]
    if b in best_p:
        p=best_p[b]; return (p,pick_gloss(p))
    for v in variants(b):
        if v in best_p:
            p=best_p[v]; return (p,pick_gloss(p))
    return None
FILES={'ot':('ot_chapter_headings_heb.js','_otHeadingWords','ot_heading_words.js'),
       'nt':('nt_chapter_headings_heb.js','_ntHeadingWords','nt_heading_words.js'),
       'dc':('dc_chapter_headings_heb.js','_dcHeadingWords','dc_heading_words.js'),
       'pgp':('pgp_chapter_headings_heb.js','_pgpHeadingWords','pgp_heading_words.js')}
missAll=collections.Counter()
for vol,(f,outvar,outfile) in FILES.items():
    s=open(REPO+f,encoding='utf-8').read()
    entries=re.findall(r'"((?:[^"\\]|\\.)+)":\s*"((?:[^"\\]|\\.)*)"',s)
    out={}; tot=0; hit=0
    for label,text in entries:
        text=text.replace('\\"','"')
        words=[]
        for tok in re.split(r'(\s+|—|–(?!\d))',text):
            tok=(tok or '').strip()
            if not tok: continue
            if tok in ('—','–'): words.append(['—','']); continue
            core=re.sub(r'^[(\"״]+|[)\"״]+$','',tok)
            trail=''
            m=re.match(r'^(.*?)([.,;:?!]+)$',core)
            if m: core,trail=m.group(1),m.group(2)
            if not re.search(r'[א-ת]',core):
                words.append([tok,'']); continue
            if re.fullmatch(r"[ובלכשמ]?ה['׳]",core):
                pre=core[0] if core[0] in 'ובלכשמ' else ''
                g={'ו':'and the LORD','ב':'in the LORD','ל':'to the LORD','מ':'from the LORD'}.get(pre,'the LORD')
                words.append([core.replace("'",'׳')+trail,g]); tot+=1; hit+=1; continue
            tot+=1
            _b=strip_pts(core).replace('־','')
            _pb=strip_pts(words[-1][0]).replace('־','').rstrip('.,;:') if words and re.search(r'[א-ת]',words[-1][0]) else ''
            _toks_ahead=[t for t in re.split(r'(?:\s+|—|–(?!\d))',text[text.find(tok)+len(tok):]) if t and t.strip()]
            _nb=None
            for _t in _toks_ahead:
                _t2=re.sub(r'^[(\"״]+|[)\"״.,;:?!]+$','',_t)
                if re.search(r'[א-ת]',_t2): _nb=strip_pts(_t2).replace('־',''); break
            r=context_rule(vol,_pb,_b,_nb) or (VOLHAND.get(vol,{}).get(_b)) or lookup(core)
            if r: hit+=1; words.append([r[0]+trail,r[1]])
            else:
                missAll[strip_pts(core)]+=1
                words.append([core+trail,''])
        out[label]=words
    src='// generated: pointed and glossed heading words from the corpus\'s own vocabulary\n'
    src+='window.%s = '%outvar+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
    open(REPO+outfile,'w',encoding='utf-8').write(src)
    print('%s: %d/%d = %.1f%%'%(vol,hit,tot,100*hit/tot))
json.dump(missAll.most_common(400),open(SCR+'heading_misses.json','w'),ensure_ascii=False)
print('distinct misses:',len(missAll),'instances:',sum(missAll.values()))
