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
const T=[["וַיּוֹרִידֻהוּ","ירד"],["יְקֻיַּם","קומ"],["שֶׁתְּקֻיַּם","קומ"],["נוּבָא","בוא"],
         ["לְהָטִיל","טול"],["הֲכָנָתָם","כונ"],["וַיִּתֵּן","נתנ"],["יִפֹּל","נפל"],
         ["הֵקִים","קומ"],["וַיָּקׇם","קומ"],["וַיֵּלֶךְ","הלכ"],["וַיָּבֹא","בוא"],
         ["יָסֹב","סבב"],["הוֹשִׁיב","ישב"],["וַיּוֹצֵא","יצא"]];
let ok=0;
for(const [f,want] of T){
  const a=R.analyze(f,KNOWN,FREQ);
  const got=a?a.r:null, good=got&&norm(got)===norm(want);
  if(good)ok++;
  console.log("   "+(good?"ok  ":"MISS")+" "+f.padEnd(20)+"-> "+String(got).padEnd(8)+(a?("["+a.how+"]").padEnd(28):"".padEnd(16))+"want "+want);
}
console.log("\n   "+ok+"/"+T.length);
