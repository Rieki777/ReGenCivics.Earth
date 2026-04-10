# Sprint 1: ReGen Gov Foundation, Auth, and Home Screen

**Date:** 2026-04-10
**Depends on:** `REGEN_GOV_UNIFIED_ARCHITECTURE.md`, `PRIVY_AUTH_MIGRATION_SPEC.md`
**Goal:** A deployable Next.js app at gov.regencivics.earth with Privy auth (shared with main site), the welcome experience, and the attention-inbox home screen.

---

## CRITICAL CONTEXT: Read These Files First

1. `PRIVY_AUTH_MIGRATION_SPEC.md` -- full Privy integration spec with App ID (`cmnt8kp5i01bm0cjixnxsrlpw`), dual-auth context, PrivyProvider config, database functions
2. `server/_core/context.ts` -- existing tRPC context creation
3. `server/_core/sdk.ts` -- existing JWT auth
4. `server/_core/privy.ts` -- Privy server verification (if already created from the migration spec, use it; if not, create it)
5. `drizzle/schema.ts` -- existing database schema (users, playerProfiles, governanceTenants, etc.)
6. `server/routes/governance.ts` -- 151 governance tRPC procedures
7. `CONTEXT_THE_TWO_GAMES.md` -- Fund vs Game distinction, $RCivics vs $ReGen
8. `REGEN_GOV_UNIFIED_ARCHITECTURE.md` -- the full vision

## Architecture Decisions (Updated from Rye's Feedback)

### 1. No Loomio. We're building our own deliberation layer.

Loomio is gone from the architecture. We're not using their API, not embedding them, not wrapping them. Everything Loomio provided (structured proposals, consent decisions, voting, outcomes) we build natively inside this app. The existing Loomio webhook integration on the main site stays for now as a compatibility layer but the gov app does not depend on Loomio in any way.

The governance pipeline becomes:

```
Forum (regencivics.earth)     Gov (gov.regencivics.earth)        Hypha (app.hypha.earth)
  Early ideas,                  Structured deliberation,           Official seasonal votes
  conversation, seeds           community input, polls,            on-chain token proposals
  Low stakes                    proposal evolution                 Moves $ReGen / $RCivics
                                "Staged for next season"
```

Forum is for new ideas and light conversation. Gov is for turning ideas into solid proposals through community input, polling, and iteration. Once a proposal is mature, it gets "staged for next season." At the seasonal festival, all staged proposals go to Hypha for official on-chain votes. Only proposals tagged "urgent" can go to Hypha mid-season.

### 2. Auth is Privy.

The main site is migrating to Privy (App ID: `cmnt8kp5i01bm0cjixnxsrlpw`). The gov app uses the same Privy App ID. Players logged into either site are logged into both. Privy creates embedded Base wallets automatically, which means every player has a wallet for governance tokens from day one.

Follow the `PRIVY_AUTH_MIGRATION_SPEC.md` exactly for Privy setup. The gov app uses `@privy-io/react-auth` with `PrivyProvider`, and the server uses `@privy-io/server-auth` to verify tokens.

### 3. $ReGen price is NOT on the dashboard.

There's no USD price for $ReGen yet. Instead, the economy section tracks:
- Total $ReGen supply
- Velocity of exchange (how fast tokens are moving)
- Distribution rate (tokens distributed for quests, roles, gratitude per season)
- Active holders count
- Tokens staked in governance
- Tokens in escrow for land project milestones

The focus is on $ReGen as a living currency for coordination, not as a speculative asset.

### 4. The gov app is its own Next.js app, sharing the same database.

Same Railway MySQL. Same Redis. Same Privy App ID. The gov app calls the main site's tRPC endpoints via HTTP (forwarding the Privy auth token) for data that lives on the main site's server. For gov-specific features (proposals, deliberation, staging), the gov app has its own tRPC server.

### 5. Staged seasonal governance model.

Proposals in the gov app have this lifecycle:

```
Draft -> Discussion -> Polling -> Staged for Season -> Sent to Hypha -> Voted -> Ratified/Declined
```

- Draft: author writes the proposal
- Discussion: community comments, iterates, suggests changes
- Polling: non-binding temperature checks (straw polls)
- Staged for Season: proposal has enough support, waiting for next seasonal festival
- Sent to Hypha: at the seasonal festival, staged proposals go to Hypha for official vote
- Voted/Ratified/Declined: on-chain result synced back

