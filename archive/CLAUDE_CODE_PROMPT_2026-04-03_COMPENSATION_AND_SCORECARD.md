# Execution Prompt: Compensation Bands, Seed/Harvest Bonuses, and Season Scorecard

## Overview

Three changes to the Team page:
1. **Update all role compensation** from arbitrary token amounts to the 7-band system with Seed/Harvest bonus metrics
2. **Add Seed/Harvest display** to each role's portal modal and a "Role Variables" summary section on the page
3. **Add a Season Scorecard section** at the bottom of the Team page showing current season progress

**File:** `client/src/pages/Team.tsx` (primary) + supporting types

---

## Part 1: Update the gameRoles Array Compensation Data

In the `gameRoles` array (Part A of `CLAUDE_CODE_PROMPT_2026-04-02_TEAM_ROLES.md`), update every role to use the new compensation fields. Replace the old `tokenAward` string with the new structure.

### New fields to add to every role object:

```typescript
band: number,              // 1-7
tokenAward: string,        // base amount (e.g., "700,000 $ReGen ($7,000)")
maxTokenAward: string,     // with +30% bonus
hoursPerWeek: number,      // estimated weekly hours
deliverables: string[],    // what comp is tied to
seed: string,              // planting commitment
harvest: string,           // ecosystem impact
```

### Role-by-role updates:

