/**
 * Conversational Companions: the site-wide, reusable config shared by the client
 * <FormCompanion> and the server companion endpoint.
 *
 * A Companion is a friendly persona who fills out a form by talking with the
 * person, one question at a time, in natural language. This file holds the parts
 * BOTH sides need: the persona display metadata (name, portrait, greeting,
 * invitation copy) and each form's field spec. The persona SYSTEM PROMPT text is
 * server-only and lives in server/lib/ship-personas.ts, so untrusted client code
 * never sees it and cannot be coached to change it.
 *
 * Adding a new bioregion's First Mate, or wrapping a new form, is data: add a
 * persona entry and a form config here, point the form at a persona, hand it the
 * fields. No new component code.
 *
 * Security (AI-AUTOMATION-RISKS.md): field specs are declarative data. The user's
 * spoken answers are untrusted and are only ever sent as user-turn content; the
 * server system prompt tells the model to treat them as data, and every real
 * write still runs the existing zod-validated tRPC procedure. The Companion never
 * submits on its own.
 */

// ── Persona display metadata (client-safe) ───────────────────────────────────

export type CompanionPersonaId = "first-mate" | "harbormaster" | "gardener" | "weaver";

export type CompanionPersona = {
  id: CompanionPersonaId;
  /** The bioregion this persona belongs to. The First Mate shifts per bioregion. */
  bioregionSlug: string;
  name: string;
  /** Local image name served from /images/ship/ (see shipImg). */
  portrait: string;
  /** One-line role, shown under the name on the invitation card. */
  role: string;
  /** The opening line she speaks when the conversation starts. */
  greeting: string;
  /** 2 to 3 rotating invitation lines in her voice (STEERING: no em-dashes, no AI-isms). */
  invitations: string[];
  /** Tailwind text/border accent used on the invitation card. */
  accent: string;
};

export const COMPANION_PERSONAS: Record<CompanionPersonaId, CompanionPersona> = {
  "first-mate": {
    id: "first-mate",
    bioregionSlug: "cascadia",
    name: "the First Mate",
    portrait: "persona-first-mate.webp",
    role: "Cascadian local, charts your voyage",
    greeting:
      "Ahoy. I'm your First Mate. Step outside or find a window with a tree in it, and let's just talk this out like friends. Tell me a little about you.",
    invitations: [
      "Give your thumbs the day off. Let's talk your voyage out.",
      "Step outside, find some moving water, and just tell me about it. I'll write it all down.",
      "No forms today. Talk to me like a friend on the phone and I'll fill this in with you.",
    ],
    accent: "text-[#2f5d3a] dark:text-[#7dd87d] border-[#4a7c59]/40",
  },
  harbormaster: {
    id: "harbormaster",
    bioregionSlug: "cascadia",
    name: "the Harbormaster",
    portrait: "persona-harbormaster.webp",
    role: "keeps the fleet seaworthy",
    greeting:
      "Right then. I'm the Harbormaster. Tell me straight and I'll write it down proper. No need to fuss with the little boxes.",
    invitations: [
      "Forms are for barnacles. Tell me straight and I'll write it down.",
      "Skip the typing. Talk to me and we'll have this squared away in a minute.",
    ],
    accent: "text-[#8a5a2b] dark:text-[#e0b483] border-[#8a5a2b]/40",
  },
  gardener: {
    id: "gardener",
    bioregionSlug: "cascadia",
    name: "the Gardener",
    portrait: "persona-gardener.webp",
    role: "gentle land steward",
    greeting:
      "Hey, glad you're here. I'm the Gardener. Find somewhere green to stand and let's talk about your land and what you're dreaming of. I'll take it down as we go.",
    invitations: [
      "Come sit with me a minute. Tell me about your land and I'll fill this out with you.",
      "No typing. Just talk to me about the soil and the dream, and I'll write it down.",
    ],
    accent: "text-[#4a7c59] dark:text-[#9de89d] border-[#4a7c59]/40",
  },
  weaver: {
    id: "weaver",
    bioregionSlug: "cascadia",
    name: "the Weaver",
    portrait: "persona-weaver.webp",
    role: "weaves the village network",
    greeting:
      "I'm so glad you found your way here. I'm the Weaver. I already believe in what your village is doing. Step outside, take a breath, and let's talk it through together. I'll fill this out for you.",
    invitations: [
      "Let's talk your village into the network. Just tell me the story and I'll write it down.",
      "Give your hands a rest. Talk to me about your people and your place, and I'll fill this out with you.",
    ],
    accent: "text-[#7a4fb0] dark:text-[#c9a9f0] border-[#7a4fb0]/40",
  },
};

