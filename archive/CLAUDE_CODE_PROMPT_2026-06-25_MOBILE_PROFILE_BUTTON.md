# Claude Code Prompt — Mobile Profile Button + Sign-In Polish (2026-06-25)

Work from `FIXES_TO_MAKE_2026-06-25_mobile_profile_button.md`. A prior mobile session left
edits staged in the working tree (auth keyboard handling in `dialog.tsx` and `AuthDialog.tsx`,
plus a few unrelated items). Keep those. Run `git status` first to see the current state.

## Task 1 — Top-right profile / Sign-In button on the mobile home menu

File: `client/src/components/mobile/MobileMoreMenu.tsx`

The full-screen mobile menu currently shows only an X close button in the top-right of the
header band. Rye wants the top-right corner to be a profile control instead:

- Signed in: a floating circular avatar (the user's profile picture). Tap goes to `/profile`.
- Signed out: a large golden "Sign In" button that opens the auth dialog.

Do this:

1. Move the existing close X button from `top-4 right-4` to `top-4 left-4`. Keep its circular
   `bg-black/30 backdrop-blur` style and `aria-label="Close menu"`.

2. Add an auth-aware control at `absolute top-4 right-4 z-10` in the header band. Reuse the
   pattern from `Navigation.tsx` (the desktop "Sign In / User Dropdown" block) so it stays
   consistent:
   - `import { useAuth } from "@/_core/hooks/useAuth";`
   - `import { trpc } from "@/lib/trpc";`
   - `import { cdnImg } from "@/lib/utils";`
   - `import { AuthDialog } from "@/components/AuthDialog";`
   - `import { LogIn } from "lucide-react";` (add to the existing lucide import)
   - Inside the component:
     ```ts
     const { user, isAuthenticated, loading } = useAuth();
     const { data: userProfile } = trpc.userProfiles.getMe.useQuery(undefined, {
       enabled: !!user && isAuthenticated,
       staleTime: 300_000,
     });
     const avatarUrl = userProfile?.avatarUrl;
     const [authDialogOpen, setAuthDialogOpen] = useState(false);
     ```
   - Render:
     - `loading` → `<div className="w-10 h-10 rounded-full bg-[#7dd87d]/20 animate-pulse" />`
     - `isAuthenticated && user` → an avatar button (`aria-label="Your profile"`). If
       `avatarUrl`, an `<img src={cdnImg(avatarUrl, 64)} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#7dd87d]/60 shadow-lg" />`
       with the same `onError` fallback used in `Navigation.tsx` (hide the img, reveal the
       sibling initial bubble). Fallback bubble:
       `w-10 h-10 rounded-full bg-[#7dd87d] flex items-center justify-center text-[#1a472a] font-bold`
       showing `user.name?.charAt(0).toUpperCase() || 'U'`. On click: `onClose()` then
       `window.location.href = '/profile'`.
     - signed out → golden Sign In button:
       `className="flex items-center gap-1.5 bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] font-bold rounded-full px-4 py-2 text-sm shadow-lg"`,
       `style={{ fontFamily: 'var(--font-accent)' }}`, a `<LogIn className="w-4 h-4" />`
       and the label "Sign In". On click: `setAuthDialogOpen(true)` (do NOT call `onClose()`
       here, or the dialog unmounts with the menu).

3. Render `<AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} onLogin={() => {}} title="Welcome to ReGen Civics" />`
   at the end of the menu root so it stays mounted while the menu is open.

## Task 2 — Auth dialog responsive width

File: `client/src/components/AuthDialog.tsx`

The `DialogContent` className hard-codes `w-[400px]`. On phones narrower than 400px this
defeats the base bottom-sheet `w-full` (tailwind-merge keeps the fixed width), so the sheet
overflows. Change `w-[400px]` to `md:max-w-[400px]` (keep everything else). Confirm the
desktop modal still caps at ~400px and the mobile sheet is full-width.

## Verify before claiming DONE

```bash
python3 scripts/audit-truncation.py
rg "ring-\[#7dd87d\]|AuthDialog|getMe" client/src/components/mobile/MobileMoreMenu.tsx
pnpm typecheck
```

Then build and take mobile-width screenshots of the menu signed out (golden Sign In top-right),
signed in (avatar top-right), and the sign-in sheet with the keyboard open. Update the
Handoff Breakdown in the fixes doc with evidence (file:line + screenshot paths). Do not mark
anything VERIFIED without a passing typecheck and a screenshot.

## Writing rules

No em-dashes anywhere. No "this is not X, it's Y" framing. Plain, direct copy in Rye's voice.

## Commit (Rye runs the push)

Leave the tree ready. Suggested message:
`fix(mobile): top-right profile/sign-in button on home menu + responsive auth sheet width`
