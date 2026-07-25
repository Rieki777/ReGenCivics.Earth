# UI harness

A standalone Vite app for looking at real components without the running app in
the way.

## Why this exists

Verifying a UI change against the actual app is blocked three different ways
here: the dev server's CSP blocks the tooling, the production build bounces you
through an OAuth redirect, and the in-app Browser pane cannot get past either.
The workaround kept being reinvented from scratch. This is it, committed.

The harness has no server, no session, no CSRF, and no database. It imports
components straight out of `client/src` and stubs `@/lib/trpc` with canned data,
so what renders is the real component with the real stylesheet.

## Use it

```bash
pnpm ui:harness      # dev server at http://localhost:5199, hot reload
pnpm ui:shots        # screenshot every story into harness/shots/
pnpm ui:shots publication-review    # just one
```

`ui:shots` exits non-zero if any story logs a console error, so a green run
means the component actually rendered rather than silently swallowing a throw.
Screenshots are taken at desktop (1280) and mobile (390) widths.

## Add a story

Edit `stories.tsx`:

```tsx
"my-screen": {
  title: "What this shows",
  setup: () => {
    mockData["router.procedure"] = { /* what useQuery should return */ };
  },
  render: () => <MyComponent someProp={1} />,
},
```

`mockData` is keyed by the dotted tRPC path, so
`trpc.harvest.publicationReview.useQuery()` reads
`mockData["harvest.publicationReview"]`. Anything you do not stub returns
`undefined`, which is what a component sees before its first fetch resolves;
stub it if the component cannot cope with that.

Mutations are no-ops that fire `onSuccess`, and every call lands in
`mutationLog` if a story wants to assert on it.

## Files

| File | |
|---|---|
| `vite.config.ts` | aliases `@/lib/trpc` to the stub, `@` to `client/src` |
| `trpc-stub.tsx` | the Proxy that answers any procedure path |
| `stories.tsx` | the stories, and their fixtures |
| `main.tsx` | story picker and error boundary |
| `shoot.mjs` | Playwright screenshots |
| `shots/` | output, gitignored |
