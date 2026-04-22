const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  AlignmentType,
  PageBreak,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ============================================================
// Aleph Trail - Journey 1: Beginnings
// Curriculum DOCX generator (seed document)
//
// Run:
//   npm run journey1:docx
// Output:
//   ./out/Aleph_Trail_Journey_1_Beginnings.docx
// ============================================================

const HEBREW_FONT = "SBL Hebrew";
const BODY_FONT = "Georgia";
const HEAD_FONT = "Arial";

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, bold: true, size: 36, font: HEAD_FONT })],
    spacing: { before: 480, after: 240 },
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 28, font: HEAD_FONT })],
    spacing: { before: 360, after: 180 },
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, size: 24, font: HEAD_FONT })],
    spacing: { before: 240, after: 120 },
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: BODY_FONT, ...opts })],
    spacing: { after: 120 },
  });
}
function mixed(runs) {
  return new Paragraph({
    children: runs.map((r) => {
      if (r.hebrew) {
        return new TextRun({ text: r.text, size: 26, font: HEBREW_FONT, rtl: true });
      }
      return new TextRun({
        text: r.text,
        size: 22,
        font: BODY_FONT,
        bold: !!r.bold,
        italics: !!r.italics,
      });
    }),
    spacing: { after: 120 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function lessonTable(rows) {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "B8B8B8" };
  const borders = { top: border, bottom: border, left: border, right: border };

  function headerCell(text, width) {
    return new TableCell({
      borders,
      width: { size: width, type: WidthType.DXA },
      shading: { fill: "2C3E50", type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20, font: HEAD_FONT })],
        }),
      ],
    });
  }

  function bodyCell(text, width, isHebrew = false) {
    return new TableCell({
      borders,
      width: { size: width, type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({
          alignment: isHebrew ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [
            new TextRun({
              text: String(text || ""),
              size: isHebrew ? 24 : 20,
              font: isHebrew ? HEBREW_FONT : BODY_FONT,
              rtl: isHebrew,
            }),
          ],
        }),
      ],
    });
  }

  const columnWidths = [720, 1800, 2200, 2320, 2320];

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell("#", columnWidths[0]),
          headerCell("Focus", columnWidths[1]),
          headerCell("Verse / Source", columnWidths[2]),
          headerCell("New Roots / Vocab", columnWidths[3]),
          headerCell("Exit Skill", columnWidths[4]),
        ],
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: [
              bodyCell(r.num, columnWidths[0]),
              bodyCell(r.focus, columnWidths[1]),
              bodyCell(r.verse, columnWidths[2]),
              bodyCell(r.vocab, columnWidths[3], !!r.vocabHebrew),
              bodyCell(r.exit, columnWidths[4]),
            ],
          })
      ),
    ],
  });
}

// ============================================================
// LESSON DATA — sourced from curriculum/journey1.json
// ============================================================

function loadJourney1() {
  const p = path.resolve(__dirname, "..", "curriculum", "journey1.json");
  if (!fs.existsSync(p)) {
    throw new Error("Missing curriculum/journey1.json. Run: npm run journey:import-text -- curriculum/journey1_v1.txt journey1");
  }
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const lessons = Array.isArray(j.lessons) ? j.lessons : [];
  return { meta: j, lessons };
}

function vocabLooksHebrew(vocab) {
  return /[\u05D0-\u05EA]/.test(String(vocab || ""));
}

function buildDoc() {
  const { meta, lessons } = loadJourney1();
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          h1("Aleph Trail"),
          p("Journey 1: Beginnings (Genesis 1–11)"),
          mixed([
            { text: "Purpose: ", bold: true },
            { text: "Aleph‑bet mastery, niqqud scaffolding, and real‑verse reading from day one." },
          ]),
          mixed([
            { text: "Exit skill: ", bold: true },
            { text: "Read Genesis 1 aloud with comprehension." },
          ]),
          p(""),
          h2("Lesson Map (40 lessons)"),
          p("Each lesson is designed to follow the same rhythm: chant → root → patterns → verse assembly → comprehension → chant."),
          lessonTable(
            lessons.map((l) => ({
              num: l.num,
              focus: l.focus || l.title || "",
              verse: l.verse || "",
              vocab: l.vocab || (l.roots ? `Roots: ${l.roots}` : ""),
              vocabHebrew: vocabLooksHebrew(l.vocab),
              exit: l.exit || "",
            }))
          ),
          pageBreak(),
          h2("Notes"),
          p("This DOCX is generated from a single lesson data array so it can stay in sync with the in-app Journey plan."),
          p("Next: replace the TBD rows with the final verse-by-verse scope and the new roots introduced each day."),
        ],
      },
    ],
  });

  return doc;
}

async function main() {
  const outDir = path.resolve(__dirname, "..", "out");
  const outPath = path.join(outDir, "Aleph_Trail_Journey_1_Beginnings.docx");
  fs.mkdirSync(outDir, { recursive: true });

  const doc = buildDoc();
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buf);
  console.log("Wrote", outPath, `(${buf.length} bytes)`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

