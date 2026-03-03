"""
Phase 5: Modern Hebrew dictionary resolution.
Uses the Milon Hebrew-English dictionary (33,001 entries) to resolve
remaining ??? glosses, especially NT and D&C Modern Hebrew vocabulary.
"""
import os, re, json, sys, io, glob, unicodedata

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:\Users\chris\Desktop\Standard Works Project'

# ============================================================
# LOAD ALL RESOURCES
# ============================================================
print("Loading resources...")

# 1. Milon dictionary (33,001 entries)
with open(os.path.join(BASE, '_milon', 'dict-he-en.json'), 'r', encoding='utf-8') as f:
    milon_raw = json.load(f)
print(f"  Milon raw: {len(milon_raw):,} entries")

# Build Hebrew -> English lookup from Milon
milon = {}
for entry in milon_raw:
    heb = entry.get('translated', '').strip()
    translations = entry.get('translation', [])
    if heb and translations:
        # Take first (most common) translation, clean it up
        gloss = translations[0]
        # Skip very long definitions or parenthetical-only entries
        if len(gloss) > 50:
            gloss = gloss.split(',')[0].split(';')[0].strip()
        if len(gloss) > 50:
            gloss = gloss[:50]
        # Remove leading parenthetical qualifiers like "(slang)" etc.
        gloss = re.sub(r'^\([^)]+\)\s*', '', gloss).strip()
        if gloss and heb not in milon:
            milon[heb] = gloss

print(f"  Milon parsed: {len(milon):,} usable entries")

# 2. Existing lexicons
with open(os.path.join(BASE, '_tahot_dict.json'), 'r', encoding='utf-8') as f:
    tahot = json.load(f)
with open(os.path.join(BASE, '_strongs_hebrew.json'), 'r', encoding='utf-8') as f:
    strongs = json.load(f)
with open(os.path.join(BASE, '_supplement.json'), 'r', encoding='utf-8') as f:
    supplement = json.load(f)

# 3. OSHB glosses
oshb_path = os.path.join(BASE, '_oshb_glosses.json')
if os.path.exists(oshb_path):
    with open(oshb_path, 'r', encoding='utf-8') as f:
        oshb = json.load(f)
    print(f"  OSHB glosses: {len(oshb):,}")
else:
    oshb = {}

# 4. Build master combined lookup (Milon on top for modern vocabulary)
combined = {}
combined.update(strongs)
combined.update(supplement.get('proper_nouns', {}))
combined.update(supplement.get('aramaic', {}))
combined.update(supplement.get('morphological', {}))
combined.update(tahot)
combined.update(oshb)
combined.update(milon)  # Milon last = highest priority for modern words

print(f"  Combined lexicon: {len(combined):,} entries")

# 5. Load remaining unknowns
with open(os.path.join(BASE, '_still_unknown_final.json'), 'r', encoding='utf-8') as f:
    still_unknown = json.load(f)
print(f"\n  Remaining unknowns: {len(still_unknown):,} unique ({sum(still_unknown.values()):,} instances)")

# ============================================================
# ALSO BUILD STRIPPED LOOKUPS FOR FUZZY MATCHING
# ============================================================

def strip_niqqud(text):
    """Remove all diacritical marks (niqqud + cantillation)."""
    return ''.join(c for c in text if unicodedata.category(c) not in ('Mn', 'Cf'))

# Build stripped version of Milon for fuzzy matching
milon_stripped = {}
for heb, eng in milon.items():
    bare = strip_niqqud(heb)
    if bare and bare not in milon_stripped:
        milon_stripped[bare] = eng

# Build stripped version of combined for fuzzy matching
combined_stripped = {}
for heb, eng in combined.items():
    bare = strip_niqqud(heb)
    if bare and bare not in combined_stripped:
        combined_stripped[bare] = eng

print(f"  Milon stripped lookup: {len(milon_stripped):,}")
print(f"  Combined stripped lookup: {len(combined_stripped):,}")

# ============================================================
# COMPREHENSIVE PREFIXES AND SUFFIXES
# ============================================================
PREFIXES = [
    # 4+ char compounds
    ('וּבְכָל־', 'and-in-all-'),
    ('וּמִכָּל־', 'and-from-all-'),
    ('וּלְכָל־', 'and-to-all-'),
    ('וְאֶת־הַ', 'and-the-'),
    ('וְאֶת־', 'and-'),
    ('אֶת־הַ', 'the-'),
    ('אֶת־', ''),
    # 3-char compound
    ('שֶׁבְּ', 'that-in-'),
    ('שֶׁלְּ', 'that-to-'),
    ('שֶׁלֹּא', 'that-not-'),
    ('שֶׁהַ', 'that-the-'),
    ('שֶׁאֵין', 'that-no-'),
    ('מִבְּ', 'from-in-'),
    ('לְהַ', 'to-the-'),
    ('לְהִ', 'to-'),    # hitpael infinitive
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
    ('וְהָ', 'and-the-'),
    ('וּבָ', 'and-in-the-'),
    ('וְלָ', 'and-to-the-'),
    ('לְבַ', 'to-in-the-'),
    # 2-char
    ('בְּ', 'in-'),
    ('הַ', 'the-'),
    ('הָ', 'the-'),
    ('לְ', 'to-'),
    ('לַ', 'to-the-'),
    ('לָ', 'to-the-'),
    ('מִ', 'from-'),
    ('מֵ', 'from-'),
    ('וְ', 'and-'),
    ('וּ', 'and-'),
    ('כְּ', 'as-'),
    ('כַּ', 'as-the-'),
    ('כָּ', 'as-all-'),
    ('שֶׁ', 'that-'),
    ('בַּ', 'in-the-'),
    ('בָּ', 'in-the-'),
]

