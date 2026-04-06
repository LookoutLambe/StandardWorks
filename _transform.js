#!/usr/bin/env node
/**
 * Transform script to apply all 5 improvements to a scripture page.
 * Usage: node _transform.js <file> <volumeKey>
 * volumeKey: ot, nt, bom, dc, pgp, jst
 */
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const volumeKey = process.argv[3];
if (!file || !volumeKey) { console.error('Usage: node _transform.js <file> <volumeKey>'); process.exit(1); }

const isBom = volumeKey === 'bom';
const prefix = isBom ? '../' : '';

let html = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// ============================================================
// 1. CSS: Replace nav-dropdown styles with slider panel styles
// ============================================================
const newDropdownCSS = `#nav-dropdown {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: 50vw; max-width: 50vw;
  background: #1e2233; border-right: 2px solid #c8a84e;
  overflow-y: auto; z-index: 1100;
  padding: 0 0 4px;
  transform: translateX(-100%); transition: transform 0.3s ease;
  box-shadow: 4px 0 24px rgba(0,0,0,0.4);
}
#nav-dropdown.open { transform: translateX(0); }
.nav-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; border-bottom: 1px solid #3a3f55;
  position: sticky; top: 0; background: #1e2233; z-index: 1;
}
.nav-panel-title { font-family: 'Cormorant Garamond', serif; font-size: 1.1em; color: #c8a84e; font-weight: 600; }
.nav-panel-close { cursor: pointer; color: #c8a84e; font-size: 1.4em; background: none; border: none; padding: 4px 8px; }
.nav-panel-close:hover { color: #fff; }`;

