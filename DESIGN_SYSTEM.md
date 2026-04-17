# ReGen Civics Design System

One page. Locked palette, typography, spacing, radius, shadow, and component conventions. Every new component consumes tokens from `client/src/lib/design-tokens.ts`. Every existing component migrates to the same tokens over time.

This document pairs with `FIXES_TO_MAKE_VISUAL_AUDIT.md`, which contains the route-by-route audit and the color migration map.

---

## Palette

The organic dark-forest palette has five groups. Each group has 2 to 5 steps. Nothing else ships without a design discussion.

### Forest (grounded surfaces)

| Token            | Hex       | Role                              |
| ---------------- | --------- | --------------------------------- |
| `forest.deepest` | `#0a1f14` | deepest shadow, rare              |
| `forest.deep`    | `#0d2818` | primary app background            |
| `forest.base`    | `#1a472a` | primary surface (cards, nav)      |
| `forest.moss`    | `#2d5a3d` | secondary / raised surface        |
| `forest.sage`    | `#4a7c59` | borders, tertiary surface         |

### Spring (living accent)

| Token          | Hex       | Role                           |
| -------------- | --------- | ------------------------------ |
| `spring.base`  | `#7dd87d` | primary accent, active state   |
| `spring.hover` | `#9de89d` | hover / highlight              |
| `spring.soft`  | `#a8e6a8` | subtle wash, hover bg          |

### Parchment (warm light)

| Token               | Hex       | Role                       |
| ------------------- | --------- | -------------------------- |
| `parchment.base`    | `#f0ebe3` | primary text on forest     |
| `parchment.soft`    | `#e8e4de` | secondary text             |
| `parchment.warm`    | `#f8f5f0` | warm cream surface         |
| `parchment.whisper` | `#f0f7f0` | green-tinted cream surface |

### Amber (warm emphasis)

| Token         | Hex       | Role                               |
| ------------- | --------- | ---------------------------------- |
| `amber.tan`   | `#d4a574` | autumn season, warm accent         |
| `amber.gold`  | `#ffd700` | high-emphasis governance highlight |
| `amber.dim`   | `#d4a017` | deep gold border / pressed state   |

### Alert (destructive / warning)

| Token           | Hex       | Role                       |
| --------------- | --------- | -------------------------- |
| `alert.red`     | `#ef6f6c` | destructive, error         |
| `alert.warnBg`  | `#fef3c7` | warning toast background   |
| `alert.warnFg`  | `#92400e` | warning toast foreground   |

### Brand (third-party, reserved)

| Token            | Hex       | Role                               |
| ---------------- | --------- | ---------------------------------- |
| `brand.twitter`  | `#1da1f2` | only on Twitter share button       |
| `brand.linkedin` | `#0a66c2` | only on LinkedIn share button      |

### Season accents

| Season | Token                            | Hex       |
| ------ | -------------------------------- | --------- |
| Spring | `season.spring` = `spring.base`  | `#7dd87d` |
| Summer | `season.summer` = `forest.sage`  | `#4a7c59` |
| Autumn | `season.autumn` = `amber.tan`    | `#d4a574` |
| Winter | `season.winter` = `forest.deep`  | `#0d2818` |

### Fund governance chart (locked)

The "Who Holds the Vote" chart on `/governance` uses four slices at 40/20/20/20:

| Slice               | Share | Token              |
| ------------------- | ----- | ------------------ |
| Stewardship Council | 40%   | `forest.sage`      |
| Investors           | 20%   | `spring.base`      |
| Land Projects       | 20%   | `parchment.base`   |
| Alliance Partners   | 20%   | `amber.gold`       |

---

## Typography

Three families:
- `Quicksand` (display headings)
- `Nunito` (body)
- `Righteous` (accent, sparingly, feature CTAs)

Scale is declared in `design-tokens.ts` under `typography.sizes`. Minimum mobile-safe body is 15px. Minimum caption is 13px. Heading weights are 700.

Line-height: `1.6` for body, `1.2` for display headings, `1.4` for tight UI.

---

## Spacing (8pt grid)

Use `design-tokens.ts` scale. Gaps between related items are `sm` or `md`. Between sections are `2xl` or `3xl`. Full-section padding on mobile is `md`, on desktop is `xl` to `2xl`.

---

## Radius

| Level   | Size     | Where                          |
| ------- | -------- | ------------------------------ |
| `sm`    | `8px`    | chips, inline pills            |
| `md`    | `12px`   | buttons, inputs                |
| `lg`    | `16px`   | cards                          |
| `xl`    | `24px`   | feature cards, modals, heroes  |
| `full`  | `9999px` | avatars, circular icon buttons |

No radii outside this scale. No mixed radii inside a single component.

---

## Shadow

Shadows tint the forest, not black. RGB is `(10, 31, 20)` with varying alpha.

| Level | Use                                     |
| ----- | --------------------------------------- |
| `sm`  | small chips, subtle lift                |
| `md`  | buttons, dropdowns                      |
| `lg`  | cards                                   |
| `xl`  | modals, hero CTAs                       |
| `glow`| active quest card, Live badge, hero CTA |

---

## Buttons

One primary button style per viewport. One secondary. One ghost.

- **Primary**: `bg-[spring.base] text-[forest.deep]`, `rounded-xl` (md), `shadow-md`. Hover `spring.hover`.
- **Secondary**: `bg-[forest.moss] text-[parchment.base] border border-[spring.base]/30`. Hover moves border to `spring.base/60`.
- **Ghost**: `text-[spring.base] bg-transparent`. Hover bg `spring.base/10`.

All buttons min-height 44px on mobile. No button smaller than `text-sm` font-size.

---

## Cards

- Background: `forest.base` at 70-95% opacity over the page background, backdrop-blur for glass panels.
- Border: `spring.base` at 20-30% alpha.
- Radius: `lg` default, `xl` for feature cards.
- Padding: `md` mobile, `lg` desktop.
- Shadow: `md` at rest, `lg` on hover.

---

## Focus states

Every interactive element gets a visible focus ring: `outline: 2px solid #7dd87d; outline-offset: 2px;`. WCAG AA minimum contrast against surrounding surface.

---

## Links

Inline text links: `spring.base`, underline on hover, not by default. In body prose, underlined always to meet accessibility.

---

## Dark / Light

Site defaults to dark (forest.deep). Light mode uses `parchment.warm` as background with `forest.base` text. Toggle persists per user. Same tokens work in both modes, the mode picks which side of the palette reads as surface vs text.

---

## Migration principle

Any new work consumes tokens directly. When editing an existing component, swap any hex literal within that file for the matching token. Do not batch-migrate in one giant PR. Migration happens page-by-page during the visual audit sprint, tracked in `FIXES_TO_MAKE_VISUAL_AUDIT.md`.

---

## Writing rules (reminder)

Copy inside components follows the ReGen Civics writing rules:
- No em-dashes
- No contrast framing ("not X, it's Y")
- No banned AI words
- No rhetorical question openers
- No passive inspiration
