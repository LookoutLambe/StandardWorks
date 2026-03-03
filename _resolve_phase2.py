"""
Phase 2: Resolve remaining ??? glosses.
1. D&C proper name transliterations
2. Modern/Mishnaic Hebrew vocabulary
3. Morphological verb analysis
"""
import os, re, json, sys, io, glob, unicodedata

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:\Users\chris\Desktop\Standard Works Project'

# Load remaining unknowns
with open(os.path.join(BASE, '_still_unknown.json'), 'r', encoding='utf-8') as f:
    still_unknown = json.load(f)

print(f"Starting with {len(still_unknown):,} unresolved words ({sum(still_unknown.values()):,} instances)\n")

# ============================================================
# 1. PROPER NAMES (D&C, NT, OT)
# ============================================================
PROPER_NAMES = {
    # D&C people
    'וִילְיָם': 'William',
    'וִילְיַם': 'William',
    'וִילְיַמְס': 'Williams',
    'אוֹרְסוֹן': 'Orson',
    'גִילְבֶּרְט': 'Gilbert',
    'קַרְטֶר': 'Carter',
    'וִיטְנִי': 'Whitney',
    'פַּרְטְרִיג׳': 'Partridge',
    'פַּרְלִי': 'Parley',
    'פֶלְפְּס': 'Phelps',
    'וִיטְמֶר': 'Whitmer',
    'תּוֹמָס': 'Thomas',
    'וִילְפוֹרְד': 'Wilford',
    'קִימְבָּל': 'Kimball',
    'פְרֶדֶרִיק': 'Frederick',
    'פְרֶדְרִיק': 'Frederick',
    'נַיְט': 'Knight',
    'נַייְט': 'Knight',
    'יַנְג': 'Young',
    'וּוּדְרוּף': 'Woodruff',
    'מַרְקְס': 'Marks',
    "גֶ'וֹרְג'": 'George',
    'סִילְבֶסְטֶר': 'Sylvester',
    'לוּק': 'Luke',
    "גָ׳נְסוֹן": 'Johnson',
    "גָ׳וֹנְסוֹן": 'Johnson',
    "ג׳וֹן": 'John',
    'הַיְיד': 'Hyde',
    'נְיוּאֶל': 'Newel',
    'מִיזוּרִי': 'Missouri',
    'יוּטָא': 'Utah',
    'בְּאוֹהָיוֹ': 'in-Ohio',
    'אֲנִיַּס': 'Ananias',
    'טָבִיתָא': 'Tabitha',
    'לוּדְקְיָא': 'Laodicea',
    'קִירְטְלַנְד׃': 'Kirtland',
    'הֶגְמוֹן': 'governor',

    # NT names
    'וּבַר־נַבָּא': 'and-Barnabas',
    'בַּר־נַבָּא': 'Barnabas',
    'הַנִּיקְלָסִים': 'the-Nicolaitans',
    'שֹׁמְרוֹנִית': 'Samaritan(f)',

    # Abbreviation-style references
    "ק׳": 'K.',
    "ק.": 'K.',
    "ק": 'K.',
    "נ׳": 'N.',
    "ו׳": 'W.',
    "פּ׳": 'P.',
    "ה׳": 'H.',
    "ג׳׳": 'G.',
    '׆': '',  # Hebrew punctuation mark
    '…': '...',
    ']': '',
}

