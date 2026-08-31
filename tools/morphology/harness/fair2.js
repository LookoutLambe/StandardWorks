// Fair test: the 20 hand-judged failures, through mishkal -> radical -> heuristic
const fs=require("fs"),vm=require("vm");
const M=require("../mishkal.js"), R=require("../radical.js");
const HEU=require("../morph.js"), PAR=require("../morph2.js");
const strip=s=>[...s].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const norm=s=>[...strip(s)].map(c=>FIN[c]||c).join("");
const {roots}=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const KNOWN=new Set(roots.map(norm));
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance,FREQ=new Map();
RC.keys.forEach((k,i)=>FREQ.set(norm(k),RC.roots[i].c.reduce((a,b)=>a+b,0)));
const heu=HEU.makeAnalyzer(KNOWN,FREQ), par=PAR.makeAnalyzer(KNOWN,FREQ);
const IGNORE=new Set(["את","מנ","לא","כל","ואת"]);
function one(f){
  const m=M.analyze(f,KNOWN,FREQ);
  // "katal" is the bare skeleton 1-2-3: it matches ANY three consonants, so it
  // is not evidence of anything. A specific mishkal (kotel, miktal, katlat...)
  // outranks the verbal analysis; the wildcard must yield to it.
  if(m && m.how!=="mishkal:katal") return m;
  const r=R.analyze(f,KNOWN,FREQ);
  if(r) return r;
  if(m) return m;
  const h=heu(f)||par(f);
  return h?{r:h,how:"heuristic"}:null;
}
function resolve(form){
  if(!form.includes("־")) return one(form);
  const ps=form.split("־").filter(Boolean);
  const kept=ps.filter(p=>!IGNORE.has(norm(p)));
  for(const p of (kept.length?kept:ps)){ const a=one(p); if(a) return a; }
  return null;
}
const JUDGED=[["וּבָם","-"],["לְהָטִיל","טול"],["בְּמַסְעוֹתֵיהֶם","נסע"],["וַיּוֹרִידֻהוּ","ירד"],
 ["יְקֻיַּם","קומ"],["הִתְיַמְּרוּ","ימר"],["נוּבָא","בוא"],["אֶת־כׇּל־הֲכָנָתָם","כונ"],
 ["וְהֵיךְ","-"],["בְּכׇל־יַחֵם","יחמ"],["וּבַצַּבִּים","צבב"],["גַם־צָרִיךְ","צרכ"],
 ["כִּמְאַיֵּם","אימ"],["שֶׁהוּעֲדָה","עוד"],["לִטְרָא","-"],["בַּזִּיקִים","זקק"],
 ["הַלָּח","לחח"],["שֶׁתְּקֻיַּם","קומ"],["וּבָדִיתָ","בדא"],["שִׂמְחָתְךָ","שמח"]];
let fixed=0,check=0;
for(const [f,want] of JUDGED){
  const a=resolve(f); const g=a?a.r:null;
  if(want==="-"){ console.log("   n/a   "+f.padEnd(22)+"-> "+String(g)); continue; }
  check++; const good=g&&norm(g)===norm(want);
  if(good)fixed++;
  console.log("   "+(good?"FIXED":"still")+" "+f.padEnd(22)+"-> "+String(g).padEnd(8)+(a?("["+a.how+"]").padEnd(22):"".padEnd(22))+"want "+want);
}
console.log("\n   "+fixed+"/"+check+" of the previously-wrong now right");
console.log("   sample accuracy: "+(39+fixed)+"/60 = "+(100*(39+fixed)/60).toFixed(0)+"%");
