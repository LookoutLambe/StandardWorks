#!/usr/bin/env python3
"""Build colophon word arrays for BOM PWA from Hebrew text + verse-file gloss index."""
from __future__ import annotations

import re
from pathlib import Path

VERSES = Path(__file__).resolve().parent / "verses"

# Plate colophons (user / standard superscriptions) — tokenized on whitespace
COLOPHON_HEB = {
    "2n": (
        "זִכָּרוֹן לְמוֹת לֶחִי וַיִּפְשְׁעוּ אֲחֵי נֶפִי בּוֹ "
        "וַיַּזְהֵר יְהוָה אֶת־נֶפִי לָצֵאת אֶל־הַמִּדְבָּר "
        "וּמַסָּעָיו בַּמִּדְבָּר וְהָלְאָה"
    ),
    "jc": (
        "דְּבָרָיו אֲשֶׁר דִּבֵּר אֶל־עַם נֶפִי בּוֹ הִשְׁבִּית מַחֲלֹקֶת "
        "לְמַעַן יִוָּדַע מָשִׁיחַ אֲשֶׁר הוּא הַמֶּלֶךְ קְדוֹשׁ יִשְׂרָאֵל "
        "לָכֵן הֶעֱלָה דִּמְיוֹן עֵץ הַזַּיִת הַתַּרְבּוּתִי וְהַיַּעַר "
        "וַיַּזְכִּיר אֶת־הַמִּצְוֹת אֲשֶׁר צִוָּהוּ נֶפִי אָחִיו"
    ),
    "al": (
        "זִכָּרוֹן לְאַלְמָא אֲשֶׁר הָיָה לְבֶן־אַלְמָא הַכֹּהֵן הַגָּדוֹל הָרִאשׁוֹן "
        "עַל־עֲדַת הָאֵל וְזִכָּרוֹן לְמַלְכוּת הַשֹּׁפְטִים וְלַמִּלְחָמוֹת "
        "וְלַמַּחֲלֹקֶת בִּימֵי הָעָם עַל־פִּי זִכָּרוֹן אַלְמָא "
        "הַכֹּהֵן הַגָּדוֹל הָרִאשׁוֹן עַל־עֲדַת הָאֵל"
    ),
    "he": (
        "זִכָּרוֹן לִבְנֵי הֵילָמָן עַל־פִּי זִכָּרוֹנָם וְעַל־פִּי זִכָּרוֹן עַמָּם "
        "וּבוֹ נִכְלָל זִכָּרוֹן לְמִלְחֲמוֹתָם וּלְמַחֲלֹקֹתָם וּלְמַחֲלֹקֶת עַמָּם "
        "וְזִכָּרוֹן לִנְבוּאוֹתֵיהֶם שֶׁל־רַבִּים מִנְּבִיאִים קְדוֹשִׁים טֶרֶם בּוֹא הַמָּשִׁיחַ "
        "עַל־פִּי הָאִגְּרוֹת אֲשֶׁר נִכְתְּבוּ בִידֵי בְנֵי הֵילָמָן עַד־בּוֹא הַמָּשִׁיחַ "
        "וְכֵן יִקָּרֵא אֶת־מַרְבִּית סֵפֶר הֵילָמָן עַל־פִּי זִכָּרוֹן בְּנֵי הֵילָמָן"
    ),
    "3n": (
        "וְהֵילָמָן הָיָה לְבֶן־הֵילָמָן בֶּן־אַלְמָא בֶּן־אַלְמָא אֲשֶׁר יָצָא מִזֶּרַע נֶפִי "
        "הוּא הָיָה לְבֶן־לֶחִי אֲשֶׁר יָצָא מִיְּרוּשָׁלַיִם "
        "בִּשְׁנַת אַחַת לְמַלְכוּת צִדְקִיָּהוּ מֶלֶךְ יְהוּדָה"
    ),
    "4n": "זִכָּרוֹן לְעַם נֶפִי עַל־פִּי זִכָּרוֹנוֹ",
    "et": (
        "זִכָּרוֹן לִבְנֵי יָרֶד אֲשֶׁר נָסְעוּ מִן־הַמִּגְדָּל "
        "בָּעֵת אֲשֶׁר־בָּלַל יְהוָה אֶת־שְׂפַת הָעָם וְהֵפִיצָם בְּכָל־פְּנֵי הָאֲדָמָה "
        "עַל־פִּי זִכָּרוֹן מוֹרוֹנִי אֲשֶׁר לָקַח אֶת־זִכָּרוֹנוֹ מֵעֶשְׂרִים וְאַרְבָּעָה הַלּוּחוֹת "
        "אֲשֶׁר מָצְאוּ עַם לִמְחִי הַנִּקְרָאִים לוּחוֹת אֶתֶר"
    ),
}

PAIR_RE = re.compile(r'\[\s*"((?:\\.|[^"\\])*)"\s*,\s*"((?:\\.|[^"\\])*)"\s*\]')


def load_gloss_index() -> dict[str, str]:
    idx: dict[str, str] = {}
    for path in VERSES.glob("*.js"):
        text = path.read_text(encoding="utf-8")
        for heb, gl in PAIR_RE.findall(text):
            heb = heb.replace('\\"', '"')
            gl = gl.replace('\\"', '"')
            if heb and heb != "׃" and heb not in idx:
                idx[heb] = gl
    return idx


def tokenize(line: str) -> list[str]:
    return [t for t in line.split() if t]


def words_array(prefix: str, heb_line: str, gloss: dict[str, str]) -> str:
    tokens = tokenize(heb_line)
    pairs = []
    missing = []
    for t in tokens:
        g = gloss.get(t)
        if g is None:
            missing.append(t)
            g = t  # fallback — visible in UI for manual fix
        pairs.append((t, g))
    pairs.append(("׃", ""))
    var = f"{prefix}_colophonVerses"
    lines = [f"var {var} = [", '  { num:"", words:[']
    for heb, gl in pairs:
        heb_esc = heb.replace("\\", "\\\\").replace('"', '\\"')
        gl_esc = gl.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'    ["{heb_esc}","{gl_esc}"],')
    lines.append("  ]}")
    lines.append("];")
    if missing:
        print(f"  [{prefix}] missing glosses: {len(missing)}")
    return "\n".join(lines)


def main() -> None:
    gloss = load_gloss_index()
    print(f"Gloss index: {len(gloss)} Hebrew forms")
    out = VERSES / "_colophon_generated.txt"
    chunks = []
    for key, text in COLOPHON_HEB.items():
        chunks.append(f"// === {key} ===\n" + words_array(key, text, gloss))
    out.write_text("\n\n".join(chunks), encoding="utf-8")
    print("Wrote", out)


if __name__ == "__main__":
    main()
