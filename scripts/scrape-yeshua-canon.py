"""
Build yeshua_canon.md for AI Elder Yeshua from the Essene Gospel of Peace and
related Essene texts (essene.com).

This produces the SAME shape as anastasia_canon.md: a single markdown file with
`# BOOK N: <title>` book headings and `## <section>` sub-headings, paragraphs
preserved. That is what scripts/build-elder-corpus.ts (parseCanon in
server/lib/elder-corpus.ts) expects: it chunks by book/section and splits bodies
on blank lines. Do NOT flatten whitespace to single spaces; the blank lines are
load-bearing for chunk quality and citations.

His actual discourses (Gospel of Peace Books 1-4) come first as the primary
canon; the Essene teaching and context texts follow as background.

Run:
  py -m pip install requests trafilatura
  py scripts/scrape-yeshua-canon.py
Output: yeshua_canon.md in the repo root.
Then:  npx tsx scripts/build-elder-corpus.ts --file=yeshua_canon.md --elder=yeshua
"""
import hashlib
import os
import re
import time

import requests
import trafilatura

BASE_URL = "https://www.essene.com/GospelOfPeace/"

# (filename, book title). His teachings only: the Gospel of Peace discourses and
# the Essene devotional teaching texts. These are the material where Yeshua (or
# the Essene teaching tradition) speaks, which is what should ground his voice.
PAGES = [
    ("peace1.html", "The Gospel of Peace, Book One"),
    ("peace2.html", "The Gospel of Peace, Book Two: The Unknown Books of the Essenes"),
    ("peace3.html", "The Gospel of Peace, Book Three: Lost Scrolls of the Essene Brotherhood"),
    ("peace4.html", "The Gospel of Peace, Book Four: The Teachings of the Elect"),
    ("SevenFoldPeace.htm", "The Sevenfold Peace"),
    ("SevenFoldPeaceII.htm", "The Sevenfold Peace, Part Two"),
    ("SevenFoldVow.htm", "The Sevenfold Vow"),
    ("TheHolyStreams.htm", "The Holy Streams"),
    ("VisionOfEnoch.htm", "The Vision of Enoch"),
]

# Deliberately EXCLUDED from the corpus: these are modern first-person
# scholarship and history by the translator (fasting science and clinic memoir,
# Dead Sea Scrolls history, etc.), not Yeshua's or the Essene teaching voice.
# Including them would let retrieval feed the persona a modern first-person
# account it would then speak as its own. Add here only if that changes.
CONTEXT_PAGES_EXCLUDED = [
    ("fasting.html", "The Essene Science of Fasting"),
    ("FromEnochToDeadSeaScrolls.html", "From Enoch to the Dead Sea Scrolls"),
    ("BanusTheEssene.htm", "Banus the Essene"),
    ("EsseneMoses.htm", "Essene Moses"),
    ("EsseneRevelation.htm", "Essene Revelation"),
]

OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "yeshua_canon.md")
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; regen-civics-canon/1.0)"}


# Publisher/store boilerplate to remove. Also strips the translator + copyright
# front matter, so the corpus never carries a source name (ADR-22, option B) and
# retrieval never feeds the persona a chunk that would make it cite a source.
JUNK_LINE = re.compile(
    r"copyright|all rights reserved|biogenic society|bordeaux szekely|"
    r"\bszekely\b|printed in the united states|order a hard copy|book design by|"
    r"original hebrew and aramaic|add to cart|order now|isbn",
    re.I,
)


def strip_boilerplate(text: str) -> str:
    # The italicised translator/copyright block and the bold "Order a hard copy"
    # calls to action come through as whole blocks; remove them wholesale first.
    text = re.sub(r"\*\s*The\s+Original Hebrew.*?Reserved\s*\*", "", text, flags=re.S | re.I)
    text = re.sub(r"\*\*\s*Order a hard copy.*?\*\*", "", text, flags=re.S | re.I)
    return text


def normalize(md: str) -> str:
    """Preserve paragraph structure. Demote any heading the page carried to a
    `##` section so it nests under our `# BOOK` heading and never reads as a new
    book. Drop publisher boilerplate lines. Collapse runs of blank lines."""
    md = strip_boilerplate(md)
    out_lines = []
    for raw in md.splitlines():
        line = raw.rstrip().lstrip("\t ")
        if JUNK_LINE.search(line):
            continue
        m = re.match(r"^#{1,6}\s+(.*)$", line)
        if m:
            heading = m.group(1).strip()
            out_lines.append(f"## {heading}" if heading else "")
        else:
            out_lines.append(line)
    text = "\n".join(out_lines)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main() -> None:
    seen = set()
    failed = []
    parts = [
        "# YESHUA CANON",
        "",
        "A working canon for AI Elder Yeshua, drawn from the Essene Gospel of Peace",
        "and related Essene teaching texts. His discourses (Books One to Four) come",
        "first as the primary canon; the teaching and context texts follow.",
        "",
        "---",
        "",
    ]
    written = 0
    book_no = 0

    for filename, title in PAGES:
        url = BASE_URL + filename
        print(f"Fetching: {url}")
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            resp.encoding = resp.apparent_encoding
            resp.raise_for_status()
            body = trafilatura.extract(
                resp.text,
                output_format="markdown",
                include_formatting=True,
                include_tables=True,
                favor_recall=True,
            )
            if not body or len(body.strip()) < 80:
                print(f"  WARNING: little/no text from {filename}")
                failed.append((filename, "empty extraction"))
                continue
            body = normalize(body)
            h = hashlib.md5(body.encode("utf-8")).hexdigest()
            if h in seen:
                print(f"  SKIPPED duplicate: {filename}")
                continue
            seen.add(h)
            book_no += 1
            parts.append(f"# BOOK {book_no}: {title.upper()}")
            parts.append("")
            parts.append(body)
            parts.append("")
            written += 1
            print(f"  OK ({len(body)} chars)")
        except requests.RequestException as e:
            print(f"  ERROR {url}: {e}")
            failed.append((filename, str(e)))
        time.sleep(1)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(parts) + "\n")

    print(f"\nWrote {written}/{len(PAGES)} books to {OUTPUT_FILE}")
    if failed:
        print("Failed pages:")
        for name, why in failed:
            print(f"  - {name}: {why}")


if __name__ == "__main__":
    main()