```typescript
// Season Facilitator
band: 5,
tokenAward: "700,000 $ReGen ($7,000)",
maxTokenAward: "910,000 $ReGen ($9,100)",
hoursPerWeek: 12,
deliverables: [
  "Facilitate weekly incubation sessions",
  "Track project milestones and flag blockers",
  "Write season wrap-up report",
  "Onboard incoming projects at season start"
],
seed: "All scheduled sessions held on time through the season",
harvest: "Land projects report feeling supported (Season Festival survey, target: 4+/5 average)",

// Alliance Weaver
band: 4,
tokenAward: "600,000 $ReGen ($6,000)",
maxTokenAward: "780,000 $ReGen ($7,800)",
hoursPerWeek: 10,
deliverables: [
  "Maintain active contact with 10+ alliance partners per season",
  "Report on partnership health monthly",
  "Coordinate investor communications with Treasury Steward",
  "Facilitate alliance partner onboarding"
],
seed: "New partnership conversations opened (target: 3+ per season)",
harvest: "At least one partnership that resulted in tangible support for a land project",

// Incubator Guide
band: 3,
tokenAward: "500,000 $ReGen ($5,000)",
maxTokenAward: "650,000 $ReGen ($6,500)",
hoursPerWeek: 10,
deliverables: [
  "Guide 3-4 land projects per season",
  "Check in with each project weekly",
  "Document project progress and lessons learned",
  "Connect projects with relevant tools from the Tools Library"
],
seed: "Weekly check-ins with every guided project completed through the season",
harvest: "Guided projects hitting their own self-set milestones (target: 70%+ on track)",

// Forum Gardener
band: 1,
tokenAward: "300,000 $ReGen ($3,000)",
maxTokenAward: "390,000 $ReGen ($3,900)",
hoursPerWeek: 6,
deliverables: [
  "Post 2-3 seed discussions per week",
  "Respond to new member introductions within 24 hours",
  "Review flagged content daily",
  "Write monthly community health report"
],
seed: "Seed discussions posted each week throughout the season",
harvest: "New members who came back and posted more than once (community retention)",

// Game Designer
band: 6,
tokenAward: "800,000 $ReGen ($8,000)",
maxTokenAward: "1,040,000 $ReGen ($10,400)",
hoursPerWeek: 12,
deliverables: [
  "Maintain the game spec (REGEN_GAMES_SPEC_V1.md)",
  "Balance contribution scoring each season",
  "Design 2+ new quests per season",
  "Document all game mechanic changes and reasoning"
],
seed: "New quests or mechanics designed and live on the site (target: 2+)",
harvest: "Players completing those quests (measured by quest completion count)",

// Treasury Steward
band: 4,
tokenAward: "600,000 $ReGen ($6,000)",
maxTokenAward: "780,000 $ReGen ($7,800)",
hoursPerWeek: 8,
deliverables: [
  "Process payments within 48 hours of approval",
  "Publish monthly treasury reports",
  "Track all fund inflows and outflows",
  "Coordinate with Alliance Weaver on investor fund allocations"
],
seed: "Monthly reports published on time and visible to the community",
harvest: "Community reports zero confusion about where money went (Season Festival survey, target: 4+/5)",

// Storyteller
band: 3,
tokenAward: "500,000 $ReGen ($5,000)",
maxTokenAward: "650,000 $ReGen ($6,500)",
hoursPerWeek: 10,
deliverables: [
  "Publish 2+ blog posts per month",
  "Maintain social media presence (3+ posts per week)",
  "Write or edit the monthly newsletter",
  "Run content through the avoid-ai-writing skill before publishing"
],
seed: "Content published on cadence (blog, social, newsletter targets met)",
harvest: "New community members who say content brought them here (signup source tracking, target: 10+/season)",

// Grand Builder
band: 7,
tokenAward: "900,000 $ReGen ($9,000)",
maxTokenAward: "1,170,000 $ReGen ($11,700)",
hoursPerWeek: 15,
deliverables: [
  "Review all community PRs weekly",
  "Maintain CI/CD pipeline and deployment process",
  "Write execution prompts for major features",
  "Mentor new code contributors"
],
seed: "Features and fixes shipped to production through the season",
harvest: "Community contributors who merged their first PR (people you enabled)",

// Security Reviewer
band: 6,
tokenAward: "800,000 $ReGen ($8,000)",
maxTokenAward: "1,040,000 $ReGen ($10,400)",
hoursPerWeek: 10,
deliverables: [
  "Review all PRs for security vulnerabilities weekly",
  "Maintain and improve security scanning workflows",
  "Document security practices and known risks",
  "Run quarterly security audits"
],
seed: "Security reviews completed for every community PR through the season",
harvest: "Zero critical vulnerabilities reaching production",

// Tool Curator
band: 3,
tokenAward: "500,000 $ReGen ($5,000)",
maxTokenAward: "650,000 $ReGen ($6,500)",
hoursPerWeek: 6,
deliverables: [
  "Review tool submissions within 72 hours",
  "Write or improve 5+ tool descriptions per month",
  "Connect tools to relevant quests and seasons",
  "Track tool usage metrics and report quarterly"
],
seed: "Submissions reviewed and cataloged within the season (target: 72hr turnaround)",
harvest: "Tools actually getting used by land projects (usage tracking)",

// Quest Steward
band: 2,
tokenAward: "400,000 $ReGen ($4,000)",
maxTokenAward: "520,000 $ReGen ($5,200)",
hoursPerWeek: 8,
deliverables: [
  "Design 3+ new quests per season",
  "Write forum seed posts for each quest",
  "Track quest completion rates and adjust difficulty",
  "Collaborate with Game Designer on progression balance"
],
seed: "Quests designed, written, and live with forum seed posts (target: 3+)",
harvest: "Players completing those specific quests (completion count)",

// Outreach Writer
band: 2,
tokenAward: "400,000 $ReGen ($4,000)",
maxTokenAward: "520,000 $ReGen ($5,200)",
hoursPerWeek: 8,
deliverables: [
  "Write 2+ outreach sequences per season",
  "Maintain email templates and adapt for each campaign",
  "Track open rates and conversion metrics",
  "Collaborate with Alliance Weaver on investor messaging"
],
seed: "Sequences written and sent on schedule (target: 2+)",
harvest: "People who responded or applied (actual human engagement, not open rates)",

// Skills Builder
band: 5,
tokenAward: "700,000 $ReGen ($7,000)",
maxTokenAward: "910,000 $ReGen ($9,100)",
hoursPerWeek: 10,
deliverables: [
  "Build 2+ new skills per season",
  "Maintain and improve existing skills based on usage feedback",
  "Document skill usage patterns and best practices",
  "Test skills across different Claude interfaces"
],
seed: "New skills shipped to the repo (target: 2+)",
harvest: "Other contributors actively using those skills (adoption tracking)",
```

---

## Part 2: Add Seed/Harvest to the Role Portal Modal

In the RolePortalCard expanded modal (Part C of TEAM_ROLES), add a new section between **Domains** and the **Token Award** section. This shows the Seed/Harvest bonus metrics.

### Add after the Domains section:

```tsx
{/* Seed and Harvest */}
<div className="mt-6">
  <h4 className="text-xs uppercase tracking-wider text-[#7dd87d] font-semibold mb-4">Seed & Harvest</h4>
  <div className="grid md:grid-cols-2 gap-3">
    {/* Seed */}
    <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🌱</span>
        <span className="text-[#7dd87d] font-semibold text-sm">Seed</span>
        <span className="text-white/40 text-xs ml-auto">Did you plant it?</span>
      </div>
      <p className="text-white/70 text-sm">{role.seed}</p>
    </div>
    {/* Harvest */}
    <div className="bg-[#fbbf24]/10 border border-[#fbbf24]/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🌾</span>
        <span className="text-[#fbbf24] font-semibold text-sm">Harvest</span>
        <span className="text-white/40 text-xs ml-auto">Did it grow?</span>
      </div>
      <p className="text-white/70 text-sm">{role.harvest}</p>
    </div>
  </div>
  <p className="text-white/40 text-xs mt-3 text-center">
    Both met = +30% bonus on base. One met = +15%. Reviewed at the Season Festival.
  </p>
</div>
```

### Update the Token Award section to show the new data:

Replace the existing token award badge with:

```tsx
{/* Compensation */}
<div className="mt-6">
  <h4 className="text-xs uppercase tracking-wider text-[#7dd87d] font-semibold mb-3">Compensation</h4>
  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-[#7dd87d] font-bold text-lg">{role.tokenAward.split(' ')[0]}</span>
        <span className="text-white/50 text-sm">$ReGen / season</span>
      </div>
      <span className="bg-[#7dd87d]/20 text-[#7dd87d] text-xs font-semibold px-2 py-1 rounded-full">
        Band {role.band}
      </span>
    </div>
    <div className="flex items-center justify-between text-xs text-white/40">
      <span>~{role.hoursPerWeek} hrs/week</span>
      <span>Up to {role.maxTokenAward.split(' ')[0]} with Seed + Harvest</span>
    </div>
  </div>
</div>

{/* Deliverables */}
<div className="mt-4">
  <h4 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-2">Deliverables</h4>
  <ul className="space-y-1.5">
    {role.deliverables.map((d: string, i: number) => (
      <li key={i} className="flex items-start gap-2 text-white/60 text-sm">
        <span className="text-[#7dd87d] mt-0.5">📦</span>
        <span>{d}</span>
      </li>
    ))}
  </ul>
</div>
```

---

## Part 3: Add "Role Variables" Section to the Team Page

After the role cards grid and before the Seasonal Rhythm section, add a summary section that shows how the Seed/Harvest system works. This makes the bonus model transparent and visible to everyone visiting the page.