// Use regex to replace any #nav-dropdown { ... } block + #nav-dropdown.open { ... }
html = html.replace(/#nav-dropdown \{[^}]+\}\s*\n#nav-dropdown\.open \{[^}]+\}/s, newDropdownCSS);

// Update dark mode CSS for nav panel (handle various formats)
html = html.replace(
  /body\.dark-mode #nav-dropdown \{ background: #0a0a0a; border-color: #444444; \}/,
  `body.dark-mode #nav-dropdown { background: #0a0a0a; border-color: #444444; }
body.dark-mode .nav-panel-header { background: #0a0a0a; }`
);

// Update mobile CSS - handle various width values
html = html.replace(
  /@media \(max-width: 600px\) \{\s*\n\s*#nav-dropdown \{ width: \d+px; \}/,
  `@media (max-width: 600px) {\n  #nav-dropdown { width: 85vw; max-width: 85vw; }`
);
// Also handle vw units if already transformed
html = html.replace(
  /#nav-dropdown \{ width: 100vw; max-width: 100vw; \}/,
  `#nav-dropdown { width: 85vw; max-width: 85vw; }`
);

// Add volume cards CSS and shortcuts overlay CSS before the .nav-row rule
const extraCSS = `/* Volume cards in nav panel */
.dd-volume-card {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px; color: #8a7a4a;
  text-decoration: none; font-family: 'Crimson Pro', serif;
  font-size: 0.9em; transition: background 0.15s; direction: ltr;
}
.dd-volume-card:hover { background: #2a2f44; color: #c8a84e; }
.dd-volume-card.active { color: #c8a84e; font-weight: 600; background: rgba(200,168,78,0.1); border-left: 3px solid #c8a84e; }
.dd-vol-heb { font-family: 'David Libre', serif; font-size: 1em; direction: rtl; min-width: 80px; text-align: right; }

/* Keyboard shortcuts overlay */
#shortcuts-overlay {
  display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 2000; background: rgba(0,0,0,0.7); justify-content: center; align-items: center;
}
#shortcuts-overlay.open { display: flex; }
#shortcuts-overlay kbd { background: var(--bg-deep); padding: 2px 8px; border-radius: 3px; border: 1px solid var(--rule); font-family: monospace; font-size: 0.85em; }

`;
html = html.replace(
  /\.nav-row \{\s*\n?\s*display: flex;/,
  function(match) { return extraCSS + match; }
);

// ============================================================
// 2. HTML: Extract nav-dropdown from nav-label-wrap, place at body level
// ============================================================

// Find and extract the nav-dropdown content
// Flexible regex that handles both raw Unicode and HTML entities for the nav label
const ddStartRegex = /(<span class="nav-label-wrap">\s*<span id="nav-label" onclick="toggleNavDropdown\(\)">)([\s\S]*?)(<\/span>\s*)<div id="nav-dropdown">/;
const ddMatch = html.match(ddStartRegex);

if (!ddMatch) { console.error('Could not find nav-dropdown start'); process.exit(1); }

// Find the closing of nav-dropdown (</div> followed by </span> for nav-label-wrap)
const ddOpenTag = '<div id="nav-dropdown">';
const ddContentStart = html.indexOf(ddOpenTag);
// Find the closing </div> + </span> for nav-dropdown
// The pattern is: dd-2ch (last book) -> </div> (closes nav-dropdown) -> </span> (closes nav-label-wrap)
const lastBookMarker = 'dd-2ch';
let ddContentEnd = -1;
// For different volumes the last book marker varies, so find the </div> that closes id="nav-dropdown"
// by counting nesting from the opening tag
let nestLevel = 0;
let searchPos = ddContentStart + ddOpenTag.length;
for (let i = searchPos; i < html.length; i++) {
  if (html.substring(i, i+4) === '<div') nestLevel++;
  if (html.substring(i, i+6) === '</div>') {
    if (nestLevel === 0) {
      ddContentEnd = i;
      break;
    }
    nestLevel--;
  }
}
if (ddContentEnd < 0) { console.error('Could not find nav-dropdown closing tag'); process.exit(1); }

// Extract the inner content of nav-dropdown
const ddInnerContent = html.substring(ddContentStart + ddOpenTag.length, ddContentEnd);
console.log('Extracted nav-dropdown inner content: ' + ddInnerContent.length + ' chars');

// Remove the nav-dropdown + closing </span> from nav-label-wrap
// Find the </span> that follows the </div> of nav-dropdown
const afterClosingDiv = html.indexOf('</span>', ddContentEnd);
const beforeDd = html.substring(0, ddContentStart);
const afterDd = html.substring(afterClosingDiv + '</span>'.length);

html = beforeDd + '</span>' + afterDd;

// Update nav-label to be keyboard accessible
html = html.replace(
  `<span id="nav-label" onclick="toggleNavDropdown()">`,
  `<span id="nav-label" onclick="toggleNavDropdown()" tabindex="0" role="button" aria-label="Open navigation">`
);

// Volume data for cross-volume navigation
const volumes = [
  { key: 'ot', name: 'Old Testament', heb: 'תנ״ך', page: 'ot.html' },
  { key: 'nt', name: 'New Testament', heb: 'הברית החדשה', page: 'nt.html' },
  { key: 'bom', name: 'Book of Mormon', heb: 'ספר מורמון', page: 'bom/bom.html' },
  { key: 'dc', name: 'D&amp;C', heb: 'תורה ובריתות', page: 'dc.html' },
  { key: 'pgp', name: 'Pearl of Great Price', heb: 'פנינת המחיר הגדול', page: 'pgp.html' },
  { key: 'jst', name: 'JST', heb: 'תרגום ג׳וזף סמית', page: 'jst.html' },
];

let volumeCardsHTML = '';
volumes.forEach(v => {
  const isActive = v.key === volumeKey ? ' active' : '';
  let href = v.page;
  if (isBom && v.key !== 'bom') href = '../' + v.page;
  else if (!isBom && v.key === 'bom') href = 'bom/bom.html';
  volumeCardsHTML += `    <a class="dd-volume-card${isActive}" href="${href}"><span class="dd-vol-heb">${v.heb}</span> ${v.name}</a>\n`;
});

// Build the new nav-dropdown at body level
const newNavDropdown = `<!-- Navigation Panel -->
<div id="nav-dropdown">
  <div class="nav-panel-header">
    <span class="nav-panel-title">Navigation</span>
    <button class="nav-panel-close" onclick="closeNavPanel()" aria-label="Close navigation">&times;</button>
  </div>
  <div class="dd-section-header" style="padding-top:8px;">All Volumes</div>
    <a class="dd-volume-card" href="${prefix}index.html"><span class="dd-vol-heb">🏠</span> Home</a>
${volumeCardsHTML}  <hr class="dd-divider">
${ddInnerContent}
</div>`;

// Insert after panel-overlay
html = html.replace(
  `<div id="panel-overlay" onclick="closeGlossary();closeAnnotationsPanel();"></div>`,
  `<div id="panel-overlay" onclick="closeGlossary();closeAnnotationsPanel();closeNavPanel();"></div>\n\n${newNavDropdown}`
);

// Add shortcuts overlay HTML before </body>
const shortcutsOverlay = `
<!-- Keyboard Shortcuts Overlay -->
<div id="shortcuts-overlay">
  <div style="background:var(--bg);border:2px solid var(--accent);border-radius:8px;padding:24px;max-width:420px;width:90%;max-height:80vh;overflow-y:auto;direction:ltr;font-family:'Crimson Pro',serif;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="font-family:'Cormorant Garamond',serif;color:var(--accent);font-size:1.3em;margin:0;">Keyboard Shortcuts</h3>
      <span onclick="closeShortcuts()" style="cursor:pointer;color:var(--ink-light);font-size:1.3em;">&times;</span>
    </div>
    <table style="width:100%;font-size:0.9em;line-height:2.2;color:var(--ink);">
      <tr><td style="width:100px"><kbd>&larr;</kbd> / <kbd>&rarr;</kbd></td><td>Next / Previous chapter</td></tr>
      <tr><td><kbd>S</kbd> or <kbd>Ctrl+F</kbd></td><td>Search</td></tr>
      <tr><td><kbd>B</kbd></td><td>Open navigation panel</td></tr>
      <tr><td><kbd>G</kbd></td><td>Glossary</td></tr>
      <tr><td><kbd>N</kbd></td><td>Annotations</td></tr>
      <tr><td><kbd>D</kbd></td><td>Toggle dark mode</td></tr>
      <tr><td><kbd>1</kbd></td><td>Interlinear mode</td></tr>
      <tr><td><kbd>2</kbd></td><td>Hebrew-only mode</td></tr>
      <tr><td><kbd>Esc</kbd></td><td>Close all panels</td></tr>
      <tr><td><kbd>?</kbd></td><td>Show this help</td></tr>
    </table>
  </div>
</div>`;

html = html.replace('</body>', shortcutsOverlay + '\n</body>');

// ============================================================
// 3. JS: Update navigation functions
// ============================================================

// Replace toggleNavDropdown
html = html.replace(
  `function toggleNavDropdown() { document.getElementById('nav-dropdown').classList.toggle('open'); }`,
  `function toggleNavDropdown() {
  var dd = document.getElementById('nav-dropdown');
  if (dd.classList.contains('open')) { closeNavPanel(); } else {
    dd.classList.add('open');
    document.getElementById('panel-overlay').classList.add('open');
    var first = dd.querySelector('.dd-volume-card, .dd-book, button');
    if (first) setTimeout(function() { first.focus(); }, 350);
  }
}
function closeNavPanel() {
  var dd = document.getElementById('nav-dropdown');
  dd.classList.remove('open');
  document.getElementById('panel-overlay').classList.remove('open');
}
function openShortcuts() { document.getElementById('shortcuts-overlay').classList.add('open'); }
function closeShortcuts() { document.getElementById('shortcuts-overlay').classList.remove('open'); }`
);

// Replace ddNav
html = html.replace(
  `function ddNav(id) { document.getElementById('nav-dropdown').classList.remove('open'); navTo(id); }`,
  `function ddNav(id) { closeNavPanel(); navTo(id); }`
);

// Remove old click-outside handler
html = html.replace(
  `document.addEventListener('click', function(e) {
  var dd = document.getElementById('nav-dropdown');
  if (!dd || !dd.classList.contains('open')) return;
  var wrap = e.target.closest('.nav-label-wrap');
  if (!wrap) dd.classList.remove('open');
});`,
  ``
);

// Update keyboard shortcuts - add B and ? keys
html = html.replace(
  `  else if (e.key === 'n' || e.key === 'N') { openAnnotationsPanel(); }
});`,
  `  else if (e.key === 'n' || e.key === 'N') { openAnnotationsPanel(); }
  else if (e.key === 'b' || e.key === 'B') { toggleNavDropdown(); }
  else if (e.key === '?') { openShortcuts(); }
});`
);

// Update closeAllPanels to include nav panel and shortcuts
html = html.replace(
  `  _hideSelToolbar();
}`,
  `  _hideSelToolbar();
  closeNavPanel();
  var sh = document.getElementById('shortcuts-overlay');
  if (sh && sh.classList.contains('open')) closeShortcuts();
}`
);

// ============================================================
// 4. Search: Add "Search other volumes" links and ?q= reader
// ============================================================

// Add ?q= parameter reader after the search functions
const searchOtherVolumes = volumes.filter(v => v.key !== volumeKey).map(v => {
  let href = v.page;
  if (isBom && v.key !== 'bom') href = '../' + v.page;
  else if (!isBom && v.key === 'bom') href = 'bom/bom.html';
  return `{name:'${v.name.replace(/&amp;/g, '&')}',page:'${href}'}`;
}).join(',');

// Enhance doSearch to add cross-volume search links
html = html.replace(
  `  results.innerHTML = html;
  results.classList.add('open');
}`,
  `  html += '<div style="padding:12px 16px;border-top:2px solid var(--rule);direction:ltr;font-family:Crimson Pro,serif;font-size:0.85em;color:var(--ink-light);">';
  html += '<div style="font-weight:600;margin-bottom:6px;">Search other volumes:</div>';
  [${searchOtherVolumes}].forEach(function(v) {
    html += '<a href="' + v.page + '?q=' + encodeURIComponent(query.trim()) + '" style="display:inline-block;margin:3px 4px;color:var(--accent);text-decoration:none;padding:4px 10px;border:1px solid var(--accent);border-radius:3px;font-size:0.9em;">' + v.name + '</a>';
  });
  html += '</div>';
  results.innerHTML = html;
  results.classList.add('open');
}`
);

// Add ?q= parameter reader - insert after the hash routing IIFE closing
const hashRoutingEnd = `  window.addEventListener('hashchange', handleHash);
})();`;
html = html.replace(hashRoutingEnd, hashRoutingEnd + `

// Auto-search from ?q= parameter (cross-volume search)
(function() {
  var params = new URLSearchParams(window.location.search);
  var q = params.get('q');
  if (q) {
    setTimeout(function() {
      openSearch();
      document.getElementById('search-input').value = q;
      buildSearchIndex();
      doSearch(q);
      history.replaceState(null, '', window.location.pathname + window.location.hash);
    }, 800);
  }
})();`);

// ============================================================
// 5. Return banner: Suppress when coming from index.html
// ============================================================
html = html.replace(
  `(function(){if(sessionStorage.getItem('xref-returning')){sessionStorage.removeItem('xref-returning');return;}var f=sessionStorage.getItem('xref-return-from');if(!f)return;if(f.split('#')[0]===window.location.pathname)return;`,
  `(function(){if(sessionStorage.getItem('xref-returning')){sessionStorage.removeItem('xref-returning');return;}var f=sessionStorage.getItem('xref-return-from');if(!f)return;if(f.split('#')[0]===window.location.pathname)return;var rp=f.split('#')[0];if(rp==='/'||rp==='/index.html'||rp.match(/\\/index\\.html$/))return;`
);

// ============================================================
// 6. Add tabindex/role to dd-book elements and Enter/Space handler
// ============================================================
// Add a script block after the nav panel setup to enhance keyboard support
const serviceWorkerBlock = `if ('serviceWorker' in navigator) {`;
html = html.replace(serviceWorkerBlock, `// Keyboard support for nav panel book items
document.querySelectorAll('#nav-dropdown .dd-book').forEach(function(book) {
  book.setAttribute('tabindex', '0');
  book.setAttribute('role', 'button');
  book.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); book.click(); }
  });
});
// Volume card click stores return info
document.querySelectorAll('.dd-volume-card:not(.active)').forEach(function(link) {
  link.addEventListener('click', function() {
    sessionStorage.setItem('xref-return-from', window.location.pathname + window.location.hash);
    sessionStorage.removeItem('xref-return-verse');
    var navLabel = document.getElementById('nav-label');
    var label = navLabel ? navLabel.textContent.replace(/\\s*▾/, '') : document.title;
    sessionStorage.setItem('xref-return-label', label);
    sessionStorage.setItem('xref-return-set', '1');
  });
});
</` + `script>
<script>
` + serviceWorkerBlock);

fs.writeFileSync(file, html, 'utf8');
console.log('Transformed: ' + file + ' (' + volumeKey + ')');
