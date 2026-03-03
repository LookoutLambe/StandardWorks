"""
Resolve ??? glosses by looking up Hebrew words against all available lexicons.
Cross-references: _tahot_dict.json, _strongs_hebrew.json, _supplement.json
"""
import os, re, json, sys, io, glob, unicodedata

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:\Users\chris\Desktop\Standard Works Project'

# ============================================================
# LOAD ALL LEXICON RESOURCES
# ============================================================
print("Loading lexicons...")

with open(os.path.join(BASE, '_tahot_dict.json'), 'r', encoding='utf-8') as f:
    tahot = json.load(f)
print(f"  _tahot_dict.json: {len(tahot):,} entries")

with open(os.path.join(BASE, '_strongs_hebrew.json'), 'r', encoding='utf-8') as f:
    strongs = json.load(f)
print(f"  _strongs_hebrew.json: {len(strongs):,} entries")

with open(os.path.join(BASE, '_supplement.json'), 'r', encoding='utf-8') as f:
    supplement = json.load(f)
proper_nouns = supplement.get('proper_nouns', {})
aramaic = supplement.get('aramaic', {})
morphological = supplement.get('morphological', {})
print(f"  _supplement.json: {len(proper_nouns)} proper nouns, {len(aramaic)} aramaic, {len(morphological)} morphological")

# ============================================================
# HEBREW PREFIX STRIPPING
# ============================================================
# Common prefixes with their meanings (for compound gloss building)
PREFIXES = [
    ('וּבְ', 'and-in-'),
    ('וּלְ', 'and-to-'),
    ('וּמִ', 'and-from-'),
    ('וּכְ', 'and-as-'),
    ('וְהַ', 'and-the-'),
    ('וְלַ', 'and-to-the-'),
    ('וּבַ', 'and-in-the-'),
    ('וּמֵ', 'and-from-'),
    ('שֶׁבְּ', 'that-in-'),
    ('שֶׁלְּ', 'that-to-'),
    ('שֶׁהַ', 'that-the-'),
    ('מִבְּ', 'from-in-'),
    ('לְהַ', 'to-the-'),
    ('בְּהַ', 'in-the-'),
    ('כְּהַ', 'as-the-'),
    ('בְּ', 'in-'),
    ('הַ', 'the-'),
    ('לְ', 'to-'),
    ('לַ', 'to-the-'),
    ('לָ', 'to-the-'),
    ('מִ', 'from-'),
    ('מֵ', 'from-'),
    ('וְ', 'and-'),
    ('וּ', 'and-'),
    ('כְּ', 'as-'),
    ('כַּ', 'as-the-'),
    ('שֶׁ', 'that-'),
]

# Common suffixes
SUFFIXES = [
    ('ֵיהֶם', '-their'),
    ('ֵיכֶם', '-your(pl)'),
    ('וֹתֵיהֶם', '-their'),
    ('וֹתָם', '-their'),
    ('ֵינוּ', '-our'),
    ('ֶיהָ', '-her'),
    ('ֵיהֶן', '-their(f)'),
    ('ְכֶם', '-your(pl)'),
    ('ְךָ', '-your'),
    ('ָם', '-their'),
    ('ָהּ', '-her'),
    ('ֵנוּ', '-our'),
    ('ִי', '-my'),
    ('וֹ', '-his'),
]

def strip_niqqud(text):
    """Remove vowel points (niqqud) from Hebrew text."""
    return ''.join(c for c in text if unicodedata.category(c) != 'Mn')

def lookup_word(hebrew):
    """Try to find a gloss for a Hebrew word using all available resources."""

    # 1. Direct lookup in tahot (most comprehensive)
    if hebrew in tahot:
        return tahot[hebrew]

    # 2. Direct lookup in supplement
    if hebrew in proper_nouns:
        return proper_nouns[hebrew]
    if hebrew in aramaic:
        return aramaic[hebrew]
    if hebrew in morphological:
        return morphological[hebrew]

    # 3. Direct lookup in strongs
    if hebrew in strongs:
        return strongs[hebrew]

    # 4. Try without niqqud in tahot
    bare = strip_niqqud(hebrew)
    for k, v in tahot.items():
        if strip_niqqud(k) == bare:
            return v

    return None

def resolve_word(hebrew):
    """Try multiple strategies to resolve a Hebrew word."""

    # Strategy 1: Direct lookup
    gloss = lookup_word(hebrew)
    if gloss:
        return gloss

    # Strategy 2: Handle maqqef compound words (X־Y)
    if '־' in hebrew:
        parts = hebrew.split('־')
        glosses = []
        all_found = True
        for part in parts:
            g = resolve_word(part)
            if g:
                glosses.append(g)
            else:
                all_found = False
                glosses.append('???')
        if all_found or sum(1 for g in glosses if g != '???') > len(glosses) // 2:
            return '-'.join(glosses)

    # Strategy 3: Strip prefixes and look up root
    for prefix_heb, prefix_eng in PREFIXES:
        if hebrew.startswith(prefix_heb) and len(hebrew) > len(prefix_heb) + 1:
            root = hebrew[len(prefix_heb):]
            root_gloss = lookup_word(root)
            if root_gloss:
                return prefix_eng + root_gloss
            # Try root in strongs
            if root in strongs:
                return prefix_eng + strongs[root]

    # Strategy 4: Try without final-form letters conversion
    # (some words might have different final forms)
    conversions = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'}
    if hebrew and hebrew[-1] in conversions:
        alt = hebrew[:-1] + conversions[hebrew[-1]]
        gloss = lookup_word(alt)
        if gloss:
            return gloss

    return None


