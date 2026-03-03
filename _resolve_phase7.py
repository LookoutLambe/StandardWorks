"""
Phase 7: Final aggressive resolution pass.
Handles: trailing sof-pasuq (׃), remaining proper names, broader verb conjugation,
and more D&C/NT vocabulary.
"""
import os, re, json, sys, io, glob, unicodedata

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'C:\Users\chris\Desktop\Standard Works Project'

# Load all lexicons
with open(os.path.join(BASE, '_milon', 'dict-he-en.json'), 'r', encoding='utf-8') as f:
    milon_raw = json.load(f)

milon = {}
for entry in milon_raw:
    heb = entry.get('translated', '').strip()
    translations = entry.get('translation', [])
    if heb and translations:
        gloss = translations[0]
        if len(gloss) > 50:
            gloss = gloss.split(',')[0].split(';')[0].strip()
        gloss = re.sub(r'^\([^)]+\)\s*', '', gloss).strip()
        if gloss and heb not in milon:
            milon[heb] = gloss

with open(os.path.join(BASE, '_tahot_dict.json'), 'r', encoding='utf-8') as f:
    tahot = json.load(f)
with open(os.path.join(BASE, '_strongs_hebrew.json'), 'r', encoding='utf-8') as f:
    strongs = json.load(f)
with open(os.path.join(BASE, '_supplement.json'), 'r', encoding='utf-8') as f:
    supplement = json.load(f)
oshb_path = os.path.join(BASE, '_oshb_glosses.json')
oshb = {}
if os.path.exists(oshb_path):
    with open(oshb_path, 'r', encoding='utf-8') as f:
        oshb = json.load(f)

combined = {}
combined.update(strongs)
combined.update(supplement.get('proper_nouns', {}))
combined.update(supplement.get('aramaic', {}))
combined.update(supplement.get('morphological', {}))
combined.update(tahot)
combined.update(oshb)
combined.update(milon)

# Also load all previously resolved glosses
for rfile in ['_resolved_glosses.json', '_resolved_modern.json']:
    rpath = os.path.join(BASE, rfile)
    if os.path.exists(rpath):
        with open(rpath, 'r', encoding='utf-8') as f:
            prev = json.load(f)
        combined.update(prev)

print(f"Combined lexicon: {len(combined):,} entries")

def strip_niqqud(text):
    return ''.join(c for c in text if unicodedata.category(c) not in ('Mn', 'Cf'))

combined_stripped = {}
for heb, eng in combined.items():
    bare = strip_niqqud(heb)
    if bare and bare not in combined_stripped:
        combined_stripped[bare] = eng

# Load remaining unknowns
with open(os.path.join(BASE, '_still_unknown_v6.json'), 'r', encoding='utf-8') as f:
    still_unknown = json.load(f)

print(f"Remaining unknowns: {len(still_unknown):,} ({sum(still_unknown.values()):,} instances)")