SUFFIXES = [
    # Long suffixes first
    ('וֹתֵיהֶם', '-their'),
    ('וֹתֵיכֶם', '-your(pl)'),
    ('וֹתֵינוּ', '-our'),
    ('ֵיהֶם', '-their'),
    ('ֵיכֶם', '-your(pl)'),
    ('ֵיהֶן', '-their(f)'),
    ('ֵינוּ', '-our'),
    ('וֹתָם', '-them'),
    ('וֹתָיו', '-his'),
    ('וֹתֶיהָ', '-her'),
    ('ֶיהָ', '-her'),
    ('ְכֶם', '-your(pl)'),
    ('ָתְכֶם', '-your(pl)'),
    ('ָתֵנוּ', '-our'),
    ('ֵיכֶם', '-your(pl)'),
    ('ֵיהֶם', '-their'),
    ('ְךָ', '-your'),
    ('ֵנוּ', '-our'),
    ('ָנוּ', '-our'),
    ('ָם', '-them'),
    ('ָהּ', '-her'),
    ('ִי', '-my'),
    ('ִים', '(pl)'),
    ('וֹת', '(pl)'),
    ('וֹ', '-his'),
    ('ָה', ''),    # feminine ending - just strip
]

# Final-form letter conversions
FINALS = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'}

def lookup(word):
    """Try to find a gloss in the combined lexicon."""
    if word in combined:
        return combined[word]
    return None

def lookup_fuzzy(word):
    """Try stripped (no niqqud) matching."""
    bare = strip_niqqud(word)
    if bare and bare in combined_stripped:
        return combined_stripped[bare]
    return None

def try_resolve(hebrew):
    """Multi-strategy resolution for a Hebrew word."""

    # Skip garbage entries
    if not hebrew or len(hebrew) < 2:
        return None
    if hebrew in (']', '׆', 'א.'):
        return None

    # 1. Direct lookup
    g = lookup(hebrew)
    if g:
        return g

    # 2. Maqqef compounds
    if '־' in hebrew:
        parts = hebrew.split('־')
        glosses = []
        for p in parts:
            if not p:
                continue
            pg = try_resolve(p)
            glosses.append(pg if pg else '???')
        if all(g != '???' for g in glosses):
            return '-'.join(glosses)
        # Partial resolution if majority found
        resolved_parts = sum(1 for g in glosses if g != '???')
        if resolved_parts > 0 and resolved_parts >= len(glosses) - 1:
            return '-'.join(glosses)

    # 3. Strip prefixes
    for pref_heb, pref_eng in PREFIXES:
        if hebrew.startswith(pref_heb) and len(hebrew) > len(pref_heb) + 1:
            root = hebrew[len(pref_heb):]
            rg = lookup(root)
            if rg:
                return pref_eng + rg
            # Fuzzy root match
            rg = lookup_fuzzy(root)
            if rg:
                return pref_eng + rg
            # Strip suffix from root too
            for suf_heb, suf_eng in SUFFIXES:
                if root.endswith(suf_heb) and len(root) > len(suf_heb) + 1:
                    stem = root[:-len(suf_heb)]
                    sg = lookup(stem) or lookup_fuzzy(stem)
                    if sg:
                        return pref_eng + sg + suf_eng
                    # Try final-form conversion on stem
                    if stem and stem[-1] in FINALS:
                        alt_stem = stem[:-1] + FINALS[stem[-1]]
                        sg = lookup(alt_stem) or lookup_fuzzy(alt_stem)
                        if sg:
                            return pref_eng + sg + suf_eng

    # 4. Strip suffixes only
    for suf_heb, suf_eng in SUFFIXES:
        if hebrew.endswith(suf_heb) and len(hebrew) > len(suf_heb) + 2:
            stem = hebrew[:-len(suf_heb)]
            sg = lookup(stem) or lookup_fuzzy(stem)
            if sg:
                return sg + suf_eng
            # Final-form conversion
            if stem and stem[-1] in FINALS:
                alt_stem = stem[:-1] + FINALS[stem[-1]]
                sg = lookup(alt_stem) or lookup_fuzzy(alt_stem)
                if sg:
                    return sg + suf_eng

    # 5. Fuzzy match (no niqqud)
    g = lookup_fuzzy(hebrew)
    if g:
        return g

    # 6. Final letter conversions
    if hebrew and hebrew[-1] in FINALS:
        alt = hebrew[:-1] + FINALS[hebrew[-1]]
        g = lookup(alt) or lookup_fuzzy(alt)
        if g:
            return g

    # 7. Try stripping common verb prefixes for conjugated forms
    # Imperfect tense prefixes: י/ת/א/נ + root
    VERB_PREFIXES = [
        ('יְ', 'he-will-'), ('יִ', 'he-will-'), ('יַ', 'he-will-'),
        ('תְּ', 'you/she-will-'), ('תִּ', 'you/she-will-'), ('תַּ', 'you/she-will-'),
        ('אֲ', 'I-will-'), ('אֶ', 'I-will-'),
        ('נְ', 'we-will-'), ('נִ', 'we-will-'),
    ]
    for vpref, veng in VERB_PREFIXES:
        if hebrew.startswith(vpref) and len(hebrew) > len(vpref) + 2:
            vroot = hebrew[len(vpref):]
            vg = lookup(vroot) or lookup_fuzzy(vroot)
            if vg:
                return veng + vg

    # 8. Try removing ה prefix (hifil/hofal patterns)
    if hebrew.startswith('הִ') or hebrew.startswith('הֻ') or hebrew.startswith('הָ'):
        root2 = hebrew[2:]
        if len(root2) >= 3:
            g2 = lookup(root2) or lookup_fuzzy(root2)
            if g2:
                return g2

    return None


