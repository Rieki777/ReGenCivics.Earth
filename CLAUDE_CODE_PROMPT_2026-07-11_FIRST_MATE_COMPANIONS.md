# CLAUDE CODE PROMPT: The First Mate Personas + Conversational Companions (2026-07-11)

**Status:** Ready to build. Two connected systems: (1) the First Mate becomes an embodied, bioregion-specific persona, and (2) a site-wide Conversational Companion pattern so any form can be filled by talking instead of typing. Plus a mobile fix for the wonky crew profile form.
**Vision in one line:** people staring at screens less, outside in beautiful nature, talking naturally with a friendly local guide who fills out the form for them.

## Kickoff prompt (paste into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-11_FIRST_MATE_COMPANIONS.md at the repo root and execute it: the Cascadia First Mate persona, the ReGen Guide as everyone's personally designed general companion (Section 1.3, existing ADR-23 guardrails intact), the reusable FormCompanion voice/chat system with its first four integrations (concierge intake, booking request, crew profile, add-to-map), the audio-first sitewide mandate, the mobile crew profile fix, and the persona portrait generation (First Mate, Harbormaster, Gardener, Weaver, four Guide archetypes). Ship gate, commit, push, verify Railway SUCCESS, update SHIPPED_LOG.md, report with a Handoff Breakdown.

---

## 1. The First Mate, embodied and bioregional

The First Mate is no longer a generic assistant. She is a **persona of a real solid local, hardcore in the Regenerative Renaissance of the bioregion the ship is sailing in**, and the persona shifts when the ship migrates.

### 1.1 Cascadia First Mate (v1)

**Scope, stated plainly: the First Mate belongs to the ReGen Ship section only.** Other areas of the site never borrow her; each has its own named, pictured persona (roster in 1.2, the personal ReGen Guide in 1.3).

- **Character:** a warm, grounded Cascadian local who has drunk from half the springs on the map. Deeply knows the bioregion's beauty, its fresh water, its land projects, and its movement: speaks naturally of the bioregional community (the Cascadia Department of Bioregion, Regenerate Cascadia, the watershed way of seeing) as her world, without lecturing
- **Voice:** conversational, fun, plainspoken, like a friend on the phone. Natural language in, natural language out. Never form-speak ("Question 4 of 10"), always conversation ("Okay, and how much are you wanting to chase waterfalls versus just resting?")
- **System prompt:** build a persona block (identity, bioregion knowledge domains, tone rules, STEERING writing rules, no AI-isms) stored per bioregion in a `ship_personas` config (bioregionSlug, name, portraitUrl, systemPersona text, greeting). Cascadia seeds it; the winter bioregion adds its own local First Mate later (winter migration doc). Persona content is data, so new bioregions need no code
- **Security unchanged:** persona flavor lives in the system prompt; user content stays untrusted input; itineraries still validate location IDs against the DB

### 1.2 Persona roster (companions beyond the First Mate)

Each major form gets its own friendly face, dressed in a regenerative-futuristic way. v1 roster (names are placeholders Rye can rename):

| Companion | Where | Character |
|---|---|---|
| The First Mate | Concierge, map, crew profile, booking | Cascadian local, charts voyages |
| The Harbormaster | Keeper, fleet, winter host, stops, dataset door | Practical, salty, keeps the fleet seaworthy |
| The Gardener | Land project / Season 2 application | Gentle land steward, asks about soil and dreams |
| The Weaver | Alliance application (village projects, org partners) | A woman who weaves the network; personally onboards village projects like a friend who already believes in them |
| The ReGen Guide | Everywhere (the general assistant) | Each member designs their own: name, face, tone. See 1.3 |

Portraits: generate with nano-banana-pro (2K, painterly storybook, consistent style), save to `ship-photos/`:

