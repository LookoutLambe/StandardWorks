# -*- coding: utf-8 -*-
#
# ⚠ DO NOT RE-RUN THIS BLIND. Verified 2026-09-06: regenerating rewrites
# 2,132 tokens across 992 chapters in all four volumes, and some of those are
# REGRESSIONS of hand corrections that live only in the generated files —
# בְּצַלְמוֹ goes back from "in His own image" to "after his own image" (the
# wording the user had simplified), יְדֵי "the hands of" becomes יָדִי "my hand",
# and PGP's "thou art created" becomes "you are created" (a D&C-only rule).
# Coverage also drops from 100% to 99.7-99.9%, 29 misses.
#
# The generated {ot,nt,dc,pgp}_heading_words.js are downstream of hand work the
# generator cannot reproduce. To change a heading, EDIT BOTH FILES BY HAND:
# the unpointed *_chapter_headings_heb.js (which feeds the Dual paragraph) and
# the pointed *_heading_words.js (which feeds the interlinear). If this tool is
# ever needed again, diff every volume against git before keeping the output.
#
import re,pickle,collections,json,sys
def strip_pts(s): return re.sub(r'[֑-ׇ]','',s)
# diagnostics land in the OS temp dir — this used to be a hardcoded session
# scratchpad that no longer exists, so the run died after writing its output.
import tempfile, os as _os
SCR=_os.path.join(tempfile.gettempdir(),'')
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
    # headings carry no English punctuation: strip what the verse gloss dragged in
    def _cl(g): return re.sub(r'^[\s.,;:!?]+|[\s.,;:!?]+$','',g)
    for g,n in c.most_common(6):
        if re.fullmatch(r'[A-Z][a-z]{0,4}\.',g): continue
        return _cl(g)
    return _cl(c.most_common(1)[0][0])
def variants(b):
    out=[]
    for i in range(1,len(b)-1):
        if b[i] in 'וי': out.append(b[:i]+b[i+1:])
    return out
import os