# ============================================================
# DIRECT MANUAL RESOLUTIONS
# ============================================================
MANUAL = {
    # Garbage / metadata entries
    ']': None,
    '׆': None,
    'א.': None,
    'ג.': None,
    'יא': None,

    # D&C proper names (variant spellings)
    'קִירְטְלַנְד': 'Kirtland',
    'אַהְמָן': 'Ahman',
    'גְּרֵינְגֶר': 'Granger',
    "רִיצָ'רְדְּס": 'Richards',
    'רוֹבֶּרְט': 'Robert',
    'גַּלַּנְד': 'Galland',
    'שֵׁרְווּד': 'Sherwood',
    'וִילְסוֹן': 'Wilson',
    'וִילְיָמְס': 'Williams',
    'מֶרְדּוֹק': 'Murdock',
    'בּוּת': 'Booth',
    'הֶנְקוֹק': 'Hancock',
    'וּנְיוּאֶל': 'and-Newel',
    'סְטִיבֶן': 'Stephen',
    'גּ׳וֹנְסוֹן': 'Johnson',
    'וּפַרְלִי': 'and-Parley',
    'וֵיקְפִילְד': 'Wakefield',
    'קוֹרִיל': 'Corrill',
    'סְנוֹ': 'Snow',
    'וּפְרֶדְרִיק': 'and-Frederick',
    'וִיטְנֵי': 'Whitney',
    'בְּלוֹגַן': 'in-Logan',
    'טֶנֶר': 'Tanner',
    'סְפֶּנְסֶר': 'Spencer',
    'בְּקוֹלֶסְוִיל': 'in-Colesville',
    'לְסִינְסִינֶּאטִי׃': 'to-Cincinnati',
    'בְּקַרְתֵּג': 'in-Carthage',
    'וַייְט': 'Wight',
    'מִיזוּרִי׃': 'Missouri',

    # NT places/people
    'הָעֶפִּיסְקוֹפּוֹס': 'the-bishop',
    'וְהָעֶפִּיסְקוֹפּוֹס': 'and-the-bishop',
    'לָעֶפִּיסְקוֹפּוֹס': 'to-the-bishop',

    # D&C / Modern Hebrew vocabulary
    'וְיִתְאַרְגְּנוּ': 'and-they-shall-organize',
    'וְהִשְׁתַּמְּשׁוּ': 'and-they-used',
    'לְתַכְלִיּוֹת': 'for-purposes',
    'שֶׁיַּמְתִּינוּ': 'that-they-wait',
    'חוֹבָתָם': 'their-duty',
    'יַמְשִׁיכוּ': 'they-shall-continue',
    'הַמֻּסְמָכִים': 'the-ordained',
    'קְרִיאָתָם׃': 'their-calling',
    'הַמְּהַוִּים': 'the-constituting',
    'כָּל־עִנְיָנֶיהָ': 'all-her-affairs',
    'בְּהַכְרָזַת': 'in-the-proclamation-of',
    'עַצְמָאִית': 'independent',
    'תַּמְשִׁיךְ': 'she-shall-continue',
    'הִתְאַרְגְּנוּ': 'they-organized',
    'בִּגְבוּרָתֶךָ': 'in-your-might',
    'מִתְחַנְּנִים': 'supplicating',
    'קְדוֹשֶׁיךָ': 'your-saints',
    'לְפָנֶיךָ׃': 'before-you',
    'מִשְׂטְמוֹתֵיהֶם': 'their-hatreds',
    'שַׁיֶּכֶת': 'belonging',
    'וְתִתְבָּרֵךְ׃': 'and-you-shall-be-blessed',
    'תַּשְׁמִיעַ': 'you-shall-proclaim',
    'לְכָל־בָּשָׂר׃': 'to-all-flesh',
    'יִצְטָרֵךְ׃': 'he-shall-need',
    'יִתְאַסְּפוּ': 'they-shall-gather',
    'הַסְכָּמַת': 'agreement-of',
    'יִקְרָעוּךָ': 'they-will-tear-you',
    'מֵתֵיכֶם׃': 'your-dead',
    'וְעֻכְּבוּ': 'and-they-were-delayed',
    'הָרוֹאשׁ': 'the-head/chief',
    'וְיַכְנִיעַ': 'and-he-shall-humble',
    'יַסְכִּימוּ': 'they-shall-agree',
    'יוּפַר': 'it-shall-be-broken',
    'נוּשְׁלָם': 'we-were-deprived',
    'נַקְרִיב': 'we-shall-offer',
    'יָסַדְנוּ': 'we-established',
    'וַאֲבָרְכֶנּוּ': 'and-I-blessed-him',
    'בָּעוֹלָמוֹת': 'in-the-worlds',
    'בְּרִדְתְּךָ': 'in-your-descent',
    'יָדוּשׁ': 'he-shall-thresh',
    'יְאַרְגְּנוּ': 'they-shall-organize',
    'וָאֶתְמַהּ': 'and-I-marveled',
    'וּמִתְבּוֹנֵן': 'and-observing',
    'הִתְגַּלְּתָה': 'it-was-revealed',
    'כִּשְׁאָר': 'as-the-rest-of',
    'לְהַשְׁמִידֶךָ': 'to-destroy-you',
    'תִרְגַּמְתָּ': 'you-translated',
    'תִּרְגַּמְתָּ': 'you-translated',
    'תְתַרְגֵּם': 'you-shall-translate',
    'קְהָלִי׃': 'my-congregation',
    'מִשְׂרָתֶךָ': 'your-ministry',
    'יְקַבְּלוּךָ': 'they-shall-receive-you',
    'קְרִיאָתְךָ': 'your-calling',
    'מַסְכִּימִים': 'agreeing',
    'גַשְׁמִית': 'temporal',
    'וְחֻרְבָּנוֹת': 'and-destructions',
    'תְּקַבְּלוּהָ': 'you-shall-receive-it',
    'נוֹדַעַת': 'known',
    'וְהִסְכַּמְתֶּם': 'and-you-agreed',
    'דּוֹרְשִׁים': 'seeking',
    'בִּכְתוּבַי': 'in-my-writings',
    'רְעִידוֹת': 'earthquakes',
    'יְקַבְּלוּהָ': 'they-shall-receive-it',
    'הַנְּתוּנוֹת': 'the-given',
    'הַנְחָיוֹת': 'guidelines',
    'הַקּוֹדֶמֶת': 'the-former',
    'יִצְטָרֵךְ': 'he-shall-need',
    'אֲשַׁלְּמֶנּוּ': 'I-shall-repay-it',
    'סְחוֹרוֹת': 'merchandise',
    'יִצְטָרְכוּ': 'they-shall-need',
    'לְיוֹעֲצָיו': 'to-his-counselors',
    'בִּזְרִיזוּת': 'in-diligence',
    'מִצְווֹתָי׃': 'my-commandments',
    'שֶׁתִּפָּרְדוּ': 'that-you-separate',
    'כּוֹעֵס': 'angry',
    'הַשַּׁקְרָנִים': 'the-liars',
    'וְיַכְרִיז': 'and-he-shall-proclaim',
    'סוֹכְנִים': 'agents',
    'תִּתְגַּלְגֵּל': 'it-shall-roll-forth',
    'מַקְלֵלִין': 'cursing',
    'שֶׁאֲמִתִּיִּים': 'that-are-true',
    'מַלְכִּיצֶדֶק': 'Melchizedek',
    'שֶׁיַּמְשִׁיךְ': 'that-he-continue',
    'בְּפִקְדוֹנוֹ': 'in-his-stewardship',
    'גַּשְׁמִיִּים׃': 'temporal',
    'הִתְגַּלּוּיוֹת': 'revelations',
    'פִּקְדוֹנוֹ': 'his-stewardship',
    'רְשׁוּמִים': 'registered',
    'הַוְּעֵידָה׃': 'the-conference',
    'כְּסוֹכְנִים': 'as-agents',
    'נוֹסֶפֶת': 'additional',
    'מַקְלֶלִין': 'cursing',
    'הַדְּרוֹמִיּוֹת׃': 'the-southern',
    'מִמְּלוֹאוֹ׃': 'from-his-fullness',
    'הָעוֹלָמוֹת': 'the-worlds',
    'יַכְנִיעַ': 'he-shall-humble',
    'קִבְּלוּהָ׃': 'they-received-it',
    'שְׁמֵימִיִּים': 'heavenly',
    'שְׁמֵימִיִּים׃': 'heavenly',
    'הַחוֹטֵאת': 'the-sinful',
    'עוֹשִׂים': 'doing',
    'צְרָכָיו': 'his-needs',
    'הַמְיֻסֶּדֶת': 'the-established',
    'תַּפְקִידֵי': 'roles-of',
    'נְחוּצִים': 'necessary',
    'פְּגִישׁוֹת': 'meetings',
    'שְׁעַת': 'hour-of',
    'הָכוֹנוּ': 'prepare-yourselves',
    'טֶכֶס': 'ceremony',
    'אֲכִילַת': 'eating-of',
    'וּבִנְשֹׁב': 'and-when-blows',
    'יַכְרִיז': 'he-shall-proclaim',
    'נִתְקַבְּלָה': 'it-was-received',
    'כִּסְמָכוּתִית': 'authoritatively',
    'מַנְהִיגֵי': 'leaders-of',
    'אִשְּׁרוּהָ': 'they-approved-it',
    'וְתִתְאַחֲדוּ': 'and-you-shall-unite',
    'בִּפְרִיצוּתְכֶם': 'in-your-licentiousness',
    'וְאֶל־הַפְּנוּיִם': 'and-to-the-unmarried',
    'תִתְרַצֶּה': 'she-shall-be-pleased',
    'וּרְצוֹנָהּ': 'and-her-will',
    'מַה־שֶּׁחָלַק': 'what-he-allotted',
    'מַה־שֶּׁקָּרָא': 'what-he-called',
    'יְבֹאוּם': 'they-shall-come-upon-them',
    'וְהַנֶּהֱנִים': 'and-those-who-enjoy',
    'יַשִּׂיאֶנָּה': 'he-shall-marry-her',
    'הַמַּשִּׂיא': 'the-one-who-marries',
    'אִם־תַּחֲזִיקוּ': 'if-you-hold-fast',
    'מַה־שֶּׁקִּבַּלְתִּי': 'what-I-received',
    'אֲשֶׁר־הֲעִידֹנוּ': 'which-we-testified',
    'כְּשֶׁיִּמְסֹר': 'when-he-delivers',
    'מִסְתַּכְּנִים': 'risking',
    'מַה־שֶּׁתִּזְרַע': 'what-you-sow',
    'וּכְשֶׁתִּזְרַע': 'and-when-you-sow',
    'כִּתְקֹעַ': 'when-blows',
    'עָקְצְךָ': 'your-sting',
    'נִצְחוֹנֵךְ': 'your-victory',
    'הִתְכּוֹנֲנוּ': 'prepare-yourselves',
    'וְהַעְדִּיפוּ': 'and-they-preferred',
    'הִכַּרְנוּ': 'we-recognized',
    'הִכַּרְתִּיו': 'I-recognized-him',
    'הִתְגַּבַּרְתֶּם': 'you-overcame',
    'וְהִתְגַּבַּרְתֶּם': 'and-you-overcame',
    'וְלֹא־נֵבוֹשׁ': 'and-we-shall-not-be-ashamed',
    'נַשְׁקִיט': 'we-shall-silence',
    'נַכִּיר': 'we-shall-recognize',
    'וַנָּעִידָה': 'and-we-testified',
    'תִצְנַעְנָה': 'they(f)-shall-be-modest',
    'וּפְאֵרְכֶן': 'and-your(f)-adornment',
    'וּלְבִישַׁת': 'and-wearing-of',
    'הִתְקַשְּׁטוּ': 'they-adorned-themselves',
    'הֱיִיתֶן': 'you(f)-were',
    'בַּעֲשׂוֹתְכֶן': 'in-your(f)-doing',
    'תִירֶאנָה': 'they(f)-shall-fear',
    'אִם־תְּקַנְאוּ': 'if-you-are-jealous',
    'הַמְנַאֲצִים': 'the-blasphemers',
    'חֶלְאַת': 'filth-of',
    'וְהָרְשֻׁיּוֹת': 'and-the-authorities',
    'לֹא־תָרוּצוּ': 'you-shall-not-run',
    'שְׁטוּפִים': 'flooded',
    'כְּסֹכְנִים': 'as-agents',
    'נַסֹּתְכֶם': 'your-trial',
    'וְתַעַלְצוּ': 'and-you-shall-rejoice',
}

