# Claude Code Task: Update Logo Usage to Transparent Rounded Variants

## Context
New logo variants have been generated and placed in:
`client/public/images/logos/`

Available logo files:
- `regencivics-logo-dark.png` — original dark (black bg)
- `regencivics-logo-light.png` — original light (white bg)
- `regencivics-logo-dark-rounded.png` — dark bg, app-icon rounded corners
- `regencivics-logo-dark-transparent.png` — black bg removed, gold details, square
- `regencivics-logo-dark-transparent-rounded.png` — black bg removed, gold details, rounded corners ✨ PREFERRED
- `regencivics-logo-light-rounded.png` — white bg, app-icon rounded corners
- `regencivics-logo-light-transparent.png` — white bg removed, gold details, square
- `regencivics-logo-light-transparent-rounded.png` — white bg removed, gold details, rounded corners ✨ PREFERRED

## Task

### 1. SiteFooter (`client/src/components/SiteFooter.tsx`)
The footer currently uses:
```tsx
src="/images/logos/regencivics-logo-light.png"
```
Replace with the transparent rounded variant and size it up a bit so the logo reads well against the dark footer background:
```tsx
src="/images/logos/regencivics-logo-dark-transparent-rounded.png"
className="h-14 w-14 object-contain"
```
> Use the **dark** transparent-rounded version here because the footer has a dark background (#1a472a / deep forest green). The dark logo has gold+green artwork that pops on dark backgrounds.

### 2. Navigation (`client/src/components/Navigation.tsx`)
The nav currently loads logos from the assets CDN:
```tsx
src="https://assets.regencivics.earth/DUOLILquhPlWMUAF.png"  // mobile
src="https://assets.regencivics.earth/MlOLFSvIBeiOvIFd.png"  // desktop
```
Switch both to local transparent-rounded variants:
```tsx
// Mobile (md:hidden)
src="/images/logos/regencivics-logo-dark-transparent-rounded.png"
className="w-10 h-10 object-contain md:hidden"

// Desktop (hidden md:block)
src="/images/logos/regencivics-logo-dark-transparent-rounded.png"
className="w-10 h-10 object-contain hidden md:block"
```
> Both nav logos use the same file since they're the same logo at different breakpoints. The nav background is dark so the dark transparent-rounded version is correct.

### 3. General Rule for All Other Logo Usage
Search the codebase for any other `<img>` tags or logo references using the old filenames:
- `regencivics-logo-dark.png`
- `regencivics-logo-light.png`
- Any CDN URL pointing to the old logo assets

**Replacement logic:**
- On **dark backgrounds** → use `regencivics-logo-dark-transparent-rounded.png`
- On **light backgrounds** → use `regencivics-logo-light-transparent-rounded.png`
- If background is unknown or mixed → prefer `regencivics-logo-dark-transparent-rounded.png` (it has the richest contrast)
- Only use the non-rounded (`-transparent.png`) variants if the logo appears in a context where rounded corners would look wrong (e.g. inside a circle avatar component that already clips it)

### 4. After Making Changes
Run a quick search to confirm no old logo references remain:
```
grep -r "regencivics-logo-dark\.png\|regencivics-logo-light\.png\|DUOLILquhPlWMUAF\|MlOLFSvIBeiOvIFd" client/src/
```
Then commit:
```
git add -A
git commit -m "feat: switch all logos to transparent-rounded variants"
git push
```
