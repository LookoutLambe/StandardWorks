"""
Resolve remaining ??? glosses using OpenScriptures Hebrew Bible (OSHB) data.
OSHB provides Strong's numbers for every word in the entire Hebrew Bible (OT).

Strategy:
1. Parse all OSHB XML files to build: Hebrew_word_form -> Strong's_number
2. Map Strong's numbers to English glosses via _strongs_hebrew.json
3. Apply to remaining ??? entries in OT verse files
"""
import os, re, json, sys, io, glob
import xml.etree.ElementTree as ET

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:\Users\chris\Desktop\Standard Works Project'
OSHB_DIR = os.path.join(BASE, '_morphhb', 'package', 'wlc')

# Load Strong's dictionary
with open(os.path.join(BASE, '_strongs_hebrew.json'), 'r', encoding='utf-8') as f:
    strongs_dict = json.load(f)
print(f"Strong's dictionary: {len(strongs_dict):,} entries")

# Also load tahot for fallback
with open(os.path.join(BASE, '_tahot_dict.json'), 'r', encoding='utf-8') as f:
    tahot = json.load(f)
print(f"Tahot dictionary: {len(tahot):,} entries")

# Load existing Strong's lookup (word form -> H-number)
with open(os.path.join(BASE, '_strongs_lookup.json'), 'r', encoding='utf-8') as f:
    strongs_lookup = json.load(f)
print(f"Existing Strong's lookup: {len(strongs_lookup):,} entries")

# ============================================================
# PARSE OSHB XML FILES
# ============================================================
print(f"\nParsing OSHB XML files from {OSHB_DIR}...")

NS = {'osis': 'http://www.bibletechnologies.net/2003/OSIS/namespace'}

# Build: Strong's number -> English gloss
# Using the Strong's dictionary we already have
def strongs_to_gloss(lemma_str):
    """Convert OSHB lemma attribute to English gloss."""
    if not lemma_str:
        return None

    # Parse lemma: can be "1254 a", "b/7225", "d/8064", "c/853"
    # Prefixes: b=in, c=and, d=the, k=as, l=to, m=from
    prefix_map = {
        'b': 'in-',
        'c': 'and-',
        'd': 'the-',
        'k': 'as-',
        'l': 'to-',
        'm': 'from-',
        's': 'that-',
    }

    parts = lemma_str.split('/')
    prefix_gloss = ''
    main_num = None

    for part in parts:
        part = part.strip()
        if part in prefix_map:
            prefix_gloss += prefix_map[part]
        else:
            # Extract number
            num_match = re.match(r'(\d+)\s*([a-z])?', part)
            if num_match:
                main_num = num_match.group(1)

    if not main_num:
        return None

    # Look up in Strong's dictionary
    # Try H-prefixed format
    h_key = f"H{main_num.zfill(4)}"

    # Search strongs_dict by matching the number
    gloss = None
    for key, val in strongs_dict.items():
        # strongs_dict is Hebrew_word -> English
        # We need number -> English, so use strongs_lookup in reverse
        pass

    # Actually, let's build a number->gloss map from strongs_lookup + strongs_dict
    return None  # Will build below


# Build Strong's number -> gloss map
print("Building Strong's number -> gloss mapping...")
num_to_gloss = {}
for hebrew_word, h_number in strongs_lookup.items():
    if hebrew_word in strongs_dict:
        if h_number not in num_to_gloss:
            num_to_gloss[h_number] = strongs_dict[hebrew_word]
    elif hebrew_word in tahot:
        if h_number not in num_to_gloss:
            num_to_gloss[h_number] = tahot[hebrew_word]

# Also add direct entries from strongs_dict
for hebrew_word, gloss in strongs_dict.items():
    if hebrew_word in strongs_lookup:
        h_num = strongs_lookup[hebrew_word]
        if h_num not in num_to_gloss:
            num_to_gloss[h_num] = gloss

print(f"  Strong's number -> gloss: {len(num_to_gloss):,} entries")

# Prefix meanings for OSHB lemma codes
PREFIX_MAP = {
    'b': 'in-',
    'c': 'and-',
    'd': 'the-',
    'k': 'as-',
    'l': 'to-',
    'm': 'from-',
    's': 'that-',
}

def resolve_lemma(lemma_str):
    """Convert OSHB lemma to English gloss."""
    if not lemma_str:
        return None

    parts = lemma_str.split('/')
    prefix = ''
    main_gloss = None

    for part in parts:
        part = part.strip()
        if part in PREFIX_MAP:
            prefix += PREFIX_MAP[part]
        else:
            num_match = re.match(r'(\d+)\s*([a-z])?', part)
            if num_match:
                num = num_match.group(1)
                suffix = num_match.group(2) or ''

                # Try exact H-number
                h_key = f"H{num.zfill(4)}"
                if h_key in num_to_gloss:
                    main_gloss = num_to_gloss[h_key]
                # Try with letter suffix
                elif f"{h_key}{suffix}" in num_to_gloss:
                    main_gloss = num_to_gloss[f"{h_key}{suffix}"]

    if main_gloss:
        return prefix + main_gloss
    return None


# Parse OSHB to build: Hebrew_word_form -> gloss
word_form_glosses = {}  # hebrew text -> gloss
oshb_words_total = 0

xml_files = sorted(glob.glob(os.path.join(OSHB_DIR, '*.xml')))
print(f"\nParsing {len(xml_files)} OSHB books...")

