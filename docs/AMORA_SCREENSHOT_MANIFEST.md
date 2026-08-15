# Amora screenshot manifest

Captured 2026-07-16 from the live production instance at `https://amora.regencivics.earth` using headless Playwright at two viewports (desktop 1440x900, mobile 390x844). All PNGs are pngquant-compressed and resized (desktop capped at 1200px wide) to stay under ~300KB each; the site's `/api/img` resize proxy can downsize further at render time.

| Filename | Page | Viewport | Suggested alt text |
|---|---|---|---|
| amora-home-desktop-full.png | Home ("Co-Become the Most Beautiful Village") | Desktop, full page | Amora home page showing the village hero, build progress timeline, and live village pulse feed |
| amora-home-desktop-fold.png | Home hero | Desktop, above the fold | Amora home page hero: "Co-Become the Most Beautiful Village" over a Costa Rica coastline photo |
| amora-home-mobile-full.png | Home | Mobile, full page | Amora home page on mobile, full scroll from hero to footer |
| amora-home-mobile-fold.png | Home hero | Mobile, above the fold | Amora home page hero on mobile showing the choose-your-path call to action |
| amora-investor-desktop-top.png | Investor Journey (/investor) | Desktop, above the fold | Investor Journey page hero: "Invest in Regeneration" with key numbers |
| amora-investor-mobile-top.png | Investor Journey | Mobile, above the fold | Investor Journey page hero on mobile |
| amora-investor-desktop-step.png | Investor Journey, mid-page | Desktop, scrolled to step tracker | Your Investment Journey progress tracker showing staged steps from Discover Amora to Make Your Commitment |
| amora-investor-mobile-step.png | Investor Journey, mid-page | Mobile, scrolled to step tracker | Investment journey step tracker on mobile |
| amora-steward-desktop-top.png | Village Steward Journey (/steward) | Desktop, above the fold | Village Steward Journey hero: "Steward the Village" |
| amora-steward-mobile-top.png | Village Steward Journey | Mobile, above the fold | Village Steward Journey hero on mobile |
| amora-resident-desktop-top.png | Resident Journey (/resident) | Desktop, above the fold | Resident Journey hero: "Make Amora Home" |
| amora-resident-mobile-top.png | Resident Journey | Mobile, above the fold | Resident Journey hero on mobile |
| amora-prosperity-desktop-top.png | Prosperity Creator Journey (/prosperity) | Desktop, above the fold | Prosperity Creator Journey hero: "Create Regenerative Prosperity" |
| amora-prosperity-mobile-top.png | Prosperity Creator Journey | Mobile, above the fold | Prosperity Creator Journey hero on mobile |
| amora-quests-desktop.png | Quest board (/quests) | Desktop, full page | Community Quests board listing open quests with Gratitude rewards, filterable by circle and level |
| amora-quests-mobile.png | Quest board | Mobile, full page | Community Quests board on mobile |
| amora-gratitude-desktop.png | Gratitude Wall (/gratitude) | Desktop, full page | The Gratitude Wall page where members send appreciation to each other |
| amora-gratitude-mobile.png | Gratitude Wall | Mobile, full page | The Gratitude Wall on mobile |
| amora-roles-desktop.png | Roles & Leadership (/roles) | Desktop, full page | Roles and leadership structure: Leadership Circle, active roles, roles being built, and advisory bodies |
| amora-roles-mobile.png | Roles & Leadership | Mobile, full page | Roles and leadership structure on mobile |
| amora-dashboard-desktop.png | Game Dashboard (/profile, logged in) | Desktop, full page | A player's Game Dashboard showing path of growth, Gratitude balance, quests, and journey progress |
| amora-dashboard-mobile.png | Game Dashboard | Mobile, full page | Game Dashboard on mobile |
| amora-admin-setup-desktop.png | Admin "Make This Yours" setup wizard (/admin) | Desktop, full page | The Make This Site Yours admin wizard for white-labeling identity, hero images, and content in five steps |

## Notes for whoever uses these

- The instance was verified near-empty before shooting: Gratitude Wall had zero entries ("waiting for its first appreciation"), Circles/Roles pages show structure only (no member names), and no real player data appeared in any frame.
- The Game Dashboard and one Village Pulse entry belong to a test account registered for this shoot: name "Sample Explorer," email `rieki.cordon+amorademo@gmail.com`, path "Resident." It shows up as a live activity entry on the production home page ("Sample stepped into the village as a Guest") until it scrolls off or you clean it up from the Players admin panel. **Its password was written here in plaintext and has been removed; treat that account as compromised and reset or delete it.**
- Bug found during this work: right after registering a brand-new account, the very first load of `/profile` threw `TypeError: Cannot read properties of undefined (reading 'slice')` (index-CTreHtjM.js:673). A reload or fresh login resolved it and the dashboard rendered fine afterward — looked like a race condition on first render for a user with zero history. Worth a look since it'd hit every new signup.
- The Amora `/admin` password was reset during this session and the new value was written into this file in plaintext. **The value has been removed and that password must be rotated** — this file previously sat in `client/public/`, which Vite serves at the site root (`publicDir`, `vite.config.ts:108`), so committing it as-is would have published the admin password at `regencivics.earth/images/custom-games/manifest.md` and into a public GitHub repo. It was never committed, so the exposure is local only, but rotate it anyway.

## Why this file lives in docs/

Anything under `client/public/` is web-served verbatim. Capture notes carry credentials, test-account details, and bug reports, so they belong here, not next to the images.

## Filename mapping

The page (`client/src/pages/CustomGames.tsx`) references its own semantic names, and the shipped WebP files use those. The raw PNGs from the shoot keep the names in the table above and stay untracked on disk.

| Shipped WebP | Raw PNG from this shoot |
|---|---|
| `amora-home-desktop.webp` | `amora-home-desktop-fold.png` |
| `amora-quests-desktop.webp` | `amora-quests-desktop.png` |
| `amora-gratitude-desktop.webp` | `amora-gratitude-desktop.png` |
| `amora-setup-wizard-desktop.webp` | `amora-admin-setup-desktop.png` |
| `amora-resident-journey-desktop.webp` | `amora-resident-desktop-top.png` |
| `amora-prosperity-journey-desktop.webp` | `amora-prosperity-desktop-top.png` |
| `amora-steward-journey-desktop.webp` | `amora-steward-desktop-top.png` |
| `amora-investor-journey-desktop.webp` | `amora-investor-desktop-top.png` |

`amora-work-with-us-desktop` has no capture (the shoot covered no Work With Us / Maia page), so that slot still renders its styled placeholder. The mobile, `-full`, `-step`, `roles`, and `dashboard` captures are unused by the page and stay untracked on disk.