# ============================================================
# COLLECT ALL ??? WORDS FROM JS FILES
# ============================================================
print("\nCollecting ??? words from all JS files...")

js_dirs = [
    os.path.join(BASE, 'ot_verses'),
    os.path.join(BASE, 'nt_verses'),
    os.path.join(BASE, 'bom', 'verses'),
    os.path.join(BASE, 'dc_verses'),
    os.path.join(BASE, 'pgp_verses'),
    os.path.join(BASE, 'jst_verses'),
]

# Pattern matches ["Hebrew","???"] or ["Hebrew","prefix-???"] etc.
UNKNOWN_RE = re.compile(r'\["([^"]+)","([^"]*\?\?\?[^"]*)"\]')

unknown_words = {}  # hebrew -> {count, contexts, full_gloss_patterns}
all_files = []

for d in js_dirs:
    if os.path.isdir(d):
        for f in glob.glob(os.path.join(d, '*.js')):
            all_files.append(f)

for filepath in sorted(all_files):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    for m in UNKNOWN_RE.finditer(content):
        hebrew = m.group(1)
        gloss_pattern = m.group(2)

        if hebrew not in unknown_words:
            unknown_words[hebrew] = {'count': 0, 'patterns': set()}
        unknown_words[hebrew]['count'] += 1
        unknown_words[hebrew]['patterns'].add(gloss_pattern)

print(f"  Found {len(unknown_words):,} unique Hebrew words with ??? glosses")
total_instances = sum(v['count'] for v in unknown_words.values())
print(f"  Total ??? instances: {total_instances:,}")

# ============================================================
# RESOLVE UNKNOWN WORDS
# ============================================================
print("\nResolving unknown words against lexicons...")

resolved = {}   # hebrew -> new_gloss
unresolved = {}  # hebrew -> count

resolved_count = 0
for hebrew, info in sorted(unknown_words.items(), key=lambda x: -x[1]['count']):
    gloss = resolve_word(hebrew)
    if gloss and gloss != '???' and '???' not in gloss:
        resolved[hebrew] = gloss
        resolved_count += info['count']
    else:
        unresolved[hebrew] = info['count']

print(f"  Resolved: {len(resolved):,} unique words ({resolved_count:,} instances)")
print(f"  Unresolved: {len(unresolved):,} unique words ({total_instances - resolved_count:,} instances)")

# ============================================================
# APPLY FIXES TO JS FILES
# ============================================================
print("\nApplying resolved glosses to JS files...")

files_modified = 0
total_fixes = 0

for filepath in sorted(all_files):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    file_fixes = 0

    for hebrew, new_gloss in resolved.items():
        # Handle pure ??? glosses
        old = f'["{hebrew}","???"]'
        new = f'["{hebrew}","{new_gloss}"]'
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            file_fixes += count

        # Handle compound glosses like "and-???" where prefix is already there
        for pattern in unknown_words.get(hebrew, {}).get('patterns', set()):
            if pattern != '???' and '???' in pattern:
                old_compound = f'["{hebrew}","{pattern}"]'
                if old_compound in content:
                    content = content.replace(old_compound, new)
                    file_fixes += content.count(new) - count  # approximate

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        files_modified += 1
        total_fixes += file_fixes
        rel = os.path.relpath(filepath, BASE)
        if file_fixes > 0:
            print(f'  {rel}: {file_fixes} fixes')

print(f"\n{'='*60}")
print(f"SUMMARY")
print(f"{'='*60}")
print(f"Files modified:     {files_modified}")
print(f"Total fixes:        {total_fixes}")
print(f"Resolved words:     {len(resolved):,}")
print(f"Still unresolved:   {len(unresolved):,}")

# Save resolved mappings for reference
with open(os.path.join(BASE, '_resolved_glosses.json'), 'w', encoding='utf-8') as f:
    json.dump(resolved, f, ensure_ascii=False, indent=1)

# Save unresolved for further work
unresolved_sorted = dict(sorted(unresolved.items(), key=lambda x: -x[1]))
with open(os.path.join(BASE, '_still_unknown.json'), 'w', encoding='utf-8') as f:
    json.dump(unresolved_sorted, f, ensure_ascii=False, indent=1)

print(f"\nSaved _resolved_glosses.json ({len(resolved):,} entries)")
print(f"Saved _still_unknown.json ({len(unresolved):,} entries)")

# Show top 20 resolved
print(f"\nTop 20 resolved words:")
top = sorted(resolved.items(), key=lambda x: -unknown_words.get(x[0], {}).get('count', 0))[:20]
for heb, eng in top:
    cnt = unknown_words[heb]['count']
    print(f'  {heb} -> "{eng}" ({cnt}x)')

# Show top 20 unresolved
print(f"\nTop 20 still unresolved:")
top_un = list(unresolved_sorted.items())[:20]
for heb, cnt in top_un:
    print(f'  {heb} ({cnt}x)')
