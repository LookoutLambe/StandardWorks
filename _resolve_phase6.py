"""
Phase 6: Fix bad glosses from Phase 5 + resolve remaining proper names,
NT place names, and scripture-context vocabulary corrections.
"""
import os, re, json, sys, io, glob, unicodedata

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:\Users\chris\Desktop\Standard Works Project'

# ============================================================
# FIX BAD GLOSSES FROM PHASE 5
# ============================================================
# These were wrongly resolved by verb-prefix parsing or wrong Milon entries
BAD_GLOSS_FIXES = {
    # Verb prefix parsing errors (double meanings)
    'to-to become organized': 'to-organize',
    'to-to be inserted': 'to-enter',
    'he-will-they have been planted': 'they-will-be-planted',
    'we-will-mother-my': 'Neumi',  # Actually a proper name (D&C)
    'we-will-completion': 'we-will-be-consumed',
    'we-will-Joel (Hebrew name)': 'Newel',  # D&C proper name
    'and-to-to be inserted': 'and-to-enter',
    'we-will-you will march': 'continues',
    'you/she-will-to depend on': 'you-shall-be-ordained',
    'he-will-to watch': 'he-will-watch',
    'we-will-may you fill': 'was-filled',
    'we-will-procession': 'we-will-walk',
    'we-will-count': 'are-counted',
    "Don't!-you/she-will-repay": 'do-not-repay',

    # Wrong Milon definitions for scripture context
    'Hassidism': 'piety',
    'and-in-the-Hassidism': 'and-in-godliness',
    'registration': 'the-records',
    'a willow branch beaten on the grou': 'Hosanna',
    'apology': 'defense/apology',
    'the-insurrectionist': 'the-one-who-rises-up',
    'and-the-schema': 'and-the-agreement',
    'the-in general': 'the-general',
    'the-to blanch-their': 'their-decisions',
    'from-the-around': 'from-those-reclining',
    'tasty': 'erring',
    'prayer shawl': 'cloak',
    'beneficiary': 'enjoys',
    'imperial': 'Caesarea',
    'Greek (language)': 'Greek',
    'customs official': 'tax-collector',
    'from-beauty-their': 'their-appointments',
    'and-medium': 'and-Beinonai',  # D&C proper name
    'to-aid': 'for-assistance',
    'to-the-thick (soup, gravy, hair, fog)': 'to-ordain',
    'the-invalid(pl)': 'the-disqualified',
    'innocent(pl)': 'acquittals',
    'to-the-a swarm of wild beasts (the fourth of the ten plag': 'to-guarantee',
    'term used to indicate a direct object-gentile-your(pl)': 'your-bodies',
    'what?-in-like this': 'what-does-it-matter',
    'from-the-from-the chief of(pl)': 'in-all-the-offices',
    'among-all-the-from-the chief of(pl)': 'in-all-the-offices',
    'morale-my': 'Morley',  # D&C proper name
    'at-strength': 'to-Elau',
    'to-he burned': 'to-be-burned',
    'to-buy': 'to-be-bought',
    'to-to establish': 'to-establish',
    'in-greediness': 'in-covetousness',
    'this is': 'this-is',
    'in-mistake': 'by-mistake',
    'dynasty': 'lineage',
    'to be imposed': 'was-established',
    'to be loved': 'beloved',
    'withered': 'vulgarity',
    'in-frankness': 'in-sincerity',
    'arrogance-them': 'their-arrogance',
    'mission-them': 'their-mission',
    'they will lay': 'were-ordained',
    'to be authorized': 'was-ordained',
    'to-assistant': 'to-assist',
    'to be based on': 'was-ordained',
    'he-will-to watch': 'he-will-watch',
    'poetic': 'songs-of',
    'official': 'records-of',
    'management': 'administration',
    'in-management': 'in-administration',
    'danger': 'peril',
    'appointing': 'appointment',
    'careful': 'cautious',
    'to be signed': 'was-sealed',
    'during': 'at-the-time-of',
    'gem': 'pearl',
    'nimbleness': 'diligence',
    'shielding': 'sheltered',
    'guardian': 'guardian',  # this one is actually ok
    'guardian(pl)': 'guardians',
    'responsibility': 'responsibility',  # ok
    'in-the-imprisonment': 'in-prison',
}

