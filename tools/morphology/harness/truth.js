const fs=require("fs"),vm=require("vm"),win={};
["strongs_lookup.js","strongs_roots.js","bdb_roots.js","shoroshim_roots.js"]
  .forEach(f=>vm.runInNewContext(fs.readFileSync(f,"utf8"),{window:win},{filename:f}));
const SL=win._strongsLookup, SR=win._strongsRoots, BR=win._bdbRoots, SH=win._shoroshimRoots;
console.log("=== bdbRoots as ground truth ===");
for(const [h,exp] of [["H3427","ישב"],["H5046","נגד"],["H0995","בין"],["H6965","קום"],
                      ["H1540","גלה"],["H8334","שרת"],["H5074","נדד"]])
  console.log("  "+h+" -> "+String(BR[h]).padEnd(8)+" (expect "+exp+")  "+(BR[h]===exp?"ok":"DIFFERS"));
// build the pair set
const pairs=[];
for(const [form,h] of Object.entries(SL)){
  const r=BR[h];
  if(r && /^[א-ת]{2,4}$/.test(r)) pairs.push([form,r]);
}
console.log("");
console.log("ground-truth (form -> root) pairs available: "+pairs.length);
const roots=new Set(Object.values(BR).filter(r=>/^[א-ת]{2,4}$/.test(r)));
for(const v of Object.values(SH||{})) if(/^[א-ת]{2,4}$/.test(v)) roots.add(v);
console.log("known-root inventory size: "+roots.size);
fs.writeFileSync(process.argv[2], JSON.stringify({pairs,roots:[...roots]}));
console.log("written to "+process.argv[2]);
