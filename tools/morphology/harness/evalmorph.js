const fs=require("fs"),vm=require("vm"),path=require("path");
const {makeAnalyzer,norm}=require(process.argv[3]);
const {pairs,roots}=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));
const KNOWN=new Set(roots.map(norm));
// root frequency from the concordance, to break ties toward common roots
const sb={console}; sb.window=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync("root_concordance.js","utf8"),sb);
const RC=sb._rootConcordance, FREQ=new Map();
RC.keys.forEach((k,i)=>FREQ.set(norm(k),RC.roots[i].c.reduce((a,b)=>a+b,0)));
const analyze=makeAnalyzer(KNOWN,FREQ);
const test=pairs.filter((_,i)=>i%5===0);
let ok=0,n=0; const miss=[];
for(const [form,root] of test){
  n++;
  const got=analyze(form);
  if(got&&norm(got)===norm(root)) ok++;
  else if(miss.length<14) miss.push({form,got:String(got),want:root});
}
console.log("ANALYSER (morphology only): "+ok+"/"+n+"  = "+(100*ok/n).toFixed(1)+"%    [engine morphology was 43.9%]");
console.log("\n  sample misses:");
for(const m of miss) console.log("     "+m.form.padEnd(22)+" got "+m.got.padEnd(10)+" want "+m.want);
