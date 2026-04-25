# Claude Code Handoff Prompt

Copy everything below the line and paste it into Claude Code.

---

You're picking up the final polish round for regencivics.earth, a React SPA (Wouter routing, tRPC backend, MySQL via Drizzle ORM on Railway, Cloudflare R2 for images). The site is live and working. A full audit was just completed. Your job is to execute the remaining fixes and ship one new feature.

**Start by reading these files in order:**

1. `CLAUDE.md` -- project context, writing rules, tech stack, constraints
2. `CLAUDE_CODE_FINAL_ROUND.md` -- your execution plan (6 phases, prioritized)
3. `SMART_BOTTOM_NAV_SPEC.md` -- full design spec for Phase 5 (the smart nav feature)
4. `VERIFICATION_REPORT_2026_03_23.md` -- latest audit results so you know what's already verified

**Key context:**

- 4 form component files (label, input, textarea, select) have already been edited in the working tree but not committed. Phase 1 starts with committing those.
- The only broken image on the entire site is `blog-games-quests.jpg` (blog post ID 7). Generate a replacement using the `regen-content-image` skill and upload to R2.
- The Smart Bottom Nav (Phase 5) is the biggest piece of work. Long-press customization ships with v1, not as a stretch goal. The blend formula kicks in after the 2nd visit (not the 4th). Read the full spec carefully before implementing.
- Do NOT edit `FINAL_PUSH_V1_MARCH_2026.md` (I'm actively working in it).
- Do NOT touch /seasons layout (verified fine) or regenerate working images.

**Execute phases in order (1 through 6). After each phase, run `npm run build` to verify nothing broke. At the end, do a full verification pass against the checklist in the handoff doc.**

Go.