"Urgent" tagged proposals can skip to Hypha mid-season (requires Steward approval).

---

## What to Build in This Sprint

### 1. Next.js App Scaffolding

Create a new Next.js 14 app with App Router in `apps/gov/`:

```
apps/gov/
  src/
    app/
      layout.tsx          -- root layout, dark theme, PrivyProvider, fonts
      page.tsx            -- home screen
      loading.tsx         -- skeleton loader
      not-found.tsx       -- 404 page
      proposals/
        page.tsx          -- placeholder (Sprint 2)
      bioregion/
        [id]/
          page.tsx        -- placeholder (Sprint 3)
      economy/
        page.tsx          -- placeholder (Sprint 4)
      passport/
        page.tsx          -- placeholder (Sprint 5)
    components/
      WelcomeModal.tsx
      AttentionInbox.tsx
      BioregionCard.tsx
      MovementPulse.tsx
      MobileNav.tsx
      DesktopSidebar.tsx
      GlassCard.tsx       -- reusable glass-panel card component
      PillButton.tsx      -- reusable pill-shaped button
    lib/
      auth.ts             -- Privy auth helpers (useAuth hook, requireAuth)
      api.ts              -- tRPC client for calling main site API
      theme.ts            -- design tokens (colors, spacing, etc.)
      cn.ts               -- className utility (clsx + tailwind-merge)
    providers/
      PrivyProviderWrapper.tsx  -- PrivyProvider configured for ReGen Gov
  tailwind.config.ts
  next.config.ts
  package.json
  tsconfig.json
```

### 2. Privy Auth Integration

**PrivyProviderWrapper.tsx:**

```typescript
"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";

export function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        supportedChains: [base],
        defaultChain: base,
        appearance: {
          theme: "dark",
          accentColor: "#7dd87d",
          logo: "/regen-gov-icon.svg",
          showWalletLoginFirst: false,
        },
        loginMethods: ["email", "google", "apple", "wallet"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

**auth.ts:**

```typescript
"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useAuth() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");

  return {
    ready,
    authenticated,
    user,
    login,
    logout,
    getAccessToken,
    walletAddress: embeddedWallet?.address ?? null,
  };
}

export function useRequireAuth() {
  const { ready, authenticated, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      login();
    }
  }, [ready, authenticated, login]);

  return { ready, authenticated };
}
```

**Root layout.tsx must wrap everything in PrivyProviderWrapper.** Also include:
- Inter font (system-ui stack as fallback)
- Dark forest background (#0d2818)
- Viewport meta for mobile
- The shared `rc_session` cookie domain is `.regencivics.earth` so legacy sessions are readable too

### 3. API Client for Main Site

The gov app calls the main site's tRPC endpoints. Create a typed client:

```typescript
// apps/gov/src/lib/api.ts

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://regencivics.earth";