/**
 * The Ship's Cook (Galley spec section 6e). A chat persona, not a form companion,
 * so she stands apart from the CompanionPersonaId union: she cooks from the crew's
 * logged haul and photos instead of filling a form. Display metadata is client-safe;
 * her system prompt is server-only in server/lib/ship-cook.ts.
 */
export type ChatPersona = {
  id: "ships-cook";
  name: string;
  portrait: string;
  role: string;
  greeting: string;
  invitations: string[];
  accent: string;
};

export const SHIPS_COOK: ChatPersona = {
  id: "ships-cook",
  name: "the Ship's Cook",
  portrait: "persona-ships-cook.webp",
  role: "cooks the valley into a feast",
  greeting:
    "Welcome to the galley. Tell me what you gathered, or snap a photo of your haul, and I'll cook you something alive from it. Pick your track and let's play.",
  invitations: [
    "Show me what you found at the market and I'll turn it into dinner.",
    "Log your haul or snap a photo, and I'll remix it into something you'll want to make.",
    "You gathered it, I'll cook it. Tell me what's on the counter.",
  ],
  accent: "text-[#b5651d] dark:text-[#e8a866] border-[#b5651d]/40",
};

// ── Form field specs ──────────────────────────────────────────────────────────

export type CompanionFieldType = "text" | "longtext" | "boolean" | "number" | "enum";

export type CompanionField = {
  /** Stable key. Matches the host form's state and the companion's `updates`. */
  key: string;
  /** The underlying question, in plain language. The model rephrases in voice. */
  label: string;
  type: CompanionFieldType;
  required?: boolean;
  /** For type "enum": the allowed values. */
  enumValues?: string[];
  /** Extra instruction to the model about this field. */
  guidance?: string;
};

export type CompanionFormId =
  | "concierge-intake"
  | "booking-request"
  | "crew-profile"
  | "map-add"
  | "alliance-application"
  | "land-application";

export type CompanionFormConfig = {
  id: CompanionFormId;
  personaId: CompanionPersonaId;
  /** Short human title, shown on the invitation card. */
  title: string;
  /** The big entry button label, e.g. "Chart my voyage by voice". */
  entryLabel: string;
  fields: CompanionField[];
  /** How the persona should decide she is done and ready to review. */
  completion: string;
};

const MAP_TYPES = [
  "land_project", "spring", "waterfall", "lake", "geology",
  "forest", "food_forest", "seed_site", "boondock", "event_venue",
];

