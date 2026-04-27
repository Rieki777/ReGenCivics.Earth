# Readability Notes (2026-04-09)

Quick site-wide pass on text contrast for body copy and meaningful UI text. Decorative
overlays, dividers, and icon backgrounds were left alone.

## What was found

Sweeping `client/src` for the lowest-contrast text classes returned 69 files using
`text-white/20` through `text-white/40`, plus a smaller number of `text-gray-400` /
`text-slate-400` on dark backgrounds. The biggest offender by far was `text-white/30`
(112 occurrences), which is below WCAG AA on the deep-green background the site uses.

## What was changed

Bulk bump applied via a Python regex pass across `client/src/**/*.{ts,tsx}`:

| Before              | After               | Why                                                       |
|---------------------|---------------------|-----------------------------------------------------------|
| `text-white/20`     | `text-white/50`     | 20% opacity is decorative-only                            |
| `text-white/25`     | `text-white/55`     |                                                           |
| `text-white/30`     | `text-white/55`     | 30% on dark green is WCAG-fail for body copy              |
| `text-white/35`     | `text-white/60`     |                                                           |
| `text-white/40`     | `text-white/65`     | 40% is borderline; bump to safe                           |
| `text-gray-400`     | `text-gray-300`     | 400 on dark surfaces drops below ~3:1                     |
| `text-slate-400`    | `text-slate-300`    |                                                           |
| `placeholder-white/20..40` | `placeholder-white/50..60` | Same problem on form input placeholders          |
| `placeholder:text-white/20..40` | same | Tailwind v3 syntax variant                                |

Also fixed two cases where the bulk pass made `hover:text-white/60` lighter than
`text-white/55` base (so hover went *darker*). Replaced with
`text-white/55 hover:text-white` so the hover state is the brighter end-state.

Counts: **217 total class replacements across 67 files** in the bulk pass, plus
one targeted fix sweep.

## What was not changed

- Decorative overlays on hero images (intentional opacity for layered art)
- Card divider strokes (`border-white/10`, `border-white/15`)
- Icon backgrounds with explicit opacity
- The 3-4 places where `text-white/40` was used as a "muted timestamp" hint and
  the surrounding background is already dark enough

## Rule going forward

**Body copy and meaningful UI text on dark backgrounds: minimum `text-white/55`.**
Anything below that is decorative-only and should not carry information. Place a
short comment next to any intentional sub-55% use so the next pass knows to skip it.

For form inputs, the placeholder must be at least `text-white/55` so partially-typed
form fields stay readable.

Color text classes (`text-gray-X`, `text-slate-X`) should land at 300 or above on
dark surfaces, 600 or below on light surfaces.
