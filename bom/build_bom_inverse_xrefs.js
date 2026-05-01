/**
 * build_bom_inverse_xrefs.js
 *
 * Scans OT / NT / D&C / PGP official footnote datasets (same source family as LDS.org)
 * and builds an inverse map: BOM verse key -> entries pointing FROM those volumes
 * into the Book of Mormon, so the Hebrew BOM panel can show Standard Works context.
 *
 * Run from repo root:
 *   node bom/build_bom_inverse_xrefs.js
 *
 * Output: bom/bom_inverse_crossrefs.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

const _bomAbbrevsToBook = {
  '1 Ne.': '1 Nephi', '2 Ne.': '2 Nephi', '3 Ne.': '3 Nephi', '4 Ne.': '4 Nephi',
  'Jacob': 'Jacob', 'Enos': 'Enos', 'Jarom': 'Jarom', 'Omni': 'Omni',
  'W of M': 'Words of Mormon', 'Mosiah': 'Mosiah', 'Alma': 'Alma',
  'Hel.': 'Helaman', 'Morm.': 'Mormon', 'Ether': 'Ether', 'Moro.': 'Moroni'
};

const _abbrToFullBook = {
  'Gen.': 'Genesis', 'Ex.': 'Exodus', 'Lev.': 'Leviticus', 'Num.': 'Numbers',
  'Deut.': 'Deuteronomy', 'Josh.': 'Joshua', 'Judg.': 'Judges', 'Ruth': 'Ruth',
  '1 Sam.': '1 Samuel', '2 Sam.': '2 Samuel', '1 Kgs.': '1 Kings', '2 Kgs.': '2 Kings',
  '1 Chr.': '1 Chronicles', '2 Chr.': '2 Chronicles', 'Ezra': 'Ezra', 'Neh.': 'Nehemiah',
  'Esth.': 'Esther', 'Job': 'Job', 'Ps.': 'Psalms', 'Prov.': 'Proverbs',
  'Eccl.': 'Ecclesiastes', 'Isa.': 'Isaiah', 'Jer.': 'Jeremiah',
  'Lam.': 'Lamentations', 'Ezek.': 'Ezekiel', 'Dan.': 'Daniel', 'Hosea': 'Hosea',
  'Joel': 'Joel', 'Amos': 'Amos', 'Obad.': 'Obadiah', 'Jonah': 'Jonah',
  'Micah': 'Micah', 'Nahum': 'Nahum', 'Hab.': 'Habakkuk', 'Zeph.': 'Zephaniah',
  'Hag.': 'Haggai', 'Zech.': 'Zechariah', 'Mal.': 'Malachi',
  'Matt.': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John',
  'Acts': 'Acts', 'Rom.': 'Romans', '1 Cor.': '1 Corinthians', '2 Cor.': '2 Corinthians',
  'Gal.': 'Galatians', 'Eph.': 'Ephesians', 'Philip.': 'Philippians', 'Col.': 'Colossians',
  '1 Thes.': '1 Thessalonians', '2 Thes.': '2 Thessalonians',
  '1 Tim.': '1 Timothy', '2 Tim.': '2 Timothy', 'Titus': 'Titus', 'Philem.': 'Philemon',
  'Heb.': 'Hebrews', 'James': 'James', '1 Pet.': '1 Peter', '2 Pet.': '2 Peter',
  '1 Jn.': '1 John', '2 Jn.': '2 John', '3 Jn.': '3 John', 'Jude': 'Jude', 'Rev.': 'Revelation',
  'D&C': 'D&C', 'Moses': 'Moses', 'Abr.': 'Abraham', 'JS—H': 'JS-H', 'JS—M': 'JS-M', 'A of F': 'A-of-F'
};

function parseBomRef(refText) {
  refText = refText.replace(/\u00a0/g, ' ');
  for (const abbr of Object.keys(_bomAbbrevsToBook)) {
    if (refText.indexOf(abbr) === 0) {
      const rest = refText.substring(abbr.length).trim();
      const m = rest.match(/^(\d+):(\d+)/);
      if (m) {
        const book = _bomAbbrevsToBook[abbr];
        return { key: `${book}|${m[1]}|${m[2]}`, label: refText.split(/\s*\(/)[0].trim() };
      }
    }
  }
  return null;
}

function loadVolumeScript(filename, globalProp) {
  const fp = path.join(ROOT, filename);
  if (!fs.existsSync(fp)) {
    console.warn('Missing file, skipping:', fp);
    return {};
  }
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(fp, 'utf8'), ctx);
  return ctx.window[globalProp] || {};
}

function expandRefLine(rNorm, lastBookPrefix) {
  let foundPrefix = '';
  for (const abbr of Object.keys(_bomAbbrevsToBook)) {
    if (rNorm.indexOf(abbr) === 0) { foundPrefix = abbr; break; }
  }
  if (!foundPrefix) {
    for (const abbr of Object.keys(_abbrToFullBook)) {
      if (rNorm.indexOf(abbr) === 0) { foundPrefix = abbr; break; }
    }
  }
  let fullRef = rNorm;
  let newLast = lastBookPrefix;
  if (foundPrefix) {
    newLast = foundPrefix;
  } else if (/^\d/.test(rNorm) && lastBookPrefix) {
    fullRef = lastBookPrefix + ' ' + rNorm;
  } else if (!foundPrefix && !/^\d/.test(rNorm)) {
    return { fullRef: null, lastBookPrefix: newLast };
  }
  return { fullRef, lastBookPrefix: newLast };
}

function formatDisplayRefFromSourceKey(sourceKey) {
  const parts = sourceKey.split('|');
  if (parts.length !== 3) return sourceKey;
  const [book, ch, vs] = parts;
  const rev = Object.entries(_abbrToFullBook).find(([, b]) => b === book);
  const revBom = Object.entries(_bomAbbrevsToBook).find(([, b]) => b === book);
  if (rev) return `${rev[0]} ${ch}:${vs}`;
  if (revBom) return `${revBom[0]} ${ch}:${vs}`;
  if (book === 'D&C') return `D&C ${ch}:${vs}`;
  if (book === 'JS-H' || book === 'JS-M') return `${book} ${ch}:${vs}`;
  return `${book} ${ch}:${vs}`;
}

function scanVolume(data, volumeTag, inverse) {
  let scanned = 0;
  let hits = 0;
  for (const sourceKey of Object.keys(data)) {
    const entries = data[sourceKey];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry || !entry.refs) continue;
      let lastBookPrefix = '';
      for (const r of entry.refs) {
        const rNorm = r.replace(/\u00a0/g, ' ');
        if (rNorm.indexOf('TG ') === 0 || rNorm.indexOf('BD ') === 0 || rNorm.indexOf('GS ') === 0) continue;
        const { fullRef, lastBookPrefix: nl } = expandRefLine(rNorm, lastBookPrefix);
        lastBookPrefix = nl;
        if (!fullRef) continue;

        const bom = parseBomRef(fullRef);
        if (!bom) continue;

        hits++;
        if (!inverse[bom.key]) inverse[bom.key] = [];

        const displaySource = formatDisplayRefFromSourceKey(sourceKey);
        const dedupeId = `${sourceKey}|${entry.marker || ''}|${entry.text || ''}`;
        const row = {
          displayRef: displaySource,
          sourceKey,
          anchorText: entry.text || '',
          marker: entry.marker || '',
          volumeTag,
          dedupeId
        };

        const exists = inverse[bom.key].some(x => x.dedupeId === dedupeId);
        if (!exists) inverse[bom.key].push(row);
      }
      scanned++;
    }
  }
  return { scanned, hits };
}

function main() {
  console.log('Loading volume crossrefs…');
  const ot = loadVolumeScript('ot_crossrefs.js', '_otCrossrefsData');
  const nt = loadVolumeScript('nt_crossrefs.js', '_ntCrossrefsData');
  const dc = loadVolumeScript('dc_crossrefs.js', '_dcCrossrefsData');
  const pgp = loadVolumeScript('pgp_crossrefs.js', '_pgpCrossrefsData');

  const inverse = {};

  const s1 = scanVolume(ot, 'OT', inverse);
  const s2 = scanVolume(nt, 'NT', inverse);
  const s3 = scanVolume(dc, 'DC', inverse);
  const s4 = scanVolume(pgp, 'PGP', inverse);

  const keys = Object.keys(inverse).length;
  const rows = Object.values(inverse).reduce((a, b) => a + b.length, 0);
  console.log(`Scan OT: entries touched=${s1.scanned}, BOM refs=${s1.hits}`);
  console.log(`Scan NT: entries touched=${s2.scanned}, BOM refs=${s2.hits}`);
  console.log(`Scan DC: entries touched=${s3.scanned}, BOM refs=${s3.hits}`);
  console.log(`Scan PGP: entries touched=${s4.scanned}, BOM refs=${s4.hits}`);
  console.log(`Inverse BOM verse keys: ${keys}, total rows: ${rows}`);

  const outPath = path.join(__dirname, 'bom_inverse_crossrefs.js');
  const json = JSON.stringify(inverse);
  const js = `/** Auto-generated by bom/build_bom_inverse_xrefs.js — Standard Works footnotes citing BOM */\nwindow._bomInverseXrefsData = ${json};\n`;
  fs.writeFileSync(outPath, js, 'utf8');
  console.log('Wrote', outPath, `(${Math.round(js.length / 1024)} KB)`);
}

main();
