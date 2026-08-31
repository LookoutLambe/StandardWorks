// Driver for the paradigm analyser: peel the CLITICS (which are outside the
// verbal paradigm), then match the core against the template table.
const {decompose,match,T}=require("./paradigm.js");
const norm=s=>decompose(s).map(o=>o.c).join("");
// proclitics: conjunction, prepositions, article, relative
const PROC=["","ו","ב","כ","ל","מ","ה","ש","וב","וכ","ול","ומ","וה","וש","כש","לכ","מה","בה","כה","לה","וכש"];
// pronominal / inflectional suffixes that attach OUTSIDE the paradigm
const ENCL=["","י","ו","ך","ה","נו","הו","הם","הן","כם","כן","ם","נ","ני","יו","יה","יך",
            "הא","נא","יהם","יכם","ינו","ותיהם","יהן","ותיו","ותם","ותי"];
function makeAnalyzer(KNOWN,FREQ){
  const cache=new Map();
  return function analyze(form){
    const u0=decompose(form);
    const key=u0.map(o=>o.c).join("");
    if(!key) return null;
    if(cache.has(key)) return cache.get(key);
    let best=null,bestScore=Infinity,bestWhy=null;
    for(const p of PROC){
      if(p.length&&!key.startsWith(p)) continue;
      for(const e of ENCL){
        const mid=key.slice(p.length, e.length?key.length-e.length:key.length);
        if(e.length&&!key.endsWith(e)) continue;
        if(mid.length<2||mid.length>6) continue;
        const u=u0.slice(p.length, e.length?u0.length-e.length:u0.length);
        const clitic=p.length*0.35+e.length*0.30;
        for(const t of T){
          const R=match(t.tpl,u);
          if(!R) continue;
          const root=t.fn(R);
          if(!root||!KNOWN.has(root)) continue;
          const f=FREQ.get(root)||0;
          const score=clitic+t.cost-Math.log(1+f)*0.13;
          if(score<bestScore){ bestScore=score; best=root; bestWhy=t.cls; }
        }
      }
    }
    cache.set(key,best);
    analyze.why=bestWhy;
    return best;
  };
}
module.exports={makeAnalyzer,norm,decompose};