export async function fetchFromMainSite<T>(
  procedure: string,
  input?: any,
  accessToken?: string
): Promise<T> {
  const url = `${MAIN_SITE_URL}/api/trpc/${procedure}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const res = input
    ? await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
        credentials: "include", // forward cookies
      })
    : await fetch(`${url}?input=${encodeURIComponent(JSON.stringify(input ?? {}))}`, {
        headers,
        credentials: "include",
      });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.result?.data as T;
}
```

For Sprint 1, the home screen needs these main site tRPC calls:
- `governance.myDecisionQueue` -- pending actions for the player
- `governance.myUnclaimedBalance` -- internal governance token balance
- `governance.communityLoad` -- 30-day decision count
- `bioregions.list` -- available bioregions
- `players.getProfile` -- player's profile (tier, contribution score, bioregions)

### 4. Welcome Modal

**Trigger:** First visit (check `govDashboardPrefs.hasSeenWelcome` or fallback to localStorage if the table doesn't exist yet).

**Design:** Full-screen overlay on mobile, centered modal (max-width 520px) over blurred dashboard on desktop.

**Content:**

```
[ReGen Gov logo - regen_icon.svg centered]

Welcome to your Passport

This is your command center for coordinating the
Regenerative Renaissance.

Built on wisdom from movements before us -- blended
with the best in decentralized governance, regenerative
economics, and game design.

Interoperable with Hypha for secure on-chain governance
on Base blockchain, and with Local Scale for bioregional
food-backed economic systems.

This dashboard is governed by you. Propose what we track.
Vote on how it evolves.

                [Open My Passport]
```

- Text fades in paragraph by paragraph (staggered 400ms per paragraph)
- "Open My Passport" is the primary green pill button
- On tap, the modal fades out, `hasSeenWelcome` is set, and the home screen is revealed
- No close button (they have to tap the button, which creates a moment of intention)
- On desktop, the dashboard is blurred behind the modal (backdrop-filter: blur(20px))

### 5. Home Screen: Three Sections

**Mobile layout (single column, vertical scroll):**

```
[Top bar: ReGen Gov logo | notification bell | avatar]

Section 1: YOUR ATTENTION
  Card with list of pending actions (max 5)
  Each item: icon + title + one-tap action button
  Empty state: "You're caught up. Go plant something. 🌱"

Section 2: YOUR BIOREGION
  If joined: compact card with name, member count, mini health badge
  If not joined: "Join a Bioregion" card with list of options

Section 3: THE MOVEMENT
  Compact stats row:
  [Players: 247] [Active proposals: 12] [Participation: 68%]

[Bottom nav: Home | Proposals | Bioregion | Economy | Passport]
```

**Desktop layout (three columns):**

```
[Left sidebar (280px, collapsible)]     [Center (flex)]              [Right (320px)]
  Home                                    YOUR ATTENTION               THE MOVEMENT
  Proposals                               (inbox list)                 Players: 247
  Bioregion                                                            Active proposals: 12
  Economy                                 YOUR BIOREGION               Participation: 68%
  Passport                                (card)                       Season: Spring 2026
  ---                                                                  Beat: Connect
  Handbook                                                             Next festival: 47 days
  Propose Upgrade
```

### 6. Component Specs

**GlassCard.tsx:**
```
- Background: rgba(26, 71, 42, 0.85)
- Backdrop-filter: blur(12px)
- Border: 1px solid rgba(125, 216, 125, 0.15)
- Border-radius: 16px
- Padding: 20px
- Hover: border-color transitions to rgba(125, 216, 125, 0.3)
```

**PillButton.tsx:**
```
- Primary: bg-[#7dd87d] text-[#0d2818] font-bold rounded-full px-6 py-3
- Secondary: border border-[#7dd87d] text-[#7dd87d] rounded-full px-6 py-3
- Danger: bg-red-500 text-white rounded-full px-6 py-3
- Disabled: opacity-50 cursor-not-allowed
- All: no text-transform, letter-spacing-0
```

**MobileNav.tsx:**
```
- Fixed bottom, h-16, bg-[#1a472a] border-t border-[rgba(125,216,125,0.15)]
- 5 items: Home, Proposals, Bioregion, Economy, Passport
- Icons: outlined when inactive (white 60%), filled when active (green #7dd87d)
- Active item has green dot indicator above icon
- Notification dot on Home when attention items exist
```

**AttentionInbox.tsx:**
```
- Fetches from governance.myDecisionQueue (pending votes, co-sign requests)
- Also fetches recent gratitude received (from players.getProfile)
- Each item is a row: [icon] [title] [action button]
  - Vote pending: Ballot icon, proposal title truncated, [Vote] button
  - Co-sign request: Handshake icon, proposer name + title, [Co-sign] button
  - Gratitude received: Heart icon, sender + message preview, [Thanks] button
- Max 5 items shown initially, "Show more" link if >5
- Empty state: leaf illustration + "You're caught up. Go plant something."
- Loading: 3 shimmer skeleton rows
```

**BioregionCard.tsx:**
```
- If player has bioregion(s):
  - Shows primary bioregion name + member count
  - Mini circular health indicator (single composite score, green/yellow/red)
  - "X active proposals" link
  - Tap to expand to full bioregion view
- If player has no bioregion:
  - "Join a Bioregion" header
  - List of available bioregions from bioregions.list tRPC
  - Each option: name + member count + [Join] button
  - The existing BioregionSelect component pattern can be adapted
- Plan for <10 bioregions now, architecture for 100+
```

**MovementPulse.tsx:**
```
- Three stat pills in a horizontal row (mobile: wraps to 2+1)
- Each pill: glass-card background, icon, label, number
  - Players: People icon, total player count (from a new lightweight endpoint or cached)
  - Active proposals: Ballot icon, count of open/staged proposals
  - Participation: Chart icon, % of Citizens who voted this season
- Season indicator below: "Spring 2026 · Connect beat · Festival in 47 days"
```

### 7. Database Migration

Create `drizzle/0112_gov_dashboard_prefs.sql`:

```sql
CREATE TABLE IF NOT EXISTS govDashboardPrefs (
  userId INT PRIMARY KEY,
  primaryBioregionId INT DEFAULT NULL,
  dashboardLayout ENUM('compact', 'full') DEFAULT 'compact',
  notificationPrefs JSON DEFAULT NULL,
  hasSeenWelcome TINYINT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### 8. Environment Variables for Gov App

```env
# Gov app .env
NEXT_PUBLIC_PRIVY_APP_ID=cmnt8kp5i01bm0cjixnxsrlpw
PRIVY_APP_SECRET=<from Privy dashboard>
NEXT_PUBLIC_MAIN_SITE_URL=https://regencivics.earth
DATABASE_URL=<same as main site>
REDIS_URL=<same as main site>
JWT_SECRET=<same as main site, for legacy cookie reading>
```

### 9. Deployment on Railway

- Create a new Railway service for the gov app
- Point domain gov.regencivics.earth to this service
- Share the same MySQL and Redis add-ons as the main site
- Set all env vars listed above

---

## Dependency Audit and Potential Bugs

### Things that could break:

1. **CORS between gov and main site.** The gov app calls regencivics.earth tRPC endpoints. The main site needs CORS headers allowing `gov.regencivics.earth` as an origin. Check `server/_core/index.ts` for existing CORS config and add the gov subdomain.

2. **Cookie domain.** The `rc_session` cookie must have domain `.regencivics.earth` (with leading dot) to be readable from the subdomain. Check `server/_core/sdk.ts` where the cookie is set. If the domain is set to `regencivics.earth` without the dot, the gov app can't read it. This needs to be verified and potentially updated.

3. **Privy dual-auth.** The main site is migrating to Privy (per PRIVY_AUTH_MIGRATION_SPEC.md). If the migration isn't complete yet, some players will have legacy JWT sessions and some will have Privy tokens. The gov app needs to handle BOTH: try Privy `Authorization: Bearer` header first, fall back to `rc_session` cookie.

4. **tRPC endpoint access.** The main site's tRPC endpoints may not accept cross-origin requests. Some procedures may check the `Origin` or `Referer` header. The CSRF protection (`x-csrf-token` header) definitely applies to mutations. The gov app needs to either:
   - Get a CSRF token from the main site before making mutations, OR
   - The main site whitelists the gov subdomain from CSRF checks

5. **Rate limiting.** The main site rate-limits by IP. If both the gov app and the main site's server make calls from the same Railway internal network, they might share rate limit buckets. Use user-based rate limiting where possible.

6. **Player profile data availability.** The home screen needs player profile data (bioregions, citizenship tier, contribution score). If the player exists in `users` but hasn't created a `playerProfiles` row yet, handle the null case gracefully.

### Things to verify before deploying:

- [ ] CORS allows gov.regencivics.earth on main site
- [ ] Cookie domain is `.regencivics.earth` (with dot)
- [ ] Privy App ID is the same on both apps
- [ ] DATABASE_URL connects to the same Railway MySQL
- [ ] The `govDashboardPrefs` migration has been run
- [ ] The main site's tRPC endpoints return data for cross-origin requests with valid auth

---

## Done Criteria

Sprint 1 is done when:

1. A player can visit gov.regencivics.earth and be automatically authenticated (via Privy or legacy cookie)
2. First-time visitors see the welcome modal with the full story text
3. After dismissing the welcome, they see the three-section home screen
4. The attention inbox shows real pending governance actions from the main site database
5. The bioregion card shows their bioregion or the "Join" option with real bioregion data
6. The movement pulse shows real player count and proposal count
7. The mobile bottom nav works and all 5 routes exist (even if 4 are placeholder pages)
8. The desktop sidebar works with collapse/expand
9. The dark forest theme is consistent across all components
10. Performance: first contentful paint under 1.5s, no layout shifts

---

## Writing Rules Reminder

All user-facing text must follow the project writing rules:
- No em-dashes (zero, not "use sparingly")
- No contrast-framing ("This is not X, this is Y")
- No AI word patterns (delve, tapestry, foster, leverage, etc.)
- No rhetorical question openers
- No passive inspiration ("Join us on this journey")
- Voice: direct, grounded, specific. First person fine. Contractions fine.
