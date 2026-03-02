/**
 * fetch_oaks_talks.js
 *
 * Fetches President Oaks' General Conference talks from churchofjesuschrist.org
 * Extracts scripture references, generates talk catalog, scripture index, and study plans.
 *
 * Outputs:
 *   talks_data/oaks_talks.js           — Full talk catalog with content + scripture refs
 *   talks_data/oaks_scripture_index.js — Reverse index: verse key → talks that cite it
 *   talks_data/oaks_study_plans.js     — Auto-generated themed study plans
 *
 * Usage: node fetch_oaks_talks.js [--force-fetch] [--limit N]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ──
const CACHE_DIR = path.join(__dirname, '_cache', 'talks');
const OUTPUT_DIR = path.join(__dirname, 'talks_data');
const SPEAKER_URL = 'https://www.churchofjesuschrist.org/study/general-conference/speakers/dallin-h-oaks?lang=eng';
const API_BASE = 'https://www.churchofjesuschrist.org/study/api/v3/language-pages/type/content?lang=eng&uri=';
const SITE_BASE = 'https://www.churchofjesuschrist.org';

const FORCE_FETCH = process.argv.includes('--force-fetch');
const LIMIT_ARG = process.argv.indexOf('--limit');
const TALK_LIMIT = LIMIT_ARG > -1 ? parseInt(process.argv[LIMIT_ARG + 1], 10) : 0;

// ── Abbreviation map (matches crossrefs_engine.js) ──
const ABBR_TO_FULL = {
  'Gen.': 'Genesis', 'Ex.': 'Exodus', 'Lev.': 'Leviticus', 'Num.': 'Numbers',
  'Deut.': 'Deuteronomy', 'Josh.': 'Joshua', 'Judg.': 'Judges', 'Ruth': 'Ruth',
  '1\u00a0Sam.': '1 Samuel', '2\u00a0Sam.': '2 Samuel', '1\u00a0Kgs.': '1 Kings', '2\u00a0Kgs.': '2 Kings',
  '1 Sam.': '1 Samuel', '2 Sam.': '2 Samuel', '1 Kgs.': '1 Kings', '2 Kgs.': '2 Kings',
  '1\u00a0Chr.': '1 Chronicles', '2\u00a0Chr.': '2 Chronicles',
  '1 Chr.': '1 Chronicles', '2 Chr.': '2 Chronicles',
  'Ezra': 'Ezra', 'Neh.': 'Nehemiah',
  'Esth.': 'Esther', 'Job': 'Job', 'Ps.': 'Psalms', 'Prov.': 'Proverbs',
  'Eccl.': 'Ecclesiastes', 'Song': 'Song of Solomon', 'Isa.': 'Isaiah', 'Jer.': 'Jeremiah',
  'Lam.': 'Lamentations', 'Ezek.': 'Ezekiel', 'Dan.': 'Daniel', 'Hosea': 'Hosea',
  'Joel': 'Joel', 'Amos': 'Amos', 'Obad.': 'Obadiah', 'Jonah': 'Jonah',
  'Micah': 'Micah', 'Nahum': 'Nahum', 'Hab.': 'Habakkuk', 'Zeph.': 'Zephaniah',
  'Hag.': 'Haggai', 'Zech.': 'Zechariah', 'Mal.': 'Malachi',
  'Matt.': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John',
  'Acts': 'Acts', 'Rom.': 'Romans', '1\u00a0Cor.': '1 Corinthians', '2\u00a0Cor.': '2 Corinthians',
  '1 Cor.': '1 Corinthians', '2 Cor.': '2 Corinthians',
  'Gal.': 'Galatians', 'Eph.': 'Ephesians', 'Philip.': 'Philippians', 'Col.': 'Colossians',
  '1\u00a0Thes.': '1 Thessalonians', '2\u00a0Thes.': '2 Thessalonians',
  '1 Thes.': '1 Thessalonians', '2 Thes.': '2 Thessalonians',
  '1\u00a0Tim.': '1 Timothy', '2\u00a0Tim.': '2 Timothy',
  '1 Tim.': '1 Timothy', '2 Tim.': '2 Timothy',
  'Titus': 'Titus', 'Philem.': 'Philemon',
  'Heb.': 'Hebrews', 'James': 'James',
  '1\u00a0Pet.': '1 Peter', '2\u00a0Pet.': '2 Peter',
  '1 Pet.': '1 Peter', '2 Pet.': '2 Peter',
  '1\u00a0Jn.': '1 John', '2\u00a0Jn.': '2 John', '3\u00a0Jn.': '3 John',
  '1 Jn.': '1 John', '2 Jn.': '2 John', '3 Jn.': '3 John',
  'Jude': 'Jude', 'Rev.': 'Revelation',
  'D&C': 'D&C', 'Moses': 'Moses', 'Abr.': 'Abraham', 'JS—H': 'JS-H', 'JS—M': 'JS-M', 'A of F': 'A-of-F',
  '1\u00a0Ne.': '1 Nephi', '2\u00a0Ne.': '2 Nephi',
  '1 Ne.': '1 Nephi', '2 Ne.': '2 Nephi',
  'Jacob': 'Jacob', 'Enos': 'Enos',
  'Jarom': 'Jarom', 'Omni': 'Omni', 'W of M': 'Words of Mormon',
  'Mosiah': 'Mosiah', 'Alma': 'Alma', 'Hel.': 'Helaman',
  '3\u00a0Ne.': '3 Nephi', '4\u00a0Ne.': '4 Nephi',
  '3 Ne.': '3 Nephi', '4 Ne.': '4 Nephi',
  'Morm.': 'Mormon', 'Ether': 'Ether', 'Moro.': 'Moroni'
};

// Sorted by length descending for greedy matching
const ABBR_KEYS = Object.keys(ABBR_TO_FULL).sort((a, b) => b.length - a.length);

// ── URI-to-book mapping for parsing href links ──
const URI_BOOK_MAP = {
  'ot/gen': 'Genesis', 'ot/ex': 'Exodus', 'ot/lev': 'Leviticus', 'ot/num': 'Numbers',
  'ot/deut': 'Deuteronomy', 'ot/josh': 'Joshua', 'ot/judg': 'Judges', 'ot/ruth': 'Ruth',
  'ot/1-sam': '1 Samuel', 'ot/2-sam': '2 Samuel', 'ot/1-kgs': '1 Kings', 'ot/2-kgs': '2 Kings',
  'ot/1-chr': '1 Chronicles', 'ot/2-chr': '2 Chronicles', 'ot/ezra': 'Ezra', 'ot/neh': 'Nehemiah',
  'ot/esth': 'Esther', 'ot/job': 'Job', 'ot/ps': 'Psalms', 'ot/prov': 'Proverbs',
  'ot/eccl': 'Ecclesiastes', 'ot/song': 'Song of Solomon', 'ot/isa': 'Isaiah', 'ot/jer': 'Jeremiah',
  'ot/lam': 'Lamentations', 'ot/ezek': 'Ezekiel', 'ot/dan': 'Daniel', 'ot/hosea': 'Hosea',
  'ot/joel': 'Joel', 'ot/amos': 'Amos', 'ot/obad': 'Obadiah', 'ot/jonah': 'Jonah',
  'ot/micah': 'Micah', 'ot/nahum': 'Nahum', 'ot/hab': 'Habakkuk', 'ot/zeph': 'Zephaniah',
  'ot/hag': 'Haggai', 'ot/zech': 'Zechariah', 'ot/mal': 'Malachi',
  'nt/matt': 'Matthew', 'nt/mark': 'Mark', 'nt/luke': 'Luke', 'nt/john': 'John',
  'nt/acts': 'Acts', 'nt/rom': 'Romans', 'nt/1-cor': '1 Corinthians', 'nt/2-cor': '2 Corinthians',
  'nt/gal': 'Galatians', 'nt/eph': 'Ephesians', 'nt/philip': 'Philippians', 'nt/col': 'Colossians',
  'nt/1-thes': '1 Thessalonians', 'nt/2-thes': '2 Thessalonians',
  'nt/1-tim': '1 Timothy', 'nt/2-tim': '2 Timothy', 'nt/titus': 'Titus', 'nt/philem': 'Philemon',
  'nt/heb': 'Hebrews', 'nt/james': 'James', 'nt/1-pet': '1 Peter', 'nt/2-pet': '2 Peter',
  'nt/1-jn': '1 John', 'nt/2-jn': '2 John', 'nt/3-jn': '3 John', 'nt/jude': 'Jude', 'nt/rev': 'Revelation',
  'dc-testament/dc': 'D&C',
  'pgp/moses': 'Moses', 'pgp/abr': 'Abraham', 'pgp/js-h': 'JS-H', 'pgp/js-m': 'JS-M', 'pgp/a-of-f': 'A-of-F',
  'bofm/1-ne': '1 Nephi', 'bofm/2-ne': '2 Nephi', 'bofm/jacob': 'Jacob', 'bofm/enos': 'Enos',
  'bofm/jarom': 'Jarom', 'bofm/omni': 'Omni', 'bofm/w-of-m': 'Words of Mormon',
  'bofm/mosiah': 'Mosiah', 'bofm/alma': 'Alma', 'bofm/hel': 'Helaman',
  'bofm/3-ne': '3 Nephi', 'bofm/4-ne': '4 Nephi', 'bofm/morm': 'Mormon',
  'bofm/ether': 'Ether', 'bofm/moro': 'Moroni'
};

const URI_KEYS = Object.keys(URI_BOOK_MAP).sort((a, b) => b.length - a.length);

// ── Study plan topic keywords ──
const STUDY_PLAN_TOPICS = {
  'faith-and-testimony': {
    title: 'Faith and Testimony',
    titleHe: 'אמונה ועדות',
    description: 'Scriptures on faith and testimony referenced by President Oaks',
    keywords: ['faith', 'believe', 'testimony', 'witness', 'trust', 'hope']
  },
  'repentance-and-forgiveness': {
    title: 'Repentance and Forgiveness',
    titleHe: 'תשובה וסליחה',
    description: 'Scriptures on repentance and forgiveness',
    keywords: ['repent', 'forgive', 'sin', 'atone', 'mercy', 'pardon']
  },
  'covenants-and-ordinances': {
    title: 'Covenants and Ordinances',
    titleHe: 'בריתות וטקסים',
    description: 'Scriptures on covenants and sacred ordinances',
    keywords: ['covenant', 'ordinance', 'baptism', 'temple', 'sacrament', 'endow']
  },
  'family-and-marriage': {
    title: 'Family and Marriage',
    titleHe: 'משפחה ונישואין',
    description: 'Scriptures on family, marriage, and parenting',
    keywords: ['family', 'marriage', 'husband', 'wife', 'children', 'parent', 'home']
  },
  'charity-and-service': {
    title: 'Charity and Service',
    titleHe: 'צדקה ושירות',
    description: 'Scriptures on love, charity, and serving others',
    keywords: ['charity', 'love', 'serve', 'neighbor', 'compassion', 'poor', 'needy']
  },
  'holy-ghost-and-revelation': {
    title: 'Holy Ghost and Revelation',
    titleHe: 'רוח הקודש וגילוי',
    description: 'Scriptures on the Holy Ghost and personal revelation',
    keywords: ['spirit', 'holy ghost', 'revelation', 'inspire', 'prompt', 'discern', 'gift']
  },
  'jesus-christ-and-atonement': {
    title: 'Jesus Christ and the Atonement',
    titleHe: 'ישוע המשיח והכפרה',
    description: 'Scriptures about Jesus Christ and His atoning sacrifice',
    keywords: ['christ', 'jesus', 'savior', 'redeemer', 'atonement', 'crucif', 'resurrect', 'lamb']
  },
  'obedience-and-commandments': {
    title: 'Obedience and Commandments',
    titleHe: 'ציות ומצוות',
    description: 'Scriptures on keeping the commandments',
    keywords: ['obey', 'command', 'law', 'statut', 'keep', 'righteous']
  }
};

// ── Helpers ──
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) loc = SITE_BASE + loc;
        fetchPage(loc).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function fetchWithRetry(url, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchPage(url);
    } catch (err) {
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`    Retry ${attempt + 1} in ${delay}ms (${err.message})`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

function getCachePath(key) {
  return path.join(CACHE_DIR, key.replace(/[\/\\:?*"<>|]/g, '_') + '.json');
}

function readCache(key) {
  const p = getCachePath(key);
  if (FORCE_FETCH) return null;
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) { /* ignore corrupt cache */ }
  return null;
}

