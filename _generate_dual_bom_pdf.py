#!/usr/bin/env python3
"""
Generate a Dual Hebrew-English Book of Mormon PDF — KDP-ready.
- 6x9 inch trim
- Right column: Hebrew (RTL, David font)
- Left column: English (LTR, Times-Roman)
- Artscroll-style dual headers
- Hebrew page numbers far right, English far left
- Center divider line
- Chapter headings in both languages
"""

import json
import re
import os
from bidi.algorithm import get_display
from reportlab.lib.units import inch
from reportlab.lib.colors import black, HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

pdfmetrics.registerFont(TTFont('David', 'C:/Windows/Fonts/david.ttf'))
pdfmetrics.registerFont(TTFont('David-Bold', 'C:/Windows/Fonts/davidbd.ttf'))

BASE = 'C:/Users/chris/Desktop/Standard Works Project'


def bidi(text):
    return get_display(text)


# ── Hebrew numerals ──
H_ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
H_TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
H_HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת']

def int_to_heb(n):
    if n <= 0: return str(n)
    if n >= 1000:
        return H_ONES[n // 1000] + "׳" + (int_to_heb(n % 1000) if n % 1000 else '')
    r = ''
    h = n // 100
    while h > 0:
        if h <= 4:
            r += H_HUNDREDS[h]
            h = 0
        else:
            r += 'ת'
            h -= 4
    n %= 100
    if n == 15: return r + 'טו'
    if n == 16: return r + 'טז'
    t = n // 10
    if t > 0: r += H_TENS[t]; n %= 10
    if n > 0: r += H_ONES[n]
    return r


BOOK_HEB = {
    '1 Nephi': 'נֶפִי א', '2 Nephi': 'נֶפִי ב', 'Jacob': 'יַעֲקֹב',
    'Enos': 'אֵנוֹשׁ', 'Jarom': 'יָרוֹם', 'Omni': 'אָמְנִי',
    'Words of Mormon': 'דִּבְרֵי מוֹרְמוֹן', 'Mosiah': 'מוֹשִׁיָּה',
    'Alma': 'אַלְמָא', 'Helaman': 'הֵילָמָן', '3 Nephi': 'נֶפִי ג',
    '4 Nephi': 'נֶפִי ד', 'Mormon': 'מוֹרְמוֹן', 'Ether': 'אֶתֶר',
    'Moroni': 'מוֹרוֹנִי',
}


def load_verses():
    with open(f'{BASE}/bom/official_verses.js', 'r', encoding='utf-8') as f:
        text = f.read()
    return json.loads(re.search(r'=\s*(\[.*\])', text, re.DOTALL).group(1))

def load_headings_heb():
    with open(f'{BASE}/bom/chapter_headings_heb.js', 'r', encoding='utf-8') as f:
        text = f.read()
    return json.loads(re.search(r'=\s*(\{.*\})', text, re.DOTALL).group(1))

def load_headings_en():
    with open(f'{BASE}/bom/chapter_headings.js', 'r', encoding='utf-8') as f:
        text = f.read()
    return json.loads(re.search(r'=\s*(\{.*\})', text, re.DOTALL).group(1))

BOOK_FILES = {
    '1 Nephi': '1nephi', '2 Nephi': '2nephi', 'Jacob': 'jacob',
    'Enos': 'enos', 'Jarom': 'jarom', 'Omni': 'omni',
    'Words of Mormon': 'words_of_mormon', 'Mosiah': 'mosiah',
    'Alma': 'alma', 'Helaman': 'helaman', '3 Nephi': '3nephi',
    '4 Nephi': '4nephi', 'Mormon': 'mormon', 'Ether': 'ether',
    'Moroni': 'moroni',
}

# English colophon texts (official BOM superscriptions)
# English front matter sections (matching Hebrew front_matter.json order, skip 0,1)
FM_EN = {
    'מבוא המתרגם': {
        'header': "Translator's Introduction",
        'body': "This Hebrew translation of the Book of Mormon was made as an independent work for linguistic, educational, and spiritual purposes. It is not an official publication of The Church of Jesus Christ of Latter-day Saints.\nThe translator, Chris Lamb, undertook this project to render the sacred text into Classical Biblical Hebrew, following the style and vocabulary of the Hebrew Bible (Tanakh).\nReaders are encouraged to study the text alongside the official English edition and to verify the accuracy of this translation.\nThe translator bears sole responsibility for any errors.\nMay this work serve to bring the message of the Book of Mormon to Hebrew readers and to deepen the understanding of all who study it."
    },
    'ספר מורמון': {
        'header': 'The Book of Mormon',
        'body': "An Account Written by the Hand of Mormon upon Plates Taken from the Plates of Nephi\nWherefore, it is an abridgment of the record of the people of Nephi, and also of the Lamanites\u2014Written to the Lamanites, who are a remnant of the house of Israel; and also to Jew and Gentile\u2014Written by way of commandment, and also by the spirit of prophecy and of revelation\u2014Written and sealed up, and hid up unto the Lord, that they might not be destroyed\u2014To come forth by the gift and power of God unto the interpretation thereof\u2014Sealed by the hand of Moroni, and hid up unto the Lord, to come forth in due time by way of the Gentile\u2014The interpretation thereof by the gift of God.\nAn abridgment taken from the Book of Ether also, which is a record of the people of Jared, who were scattered at the time the Lord confounded the language of the people, when they were building a tower to get to heaven\u2014Which is to show unto the remnant of the house of Israel what great things the Lord hath done for their fathers; and that they may know the covenants of the Lord, that they are not cast off forever\u2014And also to the convincing of the Jew and Gentile that Jesus is the Christ, the Eternal God, manifesting himself unto all nations\u2014And now, if there are faults they are the mistakes of men; wherefore, condemn not the things of God, that ye may be found spotless at the judgment-seat of Christ.\nTranslated by Joseph Smith, Jun."
    },
    'מבוא': {
        'header': 'Introduction',
        'body': "The Book of Mormon is a volume of holy scripture comparable to the Bible. It is a record of God\u2019s dealings with ancient inhabitants of the Americas and contains the fulness of the everlasting gospel.\nThe book was written by many ancient prophets by the spirit of prophecy and revelation. Their words, written on gold plates, were quoted and abridged by a prophet-historian named Mormon. The record gives an account of two great civilizations. One came from Jerusalem in 600 B.C. and afterward separated into two nations, known as the Nephites and the Lamanites. The other came much earlier when the Lord confounded the tongues at the Tower of Babel. This group is known as the Jaredites. After thousands of years, all were destroyed except the Lamanites, and they are among the ancestors of the American Indians.\nThe crowning event recorded in the Book of Mormon is the personal ministry of the Lord Jesus Christ among the Nephites soon after His resurrection. It puts forth the doctrines of the gospel, outlines the plan of salvation, and tells men what they must do to gain peace in this life and eternal salvation in the life to come.\nAfter Mormon completed his writings, he delivered the account to his son Moroni, who added a few words of his own and hid up the plates in the Hill Cumorah. On September 21, 1823, the same Moroni, then a glorified, resurrected being, appeared to the Prophet Joseph Smith and instructed him relative to the ancient record and its destined translation into the English language.\nIn due course the plates were delivered to Joseph Smith, who translated them by the gift and power of God. The record is now published in many languages as a new and additional witness that Jesus Christ is the Son of the living God and that all who will come unto Him and obey the laws and ordinances of His gospel may be saved.\nConcerning this record the Prophet Joseph Smith said: \u201cI told the brethren that the Book of Mormon was the most correct of any book on earth, and the keystone of our religion, and a man would get nearer to God by abiding by its precepts, than by any other book.\u201d\nIn addition to Joseph Smith, the Lord provided for eleven others to see the gold plates for themselves and to be special witnesses of the truth and divinity of the Book of Mormon. Their written testimonies are included herewith as \u201cThe Testimony of Three Witnesses\u201d and \u201cThe Testimony of Eight Witnesses.\u201d\nWe invite all men everywhere to read the Book of Mormon, to ponder in their hearts the message it contains, and then to ask God, the Eternal Father, in the name of Christ if the book is true. Those who pursue this course and ask in faith will gain a testimony of its truth and divinity by the power of the Holy Ghost. (See Moroni 10:3\u20135.)\nThose who gain this divine witness from the Holy Spirit will also come to know by the same power that Jesus Christ is the Savior of the world, that Joseph Smith is His revelator and prophet in these last days, and that The Church of Jesus Christ of Latter-day Saints is the Lord\u2019s kingdom once again established on the earth, preparatory to the Second Coming of the Messiah."
    },
    'עדות שלשת העדים': {
        'header': 'The Testimony of Three Witnesses',
        'body': "Be it known unto all nations, kindreds, tongues, and people, unto whom this work shall come:\nThat we, through the grace of God the Father, and our Lord Jesus Christ, have seen the plates which contain this record, which is a record of the people of Nephi, and also of the Lamanites, their brethren, and also of the people of Jared, who came from the tower of which hath been spoken. And we also know that they have been translated by the gift and power of God, for his voice hath declared it unto us; wherefore we know of a surety that the work is true.\nAnd we declare with words of soberness, that an angel of God came down from heaven, and he brought and laid before our eyes, that we beheld and saw the plates, and the engravings thereon; and we know that it is by the grace of God the Father, and our Lord Jesus Christ, that we beheld and bear record that these things are true. And it is marvelous in our eyes.\nNevertheless, the voice of the Lord commanded us that we should bear record of it; wherefore, to be obedient unto the commandments of God, we bear testimony of these things. And we know that if we are faithful in Christ, we shall rid our garments of the blood of all men, and be found spotless before the judgment-seat of Christ, and shall dwell with him eternally in the heavens. And the honor be to the Father, and to the Son, and to the Holy Ghost, which is one God. Amen.\nOliver Cowdery\nDavid Whitmer\nMartin Harris"
    },
    'עדות שמונה עדים': {
        'header': 'The Testimony of Eight Witnesses',
        'body': "Be it known unto all nations, kindreds, tongues, and people, unto whom this work shall come:\nThat Joseph Smith, Jun., the translator of this work, has shown unto us the plates of which hath been spoken, which have the appearance of gold;\nand as many of the leaves as the said Smith has translated we did handle with our hands;\nand we also saw the engravings thereon, all of which has the appearance of ancient work, and of curious workmanship.\nAnd this we bear record with words of soberness, that the said Smith has shown unto us, for we have seen and hefted, and know of a surety that the said Smith has got the plates of which we have spoken.\nAnd we give our names unto the world, to witness unto the world that which we have seen. And we lie not, God bearing witness of it.\nChristian Whitmer\nJacob Whitmer\nPeter Whitmer, Jun.\nJohn Whitmer\nHiram Page\nJoseph Smith, Sen.\nHyrum Smith\nSamuel H. Smith"
    },
    'עדות הנביא יוסף סמית': {
        'header': 'Testimony of the Prophet Joseph Smith',
        'body': "The Prophet Joseph Smith\u2019s own words about the coming forth of the Book of Mormon are:\n\u201cOn the evening of the twenty-first of September, A.D. 1823, while I was praying unto God, and endeavoring to exercise faith in the precious promises of Scripture, on a sudden a light like that of day, only of a far purer and more glorious appearance and brightness, burst into the room.\nIndeed the first sight was as though the house was filled with consuming fire; the appearance produced a shock that affected the whole body; in a moment a personage stood before me surrounded with a glory yet greater than that with which I was already surrounded.\nThis messenger proclaimed himself to be an angel of God, sent to bring the joyful tidings that the covenant which God made with ancient Israel was at hand for its fulfilment.\nThat the preparatory work for the second coming of the Messiah was speedily to commence; that the time was at hand for the Gospel in all its fulness to be preached in power, unto all nations.\nThat a people might be prepared for the Millennial reign.\nI was informed that I was chosen to be an instrument in the hands of God to bring about some of His purposes in this glorious dispensation.\nI was also informed concerning the Urim and Thummim.\nHe told me of a sacred record written on gold plates, giving an account of the former inhabitants of this continent, and the source from whence they sprang.\nHe also said that the fulness of the everlasting Gospel was contained in it, as delivered by the Savior to the ancient inhabitants.\nAlso, that there were two stones in silver bows and these stones, fastened to a breastplate, constituted what is called the Urim and Thummim deposited with the plates.\nThe possession and use of these stones were what constituted seers in ancient or former times; and that God had prepared them for the purpose of translating the book.\nAfter telling me these things, he commenced quoting the prophecies of the Old Testament.\nI was informed that the time was not yet come for them to be revealed, but that shortly the time would arrive.\nAgain, he told me, that when I got those plates, I should not show them to any person.\nOn the twenty-second day of September, one thousand eight hundred and twenty-seven, the angel of the Lord delivered the records into my hands.\nThese records were engraved on plates which had the appearance of gold. Each plate was not far from six inches wide and eight inches in length.\nThe volume was something near six inches in thickness.\nA part of it was sealed. The characters on the unsealed part were small and beautifully engraved.\nThe whole book exhibited many marks of antiquity in its construction, and much skill in the art of engraving.\nWith the records was found a curious instrument, which the ancients called the Urim and Thummim.\nThe plates were delivered to the angel after the translation was done.\nThey were first published to the world in 1830 as The Book of Mormon.\nBy the gift and power of God, the Book of Mormon came forth as a new witness of Jesus Christ.\nThe Prophet Joseph Smith sealed his testimony with his blood.\nThis record stands as a testament that God speaks to His children in every age.\u201d"
    },
    'ביאור קצר על\u05beספר מורמון': {
        'header': 'A Brief Explanation about the Book of Mormon',
        'body': "The Book of Mormon is a sacred record of peoples in ancient America and was engraved upon metal plates. Sources from which this record was compiled include the following:\n1. The Plates of Nephi, which were of two kinds: the smaller plates and the larger plates. The former were more particularly devoted to spiritual matters and the ministry and teachings of the prophets, while the latter were occupied mostly by a secular history of the peoples concerned.\nFrom the time of Mosiah, however, the large plates also included items of major spiritual importance.\n2. The Plates of Mormon, which consist of an abridgment by Mormon from the large plates of Nephi, with many commentaries. These plates also contained a continuation of the history by Mormon and additions by his son Moroni.\n3. The Plates of Ether, which present a history of the Jaredites. This record was abridged by Moroni, who inserted comments of his own and incorporated the record with the general history under the title Book of Ether.\n4. The Plates of Brass brought by the people of Lehi from Jerusalem in 600 B.C. These contained the five books of Moses and also a record of the Jews from the beginning down to the commencement of the reign of Zedekiah, king of Judah; and also the prophecies of the holy prophets.\nThe Book of Mormon comprises fifteen main parts or divisions, known, with one exception, as books.\nThe first six books were translated from the small plates of Nephi. Between the books of Omni and Mosiah is an insert called the Words of Mormon.\nThis insert connects the record engraved on the small plates with Mormon\u2019s abridgment of the large plates.\nThe longest portion, from Mosiah through Mormon chapter 7, is a translation of Mormon\u2019s abridgment of the large plates of Nephi. The concluding portion, from Mormon chapter 8 to the end of the volume, was engraved by Mormon\u2019s son Moroni."
    },
}

COLOPHON_EN = {
    '1 Nephi': 'An account of Lehi and his wife Sariah, and his four sons, being called, (beginning at the eldest) Laman, Lemuel, Sam, and Nephi. The Lord warns Lehi to depart out of the land of Jerusalem, because he prophesieth unto the people concerning their iniquity and they seek to destroy his life. He taketh three days\u2019 journey into the wilderness with his family. Nephi taketh his brethren and returneth to the land of Jerusalem after the record of the Jews. The account of their sufferings. They take the daughters of Ishmael to wife. They take their families and depart into the wilderness. Their sufferings and afflictions in the wilderness. The course of their travels. They come to the large waters. Nephi\u2019s brethren rebel against him. He confoundeth them, and buildeth a ship. They call the name of the place Bountiful. They cross the large waters into the promised land, and so forth. This is according to the account of Nephi; or in other words, I, Nephi, wrote this record.',
    '2 Nephi': 'An account of the death of Lehi. Nephi\u2019s brethren rebel against him. The Lord warns Nephi to depart into the wilderness. His journeyings in the wilderness, and so forth.',
    'Jacob': 'The words of his preaching unto his brethren. He confoundeth a man who seeketh to overthrow the doctrine of Christ. A few words concerning the history of the people of Nephi.',
}

def load_colophons():
    """Extract Hebrew colophon text for books that have them."""
    colophons = {}
    for book, fname in BOOK_FILES.items():
        fpath = f'{BASE}/bom/verses/{fname}.js'
        if not os.path.exists(fpath):
            continue
        with open(fpath, 'r', encoding='utf-8') as f:
            text = f.read()
        m = re.search(r'var \w*[Cc]olophon\w*\s*=\s*\[(.*?)\];', text, re.DOTALL)
        if m:
            pairs = re.findall(r'\["([^"]*)",\s*"[^"]*"\]', m.group(1))
            words = [w for w in pairs if w not in ('\u05c3', '')]
            if words:
                colophons[book] = ' '.join(words) + '\u05c3'
    return colophons


# ── 7x10 page layout ──
PAGE_W = 7 * inch
PAGE_H = 10 * inch

GUTTER = 0.875 * inch
OUTSIDE = 0.4 * inch
MARGIN_TOP = 0.42 * inch
MARGIN_BOTTOM = 0.42 * inch
COLUMN_GAP = 0.2 * inch
# Offset: English wider (55%), Hebrew narrower (45%) — Hebrew is condensed
HEB_COL_RATIO = 0.45
EN_COL_RATIO = 0.55

HEADER_Y = PAGE_H - 0.42 * inch
FOOTER_Y = 0.32 * inch
TEXT_START = PAGE_H - 0.65 * inch

# Font sizes — Hebrew 12, English 10, uniform throughout
HEB_BODY = 12
EN_BODY = 10
VERSE_NUM_SIZE = 8
HEADER_SIZE = 9
FOOTER_SIZE = 9
CHAPTER_SIZE = 14
HEADING_SIZE = EN_BODY  # same as body
BOOK_TITLE_SIZE = 20

HEB_LINE_SPACING = HEB_BODY * 1.12
EN_LINE_SPACING = EN_BODY * 1.12
VERSE_GAP = 0.5
CHAPTER_GAP = 14.0


def wrap_heb(c, text, max_w):
    """Wrap Hebrew text into lines that fit max_w.
    Breaks at spaces AND at maqqefs (־) to maximize line fill."""
    # Split into tokens: break at spaces, and also allow break after maqqef
    # Replace maqqef with maqqef + zero-width break point
    MAQQEF = '\u05BE'
    tokens = []
    for space_word in text.split():
        # Split at maqqef boundaries: "אֶת־הַדָּבָר" → ["אֶת־", "הַדָּבָר"]
        if MAQQEF in space_word:
            parts = space_word.split(MAQQEF)
            for i, part in enumerate(parts):
                if i < len(parts) - 1:
                    tokens.append(part + MAQQEF)  # keep maqqef attached to left word
                else:
                    tokens.append(part)
        else:
            tokens.append(space_word)

    lines = []
    cur = []
    for tok in tokens:
        test = bidi(' '.join(cur + [tok]))
        if c.stringWidth(test, 'David', HEB_BODY) > max_w and cur:
            lines.append(' '.join(cur))
            cur = [tok]
        else:
            cur.append(tok)
    if cur:
        lines.append(' '.join(cur))
    return lines


def wrap_en(c, text, max_w, font='David', size=EN_BODY):
    """Wrap English text into lines that fit max_w."""
    words = text.split()
    lines = []
    cur = []
    for w in words:
        test = ' '.join(cur + [w])
        if c.stringWidth(test, font, size) > max_w and cur:
            lines.append(' '.join(cur))
            cur = [w]
        else:
            cur.append(w)
    if cur:
        lines.append(' '.join(cur))
    return lines


def draw_justified_heb(c, text, x_right, y, max_w, font='David', size=HEB_BODY):
    """Draw right-justified Hebrew line with word spacing."""
    display = text
    actual_w = c.stringWidth(display, font, size)
    c.setFont(font, size)
    # Right-align
    c.drawRightString(x_right, y, display)


def draw_justified_en(c, words_text, x_left, y, max_w, font='David', size=EN_BODY, last_line=False):
    """Draw justified English line. Always justifies unless last line or single word."""
    c.setFont(font, size)
    if last_line:
        c.drawString(x_left, y, words_text)
    else:
        words = words_text.split()
        if len(words) <= 1:
            c.drawString(x_left, y, words_text)
            return
        total_word_w = sum(c.stringWidth(bidi(w), font, size) for w in words)
        gap = (max_w - total_word_w) / (len(words) - 1)
        # Always justify — draw word by word
        x = x_left
        for w in words:
            c.drawString(x, y, w)
            x += c.stringWidth(bidi(w), font, size) + gap


class DualBomPdf:
    def __init__(self, path):
        self.c = canvas.Canvas(path, pagesize=(PAGE_W, PAGE_H))
        self.c.setTitle("Book of Mormon — Hebrew / English")
        self.c.setAuthor("Standard Works Project")
        self.page_num = 0        # display page number (resets for content)
        self.phys_page = 0       # physical PDF page (never resets, used for gutter)
        self.heb_y = TEXT_START
        self.en_y = TEXT_START
        self.current_book = ''
        self.current_chapter = 0
        self.page_book = ''
        self.page_chapter_first = 0
        self.page_chapter_last = 0
        self.page_verse_first = 0
        self.page_verse_last = 0
        self.is_front_matter = True
        self.book_pages = {}     # book name -> display page number (may be pre-filled before build)

    def _left_margin(self):
        """RTL/Hebrew binding: gutter on RIGHT for odd physical PDF pages."""
        if self.phys_page % 2 == 1:
            return OUTSIDE
        else:
            return GUTTER

    def _right_margin(self):
        if self.phys_page % 2 == 1:
            return GUTTER
        else:
            return OUTSIDE

    def _content_width(self):
        return PAGE_W - self._left_margin() - self._right_margin()

    def _heb_col_width(self):
        return (self._content_width() - COLUMN_GAP) * HEB_COL_RATIO

    def _en_col_width(self):
        return (self._content_width() - COLUMN_GAP) * EN_COL_RATIO

    # Hebrew column (RIGHT side of page)
    def _heb_right(self):
        return PAGE_W - self._right_margin()

    def _heb_left(self):
        return PAGE_W - self._right_margin() - self._heb_col_width()

    def _heb_center(self):
        return self._heb_left() + self._heb_col_width() / 2

    # English column (LEFT side of page)
    def _en_left(self):
        return self._left_margin()

    def _en_right(self):
        return self._left_margin() + self._en_col_width()

    def _en_center(self):
        return self._en_left() + self._en_col_width() / 2

    def _draw_header_footer(self):
        c = self.c
        lm = self._left_margin()
        rm = self._right_margin()

        if not self.page_book or self.is_front_matter:
            return

        book_heb = BOOK_HEB.get(self.page_book, self.page_book)
        book_en = self.page_book

        # Build verse range string
        cf = self.page_chapter_first
        cl = self.page_chapter_last
        vf = self.page_verse_first
        vl = self.page_verse_last
        if cf and vf:
            if cf == cl:
                vrange_heb = bidi(f"{int_to_heb(cf)} / {int_to_heb(vf)}–{int_to_heb(vl)}")
                vrange_en = f"{cf}:{vf}-{vl}"
            else:
                vrange_heb = bidi(f"{int_to_heb(cf)}:{int_to_heb(vf)}–{int_to_heb(cl)}:{int_to_heb(vl)}")
                vrange_en = f"{cf}:{vf}-{cl}:{vl}"
        else:
            vrange_heb = ''
            vrange_en = ''

        # Header: page num + book name on right, verse range on left (Hebrew side)
        #         page num + book name on left, verse range on right (English side)
        c.setFont('David', HEADER_SIZE)

        # Right side: Hebrew page num / book name
        heb_hdr = bidi(f"{int_to_heb(self.page_num)} / {book_heb}")
        c.drawRightString(PAGE_W - rm, HEADER_Y + 2, bidi(heb_hdr))

        # Left side near Hebrew: verse range
        if vrange_heb:
            c.drawString(self._heb_left(), HEADER_Y + 2, bidi(vrange_heb))

        # Left side: English page num / book name
        en_hdr = f"{self.page_num} / {book_en}"
        c.drawString(lm, HEADER_Y + 2, en_hdr)

        # Right side near English: verse range
        if vrange_en:
            c.drawRightString(self._en_right(), HEADER_Y + 2, vrange_en)

        # Header line
        c.setStrokeColor(HexColor('#999999'))
        c.setLineWidth(0.4)
        c.line(lm, HEADER_Y - 4, PAGE_W - rm, HEADER_Y - 4)

        # Page numbers in footer
        heb_pg = bidi(int_to_heb(self.page_num))
        en_pg = str(self.page_num)

        c.setFont('David', FOOTER_SIZE)
        c.drawRightString(PAGE_W - rm, FOOTER_Y, bidi(heb_pg))
        c.drawString(lm, FOOTER_Y, en_pg)

        # Footer line
        c.setStrokeColor(HexColor('#999999'))
        c.setLineWidth(0.4)
        c.line(lm, FOOTER_Y + 10, PAGE_W - rm, FOOTER_Y + 10)
        c.setStrokeColor(black)

    def new_page(self):
        if self.page_num > 0:
            self._draw_header_footer()
            self.c.showPage()
        self.page_num += 1
        self.phys_page += 1
        self.heb_y = TEXT_START
        self.en_y = TEXT_START
        self.page_book = self.current_book
        self.page_chapter_first = self.current_chapter
        self.page_chapter_last = self.current_chapter
        self.page_verse_first = 0
        self.page_verse_last = 0

    def _needs_new_page(self, heb_lines, en_lines):
        """Check if we need a new page for the next verse."""
        heb_h = len(heb_lines) * HEB_LINE_SPACING + VERSE_GAP
        en_h = len(en_lines) * EN_LINE_SPACING + VERSE_GAP
        return (self.heb_y - heb_h < MARGIN_BOTTOM + 15 or
                self.en_y - en_h < MARGIN_BOTTOM + 15)

    def render_chapter_heading(self, book, chapter, heading_heb, heading_en):
        """Render chapter title and heading in both columns."""
        c = self.c
        hcw = self._heb_col_width()
        ecw = self._en_col_width()

        # Check space — need room for chapter title + at least a few heading lines
        needed = CHAPTER_GAP + CHAPTER_SIZE + 10 + HEADING_SIZE * 4
        if self.heb_y - needed < MARGIN_BOTTOM + 20 or self.en_y - needed < MARGIN_BOTTOM + 20:
            self.new_page()

        # Small gap before chapter (not a full sync — keep flow tight)
        self.heb_y -= CHAPTER_GAP
        self.en_y -= CHAPTER_GAP
        y_heb = self.heb_y
        y_en = self.en_y

        # === CHAPTER TITLE ===
        chap_heb = bidi(f"פֶּרֶק {int_to_heb(chapter)}")
        chap_en = f"Chapter {chapter}"

        # Hebrew chapter title — centered over Hebrew column
        c.setFont('David-Bold', CHAPTER_SIZE)
        c.drawString(self._heb_center() - c.stringWidth(chap_heb, 'David-Bold', CHAPTER_SIZE) / 2,
                     y_heb, bidi(chap_heb))
        y_heb -= CHAPTER_SIZE + 4

        # English chapter title — centered over English column
        c.setFont('David-Bold', CHAPTER_SIZE)
        c.drawString(self._en_center() - c.stringWidth(chap_en, 'David-Bold', CHAPTER_SIZE) / 2,
                     y_en, chap_en)
        y_en -= CHAPTER_SIZE + 4

        # === CHAPTER HEADING (summary) ===
        if heading_heb:
            heading_heb = heading_heb.replace('\u2014', ',').replace('—', ',')  # remove em dashes
            heb_lines = wrap_heb(c, heading_heb, hcw - 6)
            for i, line in enumerate(heb_lines):
                is_last = (i == len(heb_lines) - 1)
                self._draw_heb_justified(line, y_heb, hcw - 6, 'David', HEADING_SIZE, is_last)
                y_heb -= HEADING_SIZE * 1.25

        if heading_en:
            en_lines = wrap_en(c, heading_en, ecw - 6, 'David', HEADING_SIZE)
            for i, line in enumerate(en_lines):
                is_last = (i == len(en_lines) - 1)
                draw_justified_en(c, line, self._en_left() + 3, y_en, ecw - 6,
                                font='David', size=HEADING_SIZE, last_line=is_last)
                y_en -= HEADING_SIZE * 1.25

        y_heb -= 4
        y_en -= 4

        # Sync both columns after headings
        sync_y = min(y_heb, y_en) - 4
        self.heb_y = sync_y
        self.en_y = sync_y

    def _draw_heb_justified(self, line, y, max_w, font='David', size=None, is_last=False):
        """Draw a single justified Hebrew line at given font/size. Always justifies unless last line."""
        if size is None:
            size = HEB_BODY
        c = self.c
        display = bidi(line)
        words = line.split()
        c.setFont(font, size)
        if not is_last and len(words) > 1:
            total_word_w = sum(c.stringWidth(bidi(w), font, size) for w in words)
            gap = (max_w - total_word_w) / (len(words) - 1)
            # Always justify — no threshold. Draw word by word RTL.
            x = self._heb_right() - 2
            for w in words:
                dw = bidi(w)
                ww = c.stringWidth(dw, font, size)
                c.drawRightString(x, y, dw)
                x -= ww + gap
        else:
            c.drawRightString(self._heb_right() - 2, y, display)

    def _draw_heb_line(self, line, y, hcw, is_last=False, bold_prefix=None):
        """Draw a single justified Hebrew body line with optional bold verse number."""
        if bold_prefix and line.startswith(bold_prefix):
            # Draw verse number bold, rest regular — both justified together
            rest = line[len(bold_prefix):].lstrip()
            words = line.split()
            c = self.c

            if not is_last and len(words) > 1:
                # Calculate total width and gap
                total_word_w = 0
                for w in words:
                    total_word_w += c.stringWidth(bidi(w), 'David', HEB_BODY)
                # Bold prefix is wider — adjust
                prefix_words = bold_prefix.split()
                for pw in prefix_words:
                    total_word_w -= c.stringWidth(pw, 'David', HEB_BODY)
                    total_word_w += c.stringWidth(pw, 'David-Bold', HEB_BODY)

                gap = (hcw - total_word_w) / (len(words) - 1) if len(words) > 1 else 0

                x = self._heb_right() - 2
                for i, w in enumerate(words):
                    dw = bidi(w)
                    if i < len(prefix_words):
                        c.setFont('David-Bold', HEB_BODY)
                    else:
                        c.setFont('David', HEB_BODY)
                    ww = c.stringWidth(dw, c._fontname, HEB_BODY)
                    c.drawRightString(x, y, dw)
                    x -= ww + gap
            else:
                # Last line — just right-align with bold prefix
                x = self._heb_right() - 2
                words = line.split()
                prefix_words = bold_prefix.split()
                for i, w in enumerate(words):
                    dw = bidi(w)
                    if i < len(prefix_words):
                        c.setFont('David-Bold', HEB_BODY)
                    else:
                        c.setFont('David', HEB_BODY)
                    ww = c.stringWidth(dw, c._fontname, HEB_BODY)
                    c.drawRightString(x, y, dw)
                    x -= ww - 1  # tight spacing for last line
        else:
            self._draw_heb_justified(line, y, hcw, 'David', HEB_BODY, is_last)

    def render_verse(self, verse_num, heb_text, en_text):
        """Render a verse in both columns. Verses can split across pages."""
        c = self.c
        hcw = self._heb_col_width() - 4
        ecw = self._en_col_width() - 4

        # Prepare all lines — add period after verse numbers
        heb_vnum = f"{int_to_heb(verse_num)}."
        heb_with_num = f"{heb_vnum}  {heb_text}"
        heb_lines = wrap_heb(c, heb_with_num, hcw)

        en_vnum = f"{verse_num}."
        en_with_num = f"{en_vnum}  {en_text}"
        en_lines = wrap_en(c, en_with_num, ecw)

        # Sync y at verse start
        y = min(self.heb_y, self.en_y)

        # If not even one line fits, new page
        min_line = max(HEB_LINE_SPACING, EN_LINE_SPACING)
        if y - min_line < MARGIN_BOTTOM + 15:
            self.new_page()
            y = TEXT_START

        # Interleave rendering line by line from both columns
        hi = 0  # Hebrew line index
        ei = 0  # English line index
        hy = y
        ey = y

        while hi < len(heb_lines) or ei < len(en_lines):
            # Check if we need a new page (either column out of room)
            check_y = min(hy, ey)
            if check_y - min_line < MARGIN_BOTTOM + 15:
                self.new_page()
                hy = TEXT_START
                ey = TEXT_START

            # Render next Hebrew line if available
            if hi < len(heb_lines):
                is_last = (hi == len(heb_lines) - 1)
                bp = heb_vnum if hi == 0 else None
                self._draw_heb_line(heb_lines[hi], hy, hcw, is_last, bold_prefix=bp)
                hy -= HEB_LINE_SPACING
                hi += 1

            # Render next English line if available
            if ei < len(en_lines):
                is_last = (ei == len(en_lines) - 1)
                if ei == 0:
                    # Bold verse number on first English line
                    line = en_lines[ei]
                    words = line.split()
                    c.setFont('David-Bold', EN_BODY)
                    vn_w = c.stringWidth(en_vnum, 'David-Bold', EN_BODY)
                    if not is_last and len(words) > 1:
                        total_word_w = sum(c.stringWidth(w, 'David', EN_BODY) for w in words)
                        # Adjust for bold first word
                        total_word_w -= c.stringWidth(words[0], 'David', EN_BODY)
                        total_word_w += c.stringWidth(words[0], 'David-Bold', EN_BODY)
                        gap = (ecw - total_word_w) / (len(words) - 1)
                        x = self._en_left() + 2
                        for j, w in enumerate(words):
                            if j == 0:
                                c.setFont('David-Bold', EN_BODY)
                            else:
                                c.setFont('David', EN_BODY)
                            c.drawString(x, ey, w)
                            x += c.stringWidth(w, c._fontname, EN_BODY) + gap
                    else:
                        c.setFont('David-Bold', EN_BODY)
                        c.drawString(self._en_left() + 2, ey, en_vnum)
                        c.setFont('David', EN_BODY)
                        rest = line[len(en_vnum):].lstrip()
                        c.drawString(self._en_left() + 2 + vn_w + 3, ey, rest)
                else:
                    draw_justified_en(c, en_lines[ei], self._en_left() + 2, ey, ecw,
                                    last_line=is_last)
                ey -= EN_LINE_SPACING
                ei += 1

        # Advance both to the lower point + small gap
        new_y = min(hy, ey) - VERSE_GAP
        self.heb_y = new_y
        self.en_y = new_y

    def render_book_title(self, book):
        """Render book title at top of new page."""
        c = self.c
        self.new_page()

        y = TEXT_START - 10

        book_heb = BOOK_HEB.get(book, book)

        # Record this book's starting page
        self.book_pages[book] = self.page_num

        # Hebrew title
        c.setFont('David-Bold', BOOK_TITLE_SIZE)
        title_heb = bidi(f"סֵפֶר {book_heb}")
        c.drawString(PAGE_W / 2 - c.stringWidth(title_heb, 'David-Bold', BOOK_TITLE_SIZE) / 2,
                     y, bidi(title_heb))

        y -= BOOK_TITLE_SIZE + 8

        # English title
        c.setFont('David-Bold', BOOK_TITLE_SIZE - 2)
        title_en = f"The Book of {book}" if book not in ('Enos', 'Jarom', 'Omni') else f"The Book of {book}"
        if book == 'Words of Mormon':
            title_en = "The Words of Mormon"
        c.drawString(PAGE_W / 2 - c.stringWidth(title_en, 'David-Bold', BOOK_TITLE_SIZE - 2) / 2,
                     y, title_en)

        y -= BOOK_TITLE_SIZE + 20

        # Decorative line
        c.setStrokeColor(HexColor('#999999'))
        c.setLineWidth(0.5)
        c.line(PAGE_W / 2 - 60, y, PAGE_W / 2 + 60, y)
        c.setStrokeColor(black)

        self.heb_y = y - 30
        self.en_y = y - 30

    def render_colophon(self, book, colophons_heb):
        """Render colophon/superscription in both columns, justified, can split pages."""
        c = self.c
        heb_text = colophons_heb.get(book, '')
        en_text = COLOPHON_EN.get(book, '')
        if not heb_text and not en_text:
            return

        hcw = self._heb_col_width() - 4
        ecw = self._en_col_width() - 4
        col_size = EN_BODY  # same size as body text
        col_line = col_size * 1.22

        heb_lines = wrap_heb(c, heb_text, hcw) if heb_text else []
        en_lines = wrap_en(c, en_text, ecw) if en_text else []

        y = min(self.heb_y, self.en_y)
        min_h = col_line

        hi = 0
        ei = 0
        hy = y
        ey = y

        while hi < len(heb_lines) or ei < len(en_lines):
            check_y = min(hy, ey)
            if check_y - min_h < MARGIN_BOTTOM + 15:
                self.new_page()
                hy = TEXT_START
                ey = TEXT_START

            if hi < len(heb_lines):
                is_last = (hi == len(heb_lines) - 1)
                self._draw_heb_justified(heb_lines[hi], hy, hcw, 'David', col_size, is_last)
                hy -= col_line
                hi += 1

            if ei < len(en_lines):
                is_last = (ei == len(en_lines) - 1)
                draw_justified_en(c, en_lines[ei], self._en_left() + 2, ey, ecw,
                                font='David', size=col_size, last_line=is_last)
                ey -= col_line
                ei += 1

        sync_y = min(hy, ey) - 4
        self.heb_y = sync_y
        self.en_y = sync_y

    def _fm_new_page(self):
        """New page for front matter — no page numbers or headers."""
        if self.phys_page > 0:
            self.c.showPage()
        self.phys_page += 1
        self.page_num += 1

    def render_front_matter(self, skip=0):
        """Render front matter from dual DOCX data — Hebrew right, English left, paragraph-aligned."""
        c = self.c
        try:
            fm_data = json.load(open(f'{BASE}/_dual_fm_data.json', 'r', encoding='utf-8'))
        except:
            return

        FM_SIZE = EN_BODY
        FM_LINE_H = FM_SIZE * 1.22
        FM_HDR_SIZE = 14

        for sec in fm_data:
            en_full = sec['english']
            heb_full = sec['hebrew']

            # Split into paragraphs (filter empty)
            en_paras_raw = en_full.split('\n')
            heb_paras_raw = heb_full.split('\n')

            # First paragraph is the header
            header_en = en_paras_raw[0].strip() if en_paras_raw else ''
            header_heb = heb_paras_raw[0].strip() if heb_paras_raw else ''

            # Rest are body paragraphs (skip empties)
            en_paras = [p.strip() for p in en_paras_raw[1:] if p.strip()]
            heb_paras = [p.strip() for p in heb_paras_raw[1:] if p.strip()]

            # Check if TOC
            is_toc = False  # No TOC in DOCX front matter tables

            # New page for each section
            self._fm_new_page()
            hcw = self._heb_col_width() - 4
            ecw = self._en_col_width() - 4
            y = TEXT_START

            # Dual headers
            if header_heb:
                c.setFont('David-Bold', FM_HDR_SIZE)
                hdr_d = bidi(header_heb)
                c.drawString(self._heb_center() - c.stringWidth(hdr_d, 'David-Bold', FM_HDR_SIZE) / 2, y, bidi(hdr_d))
            if header_en:
                c.setFont('David-Bold', FM_HDR_SIZE - 2)
                c.drawString(self._en_center() - c.stringWidth(header_en, 'David-Bold', FM_HDR_SIZE - 2) / 2, y, header_en)
            y -= FM_HDR_SIZE + 8

            # Render paragraphs aligned
            max_paras = max(len(heb_paras), len(en_paras))
            cur_y = y

            for pi in range(max_paras):
                heb_p = heb_paras[pi] if pi < len(heb_paras) else ''
                en_p = en_paras[pi] if pi < len(en_paras) else ''

                heb_lines = wrap_heb(c, heb_p, hcw) if heb_p else []
                en_lines = wrap_en(c, en_p, ecw, 'David', FM_SIZE) if en_p else []

                if cur_y - FM_LINE_H < MARGIN_BOTTOM + 15:
                    self._fm_new_page()
                    cur_y = TEXT_START

                hy = cur_y
                ey = cur_y
                hli = 0
                eli = 0

                while hli < len(heb_lines) or eli < len(en_lines):
                    check = min(hy, ey)
                    if check - FM_LINE_H < MARGIN_BOTTOM + 15:
                        self._fm_new_page()
                        hy = TEXT_START
                        ey = TEXT_START

                    if hli < len(heb_lines):
                        is_last_h = (hli == len(heb_lines) - 1)
                        self._draw_heb_justified(heb_lines[hli], hy, hcw, 'David', FM_SIZE, is_last_h)
                        hy -= FM_LINE_H
                        hli += 1

                    if eli < len(en_lines):
                        is_last_e = (eli == len(en_lines) - 1)
                        draw_justified_en(c, en_lines[eli], self._en_left() + 2, ey, ecw,
                                        font='David', size=FM_SIZE, last_line=is_last_e)
                        ey -= FM_LINE_H
                        eli += 1

                cur_y = min(hy, ey) - FM_LINE_H * 0.3

        # Render TOC from front_matter.json
        try:
            fm_json = json.load(open(f'{BASE}/Hebrew BOM/front_matter.json', 'r', encoding='utf-8'))
            toc_sec = None
            for s in fm_json:
                if s.get('header', '').strip() == chr(0x05E8) + chr(0x05D0) + chr(0x05E9) + chr(0x05D9) + ' ' + chr(0x05D3) + chr(0x05D1) + chr(0x05E8) + chr(0x05D9) + chr(0x05DD):
                    toc_sec = s
                    break
            if toc_sec:
                self._fm_new_page()
                y = TEXT_START
                c.setFont('David-Bold', FM_HDR_SIZE)
                hdr_d = toc_sec['header']
                c.drawString(PAGE_W / 2 - c.stringWidth(hdr_d, 'David-Bold', FM_HDR_SIZE) / 2, y, bidi(hdr_d))
                y -= FM_HDR_SIZE + 15
                TOC_SIZE = 11
                TOC_LINE = TOC_SIZE * 1.8
                lm_t = 0.75 * inch
                rx_t = PAGE_W - 0.75 * inch
                # Build lookup stripping nikkud for matching
                import unicodedata
                def strip_nikkud(s):
                    return ''.join(c for c in s if unicodedata.category(c) not in ('Mn', 'Me', 'Mc') and c != chr(0x05F3))

                heb_to_en = {}
                for en_book, heb_book in BOOK_HEB.items():
                    heb_to_en[strip_nikkud(heb_book)] = en_book

                for toc_line in toc_sec['body'].strip().split(chr(10)):
                    toc_line = toc_line.strip()
                    if not toc_line: continue
                    parts = toc_line.split(chr(9))
                    book_name_heb = parts[0].strip()
                    book_key = strip_nikkud(book_name_heb)
                    en_name = heb_to_en.get(book_key, '')
                    if not en_name:
                        for heb_stripped, en in heb_to_en.items():
                            if book_key in heb_stripped or heb_stripped in book_key:
                                en_name = en
                                break
                    actual_page = self.book_pages.get(en_name, 0)
                    page_num_heb = int_to_heb(actual_page) if actual_page > 0 else ''
                    c.setFont('David-Bold', TOC_SIZE)
                    name_d = bidi(book_name_heb)
                    name_w = c.stringWidth(name_d, 'David-Bold', TOC_SIZE)
                    c.drawRightString(rx_t, y, bidi(name_d))
                    c.setFont('David', TOC_SIZE)
                    pg_d = bidi(page_num_heb)
                    pg_w = c.stringWidth(pg_d, 'David', TOC_SIZE)
                    c.drawString(lm_t, y, bidi(pg_d))
                    ls = lm_t + pg_w + 5
                    le = rx_t - name_w - 5
                    if le > ls:
                        dots = ''
                        while c.stringWidth(dots + ' .', 'David', TOC_SIZE) < (le - ls):
                            dots += ' .'
                        mid = ls + (le - ls) / 2
                        dw2 = c.stringWidth(dots, 'David', TOC_SIZE)
                        c.drawString(mid - dw2 / 2, y, dots)
                    y -= TOC_LINE
        except:
            pass

    def build(self):
        verses = load_verses()
        headings_heb = load_headings_heb()
        headings_en = load_headings_en()
        colophons_heb = load_colophons()

        current_book = ''
        current_chapter = 0

        # Title page — all on one page
        self._fm_new_page()
        c = self.c

        # Top section — title and subtitle centered upper third
        y_top = PAGE_H * 0.7
        c.setFont('David-Bold', 24)
        t1 = bidi("סֵפֶר מוֹרְמוֹן")
        c.drawString(PAGE_W / 2 - c.stringWidth(t1, 'David-Bold', 24) / 2, y_top, t1)
        y_top -= 28
        c.setFont('David', 14)
        t2 = bidi("עֵדוּת אַחֶרֶת לְיֵשׁוּעַ הַמָּשִׁיחַ")
        c.drawString(PAGE_W / 2 - c.stringWidth(t2, 'David', 14) / 2, y_top, t2)

        # Bottom section — translator and edition centered lower third
        y_bot = PAGE_H * 0.3
        c.setFont('David', 12)
        t3 = bidi("תרגם ללשון המקרא בידי")
        c.drawString(PAGE_W / 2 - c.stringWidth(t3, 'David', 12) / 2, y_bot, t3)
        y_bot -= 18
        c.setFont('David-Bold', 13)
        t4 = bidi("כריס לאמב")
        c.drawString(PAGE_W / 2 - c.stringWidth(t4, 'David-Bold', 13) / 2, y_bot, t4)
        y_bot -= 22
        c.setFont('David', 11)
        t5 = bidi("מהדורה עברית ראשונה  · תשפ״ו")
        c.drawString(PAGE_W / 2 - c.stringWidth(t5, 'David', 11) / 2, y_bot, t5)
        y_bot -= 16
        c.setFont('David', 10)
        t6 = "Hebrew \u2014 English Edition"
        c.drawString(PAGE_W / 2 - c.stringWidth(t6, 'David', 10) / 2, y_bot, t6)

        # Blank page after title
        self._fm_new_page()

        # Front matter (skip first 2 sections — they were the title page content)
        self.render_front_matter(skip=2)

        # Finalize last front matter page
        self.c.showPage()
        self.phys_page += 1

        # Ensure content starts on a right-side page (odd physical page for RTL)
        # In RTL books, the "front" of the book is the right side = odd physical pages
        if self.phys_page % 2 == 0:
            # Add a blank page to push content to odd physical page
            self.c.showPage()
            self.phys_page += 1

        self.is_front_matter = False
        self.page_num = 0

        for v in verses:
            book = v['book']
            chapter = v['chapter']
            verse = v['verse']
            heb = v.get('hebrew', '')
            en = v.get('english', '')

            if not heb or not en:
                continue

            # New book
            if book != current_book:
                current_book = book
                self.current_book = book
                self.render_book_title(book)
                self.render_colophon(book, colophons_heb)
                current_chapter = 0

            # New chapter
            if chapter != current_chapter:
                current_chapter = chapter
                self.current_chapter = chapter
                key = f"{book} {chapter}"
                h_heb = headings_heb.get(key, '')
                h_en = headings_en.get(key, '')
                self.render_chapter_heading(book, chapter, h_heb, h_en)

            self.page_book = book
            self.page_chapter_last = chapter
            if self.page_verse_first == 0:
                self.page_verse_first = verse
                self.page_chapter_first = chapter
            self.page_verse_last = verse

            self.render_verse(verse, heb, en)

        # Final page furniture
        self._draw_header_footer()
        self.c.save()
        print(f"PDF saved: {self.page_num} pages")


if __name__ == '__main__':
    out = 'C:/Users/chris/Desktop/Hebrew_English_BOM.pdf'
    import tempfile, shutil

    # Pass 1: dry run to calculate book page numbers
    print("Pass 1: calculating page numbers...")
    tmp = tempfile.mktemp(suffix='.pdf')
    pdf1 = DualBomPdf(tmp)
    pdf1.build()
    book_pages = dict(pdf1.book_pages)
    try:
        os.remove(tmp)
    except:
        pass

    # Pass 2: real generation with correct TOC
    print("Pass 2: generating final PDF...")
    pdf2 = DualBomPdf(out)
    pdf2.book_pages = book_pages  # pre-fill with correct page numbers
    pdf2.build()
    print(f"Done! -> {out}")
