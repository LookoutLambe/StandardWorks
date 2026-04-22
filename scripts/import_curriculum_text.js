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

    lessons.push({
      num,
      title,
      verse: pick("Verse"),
      gloss: pick("Gloss"),
      focus: pick("Teaching focus"),
      roots: pick("Root\\(s\\) introduced"),
      vocab: pick("New vocabulary"),
      games: pick("Mini-games used"),
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
    lessons,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log("Wrote", outPath, `(${lessons.length} lessons)`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

