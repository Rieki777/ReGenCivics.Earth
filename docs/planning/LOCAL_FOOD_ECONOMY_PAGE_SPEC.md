# /local-food-economy Page Build Spec

**Status:** Ready for Claude Code to build
**Route:** `/local-food-economy`
**Nav placement:** Under "Play the Game" dropdown, after "The Economy"
**Writing rules:** No em-dashes. No AI-isms. No contrast-framing. Direct, grounded voice.

---

## Source of Truth for Copy

All page copy is already written in `DRAFT_GAME_AND_ECONOMY_PAGES.md`, Part 4 (sections 1-7 and closing CTA). Use that copy verbatim. Do not rewrite. Do not paraphrase. If anything reads awkward, fix only to strip em-dashes or AI-isms (see writing rules in `CLAUDE.md`), keep the substance.

**Critical:** Section 6 of the draft has a duplicated paragraph ("If you were part of the SEEDS food economy work..."). Keep only the first instance. Delete the duplicate.

---

## Page Structure (in order)

1. **Hero** — headline, subline, watercolor hero image (see Image Assets below)
2. **Section 1: Where This All Started** — the 2016 origin story
3. **Section 2: The Offer for Food Producers** — commitment tiers (10% / 50% / 90%)
4. **Section 3: Why Food Producers Are the Backbone** — 5 benefit blocks
5. **Section 4: Who Qualifies** — community-rated, not central authority
6. **Section 5: How "Go Live" Works** — bioregional activation criteria
7. **Section 6: Seeds, SEEDS, and ReGen Civics** — lineage and legacy claim
8. **Alliance Tools Band** — logos of the tools/partners working alongside (see Image Assets)
9. **Section 7: Join the Local Food Economy** — application form
10. **Hook Banner** — "A currency backed by local food..." (draft Part 1, version 5)
11. **Closing CTA** — "Feed the Renaissance" with two paths

---

## Image Assets

### 1. Hero Image: P2P Food System Watercolor

**Target path:** `client/public/images/economy/p2p-food-system-watercolor.webp`
**Source:** Watercolor illustration showing the peer-to-peer food system (producer, community, currency flow).
**Status:** [RYE TO PROVIDE] The image referenced in the handoff message was not found in the uploads folder. Rye, please drop it into `/sessions/gallant-wizardly-franklin/mnt/uploads/` or directly into `client/public/images/economy/` as a source PNG/JPG. Claude Code will convert to WebP on build.

**Conversion command for Claude Code:**
```bash
cwebp -q 85 client/public/images/economy/p2p-food-system-source.png -o client/public/images/economy/p2p-food-system-watercolor.webp
```

**Usage in page:**
```tsx
<img
  src="/images/economy/p2p-food-system-watercolor.webp"
  alt="Peer-to-peer local food system watercolor"
  className="w-full max-w-3xl mx-auto rounded-lg"
  loading="eager"
  width={1200}
  height={800}
/>
```

Place directly below the hero headline and subline.

### 2. Family Wizards Illustration

**Target path:** `client/public/images/economy/family-wizards.svg` (or `.webp` if raster)
**Status:** [RYE TO PROVIDE] No `wizard`, `magician`, or `family` SVG exists in the codebase as of this spec. Only `welcome-aboard.svg` and `favicon.svg` live under `client/public/`. Rye, please provide the family wizards SVG or clarify which existing asset you meant.

**Placement:** Inside Section 3 ("Why Food Producers Are the Backbone"), floated alongside the benefit blocks. Decorative, not clickable.

### 3. Alliance Tools Logos

**Target directory:** `client/public/images/logos/alliance/`

The page references SEEDS, bioregional tools, and the broader alliance. Gather logos for:

1. **SEEDS** — hypha.earth / joinseeds.earth
2. **Hypha DAO** — hypha.earth
3. **Regen Network** — regen.network
4. **Kolektivo / Kolektivo Labs** — kolektivo.network
5. **Gaia Education** — gaiaeducation.org
6. **Global Ecovillage Network (GEN)** — ecovillage.org
7. **Commons Stack** — commonsstack.org
8. **Giveth** — giveth.io

**File naming convention:** `client/public/images/logos/alliance/{name}-logo.webp`
e.g., `seeds-logo.webp`, `regen-network-logo.webp`

**Fetching:** Logos should be pulled from each site's press kit or root domain (look for `/favicon.png`, `/apple-touch-icon.png`, or `/brand`, `/press` pages). Normalize to transparent background, same pixel height (e.g., 80px), convert to WebP at quality 90.

**Status:** [CLAUDE CODE: fetch these during build] Use `curl` or the browser automation to pull each logo and normalize. If any site blocks automated fetching, flag the specific one and Rye will upload manually.

**Band component:**
```tsx
<section className="py-12 bg-[#FAF8F3]">
  <div className="max-w-6xl mx-auto px-6">
    <p className="text-center text-sm uppercase tracking-wide text-[#2D2A26]/60 mb-8">
      Walking alongside
    </p>
    <div className="flex flex-wrap items-center justify-center gap-10 opacity-80">
      {ALLIANCE_LOGOS.map((logo) => (
        <img
          key={logo.name}
          src={logo.src}
          alt={logo.name}
          className="h-12 w-auto grayscale hover:grayscale-0 transition-all"
          loading="lazy"
        />
      ))}
    </div>
  </div>
</section>
```

