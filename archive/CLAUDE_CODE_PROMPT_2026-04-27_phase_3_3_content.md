# Claude Code Handoff: Phase 3.3 (content fixes from live audit)

Small batch. Four content fixes spotted during a live /quest audit after Phase 3.2 deployed.

## Apply + push

```bash
git fetch origin && git checkout main && git pull origin main
git am PHASE_3_3_PATCH.patch
git push origin main
```

No migrations. No new env vars. Pure copy + static data.

## What ships

| File | Change |
|---|---|
| `client/src/components/ProgressiveOnboarding.tsx` | `Book a Discovery Call` card retitled to `Join a community call` / `Talk with the team, ask questions`. Investor-only gate removed because the new framing is community-wide. Card now shows for any returning visitor with a card slot to fill. |
| `client/src/pages/Socials.tsx` | Added Telegram entry between WhatsApp and Discord. Points at `https://t.me/SEEDS_Community`. Description: "Cross-posted updates and SEEDS Community chatter on Telegram". |
| `client/src/pages/Unsubscribe.tsx` | Footer "or WhatsApp" line now reads "or WhatsApp or Telegram", same Telegram URL. |
| `client/src/data/pageCopy.ts` | `View Rits of Passage Quest Arc` typo fixed to `Rites`. |

## Live audit notes (no action needed)

- Path portals + tier sidebar render correctly on `/quest`. Four elemental portals visible (ReGen Player, Investor, Land Project, Alliance Partner). Tier pills (Explorer / Co-Creator / Steward / Sage) on the right. Explorer pill correctly highlighted for an unactivated user.
- Undeclared portals correctly render as outline silhouettes with "tap to add" subtext.
- "13 Rites" stays in user-facing copy. Internal logic still counts 14 quest IDs (0-13) for gating, but the display number is intentional per Rye's call.
- No console errors on /quest.
- LockedQuestCard moss-ruin treatment lives in EpicQuestSection (only visible once Rites complete).
- Canopy-fall animation lives in EpicQuestSection too. Same gating.

## Recovery

Pure UI copy. Revert commit `5fb5b72` to roll back. Zero blast radius.
