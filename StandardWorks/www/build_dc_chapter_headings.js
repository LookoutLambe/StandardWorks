/**
 * build_dc_chapter_headings.js
 *
 * Fetch official LDS section headings (study summaries) for D&C from churchofjesuschrist.org.
 * Outputs: dc_chapter_headings.js
 *
 * Usage: node build_dc_chapter_headings.js
 */

const https = require('https');
const fs = require('fs');

const SECTIONS = [];
for (let i = 1; i <= 138; i++) SECTIONS.push({ name: `D&C ${i}`, slug: `dc/${i}` });
SECTIONS.push({ name: 'OD 1', slug: 'od/1' });
SECTIONS.push({ name: 'OD 2', slug: 'od/2' });

const BASE_URL = 'https://www.churchofjesuschrist.org/study/scriptures/dc-testament';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Accept: 'text/html' } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let loc = res.headers.location;
          if (loc.startsWith('/')) loc = 'https://www.churchofjesuschrist.org' + loc;
          fetchPage(loc).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractHeading(html) {
  let m = html.match(/<p[^>]*class="[^"]*study-summary[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (m) return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  m = html.match(/<div[^>]*class="[^"]*studySummary[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (m) return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  m = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"[^>]*>/i);
  if (m) {
    const desc = String(m[1] || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (desc && desc.length > 30) return desc;
  }
  return '';
}

async function main() {
  const out = {};
  let done = 0;
  const total = SECTIONS.length;

  for (const s of SECTIONS) {
    const url = `${BASE_URL}/${s.slug}?lang=eng`;
    done++;
    try {
      const html = await fetchPage(url);
      const heading = extractHeading(html);
      out[s.name] = heading || '';
      process.stderr.write(`${heading ? '✓' : '✗'} ${done}/${total} ${s.name}\n`);
    } catch (e) {
      out[s.name] = '';
      process.stderr.write(`✗ ${done}/${total} ${s.name} (${e.message})\n`);
    }
    await sleep(200);
  }

  const js =
    'var _dcChapterHeadings = ' + JSON.stringify(out, null, 2) + ';\n';
  fs.writeFileSync('dc_chapter_headings.js', js, 'utf8');
  process.stderr.write('Wrote dc_chapter_headings.js\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

