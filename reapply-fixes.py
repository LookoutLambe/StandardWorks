#!/usr/bin/env python3
"""Idempotently re-apply the site-file fixes that upstream regenerates without.
Run after every pull (git reset --hard origin/main), before sync/build.
Pair with verify-fixes.sh, which checks the same set. Safe to run repeatedly.

Corpus/MT counts are owned by upstream root_scorecard.js — NOT re-applied here.
"""
import re, sys, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
changed = []

def edit(path, fn):
    with open(path, encoding='utf-8') as f: s = f.read()
    s2 = fn(s)
    if s2 != s:
        with open(path, 'w', encoding='utf-8') as f: f.write(s2)
        changed.append(path)

# 1) Final-letter glossary match: wrap rootNorm/dispNorm in normFinals (BOM + OT).
def fix_normfinals(s):
    s = re.sub(r"(var rootNorm = )(e\.root\.replace\(/\[[^\]]*\]/g, ''\));", r"\1normFinals(\2);", s)
    s = re.sub(r"(var dispNorm = )(\(e\.displayHeb \|\| ''\)\.replace\(/\[[^\]]*\]/g, ''\));", r"\1normFinals(\2);", s)
    return s
edit('bom/bom.html', fix_normfinals)
edit('ot.html', fix_normfinals)

# 2) Full-screen BOM glossary panel on phones.
edit('bom/bom.html', lambda s: s.replace(
    "@media (max-width: 600px) { #glossary-panel { width: 55%; left: -55%; } }",
    "@media (max-width: 600px) { #glossary-panel { width: 100vw; max-width: 100vw; left: -100vw; } }"))

# 3) sync-www.sh: exclude build artifacts + dev scripts (codesign-critical).
def fix_sync(s):
    if "--exclude='build/'" not in s:
        s = s.replace("  --exclude='StandardWorks.xcodeproj/' \\",
                      "  --exclude='StandardWorks.xcodeproj/' \\\n  --exclude='build/' \\\n  --exclude='DerivedData/' \\")
    s = s.replace("  --exclude='sync-www.sh' \\", "  --exclude='*.sh' \\")
    if "--exclude='*.py'" not in s:
        s = s.replace("  --exclude='*.sh' \\", "  --exclude='*.sh' \\\n  --exclude='*.py' \\")
    return s
edit('sync-www.sh', fix_sync)

# 4) crossrefs_engine.js: load verse files via serialized <script> injection, not
#    fetch() (WKWebView blocks fetch of file:// in the app).
NEW_LOADER = r"""  // Load via <script> injection rather than fetch(): WKWebView blocks fetch() of
  // file:// resources, so in the bundled iOS/macOS app fetch always failed and
  // OT/NT/PGP cross-references fell back to a bare title list. Script injection
  // works under both file:// and https. The verse files call the global
  // renderVerseSet(data, targetId) (and 1nephi.js calls renderWords for its
  // colophon), so we temporarily shim both to capture without touching host state.
  // Loads MUST be serialized (one global renderVerseSet shim active at a time).
  var _verseLoadQueue = [];
  var _verseLoadActive = false;
  function _drainVerseLoadQueue() {
    if (_verseLoadActive) return;
    var job = _verseLoadQueue.shift();
    if (!job) return;
    var url = job.url, callback = job.callback;
    if (_verseFileCache[url]) { callback(_verseFileCache[url]); _drainVerseLoadQueue(); return; }
    _verseLoadActive = true;
    var captured = {};
    var prevRVS = window.renderVerseSet;
    var prevRW = window.renderWords;
    window.renderVerseSet = function(data, targetId) { captured[targetId] = data; };
    window.renderWords = function() {};
    var el = document.createElement('script');
    el.src = url;
    el.async = true;
    function finish(ok) {
      window.renderVerseSet = prevRVS;
      window.renderWords = prevRW;
      if (el.parentNode) el.parentNode.removeChild(el);
      _verseFileCache[url] = ok ? captured : null;
      _verseLoadActive = false;
      try { callback(_verseFileCache[url]); }
      finally { _drainVerseLoadQueue(); }
    }
    el.onload = function() { finish(true); };
    el.onerror = function() { console.warn('Verse file load error:', url); finish(false); };
    document.head.appendChild(el);
  }
  function loadVerseFileAsync(url, callback) {
    if (_verseFileCache[url]) { callback(_verseFileCache[url]); return; }
    _verseLoadQueue.push({ url: url, callback: callback });
    _drainVerseLoadQueue();
  }
"""
def fix_engine(s):
    if 'WKWebView blocks fetch()' in s:
        return s  # already applied
    # Replace the whole fetch-based loadVerseFileAsync (up to its .catch close).
    return re.sub(
        r"  function loadVerseFileAsync\(url, callback\) \{.*?callback\(null\);\n\s*\}\);\n  \}\n",
        NEW_LOADER, s, count=1, flags=re.S)
edit('crossrefs_engine.js', fix_engine)

# 5) Root cross-refs must show ALONGSIDE the verse footnote (NT/OT/PGP): turn the
#    "} else {" after the refCount line into "}" + "if (true) {".
pat_else = re.compile(r"(View Cross-References \(' \+ refCount \+ '\)[^\n]*</span>';\n)([ \t]*)\} else \{")
def fix_both_xrefs(s):
    return pat_else.sub(lambda m: m.group(1) + m.group(2) + "}\n" + m.group(2) + "if (true) {", s)
for f in ('nt.html', 'ot.html', 'pgp.html'):
    edit(f, fix_both_xrefs)

print("reapply-fixes: changed", len(changed), "file(s):", ", ".join(changed) if changed else "(none — all already applied)")
