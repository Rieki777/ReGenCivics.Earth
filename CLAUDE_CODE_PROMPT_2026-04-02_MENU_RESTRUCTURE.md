# Claude Code Execution Prompt: Play the Game Menu Restructure + Tools Library Nav

**Created:** 2026-04-02
**Priority:** Medium
**Context:** The Tools Library has been added (migration 0101, tRPC router, pages). Now it needs to appear in navigation. The Play the Game dropdown has grown to 10+ items and needs grouping.

## Part 1: Restructure Play the Game Desktop Dropdown

File: `client/src/components/Navigation.tsx`

The current Play the Game DropdownMenuContent has 9 items with separators. Replace the entire content of the DropdownMenuContent (keeping the DropdownMenu and DropdownMenuTrigger unchanged) with this grouped structure:

```tsx
<DropdownMenuContent
  align="center"
  className="bg-[#1a472a] border-[#7dd87d]/30 min-w-[240px]"
>
  {/* Get Started */}
  <div className="px-2 py-1.5">
    <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Get Started</span>
  </div>
  <DropdownMenuItem
    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
    onClick={() => window.location.href = '/game'}
  >
    <FlowerOfLifeIcon className="w-5 h-5 mr-3 text-[#7dd87d]" size={20} />
    <span style={{ fontFamily: 'var(--font-accent)' }}>Game Overview</span>
  </DropdownMenuItem>
  <DropdownMenuItem
    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
    onClick={() => window.location.href = '/play'}
  >
    <Heart className="w-5 h-5 mr-3 text-purple-400" />
    <span style={{ fontFamily: 'var(--font-accent)' }}>Play</span>
  </DropdownMenuItem>
  <DropdownMenuItem
    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
    onClick={() => window.location.href = '/profile'}
  >
    <User className="w-5 h-5 mr-3 text-purple-400" />
    <span style={{ fontFamily: 'var(--font-accent)' }}>Player Profile</span>
  </DropdownMenuItem>

  <DropdownMenuSeparator className="bg-[#7dd87d]/20" />

  {/* Quests & Actions */}
  <div className="px-2 py-1.5">
    <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Quests & Actions</span>
  </div>
  <DropdownMenuItem
    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
    onClick={() => window.location.href = '/quest'}
  >
    <span className="text-lg mr-3">🌲</span>
    <span style={{ fontFamily: 'var(--font-accent)' }}>Explore Quests</span>
  </DropdownMenuItem>
  <DropdownMenuItem
    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
    onClick={() => window.location.href = '/crowd-pooling-projects'}
  >
    <UsersRound className="w-5 h-5 mr-3 text-blue-400" />
    <span style={{ fontFamily: 'var(--font-accent)' }}>Crowd Pool Campaigns</span>
  </DropdownMenuItem>
  <DropdownMenuItem
    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
    onClick={() => window.location.href = '/tools'}
  >
    <Wrench className="w-5 h-5 mr-3 text-amber-400" />
    <span style={{ fontFamily: 'var(--font-accent)' }}>Tools Library</span>
    <span className="ml-auto text-[9px] bg-[#7dd87d]/30 text-[#7dd87d] px-1.5 py-0.5 rounded-full">New</span>
  </DropdownMenuItem>

  <DropdownMenuSeparator className="bg-[#7dd87d]/20" />

  {/* Economy */}
  <div className="px-2 py-1.5">
    <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Economy</span>
  </div>
  <DropdownMenuItem
    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
    onClick={() => window.location.href = '/local-food-economy'}
  >
    <Sprout className="w-5 h-5 mr-3 text-green-400" />
    <span style={{ fontFamily: 'var(--font-accent)' }}>Local Food Economy</span>
  </DropdownMenuItem>
  <DropdownMenuItem
    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
    onClick={() => window.location.href = '/crowd-pooling'}
  >
    <Calculator className="w-5 h-5 mr-3 text-green-400" />
    <span style={{ fontFamily: 'var(--font-accent)' }}>Crowd Pool Calculator</span>
  </DropdownMenuItem>
  <DropdownMenuItem
    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
    onClick={() => window.location.href = '/calculator'}
  >
    <Calculator className="w-5 h-5 mr-3 text-amber-400" />
    <span style={{ fontFamily: 'var(--font-accent)' }}>Contribution Calculator</span>
  </DropdownMenuItem>

  <DropdownMenuSeparator className="bg-[#7dd87d]/20" />

  {/* Coming Soon */}
  <div className="px-2 py-1.5">
    <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Coming Soon</span>
  </div>
  <DropdownMenuItem
    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
    onClick={() => window.location.href = '/regen-games'}
  >
    <span className="text-lg mr-3">🏅</span>
    <span style={{ fontFamily: 'var(--font-accent)' }}>The ReGen Games</span>
    <span className="ml-auto text-[9px] bg-[#d4a574]/30 text-[#d4a574] px-1.5 py-0.5 rounded-full">Soon</span>
  </DropdownMenuItem>
  <DropdownMenuItem
    className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
    onClick={() => window.location.href = '/custom-games'}
  >
    <span className="text-lg mr-3">🗺️</span>
    <span style={{ fontFamily: 'var(--font-accent)' }}>Custom Land Games</span>
  </DropdownMenuItem>
</DropdownMenuContent>
```

