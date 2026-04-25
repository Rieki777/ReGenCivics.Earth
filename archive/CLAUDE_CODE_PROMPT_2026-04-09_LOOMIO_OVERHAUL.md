# Claude Code Prompt: Loomio Visual Overhaul for gov.regencivics.earth

**Date:** 2026-04-09
**Goal:** Transform the stock Loomio instance at gov.regencivics.earth into "ReGen Gov. Powered by Loomio" -- a seamless extension of regencivics.earth's dark forest aesthetic.

This prompt covers everything: Railway env vars, Docker brand assets, Vue component surgery, custom CSS injection, OIDC shared auth, and org structure. Work through each phase in order. Skip nothing.

---

## Context

Loomio is a Rails + Vue.js (Vuetify) governance tool deployed on Railway as a sibling service to the main ReGen Civics app. It currently uses stock Loomio branding (blue/gold, generic logo, "Loomio" everywhere). The main site at regencivics.earth uses a dark forest theme: deep greens (#0d2818, #1a472a), bright leaf green (#7dd87d), warm gold (#d4a574), glass-panel UI with subtle borders. Users navigating from the main site to gov.regencivics.earth should feel like they never left.

### Design System Reference (regencivics.earth)

| Token | Value | Usage |
|-------|-------|-------|
| bg-deep | #0d2818 | Page backgrounds |
| bg-panel | #1a472a | Card/panel backgrounds |
| bg-surface | #0f2a1a | Input fields, secondary surfaces |
| primary-green | #7dd87d | Accent text, icons, borders, CTAs |
| warm-gold | #d4a574 | Gratitude, special highlights |
| amber-accent | #f59e0b | Warnings, active states |
| text-primary | #ffffff / #f0f0f0 | Body text on dark |
| text-secondary | rgba(255,255,255,0.6) | Muted/secondary text |
| border-subtle | rgba(125,216,125,0.15) | Panel borders |
| border-hover | rgba(125,216,125,0.3) | Hover state borders |
| glass-blur | backdrop-blur(12px) | Glass-panel effect |
| radius-panel | 16px | Panel border radius |
| radius-button | 9999px (full) | Pill-shaped buttons |
| font-stack | system-ui, -apple-system, sans-serif | Typography |

### Brand Assets (already created)

Two SVG files have been created and live at:
- `loomio Governance Tools/public/brand/regen_icon.svg` -- dark green circle with seed-of-life pattern and central sprout (150x150)
- `loomio Governance Tools/public/brand/regen_logo.svg` -- icon + "ReGen Gov" text + "POWERED BY LOOMIO" subtitle (400x80)

These need to be served from Loomio's public assets directory (see Phase 2).

---

## Phase 1: Railway Environment Variables

Set these on the Loomio Railway service. Each maps to `AppConfig.theme` in Loomio's `app/extras/app_config.rb`.

### Core Identity

```env
SITE_NAME=ReGen Gov
THEME_SITE_NAME=ReGen Gov
```

### Brand Assets

After Phase 2 bakes the SVGs into the Docker image, set:

```env
THEME_ICON_SRC=/brand/regen_icon.svg
THEME_APP_LOGO_SRC=/brand/regen_logo.svg
```

### Light Theme Colors (Loomio's default mode)

Even though we want dark mode as default, Loomio still uses light theme vars as the base palette:

```env
THEME_PRIMARY_COLOR=#1a472a
THEME_ACCENT_COLOR=#7dd87d
THEME_TEXT_ON_PRIMARY_COLOR=#ffffff
THEME_PRIMARY_CONTAINER_COLOR=#0f2a1a
THEME_SECONDARY_COLOR=#d4a574
THEME_WARNING_COLOR=#f59e0b
THEME_DANGER_COLOR=#ef4444
THEME_INFO_COLOR=#7dd87d
```

### Dark Theme Colors (the real target)

```env
THEME_DEFAULT_DARK_THEME=dark
THEME_DARK_PRIMARY=#7dd87d
THEME_DARK_BACKGROUND=#0d2818
THEME_DARK_SURFACE=#1a472a
THEME_DARK_ON_SURFACE=#f0f0f0
THEME_DARK_ON_BACKGROUND=#ffffff
THEME_DARK_PRIMARY_CONTAINER=#0f2a1a
THEME_DARK_SECONDARY=#d4a574
THEME_DARK_ON_PRIMARY=#0d2818
THEME_DARK_ON_SECONDARY=#0d2818
THEME_DARK_TERTIARY=#f59e0b
THEME_DARK_OUTLINE=#2d5a3a
THEME_DARK_ERROR=#ef4444
```

### Email Branding

```env
THEME_EMAIL_HEADER_LOGO_SRC=/brand/regen_logo.svg
THEME_EMAIL_FOOTER_LOGO_SRC=/brand/regen_icon.svg
THEME_EMAIL_HEADER_COLOR=#0d2818
THEME_EMAIL_FOOTER_COLOR=#1a472a
```

### Links and Legal

```env
TERMS_URL=https://regencivics.earth/terms
PRIVACY_URL=https://regencivics.earth/privacy
HELP_URL=https://regencivics.earth/help
```

### Feature Flags

```env
FEATURES_DONT_NOTIFY_NEW_THREAD=0
FEATURES_ENABLE_CHATBOTS=0
```

**Total: ~30 env vars.** Set all of these before rebuilding the service.

---

## Phase 2: Docker Image -- Bake Brand Assets

Loomio's Dockerfile serves static assets from `/loomio/public/`. The brand SVGs need to land there.

### Option A: Volume mount (simpler, Railway-friendly)

If Railway supports volume mounts or a Dockerfile build step:

1. Copy `regen_icon.svg` and `regen_logo.svg` into the Loomio repo's `public/brand/` directory
2. Ensure the Dockerfile's `COPY` step includes `public/brand/`
3. Rebuild and deploy

### Option B: Runtime injection via init script

Add to the Railway service's start command or an init script:

```bash
mkdir -p /loomio/public/brand
# Copy from mounted volume or download from main site
curl -sL https://regencivics.earth/brand/regen_icon.svg -o /loomio/public/brand/regen_icon.svg
curl -sL https://regencivics.earth/brand/regen_logo.svg -o /loomio/public/brand/regen_logo.svg
```

### Option C: Fork Loomio and add to repo

If you've forked loomio/loomio:

```bash
cp regen_icon.svg loomio/public/brand/regen_icon.svg
cp regen_logo.svg loomio/public/brand/regen_logo.svg
git add public/brand/ && git commit -m "Add ReGen Gov brand assets"
```

Pick whichever approach matches your Railway Loomio deployment strategy.

---

## Phase 3: Custom CSS Injection -- Dark Forest Theme

Loomio supports custom CSS via the `THEME_STYLESHEET_SRC` env var or by injecting a `<style>` block through the admin panel (Settings > Appearance > Custom CSS).

### The Full Custom Stylesheet

This CSS transforms Loomio's Vuetify-based UI to match regencivics.earth. Inject it via whichever mechanism is available:

```css
/* ============================================================
   ReGen Gov -- Dark Forest Theme for Loomio
   gov.regencivics.earth
   ============================================================ */

/* --- Global overrides --- */
:root {
  --regen-deep: #0d2818;
  --regen-panel: #1a472a;
  --regen-surface: #0f2a1a;
  --regen-green: #7dd87d;
  --regen-gold: #d4a574;
  --regen-amber: #f59e0b;
  --regen-text: #f0f0f0;
  --regen-text-muted: rgba(255,255,255,0.6);
  --regen-border: rgba(125,216,125,0.15);
  --regen-border-hover: rgba(125,216,125,0.3);
  --regen-radius: 16px;
  --regen-glass: rgba(26,71,42,0.85);
}

/* Force dark background everywhere */
body,
.theme--dark,
.v-application,
.v-application .theme--dark.v-sheet,
.v-main,
.v-main__wrap {
  background-color: var(--regen-deep) !important;
  color: var(--regen-text) !important;
}

/* --- Navigation / Sidebar --- */
.v-navigation-drawer,
.sidebar-left,
.group-page__sidebar,
.v-navigation-drawer .v-list,
.v-navigation-drawer__content {
  background-color: var(--regen-panel) !important;
  border-right: 1px solid var(--regen-border) !important;
}

.v-navigation-drawer .v-list-item__title,
.v-navigation-drawer .v-list-item__subtitle {
  color: var(--regen-text) !important;
}

.v-navigation-drawer .v-list-item:hover,
.v-navigation-drawer .v-list-item--active {
  background-color: rgba(125,216,125,0.08) !important;
}

.v-navigation-drawer .v-list-item--active .v-list-item__title {
  color: var(--regen-green) !important;
}

/* --- App Bar / Header --- */
.v-app-bar,
.v-toolbar,
header.v-app-bar {
  background-color: var(--regen-panel) !important;
  border-bottom: 1px solid var(--regen-border) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.v-app-bar .v-toolbar__title,
.v-app-bar .v-btn__content {
  color: var(--regen-text) !important;
}

/* --- Cards and Panels (threads, proposals, polls) --- */
.v-card,
.v-sheet,
.thread-card,
.strand-card,
.discussion-card,
.poll-common-card,
.comment-card {
  background-color: var(--regen-panel) !important;
  border: 1px solid var(--regen-border) !important;
  border-radius: var(--regen-radius) !important;
  color: var(--regen-text) !important;
}

.v-card:hover,
.thread-card:hover,
.discussion-card:hover {
  border-color: var(--regen-border-hover) !important;
  box-shadow: 0 4px 24px rgba(125,216,125,0.06) !important;
}

/* --- Buttons --- */
.v-btn.v-btn--contained,
.v-btn.primary,
.v-btn--is-elevated {
  background-color: var(--regen-green) !important;
  color: var(--regen-deep) !important;
  border-radius: 9999px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.v-btn.v-btn--contained:hover {
  background-color: #6cc86c !important;
  box-shadow: 0 4px 16px rgba(125,216,125,0.3) !important;
}

.v-btn.v-btn--outlined,
.v-btn--variant-outlined {
  border-color: var(--regen-green) !important;
  color: var(--regen-green) !important;
  border-radius: 9999px !important;
  text-transform: none !important;
}

/* Secondary / text buttons */
.v-btn.v-btn--text,
.v-btn--variant-text {
  color: var(--regen-green) !important;
  text-transform: none !important;
}

/* Danger buttons keep red */
.v-btn.error,
.v-btn--color-error {
  background-color: #ef4444 !important;
  color: white !important;
}

/* --- Text Inputs and Textareas --- */
.v-text-field .v-field,
.v-textarea .v-field,
.v-text-field input,
.v-textarea textarea,
.v-input .v-field__field,
.v-field {
  background-color: var(--regen-surface) !important;
  border-color: var(--regen-border) !important;
  color: var(--regen-text) !important;
  border-radius: 12px !important;
}

.v-text-field .v-field--focused,
.v-textarea .v-field--focused {
  border-color: var(--regen-green) !important;
  box-shadow: 0 0 0 2px rgba(125,216,125,0.15) !important;
}

.v-label,
.v-field__field .v-label {
  color: var(--regen-text-muted) !important;
}

/* --- Dialogs and Modals --- */
.v-dialog > .v-card,
.v-dialog .v-sheet,
.v-overlay__content .v-card {
  background-color: var(--regen-panel) !important;
  border: 1px solid var(--regen-border) !important;
  border-radius: var(--regen-radius) !important;
}

.v-overlay__scrim {
  background-color: rgba(13,40,24,0.85) !important;
}

/* --- Chips and Tags --- */
.v-chip {
  background-color: rgba(125,216,125,0.1) !important;
  color: var(--regen-green) !important;
  border: 1px solid var(--regen-border) !important;
  border-radius: 9999px !important;
}

/* --- Tabs --- */
.v-tabs .v-tab {
  color: var(--regen-text-muted) !important;
  text-transform: none !important;
}

.v-tabs .v-tab--selected,
.v-tabs .v-tab--active {
  color: var(--regen-green) !important;
}

.v-tabs .v-tabs-slider {
  background-color: var(--regen-green) !important;
}

/* --- Proposal / Decision styling --- */
.poll-common-card .v-card__title,
.proposal-card .v-card__title {
  color: var(--regen-gold) !important;
  font-weight: 700;
}

.poll-common-chart__bar--agree,
.poll-common-vote-form__agree {
  background-color: var(--regen-green) !important;
}

.poll-common-chart__bar--disagree {
  background-color: #ef4444 !important;
}

.poll-common-chart__bar--abstain {
  background-color: var(--regen-text-muted) !important;
}

.poll-common-chart__bar--block {
  background-color: var(--regen-amber) !important;
}

/* --- Timeline / Activity --- */
.strand-list,
.event-children,
.nested-comments {
  border-left: 2px solid var(--regen-border) !important;
}

.strand-item__author-name,
.comment__author-name {
  color: var(--regen-green) !important;
  font-weight: 600;
}

/* --- Avatar ring for active users --- */
.v-avatar {
  border: 2px solid var(--regen-border) !important;
}

.v-avatar:hover {
  border-color: var(--regen-green) !important;
}

/* --- Menus and Dropdowns --- */
.v-menu__content,
.v-list,
.v-autocomplete__content {
  background-color: var(--regen-panel) !important;
  border: 1px solid var(--regen-border) !important;
  border-radius: 12px !important;
}

.v-list-item:hover {
  background-color: rgba(125,216,125,0.08) !important;
}

/* --- Scrollbar styling --- */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--regen-deep);
}

::-webkit-scrollbar-thumb {
  background: rgba(125,216,125,0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(125,216,125,0.35);
}

/* --- Footer --- */
.app-footer,
footer {
  background-color: var(--regen-deep) !important;
  border-top: 1px solid var(--regen-border) !important;
  color: var(--regen-text-muted) !important;
}

/* --- Snackbar / Toast notifications --- */
.v-snackbar__wrapper {
  background-color: var(--regen-panel) !important;
  border: 1px solid var(--regen-green) !important;
  border-radius: 12px !important;
  color: var(--regen-text) !important;
}

/* --- Selection and highlights --- */
::selection {
  background: rgba(125,216,125,0.3);
  color: white;
}

/* --- Links --- */
a,
.v-btn--variant-text,
.text-link {
  color: var(--regen-green) !important;
}

a:hover {
  color: #9be89b !important;
}

/* --- "Powered by Loomio" footer badge --- */
.app-footer::after {
  content: "Powered by Loomio";
  display: block;
  text-align: center;
  font-size: 11px;
  color: var(--regen-text-muted);
  padding: 8px 0;
  letter-spacing: 1px;
  opacity: 0.5;
}

/* --- Loading spinner --- */
.v-progress-circular__overlay {
  stroke: var(--regen-green) !important;
}

.v-progress-linear__determinate,
.v-progress-linear__indeterminate .long,
.v-progress-linear__indeterminate .short {
  background-color: var(--regen-green) !important;
}

/* --- Dividers --- */
.v-divider {
  border-color: var(--regen-border) !important;
}

/* --- Breadcrumbs --- */
.v-breadcrumbs__item {
  color: var(--regen-text-muted) !important;
}

.v-breadcrumbs__item--active {
  color: var(--regen-green) !important;
}

/* --- Empty state illustrations --- */
.empty-state,
.blank-state {
  color: var(--regen-text-muted) !important;
}

/* --- Badge / notification dot --- */
.v-badge__badge {
  background-color: var(--regen-gold) !important;
  color: var(--regen-deep) !important;
}

/* --- Glass panel effect for featured cards --- */
.featured-thread,
.pinned-thread,
.announcement-thread {
  background: var(--regen-glass) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--regen-border-hover) !important;
}
```

### How to Inject

**Option A (preferred): `THEME_STYLESHEET_SRC` env var**

If Loomio supports a custom stylesheet URL:
1. Save the CSS above as `public/brand/regen-theme.css` in the Loomio container
2. Set `THEME_STYLESHEET_SRC=/brand/regen-theme.css`

**Option B: Loomio Admin Panel**

1. Go to gov.regencivics.earth as admin
2. Settings > Appearance > Custom HTML/CSS
3. Paste the full CSS into the custom CSS field

**Option C: Fork modification**

If you've forked Loomio, add the CSS file to `app/assets/stylesheets/` and import it in the main stylesheet.

---

## Phase 4: Vue Component Surgery (if forking Loomio)

These changes require modifying Loomio's Vue source. Only do this if you have a forked repo. If you're running stock Loomio, the CSS from Phase 3 plus the env vars from Phase 1 handle 80% of the visual transformation.

### 4a. Sidebar Logo Swap

**File:** `vue/src/components/common/sidebar.vue` (or equivalent)

Replace the default Loomio logo rendering with:

```vue
<template>
  <div class="sidebar-logo">
    <router-link to="/">
      <img src="/brand/regen_logo.svg" alt="ReGen Gov" class="sidebar-logo__img" />
    </router-link>
  </div>
</template>

<style scoped>
.sidebar-logo {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(125,216,125,0.15);
}
.sidebar-logo__img {
  height: 40px;
  width: auto;
}
</style>
```

### 4b. Header Bar Branding

**File:** `vue/src/components/common/navbar.vue` (or equivalent)

Replace the "Loomio" text in the app bar with "ReGen Gov":

```vue
<v-toolbar-title class="regen-title">
  <img src="/brand/regen_icon.svg" alt="" class="regen-title__icon" />
  <span>ReGen Gov</span>
</v-toolbar-title>

<style scoped>
.regen-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 800;
  color: #7dd87d;
}
.regen-title__icon {
  height: 28px;
  width: 28px;
  border-radius: 50%;
}
</style>
```

### 4c. Decision Page Header

**File:** `vue/src/components/poll/common/card.vue` (or equivalent decision/poll card)

Add a ReGen Gov badge above decision titles:

```vue
<div class="regen-decision-badge" v-if="poll">
  <span class="regen-decision-badge__icon">&#x2696;</span>
  <span>ReGen Gov Decision</span>
</div>

<style scoped>
.regen-decision-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(212,165,116,0.15);
  color: #d4a574;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
</style>
```

### 4d. Login Page Customization

**File:** `vue/src/components/auth/signin.vue` (or equivalent)

Replace the login page to match ReGen Civics:

```vue
<template>
  <div class="regen-login">
    <div class="regen-login__card">
      <img src="/brand/regen_logo.svg" alt="ReGen Gov" class="regen-login__logo" />
      <h2 class="regen-login__title">Welcome to ReGen Gov</h2>
      <p class="regen-login__subtitle">Governance for the Regenerative Renaissance</p>

      <!-- OIDC Single Sign-On button (primary) -->
      <v-btn
        block
        color="primary"
        class="regen-login__sso-btn"
        @click="signInWithOIDC"
      >
        Continue with ReGen Civics
      </v-btn>

      <div class="regen-login__divider">
        <span>or sign in with email</span>
      </div>

      <!-- Existing Loomio email/password form below -->
    </div>
  </div>
</template>

<style scoped>
.regen-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0d2818 0%, #1a472a 100%);
}
.regen-login__card {
  background: rgba(26,71,42,0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(125,216,125,0.15);
  border-radius: 24px;
  padding: 48px 40px;
  max-width: 420px;
  width: 100%;
  text-align: center;
}
.regen-login__logo {
  height: 48px;
  margin-bottom: 24px;
}
.regen-login__title {
  color: #f0f0f0;
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 8px;
}
.regen-login__subtitle {
  color: rgba(255,255,255,0.6);
  font-size: 14px;
  margin-bottom: 32px;
}
.regen-login__sso-btn {
  background: linear-gradient(135deg, #7dd87d, #5bb85b) !important;
  color: #0d2818 !important;
  font-weight: 700 !important;
  border-radius: 9999px !important;
  height: 48px !important;
  font-size: 15px !important;
  text-transform: none !important;
  margin-bottom: 24px;
}
.regen-login__divider {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255,255,255,0.4);
  font-size: 12px;
  margin-bottom: 20px;
}
.regen-login__divider::before,
.regen-login__divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(125,216,125,0.15);
}
</style>
```

---

## Phase 5: OIDC Shared Authentication Fix

Users logged into regencivics.earth should not have to log in again at gov.regencivics.earth. The flow uses OpenID Connect with the main site as the identity provider.

### Required Loomio env vars

```env
OAUTH_ENABLED=true
OIDC_ENABLED=true
OIDC_ISSUER_URL=https://regencivics.earth/api/auth/oidc
OIDC_CLIENT_ID=loomio-gov
OIDC_CLIENT_SECRET=<the secret from Railway regencivics service>
OIDC_REDIRECT_URI=https://gov.regencivics.earth/auth/oidc/callback
OIDC_DISCOVERY_URL=https://regencivics.earth/api/auth/oidc/.well-known/openid-configuration
```

### Required main site (regencivics.earth) env vars

```env
OIDC_CLIENT_ID_LOOMIO=loomio-gov
OIDC_CLIENT_SECRET_LOOMIO=<matching secret>
OIDC_REDIRECT_URIS_LOOMIO=https://gov.regencivics.earth/auth/oidc/callback
```

### Cookie domain

Both services must share the same cookie domain so session cookies are accessible across subdomains:

```env
# On BOTH services:
COOKIE_DOMAIN=.regencivics.earth
```

Note the leading dot. This allows cookies set by regencivics.earth to be readable by gov.regencivics.earth.

### Auto-redirect flow

The ideal UX: when a user visits gov.regencivics.earth and is not logged in, check for a session cookie from the main site. If present, automatically redirect through the OIDC flow without showing the Loomio login page. This requires either:

1. A custom middleware in Loomio that checks for the main site's session cookie and triggers OIDC if found
2. Setting `OIDC_AUTO_REDIRECT=true` (if Loomio supports it) to skip the login page entirely when OIDC is configured

If neither works, the minimum viable flow is: user sees a customized login page (Phase 4d) with "Continue with ReGen Civics" as the primary action.

### Debugging checklist

1. Visit `https://regencivics.earth/api/auth/oidc/.well-known/openid-configuration` -- should return a valid OIDC discovery document
2. Check that the `jwks_uri` endpoint returns the RS256 public key
3. Visit `https://gov.regencivics.earth/auth/oidc` -- should redirect to regencivics.earth's authorization endpoint
4. After login, check that the callback URL receives an authorization code
5. Verify the ID token contains: `sub` (user ID), `email`, `name`, `preferred_username` (handle)
6. Check Loomio's server logs for OIDC-related errors: `docker logs <container> | grep -i oidc`

---

## Phase 6: Loomio Organization Structure

Set up the governance hierarchy in the Loomio admin panel at gov.regencivics.earth:

### Step 1: Rename the default organization

Go to Settings > Group settings. Change the organization name from "Loomio" (or whatever default) to **"ReGen Civics"**.

Set the description to:
> Governance home for the Regenerative Renaissance. Decisions here shape how we fund, support, and connect regenerative land projects across bioregions.

### Step 2: Create category subgroups

Create two subgroups under "ReGen Civics":

**Bioregions**
- Name: Bioregions
- Description: "Each bioregion has its own governance space. Decisions made here affect how resources flow to land projects in your region."
- Privacy: Members only (visible to org members)

**Land Projects**
- Name: Land Projects
- Description: "Each incubated land project gets a governance space for internal decisions, milestone votes, and fund disbursement approvals."
- Privacy: Members only

### Step 3: Seed initial bioregion subgroups

Under "Bioregions", create subgroups for each active bioregion. Use the bioregion names from the main site's database. At minimum:

- Pacific Northwest
- Northern California
- Southern Appalachia
- Great Lakes
- (others as they exist in the platform)

### Step 4: Connect to main site sync

The `syncLoomioSubgroups` function in `server/webhooks/loomio.ts` handles automatic membership sync. Once `LOOMIO_API_KEY` is set on the main ReGen Civics Railway service, the sync will:
- Add users to their bioregion's Loomio subgroup when they join a bioregion on the main site
- Remove users from subgroups when they leave a bioregion

---

## Phase 7: 30 Specific Visual Improvements

These are the 30 ways to bridge the visual gap between regencivics.earth and gov.regencivics.earth. Most are handled by the CSS in Phase 3. This list serves as a verification checklist.

| # | Improvement | How |
|---|-------------|-----|
| 1 | Dark forest background (#0d2818) everywhere | CSS: body background override |
| 2 | Replace Loomio logo with ReGen Gov logo | Env var: THEME_APP_LOGO_SRC |
| 3 | Replace favicon with ReGen icon | Env var: THEME_ICON_SRC |
| 4 | Green accent (#7dd87d) on all interactive elements | CSS: button, link, chip overrides |
| 5 | Warm gold (#d4a574) for decision/proposal headers | CSS: proposal card title color |
| 6 | Glass-panel cards with subtle green borders | CSS: v-card background + border |
| 7 | Pill-shaped buttons (border-radius: 9999px) | CSS: v-btn border-radius |
| 8 | Remove all-caps button text | CSS: text-transform: none |
| 9 | Custom scrollbar (dark track, green thumb) | CSS: webkit-scrollbar styles |
| 10 | Green-tinted sidebar with proper active states | CSS: navigation-drawer overrides |
| 11 | Matching input field styling (dark surface bg) | CSS: v-field background |
| 12 | Green focus ring on inputs instead of blue | CSS: v-field--focused border |
| 13 | Modal backdrop matches dark forest | CSS: v-overlay__scrim color |
| 14 | Snackbar/toast notifications match theme | CSS: v-snackbar override |
| 15 | Loading spinners use green instead of blue | CSS: v-progress-circular stroke |
| 16 | Breadcrumbs use muted text, active is green | CSS: v-breadcrumbs colors |
| 17 | Notification badge uses gold | CSS: v-badge background |
| 18 | Tab indicators use green | CSS: v-tabs-slider color |
| 19 | Chips use green tint background | CSS: v-chip override |
| 20 | Timeline/thread lines use subtle green | CSS: strand-list border |
| 21 | Author names are green and bold | CSS: author-name color |
| 22 | Avatar rings match border system | CSS: v-avatar border |
| 23 | Dropdown menus match panel style | CSS: v-menu background |
| 24 | Dividers use subtle green border | CSS: v-divider color |
| 25 | Selection highlight is green-tinted | CSS: ::selection override |
| 26 | Pinned/featured threads get glass-panel treatment | CSS: pinned-thread class |
| 27 | Email notifications use ReGen branding | Env vars: EMAIL_HEADER/FOOTER |
| 28 | Login page shows ReGen Gov branding | Vue component or CSS |
| 29 | Footer shows "Powered by Loomio" subtly | CSS: ::after on footer |
| 30 | Text link hover color is lighter green | CSS: a:hover color |

---

## Phase 8: Post-Deploy Verification Checklist

After all changes are deployed, walk through each of these:

- [ ] Visit gov.regencivics.earth -- page loads with dark green background
- [ ] Sidebar shows ReGen Gov logo, not Loomio logo
- [ ] Browser tab shows ReGen icon favicon
- [ ] Create a new thread -- form fields have dark surface background
- [ ] Start a proposal -- proposal card has gold title accent
- [ ] Vote on something -- agree bar is green, not blue
- [ ] Check mobile view -- responsive, no layout breaks
- [ ] Click "Continue with ReGen Civics" on login page -- OIDC flow works
- [ ] After OIDC login, user appears with correct name/email/avatar
- [ ] Navigate to Bioregions subgroup -- shows correct description
- [ ] Send a test email notification -- email has ReGen branding
- [ ] Open a dialog/modal -- backdrop is dark forest, card matches theme
- [ ] Scroll a long thread -- scrollbar is styled (dark + green thumb)
- [ ] Check Terms/Privacy links -- point to regencivics.earth
- [ ] View the page source -- no "Loomio" branding in visible UI (except subtle "Powered by")

---

## Notes for Claude Code

- The main ReGen Civics codebase is in the current working directory. Loomio is a separate Rails app deployed on Railway.
- If you have access to the Loomio repo (fork), you can modify Vue components directly. If not, focus on CSS injection and env vars.
- The CSS in Phase 3 is aggressive with `!important` on purpose. Loomio's Vuetify styles are deeply nested and specificity is high. The `!important` overrides are necessary.
- Test the CSS changes by pasting sections into browser DevTools on gov.regencivics.earth before committing.
- The OIDC setup (Phase 5) is the most complex part. If the discovery endpoint at regencivics.earth doesn't exist yet, that needs to be built first. Check `server/routes/` for any existing OIDC provider implementation.
- When in doubt, prioritize: CSS theme > brand assets > OIDC > Vue modifications. The CSS alone gets you 80% of the way there.
