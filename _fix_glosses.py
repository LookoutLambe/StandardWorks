"""
Fix systematic gloss errors across all Hebrew interlinear verse files.
Targets: garbled transliterations, wrong root lookups, mistranslations.
"""
import os, re, sys, io, glob

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:\Users\chris\Desktop\Standard Works Project'

# ============================================================
# GLOSS REPLACEMENTS
# ============================================================

# Exact gloss replacements: "wrong" -> "correct"
# These replace the English side of ["Hebrew","English"] pairs
EXACT_REPLACEMENTS = {
    # --- Garbled transliterations ---
    'Ph': 'mouth',
    'to-Ph': 'to-mouth',
    'all-Ph': 'every-mouth',
    'Gloih': 'revealed',
    'Tod': 'made-known',
    'that-Tod': 'that-is-made-known',
    'Kim': 'established',
    'the-from-Kim': 'the-one-who-upholds',
    'from-Kim': 'upholds',
    'Mil': 'circumcision',
    'to-Mil': 'to-circumcision',
    'and-Mil': 'and-circumcision',

    # --- "Bn" (son) ---
    'Bn': 'son',
    'Bn-man': 'son-of-man',
    'Bn-God': 'son-of-God',
    'Bn-David': 'son-of-David',
    'Bn-Simon': 'son-of-Simon',

    # --- Torah/Law mistranslation ---
    'a-Bible': 'Torah/law',
    'the-Bible': 'the-Torah/law',
    'for-the-Bible': 'for-the-Torah/law',
    'upon-the-Bible': 'upon-the-Torah/law',

    # --- "cult prostitute" in non-OT-narrative contexts ---
    # (keeping OT uses where contextually debatable)
    'is the-cult prostitute': 'the-holiness',
    'the-cult prostitutes': 'the-holy-ones',
    'among the-temple prostitutes': 'among-the-holy-ones',
    'in-the-cult prostitutes': 'in-the-holy-things',
}

# Pattern-based replacements (substring matches within glosses)
PATTERN_REPLACEMENTS = [
    # "false-witness" for עֵד should just be "witness"
    # Only fix standalone עֵד, not עֵד־שֶׁקֶר (which IS false witness)
    (r'^false-witness$', 'witness'),
]

# Track stats
stats = {
    'files_scanned': 0,
    'files_modified': 0,
    'replacements': {},
}

def fix_file(filepath):
    """Fix glosses in a single JS verse file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    file_fixes = 0

    # Apply exact replacements
    for wrong, correct in EXACT_REPLACEMENTS.items():
        # Match the gloss in ["Hebrew","GLOSS"] format
        # Need to be careful with JSON-like structure
        old = f'","{wrong}"]'
        new = f'","{correct}"]'
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            file_fixes += count
            stats['replacements'][wrong] = stats['replacements'].get(wrong, 0) + count

        # Also check compound forms: "prefix-GLOSS"
        # e.g., "and-cult prostitute" patterns
        old2 = f'","{wrong}"],'
        new2 = f'","{correct}"],'
        # Already handled by the above

    # Apply pattern-based replacements
    for pattern, replacement in PATTERN_REPLACEMENTS:
        # Find all gloss values matching the pattern
        def replace_gloss(m):
            nonlocal file_fixes
            gloss = m.group(1)
            if re.match(pattern, gloss):
                file_fixes += 1
                stats['replacements'][gloss] = stats['replacements'].get(gloss, 0) + 1
                return f'","{replacement}"]'
            return m.group(0)

        content = re.sub(r'","(false-witness)"\]', replace_gloss, content)

    stats['files_scanned'] += 1

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        stats['files_modified'] += 1
        rel = os.path.relpath(filepath, BASE)
        print(f'  Fixed {file_fixes} glosses in {rel}')

    return file_fixes


# ============================================================
# SCAN ALL JS FILES
# ============================================================
print("Scanning all Hebrew interlinear verse files...\n")

js_dirs = [
    os.path.join(BASE, 'ot_verses'),
    os.path.join(BASE, 'nt_verses'),
    os.path.join(BASE, 'bom'),
    os.path.join(BASE, 'bom', 'verses'),
    os.path.join(BASE, 'dc_verses'),
    os.path.join(BASE, 'pgp_verses'),
    os.path.join(BASE, 'jst_verses'),
]

total_fixes = 0
all_files = []

for d in js_dirs:
    if os.path.isdir(d):
        for f in glob.glob(os.path.join(d, '*.js')):
            all_files.append(f)

# Also check root-level JS files
for f in glob.glob(os.path.join(BASE, '*.js')):
    if 'verse' in f.lower() or 'scripture' in f.lower():
        all_files.append(f)

print(f"Found {len(all_files)} JS files to scan\n")

for filepath in sorted(all_files):
    fixes = fix_file(filepath)
    total_fixes += fixes

# ============================================================
# REPORT
# ============================================================
print(f"\n{'='*60}")
print(f"SUMMARY")
print(f"{'='*60}")
print(f"Files scanned:  {stats['files_scanned']}")
print(f"Files modified: {stats['files_modified']}")
print(f"Total fixes:    {total_fixes}")
print(f"\nBreakdown by gloss:")
for gloss, count in sorted(stats['replacements'].items(), key=lambda x: -x[1]):
    correct = EXACT_REPLACEMENTS.get(gloss, '(pattern)')
    print(f'  "{gloss}" -> "{correct}": {count}')
