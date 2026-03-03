"""
Phase 3: Morphological verb analysis + deeper prefix/suffix stripping.
Resolves complex Hebrew conjugations by breaking them down into
prefix + root + suffix patterns and looking up roots in all lexicons.
"""
import os, re, json, sys, io, glob, unicodedata

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:\Users\chris\Desktop\Standard Works Project'

# Load lexicons
with open(os.path.join(BASE, '_tahot_dict.json'), 'r', encoding='utf-8') as f:
    tahot = json.load(f)
with open(os.path.join(BASE, '_strongs_hebrew.json'), 'r', encoding='utf-8') as f:
    strongs = json.load(f)
with open(os.path.join(BASE, '_supplement.json'), 'r', encoding='utf-8') as f:
    supplement = json.load(f)

# Build combined lookup
combined = {}
combined.update(strongs)
combined.update(supplement.get('proper_nouns', {}))
combined.update(supplement.get('aramaic', {}))
combined.update(supplement.get('morphological', {}))
combined.update(tahot)

# Load remaining unknowns
with open(os.path.join(BASE, '_still_unknown_v2.json'), 'r', encoding='utf-8') as f:
    still_unknown = json.load(f)

print(f"Starting with {len(still_unknown):,} unresolved words ({sum(still_unknown.values()):,} instances)")
print(f"Combined lexicon: {len(combined):,} entries\n")

def strip_niqqud(text):
    return ''.join(c for c in text if unicodedata.category(c) != 'Mn')