1. `persona-first-mate.png`: "Painterly storybook portrait, head and shoulders, of a warm weathered Pacific Northwest woman in her 40s, sun-lined friendly face, hand-knit cedar-green sweater and a small woven cedar-bark hat, tiny fern sprig pinned to her collar, misty evergreen forest behind, warm golden light, hand-painted children's book style, kind eyes, slight smile. No text."
2. `persona-harbormaster.png`: "Painterly storybook portrait, head and shoulders, of a sturdy older man with a silver beard and laughing eyes, oilskin coat with patched elbows and a brass compass on a cord, harbor rope coils and a green pirate flag soft-focus behind, warm evening light, hand-painted children's book style. No text."
3. `persona-gardener.png`: "Painterly storybook portrait, head and shoulders, of a gentle brown-skinned man in his 30s with soil-dusted hands folded, linen shirt and a woven sun hat slung back, young fruit trees and a food forest glowing behind, morning light, hand-painted children's book style, serene smile. No text."
4. `persona-weaver.png`: "Painterly storybook portrait, head and shoulders, of a radiant woman in her 30s with long braided hair threaded with a strand of wool, wearing a handwoven shawl in earth tones with a subtle futuristic clasp, holding a loom shuttle, a web of golden threads connecting small glowing villages soft-focus behind her, warm light, hand-painted children's book style, welcoming smile. No text."

### 1.3 The ReGen Guide: the personal companion everyone designs

The site already has a ReGen Guide (`server/lib/regenGuide.ts`, ADR-23: a real forum user, never speaks unless invoked, never casts stances, always editable by facilitators). It now grows into **the general assistant every member has, personally designed**. Its existing forum/governance behavior and guardrails do not change.

- **Design your Guide:** a one-time (revisitable) moment after profile creation: name your Guide, pick its face from four painterly archetypes, pick its tone (gentle / playful / direct), voice on or off. Stored in `user_guide_preferences` (userId unique, guideName, portraitKey, tone, voiceEnabled, updatedAt)
- **Everywhere:** the Guide lives in the existing assist surface (`components/command/AssistTab.tsx` / the floating companion button) on every page, general-purpose: answer questions about the site, the game, the Fund and the Game distinction (CONTEXT_THE_TWO_GAMES rules apply to its copy), your quests, your tokens, your bookings
- **It knows you, only you:** server-side context is strictly the requesting member's own data (profile, quest points, token balances, bookings, path progress). No cross-user data, ever. User text stays untrusted input
- **Handoffs to specialists:** for a form or a voyage, the Guide introduces the right companion in character ("Charting voyages is the First Mate's craft. She's better company for this than me") and routes into the FormCompanion flow
- **Same voice layer, same silence toggle** as Section 2.2
- **Portrait archetypes:** generate four options with nano-banana-pro, same painterly style, filenames `guide-archetype-1..4.png`: (1) "an androgynous young guide with a moss-green cloak and a small lantern", (2) "a grandmotherly figure with silver braids and a seed pouch", (3) "a bright-eyed fox in a woven scarf, anthropomorphic, gentle", (4) "a young man with a walking staff and a swallow on his shoulder"; each: "painterly storybook portrait, head and shoulders, warm light, hand-painted children's book style, kind expression, misty evergreen background. No text."

## 2. The Conversational Companion pattern (site-wide, reusable)

### 2.1 The component

One reusable `<FormCompanion>` that wraps any form:

- **The invitation, at the top of every wrapped form:** the companion's portrait + a big friendly button: **"Talk it out with [name]"**, and beneath it, quieter: "I'd rather type." Copy sells the why: "No more thumb workouts. Step outside, find something beautiful, and just talk. [Name] will fill this out with you"
- **Audio-first is the sitewide default, every viewport.** Tapping any wrapped form's entry CTA opens the companion in conversation mode immediately; typing stays one tap away ("I'd rather type"). This is the dominant way forms are filled across ALL of regencivics.earth, not just the ship: the mandate is people staring at screens less. Every invitation carries the walk outside energy: "Step outside or find a window with a tree in it. Let's get your eyes on something beautiful and just talk this out like friends"
- **Conversation loop:** companion asks one question at a time in persona voice; the user answers by voice or short text; answers stream into the visible form fields in real time so the person sees the form filling itself
- **Extraction:** each turn, the server (existing `invokeLLM`, OpenRouter) extracts structured values against the form's zod schema and returns both the next conversational question and the field updates. Never invent values; unclear answers get a friendly follow-up
- **Review before submit, always:** the companion ends with "Here's what I've got" and the completed form for the human to confirm and submit. The companion never submits on its own (AI-AUTOMATION-RISKS)
- **The silence toggle:** a speaker icon switches between spoken voice + captions and chat-only ("reading mode" for public places). Preference persists (localStorage). Captions always render regardless, so voice is never required to follow along

