# ReGen Civics — 25 Upgrade Recommendations

Tell me which ones you want built and I'll implement them.

---

## Auth & Onboarding

### 1. Email Magic Link Login
**What:** Let users sign in with just their email — no Google account required. They enter their email, receive a one-time link via Resend (already integrated), and click it to be logged in.
**Why:** Removes the Google dependency entirely. Many users distrust OAuth or don't have a Google account. Magic links are frictionless and professional.
**Effort:** Medium. New route in `oauth.ts`, a token table in the DB, one email template, and a new login page UI.

---

### 2. Phone Number / SMS Login
**What:** Users enter their phone number, receive a 6-digit OTP via SMS (Twilio or Resend's SMS feature), and log in.
**Why:** Highest conversion rate of any auth method on mobile. Ideal for the community/game audience who may be less tech-formal.
**Effort:** Medium. Requires a Twilio account (or similar). New OTP table, SMS send logic, and a code-entry UI.

---

### 3. Unified Auth Modal
**What:** Replace the current redirect-to-Google flow with a polished modal that shows all login options (Google, Apple, Email, Phone) in one place, matching the enchanted forest aesthetic.
**Why:** Currently login is a hard redirect. A modal keeps the user on the page and shows all options at once — much more professional and higher-converting.
**Effort:** Medium. New `AuthModal` component, update `getLoginUrl()` references sitewide.

---

### 4. Progressive Profile Completion
**What:** After first login, gently prompt users to fill in their "Player Profile" — name, bio, role (Investor / Land Project / Ally / Player). Show a completion bar. Gate certain features (like forum posting or quest participation) behind a minimum profile level.
**Why:** Increases engagement, gives the community a richer identity layer, and naturally funnels users into the right path (Fund/Land/Ally/Play).
**Effort:** Medium. UserProfile table already exists. Needs a wizard-style onboarding UI and completion tracking.

---

## Performance & Speed

### 5. Streaming AI Chat Responses
**What:** Replace the current request/response chat model with Server-Sent Events (SSE) so Claude's response streams word-by-word into the chat window instead of appearing all at once after a delay.
**Why:** The current implementation has a noticeable multi-second wait with only a spinner. Streaming makes the AI feel instant and alive — it's the single biggest UX improvement for the chat widget.
**Effort:** Medium. New `/api/chat/stream` SSE endpoint using Anthropic's streaming API, update `ReGenGuide.tsx` to consume the stream.

---

### 6. Redis-Backed Rate Limiting
**What:** Replace the current in-memory `Map` in `security.ts` with Redis for rate limiting.
**Why:** The current implementation loses all rate limit data on server restart and doesn't work across multiple server instances. The comment in the code already flags this. Redis is already deployed on Railway.
**Effort:** Low. Wire `cacheInit.ts` into `rateLimitMiddleware`, replace the Map with Redis get/set/expire calls.

---

### 7. Image Optimization Pipeline (WebP + srcset)
**What:** Add automatic WebP conversion and responsive `srcset` to the `OptimizedImage` component. Assets are already on a CDN (`assets.regencivics.earth`) — append `?format=webp&w=800` style query params if the CDN supports it, or run images through `sharp` (already a dev dependency) at build time.
**Why:** Images are the largest contributors to page weight. WebP reduces file size 25–35% over JPEG/PNG with no visible quality loss. Responsive sizes prevent loading a 1200px image on a 400px phone screen.
**Effort:** Low–Medium depending on CDN support.

---

### 8. Route-Level Data Prefetching
**What:** On hover over navigation links, prefetch the tRPC queries that the destination page will need (e.g., prefetch campaign list when hovering "Crowd Pooling").
**Why:** Makes navigation feel instant. TanStack Query (already in use) has `prefetchQuery` built in — it just needs to be wired to `onMouseEnter` on nav links.
**Effort:** Low. A few lines per major route.

---

### 9. Database Connection Pooling
**What:** Replace the single lazy-initialized Drizzle connection in `db.ts` with a proper MySQL connection pool (mysql2 supports this natively with `createPool`).
**Why:** Under load, a single connection serializes all queries. A pool of 5–10 connections handles concurrent requests properly and prevents timeouts under traffic.
**Effort:** Low. One change in `db.ts`.

---

### 10. Service Worker & Offline Shell
**What:** Fully implement the `ServiceWorkerRegister` component that already exists in the codebase. Cache the app shell, fonts, and static assets. Show a "You're offline" state gracefully.
**Why:** Makes the site load instantly on repeat visits. Also enables PWA installability — users can add it to their home screen.
**Effort:** Medium. Write a `sw.ts` workbox config, register it properly, handle cache versioning.

---

## Design & Visual Appeal

### 11. Micro-Animations on Scroll (Refined)
**What:** Audit and upgrade the existing `AnimatedSection`, `ScrollReveal`, and `EnhancedAnimations` components. Standardize entrance animations across all pages — currently some pages use them and some don't. Add subtle parallax to hero sections.
**Why:** The homepage has beautiful animations but inner pages feel flat by comparison. Consistency makes the whole site feel premium.
**Effort:** Low–Medium. Mostly applying existing components to pages that don't use them yet.

---

### 12. Dark/Light Mode Toggle in Navigation
**What:** The `ThemeContext` and `next-themes` are already wired up — expose a proper toggle button in the navigation bar and footer.
**Why:** A large portion of users prefer light mode (especially investors reviewing documents). Currently the site is dark-only by default, and there's no discoverable toggle.
**Effort:** Low. Add a `<ThemeToggle>` button using the existing context.

---

### 13. Loading Skeleton Screens
**What:** Replace all spinning loaders with content-shaped skeleton screens (shimmer placeholders that match the layout of the loading content).
**Why:** Skeleton screens dramatically reduce perceived loading time. They tell the user exactly what's coming instead of a generic spinner.
**Effort:** Medium. One skeleton component per major data-heavy page section (campaigns, forum, admin tables).

---

### 14. Improved Mobile Navigation
**What:** Replace the current stacked mobile accordion menu with a smooth slide-in drawer from the right, with large touch targets, clear section headers, and a pinned login/profile button at the bottom.
**Why:** The current mobile nav is functional but not delightful. A drawer feels native and modern — closer to what users expect from world-class apps.
**Effort:** Medium. Refactor `Navigation.tsx` mobile section using the existing `vaul` drawer library (already installed).

---

### 15. Campaign Cards Visual Upgrade
**What:** Give the crowd pooling campaign cards a premium card design — full-bleed header image, progress bar with animated fill, a clear funding percentage badge, and a hover state that lifts the card with a subtle shadow.
**Why:** Campaign cards are a core conversion surface. Making them visually compelling directly increases investment interest.
**Effort:** Medium. Update `CampaignDetail` and campaign listing components.

---

## Features & Functionality

### 16. AI Chat with Site Context (RAG)
**What:** Give the ReGen Guide chatbot access to the actual site content — blog posts, glossary entries, the FAQ, and key page copy — by embedding them and doing a quick semantic search before each response.
**Why:** Currently the system prompt is hardcoded text. With RAG, the bot can accurately answer questions about current campaigns, recent blog posts, and specific fund terms without hallucinating. Much more trustworthy for investors.
**Effort:** High. Requires embedding pipeline, vector storage (can use MySQL with a JSON column as a simple store), and retrieval logic.

---

### 17. Email/SMS Notification Preferences UI Polish
**What:** The `NotificationPreferences` component and `notification-prefs` router exist — make them more discoverable. Add a prominent "Notification Settings" card to the user profile page with clear toggles and a "Send test notification" button.
**Why:** Users don't know this feature exists. Better discovery means more opted-in users, which means the notification system actually gets used.
**Effort:** Low. UI work on the profile page.

---

### 18. Forum Improvements: Rich Text Editor + Image Embeds
**What:** Upgrade the forum's markdown textarea to a proper WYSIWYG editor (using the existing `MarkdownToolbar` component as a foundation) with image drag-and-drop upload, @mentions, and emoji support.
**Why:** The community forum is a core engagement driver. A rich editor lowers the barrier to quality posts and makes the community feel more alive.
**Effort:** High. Significant UI work + file upload integration (S3/R2 already set up).

---

### 19. Full-Text Site Search
**What:** Add a command palette (Cmd+K) and a search bar that searches across blog posts, glossary, campaigns, and forum posts in real time.
**Why:** With 50+ pages and a forum, discoverability is a real problem. A fast command palette is a hallmark of professional tools and saves users from hunting through the nav.
**Effort:** Medium. The `FooterSearch` component is a start. Add MySQL `FULLTEXT` indexes and a search tRPC endpoint, then build the `cmdk`-powered palette (already installed).

---

### 20. Investor Dashboard
**What:** Build a dedicated dashboard for logged-in investors showing: their application status, documents they've submitted, upcoming calls they've scheduled, relevant blog posts, and a direct message thread.
**Why:** Investors are the highest-value users. Giving them a dedicated home makes the platform feel serious and builds trust in the organization.
**Effort:** High. New page + several tRPC queries + possibly new DB tables.

---

## Trust, SEO & Conversion

### 21. Structured Data (JSON-LD) Expansion
**What:** The `StructuredData` component exists — expand it beyond the basics. Add `FAQPage`, `Event` (for scheduled calls), `Article` (for blog posts), and `Organization` schemas with full detail.
**Why:** Rich snippets in Google search results (star ratings, FAQ dropdowns, event dates) dramatically improve click-through rates. Free organic traffic boost.
**Effort:** Low. Data entry + schema markup, no new infrastructure.

---

### 22. Legal Page Design Upgrade
**What:** The Privacy Policy, Terms of Use, Risk Disclosure, and Disclaimers pages are currently plain markdown renders. Give them a professional two-column layout with a sticky table of contents, section anchors, and a "Last updated" timestamp prominently displayed.
**Why:** Investors scrutinize legal pages. Professional formatting signals organizational maturity and reduces friction in the due diligence process.
**Effort:** Low. New `LegalPageLayout` wrapper component applied to existing pages.

---

### 23. Social Proof & Trust Signals on Landing Pages
**What:** Add an animated "live stats" bar to the homepage: total capital committed, number of land projects, active players, countries represented. Pull from real DB counts via a public tRPC query.
**Why:** Real numbers build credibility. A "127 investors across 23 countries" stat is more persuasive than any copy.
**Effort:** Low–Medium. One new tRPC query aggregating public stats, one animated counter component.

---

### 24. Exit-Intent Email Capture (Upgrade)
**What:** The `ExitIntentCapture` component already exists — make it smarter. Show a different message based on which page the user is leaving (investor page gets an investor-focused offer, land project page gets a different one). Integrate with a "download the investor one-pager" lead magnet.
**Why:** Exit-intent capture is one of the highest-ROI conversion tools. Page-specific messaging vs. a generic popup dramatically increases opt-in rates.
**Effort:** Low. Update the existing component to accept page-context props.

---

### 25. Performance Monitoring & Error Tracking
**What:** Integrate a lightweight observability tool — Sentry for error tracking (free tier covers the volume) and a simple `/api/health` endpoint that checks DB + Redis connectivity. Add Web Vitals reporting (LCP, CLS, FID) from the client.
**Why:** Right now you have no visibility into errors happening in production. Sentry catches crashes before users report them, and Web Vitals data tells you exactly where performance is suffering.
**Effort:** Low. `@sentry/node` + `@sentry/react`, a few lines of initialization code.

---

## Priority Summary

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 1 | Email Magic Link Login | High | Medium |
| 2 | Phone/SMS Login | High | Medium |
| 3 | Unified Auth Modal | High | Medium |
| 5 | Streaming AI Chat | High | Medium |
| 6 | Redis Rate Limiting | Medium | Low |
| 9 | DB Connection Pooling | Medium | Low |
| 12 | Dark/Light Mode Toggle | Medium | Low |
| 19 | Full-Text Search (Cmd+K) | High | Medium |
| 22 | Legal Page Design | Medium | Low |
| 25 | Sentry Error Tracking | High | Low |