# ============================================================
# COMPREHENSIVE PREFIX TABLE (ordered longest first)
# ============================================================
PREFIXES = [
    # 4-char
    ('וּבְכָל־', 'and-in-all-'),
    ('וּמִכָּל־', 'and-from-all-'),
    ('וּלְכָל־', 'and-to-all-'),
    # 3-char compound
    ('שֶׁבְּ', 'that-in-'),
    ('שֶׁלְּ', 'that-to-'),
    ('שֶׁהַ', 'that-the-'),
    ('שֶׁלֹּא', 'that-not-'),
    ('שֶׁאֵין', 'that-there-is-no-'),
    ('מִבְּ', 'from-in-'),
    ('לְהַ', 'to-the-'),
    ('בְּהַ', 'in-the-'),
    ('כְּהַ', 'as-the-'),
    ('וּבְ', 'and-in-'),
    ('וּלְ', 'and-to-'),
    ('וּמִ', 'and-from-'),
    ('וּכְ', 'and-as-'),
    ('וְהַ', 'and-the-'),
    ('וְלַ', 'and-to-the-'),
    ('וּבַ', 'and-in-the-'),
    ('וּמֵ', 'and-from-'),
    ('וְאֶת־', 'and-'),
    ('אֶת־הַ', 'the-'),
    ('אֶת־', ''),
    # 2-char
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

# Suffix patterns
SUFFIXES = [
    ('וֹתֵיהֶם', '-their'),
    ('וֹתֵיכֶם', '-your(pl)'),
    ('וֹתֵינוּ', '-our'),
    ('ֵיהֶם', '-their'),
    ('ֵיכֶם', '-your(pl)'),
    ('ֵיהֶן', '-their(f)'),
    ('ֵינוּ', '-our'),
    ('וֹתָם', '-their'),
    ('וֹתָיו', '-his'),
    ('וֹתֶיהָ', '-her'),
    ('ֶיהָ', '-her'),
    ('ְכֶם', '-your(pl)'),
    ('ָתְכֶם', '-your(pl)'),
    ('ָתֵנוּ', '-our'),
    ('ְךָ', '-your'),
    ('ֵנוּ', '-our'),
    ('ָם', '-them'),
    ('ָהּ', '-her'),
    ('ִי', '-my'),
    ('וֹ', '-his'),
]

def lookup(word):
    """Direct lookup in combined lexicon."""
    if word in combined:
        return combined[word]
    return None

def try_resolve(hebrew):
    """Try to resolve a Hebrew word using morphological analysis."""

    # 1. Direct lookup
    g = lookup(hebrew)
    if g:
        return g

    # 2. Maqqef compounds
    if '־' in hebrew:
        parts = hebrew.split('־')
        glosses = []
        for p in parts:
            pg = try_resolve(p) if p else ''
            glosses.append(pg if pg else '???')
        if all(g != '???' for g in glosses):
            return '-'.join(glosses)
        # Even partial resolution is useful
        resolved_parts = sum(1 for g in glosses if g != '???')
        if resolved_parts > len(parts) // 2:
            return '-'.join(glosses)

    # 3. Strip prefixes
    for pref_heb, pref_eng in PREFIXES:
        if hebrew.startswith(pref_heb) and len(hebrew) > len(pref_heb) + 1:
            root = hebrew[len(pref_heb):]
            rg = lookup(root)
            if rg:
                return pref_eng + rg
            # Try stripping suffix from root too
            for suf_heb, suf_eng in SUFFIXES:
                if root.endswith(suf_heb) and len(root) > len(suf_heb) + 1:
                    stem = root[:-len(suf_heb)]
                    sg = lookup(stem)
                    if sg:
                        return pref_eng + sg + suf_eng

    # 4. Strip suffixes only
    for suf_heb, suf_eng in SUFFIXES:
        if hebrew.endswith(suf_heb) and len(hebrew) > len(suf_heb) + 2:
            stem = hebrew[:-len(suf_heb)]
            sg = lookup(stem)
            if sg:
                return sg + suf_eng

    # 5. Try without niqqud match
    bare = strip_niqqud(hebrew)
    if len(bare) >= 2:
        for k, v in combined.items():
            if strip_niqqud(k) == bare:
                return v

    # 6. Final letter conversions (sofit forms)
    finals = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'}
    if hebrew and hebrew[-1] in finals:
        alt = hebrew[:-1] + finals[hebrew[-1]]
        g = lookup(alt)
        if g:
            return g

    return None


# ============================================================
# RESOLVE ALL UNKNOWNS
# ============================================================
print("Resolving with morphological analysis...")

resolved = {}
unresolved = {}
resolved_instances = 0

for hebrew, count in still_unknown.items():
    gloss = try_resolve(hebrew)
    if gloss and '???' not in gloss:
        resolved[hebrew] = gloss
        resolved_instances += count
    else:
        unresolved[hebrew] = count

print(f"  Resolved: {len(resolved):,} words ({resolved_instances:,} instances)")
print(f"  Unresolved: {len(unresolved):,} words ({sum(unresolved.values()):,} instances)")

# ============================================================
# APPLY TO JS FILES
# ============================================================
print("\nApplying to JS files...")

js_dirs = [
    os.path.join(BASE, 'ot_verses'),
    os.path.join(BASE, 'nt_verses'),
    os.path.join(BASE, 'bom', 'verses'),
    os.path.join(BASE, 'dc_verses'),
    os.path.join(BASE, 'pgp_verses'),
    os.path.join(BASE, 'jst_verses'),
]

all_files = []
for d in js_dirs:
    if os.path.isdir(d):
        for f in glob.glob(os.path.join(d, '*.js')):
            all_files.append(f)

files_modified = 0
total_fixes = 0

for filepath in sorted(all_files):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    file_fixes = 0

    for hebrew, english in resolved.items():
        old = f'["{hebrew}","???"]'
        new = f'["{hebrew}","{english}"]'
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            file_fixes += count

        # Compound patterns
        pattern = re.compile(re.escape(f'["{hebrew}","') + r'[^"]*\?\?\?[^"]*"\]')
        for m in pattern.findall(content):
            content = content.replace(m, new)
            file_fixes += 1

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        files_modified += 1
        total_fixes += file_fixes
        rel = os.path.relpath(filepath, BASE)
        if file_fixes >= 3:
            print(f'  {rel}: {file_fixes} fixes')

# Recount
print("\nRecounting remaining ???...")
remaining = 0
UNKNOWN_RE = re.compile(r'\["([^"]+)","([^"]*\?\?\?[^"]*)"\]')
remaining_words = {}
for filepath in sorted(all_files):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    for m in UNKNOWN_RE.finditer(content):
        remaining += 1
        hw = m.group(1)
        remaining_words[hw] = remaining_words.get(hw, 0) + 1

print(f"\n{'='*60}")
print(f"PHASE 3 SUMMARY")
print(f"{'='*60}")
print(f"Files modified:      {files_modified}")
print(f"Total fixes:         {total_fixes}")
print(f"Remaining ??? words: {len(remaining_words):,} unique ({remaining:,} instances)")

# Save
remaining_sorted = dict(sorted(remaining_words.items(), key=lambda x: -x[1]))
with open(os.path.join(BASE, '_still_unknown_v3.json'), 'w', encoding='utf-8') as f:
    json.dump(remaining_sorted, f, ensure_ascii=False, indent=1)
print(f"Saved _still_unknown_v3.json")

# Show top resolved
print(f"\nTop 30 newly resolved:")
top = sorted(resolved.items(), key=lambda x: -still_unknown.get(x[0], 0))[:30]
for heb, eng in top:
    cnt = still_unknown.get(heb, 0)
    print(f'  {heb} -> "{eng}" ({cnt}x)')