---

## Route and Navigation

**File:** `client/src/App.tsx`
Add route:
```tsx
<Route path="/local-food-economy" component={LocalFoodEconomy} />
```

**File:** `client/src/components/Navigation.tsx` (or wherever the Play dropdown lives)
Add to Play the Game dropdown, after "The Economy":
```tsx
{ label: 'Local Food Economy', href: '/local-food-economy' }
```

**File:** `client/src/pages/LocalFoodEconomy.tsx` (new)
Page component. Follow the same structure and design tokens as `Economy.tsx` (once that exists) or `Game.tsx` as a reference. Cream background (#FAF8F3), charcoal text (#2D2A26), serif headings, sans body.

---

## Database and Backend

### New Table: `localFoodApplications`

```sql
CREATE TABLE localFoodApplications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  orgName VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL, -- grower, distributor, preparer, marketplace, other
  location VARCHAR(255) NOT NULL, -- bioregion / area
  commitmentPercent INT NOT NULL, -- 10 to 100
  description TEXT NOT NULL,
  status ENUM('pending', 'under_review', 'approved', 'declined') DEFAULT 'pending',
  voteCount INT DEFAULT 0,
  forumThreadId INT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (forumThreadId) REFERENCES forumPosts(id)
);

CREATE TABLE localFoodApplicationVotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  applicationId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vote (applicationId, userId),
  FOREIGN KEY (applicationId) REFERENCES localFoodApplications(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

**Migration file:** `drizzle/0091_local_food_applications.sql`

### tRPC Router: `server/routes/localFood.ts`

Follow the pattern in `server/routes/features.ts` and `server/routes/quests.ts` (suggestion flows).

Procedures:
- `list` — public, returns all applications with vote counts
- `myVotes` — authenticated, returns user's vote ids
- `apply` — authenticated, creates application + auto-creates forum thread in `local-food-economy` category
- `toggleVote` — authenticated, upvote / remove upvote
- `updateStatus` — admin only, moves between pending / under_review / approved / declined

Auto-create forum thread on apply:
- Category slug: `local-food-economy`
- Title: `{orgName} — {role} — {location}`
- Body: the description field, plus a header line with commitment percent
- Author: applicant

Register router in `server/routes/_app.ts` as `localFood`.

### Forum Category

Add new forum category via migration:

```sql
-- drizzle/0092_local_food_forum_category.sql
INSERT INTO forumCategories (name, slug, description, icon, color, sortOrder)
VALUES (
  'Local Food Economy',
  'local-food-economy',
  'Food producer applications and bioregional economy activation',
  'wheat',
  '#7dd87d',
  50
);
```

---

## Application Form Component

Simple form following the pattern used on `/play/incubator/apply` or `FeatureSuggestions.tsx`:

**Fields:**
1. `orgName` — text input
2. `role` — select (grower, distributor, preparer, marketplace, other)
3. `location` — text input, placeholder "bioregion or city"
4. `commitmentPercent` — slider 10 to 100, default 50
5. `description` — textarea, "Tell us about your operation and why it's regenerative"

**Submit handler:** `trpc.localFood.apply.useMutation()` with success toast + redirect to the newly created forum thread.

**Below the form (text block):**
> Already part of a food network or co-op? Bring your whole network. The more producers in a bioregion, the closer you are to Go Live.

---

## Hook Banner

Insert the standard hook banner component above the closing CTA. Full-width, #2D2A26 background, #FAF8F3 serif text:

> A currency backed by local food. If enough producers and communities join, we go live. If enough of us play the Game, it's real.

CTA link: `Explore the full economy ->` to `/economy`.

---

## Closing CTA

**Headline:** Feed the Renaissance

**Two paths:**
1. "Apply as a Food Producer" — scrolls to form
2. "Start a Quest" — `/quest`

**Below:**
> The destiny of civilizations depends on how they feed themselves. We're building an economy where the people growing real food are the most rewarded members of society. Join us.

---

## Done Criteria

- [ ] Route `/local-food-economy` renders with all 7 sections and hook banner
- [ ] Navigation dropdown includes "Local Food Economy"
- [ ] Hero watercolor image loads (or placeholder with TODO if Rye has not yet provided)
- [ ] Alliance logos band renders (or TODO placeholder for missing logos)
- [ ] Application form submits, creates `localFoodApplications` row, creates forum thread
- [ ] Forum category `local-food-economy` exists and is linked from the new applications
- [ ] No em-dashes anywhere in the rendered copy
- [ ] No AI-isms (grep the file for banned words before claiming done)
- [ ] No contrast-framing ("not X, but Y") anywhere
- [ ] Page passes on mobile (375px) and desktop (1440px)
- [ ] Closing CTA scrolls to form (not a separate page)

---

## What Rye Still Needs to Provide

1. **The watercolor P2P food system image** — drop into uploads folder or directly into `client/public/images/economy/`
2. **The family wizards SVG** — confirm which asset, or provide a new one
3. **Confirm commitment tiers** — 10/50/90 or 10/25/50/75/100? The draft mentions both.
4. **Confirm any alliance logos that should be excluded** — not every tool in the alliance list needs to be on this page

Everything else, Claude Code can build from this spec + `DRAFT_GAME_AND_ECONOMY_PAGES.md` Part 4.
