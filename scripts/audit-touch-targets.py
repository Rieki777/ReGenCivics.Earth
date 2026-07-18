#!/usr/bin/env python3
"""
audit-touch-targets: find interactive elements whose explicit sizing caps the
touch target below 44px with no coarse-pointer floor.

The bug class: a raw <button className="h-6 w-6"> is a 24px target. Today it
is rescued by two global rules in client/src/index.css (the max-width:767px
min-height:44px blanket, and the pointer:coarse ::after hit-area expander).
The blanket rule is transitional and gets deleted in Phase 5 of
MOBILE_FIRST_MASTER_PLAN.md, so new code must carry its own floor. The base
ui components (components/ui/button.tsx and friends) already do, via
pointer-coarse: utilities baked into their variants. This gate keeps raw
elements honest.

Checks:

STRONG (exit 1): a <button> or [role="button"] whose static className caps
  the target below 44px with no floor. Caps: h-4..h-8, size-4..size-8,
  h-[..px]/size-[..px] under 44, or p-0/p-1/p-1.5 with an icon child and no
  height class at all. Floors (any one clears the finding): pointer-coarse:,
  min-h-11+, min-w-11+, h-11+, size-11+, or arbitrary >=44px equivalents.

WARN (exit 0), human judgment needed:
  - <div>/<span>/<svg>/<img> with onClick and no role: no button semantics,
    and the index.css hit-area expander does not cover role-less elements.
  - <a> with onClick carrying small explicit sizes.
  - a <button>/[role="button"] whose className is dynamic (cn(...), template
    with ${...}) and whose literal fragments contain small caps with no
    floor anywhere in the expression. The audit cannot prove which branch
    renders, so it lists instead of failing.
  - a component (capitalized tag) with onClick whose className carries small
    caps and no floor. Fine when the component's base variants carry
    pointer-coarse floors (Button does); verify by hand.

Skips: .no-touch-extend (deliberate opt-out), disabled / aria-disabled /
aria-hidden literals (a control that never enables has no target to size),
*.test.tsx, comments, and anything carrying a `touch-ok` marker.

Suppress a reviewed finding with a {/* touch-ok: <why> */} comment on the
same line, up to 2 lines above, or inside the opening tag. Reserve it for a
<button>/[role="button"] whose small visual is intentional: the ::after
expander in index.css still gives those a 44x44 hit area. A role-less div
gets no expander, so fix those instead of suppressing.

Usage: py scripts/audit-touch-targets.py [--warn-only]
Scans client/src/**/*.tsx relative to the repo root (cwd).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path("client/src")
ALLOW = "touch-ok"
OPT_OUT = "no-touch-extend"

TAG_NAME_RE = re.compile(r"<([A-Za-z][\w.]*)")
ONCLICK_RE = re.compile(r"(?<![\w-])onClick\s*=")
ROLE_RE = re.compile(r"""(?<![\w-])role\s*=\s*(?:["']([\w-]+)["']|\{\s*["']([\w-]+)["']\s*\})""")
# Bare `disabled` / `disabled={true}` only. `disabled={expr}` is sometimes
# enabled, so it stays in scope.
DISABLED_RE = re.compile(r"(?<![\w-])disabled(?![\w-])(?:\s*=\s*\{\s*true\s*\})?(?!\s*=)")
ARIA_OFF_RE = re.compile(r"""aria-(?:hidden|disabled)\s*=\s*(?:["']true["']|\{\s*true\s*\})""")
PAD_SMALL = re.compile(r"(?<![\w:.\[-])p-(?:0|1(?:\.5)?)(?![\d.\w/])")
HAS_HEIGHT = re.compile(r"(?<![\w:.\[-])(?:h|size|min-h)-")
# An icon child: inline svg, a *Icon component, a component styled to icon
# size, or a bare self-closing component with no props (lucide usage).
ICON_CHILD = re.compile(
    r"<svg\b"
    r"|<[A-Z][\w.]*Icon\b"
    r"|<[A-Z][\w.]*[^<>]{0,200}?(?<![\w:.\[-])(?:h|w|size)-[2-6](?![\d./])"
    r"|<[A-Z][\w.]*\s*/>"
)
# Components whose base variants already carry pointer-coarse floors.
KNOWN_FLOORED = {"Button"}
# Role-less tags where onClick means missing button semantics.
NON_SEMANTIC = {"div", "span", "svg", "img"}


def mask_comments(text: str) -> str:
    """Blank comments (preserving offsets) so commented-out JSX is not
    scanned. Suppression markers are checked against the original text."""

    def blank(m: re.Match) -> str:
        return re.sub(r"[^\n]", " ", m.group(0))

    out = re.sub(r"/\*.*?\*/", blank, text, flags=re.DOTALL)
    # Line comments; the lookbehind protects :// URLs and quoted slashes.
    out = re.sub(r"""(?<![:"'\w])//[^\n]*""", blank, out)
    return out


def line_of(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1


def allowed(raw: str, start: int, end: int) -> bool:
    """touch-ok on the same line, up to 2 lines above, or inside the tag."""
    pos = start
    for _ in range(3):
        nl = raw.rfind("\n", 0, pos)
        if nl == -1:
            pos = 0
            break
        pos = nl
    line_end = raw.find("\n", end)
    if line_end == -1:
        line_end = len(raw)
    return ALLOW in raw[pos:line_end]


def read_tag(text: str, start: int):
    """Parse one JSX opening tag starting at '<'. Returns
    (tag, attrs, end_after_gt) or None. Tracks quotes and brace depth so a
    '>' inside onClick={() => ...} does not end the tag early."""
    m = TAG_NAME_RE.match(text, start)
    if not m:
        return None
    i = m.end()
    depth = 0
    quote = None
    limit = min(len(text), start + 4000)
    while i < limit:
        c = text[i]
        if quote:
            if c == "\\" and quote != "`":
                i += 1
            elif c == quote:
                quote = None
        elif c in "\"'`":
            quote = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth = max(0, depth - 1)
        elif c == ">" and depth == 0:
            return m.group(1), text[m.end() : i], i + 1
        elif c == "<" and depth == 0:
            return None  # comparison operator or malformed, bail
        i += 1
    return None


def read_classname(attrs: str):
    """Returns (static_text, full_text, dynamic) or None.
    static_text: literal fragments (classes we can prove appear).
    full_text: the whole value expression (a floor anywhere in it counts).
    dynamic: True when the value is not one plain string or plain template."""
    m = re.search(r"(?<![\w-])className\s*=\s*", attrs)
    if not m:
        return None
    i = m.end()
    if i >= len(attrs):
        return None
    c = attrs[i]
    if c in "\"'":
        j = attrs.find(c, i + 1)
        if j == -1:
            return None
        val = attrs[i + 1 : j]
        return val, val, False
    if c != "{":
        return None
    depth = 0
    quote = None
    j = i
    while j < len(attrs):
        ch = attrs[j]
        if quote:
            if ch == "\\" and quote != "`":
                j += 1
            elif ch == quote:
                quote = None
        elif ch in "\"'`":
            quote = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    expr = attrs[i + 1 : j]
    stripped = expr.strip()
    sm = re.fullmatch(r'"([^"]*)"|\'([^\']*)\'', stripped)
    if sm:
        val = sm.group(1) if sm.group(1) is not None else sm.group(2)
        return val, val, False
    tm = re.fullmatch(r"`([^`]*)`", stripped, re.DOTALL)
    if tm and "${" not in tm.group(1):
        return tm.group(1), tm.group(1), False
    frags = re.findall(r'"([^"]*)"|\'([^\']*)\'|`([^`]*)`', expr)
    static = " ".join(a or b or c3 for a, b, c3 in frags)
    static = re.sub(r"\$\{[^}]*\}", " ", static)  # code, not classes
    return static, expr, True


def scale_vals(prefix: str, s: str) -> list[float]:
    """Bare (unprefixed) scale tokens: h-6 yes, md:h-6 / max-h-6 no.
    The trailing guard rejects fractions like w-4/5."""
    pat = rf"(?<![\w:.\[-]){prefix}-(\d+(?:\.5)?)(?![\d.\w%/\]])"
    return [float(v) for v in re.findall(pat, s)]


def px_vals(prefix: str, s: str) -> list[int]:
    return [int(v) for v in re.findall(rf"(?<![\w:.-]){prefix}-\[(\d+)px\]", s)]


def measure(static_text: str, full_text: str):
    """Returns (small_h, small_w, floored)."""
    h = scale_vals("h", static_text) + scale_vals("size", static_text)
    hpx = px_vals("h", static_text) + px_vals("size", static_text)
    w = scale_vals("w", static_text) + scale_vals("size", static_text)
    wpx = px_vals("w", static_text) + px_vals("size", static_text)
    # 4..8 (16px..32px) per the gate spec; smaller values are decorative dots
    # and the like, out of scope here.
    small_h = any(4 <= v <= 8 for v in h) or any(v < 44 for v in hpx)
    small_w = any(4 <= v <= 8 for v in w) or any(v < 44 for v in wpx)
    floor_scales = (
        scale_vals("h", full_text)
        + scale_vals("size", full_text)
        + scale_vals("min-h", full_text)
        + scale_vals("min-w", full_text)
    )
    floor_px = (
        px_vals("h", full_text)
        + px_vals("size", full_text)
        + px_vals("min-h", full_text)
        + px_vals("min-w", full_text)
    )
    floored = (
        "pointer-coarse:" in full_text
        or any(v >= 11 for v in floor_scales)
        or any(v >= 44 for v in floor_px)
    )
    return small_h, small_w, floored


def small_tokens(static_text: str, include_w: bool = False) -> str:
    """The offending tokens, for the report line. w- tokens only count when
    the element also has a small height (spec: w-4..w-8 paired with small h)."""
    heads = "h|w|size" if include_w else "h|size"
    toks = re.findall(
        rf"(?<![\w:.\[-])(?:{heads})-(?:[4-8](?:\.5)?)(?![\d.\w%/\]])"
        rf"|(?<![\w:.-])(?:{heads})-\[\d+px\]",
        static_text,
    )
    keep = []
    for t in toks:
        mpx = re.search(r"\[(\d+)px\]", t)
        if mpx and int(mpx.group(1)) >= 44:
            continue
        keep.append(t)
    return " ".join(dict.fromkeys(keep))


def main() -> int:
    warn_only = "--warn-only" in sys.argv
    strong: list[tuple[Path, int, str]] = []
    warns: list[tuple[Path, int, str]] = []
    files = [f for f in sorted(ROOT.rglob("*.tsx")) if not f.name.endswith(".test.tsx")]
    for f in files:
        raw = f.read_text(encoding="utf-8", errors="replace")
        text = mask_comments(raw)
        for m in TAG_NAME_RE.finditer(text):
            start = m.start()
            parsed = read_tag(text, start)
            if not parsed:
                continue
            tag, attrs, end = parsed
            role_m = ROLE_RE.search(attrs)
            role = (role_m.group(1) or role_m.group(2)) if role_m else None
            is_button = tag == "button" or role == "button"
            has_click = bool(ONCLICK_RE.search(attrs))
            if not (is_button or has_click):
                continue
            if DISABLED_RE.search(attrs) or ARIA_OFF_RE.search(attrs):
                continue
            if allowed(raw, start, end):
                continue
            cn = read_classname(attrs)
            static_text, full_text, dynamic = cn if cn else ("", "", False)
            if OPT_OUT in full_text:
                continue
            small_h, small_w, floored = measure(static_text, full_text)
            ln = line_of(raw, start)
            snip = " ".join(static_text.split())[:96] or "(no className)"
            component = tag[0].isupper()

            if is_button:
                caps = small_tokens(static_text, include_w=True) if small_h else ""
                pad_icon = False
                pad_m = PAD_SMALL.search(static_text)
                if not caps and not floored and pad_m and not HAS_HEIGHT.search(static_text):
                    if not attrs.rstrip().endswith("/"):
                        child = text[end : end + 600]
                        close = child.find(f"</{tag}")
                        if close != -1:
                            child = child[:close]
                        pad_icon = bool(ICON_CHILD.search(child))
                if floored or not (caps or pad_icon):
                    continue
                label = tag if tag == "button" else f"{tag} role=button"
                why = caps if caps else f"{pad_m.group(0)} + icon child, no height class"
                if dynamic:
                    warns.append((f, ln, f"<{label}> [dynamic className, small caps: {why}]  {snip}"))
                else:
                    strong.append((f, ln, f"<{label}> [{why}]  {snip}"))
                continue

            # onClick elements that are not buttons
            if tag in NON_SEMANTIC and role is None:
                if "pointer-events-none" in full_text:
                    continue  # delegation wrapper, cannot take a direct tap
                warns.append((f, ln, f"<{tag} onClick> [no role, expander does not cover it]  {snip}"))
            elif tag == "a" and (small_h or small_w) and not floored:
                warns.append((f, ln, f"<a onClick> [small caps: {small_tokens(static_text, include_w=True)}]  {snip}"))
            elif component and small_h and not floored and tag not in KNOWN_FLOORED:
                warns.append((f, ln, f"<{tag} onClick> [component, verify base floor: {small_tokens(static_text, include_w=True)}]  {snip}"))

    print(f"Scanned {len(files)} tsx files under {ROOT}")
    if strong:
        print(f"\nSTRONG - touch target capped below 44px with no coarse-pointer floor: {len(strong)}")
        for f, ln, msg in strong:
            print(f"  {f}:{ln}  {msg}")
    else:
        print("\nSTRONG: 0")
    if warns:
        print(f"\nWARN - review by hand (semantics or unprovable sizing): {len(warns)}")
        for f, ln, msg in warns:
            print(f"  {f}:{ln}  {msg}")
    else:
        print("WARN: 0")
    if strong and not warn_only:
        print("\nFix: add pointer-coarse:min-h-11 pointer-coarse:min-w-11 to the element")
        print("(pattern: components/CommandPanel.tsx, components/QuestBadges.tsx). If the")
        print("small visual is intentional on a <button>/[role=button], add a")
        print("{/* touch-ok: <why> */} comment above it instead.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