# ============================================================
# RESOLVE ALL UNKNOWNS
# ============================================================
print("\nResolving with Modern Hebrew dictionary + enhanced morphology...")

resolved = {}
unresolved = {}

for hebrew, count in still_unknown.items():
    gloss = try_resolve(hebrew)
    if gloss and '???' not in gloss:
        resolved[hebrew] = gloss
    else:
        unresolved[hebrew] = count

resolved_instances = sum(still_unknown[h] for h in resolved)
unresolved_instances = sum(unresolved.values())

print(f"  Resolved: {len(resolved):,} words ({resolved_instances:,} instances)")
print(f"  Unresolved: {len(unresolved):,} words ({unresolved_instances:,} instances)")

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

        # Compound patterns with partial ???
        pattern = re.compile(re.escape(f'["{hebrew}","') + r'[^\"]*\?\?\?[^\"]*"\]')
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
remaining_words = {}
remaining_by_section = {'ot': 0, 'nt': 0, 'bom': 0, 'dc': 0, 'pgp': 0, 'jst': 0}
UNKNOWN_RE = re.compile(r'\["([^"]+)","([^"]*\?\?\?[^"]*)"\]')

for filepath in sorted(all_files):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    section = 'ot'
    if 'nt_verses' in filepath: section = 'nt'
    elif 'bom' in filepath: section = 'bom'
    elif 'dc_verses' in filepath: section = 'dc'
    elif 'pgp_verses' in filepath: section = 'pgp'
    elif 'jst_verses' in filepath: section = 'jst'

    for m in UNKNOWN_RE.finditer(content):
        remaining += 1
        hw = m.group(1)
        remaining_words[hw] = remaining_words.get(hw, 0) + 1
        remaining_by_section[section] += 1

print(f"\n{'='*60}")
print(f"PHASE 5 (MODERN DICTIONARY) SUMMARY")
print(f"{'='*60}")
print(f"Files modified:      {files_modified}")
print(f"Total fixes:         {total_fixes}")
print(f"Remaining ??? words: {len(remaining_words):,} unique ({remaining:,} instances)")
print(f"\nRemaining by section:")
for section, count in remaining_by_section.items():
    print(f"  {section.upper()}: {count:,}")

# Save
remaining_sorted = dict(sorted(remaining_words.items(), key=lambda x: -x[1]))
with open(os.path.join(BASE, '_still_unknown_v5.json'), 'w', encoding='utf-8') as f:
    json.dump(remaining_sorted, f, ensure_ascii=False, indent=1)

# Save resolved
with open(os.path.join(BASE, '_resolved_modern.json'), 'w', encoding='utf-8') as f:
    json.dump(resolved, f, ensure_ascii=False, indent=1)

print(f"\nSaved _resolved_modern.json ({len(resolved):,} entries)")
print(f"Saved _still_unknown_v5.json ({len(remaining_words):,} entries)")

# Top resolved
print(f"\nTop 30 newly resolved:")
top = sorted(resolved.items(), key=lambda x: -still_unknown.get(x[0], 0))[:30]
for heb, eng in top:
    cnt = still_unknown.get(heb, 0)
    print(f'  {heb} -> "{eng}" ({cnt}x)')

# Top unresolved
print(f"\nTop 20 still unresolved:")
top_un = list(remaining_sorted.items())[:20]
for heb, cnt in top_un:
    print(f'  {heb} ({cnt}x)')
