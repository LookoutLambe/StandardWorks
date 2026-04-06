// generate_scripture_combined.js
// Standard Works — Hebrew Scripture Only (BOM + D&C + PGP)
// 6×9 KDP, two-column, full front matter for each section
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs   = require('fs');
const path = require('path');

const BOM_BASE = path.resolve(__dirname, '..');
const SW_BASE  = path.resolve(BOM_BASE, '..');
const DC_DIR   = path.join(SW_BASE, 'dc_verses');
const PGP_DIR  = path.join(SW_BASE, 'pgp_verses');

const frontMatter = require(path.join(BOM_BASE, 'front_matter.json'));

// ─── Local fonts ─────────────────────────────────────────────────────────────
const FONTS_PATH = path.join(__dirname, 'fonts').replace(/\\/g, '/');
const fontFaceCSS = `
@font-face{font-family:'David Libre';font-weight:400;src:url('file:///${FONTS_PATH}/DavidLibre-Regular.ttf') format('truetype');}
@font-face{font-family:'David Libre';font-weight:500;src:url('file:///${FONTS_PATH}/DavidLibre-Medium.ttf') format('truetype');}
@font-face{font-family:'David Libre';font-weight:700;src:url('file:///${FONTS_PATH}/DavidLibre-Bold.ttf') format('truetype');}
`;

// ─── Book metadata ────────────────────────────────────────────────────────────
const BOM_BOOKS = [
  { name:'1 Nephi',         hebrew:'נֶפִי א׳',              chapters:22 },
  { name:'2 Nephi',         hebrew:'נֶפִי ב׳',              chapters:33 },
  { name:'Jacob',           hebrew:'יַעֲקֹב',               chapters:7  },
  { name:'Enos',            hebrew:'אֱנוֹשׁ',               chapters:1  },
  { name:'Jarom',           hebrew:'יָרוֹם',                chapters:1  },
  { name:'Omni',            hebrew:'עָמְנִי',               chapters:1  },
  { name:'Words of Mormon', hebrew:'דִּבְרֵי מוֹרְמוֹן',    chapters:1  },
  { name:'Mosiah',          hebrew:'מוֹשִׁיָּה',            chapters:29 },
  { name:'Alma',            hebrew:'אַלְמָא',               chapters:63 },
  { name:'Helaman',         hebrew:'הֵילָמָן',              chapters:16 },
  { name:'3 Nephi',         hebrew:'נֶפִי ג׳',              chapters:30 },
  { name:'4 Nephi',         hebrew:'נֶפִי ד׳',              chapters:1  },
  { name:'Mormon',          hebrew:'מוֹרְמוֹן',             chapters:9  },
  { name:'Ether',           hebrew:'עֵתֶר',                 chapters:15 },
  { name:'Moroni',          hebrew:'מוֹרוֹנִי',             chapters:10 },
];
const PGP_BOOKS = [
  { name:'Moses',                hebrew:'מֹשֶׁה',                          chapters:8, file:'moses'            },
  { name:'Abraham',              hebrew:'אַבְרָהָם',                        chapters:5, file:'abraham'          },
  { name:'Joseph Smith—Matthew', hebrew:'יוֹסֵף סְמִית — מַתִּתְיָהוּ',    chapters:1, file:'js_matthew'       },
  { name:'Joseph Smith—History', hebrew:'יוֹסֵף סְמִית — הִיסְטוֹרְיָה',   chapters:1, file:'js_history'       },
  { name:'Articles of Faith',    hebrew:'עִקְרֵי הָאֱמוּנָה',              chapters:1, file:'articles_of_faith'},
];
const DC_FILES = [
  'dc1_10.js','dc11_20.js','dc21_30.js','dc31_40.js',
  'dc41_50.js','dc51_60.js','dc61_70.js','dc71_80.js',
  'dc81_90.js','dc91_100.js','dc101_110.js','dc111_120.js',
  'dc121_130.js','dc131_138.js',
];

