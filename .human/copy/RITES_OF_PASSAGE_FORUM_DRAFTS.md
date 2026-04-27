# Rites of Passage Forum Post Drafts

For Rye to review and edit before Claude Code implementation.

**Category:** `rites-of-passage` (to be created if it doesn't exist)
**Author:** team@regencivics.earth
**Format:** Each post = short body (2-4 sentences + completion instruction) + 3 example player seed comments

---

## Quest 0: Fire

**Title:** Quest 0: Fire. Share Who You Are and Why You're Here

**Body:**
This is where the journey starts. Quest 0 asks you to share who you are and why you're here. Not your credentials. The real reason. A 3-7 minute video is the deliverable, but what you make of it is yours.

Share your video below and tell us: what are you burning? What are you making room for?

**Seed comments:**

*Priya Nair @priya_soilmind*
I recorded mine in my garden at sunrise because that was the only place I felt honest enough to say the thing I'd been carrying — that I'd been performing sustainability instead of living it. The video was hard to make. Something shifted when I made it. Post: instagram.com/p/fire_example1

*Marcus Webb @marcus_rewild_uk*
Mine became a 6-minute account of every job I'd had and why each one left me feeling complicit in something I couldn't name. By the end I knew what I was burning: a story about what responsible citizenship is supposed to look like. Post: x.com/marcus_rewild_uk/status/fire_example

*Saoirse Brennan @saoirse_bog*
I filmed myself in the bog behind my house in Connemara. Talked about the extractive farming my grandfather did on this same land and what I'm trying to undo. He called me two weeks later, said he'd seen it. We cried. Post: linkedin.com/posts/fire_example

---

## Quest 1: Potion Brewing

**Title:** Quest 1: Potion Brewing. Share Your Microbiome Experiments

**Body:**
This is the Potion Brewing log: gut protocols, fungi experiments, fermented foods, and soil relationships. Share what you made, what changed, and what you learned.

To complete: post your Showcasing My Potions video or article below.

**Seed comments:**

*Keiko Tanaka @keiko_koji*
I ran a 30-day koji fermentation experiment alongside a soil microbiome test. The parallel was striking — same species, same sensitivity to industrial inputs. My potion showcase turned into a 15-minute documentary. Post: youtube.com/example_potions

*Fabio Gomes @fabio_mato_grosso*
I live in the Brazilian Cerrado and spent this quest tracking which wild fungi I could find within 5km of my house. Ended up with 12 species, a fermented tonic, and a new friendship with a traditional healer. Post: instagram.com/p/potions_example

*Ingrid Holm @ingrid_regens*
Made my first proper kefir, added medicinal mushroom tinctures, and tracked how my energy shifted over six weeks. I'm not a scientist, just someone paying attention to their body as an ecosystem. Post: substack.com/@ingrid_regens/example

---

## Quest 2: Saving Seeds

**Title:** Quest 2: Saving Seeds. Add Yours to the Living Exchange

**Body:**
This is the seed sovereignty thread. Share the seeds you saved, what you grew them from, and how you're continuing the relationship.

To complete: post your seed swap addition or showcase below.

**Seed comments:**

*Alejandra Ruiz @alejandra_milpa*
I saved seeds from a landrace corn variety my abuela grew. Planted half, gifted half at a seed swap in Oaxaca. Fourteen people took them home. I know where at least seven of those plants are growing right now. Post: instagram.com/p/seeds_example1

*Ravi Sharma @ravi_seedbank*
Catalogued and saved seeds from 23 varieties this season. The unexpected one: a bitter gourd cultivar that has been in my family for generations but was nearly lost when my parents moved to Delhi. Post: x.com/ravi_seedbank/status/seeds_example

*Nora Lindqvist @nora_tradgard*
Hosted a seed swap on my allotment in Gothenburg. Eleven people came. We talked for four hours. Saved more stories than seeds. Post: linkedin.com/posts/seeds_example

---

## Quest 3: Healing Wholes

**Title:** Quest 3: Healing Wholes. Show Us What You're Tending

**Body:**
This is the Healing Whole thread: gardens, bioregion projects, food forests, and the physical spaces we're learning to tend. Share yours and what it's teaching you.

To complete: post your Showcasing My Healing Whole video or article below.

**Seed comments:**

*Themba Dlamini @themba_mzansi*
Turned a bare 80m² patch of Johannesburg clay into a food garden in six months. Worms, chop-and-drop mulching, gray water recycling. My neighbours started copying me. Three adjacent gardens now. Post: youtube.com/example_healing_whole

*Brigitte Moreau @brigitte_agroforet*
I'm building a food forest on degraded pasture in the Dordogne. Five years in. This quest gave me the structure to document what has actually changed in soil health year by year. Post: substack.com/@brigitte_moreau/example

*Ji-hoon Park @jihoon_permaculture_kr*
My Healing Whole is a rooftop in Seoul. It starts small. Post: instagram.com/p/healing_whole_example

---

## Quest 4: Dreaming Spaces of Love

**Title:** Quest 4: Dreaming Spaces of Love. Share Your Vision for Your Land

**Body:**
This is the Spaces of Love thread. Share your map, your vision, your design for how your family wants to live with land. It doesn't have to exist yet.

To complete: post your Map of My Current/Future Space of Love as a video, image, or article below.

**Seed comments:**

*Valentina Esposito @vale_kins_domain*
I shared a hand-drawn map of what I want our 2-hectare property to become in 20 years: food forest, natural building zone, creek restoration corridor, space for community. It's a commitment as much as a plan. Post: instagram.com/p/space_love_example1

*Dmitri Kozlov @dmitri_siberia*
I live in a flat in St Petersburg right now. My Space of Love is still mostly in my imagination. But I drew it anyway — 5 acres in the Altai with a family, animals, a banya, a market garden. Putting it down made it real. Post: x.com/dmitri_kozlov/status/space_love

*Amelia Hayes @amelia_tinyhome*
We're a family of four on a third of an acre in rural Victoria. This quest made me actually map what we've got and what we want to grow into. Turns out we have more than I thought. Post: substack.com/@amelia_hayes/space_love

---

# PLAN SUMMARY (for Rye to approve before Claude Code implementation)

## What needs to be built:

### 1. Community.tsx: Add "Welcome Aboard Quests" card to Fire section
In the Fire panel, add a fourth card alongside Rites of Passage, All Quests, and Epic Quests (coming soon) pointing to `/community/c/onboarding-quests`. Card label: "Welcome Aboard Quests", subtitle: "10 quests to get started".

### 2. Create `rites-of-passage` category and seed 5 posts (first batch)
- Write `scripts/seed-rites-of-passage-threads.mjs`
- Creates the `rites-of-passage` category if it doesn't exist
- Seeds Quest 0 through Quest 4 with 3 seed comments each
- Script outputs the post IDs for patching

### 3. Add forumUrl to questData.ts
- Add `forumUrl?: string` to the quest type interface
- After seed script runs, patch each quest with its forum post ID

### 4. Update Quest.tsx
- For each quest displayed, add a "Share in the forum" / "Go to thread" link using the quest's forumUrl

### 5. Wire up the Quest.tsx link from the Rites of Passage category
- The `rites-of-passage` category will then have real content when users click through from the Community page Fire section

## What Rye needs to do:
- Review and edit this draft file (Quests 0-4)
- Run the seed script once approved (same as before: `DATABASE_URL=... node scripts/seed-rites-of-passage-threads.mjs --execute`)
- Report post IDs so forumUrls can be patched
- Quests 5-13 will be added to this doc in a later session

## Note:
The em-dashes in quest titles have been replaced with periods. The original seed comment text retains its natural voice (some contain dashes mid-sentence — those are kept as-is since they're character speech, not heading structure).
