#!/usr/bin/env python3
"""
Morphological gloss validator for Hebrew BOM.
Checks that Hebrew verb conjugations and pronominal suffixes
have correct person/gender/number in their English glosses.
"""
import re, os, sys, json, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VERSES_DIR = os.path.join(os.path.dirname(__file__), 'verses')

# ── helpers ──────────────────────────────────────────────────────────
def load_verse_pairs(filepath):
    """Extract all [hebrew, gloss] pairs from a verse JS file."""
    text = open(filepath, 'r', encoding='utf-8').read()
    pairs = re.findall(r'\["([^"]+)","([^"]*)"\]', text)
    return pairs

def strip_nikkud(s):
    """Remove Hebrew vowel points and cantillation marks."""
    return re.sub(r'[\u0591-\u05C7]', '', s)

def has_any(gloss, words):
    """Check if gloss contains any of the given words (case-insensitive)."""
    g = gloss.lower().replace('-', ' ')
    for w in words:
        if w in g:
            return True
    return False

# ── Imperfect (yiqtol) prefix checks ────────────────────────────────
# Tav prefix = 2ms "you shall", 2fs, 3fs, 2mp, 3fp
# Yod prefix = 3ms "he shall", 3mp "they shall"
# Aleph prefix = 1cs "I shall"
# Nun prefix = 1cp "we shall"

IMPERFECT_PREFIXES = {
    '\u05EA': ('tav', ['you', 'she', 'shall', 'will', 'let', 'may', 'can', 'must', 'should']),
    '\u05D9': ('yod', ['he', 'they', 'it', 'shall', 'will', 'let', 'may', 'one', 'can', 'must', 'should']),
    '\u05D0': ('aleph', ['i', 'shall', 'will', 'let', 'may', 'can', 'must', 'should']),
    '\u05E0': ('nun', ['we', 'shall', 'will', 'let', 'may', 'can', 'must', 'should']),
}

# Hebrew consonants for detecting verb patterns
CONSONANTS = set('אבגדהוזחטיכלמנסעפצקרשת') | set('ךםןףץ')

def is_likely_imperfect_verb(heb):
    """Check if Hebrew word looks like an imperfect verb."""
    bare = strip_nikkud(heb)
    # Remove common prefixes: ו (vav conjunctive), ל/ב/כ/מ (prepositions)
    # But be careful not to strip the actual verb prefix
    if len(bare) < 2:
        return False, None, None

    # Check for vav-consecutive (וַיִּ / וַתִּ / etc.)
    vav_consec = False
    check = bare
    if check.startswith('ו'):
        check = check[1:]
        vav_consec = True

    # After stripping vav, check for imperfect prefix
    if len(check) < 2:
        return False, None, None

    first = check[0]
    if first in IMPERFECT_PREFIXES:
        # Needs at least 2 more consonant letters to be a verb root
        remaining_consonants = sum(1 for c in check[1:] if c in CONSONANTS)
        if remaining_consonants >= 2:
            name, expected = IMPERFECT_PREFIXES[first]
            return True, name, expected

    return False, None, None

# ── Perfect (qatal) suffix checks ───────────────────────────────────
# These are suffixes on the Hebrew perfect verb form

PERFECT_SUFFIXES_NIKKUD = [
    # (Hebrew suffix with nikkud, person label, expected gloss words)
    ('תִּי', '1cs-perfect', ['i', 'my']),
    ('נוּ', '1cp-perfect', ['we', 'our', 'us']),
    ('תָּ', '2ms-perfect', ['you', 'your', 'thou', 'thy']),
    ('תְּ', '2fs-perfect', ['you', 'your', 'thou', 'thy']),
    ('תֶּם', '2mp-perfect', ['you', 'your', 'ye']),
    ('תֶּן', '2fp-perfect', ['you', 'your', 'ye']),
]

# ── Pronominal suffix checks ────────────────────────────────────────
PRONOUN_SUFFIXES = [
    # (stripped suffix pattern, label, expected gloss words)
    ('כם', '2mp-suffix', ['your', 'you', 'ye']),
    ('כן', '2fp-suffix', ['your', 'you', 'ye']),
    ('הם', '3mp-suffix', ['their', 'them', 'they']),
    ('הן', '3fp-suffix', ['their', 'them', 'they']),
    ('נו', '1cp-suffix', ['our', 'us', 'we']),
    ('ך', '2ms-suffix', ['your', 'you', 'thy', 'thou', 'thee']),
]

# ── Common words to skip (not verbs, particles, etc.) ───────────────
SKIP_GLOSSES = {
    '', '[ACC]', 'and', 'the', 'of', 'to', 'in', 'from', 'with', 'for',
    'not', 'no', 'or', 'but', 'that', 'which', 'who', 'whom', 'if',
    'on', 'upon', 'by', 'at', 'as', 'like', 'than', 'also', 'even',
    'so', 'thus', 'then', 'now', 'behold', 'lo', 'yes', 'amen',
}

SKIP_HEBREW = {
    '׃', '־', '', 'אֶת', 'וְאֶת', 'אֵת',  # acc marker, sof pasuk
}