// ─── Hebrew numerals ──────────────────────────────────────────────────────────
function hebrewNum(n) {
  if (!n || n <= 0) return '';
  const ones=['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  const tens=['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
  const hundreds=['','ק','ר','ש','ת','תק','תר','תש','תת'];
  if (n===15) return 'טו'; if (n===16) return 'טז';
  let r='';
  if (n>=100){r+=hundreds[Math.floor(n/100)];n%=100;}
  if (n>=10) {r+=tens[Math.floor(n/10)];n%=10;}
  if (n>0)   {r+=ones[n];}
  return r;
}

// ─── Page layout (6×9) ────────────────────────────────────────────────────────
const PAGE_W    = 6   * 72;
const PAGE_H    = 9   * 72;
const GUTTER    = 0.75* 72;
const OUTER     = 0.5 * 72;
const TOP_M     = 0.5 * 72;
const BOT_M     = 0.45* 72;
const COL_GAP   = 0.2 * 72;
const HEADER_H  = 16;
const HEADER_GAP= 4;
const CONTENT_H = PAGE_H - TOP_M - BOT_M - HEADER_H - HEADER_GAP;
const TEXT_W    = PAGE_W - GUTTER - OUTER;

// ─── Parsers ──────────────────────────────────────────────────────────────────
function parseDCFile(fp){
  if(!fs.existsSync(fp)) return {};
  const src=fs.readFileSync(fp,'utf8'); const out={};
  const re=/var\s+dc(\d+)_ch1Verses\s*=\s*(\[[\s\S]*?\]);\s*(?=\n|var\s|render|function|\}\))/g;
  let m; while((m=re.exec(src))!==null){try{out[parseInt(m[1])]=eval('('+m[2]+')');}catch(e){}}
  return out;
}
function parseVerseFile(fp){
  if(!fs.existsSync(fp)) return {chapters:{}};
  const src=fs.readFileSync(fp,'utf8'); const res={chapters:{}};
  const re=/var\s+(\w*ch(\d+)Verses)\s*=\s*(\[[\s\S]*?\]);\s*(?=\n|var\s|renderVerseSet|function|\}\))/g;
  let m; while((m=re.exec(src))!==null){try{const v=eval('('+m[3]+')');if(Array.isArray(v))res.chapters[parseInt(m[2])]=v;}catch(e){}}
  return res;
}
function parseNamedArray(fp,varName){
  if(!fs.existsSync(fp)) return [];
  const src=fs.readFileSync(fp,'utf8');
  const re=new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\]);\\s*(?=\\n|var\\s|render|function|\\}\\))`);
  const m=re.exec(src); if(!m) return [];
  try{return eval('('+m[1]+')');}catch(e){return [];}
}
function wordsToHebrew(words){
  return (words||[]).filter(w=>w[0]&&w[0]!=='׃'&&w[0]!==':').map(w=>w[0]).join(' ');
}

// ─── Shared CSS ────────────────────────────────────────────────────────────────
const sharedCSS = `
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'David Libre','David',serif;font-size:12pt;line-height:1.4;direction:rtl;background:white;color:#111;}
.bt{text-align:center;font-size:18pt;font-weight:700;padding:0 0 6pt;column-span:all;}
.ch{text-align:center;font-size:10pt;font-weight:700;padding:6pt 0 5pt;margin:4pt 0;break-after:avoid;}
.v{display:block;margin-bottom:3pt;text-align:justify;}
.vn{font-weight:700;font-size:0.85em;}`;

// Attach sof pasuk to last word so it never orphans onto its own line
function withSof(txt){
  const t=(txt||'').trim();
  const i=t.lastIndexOf(' ');
  if(i<0) return `<span style="white-space:nowrap">${t}\u05C3</span>`;
  return `${t.substring(0,i)} <span style="white-space:nowrap">${t.substring(i+1)}\u05C3</span>`;
}

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless:'new',
    args:['--no-sandbox','--disable-setuid-sandbox','--font-render-hinting=none'],
    protocolTimeout:3600000
  });

  // ── Step 1: Load data ────────────────────────────────────────────────────
  console.log('Step 1: Loading data...');
  const bomVerses = require(path.join(BOM_BASE,'official_verses.json'));

  const dcSections={};
  for(const f of DC_FILES) Object.assign(dcSections, parseDCFile(path.join(DC_DIR,f)));
  const dcIntroVerses = parseNamedArray(path.join(DC_DIR,'dc_intro.js'),'dcIntro_ch1Verses');
  const od1Verses     = parseNamedArray(path.join(DC_DIR,'od.js'),'od1_ch1Verses');
  const od2Verses     = parseNamedArray(path.join(DC_DIR,'od.js'),'od2_ch1Verses');
  const dcSecNums     = Object.keys(dcSections).map(Number).sort((a,b)=>a-b);

  const pgpParsed={};
  for(const b of PGP_BOOKS) pgpParsed[b.name]=parseVerseFile(path.join(PGP_DIR,b.file+'.js'));
  const pgpIntroVerses = parseNamedArray(path.join(PGP_DIR,'pgp_intro.js'),'pgpIntro_ch1Verses');

  console.log(`  BOM:${bomVerses.length}v  D&C:${dcSecNums.length}secs  PGP:${PGP_BOOKS.length}books`);

  // ── Step 2: Build elements (tagged with section) ─────────────────────────
  console.log('Step 2: Building elements...');
  const elements = [];

  // ═══ BOM ═══
  for(const book of BOM_BOOKS){
    elements.push({type:'bt', section:'bom', book:book.name, hebrew:book.hebrew, bookHebrew:book.hebrew});
    for(let ch=1;ch<=book.chapters;ch++){
      if(book.chapters>1)
        elements.push({type:'ch', section:'bom', book:book.name, bookHebrew:book.hebrew,
                       chapter:ch, hebrew:`פרק ${hebrewNum(ch)}`});
      const chVs=bomVerses.filter(v=>v.book===book.name&&v.chapter===ch).sort((a,b)=>a.verse-b.verse);
      for(const v of chVs){
        const text=v.hebrew.replace(/\u05C3/g,'').trim();
        elements.push({type:'v', section:'bom', book:book.name, bookHebrew:book.hebrew,
                       chapter:ch, verse:v.verse,
                       html:`<b class="vn">${hebrewNum(v.verse)}</b>\u00A0${withSof(text)}`});
      }
    }
  }
  const bomEndIdx = elements.length;

  // ═══ D&C ═══
  for(const n of dcSecNums){
    elements.push({type:'ch', section:'dc', book:'Doctrine & Covenants', bookHebrew:'תּוֹרָה וּבְרִיתוֹת',
                   chapter:n, hebrew:`סעיף ${hebrewNum(n)}`});
    for(const v of dcSections[n].filter(v=>v&&v.num&&v.num!=='׃'&&v.words&&v.words.length>0)){
      const txt=wordsToHebrew(v.words); if(!txt) continue;
      elements.push({type:'v', section:'dc', book:'Doctrine & Covenants', bookHebrew:'תּוֹרָה וּבְרִיתוֹת',
                     chapter:n, verse:v.num,
                     html:`<b class="vn">${v.num}</b>\u00A0${withSof(txt)}`});
    }
  }
  for(const [label,vers] of [['הַכְרָזָה רְשָׁמִית א׳',od1Verses],['הַכְרָזָה רְשָׁמִית ב׳',od2Verses]]){
    const vf=vers.filter(v=>v&&v.num&&v.num!=='׃'&&v.words&&v.words.length>0);
    if(!vf.length) continue;
    elements.push({type:'ch', section:'dc', book:'Doctrine & Covenants', bookHebrew:'תּוֹרָה וּבְרִיתוֹת',
                   chapter:0, hebrew:label});
    for(const v of vf){
      const txt=wordsToHebrew(v.words); if(!txt) continue;
      elements.push({type:'v', section:'dc', book:'Doctrine & Covenants', bookHebrew:'תּוֹרָה וּבְרִיתוֹת',
                     chapter:0, verse:v.num,
                     html:`<b class="vn">${v.num}</b>\u00A0${withSof(txt)}`});
    }
  }
  const dcEndIdx = elements.length;

  // ═══ PGP ═══
  for(const book of PGP_BOOKS){
    elements.push({type:'bt', section:'pgp', book:book.name, hebrew:book.hebrew, bookHebrew:book.hebrew});
    const parsed=pgpParsed[book.name];
    for(let ch=1;ch<=book.chapters;ch++){
      const chVs=parsed.chapters[ch];
      if(!chVs){console.warn(`  PGP missing ch${ch} in ${book.file}`);continue;}
      if(book.chapters>1)
        elements.push({type:'ch', section:'pgp', book:book.name, bookHebrew:book.hebrew,
                       chapter:ch, hebrew:`פרק ${hebrewNum(ch)}`});
      for(const v of chVs.filter(v=>v&&v.num&&v.num!=='׃'&&v.words&&v.words.length>0)){
        const txt=wordsToHebrew(v.words); if(!txt) continue;
        elements.push({type:'v', section:'pgp', book:book.name, bookHebrew:book.hebrew,
                       chapter:ch, verse:v.num,
                       html:`<b class="vn">${v.num}</b>\u00A0${withSof(txt)}`});
      }
    }
  }
  console.log(`  ${elements.length} elements (BOM:${bomEndIdx} DC:${dcEndIdx-bomEndIdx} PGP:${elements.length-dcEndIdx})`);

  // ── Step 3: Paginate ──────────────────────────────────────────────────────
  console.log('Step 3: Paginating...');

  let storageDivs='';
  for(let i=0;i<elements.length;i++){
    const el=elements[i];
    if(el.type==='bt')      storageDivs+=`<div class="bt" data-i="${i}">${el.hebrew}</div>\n`;
    else if(el.type==='ch') storageDivs+=`<div class="ch" data-i="${i}">${el.hebrew}</div>\n`;
    else                    storageDivs+=`<div class="v"  data-i="${i}">${el.html}</div>\n`;
  }

  const pagHtml=`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<style>${fontFaceCSS}${sharedCSS}
