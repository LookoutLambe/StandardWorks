#!/usr/bin/env python3
"""
Extract Hebrew verse text from D&C and PGP interlinear JS files,
producing JSON in the same format as bom/official_verses.js.
"""

import json
import re
import os
import sys

BASE = 'C:/Users/chris/Desktop/Standard Works Project'


def parse_verse_arrays(js_text):
    """Parse all verse arrays from a JS file, returning list of (var_name, verses)."""
    results = []
    # Find all var declarations with verse arrays
    pattern = r'var\s+(\w+)\s*=\s*\[(.*?)\];\s*(?:renderVerseSet|$|\})'
    for m in re.finditer(pattern, js_text, re.DOTALL):
        var_name = m.group(1)
        array_text = m.group(2)

        # Skip non-verse arrays (like chronData)
        if 'words' not in array_text:
            continue

        verses = []
        # Find each verse object
        verse_pattern = r'\{\s*num:\s*"([^"]*)",\s*words:\s*\[(.*?)\]\s*\}'
        for vm in re.finditer(verse_pattern, array_text, re.DOTALL):
            heb_num = vm.group(1)
            words_text = vm.group(2)

            # Extract Hebrew words (first element of each pair)
            word_pairs = re.findall(r'\["([^"]*)",\s*"[^"]*"\]', words_text)
            # Filter out empty strings and the sof-pasuk marker
            heb_words = [w for w in word_pairs if w and w != '׃']
            hebrew = ' '.join(heb_words) + '׃' if heb_words else ''

            verses.append({
                'heb_num': heb_num,
                'hebrew': hebrew
            })

        results.append((var_name, verses))
    return results


def heb_num_to_int(h):
    """Convert Hebrew numeral to integer (basic)."""
    mapping = {
        'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
        'י': 10, 'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16,
        'יז': 17, 'יח': 18, 'יט': 19,
        'כ': 20, 'כא': 21, 'כב': 22, 'כג': 23, 'כד': 24, 'כה': 25, 'כו': 26,
        'כז': 27, 'כח': 28, 'כט': 29,
        'ל': 30, 'לא': 31, 'לב': 32, 'לג': 33, 'לד': 34, 'לה': 35, 'לו': 36,
        'לז': 37, 'לח': 38, 'לט': 39,
        'מ': 40, 'מא': 41, 'מב': 42, 'מג': 43, 'מד': 44, 'מה': 45, 'מו': 46,
        'מז': 47, 'מח': 48, 'מט': 49,
        'נ': 50, 'נא': 51, 'נב': 52, 'נג': 53, 'נד': 54, 'נה': 55, 'נו': 56,
        'נז': 57, 'נח': 58, 'נט': 59,
        'ס': 60, 'סא': 61, 'סב': 62, 'סג': 63, 'סד': 64, 'סה': 65, 'סו': 66,
        'סז': 67, 'סח': 68, 'סט': 69,
        'ע': 70, 'עא': 71, 'עב': 72, 'עג': 73, 'עד': 74, 'עה': 75, 'עו': 76,
        'עז': 77, 'עח': 78, 'עט': 79,
        'פ': 80, 'פא': 81, 'פב': 82, 'פג': 83, 'פד': 84, 'פה': 85, 'פו': 86,
        'פז': 87, 'פח': 88, 'פט': 89,
        'צ': 90, 'צא': 91, 'צב': 92, 'צג': 93, 'צד': 94, 'צה': 95, 'צו': 96,
        'צז': 97, 'צח': 98, 'צט': 99,
        'ק': 100,
    }
    if h in mapping:
        return mapping[h]
    # For larger numbers, just use sequential numbering
    return None