**Import `Wrench` and `Sprout` from lucide-react** at the top of the file. Check if they're already imported. If `Sprout` isn't available, use `Leaf`.

## Part 2: Restructure Play the Game Mobile Menu

In the mobile navigation section (around line 688+), find the "Play the Game" collapsible. Replace its content with the same grouped structure, using section labels between items:

```tsx
{/* Group label */}
<div className="px-3 py-2">
  <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">Get Started</span>
</div>
```

Mobile items use this pattern (keep existing):
```tsx
<Link href="/tools">
  <button
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors min-h-[44px] ${
      location === '/tools'
        ? 'bg-[#7dd87d]/20 text-[#7dd87d]'
        : 'text-white/80 hover:bg-white/5'
    }`}
    onClick={() => setMobileMenuOpen(false)}
  >
    <Wrench className="w-5 h-5 text-amber-400" />
    <span style={{ fontFamily: 'var(--font-accent)' }}>Tools Library</span>
    <span className="ml-auto text-[9px] bg-[#7dd87d]/30 text-[#7dd87d] px-1.5 py-0.5 rounded-full">New</span>
  </button>
</Link>
```

Use the same grouping order as desktop: Get Started, Quests & Actions (with Tools Library), Economy (with Local Food Economy, calculators), Coming Soon.

## Part 3: Add Economy to Explore + Connect Dropdown

In the desktop Explore + Connect DropdownMenuContent, add "Economy" after the Tokenomics item:

```tsx
<DropdownMenuItem
  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
  onClick={() => window.location.href = '/economy'}
>
  <TrendingUp className="w-5 h-5 mr-3 text-[#d4a574]" />
  <span style={{ fontFamily: 'var(--font-accent)' }}>Economy</span>
</DropdownMenuItem>
```

Import `TrendingUp` from lucide-react if not already imported.

Also add it to the mobile Explore + Connect collapsible in the same position.

## Part 4: Update Active State Checks

Update `isPlayGameActive` to include the new routes:

```tsx
const isPlayGameActive = location === '/game' || location === '/play' || location === '/calculator' || location === '/profile' || location === '/quest' || location === '/crowd-pooling-projects' || location === '/crowd-pooling' || location === '/create-campaign' || location.startsWith('/campaign/') || location === '/local-food-economy' || location === '/tools' || location.startsWith('/tools/');
```

Update the Explore + Connect active check to include `/economy`:

Find the variable that checks Explore + Connect active state (likely `isSocialsBlogActive` or similar) and add `|| location === '/economy'`.

## Part 5: Update Footer

File: `client/src/components/SiteFooter.tsx`

In the "Game" column (around line 130-175), add after the Tokenomics link:

```tsx
<li>
  <Link href="/tools" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
    Tools Library
  </Link>
</li>
<li>
  <Link href="/local-food-economy" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
    Local Food Economy
  </Link>
</li>
```

In the "Explore" column, add:

```tsx
<li>
  <Link href="/economy" className="text-white/60 hover:text-white transition-colors text-xs py-2.5 inline-block min-h-[44px] flex items-center">
    Economy
  </Link>
</li>
```

## Part 6: Prefetch the new routes

In the onMouseEnter handler for the Play the Game trigger button, add the new routes:

```tsx
onMouseEnter={() => { prefetch("/game"); prefetch("/quest"); prefetch("/play"); prefetch("/tools"); prefetch("/local-food-economy"); }}
```

## Verification

1. Run `npx tsc --noEmit`
2. Desktop: hover Play the Game dropdown, verify 4 groups with labels, Tools Library has green "New" badge
3. Desktop: hover Explore + Connect, verify Economy appears after Tokenomics
4. Mobile: open hamburger, expand Play the Game, verify same grouping
5. Mobile: expand Explore + Connect, verify Economy appears
6. Footer: verify Tools Library and Local Food Economy in Game column, Economy in Explore column
7. Navigate to /tools, verify Play the Game nav item highlights as active

## Handoff

| Task | Who |
|------|-----|
| All navigation code changes | Claude Code |
| TypeScript check | Claude Code |
| Visual verification | Rye |
| Git push | Rye |