#storage{display:none;}
#test-col{width:${TEXT_W}pt;column-count:2;column-gap:${COL_GAP}pt;column-fill:auto;overflow:hidden;direction:rtl;}
</style></head><body>
<div id="storage">${storageDivs}</div><div id="test-col"></div></body></html>`;

  const pagPath=path.join(__dirname,'_sw_scr_pag.html');
  fs.writeFileSync(pagPath,pagHtml,'utf8');
  const pagPage=await browser.newPage();
  await pagPage.setViewport({width:1200,height:800});
  await pagPage.emulateMediaType('print');
  await pagPage.goto('file:///'+pagPath.replace(/\\/g,'/'), {waitUntil:'networkidle0',timeout:120000});
  await pagPage.evaluate(()=>document.fonts.ready);
  await new Promise(r=>setTimeout(r,3000));

  const elMeta=elements.map(el=>({type:el.type}));
  const pageAssignments=await pagPage.evaluate((meta,contentH_pt)=>{
    const ptToPx=96/72, contentH=contentH_pt*ptToPx;
    const testCol=document.getElementById('test-col');
    const storage=document.getElementById('storage');
    const elMap={};
    storage.querySelectorAll('[data-i]').forEach(el=>elMap[el.getAttribute('data-i')]=el);
    function overflows(){
      if(testCol.scrollWidth>testCol.clientWidth+1) return true;
      const last=testCol.lastElementChild; if(!last) return false;
      const cRect=testCol.getBoundingClientRect();
      for(const r of last.getClientRects()){
        if(r.left<cRect.left-1) return true;
        if(r.bottom>cRect.bottom+1) return true;
      }
      return false;
    }
    const pages=[]; let cur=0,total=meta.length;
    while(cur<total){
      const pageItems=[];
      testCol.innerHTML=''; testCol.style.height=contentH+'px';
      if(meta[cur].type==='bt'){testCol.appendChild(elMap[cur].cloneNode(true));pageItems.push(cur++);}
      while(cur<total){
        const el=meta[cur];
        if(el.type==='bt') break;
        const clone=elMap[cur].cloneNode(true); clone.removeAttribute('data-i');
        testCol.appendChild(clone);
        if(overflows()){testCol.removeChild(clone);break;}
        if(el.type==='ch'&&cur+1<total&&meta[cur+1].type==='v'){
          const nc=elMap[cur+1].cloneNode(true);nc.removeAttribute('data-i');
          testCol.appendChild(nc);const over=overflows();testCol.removeChild(nc);
          if(over){testCol.removeChild(clone);break;}
        }
        pageItems.push(cur++);
      }
      if(pageItems.length===0&&cur<total){pageItems.push(cur++);}
      if(pageItems.length===1&&meta[pageItems[0]].type==='ch'&&cur<total) pageItems.push(cur++);
      pages.push(pageItems);
    }
    return pages;
  },elMeta,CONTENT_H - 17);

  await pagPage.close();
  try{fs.unlinkSync(pagPath);}catch(e){}

  console.log(`  ${pageAssignments.length} body pages`);

  // Find section split points
  let dcStartPage=-1, pgpStartPage=-1;
  for(let p=0;p<pageAssignments.length;p++){
    for(const idx of pageAssignments[p]){
      if(dcStartPage<0 && elements[idx].section==='dc'){dcStartPage=p;break;}
      if(pgpStartPage<0 && elements[idx].section==='pgp'){pgpStartPage=p;break;}
    }
    if(dcStartPage>=0&&pgpStartPage>=0) break;
  }
  console.log(`  BOM pages: 0–${dcStartPage-1}  D&C pages: ${dcStartPage}–${pgpStartPage-1}  PGP pages: ${pgpStartPage}–${pageAssignments.length-1}`);

  // ── Step 4: Build page objects ────────────────────────────────────────────
  const pages=[];
  let curBookHeb='';
  for(const indices of pageAssignments){
    const pg={items:[],bookHebrew:'',startChapter:0,startVerse:'',endChapter:0,endVerse:'',section:''};
    for(const idx of indices){
      const el=elements[idx];
      pg.items.push(el);
      if(el.type==='bt'){curBookHeb=el.hebrew;}
      if(el.type==='v'&&el.chapter){
        if(!pg.startChapter){pg.startChapter=el.chapter;pg.startVerse=el.verse;}
        pg.endChapter=el.chapter;pg.endVerse=el.verse;
      }
      pg.bookHebrew=el.bookHebrew||curBookHeb;
      pg.section=el.section||pg.section;
    }
    pages.push(pg);
  }

  // ── Step 5: CSS + renderers ───────────────────────────────────────────────
  const cssBlock=`@page{size:${PAGE_W/72}in ${PAGE_H/72}in;margin:0;}
