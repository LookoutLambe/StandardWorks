#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

BOM_PATHS = [
    Path(__file__).resolve().parent / "bom.html",
    Path(__file__).resolve().parent.parent / "Hebrew BOM" / "BOM.html",
]
NAV = Path(__file__).resolve().parent.parent / "nav_engine.js"
SW = Path(__file__).resolve().parent / "sw.js"


def colophon_panel(panel_id: str, verses_id: str) -> str:
    return (
        f'  <div class="chapter-panel" id="panel-{panel_id}" style="display:none">\n'
        f'    <div class="colophon">\n'
        f'      <div class="colophon-label"></div>\n'
        f'      <div id="{verses_id}"></div>\n'
        f"    </div>\n"
        f"  </div>\n\n"
    )


def patch_one_bom(bom_path: Path) -> None:
    bom = bom_path.read_text(encoding="utf-8")

    old_2n = (
        '  <div class="chapter-panel" id="panel-2n-colophon" style="display:none">\n'
        '    <div class="book-header" style="padding-top:30px">\n'
        '      <div class="book-title">\u05e0\u05b6\u05e4\u05b4\u05d9 \u05d1\u05f3</div>\n'
        '      <motion class="book-subtitle">\u05d3\u05b4\u05bc\u05d1\u05b0\u05e8\u05b5\u05d9 \u05de\u05d5\u05b9\u05ea \u05dc\u05b6\u05d7\u05b4\u05d9 \u05d5\u05b7\u05d9\u05b4\u05bc\u05de\u05b0\u05e8\u05b0\u05d3\u05d5\u05bc \u05d0\u05b2\u05d7\u05b5\u05d9 \u05e0\u05b6\u05e4\u05b4\u05d9 \u05d1\u05bc\u05d5\u05b9</motion>\n'
        "    </div>\n"
        '    <div class="ornament">\u00b7 \u00b7 \u25c6 \u00b7 \u00b7</div>\n'
        '    <div id="2n-colophon-verses"></div>\n'
        "  </div>"
    ).replace("motion", "div")

    new_2n = colophon_panel("2n-colophon", "2n-colophon-verses").rstrip() + "\n"
    if old_2n in bom:
        bom = bom.replace(old_2n, new_2n)
    elif 'id="2n-colophon-verses"' not in bom or 'class="colophon"' not in bom[bom.find("panel-2n-colophon"):bom.find("panel-2n-colophon")+400]:
        raise SystemExit("2n colophon block not found")

    old_jc = (
        '  <motion class="chapter-panel" id="panel-jc-colophon" style="display:none">\n'
        '    <div class="book-header" style="padding-top:30px">\n'
        '      <div class="book-title" style="font-size:2em">\u05d9\u05b7\u05e2\u05b2\u05e7\u05b9\u05d1</div>\n'
        '      <div class="book-subtitle">\u05d0\u05b2\u05d7\u05b4\u05d9 \u05e0\u05b6\u05e4\u05b4\u05d9</div>\n'
        "    </div>\n"
        '    <div class="ornament">\u00b7 \u00b7 \u25c6 \u00b7 \u00b7</div>\n'
        '    <div id="jc-colophon-verses"></div>\n'
        "  </div>"
    ).replace("motion", "div")

    new_jc = colophon_panel("jc-colophon", "jc-colophon-verses").rstrip() + "\n"
    if old_jc in bom:
        bom = bom.replace(old_jc, new_jc)

    for panel_id, verses_id, anchor in [
        ("al-colophon", "al-colophon-verses", '  <div class="chapter-panel" id="panel-al-ch1"'),
        ("he-colophon", "he-colophon-verses", '  <div class="chapter-panel" id="panel-he-ch1"'),
        ("3n-colophon", "3n-colophon-verses", '  <div class="chapter-panel" id="panel-3n-ch1"'),
        ("4n-colophon", "4n-colophon-verses", '  <div class="chapter-panel" id="panel-4n-ch1"'),
        ("et-colophon", "et-colophon-verses", '  <div class="chapter-panel" id="panel-et-ch1"'),
    ]:
        if anchor not in bom:
            raise SystemExit(f"anchor missing: {anchor}")
        bom = bom.replace(anchor, colophon_panel(panel_id, verses_id) + anchor, 1)

    for old, new in [
        ("'ch22',\n  '2n-ch1'", "'ch22',\n  '2n-colophon','2n-ch1'"),
        ("'2n-ch33',\n  'jc-ch1'", "'2n-ch33',\n  'jc-colophon','jc-ch1'"),
        ("'wm-ch1',\n  'mo-ch1'", "'wm-ch1',\n  'mo-ch1'"),  # no-op anchor
        ("'mo-ch29',\n  'al-ch1'", "'mo-ch29',\n  'al-colophon','al-ch1'"),
        ("'al-ch63',\n  'he-ch1'", "'al-ch63',\n  'he-colophon','he-ch1'"),
        ("'he-ch16',\n  '3n-ch1'", "'he-ch16',\n  '3n-colophon','3n-ch1'"),
        ("'3n-ch30',\n  '4n-ch1'", "'3n-ch30',\n  '4n-colophon','4n-ch1'"),
        ("'mm-ch9',\n  'et-ch1'", "'mm-ch9',\n  'et-colophon','et-ch1'"),
    ]:
        if old in bom:
            bom = bom.replace(old, new, 1)

    gbc_old = """function getBookChapter(chId) {
  var bookMap = {
    'ch': '1 Nephi', '2n-ch': '2 Nephi', 'jc-ch': 'Jacob',
"""
    gbc_new = """function getBookChapter(chId) {
  var colophonMap = {
    '2n-colophon': { book: '2 Nephi', chapter: 0 },
    'jc-colophon': { book: 'Jacob', chapter: 0 },
    'al-colophon': { book: 'Alma', chapter: 0 },
    'he-colophon': { book: 'Helaman', chapter: 0 },
    '3n-colophon': { book: '3 Nephi', chapter: 0 },
    '4n-colophon': { book: '4 Nephi', chapter: 0 },
    'et-colophon': { book: 'Ether', chapter: 0 }
  };
  if (colophonMap[chId]) return colophonMap[chId];
  var bookMap = {
    'ch': '1 Nephi', '2n-ch': '2 Nephi', '2n-colophon': '2 Nephi',
    'jc-ch': 'Jacob', 'jc-colophon': 'Jacob',
"""
    if gbc_old in bom and "colophonMap" not in bom:
        bom = bom.replace(gbc_old, gbc_new, 1)
    bom = bom.replace(
        "'al-ch': 'Alma',\n    'he-ch': 'Helaman',",
        "'al-ch': 'Alma', 'al-colophon': 'Alma',\n    'he-ch': 'Helaman', 'he-colophon': 'Helaman',",
        1,
    )
    bom = bom.replace(
        "'3n-ch': '3 Nephi', '4n-ch': '4 Nephi',",
        "'3n-ch': '3 Nephi', '3n-colophon': '3 Nephi',\n    '4n-ch': '4 Nephi', '4n-colophon': '4 Nephi',",
        1,
    )
    bom = bom.replace(
        "'et-ch': 'Ether', 'mr-ch': 'Moroni'",
        "'et-ch': 'Ether', 'et-colophon': 'Ether', 'mr-ch': 'Moroni'",
        1,
    )

    if "book_colophons.js" not in bom:
        for script_old in (
            '<script src="verses/1nephi.js?v=6"></script>\n<script src="verses/2nephi.js"></script>',
            '<script src="verses/1nephi.js"></script>\n<script src="verses/2nephi.js"></script>',
        ):
            if script_old in bom:
                bom = bom.replace(
                    script_old,
                    script_old.replace(
                        '</script>\n<script src="verses/2nephi.js">',
                        '</script>\n<script src="verses/book_colophons.js?v=1"></script>\n<script src="verses/2nephi.js">',
                    ),
                    1,
                )
                break
        else:
            raise SystemExit("script include anchor not found in " + str(bom_path))

    bom_path.write_text(bom, encoding="utf-8")
    print(bom_path.name, "OK")