# ============================================================
# RESOLVE
# ============================================================
print("\nResolving Phase 7...")

resolved = {}
skipped = 0

for hebrew, count in still_unknown.items():
    if hebrew in MANUAL:
        val = MANUAL[hebrew]
        if val is not None:
            resolved[hebrew] = val
        else:
            skipped += 1
        continue

    # Try stripping trailing sof-pasuq (׃)
    if hebrew.endswith('׃'):
        base = hebrew[:-1]
        if base in combined:
            resolved[hebrew] = combined[base]
            continue
        if base in MANUAL:
            val = MANUAL[base]
            if val is not None:
                resolved[hebrew] = val
                continue

    # Try stripping trailing period
    if hebrew.endswith('.'):
        base = hebrew[:-1]
        if base in combined:
            resolved[hebrew] = combined[base]
            continue

    # Try stripping trailing ׃ and matching in combined_stripped
    bare = strip_niqqud(hebrew.rstrip('׃.'))
    if bare in combined_stripped:
        resolved[hebrew] = combined_stripped[bare]
        continue

resolved_instances = sum(still_unknown.get(h, 0) for h in resolved)
print(f"  Resolved: {len(resolved):,} words ({resolved_instances:,} instances)")
print(f"  Skipped (garbage): {skipped}")

# ============================================================
# APPLY
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
print(f"PHASE 7 (FINAL) SUMMARY")
print(f"{'='*60}")
print(f"Files modified:      {files_modified}")
print(f"Total fixes:         {total_fixes}")
print(f"Remaining ??? words: {len(remaining_words):,} unique ({remaining:,} instances)")
print(f"\nRemaining by section:")
for section, count in remaining_by_section.items():
    print(f"  {section.upper()}: {count:,}")

# Overall progress
print(f"\n{'='*60}")
print(f"OVERALL PROGRESS (all phases)")
print(f"{'='*60}")
print(f"Started with:     ~8,771 ??? instances")
print(f"Now remaining:    {remaining:,} ??? instances")
print(f"Total resolved:   ~{8771 - remaining:,} instances")
print(f"Resolution rate:  {(8771 - remaining)/8771*100:.1f}%")

# Save
remaining_sorted = dict(sorted(remaining_words.items(), key=lambda x: -x[1]))
with open(os.path.join(BASE, '_still_unknown_final2.json'), 'w', encoding='utf-8') as f:
    json.dump(remaining_sorted, f, ensure_ascii=False, indent=1)

print(f"\nSaved _still_unknown_final2.json ({len(remaining_words):,} entries)")
