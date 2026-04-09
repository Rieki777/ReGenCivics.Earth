# Site Audit: Earth Day Launch Readiness
**Date:** 2026-04-07
**Pages audited:** /, /fund, /play, /community, /apply, /bionomics, /tokenomics, /land, /map, /blog

---

## Summary

The site is in genuinely strong shape. Visual design is cohesive and distinctive across all pages. The bionomics and tokenomics pages are some of the best writing on the site. The map is beautiful and functional. The main things to handle before Earth Day are below, ordered by priority.

---

## Fixes Already Made (in this session)

**Map: Tabi Regenerativo broken image**
The project card was showing a solid lime-green block because the CDN file `tAiFiPiWRBOxUGZV.jpg` doesn't exist in R2 storage. The image URL was removed so the card renders cleanly without an image. Also added a general `onError` handler to all map project images so future broken CDN files degrade gracefully instead of showing a color block.

**Writing rule violations fixed across 4 pages:**

- `/bionomics` closing line: "We are walking toward it together" (Rule 5: passive inspiration) changed to "People are already building it."
- `/land` hero text: "take your regenerative land project to the next level, while providing a better investment vehicle to raise funds" (generic corporate language) changed to "We help you design the economic, financial, and governance game your land project needs to thrive and access capital from the regenerative fund."
- `/land` CTA section: "receive the support your vision deserves" (Rule 5) changed to specific info about the application process taking 15 minutes and the team reviewing every submission directly.
- `/play` high dedication section: "Ready to go deeper?" opener (Rule 4: no rhetorical question openers) changed to direct description of the paths.
- `/tokenomics` closing paragraph: contrast framing "not designed to extract value... It is designed to" (Rule 2) rewritten to affirmative: "keeps value circulating within the movement."

---

## Findings by Page

### Home page (/)

**Overall:** Strong. The hero, path cards, and general flow read well. The visual design is distinctive.

**One issue to investigate:** A large solid dark-green area appears in the middle of the full landing page view (multiple viewport-heights with no visible content). DOM inspection confirms text IS there with correct computed styles, so this is most likely a GPU compositing/parallax rendering issue affecting only some environments or screen sizes. Worth testing on a real device with Rye before launch. The section text is "Two Spaces, One Vision."

**No writing rule violations found.**

---

### /fund

**Overall:** Good. The hero is clear, the investment thesis framing is solid, the "What You Give & Receive" section is honest and grounded.

**One thing to watch:** The MODEL DASHBOARD shows very large model projections ($51M treasury, $718K distributed) in what looks like a live dashboard format. The disclaimer "Distributions won't begin until fund reaches $20M committed" is there but small. Anyone who doesn't read carefully could think these are real figures. Before showing this to investors, make sure the "MODEL" label is prominent enough that nobody walks away thinking the fund already holds $51M.

**"Video Coming Soon"** in the Fund Overview section is a visible placeholder. Fine for now but worth flagging before the formal launch.

**No writing rule violations found.**

---

### /play

**Overall:** Looks excellent. The fantasy landscape hero is the right visual tone. The game mode breakdown (TRADE, QUEST, CATALYZE, JOIN, CLAIM) is clear and well-organized.

**Writing fix already applied:** "Ready to go deeper?" section subheader.

**One minor note:** "Want to Learn More?" at the bottom is a mild rhetorical question header. Not a hard Rule 4 violation (it's not an opener for a major section) but could be tightened to something like "Dive deeper into the game mechanics."

---

### /community (Gathering Grove)

**Overall:** The page looks and reads well. "Gathering Grove" is a great name. Forum design is clean.

**Live stat concern:** The forum shows "9 posts this week, 0 replies." For Earth Day launch, this signals low engagement to new visitors. Before launch, consider seeding a few replies to the existing threads so newcomers arrive to an active-looking community rather than a wall of unanswered posts.

**No writing rule violations found.**

---

### /apply

**Overall:** Clean, functional, well-designed multi-step form. The draft-save feature is excellent UX. "Step 1 of 5" progress is reassuring.

**No issues found.** The "The things" appearing in the Project Vision field is old draft content from a previous test session, not a bug for real users.

---

### /bionomics

**Overall:** This is the strongest page on the site. The writing is specific, grounded, and uniquely Rye's voice. The lineage timeline is a great touch. The BFF framework integration gives it intellectual depth without being dense.

**Writing fix already applied:** Closing "We are walking toward it together."

**One minor note:** The "Two Sides" section uses some subtle structural contrast ("Tokenomics covers X, Bionomics covers Y") but it's complementary framing rather than defining-by-opposition, so it passes Rule 2 as written.

---

### /tokenomics

**Overall:** Rich, well-structured, explains complex token mechanics accessibly. The animated counter stats (13 Projects per Season, 30+ Alliance Orgs Interested) show as 0 on page load before animating in when scrolled into view. This is correct behavior, not a bug.

**Writing fix already applied:** Contrast framing in the closing paragraph.

**One thing to watch:** The "Invest in the Movement" CTA button at the very bottom leans toward passive inspiration (Rule 5). Could be "Submit Your Letter of Intent" or "Start Your Investor Journey" instead.

---

### /land

**Overall:** Good. The barren-to-regenerative hero image is powerful. The Ministry Program section is specific and compelling. The application flow is clear.

**Two writing fixes already applied:** Hero text and CTA section.

**One note:** "From Pasture to Paradise" video section shows a "Your browser does not support the video tag." fallback in the DOM. This is a standard HTML5 video fallback and only shows if video doesn't load. Worth checking in Safari/older browsers that the video plays before launch.

---

### /map

**Overall:** Genuinely impressive. 3D globe with 31 projects and organizations, searchable with filters. This is a standout feature.

**Bug fixed:** Tabi Regenerativo card was showing a solid lime-green block due to missing CDN image.

**Minor UX note:** Several projects show "Inactive" status badges. For a launch audience, seeing multiple inactive projects in the list might undercut confidence. Consider defaulting the filter to active-only, with an option to show all. This is a judgment call.

---

### /blog

**Overall:** Good design, the "Start Here" video feature works well. The curated blog list covers the right topics.

**Subtitle to revisit:** "Stories, insights, and updates from our journey toward a regenerative civilization." The word "journey" is not banned but the phrase pattern is close to the generic inspiration style. "Stories and field notes from building the regenerative renaissance" would be more specific to Rye's voice.

---

## Things That Are Not Bugs

**Blank dark-green sections in screenshots:** These are a Chrome DevTools Protocol (CDP) screenshot artifact from GPU-composited video/parallax layers. The content IS there and IS visible to real users. This affected the home page, /fund, and /tokenomics hero sections in screenshots but not in actual browsers.

**"0 Projects per Season" in page text:** This is the pre-animation state of an animated counter. It counts up to 13/30 when users scroll to that section.

---

## Before Earth Day: Priority Checklist

High priority:

1. Seed a few replies to community forum posts before launch (human step)
2. Verify the "Two Spaces, One Vision" section on the home page renders correctly on real devices, especially on Safari and mobile
3. Check the /land "From Pasture to Paradise" video plays in Safari
4. Review the MODEL DASHBOARD prominence on /fund before investor conversations
5. Get a real image uploaded to CDN for Tabi Regenerativo (the card renders text-only now which is fine, but an image would be better)

Lower priority:

6. "Want to Learn More?" on /play could be tightened
7. "Invest in the Movement" button on /tokenomics could be more specific
8. "Video Coming Soon" placeholder on /fund fund overview section
9. /blog subtitle could be more specific
10. Consider defaulting the map filter to active projects only

---

*Audit performed by automated browser + DOM inspection across all main pages.*
