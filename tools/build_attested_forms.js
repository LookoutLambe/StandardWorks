// build_attested_forms.js — generates attested_forms.js, the MASTER table of
// every pointed Hebrew form the Masoretic Text attests, with its analysis.
//
// Sources (both on the user's Desktop, never in the repo; both CC BY 4.0):
//   ~/Desktop/morphhb/wlc/*.xml      OpenScriptures Hebrew Bible: every word of
//                                    the Leningrad text with lemma (Strong's,
//                                    prefix codes before a slash) and morphology
//                                    (HC/R/Ncmsc); prefixes and pronominal
//                                    suffixes cut with "/" in the surface.
//   ~/Desktop/STEPBible-Data/Translators Amalgamated OT+NT/TAHOT *.txt
//                                    Tyndale House / STEPBible: the same text,
//                                    disambiguated extended Strong's ({H7225G}),
//                                    morphology, gloss; "/" and "\" cut the word.
// Credit: Open Scriptures Hebrew Bible Project; STEP Bible (www.STEPBible.org).
//
// Output: attested_forms.js →
//   window._attestedForms = { pointedKey: [strongs, morph, segments, n, alts] }
//     strongs   the majority lemma over every occurrence, 'H' + 4 digits
//     morph     the majority morphology code (OSHB scheme, TAHOT's is the same family)
//     segments  the pointed surface with the source's "/" cuts (prefixes, suffix)
//     n         occurrences of the form in the Tanakh
//     alts      other lemmas with ≥ 10% of the occurrences, "H0854:253;H0859:48"
// Keys are made by RootEngine.pointedKey, loaded from root_engine.js here so the
// page and this table can never key differently.
//
//   node tools/build_attested_forms.js
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os');
const ROOT = path.join(__dirname, '..');
const OSHB = path.join(os.homedir(), 'Desktop', 'morphhb', 'wlc');
const TAHOT = path.join(os.homedir(), 'Desktop', 'STEPBible-Data', 'Translators Amalgamated OT+NT');

const win = {};
const ctx = { window: win };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'root_engine.js'), 'utf8'), ctx, { filename: 'root_engine.js' });
const pointedKey = win.RootEngine.pointedKey;
if (typeof pointedKey !== 'function') throw new Error('root_engine.js does not export pointedKey');

const pad = n => 'H' + String(n).replace(/^H/, '').replace(/[^0-9]/g, '').padStart(4, '0');
const forms = new Map();   // key -> { lem: Map, morph: Map, seg: Map, n }
function add(surface, strongs, morph) {
  const k = pointedKey(surface);
  if (!k || !strongs) return;
  let o = forms.get(k);
  if (!o) { o = { lem: new Map(), morph: new Map(), seg: new Map(), n: 0 }; forms.set(k, o); }
  o.n++;
  o.lem.set(strongs, (o.lem.get(strongs) || 0) + 1);
  if (morph) o.morph.set(morph, (o.morph.get(morph) || 0) + 1);
  // the segmented surface, cantillation off, as the source cut it: "/" cuts a
  // prefix or a suffix; TAHOT's "\\" only separates trailing punctuation (dropped)
  const seg = surface.split("\\")[0].replace(/[\u0591-\u05AF\u05BD-\u05C0\u05C3-\u05C6]/g, "").replace(/[^\u05B0-\u05BC\u05C1\u05C2\u05D0-\u05EA\/]/g, "").replace(/^\/+|\/+$/g, "");
  if (seg.indexOf('/') >= 0) o.seg.set(seg, (o.seg.get(seg) || 0) + 1);
}