# ============================================================
# 2. MODERN / MISHNAIC HEBREW
# ============================================================
MODERN_HEBREW = {
    # Administrative/organizational
    'חוֹבַת': 'duty-of',
    'חוֹבָתוֹ': 'his-duty',
    'הַנְּשִׂיאוּת': 'the-presidency',
    'נְשִׂיאוּת': 'presidency',
    'לִנְשִׂיאוּת': 'to-presidency',
    'הָרֵאשׁוּת': 'the-presidency',
    'רֵאשׁוּת': 'presidency',
    'סוֹכֵן': 'agent',
    'הַסּוֹכֵן': 'the-agent',
    'סַמְכוּת': 'authority',
    'נִשּׂוּאִין': 'marriage',
    'הַנִּשּׂוּאִין': 'the-marriage',
    'בִּישׁוֹף': 'bishop',
    'שְׁלִיחוּת': 'apostleship',
    'שְׁלִיחוּתוֹ': 'his-apostleship',
    'הַשַּׁיָּכִים': 'the-belonging',
    'הַשַּׁיָּךְ': 'the-belonging',
    'שַׁיָּךְ': 'belonging',
    'חֻקִּית': 'legal',
    'כְּלָלִית': 'general',
    'הַדְּפוּס': 'the-printing-press',
    'שׂוֹטֵן': 'adversary',
    'הַמַּלְשִׁין': 'the-accuser',
    'הַמַּשְׂטִין': 'the-accuser',
    'סְעוּדַת': 'feast-of',

    # Verbs - modern usage
    'נוֹתְנִים': 'giving',
    'הִכּוֹנוּ': 'prepare-yourselves',
    'בְּהֶתְאֵם': 'in-accordance',
    'הִלְבִּין': 'whitened',
    'מִנִּיתִיו': 'I-have-appointed-him',
    'הַנִּזְכֶּרֶת': 'the-aforementioned',
    'צְרִיכָה': 'needs(f)',
    'כְּשֶׁהֻסְמַךְ': 'when-ordained',
    'הַנִּסְמָךְ': 'the-ordained',
    'וְנִסְמַךְ': 'and-ordained',
    'יִשְׁתַּמְּשׁוּ': 'they-shall-use',
    'לְהַנְהִיג': 'to-lead',
    'יַמְשִׁיךְ': 'he-shall-continue',
    'זְקוּקִים': 'in-need-of',
    'זְקוּקָה': 'in-need-of(f)',
    'נוֹסַד': 'founded',
    'רוּחָנִית': 'spiritual(f)',
    'שָׁקוּד': 'diligent',
    'צָנוּעַ': 'modest/humble',
    'נְקִיָּה': 'clean(f)',
    'רְצוּיִם': 'desired',
    'הַמְשִׁיכוּ': 'continue!',
    'שֶׁיַּמְשִׁיכוּ': 'that-they-continue',
    'סוֹלֵחַ': 'forgiving',
    'לְשִׁמּוּשׁ': 'for-use',
    'מַכְרִיז': 'proclaiming',
    'מְשָׁרֶתֶת': 'serving(f)',
    'לַעֲסֹק': 'to-engage-in',
    'דְּחוּקָה': 'pressed/urgent(f)',
    'טָרוּד': 'busy/occupied',
    'טְרוּדָה': 'busy/occupied(f)',
    'וְהַקּוֹנִים': 'and-the-buyers',
    'נִתְחַלָּף': 'exchanged',
    'אַחֲרַאי': 'responsible',
    'חוֹשֵׁשׁ': 'concerned',
    'יַפְצִירוּ': 'they-shall-urge',
    'בְּהַסְכָּמַת': 'with-consent-of',
    'הֻחְלַט': 'it-was-decided',
    'שְׁמִיעַת': 'hearing-of',
    'מִפֶּסֶק': 'from-ruling',
    'הַנּוֹסַעַת': 'the-traveling(f)',
    'הָעֶלְיוֹנִים': 'the-upper/supreme',
    'לְאַרְגֵּן': 'to-organize',
    'טָעוּת': 'error',
    'מַעֲנִיק': 'bestowing',
    'אָהַבְנוּ': 'we-loved',
    'רִבּוּי': 'plurality',
    'הַזּוֹנִין': 'the-tares',
    'הַזּוּנִין': 'the-tares',
    'וְהַזּוּנִין': 'and-the-tares',
    'לְהִתְמַנּוֹת': 'to-be-appointed',
    'מְנוּסַתְכֶם': 'your-flight',
    'אַזְהָרָה': 'warning',
    'הֻבְטְחוּ': 'they-were-promised',
    'הִכָּנַעְנָה': 'we-submitted',
    'הִתְבַּשְׂרוּ': 'they-received-tidings',
    'נְבַקְשָׁה': 'let-us-seek',
    'לְהִתְרַחֵק': 'to-distance-oneself',
    'תַּעֲלוּמוֹת': 'mysteries',
    'עִקְּרֵי': 'principles-of',
    'תֵּאָסְפוּ': 'you-shall-be-gathered',
    'הַנַּ״ל': 'the-aforementioned',
    'לְהִתְפָּקֵד': 'to-be-appointed',

    # NT context modern vocab
    'טוֹבֵל': 'immerser/baptizer',
    'חֲתֻנַּת': 'wedding-of',
    'הֲמֹנִים': 'multitudes',
    'טְלַאי': 'patch',
    'פְרוּטוֹת': 'coins',
    'נוּמוּ': 'slumber!',
    'מְשִׂימִים': 'placing',
    'תִּדְפֹּק': 'you-shall-knock',
    'וְהַדֹּפֵק': 'and-the-one-knocking',
    'תַּאַצְרוּ': 'you-shall-store',
    'הַחַרְדָּל': 'the-mustard',
    'הָרָשֻׁיּוֹת': 'the-authorities',
    'סְאַת': 'measure-of',

    # Verb conjugations
    'יִתְנַחֲמוּ': 'they-shall-be-comforted',
    'יִמְצָאֶנָּה': 'it-shall-find-her',
    'תְּבַקְשׁוּנִי': 'you-shall-seek-me',
    'אֲיַסְּרֶנּוּ': 'I-will-chastise-him',
    'וְאַתִּירֶנּוּ': 'and-I-will-release-him',
    'וְיִתְרַחֵב': 'and-it-shall-widen',
    'אֶכָּשֵׁל': 'I-shall-stumble',
    'וְאֶת־סִילָא': 'and-Silas',
    'וְאֶת־מַלְכִּישׁוּעַ': 'and-Melchizedek',
    'אֶת־חוֹתָמָיו': 'his-seals',
    'יִמְאָסֻהוּ': 'they-shall-reject-him',
    'חֻקֵּנוּ': 'we-were-engraved',
    'אֶת־גָּרְנוֹ': 'his-threshing-floor',
    'אֶת־דְּגָנוֹ': 'his-grain',
    'יִשְׂרְפֶנּוּ': 'he-shall-burn-it',
    'וַיַּעַזְבֵם': 'and-he-left-them',
    'אֶל־תַּלְמִידֶיךָ': 'to-your-disciples',
    'אֶת־אֹהֲבֵיכֶם': 'those-who-love-you',
    'הַנֶּחֱלָקָה': 'the-divided(f)',
    'אִם־נֶחֱלַק': 'if-divided',
    'אֶת־הַמִּנְתָּא': 'the-offering',
    'תִּצְטַדְּקוּ': 'you-shall-be-justified',
    'אֶת־הַפְּרוּטָה': 'the-penny',
    'אֶת־שְׁטָרְךָ': 'your-bill/document',
    'כָּאַחֶרֶת': 'as-another(f)',
    'וְאַל־תִּמְנָעוּם': 'and-do-not-prevent-them',
    'וְכָל־הַסַּנְהֶדְרִין': 'and-all-the-Sanhedrin',
    'וְהַיְסֹדוֹת': 'and-the-foundations',
    'יָמוּגוּ': 'they-shall-melt',
    'נִתְכַּהֲנוּ': 'we-were-ordained',
    'נִכְסְפוּ': 'they-longed',
    'בְּשִׁירֵי': 'in-songs-of',
    'וְאֵלַמָּו': 'and-Elam',

    # Parenthetical glosses (alternative readings)
    '(אנתה)': '(you)',
    '(לזועה)': '(for-horror)',
    '(מדונים)': '(quarrels)',
    '(צביים)': '(gazelles)',
    '(מחצצרים)': '(trumpeters)',
    '(בנוית)': '(built)',
    '(המאיות)': '(the-hundreds)',
    '(כשדיא)': '(Chaldeans)',
    '(קיתרס)': '(lyres)',
    '(ואנתה)': '(and-you)',
    'בתיבה': 'in-the-word',

    # Additional morphological
    'שֶׁתִּקָּנֶינָה': 'that-they-be-acquired(f)',
    'מִמֲֶָּ': '???',  # corrupted text, leave as-is
}

