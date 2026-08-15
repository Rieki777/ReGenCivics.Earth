# Claude Code Build Prompt — FAB double-click to capture

A small enhancement on top of the shipped Harvest Phase 1. Do not change the Phase 1 spec or its data model; this only adds a way to open the existing capture composer and makes sure that composer is actually reachable.

Source of truth: `CREATION_STATION_PLAN.md` v2 §4, and the shipped Phase 1 (`quick_notes`, `ownerProcedure`, the Add note composer, the offline outbox). Read the current `AdminAIAssistant` / FAB component before changing it.

## The problem

There is no visible way to open the note composer from the FAB. Rye wants: double-click the bottom-right FAB to open the capture window, where he can type or talk. The gesture is for admin roles only, invisible to everyone else.

## Build items

### 1. Double-click opens the capture composer
- On the existing bottom-right FAB, a double-click (and double-tap on touch) opens the Add note capture composer from Phase 1.
- Preserve the current single-click behavior (the admin AI assistant). Distinguish single from double cleanly, so a single click is never swallowed and a double never also fires the single action.
- On touch devices, handle double-tap so it does not trigger browser zoom (preventDefault on the gesture target).

### 2. Role gate
- The double-click-to-capture gesture is active only when the signed-in user's role is `admin` or `superadmin`. For all other users the FAB behaves exactly as it does today, with no capture affordance and no hint it exists.
- This is a client display gate for the gesture. The save path stays server-gated as built in Phase 1 (see the open question on where non-owner captures go).

### 3. Make the composer complete and obvious
- The composer must clearly show: a text box, a microphone button for voice, and a visible **Save** button. Right now the send control is not visible; that is the core complaint. Make Save unmistakable.
- Reuse the Phase 1 offline outbox: a capture made with no service is held on the device and sent when service returns, with the pending-sync indicator. Do not rebuild this, just make sure the composer opened by the gesture uses it.
- After save, confirm briefly ("Saved to your brain") and clear the box for the next thought.

### 4. Discoverability (small)
- Because a double-click on a FAB is not obvious, add a quiet affordance for admins only: a tooltip or a tiny label on hover or long-press that reads "Double-click to add a note." Keep it subtle.

## Ship gate
```
pnpm gate   # truncation audit + typecheck, cross-platform
pnpm test   # non-admin sees no capture gesture; single-click still opens the assistant; double-click opens the composer; Save calls the Phase 1 create path; offline capture queues and flushes
```
Per new className, grep it in client/src. Evidence column required.

> The gate here used to read `python3 scripts/audit-truncation.py` + `pnpm typecheck`.
> Neither ran on Windows: `typecheck` was never a script in package.json, and
> `python3` is a Store stub that exits 0 without auditing anything. Fixed at the
> source on 2026-07-16 — see CLAUDE.md. Use `pnpm gate`.

## Handoff Breakdown — Who Does What

### YOU (Rye)
| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Answer the open question below | It sets who can capture and to whose inbox | Reply in session |
| 2 | Git push and confirm the deploy | Claude Code cannot deploy | `/ship`, push, `pnpm railway:deploys` |
| 3 | Test the double-click on desktop and phone | Only you can feel the gesture on your devices | regencivics.earth admin |

### CLAUDE CODE
| # | Task | Status |
|---|------|--------|
| 1 | Double-click / double-tap handler on the FAB, single-click preserved | READY TO BUILD |
| 2 | Admin-role display gate on the gesture | READY TO BUILD |
| 3 | Wire the composer with a visible Save button and the Phase 1 offline outbox | READY TO BUILD |
| 4 | Subtle discoverability affordance for admins | READY TO BUILD |
| 5 | Tests per ship gate | READY TO BUILD |

## Open question for Rye
Phase 1's save path is owner-only, so captures land in your private brain. You said the gesture should open for you and other admin roles. Pick one:
- Open for admins, but only your captures persist (other admins can open the box, saving is owner-only). Simplest, matches Phase 1.
- Open for admins, and every admin's capture saves to your brain. Needs the create path to accept admin roles, not just the owner.
- Open for admins, each admin captures into their own inbox. A larger change (per-user inboxes), a separate build.
Recommendation: the first, until you actually want team capture.
