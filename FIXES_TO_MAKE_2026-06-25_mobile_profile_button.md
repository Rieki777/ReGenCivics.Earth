# Fixes to Make — 2026-06-25 — Mobile Profile Button + Sign-In Polish

Two issues from Rye's mobile screenshots. One is mostly already handled by a prior
session (the sign-in keyboard). The other is new work: a profile / sign-in button in
the top-right corner of the mobile home menu.

Read `client/src/components/mobile/MobileMoreMenu.tsx`, `client/src/components/Navigation.tsx`,
`client/src/components/AuthDialog.tsx`, and `client/src/components/ui/dialog.tsx` before starting.

---

## Fix 1 — Top-right profile / Sign-In button on the mobile home menu (High)

**Status:** CODED (needs build)

**Symptom:** On mobile, the full-screen home menu (the screen with "Jump to anything",
the music strip, "Start your first quest", and the PLAY cards) has only an X close
button in the top corner. There is no way to reach your profile or sign in from here.

Rye wants the top-right corner to be a profile control:
- Signed in: a floating profile picture (the user's avatar). Tapping it goes to `/profile`.
- Signed out: a large golden "Sign In" button that opens the auth dialog.

**Root cause:** `MobileMoreMenu.tsx` renders a single close button at `top-4 right-4`
and never reads auth state. It does not import `useAuth`, the profile query, or `AuthDialog`.

**Fix (in `client/src/components/mobile/MobileMoreMenu.tsx`):**

1. Move the existing X close button from the top-right to the **top-left** (`top-4 left-4`),
   keeping its current circular style. This frees the top-right for the profile control.

2. Add the auth-aware control in the **top-right** of the header band (`absolute top-4 right-4 z-10`).
   Reuse the exact pattern already in `Navigation.tsx` so it stays consistent:

   - Read auth: `const { user, isAuthenticated, loading } = useAuth();`
     (import from `@/_core/hooks/useAuth`)
   - Read avatar: `const { data: userProfile } = trpc.userProfiles.getMe.useQuery(undefined, { enabled: !!user && isAuthenticated, staleTime: 300_000 });`
     then `const avatarUrl = userProfile?.avatarUrl;`
   - `cdnImg` from `@/lib/utils`, `trpc` from `@/lib/trpc`.

   Rendering logic:
   - `loading` → a small pulsing circle placeholder (`w-10 h-10 rounded-full bg-[#7dd87d]/20 animate-pulse`).
   - `isAuthenticated && user` → a circular avatar button. If `avatarUrl`, render
     `<img src={cdnImg(avatarUrl, 64)} ... className="w-10 h-10 rounded-full object-cover ring-2 ring-[#7dd87d]/60 shadow-lg" />`
     with the same `onError` fallback used in `Navigation.tsx` (hide img, reveal the initial
     bubble). Fallback bubble: `w-10 h-10 rounded-full bg-[#7dd87d] text-[#1a472a] font-bold`
     showing `user.name?.charAt(0).toUpperCase() || 'U'`. On click: `onClose()` then navigate
     to `/profile` (use `window.location.href = '/profile'`, matching Navigation, or a wouter
     `Link` wrapping the avatar with `onClick={onClose}`).
   - signed out → a golden Sign In button:
     `className="flex items-center gap-1.5 bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-4 py-2 text-sm shadow-lg"`,
     `style={{ fontFamily: 'var(--font-accent)' }}`, with a `LogIn` icon (lucide). On click:
     open `AuthDialog`.

3. Wire `AuthDialog`:
   - Import `AuthDialog` from `@/components/AuthDialog`.
   - Add `const [authDialogOpen, setAuthDialogOpen] = useState(false);`
   - The Sign In button sets `setAuthDialogOpen(true)`. Do **not** call `onClose()` first,
     or the menu unmounts and takes the dialog with it. Keep the menu mounted and render
     `<AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} onLogin={() => {}} title="Welcome to ReGen Civics" />`
     at the end of the component, inside the menu root.

**Accessibility:** the avatar button needs `aria-label="Your profile"`; the Sign In button
needs no extra label (text is visible); the close button keeps `aria-label="Close menu"`.

**Files changed:** `client/src/components/mobile/MobileMoreMenu.tsx`

**Evidence to capture:** screenshot of the mobile menu signed out (golden Sign In top-right)
and signed in (avatar top-right), plus `rg "useAuth|AuthDialog|getMe" client/src/components/mobile/MobileMoreMenu.tsx`.

---

## Fix 2 — Mobile sign-in keyboard overlap (High)

**Status:** CODED (already done by prior session, in the working tree, not yet deployed)

**Symptom:** On mobile, opening the sign-in dialog and tapping the email field, the
on-screen keyboard covered the form. It did not move above the keyboard, and the caret
sat below the input box.

**Root cause:** the auth dialog is a bottom sheet on mobile; the keyboard covered it.

**Fix already in the tree:**
- `client/src/components/ui/dialog.tsx` now has `visualViewport` handling that lifts the
  sheet to sit just above the keyboard on mobile only (desktop centered modal untouched).
- `client/src/components/AuthDialog.tsx` email input has an `onFocus` `scrollIntoView({ block: "center" })`
  so the field is pulled fully into view after the keyboard opens.

**One refinement to add (belt and suspenders):** `AuthDialog.tsx` still hard-codes
`w-[400px]` on `DialogContent`. On phones narrower than 400px, `tailwind-merge` replaces
the responsive `w-full` from the base bottom-sheet styles with this fixed width, so the
sheet stops being full-width and can overflow the right edge. Change `w-[400px]` to
`md:max-w-[400px]` (or `w-full md:w-[400px]`) so the mobile bottom sheet keeps its
responsive full width and only the desktop modal is capped at 400px. Verify the sheet
still looks right on desktop after the change.

**Files changed:** `client/src/components/AuthDialog.tsx` (one className edit), plus the
already-staged `dialog.tsx` and `AuthDialog.tsx` keyboard work.

**Evidence to capture:** mobile screenshot of the sign-in sheet with the keyboard open,
email field and Send button visible above the keyboard.

---

## Priority Order

1. Fix 1 — top-right profile / Sign-In button (new work)
2. Fix 2 refinement — `w-[400px]` → responsive width (small, low risk)

The rest of Fix 2 is already coded and only needs to ship.

---

## Ship Gate (run before claiming VERIFIED or DONE)

```bash
python3 scripts/audit-truncation.py
rg "ring-\[#7dd87d\]|bg-\[#7dd87d\]" client/src/components/mobile/MobileMoreMenu.tsx
pnpm typecheck
```

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Remove two stray helper files from the prior session | Working-tree cleanup the other instance flagged | `rm -f .persist_test_marker.txt client/public/images/village-map-scroll-portrait.backup.webp` |
| 2 | Commit + push all staged + new edits | Claude Code may hold `index.lock`; deploy is yours | `git add -A && git commit -m "fix(mobile): top-right profile/sign-in button + auth sheet width" && git push` |
| 3 | Confirm the Railway deploy succeeded | Dashboard access | Railway dashboard |
| 4 | Verify both fixes on a real phone signed in and signed out | Real device + your account | regencivics.earth on mobile |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Add top-right profile / Sign-In button to `MobileMoreMenu.tsx` | CODED |
| 2 | Move close X to top-left | CODED |
| 3 | Wire `AuthDialog` into the mobile menu for signed-out users | CODED |
| 4 | `w-[400px]` → responsive width in `AuthDialog.tsx` | CODED |
| 5 | visualViewport keyboard lift in `dialog.tsx` + email focus-scroll | DONE (prior session) |
| 6 | Run the ship gate (audit-truncation, grep, typecheck) | TO RUN |

### WAITING ON YOU before Claude Code can proceed

Nothing blocks the code. All four items above are buildable now. Deploy and on-device
verification are yours once the build passes.