def build_dc_verses():
    """Build D&C verse data from dc_verses/*.js files."""
    dc_dir = f'{BASE}/dc_verses'
    all_verses = []

    # 1. Introduction
    with open(f'{dc_dir}/dc_intro.js', 'r', encoding='utf-8') as f:
        js = f.read()
    for var_name, verses in parse_verse_arrays(js):
        for i, v in enumerate(verses):
            all_verses.append({
                'book': 'D&C Intro',
                'chapter': 0,
                'verse': i + 1,
                'hebrew': v['hebrew']
            })

    # 2. Sections 1-138
    section_files = [
        'dc1_10.js', 'dc11_20.js', 'dc21_30.js', 'dc31_40.js',
        'dc41_50.js', 'dc51_60.js', 'dc61_70.js', 'dc71_80.js',
        'dc81_90.js', 'dc91_100.js', 'dc101_110.js', 'dc109.js',
        'dc111_120.js', 'dc121_130.js', 'dc131_138.js'
    ]

    # Track which sections we've seen to avoid duplicates (dc109.js is separate)
    seen_sections = set()

    for fname in section_files:
        fpath = f'{dc_dir}/{fname}'
        if not os.path.exists(fpath):
            print(f'WARNING: {fpath} not found')
            continue
        with open(fpath, 'r', encoding='utf-8') as f:
            js = f.read()

        for var_name, verses in parse_verse_arrays(js):
            # Extract section number from var name: dc1_ch1Verses -> 1
            m = re.match(r'dc(\d+)_ch\d+Verses', var_name)
            if not m:
                continue
            section = int(m.group(1))
            if section in seen_sections:
                continue
            seen_sections.add(section)

            for i, v in enumerate(verses):
                all_verses.append({
                    'book': 'D&C',
                    'chapter': section,
                    'verse': i + 1,
                    'hebrew': v['hebrew']
                })

    # Sort D&C sections properly
    dc_intro = [v for v in all_verses if v['book'] == 'D&C Intro']
    dc_sections = sorted(
        [v for v in all_verses if v['book'] == 'D&C'],
        key=lambda x: (x['chapter'], x['verse'])
    )

    # 3. Official Declarations
    od_verses = []
    with open(f'{dc_dir}/od.js', 'r', encoding='utf-8') as f:
        js = f.read()
    for var_name, verses in parse_verse_arrays(js):
        if 'od1' in var_name:
            for i, v in enumerate(verses):
                od_verses.append({
                    'book': 'OD 1',
                    'chapter': 1,
                    'verse': i + 1,
                    'hebrew': v['hebrew']
                })
        elif 'od2' in var_name:
            for i, v in enumerate(verses):
                od_verses.append({
                    'book': 'OD 2',
                    'chapter': 1,
                    'verse': i + 1,
                    'hebrew': v['hebrew']
                })

    # 4. Chronological data
    chron_data = []
    with open(f'{dc_dir}/dc_chron.js', 'r', encoding='utf-8') as f:
        js = f.read()
    chron_match = re.search(r'var\s+chronData\s*=\s*\[(.*?)\];', js, re.DOTALL)
    if chron_match:
        rows = re.findall(r'\["([^"]*)",\s*"([^"]*)",\s*"([^"]*)"\]', chron_match.group(1))
        chron_data = [{'date': r[0], 'place': r[1], 'sections': r[2]} for r in rows]

    result = dc_intro + dc_sections + od_verses
    return result, chron_data


def build_pgp_verses():
    """Build PGP verse data from pgp_verses/*.js files."""
    pgp_dir = f'{BASE}/pgp_verses'
    all_verses = []

    # Introduction
    with open(f'{pgp_dir}/pgp_intro.js', 'r', encoding='utf-8') as f:
        js = f.read()
    for var_name, verses in parse_verse_arrays(js):
        for i, v in enumerate(verses):
            all_verses.append({
                'book': 'PGP Intro',
                'chapter': 0,
                'verse': i + 1,
                'hebrew': v['hebrew']
            })

    # Moses (8 chapters)
    book_files = {
        'Moses': ('moses.js', 'ms'),
        'Abraham': ('abraham.js', 'ab'),
        'JS-Matthew': ('js_matthew.js', 'jsm'),
        'JS-History': ('js_history.js', 'jsh'),
        'Articles of Faith': ('articles_of_faith.js', 'aof'),
    }

    for book_name, (fname, prefix) in book_files.items():
        fpath = f'{pgp_dir}/{fname}'
        with open(fpath, 'r', encoding='utf-8') as f:
            js = f.read()

        for var_name, verses in parse_verse_arrays(js):
            # Extract chapter from var name: ms_ch1Verses -> 1
            m = re.match(rf'{prefix}_ch(\d+)Verses', var_name)
            if not m:
                continue
            chapter = int(m.group(1))

            for i, v in enumerate(verses):
                all_verses.append({
                    'book': book_name,
                    'chapter': chapter,
                    'verse': i + 1,
                    'hebrew': v['hebrew']
                })

    return all_verses


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')

    dc_verses, chron_data = build_dc_verses()
    pgp_verses = build_pgp_verses()

    # Save DC verses
    with open(f'{BASE}/dc_official_verses.json', 'w', encoding='utf-8') as f:
        json.dump(dc_verses, f, ensure_ascii=False, indent=1)
    print(f'D&C: {len(dc_verses)} verses')

    # Save DC chronology
    with open(f'{BASE}/dc_chronology.json', 'w', encoding='utf-8') as f:
        json.dump(chron_data, f, ensure_ascii=False, indent=1)
    print(f'D&C Chronology: {len(chron_data)} entries')

    # Save PGP verses
    with open(f'{BASE}/pgp_official_verses.json', 'w', encoding='utf-8') as f:
        json.dump(pgp_verses, f, ensure_ascii=False, indent=1)
    print(f'PGP: {len(pgp_verses)} verses')

    # Summary by book
    books = {}
    for v in dc_verses:
        b = v['book']
        if b not in books:
            books[b] = 0
        books[b] += 1
    print('\nD&C breakdown:')
    for b, c in books.items():
        print(f'  {b}: {c} verses')

    books = {}
    for v in pgp_verses:
        b = v['book']
        if b not in books:
            books[b] = 0
        books[b] += 1
    print('\nPGP breakdown:')
    for b, c in books.items():
        print(f'  {b}: {c} verses')
