const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");

/**
 * Import a curriculum DOCX into JSON.
 *
 * This is intentionally pragmatic: we convert the DOCX to raw text and then
 * parse the "Lesson Map" table rows using heuristics.
 *
 * Usage:
 *   npm run journey:import-docx -- "C:\path\to\AlephTrail_Journey1_Curriculum.docx" journey1
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

function splitRow(line) {
  // Try to split common table-to-text patterns: pipes, tabs, multiple spaces.
  if (line.includes("|")) return line.split("|").map(normalize).filter(Boolean);
  if (line.includes("\t")) return line.split("\t").map(normalize).filter(Boolean);
  // Fallback: 2+ spaces as column breaks.
  return line.split(/\s{2,}/g).map(normalize).filter(Boolean);
}

function parseLessonsFromText(text) {
  const t = String(text || "").replace(/\r/g, "");

  // Primary: parse "Lesson N. Title" blocks (works for your spec format).
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

    const verse = pick("Verse");
    const gloss = pick("Gloss");
    const focus = pick("Teaching focus");
    const roots = pick("Root\\(s\\) introduced");
    const vocab = pick("New vocabulary");
    const games = pick("Mini-games used");
    const exit = pick("Exit check");

    lessons.push({ num, title, verse, gloss, focus, roots, vocab, games, exit });
  }

  if (lessons.length) return lessons;

  // Fallback: old table-row heuristic.
  const lines = t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const headerIdx = lines.findIndex((l) =>
    /(^#\b|Focus\b).*Verse.*(Roots|Vocab).*Exit/i.test(l)
  );
  const start = headerIdx >= 0 ? headerIdx + 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const l = lines[i];
    if (/^Notes\b/i.test(l) || /^Lesson Anatomy\b/i.test(l)) break;
    const mm = l.match(/^(\d{1,3})\b/);
    if (!mm) continue;
    const cols = splitRow(l);
    if (cols.length < 3) continue;
    lessons.push({
      num: cols[0],
      title: "",
      focus: cols[1] || "",
      verse: cols[2] || "",
      roots: "",
      vocab: cols[3] || "",
      games: "",
      exit: cols[4] || "",
      gloss: "",
    });
  }
  return lessons;
}

async function main() {
  const docxPath = process.argv[2];
  const journeyId = process.argv[3] || "journey1";
  if (!docxPath) die('Pass a DOCX path. Example: npm run journey:import-docx -- "C:\\path\\file.docx" journey1');

  const abs = path.resolve(docxPath);
  if (!fs.existsSync(abs)) die("File not found: " + abs);

  const buf = fs.readFileSync(abs);
  const res = await mammoth.extractRawText({ buffer: buf });
  const rawText = res && res.value ? res.value : "";

  const lessons = parseLessonsFromText(rawText);
  if (!lessons.length) {
    die(
      "Could not detect lesson rows in DOCX text. " +
        "If this DOCX uses complex tables, export the lesson map as plain text/CSV and we’ll parse that instead."
    );
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