${sharedCSS}
.page{width:${PAGE_W}pt;height:${PAGE_H}pt;padding-top:${TOP_M}pt;padding-bottom:${BOT_M}pt;overflow:hidden;page-break-after:always;display:flex;flex-direction:column;}
.page:last-child{page-break-after:auto;}
.hdr{display:flex;justify-content:space-between;flex-shrink:0;font-size:8pt;color:#555;border-bottom:0.5pt solid #999;padding-bottom:2pt;margin-bottom:${HEADER_GAP}pt;height:${HEADER_H}pt;direction:rtl;}
.hdr-b{font-weight:700;}.hdr-pn{font-weight:400;}.hdr-r{font-weight:400;}
.col{height:${CONTENT_H}pt;flex-shrink:0;column-count:2;column-gap:${COL_GAP}pt;column-fill:auto;column-rule:0.5pt solid #ccc;direction:rtl;overflow:hidden;}
.col-wrap{flex-shrink:0;border-bottom:0.5pt solid #999;padding-bottom:3pt;}
/* Front matter */
.fm-page{width:${PAGE_W}pt;height:${PAGE_H}pt;position:relative;overflow:hidden;page-break-after:always;
  font-family:'David Libre','David',serif;font-size:12pt;line-height:1.6;direction:rtl;text-align:justify;}
.fm-title-page{display:flex;flex-direction:column;justify-content:space-between;height:100%;text-align:center;}
.fm-title-top{padding-top:48pt;}.fm-title-bottom{padding-bottom:48pt;}
.fm-main-title{font-size:28pt;font-weight:700;margin-bottom:16pt;}
.fm-subtitle{font-size:16pt;color:#333;margin-bottom:6pt;}
.fm-trans-line{font-size:13pt;margin-bottom:8pt;}
.fm-section-title{font-size:16pt;font-weight:700;text-align:center;margin-bottom:12pt;}
.fm-text p{margin-bottom:8pt;text-indent:0;}
.fm-toc{direction:rtl;}
.fm-toc-line{display:flex;justify-content:space-between;padding:4pt 0;border-bottom:0.5pt dotted #999;}`;

  function wrapHtml(body){
    return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<style>${fontFaceCSS}</style><style>${cssBlock}</style></head><body>${body}</body></html>`;
  }

  function renderPageHtml(pg, pageNum){
    const isOdd=pageNum%2===1;
    const pR=isOdd?GUTTER:OUTER, pL=isOdd?OUTER:GUTTER;
    let content='';
    for(const el of pg.items){
      if(el.type==='bt')      content+=`<div class="bt">${el.hebrew}</div>`;
      else if(el.type==='ch') content+=`<div class="ch">${el.hebrew}</div>`;
      else                    content+=`<div class="v">${el.html}</div>`;
    }
    let range='';
    if(pg.startChapter&&pg.endChapter){
      const sc=typeof pg.startChapter==='number'?hebrewNum(pg.startChapter):pg.startChapter;
      const ec=typeof pg.endChapter==='number'?hebrewNum(pg.endChapter):pg.endChapter;
      const sv=typeof pg.startVerse==='number'?hebrewNum(pg.startVerse):pg.startVerse;
      const ev=typeof pg.endVerse==='number'?hebrewNum(pg.endVerse):pg.endVerse;
      range=sc===ec?(sv===ev?`${sc}:${sv}`:`${sc}:${sv}–${ev}`):`${sc}:${sv} – ${ec}:${ev}`;
    }
    const pn=hebrewNum(pageNum);
    return `<div class="page" style="padding-right:${pR}pt;padding-left:${pL}pt;">
<div class="hdr"><span class="hdr-b">${pg.bookHebrew||''}\u00a0/\u00a0<span class="hdr-pn">${pn}</span></span><span class="hdr-r">${range}</span></div>
<div class="col-wrap"><div class="col">${content}</div></div>
</div>`;
  }

  // ── Step 6: Front matter builders ────────────────────────────────────────

  // BOM front matter (from front_matter.json)
  function buildBOMFrontMatter(bmPageAssignments){
    const PAD_ODD =`padding:${TOP_M}pt ${GUTTER}pt ${BOT_M}pt ${OUTER}pt`;
    const PAD_EVEN=`padding:${TOP_M}pt ${OUTER}pt ${BOT_M}pt ${GUTTER}pt`;
    const MID=(GUTTER+OUTER)/2;
    const flowStyle=`page-break-before:always;padding:${TOP_M}pt ${MID}pt ${BOT_M}pt ${MID}pt;font-family:'David Libre',serif;font-size:12pt;line-height:1.6;direction:rtl;text-align:justify;`;
    let html='', fmIdx=0;
    function nextPad(){const p=fmIdx%2===0?PAD_ODD:PAD_EVEN;fmIdx++;return p;}

    // 2 blank pages
    html+=`<div class="fm-page" style="${nextPad()}"></div>`;
    html+=`<div class="fm-page" style="${nextPad()}"></div>`;

    // Main title page (s0 header + s1 translator)
    const s0=frontMatter[0], s1=frontMatter[1];
    const transLines=(s1.full||'').split('\n').filter(l=>l.trim());
    html+=`<div class="fm-page" style="${nextPad()}">
  <div class="fm-title-page">
    <div class="fm-title-top">
      <div class="fm-main-title">${s0.header}</div>
      <div class="fm-subtitle">${s0.body}</div>
    </div>
    <div class="fm-title-bottom">
      ${transLines.map(l=>`<div class="fm-trans-line">${l.trim()}</div>`).join('')}
    </div>
  </div>
</div>`;

    // Sections 2–8: let Puppeteer handle pagination naturally via CSS page-break
    for(let i=2;i<=8;i++){
      if(i>=frontMatter.length) break;
      const s=frontMatter[i];
      const bodyLines=(s.body||'').split('\n').filter(l=>l.trim());
      if(!bodyLines.length) continue;
      html+=`<div style="${flowStyle}">
  <div class="fm-section-title">${s.header}</div>
  <div class="fm-text">${bodyLines.map(p=>`<p style="margin-bottom:8pt;text-indent:0;">${p.trim()}</p>`).join('')}</div>
</div>`;
    }

    // Table of contents (section 9 "ראשי דברים") — with actual body page numbers
    html+=`<div style="${flowStyle}page-break-before:always;">
  <div class="fm-section-title">${(frontMatter[9]||{header:'ראשי דברים'}).header}</div>
  <div class="fm-toc">`;
    for(const book of BOM_BOOKS){
      const pageIdx=bmPageAssignments.findIndex(indices=>
        indices.some(idx=>elements[idx].type==='bt'&&elements[idx].book===book.name)
      );
      const pNum=pageIdx>=0?pageIdx+1:'';
      const hebPNum=pNum?hebrewNum(pNum):'';
      html+=`<div class="fm-toc-line"><span>${book.hebrew}</span><span>${hebPNum}</span></div>`;
    }
    html+=`</div></div>`;

    // 2 blank pages for RTL alignment
    html+=`<div class="fm-page" style="${nextPad()}"></div>`;
    html+=`<div class="fm-page" style="${nextPad()}"></div>`;

    return html;
  }

  // D&C front matter
  function buildDCFrontMatter(){
    let html='', idx=0;
    function pad(){const p=idx%2===0?`padding:${TOP_M}pt ${GUTTER}pt ${BOT_M}pt ${OUTER}pt`:`padding:${TOP_M}pt ${OUTER}pt ${BOT_M}pt ${GUTTER}pt`;idx++;return p;}

    html+=`<div class="fm-page" style="${pad()}">
  <div class="fm-title-page">
    <div class="fm-title-top">
      <div class="fm-main-title">תּוֹרָה וּבְרִיתוֹת</div>
      <div class="fm-subtitle" style="direction:ltr;font-size:14pt;">Doctrine &amp; Covenants</div>
    </div>
  </div>
</div>`;
    html+=`<div class="fm-page" style="${pad()}"></div>`;

    // D&C Introduction as Hebrew prose
    const introVs=dcIntroVerses.filter(v=>v&&v.num&&v.words&&v.words.length>0);
    if(introVs.length>0){
      const paras=introVs.map(v=>{
        const txt=wordsToHebrew(v.words);
        return txt?`<b class="vn">${v.num}</b>\u00A0${txt}`:null;
      }).filter(Boolean);
      html+=`<div class="fm-page" style="${pad()}">
  <div class="fm-section-title">מְבוֹא</div>
  <div class="fm-text">${paras.map(p=>`<p>${p}</p>`).join('')}</div>
</div>`;
      idx++;
    }

    // Pad to even
    while(idx%2!==0){html+=`<div class="fm-page" style="${pad()}"></div>`;}
    return html;
  }

  // PGP front matter
  function buildPGPFrontMatter(){
    let html='', idx=0;
    function pad(){const p=idx%2===0?`padding:${TOP_M}pt ${GUTTER}pt ${BOT_M}pt ${OUTER}pt`:`padding:${TOP_M}pt ${OUTER}pt ${BOT_M}pt ${GUTTER}pt`;idx++;return p;}

    html+=`<div class="fm-page" style="${pad()}">
  <div class="fm-title-page">
    <div class="fm-title-top">
      <div class="fm-main-title">פְּנִינַת הַמְּחִיר</div>
      <div class="fm-subtitle" style="direction:ltr;font-size:14pt;">Pearl of Great Price</div>
    </div>
  </div>
</div>`;
    html+=`<div class="fm-page" style="${pad()}"></div>`;

    // PGP Introduction
    const introVs=pgpIntroVerses.filter(v=>v&&v.num&&v.words&&v.words.length>0);
    if(introVs.length>0){
      const paras=introVs.map(v=>{
        const txt=wordsToHebrew(v.words);
        return txt?`<b class="vn">${v.num}</b>\u00A0${txt}`:null;
      }).filter(Boolean);
      html+=`<div class="fm-page" style="${pad()}">
  <div class="fm-section-title">מְבוֹא</div>
  <div class="fm-text">${paras.map(p=>`<p>${p}</p>`).join('')}</div>
</div>`;
      idx++;
    }

    // PGP TOC
    html+=`<div class="fm-page" style="${pad()}">
  <div class="fm-section-title">תּוֹכֶן הָעִנְיָנִים</div>
  <div class="fm-toc">
    ${PGP_BOOKS.map(b=>`<div class="fm-toc-line"><span>${b.hebrew}</span><span>${b.name}</span></div>`).join('')}
  </div>
</div>`;
    idx++;

    while(idx%2!==0){html+=`<div class="fm-page" style="${pad()}"></div>`;}
    return html;
  }

  // ── Step 7: Render everything ────────────────────────────────────────────
  console.log('Step 7: Rendering PDF...');

  async function renderBatch(html,label){
    const pg=await browser.newPage();
    pg.setDefaultTimeout(300000);
    await pg.setContent(html,{waitUntil:'domcontentloaded',timeout:120000});
    await new Promise(r=>setTimeout(r,8000));
    const buf=await pg.pdf({
      width:`${PAGE_W/72}in`,height:`${PAGE_H/72}in`,
      printBackground:true,preferCSSPageSize:true,
      displayHeaderFooter:false,margin:{top:0,right:0,bottom:0,left:0}
    });
    await pg.close();
    console.log(`    ${label}: ${(buf.length/1024).toFixed(0)}KB`);
    return buf;
  }

  const bomPageAssignments = pageAssignments.slice(0, dcStartPage);
  const dcPageAssignments  = pageAssignments.slice(dcStartPage, pgpStartPage);
  const pgpPageAssignments = pageAssignments.slice(pgpStartPage);

  const pdfBuffers=[];

  // ── BOM front matter ──
  console.log('  BOM front matter...');
  const bomFmHtml=buildBOMFrontMatter(bomPageAssignments);
  pdfBuffers.push(await renderBatch(wrapHtml(bomFmHtml),'BOM front matter'));

  // RTL alignment — front matter must be even
  {
    let fmPgs=0;
    for(const b of pdfBuffers){const d=await PDFDocument.load(b);fmPgs+=d.getPageCount();}
    if(fmPgs%2!==0){
      const blank=await PDFDocument.create();blank.addPage([PAGE_W,PAGE_H]);
      pdfBuffers.push(Buffer.from(await blank.save()));
      console.log('  Inserted blank for RTL alignment');
    }
  }

  // ── BOM body pages ──
  const BATCH=50;
  console.log(`  BOM body: ${bomPageAssignments.length} pages...`);
  for(let b=0;b<Math.ceil(bomPageAssignments.length/BATCH);b++){
    const start=b*BATCH,end=Math.min(start+BATCH,bomPageAssignments.length);
    let html='';
    for(let i=start;i<end;i++) html+=renderPageHtml(pages[i],i+1);
    pdfBuffers.push(await renderBatch(wrapHtml(html),`BOM batch ${b+1} (pp.${start+1}–${end})`));
  }

  // ── D&C front matter ──
  console.log('  D&C front matter...');
  const dcFmHtml=buildDCFrontMatter();
  pdfBuffers.push(await renderBatch(wrapHtml(dcFmHtml),'D&C front matter'));

  // ── D&C body pages ──
  console.log(`  D&C body: ${dcPageAssignments.length} pages...`);
  const dcBatches=Math.ceil(dcPageAssignments.length/BATCH);
  for(let b=0;b<dcBatches;b++){
    const start=b*BATCH,end=Math.min(start+BATCH,dcPageAssignments.length);
    const globalStart=dcStartPage+start, globalEnd=dcStartPage+end;
    let html='';
    for(let i=globalStart;i<globalEnd;i++) html+=renderPageHtml(pages[i],i-dcStartPage+1);
    pdfBuffers.push(await renderBatch(wrapHtml(html),`D&C batch ${b+1} (pp.${start+1}–${end})`));
  }

  // ── PGP front matter ──
  console.log('  PGP front matter...');
  const pgpFmHtml=buildPGPFrontMatter();
  pdfBuffers.push(await renderBatch(wrapHtml(pgpFmHtml),'PGP front matter'));

  // ── PGP body pages ──
  console.log(`  PGP body: ${pgpPageAssignments.length} pages...`);
  const pgpBatches=Math.ceil(pgpPageAssignments.length/BATCH);
  for(let b=0;b<pgpBatches;b++){
    const start=b*BATCH,end=Math.min(start+BATCH,pgpPageAssignments.length);
    const globalStart=pgpStartPage+start,globalEnd=pgpStartPage+end;
    let html='';
    for(let i=globalStart;i<globalEnd;i++) html+=renderPageHtml(pages[i],i-pgpStartPage+1);
    pdfBuffers.push(await renderBatch(wrapHtml(html),`PGP batch ${b+1} (pp.${start+1}–${end})`));
  }

  // ── Merge ──
  console.log('  Merging...');
  const merged=await PDFDocument.create();
  for(const buf of pdfBuffers){
    const src=await PDFDocument.load(buf);
    const copied=await merged.copyPages(src,src.getPageIndices());
    for(const pg of copied) merged.addPage(pg);
  }

  const outPath='C:/Users/chris/Desktop/Hebrew_Standard_Works_Scripture.pdf';
  fs.writeFileSync(outPath,await merged.save());
  const stats=fs.statSync(outPath);
  console.log(`\nPDF: ${outPath}`);
  console.log(`  Total pages: ${merged.getPageCount()}`);
  console.log(`  Size: ${(stats.size/1024/1024).toFixed(1)} MB`);
  await browser.close();
  console.log('Done!');
}

main().catch(err=>{console.error('Fatal:',err);process.exit(1);});
