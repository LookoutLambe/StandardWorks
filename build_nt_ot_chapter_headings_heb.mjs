/**
 * Builds chapter heading Hebrew translations (machine translation) book-by-book
 * with a resume file, using Google Translate (client=gtx).
 *
 * Usage:
 *   node build_nt_ot_chapter_headings_heb.mjs ot "Genesis"
 *   node build_nt_ot_chapter_headings_heb.mjs ot "Exodus"
 *   node build_nt_ot_chapter_headings_heb.mjs nt "Matthew"
 *   node build_nt_ot_chapter_headings_heb.mjs nt "__all__"
 */
import fs from 'fs';
import https from 'https';

const DELAY_MS = 130;

function translate(text) {
  return new Promise((resolve, reject) => {
    const u =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=iw&dt=t&q=' +
      encodeURIComponent(text);
    https
      .get(
        u,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StandardWorks/1.0)' },
        },
        (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => {
            if (res.statusCode !== 200) {
              reject(new Error('HTTP ' + res.statusCode));
              return;
            }
            try {
              const j = JSON.parse(d);
              let out = '';
              for (const seg of j[0]) {
                if (seg && seg[0]) out += seg[0];
              }
              if (!out) reject(new Error('empty translate'));
              else resolve(out);
            } catch (e) {
              reject(e);
            }
          });
        }
      )
      .on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function writeJsonAtomic(path, obj) {
  const tmp = path + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, path);
}

function loadEnObject(sourcePath, varName) {
  const s = fs.readFileSync(sourcePath, 'utf8');
  const re = new RegExp('var\\s+' + varName + '\\s*=\\s*(\\{[\\s\\S]*\\});');
  const m = s.match(re);
  if (!m) throw new Error('Could not parse ' + varName + ' from ' + sourcePath);
  return eval('(' + m[1] + ')');
}

async function buildOne({ sourcePath, enVar, outVar, outPath, partialPath }) {
  const en = loadEnObject(sourcePath, enVar);
  const keys = Object.keys(en);
  let done = {};
  if (fs.existsSync(partialPath)) {
    try {
      done = JSON.parse(fs.readFileSync(partialPath, 'utf8'));
    } catch {
      done = {};
    }
  }
  const bookArg = process.argv[3] || '__all__';
  const wantedBook = (bookArg || '__all__').trim();
  function bookOfKey(k) {
    return k.replace(/\s+\d+$/, '').trim();
  }
  const wantedKeys =
    wantedBook === '__all__'
      ? keys
      : keys.filter((k) => bookOfKey(k) === wantedBook);

  if (wantedKeys.length === 0) {
    throw new Error('No keys found for book: ' + wantedBook);
  }

  for (let i = 0; i < wantedKeys.length; i++) {
    const k = wantedKeys[i];
    if (done[k]) continue;
    let tries = 0;
    let lastErr;
    while (tries < 5) {
      try {
        done[k] = await translate(en[k]);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        tries++;
        await sleep(400 * tries);
      }
    }
    if (lastErr) throw new Error('translate failed for ' + k + ': ' + lastErr.message);
    writeJsonAtomic(partialPath, done);
    await sleep(DELAY_MS);
    if ((i + 1) % 30 === 0) console.log(enVar, wantedBook, i + 1, '/', wantedKeys.length);
  }

  // If we have everything, emit the JS file.
  const missing = keys.filter((k) => !done[k]);
  if (missing.length === 0) {
    const ordered = {};
    for (const k of keys) ordered[k] = done[k];
    fs.writeFileSync(outPath, 'var ' + outVar + ' = ' + JSON.stringify(ordered, null, 2) + ';\n');
    fs.unlinkSync(partialPath);
    console.log('wrote', outPath, '(' + keys.length + ' keys)');
  } else {
    console.log('partial saved', partialPath, '(missing ' + missing.length + ')');
  }
}

const vol = (process.argv[2] || '').trim().toLowerCase();
if (vol !== 'nt' && vol !== 'ot') {
  throw new Error('First arg must be nt or ot.');
}

if (vol === 'nt') {
  await buildOne({
    sourcePath: 'nt_chapter_headings.js',
    enVar: '_ntChapterHeadings',
    outVar: '_ntChapterHeadingsHeb',
    outPath: 'nt_chapter_headings_heb.js',
    partialPath: 'nt_chapter_headings_heb.partial.json',
  });
} else {
  await buildOne({
    sourcePath: 'ot_chapter_headings.js',
    enVar: '_otChapterHeadings',
    outVar: '_otChapterHeadingsHeb',
    outPath: 'ot_chapter_headings_heb.js',
    partialPath: 'ot_chapter_headings_heb.partial.json',
  });
}
