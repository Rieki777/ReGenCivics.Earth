# START HERE: build core.regencivics.earth

Paste the block below to Claude Code to kick off the build.

---

You are building the Church of the Regenerative Earth (CORE) as a functional site at `core.regencivics.earth`, inside this repo.

Run in the regen-civics monorepo, the working directory that contains `CLAUDE.md`, `.ai/`, `client/`, and `server/`. If you find yourself in a folder named `CORE` on the Desktop, that is reference material only (the static draft and doc copies); switch to the monorepo to do the work.

Read these first, in order, then execute:
1. `CLAUDE.md` and `.ai/docs/STEERING.md` (hard rules, ship gate, writing rules: no em-dashes)
2. `CLAUDE_CODE_PROMPT_CORE_CHURCH_SITE.md` (the full build spec and phase order)
3. `client/src/pages/core/ASSET_PROMPTS.md` (all image prompts and the generation pipeline)

Reference content and visual style: the static first draft at `C:\Users\taren\Desktop\CORE\site\`.

What to do:
- Follow the Master execution order in the build spec, Phase 0 through 7, top to bottom.
- Run the ship gate after every phase. Do not mark a phase done until its Definition of Done passes.
- Build everything autonomously that the Handoff Breakdown lists under CLAUDE CODE. For anything under YOU (Rye), write the code or script fully, mark it CODED or SCRIPTS READY, and list it clearly for me instead of trying to run it.
- Do not run anything that touches the Railway DB, Railway env vars, git push, or external payments. Write the migrations and scripts, I run them.

Non-negotiables:
- No founder names, no SSN, no home address anywhere in the built output.
- Public legal detail is limited to: legal name, 508(c)(1)(a) status, founded 2026, EIN 42-3198293, SEEDS constitutional home, and the formation-document download.
- Steward payment rights are data-driven (a DB table), never hardcoded names or IDs.
- The Anastasia chatbot answers only from the retrieved canon, cites book and section, credits Vladimir Megre and The Ringing Cedars of Russia, and has a crisis fallback. The Anastasia image is symbolic and non-identifiable.
- A complete first pass means real illustrations, motion with a reduced-motion fallback, and a passing QC matrix, not just wired features.

Start with Phase 0 (scaffold and port the seven pages), and append an ADR to `.ai/docs/DECISIONS.md` recording the subdomain-in-monorepo decision. When you finish a phase, tell me what shipped, what is waiting on me, and move to the next.
