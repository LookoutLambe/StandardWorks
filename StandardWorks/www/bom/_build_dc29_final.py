# -*- coding: utf-8 -*-
"""Build bom/_dc29_data.py — Hebrew from _dc26_30_data, English glosses aligned to word count."""
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(__file__).parent / "_dc26_30_data.py"
OUT = Path(__file__).parent / "_dc29_data.py"

HE_FIX = {
    9: [(7, "הָאָרֶץ"), (8, "בָּשְׁלָה")],
    12: [(0, "וְעוֹד"), (17, "עָשָׂר")],
    22: [(6, "כְּתֹם"), (7, "אֶלֶף"), (8, "שָׁנִים")],
}
# Replace entire Hebrew token list for verses with bad source tokenization
HE_VERSE = {
    3: [
        "הִנֵּה", "אָמֵן", "אָמֵן", "אֲנִי", "אֹמֵר", "לָכֶם", "כִּי", "בָּעֵת", "הַזֹּאת",
        "נִסְלְחוּ", "לָכֶם", "חַטֹּאתֵיכֶם", "לָכֵן", "תְּקַבְּלוּ", "אֶת־הַדְּבָרִים", "הָאֵלֶּה",
        "אַךְ", "זִכְרוּ", "לְבִלְתִּי", "חֲטֹא", "עוֹד", "פֶּן", "יָבֹאוּ", "עֲלֵיכֶם",
    ],
}

# Full-verse gloss overrides (pipe-separated); preferred over auto-split.
G_OVERRIDE = {
1: "Listen|to the voice of|Jesus|Christ|your Redeemer|the Great|I AM|whose|arm of|mercy|hath atoned|for|your sins",
2: "Who|will gather|his people|even as a hen|gathereth her chickens|under|her wings|even as many as|will|hearken|to my voice|and humble themselves|before me|and call|upon me|in mighty|prayer",
3: "Behold|verily|verily|I|say|unto|you|that|at|this time|your sins|are forgiven|you|therefore|ye receive|these things|but remember|to sin|no|more|lest perils|shall|come upon|you",
4: "Verily|I|say|unto you|that|ye are chosen|out of|the world|to declare|my gospel|with the sound of|rejoicing|as with the voice of|a trump",
5: "Lift up|your hearts|and be glad|for|I am|in your midst|and am|your advocate|with|the|Father|and it is his|good will|to give|you|the kingdom",
6: "And|as it is written|Whatsoever|ye shall ask|in faith|being united|in prayer|according to my command|ye shall receive",
7: "And ye are called|to bring to pass|the gathering|of mine elect|for|mine elect|hear|my voice|and harden|not|their hearts",
8: "Wherefore|the decree hath gone forth|from|the|Father|that|they shall be gathered|in unto|one place|upon|the face of|this|land|to prepare|their hearts|and be prepared|in|all things|against|the day when|tribulation and|desolation|are sent forth|upon|the wicked",
9: "For|the hour|is nigh|and the day|soon at hand|when|the earth|is ripe|and all|the proud|and they that do|wickedly|shall be|as stubble|and I will burn them up|saith|the Lord|of Hosts|that|wickedness|shall not be|upon|the earth",
10: "For|the hour|is nigh|and that which|was spoken|by mine apostles|must be fulfilled|for|as|they spoke|so|shall it come to pass",
11: "For|I will reveal|myself from|heaven|with power|and great|glory|with|all|the hosts thereof|and dwell|in righteousness|with|men|on|earth|a thousand|years|and the wicked|shall|not stand",
12: "And again|verily|verily|I|say|unto you|and it hath gone forth|in a firm decree|by the will of|the Father|that|mine apostles|the Twelve|which were|with me|in my ministry|at Jerusalem|shall stand|at|my right hand|at the day of|my coming|in a pillar of|fire|being clothed with|robes of|righteousness|with crowns|upon|their heads|in glory|even as I am|to judge|the whole|house of|Israel|even as many as|have|loved|me|and kept|my commandments|and none|else",
13: "For|a trump|shall sound|both long|and loud|even as upon|Mount|Sinai|and all|the earth|shall quake|and they shall come forth|yea even|the dead|which|died|in me|to receive|a crown of|righteousness|and to be clothed upon|even as I am|to be|with me|that|we may be|one",
14: "But behold|I|say|unto you|that|before|this great|day|shall come|the sun|shall be darkened|and the moon|shall be turned|into blood|and the stars|shall fall|from|heaven|and there shall be|greater|signs in|heaven|above|and in|the earth|beneath",
15: "And there shall be|weeping|and wailing|among the hosts of|men",
16: "And there shall be|a great|hailstorm sent forth|to destroy|the crops of|the earth",
17: "And it shall come to pass|because of|the wickedness|of the world|that I will|take vengeance|upon|the wicked|for|they will|not repent|for|the cup of|mine indignation|is full|for behold|my blood|shall not cleanse them|if they|hear me|not",
20: "And it shall come to pass|that the beasts|of the forest|and the fowls|of the air|shall devour them up",
25: "And not|one hair|neither mote|shall be lost|for|it is|the workmanship|of mine|hand",
27: "And the righteous|shall be gathered|on my right hand|unto|eternal life|and the wicked|on my left hand|will I be ashamed|to own|before|the Father",
28: "Wherefore|I will say|unto them|Depart from|me|ye cursed|into|everlasting fire|prepared for|the devil|and his angels",
30: "But remember|that|all my judgments|are not|given unto|men|and as|the words have gone forth|out of|my mouth|even so|shall they be fulfilled|that|the first|shall be|last|and that|the last|shall be|first|in all things|whatsoever I|have created|by the word|of my|power|which is|the power|of my Spirit",
31: "For|by the power|of my Spirit|created I|them|yea|all things|both|spiritual|and temporal",
32: "First|spiritual|secondly|temporal|which is|the beginning|of my work|and again|first|temporal|and secondly|spiritual|which is|the last|of my work",
37: "And they were|thrust down|and thus came|the devil|and his angels",
38: "And behold|there is|a place|prepared for|them|from the beginning|which place|is hell",
48: "For it is|given unto|them|even as|I will|according to|mine own pleasure|that great|things may|be required|at the hand|of their fathers",
49: "And again|I|say|unto you|that|whoso having|knowledge|have I|not|commanded|to repent",
}


