#!/usr/bin/env python3
"""
audit-tap-blockers: find invisible elements that eat taps on touch devices.

The bug class (shipped 2026-07-17 as the WizardRadialMenu dead zone): an
element is visually hidden with opacity-0 / scale-0 but stays MOUNTED, so it
(or a transparent positioned ancestor) still hit-tests and swallows taps.
Desktop testing never catches these when the element is mobile-only
(md:hidden), and static "is there an overlay" review misses them because the
element is invisible in every screenshot. Symptom in production: a region of
the phone screen where buttons silently do nothing.

Two checks:

STRONG (exit 1): a className contains `opacity-0` (element invisible but
  mounted) with no `pointer-events-none`, `hidden`, or `invisible` anywhere
  in the same className expression. opacity-0 keeps the full hit-box;
  visibility/display removal do not.

WARN (exit 0): a className creates a transparent positioned wrapper --
  `fixed` or `absolute` with a directional pin, layout (flex/grid), no
  background, and no pointer-events-none. These are the containers that
  swallow taps that fall through pointer-events-none children (the exact
  WizardRadialMenu failure). Human judgment needed: a wrapper that exactly
  hugs its visible content is fine; one taller/wider than its visible
  content is a dead zone.

Suppress a finding by putting `tap-audit-ok` in a comment on the same line
or the line above (do this only after checking the element's real hit-box
on a phone-sized viewport).

Usage: py scripts/audit-tap-blockers.py [--warn-only]
Scans client/src/**/*.tsx relative to the repo root (cwd).
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path("client/src")
ALLOW = "tap-audit-ok"

# Pull each className attribute expression, tolerating multiline template
# literals: capture from `className=` to the closing quote/brace at the same
# nesting level, capped at 800 chars so a missed close can't eat the file.
CLASSNAME_RE = re.compile(
    r'className=\s*(?:"([^"]{0,800})"'
    r"|'([^']{0,800})'"
    r"|\{`([^`]{0,800})`\}"
    r"|\{([^{}]{0,800}(?:\{[^{}]*\}[^{}]*){0,6})\})",
    re.DOTALL,
)

# Bare opacity-0 only: `md:opacity-0` (visible on mobile, hover-reveal on
# desktop) and data-variant prefixes are mouse-only concerns, not tap traps.
STRONG_TOKEN = re.compile(r"(?<![\w:\]-])opacity-0(?![\w.])")
NEUTRALIZERS = re.compile(r"pointer-events-none|(?<![\w-])hidden(?![\w-])|(?<![\w-])invisible(?![\w-])|sr-only")
# A collapsed accordion (max-h-0 + overflow-hidden) has a zero-height hit-box.
CLIPPED = re.compile(r"overflow-hidden")
CLIPPED_H = re.compile(r"(?<![\w-])max-h-0(?![\w.])")
# Elements of 18px or less cannot create a meaningful dead zone.
TINY = re.compile(r"(?<![\w-])(?:h|w|size)-[1-4](?:\.5)?(?![\d.])")
POSITIONED_ANY = re.compile(r"(?<![\w-])(fixed|absolute)(?![\w-])")
TAG_START = re.compile(r"<([A-Za-z][\w.]*)")
POSITIONED = re.compile(r"(?<![\w-])(fixed|absolute)(?![\w-])")
PINNED = re.compile(r"(?<![\w-])(inset-|top-|bottom-|left-|right-)")
LAYOUT = re.compile(r"(?<![\w-])(flex|grid)(?![\w-])")
BACKGROUND = re.compile(r"(?<![\w-])(bg-|backdrop-)")


def line_of(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1


def allowed(text: str, idx: int) -> bool:
    line_start = text.rfind("\n", 0, idx)
    prev_start = text.rfind("\n", 0, line_start) if line_start > 0 else 0
    return ALLOW in text[prev_start : text.find("\n", idx) if text.find("\n", idx) != -1 else len(text)]


def main() -> int:
    warn_only = "--warn-only" in sys.argv
    strong: list[tuple[Path, int, str]] = []
    warns: list[tuple[Path, int, str]] = []
    files = sorted(ROOT.rglob("*.tsx"))
    for f in files:
        text = f.read_text(encoding="utf-8", errors="replace")
        for m in CLASSNAME_RE.finditer(text):
            value = next(g for g in m.groups() if g is not None)
            idx = m.start()
            if allowed(text, idx):
                continue
            snippet = " ".join(value.split())[:110]
            # Skip <img>/<source>: a fading image occupies its own slot and is
            # not interactive; nothing under it is being masked.
            tags = TAG_START.findall(text[max(0, idx - 600) : idx])
            enclosing = tags[-1].lower() if tags else ""
            on_img = enclosing in ("img", "source")
            if STRONG_TOKEN.search(value) and not NEUTRALIZERS.search(value):
                if on_img:
                    continue
                if CLIPPED.search(value) and CLIPPED_H.search(value):
                    continue
                if TINY.search(value):
                    continue
                strong.append((f, line_of(text, idx), snippet))
            elif (
                POSITIONED.search(value)
                and PINNED.search(value)
                and LAYOUT.search(value)
                and not BACKGROUND.search(value)
                and not NEUTRALIZERS.search(value)
                and not TINY.search(value)
            ):
                warns.append((f, line_of(text, idx), snippet))

    print(f"Scanned {len(files)} tsx files under {ROOT}")
    if strong:
        print(f"\nSTRONG — invisible but tappable (opacity-0 without pointer-events-none): {len(strong)}")
        for f, ln, snip in strong:
            print(f"  {f}:{ln}  {snip}")
    else:
        print("\nSTRONG: 0")
    if warns:
        print(f"\nWARN — transparent positioned wrappers to eyeball on a phone viewport: {len(warns)}")
        for f, ln, snip in warns:
            print(f"  {f}:{ln}  {snip}")
    else:
        print("WARN: 0")
    if strong and not warn_only:
        print("\nFix: add pointer-events-none to the hidden state (and pointer-events-auto")
        print("to interactive children of transparent wrappers), or unmount instead of hiding.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