for xml_path in xml_files:
    tree = ET.parse(xml_path)
    root = tree.getroot()
    book_name = os.path.splitext(os.path.basename(xml_path))[0]

    for w_elem in root.iter('{http://www.bibletechnologies.net/2003/OSIS/namespace}w'):
        hebrew_text = w_elem.text
        lemma = w_elem.get('lemma', '')

        if not hebrew_text or not lemma:
            continue

        oshb_words_total += 1

        # Clean Hebrew text: remove slash separators (prefix/root notation)
        # "בְּ/רֵאשִׁ֖ית" -> "בְּרֵאשִׁית"
        clean_hebrew = hebrew_text.replace('/', '')
        # Remove cantillation marks (Unicode category Mn that aren't niqqud)
        # Keep niqqud (vowel points) but strip accents
        # Actually, just store as-is and also stripped

        gloss = resolve_lemma(lemma)
        if gloss and clean_hebrew not in word_form_glosses:
            word_form_glosses[clean_hebrew] = gloss

print(f"  Total OSHB words parsed: {oshb_words_total:,}")
print(f"  Unique word forms with glosses: {len(word_form_glosses):,}")

# ============================================================
# ALSO BUILD A STRIPPED (no-cantillation) LOOKUP
# ============================================================
import unicodedata

def strip_cantillation(text):
    """Remove cantillation marks but keep niqqud vowel points."""
    result = []
    for ch in text:
        cp = ord(ch)
        # Hebrew cantillation marks: U+0591-U+05AF
        # Hebrew niqqud: U+05B0-U+05BD, U+05BF, U+05C1-U+05C2, U+05C4-U+05C5, U+05C7
        if 0x0591 <= cp <= 0x05AF:
            continue  # Skip cantillation
        result.append(ch)
    return ''.join(result)

stripped_glosses = {}
for hebrew, gloss in word_form_glosses.items():
    stripped = strip_cantillation(hebrew)
    if stripped not in stripped_glosses:
        stripped_glosses[stripped] = gloss

print(f"  Stripped (no cantillation) lookup: {len(stripped_glosses):,} entries")

# ============================================================
# MATCH AGAINST REMAINING UNKNOWNS
# ============================================================
with open(os.path.join(BASE, '_still_unknown_v3.json'), 'r', encoding='utf-8') as f:
    still_unknown = json.load(f)

print(f"\nMatching {len(still_unknown):,} unknown words against OSHB data...")

resolved = {}
for hebrew in still_unknown:
    # Direct match
    if hebrew in word_form_glosses:
        resolved[hebrew] = word_form_glosses[hebrew]
        continue

    # Try stripped cantillation match
    stripped = strip_cantillation(hebrew)
    if stripped in stripped_glosses:
        resolved[hebrew] = stripped_glosses[stripped]
        continue

    # Try matching without niqqud entirely
    def strip_all_marks(t):
        return ''.join(c for c in t if unicodedata.category(c) not in ('Mn', 'Cf'))

    bare = strip_all_marks(hebrew)
    for k, v in word_form_glosses.items():
        if strip_all_marks(k) == bare:
            resolved[hebrew] = v
            break

resolved_instances = sum(still_unknown[h] for h in resolved)
print(f"  Resolved: {len(resolved):,} words ({resolved_instances:,} instances)")

# ============================================================
# APPLY TO JS FILES
# ============================================================
print("\nApplying OSHB-resolved glosses to JS files...")

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

        # Also compound patterns
        pattern_str = re.escape(f'["{hebrew}","') + r'[^"]*\?\?\?[^"]*"\]'
        for m in re.findall(pattern_str, content):
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
UNKNOWN_RE = re.compile(r'\["([^"]+)","([^"]*\?\?\?[^"]*)"\]')
for filepath in sorted(all_files):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    for m in UNKNOWN_RE.finditer(content):
        remaining += 1
        hw = m.group(1)
        remaining_words[hw] = remaining_words.get(hw, 0) + 1

print(f"\n{'='*60}")
print(f"OSHB RESOLUTION SUMMARY")
print(f"{'='*60}")
print(f"OSHB words parsed:   {oshb_words_total:,}")
print(f"Files modified:      {files_modified}")
print(f"Total fixes:         {total_fixes}")
print(f"Remaining ??? words: {len(remaining_words):,} unique ({remaining:,} instances)")

# Save
remaining_sorted = dict(sorted(remaining_words.items(), key=lambda x: -x[1]))
with open(os.path.join(BASE, '_still_unknown_final.json'), 'w', encoding='utf-8') as f:
    json.dump(remaining_sorted, f, ensure_ascii=False, indent=1)

# Save the OSHB-derived lookup for future use
with open(os.path.join(BASE, '_oshb_glosses.json'), 'w', encoding='utf-8') as f:
    json.dump(word_form_glosses, f, ensure_ascii=False, indent=1)
print(f"\nSaved _oshb_glosses.json ({len(word_form_glosses):,} entries)")
print(f"Saved _still_unknown_final.json ({len(remaining_words):,} entries)")

# Top resolved
print(f"\nTop 20 OSHB-resolved:")
top = sorted(resolved.items(), key=lambda x: -still_unknown.get(x[0], 0))[:20]
for heb, eng in top:
    cnt = still_unknown.get(heb, 0)
    print(f'  {heb} -> "{eng}" ({cnt}x)')
