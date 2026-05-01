#!/usr/bin/env node
/**
 * Insert English "the" in interlinear glosses after inseparable-style prefixes
 * (ב ל מ → in/from/to/by/upon/into/… when the Hebrew referent is definite).
 *
 * Uses word-boundary matching so:
 *   - Terminal glosses like "to-land-of" (next token is Hebrew) are fixed.
 *   - Medial chains like "to-land-of-Egypt" still match via \\b on "of".
 *   - "into-land-of" is NOT corrupted (no \\b before inner "to-").
 *
 * Skips segments that already have "-the-" after the prefix.
 *
 * Usage: node apply_definite_prefix_glosses.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIRS = [
  path.join(ROOT, 'ot_verses'),
  path.join(ROOT, 'nt_verses'),
  path.join(ROOT, 'pgp_verses'),
  path.join(ROOT, 'dc_verses'),
  path.join(ROOT, 'bom', 'verses'),
  path.join(ROOT, 'Hebrew BOM', 'verses'),
  path.join(ROOT, 'Hebrew BOM', '_chapter_data'),
];

const PREFIXES = [
  'out-of',
  'into',
  'onto',
  'unto',
  'from',
  'upon',
  'with',
  'by',
  'in',
  'to',
];

const STEMS = `
day days night nights morning evening dawn dusk year years month months week weeks
sabbath sabbaths
hour moment time times season seasons summer winter spring autumn harvest
house houses household homeland land city cities gate gates wall walls tower door doors
street streets road roads path paths way ways corner threshold crossroad
border borders boundary coast shore harbor haven field fields valley plain plains
mountain hill hills country countries region earth ground dust clay soil rock stones
sand forest vineyard garden orchard wilderness desert camp camps tent tents tabernacle
temple sanctuary palace court chamber chambers grave tomb sepulcher pit dungeon prison
well spring river brook sea waters water flood ocean wave waves depth depths height
midst middle presence sight face faces surface eye eyes ear ears mouth lip lips tongue
neck throat breast bosom womb belly heart hearts soul spirits spirit hand hands palm
finger fingers thumb foot feet heel shoulder side sides back flank lap bone bones flesh
blood skin hair head heads skull horn hoof claw tail wing feather scale
garment garments robe robes cloak skirt hem linen wool sackcloth crown turban shoe sandals
sword spear bow shield armor chariot chariots bridle reins yoke wheel wheels millstone
voice voices word words speech utterance command law covenant oath decree statute judgment
name names memorial blessing curse oath remnant lot portion inheritance burden load number
generation generations tribe tribes clan house lineage family nation nations people peoples
multitude assembly congregation company army host battle war sword slaughter pestilence plague
famine thirst hunger poverty riches treasure gold silver bronze iron brass storehouse barn
altar sacrifice offering incense smoke cloud pillar flame fire smoke darkness light lamp
sun moon star stars heaven heavens sky wind rain dew frost snow storm thunder lightning
seed sowing harvest threshing floor vine fig olive grape wheat barley grain bread wine oil
honor glory majesty beauty holiness righteousness truth mercy grace wisdom understanding
knowledge power strength might wrath anger jealousy zeal fear trembling favor kindness lovingkindness
good evil sin iniquity transgression trespass guilt shame pollution uncleanness purity peace
rest trouble distress need pain sickness plague wound stripe stripes stripe-mark healing
kingdom throne dominion reign scepter crown court judgment justice righteousness equity
likeness image similitude pattern measure cubit span handful mouthful cup basket vessel jar
north south east west wind quarter end beginning first last former latter half third fourth
brother brothers sister sisters son sons daughter daughters father mother parents child children
man men woman women servant servants maid maids slave slaves master masters lord lady king
queen priest prophet judge elder virgin youth maiden neighbor stranger foreigner sojourner
synagogue church congregation ecclesia gospel scripture doctrine testimony witness sign token
dragon dragons beast beasts furnace territories territory order girdle meek commandments
`.trim()
  .split(/\s+/)
  .filter(Boolean);

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const stemsSorted = [...new Set(STEMS)].sort((a, b) => b.length - a.length);
const prefsSorted = [...new Set(PREFIXES)].sort((a, b) => b.length - a.length);
const stemAlt = stemsSorted.map(escRe).join('|');
const prefAlt = prefsSorted.map(escRe).join('|');

/** prefix-(not already the-)-stem-of as whole hyphen-token(s); \\b avoids matching ...-to- inside into- */
const INSERT_THE = new RegExp(
  `\\b(${prefAlt})-(?!the-)(${stemAlt})-of\\b`,
  'g'
);

/** Fix duplicated article from older passes / merges */
const DEDupeTHE = new RegExp(`\\b(${prefAlt})-the-the-`, 'g');

/** Walk *.js under dir */
function* walkJs(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkJs(full);
    else if (e.isFile() && e.name.endsWith('.js')) yield full;
  }
}

let filesTouched = 0;
for (const dir of DIRS) {
  for (const file of walkJs(dir)) {
    let c = fs.readFileSync(file, 'utf8');
    const orig = c;
    c = c.replace(INSERT_THE, '$1-the-$2-of');
    c = c.replace(DEDupeTHE, '$1-the-');
    if (c !== orig) {
      fs.writeFileSync(file, c, 'utf8');
      filesTouched++;
    }
  }
}
console.log(`apply_definite_prefix_glosses: updated ${filesTouched} files.`);