# ============================================================
# COMBINE ALL RESOLUTIONS
# ============================================================
all_resolutions = {}
all_resolutions.update(PROPER_NAMES)
all_resolutions.update(MODERN_HEBREW)

# Remove any that map to '???' or empty
all_resolutions = {k: v for k, v in all_resolutions.items() if v and v != '???'}

print(f"Resolution dictionary: {len(all_resolutions)} entries")
print(f"  Proper names: {len(PROPER_NAMES)}")
print(f"  Modern Hebrew: {len(MODERN_HEBREW)}")

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
fix_counts = {}

for filepath in sorted(all_files):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    file_fixes = 0

    for hebrew, english in all_resolutions.items():
        # Pure ??? replacement
        old = f'["{hebrew}","???"]'
        new = f'["{hebrew}","{english}"]'
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            file_fixes += count
            fix_counts[hebrew] = fix_counts.get(hebrew, 0) + count

        # Also handle compound patterns like "and-???"
        # Search for this Hebrew word with any gloss containing ???
        pattern = re.compile(re.escape(f'["{hebrew}","') + r'[^"]*\?\?\?[^"]*"\]')
        matches = pattern.findall(content)
        for m in matches:
            content = content.replace(m, new)
            file_fixes += 1
            fix_counts[hebrew] = fix_counts.get(hebrew, 0) + 1

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        files_modified += 1
        total_fixes += file_fixes
        rel = os.path.relpath(filepath, BASE)
        print(f'  {rel}: {file_fixes} fixes')

# ============================================================
# RECOUNT REMAINING ???
# ============================================================
print("\nRecounting remaining ??? instances...")
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

# ============================================================
# SUMMARY
# ============================================================
print(f"\n{'='*60}")
print(f"PHASE 2 SUMMARY")
print(f"{'='*60}")
print(f"Files modified:      {files_modified}")
print(f"Total fixes:         {total_fixes}")
print(f"Remaining ??? words: {len(remaining_words):,} unique ({remaining:,} instances)")
print(f"\nTop 20 fixes applied:")
for hw, cnt in sorted(fix_counts.items(), key=lambda x: -x[1])[:20]:
    eng = all_resolutions[hw]
    print(f'  {hw} -> "{eng}" ({cnt}x)')

# Save updated remaining
remaining_sorted = dict(sorted(remaining_words.items(), key=lambda x: -x[1]))
with open(os.path.join(BASE, '_still_unknown_v2.json'), 'w', encoding='utf-8') as f:
    json.dump(remaining_sorted, f, ensure_ascii=False, indent=1)
print(f"\nSaved _still_unknown_v2.json ({len(remaining_words):,} entries)")
