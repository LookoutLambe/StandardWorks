// Trace radical.js: every peel and every radical reading it produces.
const fs=require("fs"),vm=require("vm");
const R=require("../radical.js");
const strip=s=>[...s].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const norm=s=>[...strip(s)].map(c=>FIN[c]||c).join("");
const {roots}=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const KNOWN=new Set(roots.map(norm));
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance,FREQ=new Map();
RC.keys.forEach((k,i)=>FREQ.set(norm(k),RC.roots[i].c.reduce((a,b)=>a+b,0)));
for(const form of process.argv.slice(3)){
  const u=R.decomp(form);
  console.log("\n  "+form+"   consonants = "+R.S(u)+
              "   dagesh on: "+u.map((o,i)=>o.dag?(i+"="+o.c):null).filter(Boolean).join(",")||"(none)");
  const a=R.analyze(form,KNOWN,FREQ);
  console.log("     result: "+(a?a.r+"  ["+a.how+"]  depth="+a.d+"  freq="+a.f:"null"));
  // what ELSE was on the table?
  console.log("     is the right root even known?");
  for(const cand of process.argv.slice(3).length?[]:[]) {}
}
// check specific candidate roots
const probe=process.env.PROBE?process.env.PROBE.split(","):[];
for(const r of probe) console.log("     KNOWN("+r+")="+KNOWN.has(norm(r))+"  freq="+(FREQ.get(norm(r))||0));
