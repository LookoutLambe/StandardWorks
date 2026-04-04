#!/usr/bin/env node
/**
 * Fix definite article ("the-") accuracy in Hebrew interlinear glosses.
 *
 * Usage:
 *   node _fix_article_glosses.js              # dry-run (report only)
 *   node _fix_article_glosses.js --apply      # apply fixes
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const DRY_RUN = !process.argv.includes('--apply');

// ── Unicode constants ──────────────────────────────────────
const MAQEF  = '\u05BE'; // ־
const PATACH = '\u05B7';
const QAMATS = '\u05B8';
const SEGOL  = '\u05B6';
const HIRIQ  = '\u05B4';
const TSERE  = '\u05B5';
const SHVA   = '\u05B0';
const QUBUTS = '\u05BB';
const HOLAM  = '\u05B9';
const DAGESH = '\u05BC';

const HE    = '\u05D4';
const BET   = '\u05D1';
const LAMED = '\u05DC';
const KAF   = '\u05DB';
const VAV   = '\u05D5';

// Gutturals – cannot take dagesh forte
const GUTTURALS = new Set([
  '\u05D0', // alef
  '\u05E2', // ayin
  '\u05D7', // chet
  '\u05D4', // he
  '\u05E8', // resh
]);

const NIQQUD_RE   = /[\u0591-\u05C7]/g;
const NIQQUD_CHAR = /[\u0591-\u05C7]/;
const CONSONANT   = /[\u05D0-\u05EA]/;

function stripNiqqud(s) { return s.replace(NIQQUD_RE, ''); }

// ── Parse Hebrew text into [{base, niqqud}] ────────────────
function parseChars(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    if (CONSONANT.test(text[i]) || text[i] === MAQEF) {
      const base = text[i];
      let niqqud = '';
      let j = i + 1;
      while (j < text.length && NIQQUD_CHAR.test(text[j])) { niqqud += text[j]; j++; }
      out.push({ base, niqqud });
      i = j;
    } else if (NIQQUD_CHAR.test(text[i])) {
      i++;
    } else {
      i++;
    }
  }
  return out;
}

// ── Non-article ה words (stripped of niqqud) ───────────────
const NON_ARTICLE_HE = new Set([
  // ── Pronouns ──
  'הוא','היא','הם','הן','המה','הנה',
  // ── Demonstratives (article is grammatical, gloss stays "this/that/these") ──
  'הזה','הזאת','האלה','ההם','ההנה','ההוא','ההיא',
  // ── Divine names (conventionally glossed without "the-") ──
  'האלהים','האלוהים','האל',
  // ── Particles ──
  'הנה','הנני','הנם','הנך','הננו','הלא',
  'הוי',
  // ── Qal of היה ──
  'היה','היתה','היו','הייתי','הייתם','הייתן','היינו','הייתה',
  // ── Qal of הלך ──
  'הלך','הלכו','הלכה','הלכת','הלכתי','הלכנו',
  // ── Hiphil perfects ──
  'הביא','הביאו','הביאה','הגיד','הגידו','הכה','הכו',
  'הפך','הרג','הרגו','השיב','השליך','הציל','הצילו',
  'הניח','הניחו','הקים','הקימו','הראה','הראו',
  'הושיע','הודיע','הודיעו','הוליד','הולידו',
  'הוציא','הוציאו','הוסיף','הוסיפו','הושיב','הושיבו',
  'הפליא','הגדיל','הטיב','הרבה','הרחיב','הקשה',
  'הבדיל','הגביר','הגלה','הדריך','הזהיר',
  'החזיק','החל','החלו','החלה','החליף','החריב',
  'הטעה','הכין','הכניע','הכרית',
  'הלל','המית','הנחיל','הסגיר','הסיר','הסכים',
  'העביר','העיד','העלה','הענה','הפיל','הפיץ',
  'הפקיד','הפריד','הצית','הצליח','הצמיח',
  'הקדיש','הקהיל','הקריב','הרים','הרע','הרשיע',
  'השבית','השחית','השכיל','השליט','השמיד','השמיע',
  // ── Hiphil imperatives ──
  'הגד','הגידה','הכה','הכו','הבא','הביאו',
  'הושע','הצל','הרם','השב','השמע','הקם',
  'הבט','הגש','הגישה','הכר','הסר','הנח',
  'הרא','השקט','הסב',
  // ── Hiphil participles (can look like article + dagesh) ──
  'החלותם','החלות','החלת','החלתי',
  // ── Hitpael ──
  'התנבא','התפלל','התחזק','התודע','התחיל',
  'התוכח','התודה','התהלך','התהלכו','התוך',
  // ── Hiphil imperfect consecutive ──
  'הגיש','הגישו','הכיר','הכירו','הסית','הסיתו',
  // ── Hiphil infinitive/participle forms starting with ה ──
  'הראות','הראה','הראהו','הראתה','הראתי','הראנו',
  'האמינו','האמין','האמינה','האמנתי',
  'הארת','הארית',
  'העמיד','העמידו','העמדת',
  'הרעים','הרעימה',
  // ── Misc ──
  'הוה','הושע','הללויה','הן',
  // ── Hophal forms ──
  'הובא','הובאו','הוכה','הוכו','הושם','הושלך',
]);

// ── Whole-word exclusions for preposition detection (stripped) ──
// Words where the initial bet/lamed/kaf is a ROOT letter, not preposition
const PREP_ROOT_EXCLUSIONS = new Set([
  // ב roots
  'בא','באו','באה','באת','באתי','באנו','באים',
  'בחר','בחרו','בחרה','ברא','ברח','ברחו',
  'ברך','ברכו','ברכה','בנה','בנו','בנתה',
  'בער','בערו','בקע','בקעו','בקש','בקשו',
  'בטח','בטחו','בלע','בלעו',
  // כ roots
  'כרת','כרתו','כרתה','כלה','כלו','כלתה',
  'כתב','כתבו','כתבה','כבד','כבדו',
  'כלות','כלותי','כלותו','כלותם','כלותה',
  'כבס','כבסו','כנע','כנעו','כפר','כפרו',
  'כשל','כשלו',
  // ל roots
  'לקח','לקחו','לקחה','למד','למדו','למדה',
  'לבש','לבשו','לחם','לחמו','לכד','לכדו',
  // כ + infinitive/noun forms (root letter, not preposition)
  'כלתו','כלתה','כלתי','כלתם','כלתן',
  'כלם','כלנו',
  // Fixed / idiomatic expressions (stripped)
  'כאשר', // when/as
  'לשוא', // in vain (idiomatic)
]);

// ── Check if a single component has a definite article ─────
function componentHasArticle(chars) {
  if (chars.length === 0) return false;
  let idx = 0;

  // Skip conjunctive vav
  if (chars[idx].base === VAV) {
    idx++;
    if (idx >= chars.length) return false;
  }

  // Build bare (niqqud-stripped) word from current position
  let bare = '';
  for (let i = idx; i < chars.length; i++) bare += chars[i].base;

  // ── Pattern A: preposition with absorbed article ──
  // Conservative: ONLY patach on prep + dagesh on next non-guttural consonant.
  // Qamats on prep before non-gutturals is usually NOT from article
  // (it's a root vowel, like לָמָּן = Laman, or כָּרַת = cut).
  if (chars[idx].base === BET || chars[idx].base === LAMED || chars[idx].base === KAF) {
    const v = chars[idx].niqqud;

    // Must have PATACH (not qamats/segol) for absorbed article
    if (!v.includes(PATACH)) return false;
    if (idx + 1 >= chars.length) return false;

    // Exclude known root words (bet/lamed/kaf is root, not prep)
    if (PREP_ROOT_EXCLUSIONS.has(bare)) return false;

    const nextChar = chars[idx + 1];

    // Skip gutturals – too ambiguous
    if (GUTTURALS.has(nextChar.base)) return false;

    // Next consonant must have dagesh (forte from absorbed article)
    if (nextChar.niqqud.includes(DAGESH)) return true;

    return false;
  }

  // ── Pattern B: standalone article הַ / הָ ──
  // Dropped segol – too many false positives with hiphil forms (הֶאֱמִינוּ etc.)
  if (chars[idx].base === HE) {
    const v = chars[idx].niqqud;

    // Only patach or qamats can indicate article (not segol/hiriq/tsere/etc.)
    if (!v.includes(PATACH) && !v.includes(QAMATS)) return false;

    // Exclude known non-article words (verbs, demonstratives, pronouns)
    if (NON_ARTICLE_HE.has(bare)) return false;

    if (idx + 1 >= chars.length) return false;
    const nextBase = chars[idx + 1].base;
    const nextNiqqud = chars[idx + 1].niqqud;

    // ── B1: הַ + dagesh on next consonant (non-guttural) ──
    if (v.includes(PATACH) && !GUTTURALS.has(nextBase) && nextNiqqud.includes(DAGESH)) {
      return true;
    }

    // ── B2: הָ + guttural (compensatory lengthening) ──
    // Only qamats before alef, ayin, resh indicates article.
    // Patach before gutturals is usually hiphil, not article.
    if (v.includes(QAMATS) && (nextBase === '\u05D0' || nextBase === '\u05E2' || nextBase === '\u05E8')) {
      // Additional: require at least 3 consonants to avoid short verbs
      const consonantCount = chars.slice(idx).filter(c => CONSONANT.test(c.base)).length;
      if (consonantCount >= 3) return true;
      return false;
    }

    // ── B3: הַ + chet (patach before chet is article) ──
    if (v.includes(PATACH) && nextBase === '\u05D7') {
      if (NON_ARTICLE_HE.has(bare)) return false;
      return true;
    }

    return false;
  }

  return false;
}

// ── Check if a Hebrew word (possibly maqef-bound) has article
function hasArticle(hebrew) {
  const parts = hebrew.split(MAQEF);
  for (const part of parts) {
    if (componentHasArticle(parseChars(part))) return true;
  }
  return false;
}

// ── Does the gloss already contain "the"? ──────────────────
function glossHasThe(gloss) {
  return /(?:^|[- ])the(?:[- ]|$)/i.test(gloss);
}

// ── Insert "the-" into a gloss at the right position ───────
function insertThe(gloss) {
  if (glossHasThe(gloss)) return gloss;

  // Handle "[ACC] rest" (space separator)
  const spaceAcc = gloss.match(/^(\[?ACC\]?) (.+)$/);
  if (spaceAcc) {
    return spaceAcc[1] + ' the-' + spaceAcc[2];
  }

  const parts = gloss.split('-');

  const prefixes = new Set([
    '[ACC]','ACC',
    'and','but','or','also','not','even','then','yet','so',
    'if','when','lest','that','now','surely','behold',
    'for','because','therefore','nevertheless','moreover',
  ]);
  const preps = new Set([
    'in','to','from','by','as','like','for','upon','with',
    'unto','of','into','at','on','before','after','between',
    'among','through','against','about','under','over',
    'towards','without','near','beside','beyond','behind',
    'out','concerning','according','during',
  ]);
  const quantifiers = new Set([
    'all','every','each','many','few','some','no','any',
  ]);

  let insertIdx = 0;
  for (let i = 0; i < parts.length; i++) {
    const lower = parts[i].toLowerCase().replace(/[[\]]/g, '');
    if (prefixes.has(parts[i]) || prefixes.has(lower) ||
        preps.has(lower) || quantifiers.has(lower)) {
      insertIdx = i + 1;
    } else {
      break;
    }
  }

  parts.splice(insertIdx, 0, 'the');
  return parts.join('-');
}

// ── Directories to scan ────────────────────────────────────
const DIRS = [
  'bom/verses',
  'ot_verses',
  'nt_verses',
  'dc_verses',
  'pgp_verses',
  'jst_verses',
  'Hebrew BOM/_chapter_data',
];

// ── Process one file ───────────────────────────────────────
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let count = 0;
  const samples = [];

  const result = content.replace(
    /\["([^"]+)","([^"]*)"\]/g,
    (match, hebrew, gloss) => {
      if (!gloss || gloss === '' || gloss === '׃' || gloss === '???' || gloss === '…') return match;

      const heb = hasArticle(hebrew);
      const gl  = glossHasThe(gloss);

      if (heb && !gl) {
        const fixed = insertThe(gloss);
        if (fixed !== gloss) {
          count++;
          if (samples.length < 8) samples.push({ hebrew, old: gloss, new: fixed });
          return `["${hebrew}","${fixed}"]`;
        }
      }
      return match;
    }
  );

  if (count > 0) {
    if (!DRY_RUN) fs.writeFileSync(filePath, result, 'utf8');
    const tag = DRY_RUN ? '(dry)' : '(applied)';
    console.log(`  ${path.basename(filePath)}: ${count} fixes ${tag}`);
    for (const s of samples) {
      console.log(`    ${s.hebrew}  "${s.old}" → "${s.new}"`);
    }
    if (count > 8) console.log(`    … and ${count - 8} more`);
  }
  return count;
}

// ── Main ───────────────────────────────────────────────────
function main() {
  console.log(DRY_RUN
    ? '=== DRY RUN (use --apply to write changes) ==='
    : '=== APPLYING FIXES ===');

  let totalChanges = 0;
  let totalFiles   = 0;

  for (const dir of DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) { console.log(`\nSkipping ${dir} (not found)`); continue; }

    console.log(`\n${dir}/`);
    const files = fs.readdirSync(full)
      .filter(f => f.endsWith('.js') && !f.includes('backup'))
      .sort();

    for (const f of files) {
      const n = processFile(path.join(full, f));
      if (n > 0) totalFiles++;
      totalChanges += n;
    }
  }

  console.log(`\n════════════════════════════════`);
  console.log(`Total files:   ${totalFiles}`);
  console.log(`Total fixes:   ${totalChanges}`);
  if (DRY_RUN) console.log(`\nRun with --apply to write changes.`);
}

main();