def load_en():
    t = (ROOT / "dc_english.js").read_text(encoding="utf-8")
    m = re.search(r"window\._dcEnglishData\s*=\s*(\[.*\])\s*;?\s*$", t, re.S)
    data = json.loads(m.group(1))
    return {x["verse"]: x["english"] for x in data if x["chapter"] == 29}


def split_en(text, n):
    text = re.sub(r"[—–]", " ", text)
    words = re.findall(r"[A-Za-z':]+", text)
    if len(words) < n:
        words = words + [""] * (n - len(words))
    chunks = []
    base, extra = divmod(len(words), n)
    i = 0
    for k in range(n):
        size = base + (1 if k < extra else 0)
        chunks.append(" ".join(words[i : i + size]))
        i += size
    return chunks


def load_src():
    spec = importlib.util.spec_from_file_location("src", SRC)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.dc29_ch1Verses


def gloss_for_verse(vnum, n, en_text):
    if vnum in G_OVERRIDE:
        g = G_OVERRIDE[vnum].split("|")
        if len(g) != n:
            raise ValueError(f"override v{vnum}: {len(g)} != {n}")
        return g
    return split_en(en_text, n)


def main():
    src = load_src()
    en = load_en()
    lines = ['# -*- coding: utf-8 -*-', '"""D&C 29 Hebrew/English word pairs."""', "", "dc29_ch1Verses = ["]
    for vnum, (num, pairs) in enumerate(src, 1):
        if vnum in HE_VERSE:
            he_list = list(HE_VERSE[vnum])
        else:
            he_list = [re.sub(r"׃$", "", h) for h, _ in pairs]
            if vnum in HE_FIX:
                for idx, new_h in HE_FIX[vnum]:
                    he_list[idx] = new_h
        glosses = gloss_for_verse(vnum, len(he_list), en[vnum])
        lines.append(f'("{num}", [')
        for h, e in zip(he_list, glosses):
            lines.append(f'    ("{h}","{e}"),')
        lines.append("]),")
    lines.append("]")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