VOLHAND={
 'dc': {
  'להפוך':('לַהֲפֹךְ','to become'),
  'ביושר':('בְּיֹשֶׁר','honestly'),
  'לכינוס':('לְכִנּוּס','for the conference'),
  'מונחים':('מֻנְחִים','are instructed'),
  'נדחית':('נִדְחֵית','is deferred'),
  'ניסיון':('נִסָּיוֹן','experience'),
  'לערוך':('לַעֲרֹךְ','to make'),
  'ייתן':('יִתֵּן','grant'),
  'מלאכי':('מַלְאָכִי','Malachi'),
  'הכינוס':('הַכִּנּוּס','the conference'),
  'חותך':('חוֹתֵךְ','renders'),
  'שעליהם':('שֶׁעֲלֵיהֶם','what they should'),
  'תיעוד':('תִּעוּד','an account of'),
 },
 'ot': {
  'המשיח':('הַמָּשִׁיחַ','the Messiah'),'ימלוך':('יִמְלוֹךְ','will reign'),
 },
 'nt': {
  'בעניין':('בְּעִנְיַן','concerning'),
  'ציות':('צִיּוּת','obedience'),
  'שניתן':('שֶׁנִּתָּן','that is given'),
  'מושחת':('מוֹשַׁחַת','anoints'),
  'תהילתו':('תְּהִלָּתוֹ','his glory'),
  'ומוקצה':('וּמֻקְצֶה','and is allotted'),
  'ביטחון':('בִּטָּחוֹן','assurance'),
  'נקבעו':('נִקְבְּעוּ','are foreordained'),
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
  'אישה':('אִשָּׁה','a woman'),'מאישה':('מֵאִשָּׁה','out of a woman'),'בקברו':('בְּקִבְרוֹ','in the tomb'),
  'למתים':('לַמֵּתִים','to the dead'),'לעדר':('לְעֵדֶר','into a herd of'),'עיני':('עֵינֵי','the eyes of'),
  'זרעי':('זַרְעֵי','the seed of'),'בשולי':('בְּשׁוּלֵי','the hem of'),'מבתה':('מִבִּתָּהּ','from the daughter of'),
  'יונית':('יְוָנִית','Greek'),'שיקראו':('שֶׁיִּקְרְאוּ','whom they will call'),'מבשרים':('מְבַשְּׂרִים','herald'),
  'חזרו':('חִזְרוּ','repent'),'מטבע':('מַטְבֵּעַ','the piece of'),'אציל':('אָצִיל','a nobleman'),
  'הייתי':('הָיִיתִי','was'),'צאני':('צֹאנִי','my sheep'),'גברים':('גְּבָרִים','men'),
  'כושי':('כּוּשִׁי','Ethiopian'),'מכשף':('מְכַשֵּׁף','a sorcerer'),'דיאנה':('דִּיאָנָה','Diana'),
  'רומי':('רוֹמִי','Roman'),'פרוש':('פָּרוּשׁ','a Pharisee'),'במסע':('בְּמַסָּע','in a voyage'),
  'המשמעת':('הַמִּשְׁמַעַת','discipline'),'לחמוד':('לַחְמֹד','covet'),'ונראה':('וְנִרְאָה','and was seen'),
  'שליחי':('שְׁלִיחֵי','apostles of'),'בנויה':('בְּנוּיָה','is built'),'וטהורים':('וּטְהוֹרִים','and chaste'),
  'מנחים':('מַנְחִים','guide'),'נעלה':('נַעֲלֶה','above'),'נמשיך':('נַמְשִׁיךְ','let us go on'),
  'אבי':('אֲבִי','the Father of'),'בפיתוי':('בְּפִתּוּי','temptation'),'והמוכס':('וְהַמּוֹכֵס','and the publican'),
  'הראשיים':('הָרָאשִׁיִּים','chief'),'כנביא':('כַּנָּבִיא','as the prophet'),'ונוסע':('וְנוֹסֵעַ','and travels'),
  'חטאינו':('חֲטָאֵינוּ','our sins'),'ינצל':('יִנָּצֵל','will be saved'),'חיו':('חֲיוּ','live'),
  'בעלים':('בְּעָלִים','husbands'),'בכהונה':('בַּכְּהֻנָּה','the priesthood'),'עבורנו':('עֲבוּרֵנוּ','to us'),
  'אהבו':('אֶהֱבוּ','love'),'בחזרה':('בַּחֲזָרָה','back'),'מאביו':('מֵאָבִיו','from His Father'),
  'בנבואה':('בִּנְבוּאָה','prophetically'),'והזונין':('וְהַזּוֹנִין','and the tares'),'החרדל':('הַחַרְדָּל','the mustard'),
  'במשלים':('בִּמְשָׁלִים','in parables'),'ברטימי':('בַּרְטִימַי','Bartimaeus'),'אנדרי':('אַנְדְּרַי','Andrew'),
  'תומא':('תּוֹמָא','Thomas'),'וסילא':('וְסִילָא','and Silas'),'בראבא':('בַּר־אַבָּא','Barabbas'),
  'הרמתי':('הָרָמָתִי','of Arimathaea'),'אריופגוס':('אַרְיוֹפָּגוֹס','Areopagus'),'סקוה':('סְקֵוָה','Sceva'),
  'מורה':('מוֹרֶה','instructs'),'לזכריה':('לִזְכַרְיָה','to Zacharias'),'כורזין':('כּוֹרָזִין','Chorazin'),
  'הגליל':('הַגָּלִיל','Galilee'),'והפרושים':('וְהַפְּרוּשִׁים','and the Pharisees'),'ליין':('לְיַיִן','into wine'),
  'נסקל':('נִסְקָל','is stoned'),'עלינו':('עָלֵינוּ','we ought'),'לירושלים':('לִירוּשָׁלַיִם','to Jerusalem'),
  'ומקים':('וּמֵקִים','and raises'),'מקים':('מֵקִים','raises'),'וקורא':('וְקוֹרֵא','and calls'),
  'פוקח':('פּוֹקֵחַ','opens'),'יאיר':('יָאִיר','Jairus'),'בבגדיו':('בִּבְגָדָיו','His garments'),
  'ובקדושה':('וּבַקְּדֻשָּׁה','and in holiness'),'שומר':('שׁוֹמֵר','keeps'),'נבגד':('נִבְגָּד','is betrayed'),'מכחיש':('מַכְחִישׁ','denies'),
  'מכיר':('מַכִּיר','knows'),'לצוד':('לָצוּד','to catch'),'מצורע':('מְצֹרָע','a leper'),
  'זקוקים':('זְקוּקִים','need'),'בנאדות':('בְּנֹאדוֹת','in bottles'),'נכה':('נְכֵה','sick of'),
  'אברים':('אֵבָרִים','the palsy'),'קיפא':('קַיָּפָא','Caiaphas'),'מוכה':('מֻכֶּה','is smitten'),
 }
}