# ============================================================
# ADDITIONAL PROPER NAMES (D&C + NT)
# ============================================================
PROPER_NAMES = {
    # D&C names
    'קִירְטְלֶנְד': 'Kirtland',
    'טֵילוֹר': 'Taylor',
    'וִיטְמֵר': 'Whitmer',
    'מִילֶר': 'Miller',
    'סְנַיְדֶר': 'Snyder',
    'סִדְנִי': 'Sidney',
    'בְּרִיגָּם': 'Brigham',
    'פְּרַאט': 'Pratt',
    'תּוֹמַס': 'Thomas',
    'תֵיֶיר': 'Thayer',
    'קָהוּן': 'Cahoon',
    'גְּרִיפִין': 'Griffin',
    'פָּטֵן': 'Patten',
    'אָדָם־אֹנְדִּי־אַהְמָן': 'Adam-ondi-Ahman',
    'גָ׳קְסוֹן': 'Jackson',
    'גָ׳ס': 'Jess',
    'גָ׳וֹן': 'John',
    'וִילְיַמְס': 'Williams',
    'וִילְיַמְס׃': 'Williams',
    'נְיוּאֵל': 'Newel',
    'מוֹרְלִי': 'Morley',
    'בּוּרְסִי': 'Bursey',
    'פָּרְטְרִיגָ׳': 'Partridge',
    'קוֹפְלִי': 'Copley',
    'מַרְש': 'Marsh',
    'הַיְד': 'Hyde',
    'מֵק׳לִין': 'McLellin',
    'סְמִית': 'Smith',
    'רֵיְנוֹלְדְס': 'Reynolds',
    'הַרִיס': 'Harris',
    'פָּגִ׳': 'Page',
    'סְטֶנְהָאוּז': 'Stenhouse',
    'רוֹבִּינְסוֹן': 'Robinson',
    'בּוּלוֹק': 'Bullock',
    'שֶׁפֶרְד': 'Shepherd',
    'הַנְקוֹק': 'Hancock',
    'קִמְבָּל': 'Kimball',
    'מָרְשׁ': 'Marsh',
    'ווֹדְרוּף': 'Woodruff',
    'פְּלֶלְפְּס': 'Phelps',
    'ג׳וֹנְסוֹן': 'Johnson',
    'רִיצָ׳רְדְס': 'Richards',
    'קֵיז': 'Case',
    'גְּרָאנְט': 'Grant',
    'לַמָאן': 'Laman',  # BOM name in D&C
    'לֵימוּאֵל': 'Lemuel',

    # NT place names
    'טַרְסוֹס': 'Tarsus',
    'אֶל־טַרְסוֹס': 'to-Tarsus',
    'קִילִיקְיָא': 'Cilicia',
    'בְּקִילִיקְיָא': 'in-Cilicia',
    'סוּרְיָא': 'Syria',
    'בְּסוּרְיָא': 'in-Syria',
    'גָּלְגָּלְתָּא': 'Golgotha',
    'כּוֹרָזִין': 'Chorazin',
    'תִּיאֲטִירָא': 'Thyatira',
    'תְּאוֹפִילוֹס': 'Theophilus',
    'קֵיסָרֵיָה': 'Caesarea',
    'קְפַרְנַחוּם': 'Capernaum',
    'נִיקַנוֹר': 'Nicanor',
    'פַּרְמֶנָס': 'Parmenas',
    'טִימוֹן': 'Timon',
    'פְּרוֹכוֹרוֹס': 'Prochorus',
    'נִיקוֹלָאוֹס': 'Nicolas',
    'אַנְטִיוֹכְיָה': 'Antioch',
    'סִילָס': 'Silas',
    'דֶּרְבֶּה': 'Derbe',
    'לוּסְטְרָא': 'Lystra',
    'גָּלַטְיָא': 'Galatia',
    'פְרִיגְיָא': 'Phrygia',
    'מַקְדוֹנְיָה': 'Macedonia',
    'פִילִפִּי': 'Philippi',
    'תֶּסַּלוֹנִיקָה': 'Thessalonica',
    'בֵּירוֹאָה': 'Berea',
    'אֲתוּנָה': 'Athens',
    'קוֹרִינְתּוֹס': 'Corinth',
    'אֶפֶסוֹס': 'Ephesus',
    'מִילֵיטוֹס': 'Miletus',
    'רוֹדוֹס': 'Rhodes',
    'פַּטָרָה': 'Patara',
    'צוֹר': 'Tyre',
    'צִידוֹן': 'Sidon',
    'קוֹלוֹסָּה': 'Colossae',
    'לָאוֹדִיקֵיָא': 'Laodicea',
    'סַמוֹתְרָקִי': 'Samothrace',
    'נֶאָפּוֹלִיס': 'Neapolis',
    'אַמְפִיפּוֹלִיס': 'Amphipolis',
    'אַפּוֹלוֹנְיָה': 'Apollonia',
    'יוֹפָה': 'Joppa',
    'לוֹד': 'Lydda',
    'סַלָמִיס': 'Salamis',
    'פַּאפוֹס': 'Paphos',
    'פֶּרְגֶּה': 'Perga',
    'פִּיסִידְיָה': 'Pisidia',
    'אִיקוֹנִיוֹן': 'Iconium',
    'פַּמְפוּלְיָה': 'Pamphylia',
    'אַטַּלְיָא': 'Attalia',

    # NT people
    'וְיוֹחָנָה': 'and-Joanna',
    'גַּמְלִיאֵל': 'Gamaliel',
    'אֲנַנְיָה': 'Ananias',
    'שַׁפִּירָא': 'Sapphira',
    'סְטֶפָנוֹס': 'Stephen',
    'בַּר־נַבָּא': 'Barnabas',
    'קוֹרְנֵלִיוּס': 'Cornelius',
    'אֲגַבּוֹס': 'Agabus',
    'אֶלִימָא': 'Elymas',
    'סֶרְגִיוּס': 'Sergius',
    'פָּאוּלוֹס': 'Paulus',
    'דִּימַס': 'Demas',
    'אֶפַּפְרָס': 'Epaphras',
    'אוֹנֵיסִימוֹס': 'Onesimus',
    'אַרְכִיפּוֹס': 'Archippus',
    'פִילֵימוֹן': 'Philemon',
    'אַפְּיָה': 'Apphia',
    'טִימוֹתֵאוֹס': 'Timothy',
    'אֶפַּפְרוֹדִיטוֹס': 'Epaphroditus',
    'אֵיוָדְיָא': 'Euodia',
    'סִינְטִיכֵי': 'Syntyche',
    'קְלֵמֶנְטוֹס': 'Clement',
    'אַרִיסְטַרְכוֹס': 'Aristarchus',
    'טִיכִיקוֹס': 'Tychicus',
    'אֶרָסְטוֹס': 'Erastus',
    'טְרוֹפִימוֹס': 'Trophimus',
    'פּוּדֶנְס': 'Pudens',
    'לִינוֹס': 'Linus',
    'קְלָאוּדְיָא': 'Claudia',
    'הוּמֶנָיוֹס': 'Hymenaeus',
    'אֲלֶכְסַנְדְּרוֹס': 'Alexander',
    'פִילֵיטוֹס': 'Philetus',
    'יַנִּיס': 'Jannes',
    'יַמְבְּרֵיס': 'Jambres',
    'קְרֵיסְקֵנְס': 'Crescens',
    'דַּלְמָטְיָא': 'Dalmatia',
    'קַרְפּוֹס': 'Carpus',
    'טְרוֹאָס': 'Troas',
    'מֵלֶכִּיצֶדֶק': 'Melchizedek',
    'מֶלְכִּיצֶדֶק': 'Melchizedek',
    'אַהֲרוֹנִית': 'Aaronic',
    'אַהֲרוֹנִי': 'Aaronic',
}

