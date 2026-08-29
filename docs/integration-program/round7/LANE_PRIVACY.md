# Lane PRIVACY — a gate that protects the route and not the bytes

**Read `../round6/BUILD_HOUSE_RULES.md` first.** It is current and carries the measured gate
baseline. Both files bind.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-privacy`, branch `wt/r7-privacy`, cut from
`origin/main` at **`a9f55de`**, deps installed, `.env` present.
**Migration `0107` is yours if you need one.** Only 0107. Never renumber.

---

## 1 · The defect, confirmed by the coordinator at `a9f55de`

**`client/src/pages/ProjectHistory.tsx` carries three `docs.google.com` URLs and names a real
counterparty five times.** Confirmed: `git grep -c "docs.google.com"` on that file at `a9f55de`
returns **3**, against a control (`export default`) returning 1, so the count is real.

**The page is admin-gated. Its JavaScript chunk is not.** A route guard decides who the app will
render a page for; it does not decide who can fetch the bundle that page lives in. Anyone who can
load the site can download the chunk and read the strings in it.

**This is the same posture the investor vault had** — the gate is on the door and the secret is in
the bytes — and it is live right now.

**Re-verify all of that before you fix it.** Confirm the URLs are really in a client chunk that ships
to an anonymous visitor, rather than only in a source file that gets tree-shaken or server-rendered.
**If it turns out the strings never reach a browser, say so and stop** — that is a better outcome
than a fix, and it is the kind of refusal this program wants.

## 2 · Objective, as a harm metric

**Nothing a founder pasted into an internal tracker ships inside a file a stranger can download, and
no real person outside the village is named in the bundle.**

## 3 · The shape of the fix, and the pattern to copy

**Do not simply delete the links.** They are somebody's working references and deleting them loses
the founder's work, which is the defect this program has spent two rounds closing from the other
direction.

**Copy the pattern PR #97 used for the land facts**: move them out of the bundle and into
admin-authored content the founder edits, stored server-side, **blank by default so a fresh village
inherits nothing.** That page is a founding-team tracker; its links and its counterparty names are
exactly the kind of thing that belongs in data rather than in code.

Two constraints that decide whether this is done properly:

1. **Whatever route serves them must actually gate on something.** Moving a secret from a client
   chunk into an ungated API endpoint moves the problem rather than fixing it. Read how the admin
   content routes gate today and match the strongest one that fits.
2. **Check the rest of the page while you are in it.** The three URLs and the one name are what a
   sweep found; they are a floor. **Enumerate every door into this room**: any other external link,
   any other real person's name, any other identifier that belongs to a specific deal rather than to
   the product. That instruction found a second undiscovered leak in round 5 and six broken images
   where four were reported in round 6.

**A known non-finding, do not re-report it:** this page's "Discussion topics" and its per-item status
overrides are localStorage-only and reach no server. That is recorded and deliberate for now.

## 4 · Second item: a fork phones home by default

`server/index.ts:3773` reads:

```
origin: () => (process.env.FRONTEND_URL || "https://amora.regencivics.earth").replace(/\/$/, ""),
```

**So a village that clones this platform and does not set `FRONTEND_URL` builds its links, and
anything derived from them, against one specific other project's domain.** A sibling default sends
its feedback hub to the platform's own host.

Round 6's fork lane found this and correctly left it, because it is a behaviour change rather than a
leak. **It is yours now.** The honest shape: a fork with nothing configured should either derive its
own origin from the request it is answering, or **refuse and say what is unset**, rather than
silently adopting somebody else's address. Note line 6582 already does the request-derived version
for one case, so the codebase contains both answers and one of them is right.

**Say which you chose and why.** If you conclude the current default is correct for the hosted
deployment and only wrong for a fork, a config-driven answer that is honest in both cases is better
than picking a side.

## 5 · Your zone

**Yours:** `client/src/pages/ProjectHistory.tsx` and its components; whatever server route and admin
surface you add for the content; `server/index.ts` at the `FRONTEND_URL` and feedback-hub defaults
**only**; `drizzle/0107_*.sql` if needed.

**Lane CARRY is live in this repo** and holds `client/src/components/GameDashboard.tsx` and the
quest-board story section of `client/src/pages/Admin.tsx`. **If your admin surface needs `Admin.tsx`,
take a different region and tell me which**, or ask and I will route it.

## 6 · Gates

The standard eighteen-step set. **`check-save-honesty.mjs` applies** to any admin control you add.
**`check-admin-reach.mjs` reports 0 orphan admin write routes on trunk**, so a new admin route needs a
way in or it will correctly go red. **`check-brand-refs.mjs` is a ratchet** currently well under its
baseline; removing a project-specific name should push it further down, which is fine. **Never
`--update-baseline`.**

**Write the regression test first and watch it fail**: an assertion that the built client bundle
contains none of the three URLs and none of the counterparty's name. `server/forkPublish.e2e.test.ts`
already does exactly this shape for a different set of strings — read it and follow it.

**`pnpm build` can return exit 0 while the artifact still carries the previous commit.** Check with
`grep -c "$(git rev-parse --short HEAD)" dist/index.js`.

## 7 · Report

The block at the end of the build house rules, plus: **the full list of what else you found on that
page** (counts and kinds, no names and no URLs in your report), and your recommendation on §4 with
the reasoning.