// ---------- 1. OSHB ----------
let nOshb = 0;
if (fs.existsSync(OSHB)) {
  const W = /<w lemma="([^"]*)"[^>]*?(?:morph="([^"]*)")?[^>]*>([^<]*)<\/w>/g;
  for (const f of fs.readdirSync(OSHB)) {
    if (!f.endsWith('.xml') || f === 'Oshm.xml') continue;
    const src = fs.readFileSync(path.join(OSHB, f), 'utf8');
    let m; W.lastIndex = 0;
    while ((m = W.exec(src))) {
      const lemma = m[1], morph = m[2] || '', surface = m[3];
      // "c/d/776", "1254 a", "3068+" → the main word's number
      const core = lemma.replace(/^[a-z\/]+/, '').split(' ')[0].replace(/\+$/, '');
      if (!/^\d+$/.test(core)) continue;
      add(surface, pad(core), morph);
      nOshb++;
    }
  }
} else console.log('OSHB not found at', OSHB, '— skipped');

// ---------- 2. TAHOT ----------
let nTahot = 0;
if (fs.existsSync(TAHOT)) {
  for (const f of fs.readdirSync(TAHOT)) {
    if (!/^TAHOT /.test(f)) continue;
    const lines = fs.readFileSync(path.join(TAHOT, f), 'utf8').split('\n');
    for (const line of lines) {
      // Gen.1.1#01=L	בְּ/רֵאשִׁ֖ית	be./re.Shit	in/ beginning	H9003/{H7225G}	HR/Ncfsa	...
      if (!/^[1-9A-Za-z]+\.\d+\.\d+#\d+=/.test(line)) continue;
      const c = line.split('\t');
      if (c.length < 6) continue;
      const tag = c[0].split('=')[1] || '';
      if (!/^L/.test(tag) && !/^Q/.test(tag)) continue;   // the Leningrad reading (and qere, which translators follow); ketiv variants stay out
      const surface = c[1], sChain = c[4], morph = c[5];
      const main = /\{H(\d+)[A-Z]?\}/.exec(sChain) || /H(\d+)[A-Z]?(?![0-9])/.exec(sChain.replace(/H9\d\d\d/g, ''));
      if (!main) continue;
      add(surface, pad(main[1]), morph);
      nTahot++;
    }
  }
} else console.log('TAHOT not found at', TAHOT, '— skipped');

// ---------- 3. emit ----------
const top = M => [...M.entries()].sort((a, b) => b[1] - a[1]);
const out = {};
let amb = 0;
for (const [k, o] of forms) {
  const lem = top(o.lem);
  const [strongs, cnt] = lem[0];
  const alts = lem.slice(1).filter(([, n]) => n >= 0.1 * o.n).map(([h, n]) => h + ':' + n).join(';');
  if (alts) amb++;
  const morph = o.morph.size ? top(o.morph)[0][0] : '';
  const seg = o.seg.size ? top(o.seg)[0][0] : '';
  const rec = [strongs, morph, seg, o.n];
  if (alts) rec.push(alts);
  out[k] = rec;
}
const js = '// attested_forms.js — auto-generated by tools/build_attested_forms.js. DO NOT EDIT.\n' +
  '// Every pointed form of the Masoretic Text with its analysis: [Strong\'s, morph, segments, n, alts].\n' +
  '// Sources: OpenScriptures Hebrew Bible (lemma + morphology CC BY 4.0, text public domain) and\n' +
  '// STEPBible TAHOT (Tyndale House, CC BY 4.0). Keys: RootEngine.pointedKey.\n' +
  'window._attestedForms = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(ROOT, 'attested_forms.js'), js);
console.log(`OSHB words ${nOshb}, TAHOT words ${nTahot} → ${forms.size} attested pointed forms (${amb} with a competing lemma ≥10%); attested_forms.js ${(js.length / 1048576).toFixed(2)} MB`);
for (const probe of ['אָוֶן', 'מֵתִים', 'עֲלֵיהֶם', 'חָפְשִׁי', 'וַיְחַפֵּשׂ', 'בְּרֵאשִׁית', 'אֶת']) {
  const e = out[pointedKey(probe)];
  console.log('  ', probe, '→', e ? JSON.stringify(e) : '(not attested)');
}