# ============================================================
# ADDITIONAL MODERN/SCRIPTURAL VOCABULARY
# ============================================================
MODERN_VOCAB = {
    # Common Modern Hebrew in D&C/NT context
    'טְבִילוֹתֵיכֶם': 'your-baptisms',
    'הַזּוּנִין': 'the-tares',
    'אֶת־הַזּוּנִין': 'the-tares',
    'הַמִּנְיָנִים': 'the-quorums',
    'פְּקִידֵי': 'officers-of',
    'יוֹעֲצָיו': 'his-counselors',
    'שַׁיָּכִים': 'belonging',
    'תַּכְרִיזוּ': 'you-shall-proclaim',
    'יִתְקַבֵּל': 'shall-be-received',
    'הַמֻּטֶּלֶת': 'the-imposed',
    'קְרִיאָתָם': 'their-calling',
    'קָרְבְּנוֹתֶיךָ': 'your-sacrifices',
    'דִּינֵי': 'laws-of',
    'זְמַנּוֹ': 'his-time',
    'בִּרְכוֹתַי': 'my-blessings',
    'וּקְרִיאָתְךָ': 'and-your-calling',
    'חוֹבָתְךָ': 'your-duty',
    'מִנִּיתִיךָ': 'I-appointed-you',
    'בִּסְעוּדַת': 'at-the-feast-of',
    'וּמִבַּלְעָדָיו': 'and-without-him',
    'נִדּוֹנִים': 'judged',
    'אַרְצִיִּים': 'earthly',
    'הַנִּסְמָכִים': 'the-ordained',
    'הַשַּׁמָּשִׁים': 'the-deacons',
    'רְחִיצַת': 'washing-of',
    'חָזְרוּ': 'they-returned',
    'נִקְנֵיתֶם': 'you-were-bought',
    'מֻתֶּרֶת': 'permitted',
    'יְשַׁמְּשׁוּ': 'they-shall-serve',
    'וְנִכְסָפִים': 'and-longing',
    'מַשְׁרִישִׁים': 'rooting',
    'לְתִקּוּנֵי': 'for-corrections-of',
    'הִשְׁמִינוּ': 'they-grew-fat',
    'סתומה': 'closed',
    'בִּכְשָׁפָיו': 'with-his-sorceries',
    'הֲכָזֹאת': 'like-this?',
    'שְׁמוּעַת': 'report-of',
    'בְּהוֹדָאַת': 'in-thanksgiving-of',
    'הַמְגַדְּפִים': 'the-blasphemers',
    'יִמְסְרֶנּוּ': 'he-will-deliver-him',
    'נִרְדָּמִים': 'sleeping',
    'נִסּוּהוּ': 'they-tested-him',
    'וְהִרְשִׁיעֻהוּ': 'and-they-condemned-him',
    'יַפְקִידֶנּוּ': 'he-will-entrust-him',
    'גַּם־הַפְּרוּשִׁים': 'also-the-Pharisees',
    'הַמִּצְטַדְּקִים': 'the-self-justifying',
    'לְהַחֲשֹׁתוֹ': 'to-silence-him',
    'וַיִּצְלְבֻהוּ': 'and-they-crucified-him',
    'וְזוֹלֲלוּת': 'and-gluttony',
    'וַיְעִירֵהוּ': 'and-he-woke-him',
    'וּבְכָל־מַדָּעֲךָ': 'and-with-all-your-mind',
    'בִּילוּדֵי': 'among-newborns-of',
    'חִלַּלְנוּ': 'we-profaned',
    'בְקִרְבְּכֶן': 'in-your-midst',
    'תִּשְׁחָקֵהוּ': 'it-will-crush-him',
    'וְהַסֹּקֶלֶת': 'and-the-stoning',
    'אִם־כִּרְצוֹנֶךָ': 'if-according-to-your-will',
    'וַיְמָרֵר': 'and-he-wept-bitterly',
    'שִׂטְנָתָם': 'their-hatred',
    'הִתְלוֹצֲצָם': 'their-mocking',
    'וַיֶּאֶנְסוּ': 'and-they-compelled',
    'הִלְעִיגוּ': 'they-mocked',
    'לְצַלְמָהּ': 'to-her-image',
    'דּוֹמִים': 'similar',
    'וּלְצַלְמָהּ': 'and-to-her-image',
    'שֶׁלָּנוּ.': 'ours',
    'אֲקַבְּלֵם': 'I-will-receive-them',
    'וּלְהִדָּרֵס': 'and-to-be-trampled',
    'צִוִּיתִיכֶם׃': 'I-commanded-you',
    'וּלְהֵעָטֵר': 'and-to-be-crowned',
    'הִתְנַצְּלוּת׃': 'defense',
    'שֶׁמִּתְכַּנֶּסֶת': 'that-is-gathering',
    'בְּדִיקַת': 'examination-of',
    'חוֹזֶרֶת': 'returning',
    'נַחֲלוֹתֵיהֶם׃': 'their-inheritances',
    'הַשַּׁיֶּכֶת': 'the-belonging',
    'שֶׁתִּתְאַרְגְּנוּ': 'that-you-organize',
    'וַיְשִׂימוּהָ': 'and-they-placed-her',
    'וַתִּגַּשְׁנָה': 'and-they-approached',
    'עִם־בּוּרְסִי': 'with-a-tanner',
    'וְיַזְהִיר': 'and-he-shall-warn',
    'פֶרַע*(בספרי': 'Pharaoh',
    'פּוֹטִיפֶרַע': 'Potiphar',
    'ס׳': 'S.',
    'א.': 'A.',

    # More scripture vocabulary
    'וַיְיט': 'and-he-turned-aside',
    'בֵּינוֹנַי': 'Beinonai',
    'הַכְּלָלִית': 'the-general',
    'הַחְלָטוֹתֵיהֶם': 'their-decisions',
    'זַכָּאִיוֹת': 'acquittals',
    'וּלְסַדֵּר': 'and-to-arrange',
    'בְּכָל־הָאֻמּוֹת': 'among-all-the-nations',
    'בְּכָל־הַמִּשְׂרוֹת': 'in-all-the-offices',
    'לְסִיּוּעַ': 'for-assistance',
    'לְהַסְמִיךְ': 'to-ordain',

    # Aramaic/parenthetical
    '(יעיש)': '(Jaaish)',
    '(ומנהון)': '(and-from-them)',
    '(דארין)': '(of-these)',
    '(רביעיה)': '(fourth)',
    '(היהודיים)': '(the-Jews)',
}

