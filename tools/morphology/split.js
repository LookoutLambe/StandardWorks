// MAQQEF SPLITTING.
// A maqqef joins two words; asking for one root from both is incoherent.
// Split on it, and IGNORE exactly these five grammatical markers -- they carry
// no root a reader wants, unlike גַּם / עַל / עַד which are real words:
//     אֶת־   מִן־   לֹא־   כׇּל־   וְאֶת־
// Everything else keeps its own root and is analysed normally, head first,
// because a construct chain (דְבַר־יְהוָה) is carried by its head.
const H=require("./morph.js"), P=require("./morph2.js");
const norm=H.norm;
// written WITHOUT final letters: norm() folds ם/ן/ך, so a particle spelled with
// one could never match a normalised piece.
const IGNORE = new Set(["את", "מנ", "לא", "כל", "ואת"].map(norm));
const isIgnored = p => IGNORE.has(norm(p));
function makeAnalyzer(KNOWN, FREQ) {
  const heu = H.makeAnalyzer(KNOWN, FREQ), par = P.makeAnalyzer(KNOWN, FREQ);
  const one = f => heu(f) || par(f);
  return function analyze(form) {
    if (!String(form).includes("־")) return one(form);
    const ps = String(form).split("־").map(s => s.trim()).filter(Boolean);
    if (ps.length < 2) return one(form);
    const kept = ps.filter(p => !isIgnored(p));
    const order = kept.length ? kept : ps;
    for (const p of order) { const r = one(p); if (r) return r; }
    return one(form);
  };
}
module.exports = { makeAnalyzer, norm, IGNORE };