### 2.2 The voice layer (v1 pragmatic, upgrade path clear)

- **Ears (speech to text):** browser SpeechRecognition where available; where unsupported (notably some iOS versions), fall back to MediaRecorder capture posted to a server STT endpoint behind an isConfigured guard (`STT_API_KEY`, provider configurable, Groq Whisper or OpenAI Whisper both fit; if unconfigured, voice input hides and chat input remains). Mic permission denial degrades gracefully to typing
- **Mouth (text to speech):** browser `speechSynthesis` for v1 (free, everywhere), picking the best available local voice. Flag the v2 upgrade in the report: hosted voices (e.g., ElevenLabs) behind `TTS_API_KEY` for the truly fun voice; build the interface so swapping providers is config, not code
- **Performance:** lazy-load the whole companion bundle; nothing voice-related loads until the invitation is tapped
- **Accessibility:** captions always, visible focus states, aria-live on companion messages, respects prefers-reduced-motion

### 2.3 v1 integrations (in this build)

1. **Concierge intake** (the screenshot with 10 stacked text boxes): replace with the First Mate asking each question aloud, one at a time, answers by voice. The big button at the start: "Chart my voyage by voice." The form view remains as the typed alternative
2. **Booking request (`/ship/book`):** "Request this voyage" starts a dialogue with the First Mate. She confirms the chosen week, walks through guests (and the kids rule), the diet and water doctrine commitments explained in her own words, and anything-we-should-know, then shows the filled request for confirmation. The commitments still require an explicit yes each (never inferred)
3. **Crew profile:** tapping "Make crew profile" brings the First Mate up first ("Okay, I'm your First Mate. Let's build your crew card; tell me about yourselves"), walking through name, bio, intent, and the sponsor video pitch conversationally. ALSO fix the wonky mobile form (screenshot evidence: cramped fields, overlapping keyboard, no scroll padding): proper viewport handling, scroll-into-view on focus, safe-area padding, larger touch targets, and test at 390px with keyboard open (Playwright)
4. **Add to the map:** the quick form gains the invitation ("Tell the First Mate what you found")

### 2.4 Rollout (next builds, wire the pattern to be drop-in)

**Alliance application first (the Weaver, next build):** she personally onboards village projects, talking them through the application like a friend who already believes in them. Then Season 2 land application (the Gardener), keeper + fleet + winter host + stops + dataset door (the Harbormaster), nominations, and onward until every form on the site leads with a companion. Adding one should be: wrap the form, point at a persona, hand it the zod schema. If the Alliance application wrap is cheap once the pattern lands, include it in THIS build rather than waiting.

## 3. Copy notes

The invitation copy is the product. Per persona, 2 to 3 rotating invitation lines in their voice, e.g. First Mate: "Give your thumbs the day off. Let's talk your voyage out." Harbormaster: "Forms are for barnacles. Tell me straight and I'll write it down." All copy passes STEERING rules: no em-dashes, no AI-isms.

## 4. Tests

Extraction maps a messy natural-language answer to the right zod fields and never fabricates unmentioned values; unclear answer triggers a follow-up, not a guess; review step blocks submission until confirmed; commitments require an explicit yes each; silence toggle persists; voice-unavailable environments degrade to chat; Guide context is scoped to the requesting member only (test that another user's data can never appear); the Guide's existing forum/governance behavior is unchanged (its current tests stay green); crew profile renders correctly at 390px with keyboard open (screenshot evidence).

## Handoff Breakdown

### YOU (Rye)

| # | Task | Why | Where |
|---|------|-----|-------|
| 1 | Bless or rename the persona roster (First Mate, Harbormaster, Gardener) | Naming is yours | reply in chat |
| 2 | If you want server STT on iOS in v1, provide a Groq or OpenAI key for Railway (`STT_API_KEY`); otherwise iOS falls back to typing until then | Key holder | Railway Variables |
| 3 | Approve the generated persona portraits (regenerate any that miss) | Aesthetic call | ship-photos/ after the build |

### CLAUDE CODE

Everything in Sections 1 through 4, autonomously, through a green deploy. Generate portraits locally via nano-banana-pro (GEMINI_API_KEY is in the local .env); placeholders + listed commands only if generation fails.

### WAITING ON YOU

- Nothing blocks. STT key and persona renames land whenever ready.