```tsx
{/* Role Variables - Seed and Harvest */}
<section className="py-16 px-4">
  <div className="container mx-auto max-w-5xl">
    <div className="text-center mb-10">
      <div className="inline-flex items-center gap-2 bg-[#7dd87d]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-[#7dd87d]/30">
        <span className="text-lg">🌱</span>
        <span className="text-[#7dd87d] font-medium text-sm uppercase tracking-wide">Role Variables</span>
      </div>
      <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        Seed & <span className="text-[#fbbf24]">Harvest</span>
      </h2>
      <p className="text-lg text-white/70 max-w-3xl mx-auto">
        Every role has a planting commitment and an ecosystem impact metric. At the end of each season, the community reviews what got planted and what grew.
      </p>
    </div>

    {/* How it works */}
    <div className="grid md:grid-cols-3 gap-6 mb-10">
      <div className="bg-[#7dd87d]/10 border border-[#7dd87d]/20 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🌱</div>
        <h3 className="text-white font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Plant Your Seeds</h3>
        <p className="text-white/60 text-sm">Each role has specific deliverables you commit to. Ship the work, and your seeds are planted.</p>
      </div>
      <div className="bg-[#fbbf24]/10 border border-[#fbbf24]/20 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🌾</div>
        <h3 className="text-white font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Watch the Harvest</h3>
        <p className="text-white/60 text-sm">Did other people benefit from your work? New contributors, completed quests, projects on track. The ecosystem tells us.</p>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🎊</div>
        <h3 className="text-white font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Season Festival Review</h3>
        <p className="text-white/60 text-sm">At each season transition, the community gathers to review outcomes. Seeds planted + harvest in = +30% bonus. One of the two = +15%.</p>
      </div>
    </div>

    {/* Compensation bands table */}
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        Compensation Bands
      </h3>
      <p className="text-white/50 text-sm mb-4">
        7 bands. 3:1 ratio from top to bottom. $ReGen is currently valued at $0.01 each. All role holders know exactly where they stand.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
              <th className="text-left py-3 px-2">Band</th>
              <th className="text-left py-3 px-2">$ReGen/Season</th>
              <th className="text-left py-3 px-2">USD Value</th>
              <th className="text-left py-3 px-2">Max w/ Bonus</th>
              <th className="text-left py-3 px-2 hidden md:table-cell">Roles</th>
            </tr>
          </thead>
          <tbody className="text-white/70">
            {[
              { band: 7, base: "900,000", usd: "$9,000", max: "$11,700", roles: "Grand Builder" },
              { band: 6, base: "800,000", usd: "$8,000", max: "$10,400", roles: "Game Designer, Security Reviewer" },
              { band: 5, base: "700,000", usd: "$7,000", max: "$9,100", roles: "Skills Builder, Season Facilitator" },
              { band: 4, base: "600,000", usd: "$6,000", max: "$7,800", roles: "Alliance Weaver, Treasury Steward" },
              { band: 3, base: "500,000", usd: "$5,000", max: "$6,500", roles: "Storyteller, Incubator Guide, Tool Curator" },
              { band: 2, base: "400,000", usd: "$4,000", max: "$5,200", roles: "Quest Steward, Outreach Writer" },
              { band: 1, base: "300,000", usd: "$3,000", max: "$3,900", roles: "Forum Gardener" },
            ].map((row) => (
              <tr key={row.band} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-3 px-2">
                  <span className="bg-[#7dd87d]/20 text-[#7dd87d] text-xs font-bold px-2 py-0.5 rounded-full">
                    {row.band}
                  </span>
                </td>
                <td className="py-3 px-2 font-mono text-[#7dd87d]">{row.base}</td>
                <td className="py-3 px-2">{row.usd}</td>
                <td className="py-3 px-2 text-[#fbbf24]">{row.max}</td>
                <td className="py-3 px-2 text-white/50 hidden md:table-cell">{row.roles}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* All roles Seed & Harvest summary */}
    <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        What We Track
      </h3>
      <div className="space-y-3">
        {gameRoles.map((role) => (
          <div key={role.title} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 py-3 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2 md:w-48 flex-shrink-0">
              <span>{role.emoji}</span>
              <span className="text-white font-semibold text-sm">{role.characterName}</span>
            </div>
            <div className="flex-1 grid md:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#7dd87d]">🌱</span>
                <span className="text-white/60">{role.seed}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#fbbf24]">🌾</span>
                <span className="text-white/60">{role.harvest}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>
```

---

## Part 4: Season Scorecard Section

Add this section at the bottom of the Team page, **after** the "How to Apply" section and **before** the final CTA. This shows current season progress and links to past seasons.

