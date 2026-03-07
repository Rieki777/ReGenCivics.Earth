# Roadmap Batch — Content Review

**Purpose:** Review all copy, content, and logic before pushing to production. Add comments in the `> FEEDBACK:` sections under each item.

---

## #29 — Investor Email Drip Sequence

Four emails scheduled automatically when someone submits the investor inquiry form. Delivered at Day 3, 7, 14, and 30 by the existing background email processor.

---

### Email 1 — Day 3

**Subject line:**
```
The ReGen Civics Fund: How the Economics Work
```

**Opening line:**
```
Thank you for your interest in the ReGen Civics Alliance Fund. We've received your
inquiry and are excited to share our full investment materials with you.
```

**Fund Structure box — bullet list:**
```
- Target return: 12–18% net IRR (Target scenario)
- Preferred return: 8% cumulative before carry
- Carried interest: 20% above the preferred return
- Management fee: 1.5% annually
- Minimum commitment: $250,000
- Distributions: Quarterly from Year 3
```

**Body paragraph:**
```
The fund deploys into a diversified portfolio of regenerative land projects —
eco-villages, food forests, and community-owned land — that generate returns
through land appreciation, community revenue, and alliance services.

You can explore our full allocation model and scenario projections at
regencivics.earth/opportunity.
```

**CTA button:** `Read the Full Opportunity` → `/opportunity`

> FEEDBACK:


---

### Email 2 — Day 7

**Subject line:**
```
Inside a ReGen Civics Land Project
```

**Opening line:**
```
Behind every fund investment is a real place — land being stewarded by people
committed to regeneration. Here's what a typical Season 2 project looks like.
```

**Case study box — bullet list:**
```
- Community-owned land (1–500+ hectares)
- Mixed-use: residential, food production, ecological restoration
- Governed by a DAO — transparent, participatory
- Revenue from membership, produce, services, and events
- Success fees flow back to fund investors quarterly from Year 3+
```

**Body paragraph:**
```
We currently have 13+ projects in various stages on the map.
Browse them at regencivics.earth/map.

If you'd like to understand how we evaluate and select projects — including our
due diligence process — come explore our Forum and ask any questions you have.
```

**CTA button:** `Explore Land Projects` → `/land`

> FEEDBACK:
Add a link to the forum 

---

### Email 3 — Day 14

**Subject line:**
```
Common questions from investors — and an invitation
```

**Opening line:**
```
It's been two weeks since you expressed interest in ReGen Civics. We thought
we'd answer the questions we hear most often at this stage.
```

**FAQ block:**

*Q: When does the fund accept capital?*
```
The fund will not accept capital until we have reached our $20M threshold,
ensuring meaningful diversification from day one. We are currently building
commitments through Letters of Intent. At this point we'll host a 3 day event where investors, land project stewards, and a council of domain experts will have the opportunity to gather and decide on the final structure of the fund. This way the fund best represents the needs and perspectives of all parties it's needing to serve.
```

*Q: Is this a long-term commitment?*
```
Yes — this is a long-term investment aligned with the timelines of land and
ecological restoration. Quarterly distributions begin in Year 3. The fund is
designed to grow with the regenerative economy.
```

*Q: How do I signal serious interest?*
```
Sign a non-binding Letter of Intent at regencivics.earth/loi. This signals
your intent and ensures you're included in our formal launch process.
It carries no obligation.
```

**Call invitation box:**
```
Ready to talk?
Schedule a 30-minute call with our team — no pressure, just a conversation.
```
**CTA button:** `Book a Call` → `https://calendly.com/rieki-cordon/30min`

> FEEDBACK:


---

### Email 4 — Day 30

**Subject line:**
```
One month on — have you signed your Letter of Intent?
```

**Opening line:**
```
It's been a month since you first reached out about ReGen Civics. We want to
make sure you haven't missed the chance to secure your position in the fund.
```

**Highlighted LOI box:**
```
Sign Your Letter of Intent

Non-binding. Takes 2 minutes. Ensures you're first in line when the fund opens.
```
**CTA button:** `Sign the LOI` → `/loi`

**Closing paragraphs:**
```
If you have questions, concerns, or simply want to talk through the opportunity,
reply to this email or book a call here.

The regenerative renaissance is underway — and your capital can help it accelerate.
```

**Footer note:**
```
You received this because you expressed interest in ReGen Civics. [Unsubscribe]
```

> FEEDBACK:
book a call here links to https://calendly.com/rieki-cordon/30min

---

## #20 — Trust Bar on /opportunity

Appears between the legal disclaimer and the hero heading. Two rows.

