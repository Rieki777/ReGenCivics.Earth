# FIXES_TO_MAKE 2026-06-18 — Mobile screenshot upgrades

Seven mobile UX upgrades from Rye's screenshots. All seven are already applied
in the working tree (see Verification markers). This doc exists so the batch
survives a working-tree reset: if a marker is missing, the change was reverted
and must be re-applied before shipping.

A second Claude instance was editing `client/src/components/CommandPanel.tsx`
(desktop command center, horizontal -> vertical tab layout). **Do not touch
CommandPanel.tsx in this batch.** Let that work land on its own; only reconcile
if git reports a conflict.

## The seven changes

| # | What | File(s) | Verification marker (grep) | Status |
|---|------|---------|----------------------------|--------|
| 1 | Epic Quests locked cards were invisible on mobile (dark-on-dark under `opacity-40 grayscale`). Brightened the locked card fill/border + ring, softened the wrapper to `opacity-80`. | `client/src/components/EpicQuestSection.tsx`, `client/src/components/LockedQuestCard.tsx` | `opacity-80 pointer-events-none` in EpicQuestSection; `from-[#1b3324]` in LockedQuestCard | CODED |
| 2 | Quest Arc map rendered far below its toggle. Moved the map section directly under the Show/Hide toggle (above `PathProgressionSection`) and added smooth `scrollIntoView` on open. | `client/src/pages/Quest.tsx` | `id="quest-arc-map"` (x1) + `getElementById("quest-arc-map")` (x1) | CODED |
| 3 | Tokenomics "learn more" section redesigned: eyebrow pill ("The Two Tokens"), gradient cards, glowing token icon badges, accent stripes, hover lift, RGVoice given a distinct teal accent. | `client/src/pages/Quest.tsx` | `The Two Tokens` | CODED |
| 4 | Bottom-right command center: replaced the radial fan with a collapsible **vertical labeled menu**. Each row is one large tap target (label left + round icon right), focus scrim, springy staggered reveal, animated Flower trigger (spin + ring), haptics, full a11y (`role="menu"/menuitem`). | `client/src/components/mobile/WizardRadialMenu.tsx` | `role="menu"` | CODED |
| 5 | Music note now opens the Hymns playlist (`/hymn-book`) and starts playback; that page got a Spotify-style player: album art, seek bar with elapsed/total, prev/play-pause/next, volume, animated now-playing indicator, tappable track list. | `client/src/components/mobile/WizardRadialMenu.tsx` (music action -> `/hymn-book`), `client/src/pages/HymnBook.tsx` (`NowPlayingPanel`) | `NowPlayingPanel` in HymnBook | CODED |
| 6 | "X on our servers" -> "X On the Cloud" on the token balance cards and the token detail dialog. | `client/src/components/profile/TokenBox.tsx`, `client/src/components/profile/TokenDetailDialog.tsx` | `On the Cloud` | CODED |

No new dependencies. No DB/migrations. No env vars. The shared `AudioContext`
already exposed `playSong`, `seek`, `volume`, `duration`, `currentTime`,
`nextSong`, `prevSong` — the player is pure UI over existing state.

## Verify all markers (run from repo root)

```bash
grep -c "opacity-80 pointer-events-none" client/src/components/EpicQuestSection.tsx   # expect 1
grep -c "1b3324"                          client/src/components/LockedQuestCard.tsx     # expect 1
grep -c "quest-arc-map"                   client/src/pages/Quest.tsx                    # expect 2
grep -c "The Two Tokens"                  client/src/pages/Quest.tsx                    # expect 1
grep -c 'role="menu"'                     client/src/components/mobile/WizardRadialMenu.tsx  # expect 1
grep -c "NowPlayingPanel"                 client/src/pages/HymnBook.tsx                 # expect 2
grep -c "On the Cloud"                    client/src/components/profile/TokenBox.tsx    # expect 2
```

If any count is 0, the change was reverted — restore it before shipping.

## Ship gate (MANDATORY before commit)

```bash
python3 scripts/audit-truncation.py      # no truncated source files
pnpm typecheck                           # must exit 0 (this is `tsc --noEmit`)
```

Note: another instance left `CommandPanel.tsx` mid-edit at points today. If the
ship gate flags CommandPanel or any file with "JSX element has no corresponding
closing tag" / "Unterminated string literal", that file was truncated by a
concurrent write — restore it from a known-good state, it is not part of this
batch.

## Commit + push

```bash
git add client/src/components/EpicQuestSection.tsx \
        client/src/components/LockedQuestCard.tsx \
        client/src/pages/Quest.tsx \
        client/src/components/mobile/WizardRadialMenu.tsx \
        client/src/pages/HymnBook.tsx \
        client/src/components/profile/TokenBox.tsx \
        client/src/components/profile/TokenDetailDialog.tsx \
        FIXES_TO_MAKE_2026-06-18_mobile_upgrades.md
git commit -m "fix(mobile): epic-quest cards, quest-arc map placement, tokenomics redesign, vertical command menu, hymns player, On-the-Cloud copy"
git push
```

Railway auto-deploys on push to the production branch. Confirm the deploy is
green, then load regencivics.earth on a phone and walk the seven items.

## Handoff Breakdown

| Step | Who | Notes |
|------|-----|-------|
| Re-apply any reverted marker | Claude Code | Only if a grep count is 0 |
| Run ship gate (audit-truncation + typecheck) | Claude Code | Must pass before commit |
| Reconcile CommandPanel.tsx if git conflicts | Claude Code | Take the other instance's vertical layout; keep its WCAG color fixes |
| `git add` / `commit` / `push` | Claude Code | Standard repo auth |
| Confirm Railway deploy is green | **Rye** | Watch the deploy, then spot-check on a phone |
| Eyeball the 7 items on mobile | **Rye** | Browser/visual confirmation |
