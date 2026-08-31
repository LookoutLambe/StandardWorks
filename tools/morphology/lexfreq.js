// ENGINE-INDEPENDENT ROOT FREQUENCY.
// root_concordance.js is produced BY the resolver, so roots it mishandles get
// tiny families and are then deprioritised -- a feedback loop. It records
// נתן "to give" at 7 and כון at 6. Count instead from the LEXICON: how many
// distinct Strong's forms map to each root through BDB. That never touches the
// engine, so it cannot be poisoned by it.
const fs=require("fs"),vm=require("vm");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const strip=s=>[...s].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const norm=s=>[...strip(String(s))].map(c=>FIN[c]||c).join("");
function build(){
  const win={};
  for(const f of ["strongs_lookup.js","strongs_roots.js","bdb_roots.js"])
    vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f});
  const SL=win._strongsLookup, BR=win._bdbRoots, SR=win._strongsRoots;
  const freq=new Map();
  const bump=(r,n)=>{ if(!r) return; const k=norm(r); if(k.length>=2) freq.set(k,(freq.get(k)||0)+n); };
  // every inflected form Strong's knows, credited to its BDB root
  for(const h of Object.values(SL)) bump(BR[h],1);
  // and every lexeme entry itself, so a root with few inflections still counts
  for(const [h,rec] of Object.entries(SR)) if(BR[h]) bump(BR[h],1);
  return freq;
}
module.exports={build,norm};
