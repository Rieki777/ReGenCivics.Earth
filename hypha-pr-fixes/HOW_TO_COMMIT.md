# How to commit the PR #2137 CodeRabbit fixes

All four fixes are done and the corrected files are in this folder.
The browser is currently logged into GitHub as `Rieki777`, which doesn't own the `Rieki7/hypha-web` fork — so pushing requires a quick account switch.

## Files to commit

Both files go into the `bridge-quest-pre-fill-pr2` branch of `Rieki7/hypha-web`:

| File in this folder | Destination in the repo |
|---|---|
| `create-propose-a-contribution-form.tsx` | `packages/epics/src/governance/components/create-propose-a-contribution-form.tsx` |
| `create-agreement-base-fields.tsx` | `packages/epics/src/agreements/components/create-agreement-base-fields.tsx` |

## Quickest path: GitHub web editor

1. Sign into GitHub as `Rieki7`
2. Navigate to: https://github.com/Rieki7/hypha-web/edit/bridge-quest-pre-fill-pr2/packages/epics/src/governance/components/create-propose-a-contribution-form.tsx
3. Select all (Ctrl+A) and paste the content of `create-propose-a-contribution-form.tsx`
4. Commit message: `fix: address CodeRabbit review feedback on bridge pre-fill PR`
5. Commit directly to `bridge-quest-pre-fill-pr2`
6. Repeat for `create-agreement-base-fields.tsx` at: https://github.com/Rieki7/hypha-web/edit/bridge-quest-pre-fill-pr2/packages/epics/src/agreements/components/create-agreement-base-fields.tsx

## What changed (summary for commit message)

- Removed duplicate `BridgeInitialValues` from `create-propose-a-contribution-form.tsx`, now imported from the agreements barrel
- Fixed payout cast: `as unknown as undefined` replaced with `as any` so string values pass through correctly
- Added explicit `ResubmitFormData` interface to `create-agreement-base-fields.tsx`, replacing the `[key: string]: any` index signature
- Extracted the `defaultImage` nested ternary into a `resolvedDefaultImage` constant