export const COMPANION_FORMS: Record<CompanionFormId, CompanionFormConfig> = {
  "concierge-intake": {
    id: "concierge-intake",
    personaId: "first-mate",
    title: "Chart a voyage",
    entryLabel: "Chart my voyage by voice",
    completion:
      "Once you have a good feel for their pace, their pull toward water and food forests, any events or practice they want, what they can gift the land, their diet within the vegan commitment, and who their crew is, you are ready to review. You do not need every field, just a real picture.",
    fields: [
      { key: "pace", label: "What pace do you want? Restful, balanced, or full days?", type: "text" },
      { key: "activity", label: "How much physical activity: hiking, paddling, biking, service work?", type: "text" },
      { key: "springs", label: "How much do you want to seek out springs and wild water?", type: "text" },
      { key: "food_forests", label: "How drawn are you to food forests and planting?", type: "text" },
      { key: "events", label: "Do you want to catch land project events or workshops on your route?", type: "text" },
      { key: "spiritual", label: "Any spiritual practice you want time and space for?", type: "text" },
      { key: "skills", label: "What skills could you gift the land projects you visit?", type: "longtext" },
      { key: "diet", label: "Any diet details within the vegan commitment we should know?", type: "text" },
      { key: "must_sees", label: "Any must-see places already on your list?", type: "text" },
      { key: "group", label: "Who is your crew? Tell me about your group.", type: "text", required: true },
    ],
  },
  "booking-request": {
    id: "booking-request",
    personaId: "first-mate",
    title: "Request a voyage",
    entryLabel: "Request this voyage by voice",
    completion:
      "You are ready to review once you know the guest count and you have an explicit yes to BOTH the vegan diet commitment and the water doctrine commitment. Never assume a yes; both must be spoken plainly.",
    fields: [
      { key: "guests", label: "How many are sailing? One to four.", type: "number", required: true, guidance: "A whole number from 1 to 4." },
      {
        key: "dietCommitment",
        label: "The whole voyage runs on a regenerative vegan diet. Can you commit to that?",
        type: "boolean",
        required: true,
        guidance: "Only set to yes when the guest clearly agrees. If they hesitate or ask questions, explain warmly and ask again. Never infer a yes.",
      },
      {
        key: "waterDoctrineCommitment",
        label: "The ship's water doctrine: only the soaps and cleaning materials aboard, no chemical body products. Can you commit to that?",
        type: "boolean",
        required: true,
        guidance: "Only set to yes when the guest clearly agrees. Explain it in your own words first if they seem unsure. Never infer a yes.",
      },
      { key: "notes", label: "Anything we should know before you sail?", type: "longtext" },
    ],
  },
  "crew-profile": {
    id: "crew-profile",
    personaId: "first-mate",
    title: "Build your crew card",
    entryLabel: "Build my crew card by voice",
    completion:
      "You are ready to review once you have their crew name and a real sense of who they are and what they intend to do on their voyage. The video link is a bonus, not required.",
    fields: [
      { key: "displayName", label: "What's your name or your crew name?", type: "text", required: true },
      { key: "bio", label: "Tell me about yourselves. A few lines about who you are.", type: "longtext" },
      { key: "intent", label: "What do you intend to do on your voyage? Where you'll go, what you'll plant, who you'll visit.", type: "longtext" },
      { key: "videoUrl", label: "Do you have a short video pitch? If so, what's the link (YouTube or Loom)?", type: "text", guidance: "Only fill this if they give an actual URL. If they describe a video but have no link yet, leave it and encourage them to add one." },
    ],
  },
  "alliance-application": {
    id: "alliance-application",
    personaId: "weaver",
    title: "Join the alliance",
    entryLabel: "Talk it through with the Weaver",
    completion:
      "You are ready to review once you understand what their organization does to support land projects and how they see the partnership growing regenerative cultures. The best link is a bonus, not required.",
    fields: [
      { key: "organizationUrl", label: "What's the best link to explore your organization?", type: "text", guidance: "Only fill this if they give an actual URL." },
      { key: "allianceSupportDescription", label: "How does your organization support land projects? The services, resources, or expertise you offer.", type: "longtext", required: true },
      { key: "partnershipDescription", label: "How do you see our partnership helping grow a diversity of regenerative cultures?", type: "longtext" },
    ],
  },
  "land-application": {
    id: "land-application",
    personaId: "gardener",
    title: "Apply for a season",
    entryLabel: "Talk it through with the Gardener",
    completion:
      "You are ready to review once every required field holds a real picture in the person's own words: the project's name, type, place, and vision, the land situation, the team, their practices, governance, community ties, time availability, and what funding they need. Take your time, one thing at a time, and let them tell stories. When you set readyForReview true, remind them the review screen also has a map pin and a place to attach documents if they have any.",
    fields: [
      { key: "projectName", label: "What's your project called?", type: "text", required: true },
      {
        key: "projectType",
        label: "Is the project early stage or mature?",
        type: "enum",
        required: true,
        enumValues: ["early_stage", "mature"],
        guidance: "Map their description. Just past land acquisition or still forming is early_stage. Established and ready for funding is mature. If unsure, ask how far along they are.",
      },
      { key: "location", label: "Where is the land? City or region, and country.", type: "text", required: true },
      { key: "vision", label: "What's the vision? What are you dreaming this place becomes?", type: "longtext", required: true },
      {
        key: "landStatus",
        label: "What's your relationship to the land right now?",
        type: "enum",
        required: true,
        enumValues: ["owned", "leased", "committed", "seeking"],
        guidance: "owned means they hold title, leased means a lease, committed means land is promised or under contract, seeking means still looking. Map their words to one of these.",
      },
      {
        key: "projectSizeHectares",
        label: "How big is the land?",
        type: "number",
        guidance: "A number in hectares. If they answer in acres, convert it: one acre is 0.4047 hectares. Say the converted number back to them so they can correct you.",
      },
      {
        key: "teamSize",
        label: "How many people are on the core team?",
        type: "number",
        required: true,
        guidance: "A whole number.",
      },
      { key: "teamDescription", label: "Tell me about the team. Who are they, what do they carry, what have they done?", type: "longtext", required: true },
      { key: "regenerativePractices", label: "What regenerative practices are you working with? Soil, water, forests, restoration.", type: "longtext", required: true },
      { key: "governanceApproach", label: "How do you make decisions together?", type: "longtext", required: true },
      { key: "communityEngagement", label: "How does the project connect with and serve the wider community around it?", type: "longtext", required: true },
      {
        key: "timeCommitment",
        label: "The season asks for about one day a week from your team. What does your availability look like?",
        type: "longtext",
        required: true,
        guidance: "Capture their availability in their own words. If they cannot commit a day a week, note what they can do honestly. Never write a commitment they did not say.",
      },
      { key: "currentFunding", label: "What funding or resources does the project have right now, if any?", type: "longtext" },
      { key: "fundingNeeds", label: "What funding or resources do you need to move forward?", type: "longtext", required: true },
      { key: "additionalNotes", label: "Anything else you want the reviewers to know?", type: "longtext" },
    ],
  },
  "map-add": {
    id: "map-add",
    personaId: "first-mate",
    title: "Add to the map",
    entryLabel: "Tell the First Mate what you found",
    completion:
      "You are ready to review once you have a name for the place and its kind. The exact spot on the map is dropped separately by tapping, so you do not ask for coordinates.",
    fields: [
      { key: "name", label: "What's the place called?", type: "text", required: true },
      { key: "type", label: "What kind of place is it?", type: "enum", required: true, enumValues: MAP_TYPES, guidance: "Map their description to one of the allowed kinds. A hot or cold spring is spring, a swimming hole is lake, free camping is boondock, an events site is event_venue." },
      { key: "description", label: "Tell me about it. What makes it worth a stop?", type: "longtext" },
      { key: "accessNotes", label: "Anything a crew should know to get there? Road, gate, rig size?", type: "longtext" },
    ],
  },
};

/**
 * Truthy string values the model returns for a boolean field. Commitments only
 * count when the value is an explicit yes; anything unclear stays false so a
 * commitment is never inferred (AI-AUTOMATION-RISKS). The turn prompt tells the
 * model to normalize a yes/no field to "yes" or "no".
 */
export function companionBool(value: string): boolean {
  return /^(yes|yeah|yep|yup|true|y|1|agreed?|i (do|will|commit)|absolutely|of course|sure)\b/i.test(value.trim());
}
