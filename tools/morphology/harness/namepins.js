// Collect every corpus form glossed as one of the colliding BOM names, so all
// of its prefixed / compound variants get pinned together.
const fs=require("fs"),path=require("path");
const FIN={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
const strip=s=>[...String(s)].filter(c=>!(c.codePointAt(0)>=0x0591&&c.codePointAt(0)<=0x05C7)).join("");
const norm=s=>[...strip(s)].map(c=>FIN[c]||c).join("").replace(/[^א-ת]/g,"");
const TARGET={Lehi:"לחי",Mosiah:"מושיה",Shim:"שים",Shum:"שומ",Kim:"קימ",Seth:"שת"};
const RE=new RegExp("\\b("+Object.keys(TARGET).join("|")+")\\b");
const TOK=/\["([^"]*)","([^"]*)"\]/g;
const hits=new Map();
for(const d of ["bom/verses","ot_verses","nt_verses","dc_verses","pgp_verses"]){
  for(const f of fs.readdirSync(d)){ if(!f.endsWith(".js"))continue;
    const src=fs.readFileSync(path.join(d,f),"utf8"); let m;
    while((m=TOK.exec(src))){
      const h=m[1], g=(m[2]||"").replace(/[.,;:!?)(]+/g,"").trim();
      const mm=g.match(RE); if(!mm) continue;
      // the gloss must BE the name (possibly with a leading particle), not merely contain it
      const w=g.split(/[\s—]+/).filter(x=>/^[A-Z]/.test(x));
      if(w.length!==1) continue;
      const key=mm[1];
      if(!hits.has(h)) hits.set(h,{name:key,root:TARGET[key],gl:g,n:0});
      hits.get(h).n++;
    } } }
const rows=[...hits.entries()].sort((a,b)=>b[1].n-a[1].n);
console.log("  forms to pin: "+rows.length+"   tokens: "+rows.reduce((a,r)=>a+r[1].n,0)+"\n");
for(const [h,i] of rows) console.log("   x"+String(i.n).padEnd(4)+h.padEnd(24)+i.name.padEnd(9)+"-> "+i.root+"   ("+i.gl.slice(0,22)+")");
fs.writeFileSync(process.argv[2],JSON.stringify(rows.map(([h,i])=>({form:h,root:i.root,name:i.name,n:i.n})),null,1));