function writeCache(key, data) {
  fs.writeFileSync(getCachePath(key), JSON.stringify(data, null, 2), 'utf8');
}

// ── Parse scripture reference from text ──
function parseScriptureRef(text) {
  const norm = text.replace(/\u00a0/g, ' ').trim();
  for (const abbr of ABBR_KEYS) {
    if (norm.startsWith(abbr)) {
      const rest = norm.substring(abbr.length).trim();
      const m = rest.match(/^(\d+):(\d+)/);
      if (m) {
        return ABBR_TO_FULL[abbr] + '|' + m[1] + '|' + m[2];
      }
      // Chapter-only references (e.g., "Alma 32")
      const cm = rest.match(/^(\d+)$/);
      if (cm) {
        return ABBR_TO_FULL[abbr] + '|' + cm[1] + '|0';
      }
    }
  }
  return null;
}

// ── Parse scripture reference from href URI ──
function parseScriptureUri(href) {
  // e.g., /study/scriptures/bofm/alma/32?lang=eng#p21
  const m = href.match(/\/study\/scriptures\/([^?#]+)/);
  if (!m) return null;
  const parts = m[1].split('/');
  // Need at least volume/book/chapter
  if (parts.length < 3) return null;
  const volBook = parts[0] + '/' + parts[1];
  const chapter = parts[2];
  const verse = href.match(/#p(\d+)/);

  for (const uriKey of URI_KEYS) {
    if (volBook === uriKey || volBook.startsWith(uriKey)) {
      const book = URI_BOOK_MAP[uriKey];
      return book + '|' + chapter + '|' + (verse ? verse[1] : '0');
    }
  }
  return null;
}

// ── Strip HTML tags ──
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

// ── Extract talk list from speaker page ──
function extractTalkList(html) {
  const talks = [];

  // Try to extract from __INITIAL_STATE__ first
  const stateMatch = html.match(/__INITIAL_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/);
  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      // Navigate the state tree to find talk entries
      const pages = state.routeCache || state.pageCache || {};
      for (const key of Object.keys(pages)) {
        const page = pages[key];
        if (page && page.content && page.content.body) {
          extractTalksFromBody(page.content.body, talks);
        }
      }
      if (talks.length > 0) return talks;
    } catch (e) {
      console.log('  Could not parse __INITIAL_STATE__, falling back to HTML parsing');
    }
  }

  // Fallback: Parse HTML links directly
  // Look for links to /general-conference/ talks
  const linkRegex = /<a[^>]*href="([^"]*\/general-conference\/(\d{4})\/(\d{2})\/([^"?#]+))[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const uri = m[1].split('?')[0];
    const year = m[2];
    const month = m[3];
    const slug = m[4];
    const linkText = stripHtml(m[5]).trim();

    // Skip navigation/non-talk links
    if (!linkText || linkText.length < 5) continue;
    if (slug === 'speakers' || slug.includes('/')) continue;

    // Deduplicate
    if (talks.some(t => t.uri === uri)) continue;

    // Clean conference date prefix from title
    const cleanTitle = linkText.replace(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i, '').trim();

    talks.push({
      uri: uri.replace(SITE_BASE, ''),
      year: parseInt(year),
      month: parseInt(month),
      slug: slug,
      title: cleanTitle || linkText,
      conference: (parseInt(month) <= 6 ? 'April' : 'October') + ' ' + year
    });
  }

  return talks;
}

function extractTalksFromBody(body, talks) {
  // The body may contain sections organized by year
  if (typeof body === 'string') {
    const linkRegex = /href="([^"]*\/general-conference\/(\d{4})\/(\d{2})\/([^"?#]+))[^"]*"/gi;
    let m;
    while ((m = linkRegex.exec(body)) !== null) {
      const uri = m[1].split('?')[0].replace(SITE_BASE, '');
      const year = parseInt(m[2]);
      const month = parseInt(m[3]);
      const slug = m[4];
      if (slug === 'speakers' || slug.includes('/')) continue;
      if (talks.some(t => t.uri === uri)) continue;
      talks.push({
        uri, year, month, slug,
        title: '',
        conference: (month <= 6 ? 'April' : 'October') + ' ' + year
      });
    }
  }
}

// ── Extract content from individual talk page ──
function parseTalkPage(html, talkMeta) {
  const refs = [];
  const paragraphs = [];

  // Try __INITIAL_STATE__ for structured data
  const stateMatch = html.match(/__INITIAL_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/);
  let title = talkMeta.title || '';
  let session = '';

  if (stateMatch) {
    try {
      const state = JSON.parse(stateMatch[1]);
      const pages = state.routeCache || state.pageCache || {};
      for (const key of Object.keys(pages)) {
        const page = pages[key];
        if (page && page.meta) {
          if (page.meta.title && !title) title = page.meta.title;
        }
      }
    } catch (e) { /* ignore */ }
  }

  // Extract title from HTML
  if (!title) {
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch) title = stripHtml(titleMatch[1]);
  }

  // Clean conference date prefix from title (e.g., "October 2025The Family..." → "The Family...")
  title = title.replace(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i, '').trim();

  // Extract session
  const sessionMatch = html.match(/class="[^"]*session[^"]*"[^>]*>([\s\S]*?)<\//i);
  if (sessionMatch) session = stripHtml(sessionMatch[1]);

  // Extract the main body content
  const bodyMatch = html.match(/<div[^>]*class="[^"]*body-block[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<(?:footer|nav|div[^>]*class="[^"]*related)/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  // Extract scripture references from <a> tags
  const aRegex = /<a[^>]*href="([^"]*\/study\/scriptures\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let am;
  while ((am = aRegex.exec(bodyHtml)) !== null) {
    const ref = parseScriptureUri(am[1]);
    if (ref && !refs.includes(ref)) refs.push(ref);
  }

  // Extract paragraphs
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm;
  while ((pm = pRegex.exec(bodyHtml)) !== null) {
    const pHtml = pm[1];
    const text = stripHtml(pHtml);
    if (text.length < 10) continue;

    // Find refs within this paragraph
    const paraRefs = [];
    const pARegex = /<a[^>]*href="([^"]*\/study\/scriptures\/[^"]*)"[^>]*>/gi;
    let pr;
    while ((pr = pARegex.exec(pHtml)) !== null) {
      const ref = parseScriptureUri(pr[1]);
      if (ref) paraRefs.push(ref);
    }

    // Also scan plain text for scripture patterns
    for (const abbr of ABBR_KEYS) {
      const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const textRefRegex = new RegExp(escaped + '\\s*(\\d+):(\\d+)', 'g');
      let tr;
      while ((tr = textRefRegex.exec(text)) !== null) {
        const ref = ABBR_TO_FULL[abbr] + '|' + tr[1] + '|' + tr[2];
        if (!paraRefs.includes(ref)) paraRefs.push(ref);
        if (!refs.includes(ref)) refs.push(ref);
      }
    }

    paragraphs.push({ text, refs: paraRefs });
  }

  return {
    title: title || talkMeta.title || talkMeta.slug,
    session,
    scriptureRefs: refs,
    paragraphs
  };
}

// ── Generate study plans from talk data ──
function generateStudyPlans(allTalks) {
  const plans = [];

  for (const [planId, config] of Object.entries(STUDY_PLAN_TOPICS)) {
    const items = [];
    const seenRefs = new Set();

    for (const talk of allTalks) {
      for (const para of talk.paragraphs) {
        if (para.refs.length === 0) continue;

        // Check if paragraph content matches topic keywords
        const textLower = para.text.toLowerCase();
        const matches = config.keywords.some(kw => textLower.includes(kw));
        if (!matches) continue;

        for (const ref of para.refs) {
          if (seenRefs.has(ref)) continue;
          seenRefs.add(ref);

          // Get context snippet (first 120 chars of paragraph)
          const snippet = para.text.length > 120 ? para.text.substring(0, 120) + '...' : para.text;

          items.push({
            ref,
            talkId: talk.id,
            talkTitle: talk.title,
            date: talk.date,
            note: snippet
          });
        }
      }
    }

    if (items.length > 0) {
      plans.push({
        id: planId,
        title: config.title,
        titleHe: config.titleHe,
        description: config.description,
        items: items.slice(0, 50) // Cap at 50 items per plan
      });
    }
  }

  return plans;
}

// ── Generate scripture → talks reverse index ──
function generateScriptureIndex(allTalks) {
  const index = {};

  for (const talk of allTalks) {
    for (const ref of talk.scriptureRefs) {
      if (!index[ref]) index[ref] = [];

      // Avoid duplicates
      if (index[ref].some(e => e.talkId === talk.id)) continue;

      // Find a context snippet from the paragraph that uses this ref
      let snippet = '';
      for (const para of talk.paragraphs) {
        if (para.refs.includes(ref)) {
          snippet = para.text.length > 120 ? para.text.substring(0, 120) + '...' : para.text;
          break;
        }
      }

      index[ref].push({
        talkId: talk.id,
        title: talk.title,
        date: talk.date,
        conference: talk.conference,
        snippet
      });
    }
  }

  return index;
}

// ── Main ──
async function main() {
  console.log('=== Fetching President Oaks Conference Talks ===\n');

  // Ensure directories
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Step 1: Get talk catalog
  console.log('Step 1: Fetching speaker page...');
  let speakerHtml;
  const cachedSpeaker = readCache('speaker_index');
  if (cachedSpeaker) {
    console.log('  (using cache)');
    speakerHtml = cachedSpeaker.html;
  } else {
    speakerHtml = await fetchWithRetry(SPEAKER_URL);
    writeCache('speaker_index', { html: speakerHtml, fetchedAt: new Date().toISOString() });
  }

  let talkList = extractTalkList(speakerHtml);
  console.log(`  Found ${talkList.length} talks\n`);

  if (talkList.length === 0) {
    console.error('ERROR: No talks found on speaker page. The page format may have changed.');
    console.log('Attempting alternative approach: scraping conference pages by year...');

    // Fallback: scan conferences year by year
    for (let year = 2025; year >= 1984; year--) {
      for (const month of ['10', '04']) {
        const confUrl = `${SITE_BASE}/study/general-conference/${year}/${month}?lang=eng`;
        try {
          const confHtml = await fetchWithRetry(confUrl);
          const linkRegex = /href="([^"]*\/general-conference\/\d{4}\/\d{2}\/[^"?#]*oaks[^"?#]*)[^"]*"/gi;
          let cm;
          while ((cm = linkRegex.exec(confHtml)) !== null) {
            const uri = cm[1].split('?')[0].replace(SITE_BASE, '');
            if (!talkList.some(t => t.uri === uri)) {
              talkList.push({
                uri, year, month: parseInt(month),
                slug: uri.split('/').pop(),
                title: '',
                conference: (parseInt(month) <= 6 ? 'April' : 'October') + ' ' + year
              });
            }
          }
          await sleep(300);
        } catch (e) {
          // Skip failures
        }
      }
    }
    console.log(`  Fallback found ${talkList.length} talks\n`);
  }

  // Sort by date (newest first)
  talkList.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });

  // Apply limit if specified
  if (TALK_LIMIT > 0 && talkList.length > TALK_LIMIT) {
    console.log(`  Limiting to ${TALK_LIMIT} most recent talks\n`);
    talkList = talkList.slice(0, TALK_LIMIT);
  }

  // Step 2: Fetch each talk
  console.log('Step 2: Fetching individual talks...');
  const allTalks = [];
  let fetchCount = 0;
  let cacheHits = 0;

  for (let i = 0; i < talkList.length; i++) {
    const meta = talkList[i];
    const cacheKey = `talk_${meta.year}_${String(meta.month).padStart(2, '0')}_${meta.slug}`;
    const talkId = `${meta.year}-${String(meta.month).padStart(2, '0')}-${meta.slug}`;
    const dateStr = `${meta.year}-${String(meta.month).padStart(2, '0')}-01`;

    let talkData;
    const cached = readCache(cacheKey);

    if (cached && cached.parsed) {
      cacheHits++;
      talkData = cached.parsed;
    } else {
      const talkUrl = SITE_BASE + meta.uri + '?lang=eng';
      try {
        const talkHtml = await fetchWithRetry(talkUrl);
        talkData = parseTalkPage(talkHtml, meta);
        writeCache(cacheKey, { parsed: talkData, fetchedAt: new Date().toISOString() });
        fetchCount++;
        process.stdout.write(`  [${i + 1}/${talkList.length}] ${talkData.title || meta.slug} — ${talkData.scriptureRefs.length} refs\n`);
        await sleep(500);
      } catch (err) {
        console.error(`  [${i + 1}/${talkList.length}] FAILED: ${meta.uri} — ${err.message}`);
        continue;
      }
    }

    if (talkData) {
      allTalks.push({
        id: talkId,
        title: talkData.title,
        date: dateStr,
        session: talkData.session,
        conference: meta.conference,
        uri: meta.uri,
        year: meta.year,
        month: meta.month,
        scriptureRefs: talkData.scriptureRefs,
        paragraphs: talkData.paragraphs
      });
    }
  }

  console.log(`\n  Fetched: ${fetchCount} | Cached: ${cacheHits} | Total: ${allTalks.length}\n`);

  // Step 3: Generate output files
  console.log('Step 3: Generating output files...');

  // 3a. Talk catalog
  const talksJs = 'window._oaksTalksData = ' + JSON.stringify(allTalks, null, 2) + ';\n';
  const talksPath = path.join(OUTPUT_DIR, 'oaks_talks.js');
  fs.writeFileSync(talksPath, talksJs, 'utf8');
  const talksMB = (Buffer.byteLength(talksJs) / (1024 * 1024)).toFixed(2);
  console.log(`  oaks_talks.js — ${allTalks.length} talks (${talksMB} MB)`);

  // 3b. Scripture index
  const scriptureIndex = generateScriptureIndex(allTalks);
  const indexJs = 'window._oaksScriptureIndex = ' + JSON.stringify(scriptureIndex, null, 2) + ';\n';
  const indexPath = path.join(OUTPUT_DIR, 'oaks_scripture_index.js');
  fs.writeFileSync(indexPath, indexJs, 'utf8');
  const indexMB = (Buffer.byteLength(indexJs) / (1024 * 1024)).toFixed(2);
  const totalRefs = Object.values(scriptureIndex).reduce((s, arr) => s + arr.length, 0);
  console.log(`  oaks_scripture_index.js — ${Object.keys(scriptureIndex).length} unique verses, ${totalRefs} references (${indexMB} MB)`);

  // 3c. Study plans
  const studyPlans = generateStudyPlans(allTalks);
  const plansJs = 'window._oaksStudyPlans = ' + JSON.stringify(studyPlans, null, 2) + ';\n';
  const plansPath = path.join(OUTPUT_DIR, 'oaks_study_plans.js');
  fs.writeFileSync(plansPath, plansJs, 'utf8');
  const totalPlanItems = studyPlans.reduce((s, p) => s + p.items.length, 0);
  console.log(`  oaks_study_plans.js — ${studyPlans.length} plans, ${totalPlanItems} items`);

  // Summary
  const totalScriptureRefs = allTalks.reduce((s, t) => s + t.scriptureRefs.length, 0);
  console.log(`\n=== Done ===`);
  console.log(`Talks processed: ${allTalks.length}`);
  console.log(`Total scripture references: ${totalScriptureRefs}`);
  console.log(`Unique verses referenced: ${Object.keys(scriptureIndex).length}`);
  console.log(`Study plans generated: ${studyPlans.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