def main() -> None:
    for bom_path in BOM_PATHS:
        if not bom_path.exists():
            print("skip missing", bom_path)
            continue
        patch_one_bom(bom_path)

    nav = NAV.read_text(encoding="utf-8")
    for bid, cid in [
        ("2ne", "2n-colophon"),
        ("jac", "jc-colophon"),
        ("alm", "al-colophon"),
        ("hel", "he-colophon"),
        ("3ne", "3n-colophon"),
        ("4ne", "4n-colophon"),
        ("eth", "et-colophon"),
    ]:
        pat = re.compile(
            rf"(\{{ id:'{bid}', en:'[^']+', heb:[^,]+, ch:\d+, prefix:'[^']+')(\s*\}})",
        )
        m = pat.search(nav)
        if not m:
            raise SystemExit(f"nav book not found: {bid}")
        if "colophonId" not in m.group(0):
            nav = nav[: m.start()] + m.group(1) + f", colophonId:'{cid}'" + m.group(2) + nav[m.end() :]

    grid_old = """          for (var c = 1; c <= book.ch; c++) {
            var cell = document.createElement('div');
            cell.className = 'nav-ch-cell';
            var chId = book.prefix + c;
"""
    grid_new = """          if (book.colophonId) {
            var colCell = document.createElement('motion');
            colCell.className = 'nav-ch-cell nav-colophon-cell';
            var colId = book.colophonId;
            if (volKey === _config.volume && colId === _config.currentChapter) colCell.classList.add('current');
            colCell.innerHTML = '<span class="ch-heb">פתיח</span><span class="ch-num">◆</span>';
            colCell.onclick = (function(vid, cid, b) { return function(e) { e.stopPropagation(); navigateToChapter(vid, cid, b); }; })(volKey, colId, book);
            grid.appendChild(colCell);
          }
          for (var c = 1; c <= book.ch; c++) {
            var cell = document.createElement('div');
            cell.className = 'nav-ch-cell';
            var chId = book.prefix + c;
""".replace("motion", "motion").replace("motion", "motion")
    grid_new = grid_new.replace("motion", "div")
    if grid_old not in nav:
        raise SystemExit("nav grid loop not found")
    nav = nav.replace(grid_old, grid_new, 1)

    auto_old = "        if (_config.currentChapter.indexOf(books[b].prefix) === 0) {"
    auto_new = (
        "        if ((books[b].colophonId && _config.currentChapter === books[b].colophonId) ||\n"
        "            _config.currentChapter.indexOf(books[b].prefix) === 0) {"
    )
    nav = nav.replace(auto_old, auto_new, 1)

    hash_old = """      for (var prefix in bomHashes) {
        if (chapterId.indexOf(prefix) === 0) {
          var num = chapterId.replace(prefix, '');
          return bomHashes[prefix] + num;
        }
      }
"""
    hash_new = """      if (chapterId.indexOf('-colophon') > 0) return chapterId;
      for (var prefix in bomHashes) {
        if (chapterId.indexOf(prefix) === 0) {
          var num = chapterId.replace(prefix, '');
          return bomHashes[prefix] + num;
        }
      }
"""
    nav = nav.replace(hash_old, hash_new, 1)

    nav = nav.replace(
        "'bom/verses/1nephi.js','bom/verses/2nephi.js'",
        "'bom/verses/1nephi.js','bom/verses/book_colophons.js','bom/verses/2nephi.js'",
        1,
    )

    NAV.write_text(nav, encoding="utf-8")
    print("nav_engine.js OK")

    sw = SW.read_text(encoding="utf-8")
    if "bom-v22" not in sw:
        sw = re.sub(r"const CACHE = 'bom-v\d+';", "const CACHE = 'bom-v22';", sw, count=1)
    if "book_colophons" not in sw:
        sw = sw.replace(
            "'./verses/1nephi.js?v=6',\n  './verses/2nephi.js',",
            "'./verses/1nephi.js?v=6',\n  './verses/book_colophons.js?v=1',\n  './verses/2nephi.js',",
            1,
        )
    SW.write_text(sw, encoding="utf-8")
    print("sw.js OK")


if __name__ == "__main__":
    main()
