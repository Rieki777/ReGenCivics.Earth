#!/usr/bin/env python3
"""
Truncation audit for source files.

Walks client/src, server/, shared/, drizzle/, scripts/ and flags any file that
appears to be cut off mid-statement. The rule: after stripping trailing NUL
bytes and whitespace, the last real character must be a closing character
({`}`, `)`, `]`, `;`, `,`, `` ` ``). Any alphanumeric ending is truncation.

Run this:
  - After any multi-file Write or Edit batch
  - Before marking any fix batch complete
  - As part of pre-commit if you want belt-and-suspenders

Exit code:
  0 = clean
  1 = truncations found (prints paths)

Usage:
  python3 scripts/audit-truncation.py
  python3 scripts/audit-truncation.py --fix          # restore truncated files from HEAD
  python3 scripts/audit-truncation.py --clean-nul    # strip trailing NUL bytes from non-truncated files
  python3 scripts/audit-truncation.py --json         # machine-readable output
"""
import os
import sys
import subprocess
import json

TARGET_DIRS = ["client/src", "server", "shared", "drizzle", "scripts"]
EXTS = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")

# Files that are intentional stubs ending with a comment, not truncated
INTENTIONAL_STUBS = {
    "client/src/_core/hooks/usePrivyAuth.ts",
    "client/src/_core/providers/PrivyAuthProvider.tsx",
    "server/_core/privy.ts",
}


def classify(path: str):
    try:
        with open(path, "rb") as f:
            raw = f.read()
    except FileNotFoundError:
        return None

    if not raw.strip():
        return None

    stripped = raw.rstrip(b"\x00 \t\r\n")
    if not stripped:
        return None

    last = stripped[-1:].decode("utf-8", errors="replace")

    if last.isalnum() or last == "_":
        ctx = stripped[-80:].decode("utf-8", errors="replace")
        return ("TRUNCATED", f"ends with {last!r} | ...{ctx!r}")

    # Unclosed quote in JSX attribute ("" not followed by /> or >)
    if last in ("'", '"'):
        tail = stripped[-10:].decode("utf-8", errors="replace")
        # If this is `"foo"` at end of line, and there's nothing after, suspicious
        ctx = stripped[-80:].decode("utf-8", errors="replace")
        # Legit case: ends with export default 'foo' but usually has a semicolon
        return ("SUSPICIOUS", f"ends with {last!r} | ...{ctx!r}")

    return None


def restore_from_head(path: str) -> bool:
    try:
        result = subprocess.run(
            ["git", "show", f"HEAD:{path}"],
            capture_output=True,
            check=True,
        )
        if not result.stdout.strip():
            return False
        with open(path, "wb") as f:
            f.write(result.stdout)
        return True
    except subprocess.CalledProcessError:
        return False


def clean_nul_trailing(path: str) -> int:
    """If file has ONLY trailing NUL bytes, strip them. Return bytes stripped,
    or -1 if file had embedded NULs (don't touch), 0 if no NULs."""
    try:
        with open(path, "rb") as f:
            data = f.read()
    except FileNotFoundError:
        return 0
    if b"\x00" not in data:
        return 0
    stripped_only_nul = data.rstrip(b"\x00")
    if b"\x00" in stripped_only_nul:
        # NUL bytes embedded, don't touch
        return -1
    # NUL bytes are only trailing, safe to strip
    removed = len(data) - len(stripped_only_nul)
    with open(path, "wb") as f:
        f.write(stripped_only_nul)
    return removed


def main():
    args = sys.argv[1:]
    fix_mode = "--fix" in args
    clean_nul = "--clean-nul" in args
    json_mode = "--json" in args

    truncated = []
    suspicious = []
    total = 0
    cleaned = []
    embedded_nul = []

    for d in TARGET_DIRS:
        if not os.path.isdir(d):
            continue
        for root, _dirs, files in os.walk(d):
            if any(seg in root for seg in ("node_modules", "dist", "build", ".next")):
                continue
            for f in files:
                if not f.endswith(EXTS):
                    continue
                path = os.path.join(root, f).replace("\\", "/")
                if path in INTENTIONAL_STUBS:
                    continue
                total += 1
                result = classify(path)
                if result:
                    severity, detail = result
                    if severity == "TRUNCATED":
                        truncated.append((path, detail))
                    else:
                        suspicious.append((path, detail))
                if clean_nul:
                    removed = clean_nul_trailing(path)
                    if removed > 0:
                        cleaned.append((path, removed))
                    elif removed == -1:
                        embedded_nul.append(path)

    if json_mode:
        print(
            json.dumps(
                {
                    "total_scanned": total,
                    "truncated": [{"path": p, "detail": d} for p, d in truncated],
                    "suspicious": [{"path": p, "detail": d} for p, d in suspicious],
                },
                indent=2,
            )
        )
        sys.exit(1 if truncated else 0)

    print(f"Scanned {total} source files")
    print(f"  TRUNCATED: {len(truncated)}")
    print(f"  SUSPICIOUS: {len(suspicious)}")

    if truncated:
        print("\nTRUNCATED:")
        for path, detail in sorted(truncated):
            print(f"  {path}")
            print(f"    {detail}")

        if fix_mode:
            print("\nRestoring from HEAD...")
            for path, _ in truncated:
                ok = restore_from_head(path)
                print(f"  {'OK ' if ok else 'FAIL'} {path}")

    if suspicious:
        print("\nSUSPICIOUS (review manually):")
        for path, detail in sorted(suspicious):
            print(f"  {path}")
            print(f"    {detail}")

    if clean_nul:
        total_bytes = sum(r for _, r in cleaned)
        print(f"\nNUL cleanup: stripped trailing NUL bytes from {len(cleaned)} files ({total_bytes} bytes total)")
        if embedded_nul:
            print(f"  skipped (embedded NUL bytes, needs manual review):")
            for p in embedded_nul:
                print(f"    {p}")

    sys.exit(1 if truncated else 0)


if __name__ == "__main__":
    main()
