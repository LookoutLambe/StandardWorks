const fs = require("fs");
const path = require("path");

/**
 * Import a curriculum plain text file into JSON.
 *
 * Usage:
 *   node scripts/import_curriculum_text.js curriculum/journey1_v1.txt journey1
 *
 * Output:
 *   curriculum/<journeyId>.json
 */

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function normalize(s) {
  return String(s || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
}

function isHebrewish(s) {
  return /[\u05D0-\u05EA]/.test(String(s || ""));
}

function isTranslitLine(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  if (isHebrewish(t)) return false;
  // very simple: allow latin letters, spaces, apostrophes, hyphens
  return /^[A-Za-z][A-Za-z '\-–—]+$/.test(t);
}

function parseRootsList(s) {
  const t = normalize(s);
  if (!t) return [];
  // Pull out root-looking items like א־מ־ר or א-מ-ר
  const hits = t.match(/[\u05D0-\u05EA](?:[־-][\u05D0-\u05EA]){1,3}/g) || [];
  // Normalize hyphen to maqaf
  return Array.from(new Set(hits.map((x) => x.replace(/-/g, "־"))));
}

function parseMiniGames(s) {
  const t = normalize(s);
  if (!t) return [];
  // Strip parenthetical details first so commas inside ( ... ) don't split items.
  const noParens = normalize(t.replace(/\([^)]*\)/g, ""));
  return noParens
    .split(",")
    .map((x) => normalize(x.replace(/[.]+$/g, "")))
    .filter(Boolean);
}

function parseVocabPairs(s) {
  // Keep the raw text AND attempt to extract "HEB (english)" pairs.
  const raw = normalize(s);
  if (!raw) return { raw: "", items: [] };
  const items = [];
  const re = /([\u05D0-\u05EA][\u0591-\u05C7\u05D0-\u05EA־\-]+)\s*\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    items.push({ heb: normalize(m[1]), en: normalize(m[2]) });
  }
  return { raw, items };
}

function parseLessonsFromText(text) {
  const t = String(text || "").replace(/\r/g, "");
  const blockRe = /(^|\n)Lesson\s+(\d{1,3})\.\s+([^\n]+)\n([\s\S]*?)(?=\nLesson\s+\d{1,3}\.|$)/g;
  const lessons = [];
  let m;
  while ((m = blockRe.exec(t)) !== null) {
    const num = m[2];
    const title = normalize(m[3]);
    const body = m[4] || "";

    function pick(label) {
      const re = new RegExp(label + "\\s*:\\s*([^\\n]+)", "i");
      const mm = body.match(re);
      return mm ? normalize(mm[1]) : "";
    }

    // Verse block often looks like:
    // Verse: Gen 1:1 (hearing only)
    // <Hebrew line>
    // <transliteration line>
    // Gloss: ...
    const verseRef = pick("Verse");
    let hebrewLine = "";
    let translitLine = "";
    if (verseRef) {
      const vrRe = /Verse\s*:\s*[^\n]+\n([\s\S]*?)(?=\nGloss\s*:|\nTeaching focus\s*:|\nRoot\(s\)\s+introduced\s*:|\nNew vocabulary\s*:|\nMini-games used\s*:|\nExit check\s*:|$)/i;
      const mm2 = body.match(vrRe);
      if (mm2 && mm2[1]) {
        const lines = mm2[1]
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);
        if (lines[0] && isHebrewish(lines[0])) hebrewLine = lines[0];
        if (lines[1] && isTranslitLine(lines[1])) translitLine = lines[1];
      }
    }

    const rootsRaw = pick("Root\\(s\\) introduced");
    const vocabRaw = pick("New vocabulary");
    const gamesRaw = pick("Mini-games used");

    lessons.push({
      num,
      title,
      verse: {
        ref: verseRef,
        hebrew: hebrewLine,
        translit: translitLine,
      },
      gloss: pick("Gloss"),
      focus: pick("Teaching focus"),
      roots: {
        raw: rootsRaw,
        items: parseRootsList(rootsRaw),
      },
      vocab: parseVocabPairs(vocabRaw),
      games: {
        raw: gamesRaw,
        items: parseMiniGames(gamesRaw),
      },
      exit: pick("Exit check"),
    });
  }
  return lessons;
}

async function main() {
  const inPath = process.argv[2];
  const journeyId = process.argv[3] || "journey1";
  if (!inPath) die("Pass a text file path. Example: node scripts/import_curriculum_text.js curriculum/journey1_v1.txt journey1");

  const abs = path.resolve(inPath);
  if (!fs.existsSync(abs)) die("File not found: " + abs);

  const txt = fs.readFileSync(abs, "utf8");
  const lessons = parseLessonsFromText(txt);

  if (!lessons.length) {
    die("No lessons found. Ensure the file contains blocks like: 'Lesson 1. Title' and labeled lines like 'Verse:'");
  }

  const outDir = path.resolve(__dirname, "..", "curriculum");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${journeyId}.json`);

  const payload = {
    id: journeyId,
    importedFrom: abs,
    importedAt: new Date().toISOString(),
    schemaVersion: 2,
    lessons,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log("Wrote", outPath, `(${lessons.length} lessons)`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

