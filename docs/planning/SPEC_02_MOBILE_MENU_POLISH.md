# SPEC 02: Mobile Menu Polish (Radial Menu + Logo Swap)

**Status:** READY FOR CLAUDE CODE
**Source:** Screenshots 1 and 3 from Rye's April 17 walkthrough
**Priority:** High (first-impression on mobile)
**Estimated effort:** 2 to 3 hours

---

## 1. Goals in plain language

### Fix A: Radial menu button spacing (screenshot 1)
The Wizard Radial Menu currently fans 5 buttons into too-tight an arc. Adjacent buttons visibly overlap. Widen the arc and push the radius outward so each button has breathing room and is tappable without accidentally hitting a neighbor.

### Fix B: More menu header logo swap (screenshot 3)
The More menu currently shows the `TreeOfLifeIcon` at the top. Replace it with the main ReGen Civics logo (the one used in the footer). Rye calls this the "Phenix logo" in conversation. It is the green circular mark with the bird and tree. Use the existing asset from `client/public/images/logos/`.

---

## 2. Fix A: Radial menu geometry

### 2.1 File

`client/src/components/mobile/WizardRadialMenu.tsx`

### 2.2 Current geometry (lines 57 to 64)

```tsx
<div className="absolute bottom-14 right-0 w-36 h-36 pointer-events-none">
  {ACTIONS.map((a, i) => {
    const angle = (180 + (i / (ACTIONS.length - 1)) * 90) * (Math.PI / 180);
    const radius = 92;
    const cx = 72;
```

- Arc: 90 degrees (180 to 270)
- Radius: 92 px
- Container: 144 x 144 px (w-36 h-36)
- Button: 44 x 44 px (w-11 h-11)

With 5 buttons at 90 deg, spacing between centers is 22.5 deg of arc. At radius 92 that is an arc length of about 36 px between centers, so buttons with a 44 px diameter visibly overlap.

### 2.3 New geometry

Change to:
- Arc: 135 degrees (sweep from 180 to 315)
- Radius: 110 px
- Container: 208 x 208 px (w-52 h-52)
- Keep button size at 44 x 44 px

Arc length between centers becomes about 65 px, giving 21 px gap between buttons.

```tsx
<div className="absolute bottom-14 right-0 w-52 h-52 pointer-events-none">
  {ACTIONS.map((a, i) => {
    const angle = (180 + (i / (ACTIONS.length - 1)) * 135) * (Math.PI / 180);
    const radius = 110;
    const cx = 104; // half of 208
    const x = Math.cos(angle) * radius + cx;
    const y = Math.sin(angle) * radius + cx;
```

### 2.4 Center value math

`cx` must be half of the container width. With the container now 208 px (w-52 in Tailwind), `cx = 104`. Keep `cy = cx` because container is square.

### 2.5 Button offset

The button is 44 px (w-11), so half is 22. Keep:

```tsx
const style = { left: x - 22, top: y - 22 };
```

### 2.6 Visual check values

For 5 buttons, with new math:

| i | angle (deg) | x rel to center | y rel to center |
|---|------------|-----------------|-----------------|
| 0 | 180 | -110 | 0 |
| 1 | 213.75 | -91.4 | -61.1 |
| 2 | 247.5 | -42.1 | -101.6 |
| 3 | 281.25 | 21.4 | -107.9 |
| 4 | 315 | 77.8 | -77.8 |

Wait, those y offsets are flipped. The angle starts at 180 (pointing left) and sweeps through 270 (pointing up) to 315 (pointing up-right). Since the screen y-axis increases downward, `sin(270 deg) = -1`, which correctly moves the button above `cy`. Good.

Final check: button 4 (index 4) ends at (x=77.8, y=-77.8) relative to center. With `cx = 104`, it renders at (181.8, 26.2). With the container at bottom-right, that button is up-and-right of the Flower of Life trigger. Confirms the arc fans away from the trigger, not toward it.

### 2.7 Avoid arc clipping

The container is positioned `absolute bottom-14 right-0 w-52 h-52`. Bottom-14 is 56 px above the trigger's baseline. With container height 208, the top of the container sits 264 px above the trigger. On small viewports (e.g. iPhone SE at 568 px viewport height with a bottom nav), that is still inside the viewport. Verify during QA.

If clipping occurs on very short viewports, reduce arc to 120 deg and radius to 100 px as a fallback. Document the chosen values in a comment.

### 2.8 Implementation steps

1. Change `w-36 h-36` to `w-52 h-52`.
2. Change `const radius = 92` to `const radius = 110`.
3. Change `const cx = 72` to `const cx = 104`.
4. Change the arc multiplier from `90` to `135`.
5. No changes to button, label, or action logic.

