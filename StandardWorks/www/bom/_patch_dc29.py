# -*- coding: utf-8 -*-
"""Patch D&C 29 only in dc_verses/dc21_30.js"""
from pathlib import Path
import re
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "dc_verses" / "dc21_30.js"

def w(he, en):
    return f'["{he}","{en}"]'

def verse(num, pairs):
    words = ",".join(w(h, e) for h, e in pairs)
    return f'  {{ num: "{num}", words: [\n    {words},["׃",""]\n  ]}},'

def section(var_name, verses):
    lines = [f"var {var_name} = ["]
    for num, pairs in verses:
        lines.append(verse(num, pairs))
    lines.append("];")
    return "\n".join(lines)

def patch(var_name, verses, text):
    new_block = section(var_name, verses)
    pattern = rf"var {var_name} = \[.*?\];\nrenderVerseSet\({var_name}"
    repl = new_block + f"\nrenderVerseSet({var_name}"
    new_text, n = re.subn(pattern, repl, text, count=1, flags=re.DOTALL)
    if n != 1:
        raise SystemExit(f"Failed to patch {var_name}: {n} matches")
    return new_text

def load_data():
    p = Path(__file__).parent / "_dc29_data.py"
    spec = importlib.util.spec_from_file_location("dc29data", p)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.dc29_ch1Verses

def main():
    text = TARGET.read_text(encoding="utf-8")
    text = patch("dc29_ch1Verses", load_data(), text)
    TARGET.write_text(text, encoding="utf-8")
    print("Patched D&C 29 in", TARGET)

if __name__ == "__main__":
    main()