```tsx
{/* Season Scorecard */}
<section className="py-16 px-4 bg-[#0d2818]">
  <div className="container mx-auto max-w-5xl">
    <div className="text-center mb-10">
      <div className="inline-flex items-center gap-2 bg-[#fbbf24]/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4 border border-[#fbbf24]/30">
        <span className="text-lg">📊</span>
        <span className="text-[#fbbf24] font-medium text-sm uppercase tracking-wide">Season Scorecard</span>
      </div>
      <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        Season 1: <span className="text-[#7dd87d]">The First Build</span>
      </h2>
      <p className="text-white/70 max-w-2xl mx-auto">
        Winter 2025-2026. Building the tools, writing the code, designing the game. Here's where each role stands.
      </p>
    </div>

    {/* Role progress cards */}
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {gameRoles.map((role) => {
        const isActive = seasons.find(s => s.current)?.activeRoles.includes(role.title);
        return (
          <div
            key={role.title}
            className={`rounded-xl p-4 border ${isActive ? 'bg-white/5 border-[#7dd87d]/20' : 'bg-white/[0.02] border-white/5 opacity-50'}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{role.emoji}</span>
              <div>
                <span className="text-white font-semibold text-sm">{role.characterName}</span>
                <span className="text-white/40 text-xs ml-2">{role.title}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                role.assignment === 'Open' ? 'bg-[#fbbf24]/20 text-[#fbbf24]' :
                role.assignment === 'Golden opportunity' ? 'bg-[#fbbf24]/30 text-[#fbbf24] font-semibold' :
                'bg-[#7dd87d]/20 text-[#7dd87d]'
              }`}>
                {role.assignment}
              </span>
              <span className="text-white/30 text-xs">Band {role.band}</span>
            </div>
            {isActive && (
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs">🌱</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    {/* Placeholder: fill based on actual progress data when available */}
                    <div className="h-full bg-[#7dd87d]/40 rounded-full" style={{ width: '0%' }} />
                  </div>
                  <span className="text-white/30 text-[10px]">Seed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">🌾</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#fbbf24]/40 rounded-full" style={{ width: '0%' }} />
                  </div>
                  <span className="text-white/30 text-[10px]">Harvest</span>
                </div>
              </div>
            )}
            {!isActive && (
              <p className="text-white/30 text-xs mt-2">Resting this season</p>
            )}
          </div>
        );
      })}
    </div>

    {/* Season summary stats */}
    <div className="mt-8 grid md:grid-cols-4 gap-4">
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
        <div className="text-2xl font-bold text-[#7dd87d]">13</div>
        <div className="text-white/50 text-xs uppercase tracking-wide mt-1">Total Roles</div>
      </div>
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
        <div className="text-2xl font-bold text-[#fbbf24]">9</div>
        <div className="text-white/50 text-xs uppercase tracking-wide mt-1">Open Roles</div>
      </div>
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
        <div className="text-2xl font-bold text-white">7.4M</div>
        <div className="text-white/50 text-xs uppercase tracking-wide mt-1">$ReGen Base Budget</div>
      </div>
      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
        <div className="text-2xl font-bold text-[#fbbf24]">9.6M</div>
        <div className="text-white/50 text-xs uppercase tracking-wide mt-1">$ReGen Max Budget</div>
      </div>
    </div>

    {/* Past seasons accordion placeholder */}
    <div className="mt-8 bg-white/5 rounded-xl p-6 border border-white/10 text-center">
      <p className="text-white/40 text-sm">Past season archives will appear here after the first Season Festival.</p>
    </div>
  </div>
</section>
```

---

## Part 5: Update the Card Front (compact view)

On the card exterior (Part C front state), update the bottom bar to show the band and hours instead of just the old token amount:

Replace the token award badge in the card bottom bar with:

```tsx
<div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
  <div className="flex items-center gap-2">
    {/* Season dots */}
    {role.seasons.map((s: string) => (
      <div
        key={s}
        className="w-2 h-2 rounded-full"
        style={{
          backgroundColor:
            s === 'winter' ? '#93c5fd' :
            s === 'spring' ? '#7dd87d' :
            s === 'summer' ? '#fbbf24' :
            '#d4a574'
        }}
        title={s.charAt(0).toUpperCase() + s.slice(1)}
      />
    ))}
  </div>
  <div className="flex items-center gap-2">
    <span className="text-white/40 text-xs">~{role.hoursPerWeek}h/wk</span>
    <span className="bg-[#7dd87d]/20 text-[#7dd87d] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
      B{role.band}
    </span>
  </div>
</div>
```

---

## Part 6: Section Order on the Team Page

The final section order should be:

1. Hero / Mission / Team Intro (existing)
2. "Choose Your Role" heading (Part D of TEAM_ROLES)
3. Role cards grid (Part C of TEAM_ROLES)
4. **Role Variables: Seed & Harvest** (Part 3 above - NEW)
5. Seasonal Rhythm (Part E of TEAM_ROLES)
6. How to Apply (Part F of TEAM_ROLES)
7. **Season Scorecard** (Part 4 above - NEW)
8. Final CTA (existing)

---

## Checklist

- [ ] Update all 13 roles in gameRoles with: band, tokenAward, maxTokenAward, hoursPerWeek, deliverables[], seed, harvest
- [ ] Add Seed/Harvest display to the role portal modal
- [ ] Update compensation display in the role portal modal
- [ ] Add deliverables list to the role portal modal
- [ ] Update card front bottom bar with band + hours
- [ ] Add "Role Variables: Seed & Harvest" section after role cards
- [ ] Add compensation bands table
- [ ] Add "What We Track" summary table
- [ ] Add "Season Scorecard" section before final CTA
- [ ] Verify all section ordering matches Part 6
- [ ] Test that role modals show all new fields correctly
- [ ] Confirm no TypeScript errors from new fields