# Words that commonly start with these prefixes but aren't imperfect verbs
NOT_VERBS_STRIPPED = {
    'תורה', 'תורת', 'תפלה', 'תפלת', 'תשובה', 'תשובת',
    'ישראל', 'יהוה', 'ירושלם', 'ירושלים', 'יעקב', 'יוסף', 'ישוע',
    'יהודה', 'ישעיהו', 'ישעיה', 'ירמיהו', 'ירמיה',
    'נביא', 'נביאי', 'נביאים', 'נפש', 'נפשי', 'נפשות',
    'אדם', 'אדני', 'אדון', 'אלהים', 'אלהי', 'אמת', 'ארץ', 'אבי',
    'תהלה', 'תהלים', 'תודה', 'תקוה', 'תמיד',
}

def check_imperfect(heb, gloss):
    """Check imperfect verb glosses for person/number markers."""
    issues = []

    if gloss.lower().replace('-',' ').strip() in SKIP_GLOSSES:
        return issues
    if heb in SKIP_HEBREW:
        return issues

    bare = strip_nikkud(heb)
    # Skip known non-verb words
    for skip in NOT_VERBS_STRIPPED:
        if bare.startswith(strip_nikkud(skip)) or bare.endswith(strip_nikkud(skip)):
            return issues

    is_imp, prefix_name, expected_words = is_likely_imperfect_verb(heb)
    if not is_imp:
        return issues

    # Check if gloss has any expected person/tense marker
    if not has_any(gloss, expected_words):
        # Additional check: some glosses use implicit subjects that are fine
        # e.g., infinitive constructs, participles used as gerunds
        # Skip if gloss starts with common non-finite markers
        g = gloss.lower().replace('-', ' ')
        skip_patterns = ['to ', 'doing', 'being', 'having', 'making', 'going',
                         'not', 'do not', 'lest']
        if any(g.startswith(p) for p in skip_patterns):
            return issues

        issues.append({
            'type': f'imperfect-{prefix_name}',
            'hebrew': heb,
            'gloss': gloss,
            'expected': expected_words,
            'msg': f'Imperfect ({prefix_name}-prefix) verb "{heb}" glossed as "{gloss}" — missing person/tense marker'
        })

    return issues


def check_all_morphology():
    """Run all morphological checks across all verse files."""
    all_issues = []
    file_order = [
        '1nephi.js', '2nephi.js', 'jacob.js', 'enos.js', 'jarom.js',
        'omni.js', 'words_of_mormon.js', 'mosiah.js', 'alma.js',
        'helaman.js', '3nephi.js', '4nephi.js', 'mormon.js', 'ether.js',
        'moroni.js', 'frontmatter.js'
    ]

    total_words = 0
    total_imperfect = 0

    for fname in file_order:
        fpath = os.path.join(VERSES_DIR, fname)
        if not os.path.exists(fpath):
            continue

        pairs = load_verse_pairs(fpath)
        file_issues = []

        for heb, gloss in pairs:
            total_words += 1

            # Skip empty, punctuation, acc markers
            if not heb or not gloss or heb in SKIP_HEBREW:
                continue
            if gloss.strip() in SKIP_GLOSSES:
                continue

            # Check imperfect verbs
            issues = check_imperfect(heb, gloss)
            if issues:
                total_imperfect += 1
                for iss in issues:
                    iss['file'] = fname
                file_issues.extend(issues)

        if file_issues:
            all_issues.extend(file_issues)

    return all_issues, total_words, total_imperfect


def main():
    print("=" * 80)
    print("HEBREW BOM — MORPHOLOGICAL GLOSS VALIDATION")
    print("=" * 80)
    print()

    issues, total_words, total_flagged = check_all_morphology()

    # Group by file
    by_file = {}
    for iss in issues:
        f = iss['file']
        if f not in by_file:
            by_file[f] = []
        by_file[f].append(iss)

    # Group by type
    by_type = {}
    for iss in issues:
        t = iss['type']
        if t not in by_type:
            by_type[t] = []
        by_type[t].append(iss)

    print(f"Total words scanned: {total_words}")
    print(f"Total issues found: {len(issues)}")
    print()

    print("BY TYPE:")
    for t in sorted(by_type.keys()):
        print(f"  {t}: {len(by_type[t])}")
    print()

    print("BY FILE:")
    for f in sorted(by_file.keys()):
        print(f"  {f}: {len(by_file[f])}")
    print()

    # Print detailed issues grouped by file
    file_order = [
        '1nephi.js', '2nephi.js', 'jacob.js', 'enos.js', 'jarom.js',
        'omni.js', 'words_of_mormon.js', 'mosiah.js', 'alma.js',
        'helaman.js', '3nephi.js', '4nephi.js', 'mormon.js', 'ether.js',
        'moroni.js', 'frontmatter.js'
    ]

    for fname in file_order:
        if fname not in by_file:
            continue
        print(f"\n{'─' * 80}")
        print(f"FILE: {fname}")
        print(f"{'─' * 80}")
        for iss in by_file[fname]:
            print(f"  [{iss['type']}] {iss['hebrew']} → \"{iss['gloss']}\"")

    # Output JSON for programmatic use
    with open('_morphology_issues.json', 'w', encoding='utf-8') as f:
        json.dump(issues, f, ensure_ascii=False, indent=2)
    print(f"\nDetailed JSON written to _morphology_issues.json")


if __name__ == '__main__':
    main()