# ============================================================
# APPLY FIXES
# ============================================================
print("Phase 6: Fixing bad glosses + adding proper names + vocab...")

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
fix_type_counts = {'bad_gloss': 0, 'proper_name': 0, 'vocab': 0}

for filepath in sorted(all_files):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    file_fixes = 0

    # 1. Fix bad glosses from Phase 5
    for wrong, correct in BAD_GLOSS_FIXES.items():
        old = f',"{wrong}"]'
        new = f',"{correct}"]'
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            file_fixes += count
            fix_type_counts['bad_gloss'] += count

    # 2. Apply proper names (resolve ???)
    for hebrew, english in PROPER_NAMES.items():
        old = f'["{hebrew}","???"]'
        new = f'["{hebrew}","{english}"]'
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            file_fixes += count
            fix_type_counts['proper_name'] += count

    # 3. Apply modern vocabulary (resolve ???)
    for hebrew, english in MODERN_VOCAB.items():
        old = f'["{hebrew}","???"]'
        new = f'["{hebrew}","{english}"]'
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            file_fixes += count
            fix_type_counts['vocab'] += count

        # Also compound patterns with partial ???
        pattern = re.compile(re.escape(f'["{hebrew}","') + r'[^\"]*\?\?\?[^\"]*"\]')
        for m in pattern.findall(content):
            content = content.replace(m, new)
            file_fixes += 1
            fix_type_counts['vocab'] += 1

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
print(f"PHASE 6 SUMMARY")
print(f"{'='*60}")
print(f"Files modified:      {files_modified}")
print(f"Total fixes:         {total_fixes}")
print(f"  Bad gloss fixes:   {fix_type_counts['bad_gloss']}")
print(f"  Proper names:      {fix_type_counts['proper_name']}")
print(f"  Vocabulary:        {fix_type_counts['vocab']}")
print(f"\nRemaining ??? words: {len(remaining_words):,} unique ({remaining:,} instances)")
print(f"\nRemaining by section:")
for section, count in remaining_by_section.items():
    print(f"  {section.upper()}: {count:,}")

# Save
remaining_sorted = dict(sorted(remaining_words.items(), key=lambda x: -x[1]))
with open(os.path.join(BASE, '_still_unknown_v6.json'), 'w', encoding='utf-8') as f:
    json.dump(remaining_sorted, f, ensure_ascii=False, indent=1)
print(f"\nSaved _still_unknown_v6.json ({len(remaining_words):,} entries)")

# Top 20 remaining
print(f"\nTop 20 still unresolved:")
top_un = list(remaining_sorted.items())[:20]
for heb, cnt in top_un:
    print(f'  {heb} ({cnt}x)')
