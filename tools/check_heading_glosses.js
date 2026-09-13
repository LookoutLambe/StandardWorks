// Chapter-heading glosses must not speak in a person the English heading never uses.
// The scorecard flag filter cannot catch this: a wrong-person gloss still lands in
// the right root family. Alma 55's נִלְכֶּדֶת read "you have been caught" where the
// city of Gid is taken (2026-09-13). Run after editing _headGloss in bom/bom.html.
const fs=require('fs'), vm=require('vm'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const ctx={window:{}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT,'bom/chapter_headings.js'),'utf8'),ctx,{filename:'ch'});
vm.runInContext(fs.readFileSync(path.join(ROOT,'bom/chapter_headings_heb.js'),'utf8'),ctx,{filename:'chh'});
const EN=ctx._chapterHeadings, HE=ctx._chapterHeadingsHeb;
const html=fs.readFileSync(path.join(ROOT,'bom/bom.html'),'utf8');
const start=html.indexOf('_headGloss'); const open=html.indexOf('{',start);
let depth=0,end=open;
for(let i=open;i<html.length;i++){const c=html[i];if(c==='{')depth++;else if(c==='}'){depth--;if(!depth){end=i;break;}}}
const G={};
for(const m of html.slice(open+1,end).matchAll(/'([^']+)'\s*:\s*'((?:[^'\\]|\\.)*)'/g)) G[m[1]]=m[2].replace(/\\'/g,"'");
const PRON=/\b(i|me|my|mine|we|us|our|ours|you|your|yours|ye|thee|thy|thine|thou)\b/i;
let hits=0;
for(const key of Object.keys(HE)){
  const en=EN[key]; if(!en) continue;
  const enHas=PRON.test(en);
  const toks=HE[key].replace(/[.,;:!?"]/g,' ').split(/\s+/).filter(Boolean);
  for(const t of toks){
    const g=G[t]; if(!g) continue;
    const m=g.match(PRON); if(!m) continue;
    if(enHas) continue;                       // the heading really does speak in that person
    console.log(key+'\t'+t+'\t'+g);
    hits++;
  }
}
console.log(hits ? '[heading-gloss] '+hits+' gloss(es) speak in a person the English heading never uses'
                 : '[heading-gloss] ok: no gloss speaks in a person its English heading never uses');
process.exit(hits?1:0);