**Section label (small caps above the bar):**
```
Season 1 Partner Network & Ecosystem
```

**Row 1 — Partner names (muted, hover to reveal):**
```
Hypha DAO · SEEDS · Traditional Dream Factory · Nestr.io · OASA.earth ·
Closer.earth · Kinship Earth · Planetary Party · Gaia Union BioLab
```

**Row 2 — Credibility signals (with icons):**
```
🛡 Reg D 506(c) Compliant
🌍 13+ Global Land Projects
👥 Active Investor Network
🏛 Hypha DAO Infrastructure
```

> FEEDBACK:
Don't have this section yet. Hold off on this and we'll add a trust section when i get 20+ more land and alliance organisations committed. 

---

## #19 — First Visit Onboarding Overlay

Appears 1.8 seconds after a browser's first page load, anywhere on the site. Dismisses permanently on choice or skip. Stored in `localStorage` as `regen_first_visit_done`.

**Badge text:**
```
Welcome to ReGen Civics
```

**Heading:**
```
Choose Your Path
```

**Subheading:**
```
ReGen Civics is an infinite game for the regenerative renaissance.
Where do you fit in?
```

**Four path cards:**

| Card | Description text | Navigates to |
|---|---|---|
| Impact Investor | I want to invest in the regenerative renaissance | /fund |
| Land Project | We're building a regenerative community or eco-village | /land |
| Alliance Partner | My organisation supports the regenerative movement | /ally |
| ReGen Player | I want to play quests and earn tokens | /play |

**Skip link:**
```
I'll explore on my own
```

> FEEDBACK: Don't have this section either as the main landing page answers this already. No need for this.


---

## #24 — Season Timeline on /seasons

New section added before "Related Content" at the bottom of the Seasons page.

**Section badge:**
```
The Journey So Far
```

**Section heading:**
```
Season Timeline
```

**Section subheading:**
```
From the first cohort to a growing global network of regenerative land projects.
```

---

**Season 1 — "Spring Season" 2021 — Complete**
```
- First cohort of 13 land projects incubated
- Regenerative Infinite Games framework built and evolved
- 13-week curriculum developed & refined
- Alliance network foundations established
- Crowd pooling platform concieved 
```

**Season 2 — "Winter Season" 2021-2026 — Complete**
```
- Expanded cohort with international projects
- DAO governance structures implemented and refined
- Tokenomics framework designed
- Fund structure finalized & investor outreach begun
- Quests, Games, CrowdPooling structures built out
- Admin panel for coordinating projects and applications built
- Tooling for organisation and coordinating the Fund and Games built, tested, and refined
- Legal and regulatory exploration to design the Fund
```

**Season 3 — "Spring Season coming September 2026" — Opening Now** *(pulsing green node)*
```
- Upcoming Cohort — opening September Equinox
- Live investor due diligence for fund launch
- ReGen Games & custom land games rollout
- Fund governance & $RCivics token live
- ReGen Game Governance & $ReGen token live
- Accepting LOI's for the Fund
- Built out a "ReGen Game" template for land projects
```

**Season 4+ — 2027 & Beyond — Coming Soon** *(greyed node)*
```
- Fund reaches $20M+ threshold & goes live
- Quarterly distributions begin (Year 3)
- Network expands to 30+ projects globally
- Bioregional hubs established on 4+ continents
- Regenerative economy networking across our Earth
```

> FEEDBACK:


---

## #3 — Governance Page: Two Tokens Image

**Status:** Done — image updated to Cloudflare CDN.

Old source: `/earned-through-quests.png` (local public file)
New source: `https://assets.regencivics.earth/Earned%20Through%20Quests%20(1).png`

The image appears in the "Two Token System" section of `/governance`, directly below the intro paragraph: *"ReGen Civics uses two distinct tokens, each serving a fundamentally different purpose. Voice governs decisions. Tokens distribute rewards."*

> FEEDBACK: If the image URL isn't resolving correctly, let me know and I'll update it to the exact Cloudflare URL.


---

## Open Questions Before Push

1. **Drip timing** — Day 3 / 7 / 14 / 30. Correct gaps, or adjust? YES
2. **Calendly URL** — Emails link to `calendly.com/regencivics/investor-call`. Correct link? = https://calendly.com/rieki-cordon/30min
3. **Trust bar partners** — Correct list of 9 names? Any to add or remove? Don't have for now
4. **Season 1 facts** — Was it 6 projects in Season 1? Any factual corrections to the outcome bullets? Updated to the facts.
5. **Onboarding trigger** — Currently shows on all pages after 1.8s. Prefer homepage-only, or a different delay? Don't have this

> ANSWERS:
Answers immediately following questions