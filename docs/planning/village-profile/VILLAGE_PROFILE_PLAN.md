# Village profile: every episode builds one village (ADR-77)

Rye approved this on 2026-10-20 ("yes with those 6 calls"). Plan page: https://claude.ai/artifact/Y3r6dfZFWrWooSyQZTAy6p

Every page a land project fills in, and every answer it gives on a weekly board, goes into one profile for that project. The profile is the project's Village OS 1.0 taking shape. By the end of the Season each project launches a Village OS that already knows what it's for, its circles and seats, who decides what and how people come in, and from there it's theirs to edit.

## The six calls

1. **One key.** The application is the one key for a project. A project with no application can still play on the boards, and its village draft waits until it applies.
2. **Stewards confirm.** Board answers are suggestions. Only what a project's stewards keep or write goes into the 1.0 file.
3. **The week map** below.
4. **When a 1.0 opens.** A project's 1.0 opens once its launch decisions are answered, from Week 13 on, with the March equinox as the shared moment.
5. **One file.** Hosted and self-run villages read the same 1.0 file.
6. **No invented money.** The file carries no money figure the project didn't type. Payments, exchange, redemption, stays and the crowdpool view start off.

## How it fits together

| Piece | Where |
|---|---|
| Every decision a village makes before launch (module, Village OS target, weeks, default, launch waits on it) | `shared/villageDecisions.ts` |
| The profile, pure: suggestions from every source, the stewards' answers, launch readiness, the purpose draft | `shared/projectProfile.ts` |
| The 1.0 file, `regen-civics/village@1`, with Week 4's card inside | `shared/villageFile.ts` |
| Reading a project's sources, the claim rules, the stewards' answers | `server/lib/villageProfile.ts`, `server/routes/villageProfile.ts` |
| The stewards' own word, one row per decision, and every claimed card | `village_profile_answers`, `village_profile_claims`, `drizzle/0301_village_profile_answers.sql` |
| The page | `/apply/village` (`client/src/pages/VillageProfile.tsx`), linked from `/apply/status` |
| Admin overview | Admin, Events, "Village profiles" (`client/src/components/admin/AdminVillageProfiles.tsx`) |

## Which week owns which decision

The weeks are `shared/season2Curriculum.ts`; each decision's `weeks` field is the source of truth.

| Week | Decisions |
|---|---|
| 1, the application | name, place, vision, tools |
| 3 | human needs, seeds, depth, breadth, the whole-project figure, first circles, the rite |
| 4 | human needs confirmed, circles for each human need and how each decides, seat cards, what's decided together and the first agreement, a first quest, the first step in |
| 5 | the governing purpose (drafted from the project's own answers, in Village OS's five parts), what counts as contribution, the recognition token's name, seasons, timezone, hemisphere, currency |
| 6 | what a member signs, the greeter seat, how the next holder of a seat is chosen, how joining works |
| 7 | the network, tools |
| 8 and 9 | the issuance cap or no cap, the token the recognition pool pays out |
| 10 and 11 | legal structure, land access, what happens when someone leaves, care and conflict, a legal read of the covenant |
| 12 | which modules run, checked against every human need's seats |
| 13 | founders and the launch roll (three or more), first stewards, the web address |

## In Village OS (own repo, own session)

"Start from your ReGen Civics profile": the founder pastes or uploads the file, previews every part with a tick, and loads what they keep:

- needs through the scope write;
- circles and seats through org drafts;
- need links once the seats exist;
- identity, purpose, covenant and quests prefilled into their editors.

A village built from a file starts from its own circles instead of Amora's eight councils.

## Open

- The hosting consent line (`shared/villageOsOffer.ts` `CONSENT_DRAFT_LINE`) names only application answers. Until the Legal session rules on new words, the hosting team drafts from a project's file only when its stewards hand it over.
- Later weeks' boards can read each project's open decisions from the profile, and ask only those.