### 2.9 Acceptance criteria (Fix A)

- [ ] All 5 buttons are visually separated with clear gaps.
- [ ] No two buttons overlap on any viewport from 320 px wide to 480 px wide.
- [ ] The arc does not clip above the viewport at 568 px viewport height.
- [ ] Tap targets are still 44x44.
- [ ] Animation (if present) feels smooth. No layout thrash on open.
- [ ] Focus ring visible on each button when tabbed.

---

## 3. Fix B: More menu header logo

### 3.1 File

`client/src/components/mobile/MobileMoreMenu.tsx`

### 3.2 Current state (line 83)

```tsx
<TreeOfLifeIcon size={56} color={tint.primary} />
```

### 3.3 Target asset

Use `client/public/images/logos/regencivics-logo-light-transparent-rounded.webp`. This is the light version, which reads best on the dark green header band.

If the light version looks off against the seasonal gradient in testing, fall back to the dark version: `regencivics-logo-dark-transparent-rounded.webp`.

### 3.4 Replacement code

Replace the `TreeOfLifeIcon` line with:

```tsx
<img
  src="/images/logos/regencivics-logo-light-transparent-rounded.webp"
  alt="ReGen Civics"
  width={72}
  height={72}
  className="rounded-full shadow-lg"
  loading="eager"
  decoding="async"
/>
```

Reasoning for each attribute:
- `width`/`height` are set explicitly to prevent layout shift (CLS).
- `alt="ReGen Civics"` pairs with the H2 text below. Screen readers get both, which is acceptable because the text label augments the visual logo.
- `loading="eager"` because the logo is above the fold on a user-triggered overlay.
- `rounded-full` matches the existing rounded logo asset style.

### 3.5 Remove unused import (if `TreeOfLifeIcon` is no longer used in this file)

Check: is `TreeOfLifeIcon` imported elsewhere in `MobileMoreMenu.tsx`? Grep the file. If only used in the header, remove the import:

```tsx
// Remove this line if no other usage in the file:
import { TreeOfLifeIcon } from "@/components/icons/TreeOfLifeIcon";
```

### 3.6 Do not touch

- `WizardRadialMenu.tsx` still uses `TreeOfLifeIcon` for the "Next quest" action. Leave that.
- The footer already uses the dark logo. Leave that.
- Do not rename `TreeOfLifeIcon`. It still has usages around the site.

### 3.7 Acceptance criteria (Fix B)

- [ ] Opening the mobile More menu shows the ReGen Civics logo at the top instead of the Tree of Life icon.
- [ ] Logo is 72 x 72 px, rounded.
- [ ] Logo does not cause a visible layout shift (CLS under 0.01 on this overlay).
- [ ] Screen reader announces "ReGen Civics" once (via the img `alt`), then the H2 with the same text. Acceptable given visual vs text label pairing.
- [ ] No console errors about the asset path.

---

## 4. Testing checklist (manual)

1. `npm run dev`, open in mobile emulation (iPhone 12 Pro, 390x844).
2. Tap the Flower of Life floating button. Observe all 5 radial buttons are spaced apart.
3. Try tapping each. No accidental adjacent triggers.
4. Tap the More button in the bottom nav. Observe the ReGen Civics logo at the top of the overlay.
5. Repeat on iPhone SE (375x667).
6. Repeat on Pixel 5 (393x851).
7. Run `npm run check`. Run `npm run build`.

---

## 5. Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| P1 | Visual approval on real iOS device | Hardware touch feel differs from emulator | Open on iPhone |
| P2 | Confirm "light" vs "dark" logo variant reads better against seasonal gradient | Taste call | Compare both |
| P3 | Deploy | Railway | `git push origin main` |

### CLAUDE CODE: can be done without you

| # | Task | Status |
|---|------|--------|
| P4 | Update `WizardRadialMenu.tsx` geometry (arc, radius, container size, cx) | CODED PENDING |
| P5 | Add inline comment documenting the chosen arc/radius values | CODED PENDING |
| P6 | Replace `TreeOfLifeIcon` in `MobileMoreMenu.tsx` header with the ReGen Civics logo `<img>` | CODED PENDING |
| P7 | Remove unused `TreeOfLifeIcon` import if no other usage in that file | CODED PENDING |
| P8 | `npm run check`, `npm run build` | VERIFIED PENDING |
| P9 | Manual emulation testing from section 4 | VERIFIED PENDING |

### WAITING ON YOU before Claude Code can proceed

None.