def context_rule(vol,prev,b,nxt):
    """Homographs the flat map cannot decide: the neighbouring words do."""
    if b=='ממרים': return ('מִמִּרְיָם','of Mary')
    if b=='אלי' and vol=='ot':
        if nxt in ('שקר','השקר'): return ('אֱלֵי','the gods of')
        if nxt=='אלי' or prev=='אלי': return ('אֵלִי','My God')
        return ('עֵלִי','Eli')
    if b=='אמורים' and (prev=='חיתים' or nxt=='כנענים'): return ('אֱמוֹרִים','Amorites')
    if b=='שם' and nxt in ('חם','וחם'): return ('שֵׁם','Shem')
    if b=='ושם' and nxt=='שממנו': return ('וְשֵׁם','and Shem')
    if b=='אדם' and (nxt in ('וחוה','מוליד','עומד','נותן','הם','אוכלים','מקריב') or prev in ('ואחריה','הם','היומין','את')): return ('אָדָם','Adam')
    if b=='אלוהיות' and prev=='תכונות': return ('אֱלֹהִיּוֹת','godly')
    if b=='בעניין' and nxt=='העניים': return ('בְּעִנְיַן','the cause of')
    if b=='ציות' and nxt=='המלכים': return ('צִיּוּת','the obedience of')
    if b=='היירם' and nxt and nxt.startswith('פייג'): return ('הַיְירָם','Hiram')
    if b=='שיבת' and nxt=='ציון': return ('שִׁיבַת','the return of')
    if b=='מוכה' and nxt=='ירח': return ('מֻכֵּה','struck by')
    if b=='מודה':
        if prev=='איוב': return ('מוֹדֶה','admits')
        return ('מוֹדֶה','gives thanks')
    if b=='מרים' and vol=='nt': return ('מִרְיָם','Mary')
    if b=='פול': return ('פּוֹל','Paul')
    if b in ('מסים','מסיים','מיסים'):
        if nxt=='את': return ('מְסַיֵּם','concludes')
        return ('מִסִּים','taxes')
    if b=='משלם': return ('מְשַׁלֵּם','pays')
    if b=='תשלם': return ('תַּשְׁלוּם','the paying of')
    if b=='גוביי': return ('גּוֹבֵי','gatherers of')
    if b=='אוכל' and vol=='nt': return ('אוֹכֵל','eats')
    if b=='עם' and (prev in ('אוכל','מופיע','לאכול','סועד','שהלך') or nxt in ('חוטאים','גוביי','גוף','מכשול')):
        return ('עִם','with')
    if b=='דן' and vol=='nt': return ('דָּן','discusses')
    if b=='רכב' and vol=='nt': return ('רוֹכֵב','rides')
    if b=='מספר' and nxt=='על': return ('מְסַפֵּר','tells')
    if b=='עולה' and (nxt or '').startswith('ל'): return ('עוֹלֶה','ascends')
    if b=='שנים' and nxt=='עשר': return ('שְׁנֵים־','the Twelve')
    if b=='עשר':
        if prev in ('שנים','והשנים','השנים','לשנים','משנים'): return ('עָשָׂר','')
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
    if b=='בגת' and nxt=='שמנים': return ('בְּגַת','in Geth-')
    if b=='שמנים' and prev=='בגת': return ('שְׁמָנִים','semane')
    if b=='סעודת' and nxt in ('הקדש','הקודש'): return ('סְעוּדַת','the supper of')
    if b=='במשכב' and nxt=='זכר': return ('בְּמִשְׁכַּב','in the lying with')
    if b=='שמי' and nxt=='שמאמין': return ('שֶׁמִּי','that whosoever')
    if b=='זכר' and prev=='במשכב': return ('זָכָר','a male')
    if b in ('הקדש','הקודש') and prev=='סעודת': return ('הַקֹּדֶשׁ','the Holy')
    if b=='עלי' and nxt=='אדמות': return ('עֲלֵי','on')
    if b=='אדמות' and prev=='עלי': return ('אֲדָמוֹת','earth')
    if b=='מתי' and nxt=='נקרא': return ('מַתַּי','Matthew')
    if b=='למתי': return ('לְמַתַּי','Matthew')
    if b=='חדשים' and prev in ('נאדות','בנאדות'): return ('חֲדָשִׁים','new')
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
        _all=[t for t in re.split(r'(?:\s+|—|–(?!\d))',text) if t and t.strip()]
        _ti=-1
        for tok in re.split(r'(\s+|—|–(?!\d))',text):
            tok=(tok or '').strip()
            if not tok: continue
            if tok in ('—','–'): words.append(['—','']); continue
            # The Hebrew line carries no English punctuation: commas, periods
            # and the rest are dropped from Hebrew tokens (the user's rule —
            # "it's Hebrew, strip the English punctuation"). A trailing sof
            # pasuq becomes its own token, exactly as in the verses.
            # Strip edge wrappers repeatedly: ')' hides behind ',' in 'word),'.
            core=tok; sof=False
            while True:
                nxt=re.sub(r'^[(\"״“”‘’„]+|[)\"״“”‘’„]+$','',core)
                if nxt.endswith('׃'): sof=True; nxt=nxt[:-1]
                nxt=re.sub(r'[.,;:?!]+$','',nxt)
                if nxt==core: break
                core=nxt
            trail=''
            if not re.search(r'[א-ת]',core):
                words.append([tok,'']); continue
            if re.fullmatch(r"[ובלכשמ]?ה['׳]",core):
                pre=core[0] if core[0] in 'ובלכשמ' else ''
                g={'ו':'and the LORD','ב':'in the LORD','ל':'to the LORD','מ':'from the LORD'}.get(pre,'the LORD')
                words.append([core.replace("'",'׳')+trail,g]); tot+=1; hit+=1; continue
            tot+=1
            _b=strip_pts(core).replace('־','')
            _pb=strip_pts(words[-1][0]).replace('־','').rstrip('.,;:') if words and re.search(r'[א-ת]',words[-1][0]) else ''
            _ti+=1
            while _ti < len(_all) and _all[_ti] != tok.strip(): _ti+=1
            _nb=None
            for _t in _all[_ti+1:]:
                _t2=re.sub(r'^[(\"״]+|[)\"״.,;:?!]+$','',_t)
                if re.search(r'[א-ת]',_t2): _nb=strip_pts(_t2).replace('־',''); break
            r=context_rule(vol,_pb,_b,_nb) or (VOLHAND.get(vol,{}).get(_b)) or lookup(core)
            if r: hit+=1; words.append([r[0],r[1]])
            else:
                missAll[strip_pts(core)]+=1
                words.append([core,''])
            if sof: words.append(['׃',''])
        out[label]=words
    src='// generated: pointed and glossed heading words from the corpus\'s own vocabulary\n'
    src+='window.%s = '%outvar+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
    open(REPO+outfile,'w',encoding='utf-8').write(src)
    print('%s: %d/%d = %.1f%%'%(vol,hit,tot,100*hit/tot))
json.dump(missAll.most_common(400),open(SCR+'heading_misses.json','w'),ensure_ascii=False)
print('distinct misses:',len(missAll),'instances:',sum(missAll.values()))
