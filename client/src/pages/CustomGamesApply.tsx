/**
 * Custom Games application (Workstream C of CUSTOM_GAMES_MASTER_PLAN.md).
 * Route: /custom-games/apply
 *
 * Chat-first intake: Sylva, ReGen's Game Guide, designs the applicant's game
 * with them by voice or chat (FormCompanion + the custom-game-application form
 * spec in shared/companions.ts). Every answer streams into the visible form
 * below, drafts autosave to localStorage, and the person reviews and submits
 * themselves. Sylva never submits (AI-AUTOMATION-RISKS).
 *
 * On submit the answers are folded into a blueprint.json v0.3 draft
 * (shared/customGameBlueprint.ts) plus the full transcript, and stored via the
 * customGameApplications router. No account required: this is a sales intake,
 * like the waitlist form beside it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { PageWrapper } from "@/components/PageWrapper";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormCompanion } from "@/components/companion";
import { trpc } from "@/lib/trpc";
import { analytics } from "@/lib/analytics";
import { companionBool } from "@shared/companions";
import { BLUEPRINT_VERSION, type BlueprintDraft } from "@shared/customGameBlueprint";
import { ArrowRight, CheckCircle2, Loader2, Sprout } from "lucide-react";

// ── Form state ────────────────────────────────────────────────────────────────

type FormData = {
  // 1. Who are you
  applicantRole: "founder" | "investor" | "core-team" | "";
  applicantName: string;
  applicantEmail: string;
  investorGoals: string;
  // 2. Project identity
  projectName: string;
  location: string;
  landStatus: "owned" | "leased" | "committed" | "seeking" | "";
  acreage: number | null;
  stage: string;
  website: string;
  // 3. Vision + story
  vision: string;
  originStory: string;
  values: string;
  // 4. People + personas
  personasApply: string;
  memberName: string;
  communityNoun: string;
  // 5. Coordination today
  decisionsToday: string;
  moneyFlowsToday: string;
  recognitionToday: string;
  biggestPain: string;
  // 6. What the game must accomplish
  gameGoals: string;
  // 7. Economy + exchange
  currencyName: string;
  dues: string;
  rewardInstincts: string;
  exchangeTypes: string;
  // 8. Name your guide
  guideName: string;
  guideVoice: string;
  // 9. Team capacity
  adminName: string;
  teamSize: number | null;
  hoursPerWeek: number | null;
  communityExperience: string;
  technicalComfort: "low" | "medium" | "high" | "";
  // 10. Brand + materials
  brandColors: string;
  brandFonts: string;
  toneWords: string;
  materialLinks: string;
  // 11. Operations
  domain: string;
  hosting: "self-hosted" | "regen-full-service" | "";
  timelineHopes: string;
  budgetConfirmed: boolean;
  referralSource: string;
  // 12. Integrations (provider names only, never keys)
  llmProvider: string;
  emailProvider: string;
};

const INITIAL_FORM_DATA: FormData = {
  applicantRole: "",
  applicantName: "",
  applicantEmail: "",
  investorGoals: "",
  projectName: "",
  location: "",
  landStatus: "",
  acreage: null,
  stage: "",
  website: "",
  vision: "",
  originStory: "",
  values: "",
  personasApply: "",
  memberName: "",
  communityNoun: "",
  decisionsToday: "",
  moneyFlowsToday: "",
  recognitionToday: "",
  biggestPain: "",
  gameGoals: "",
  currencyName: "",
  dues: "",
  rewardInstincts: "",
  exchangeTypes: "",
  guideName: "",
  guideVoice: "",
  adminName: "",
  teamSize: null,
  hoursPerWeek: null,
  communityExperience: "",
  technicalComfort: "",
  brandColors: "",
  brandFonts: "",
  toneWords: "",
  materialLinks: "",
  domain: "",
  hosting: "",
  timelineHopes: "",
  budgetConfirmed: false,
  referralSource: "",
  llmProvider: "",
  emailProvider: "",
};

const LS_KEY = "regen_custom_game_draft";

function loadDraft(): Partial<FormData> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * True once the applicant has actually put something in. Every field in
 * INITIAL_FORM_DATA is "", null, or false, so an untouched form is all-empty.
 * Without this the autosave persists a blank draft on mount and every later
 * visit greets a first-time applicant with "Draft restored from your last
 * session."
 */
function hasAnyContent(data: Partial<FormData>): boolean {
  return Object.values(data).some((v) => v !== "" && v !== null && v !== false && v !== undefined);
}

type CompanionTurn = { role: "user" | "assistant"; content: string };

// ── Declarative section layout (mirrors the 12 intake sections) ──────────────

type FieldDef = {
  key: keyof FormData;
  label: string;
  kind: "text" | "longtext" | "number" | "select" | "checkbox";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  hint?: string;
  required?: boolean;
};

const SECTIONS: Array<{ title: string; intro?: string; fields: FieldDef[] }> = [
  {
    title: "Who are you",
    fields: [
      {
        key: "applicantRole", label: "Your role", kind: "select", required: true,
        options: [
          { value: "founder", label: "Founder" },
          { value: "investor", label: "Investor" },
          { value: "core-team", label: "Core team" },
        ],
      },
      { key: "applicantName", label: "Your name", kind: "text", required: true, placeholder: "Full name" },
      { key: "applicantEmail", label: "Email", kind: "text", required: true, placeholder: "you@example.com" },
      { key: "investorGoals", label: "If you're investing: what does success for your capital look like?", kind: "longtext", placeholder: "What your capital needs to produce, and what reporting or visibility you want" },
    ],
  },
  {
    title: "Project identity",
    fields: [
      { key: "projectName", label: "Project name", kind: "text", required: true },
      { key: "location", label: "Location", kind: "text", required: true, placeholder: "Region, country" },
      {
        key: "landStatus", label: "Land status", kind: "select", required: true,
        options: [
          { value: "owned", label: "Owned" },
          { value: "leased", label: "Leased" },
          { value: "committed", label: "Committed" },
          { value: "seeking", label: "Seeking" },
        ],
      },
      { key: "acreage", label: "Acreage", kind: "number", placeholder: "e.g. 40" },
      { key: "stage", label: "Project stage", kind: "text", placeholder: "Forming, building, people living there..." },
      { key: "website", label: "Website", kind: "text", placeholder: "https://yourproject.org" },
    ],
  },
  {
    title: "Vision and story",
    fields: [
      { key: "vision", label: "The big vision", kind: "longtext", required: true, placeholder: "What does this place become?" },
      { key: "originStory", label: "Origin story", kind: "longtext", placeholder: "How did this project begin? Your game gets written from stories like this." },
      { key: "values", label: "Core values", kind: "longtext", placeholder: "The values your community holds at its center" },
    ],
  },
  {
    title: "People and personas",
    intro: "Games usually guide four kinds of people: residents, business builders, core team, and investors.",
    fields: [
      { key: "personasApply", label: "Which personas live in your project?", kind: "longtext", required: true, placeholder: "Residents, business builders, core team, investors, or your own kinds. Rough counts help." },
      { key: "memberName", label: "What do you call your members?", kind: "text", placeholder: "Amora calls theirs Amoracitas" },
      { key: "communityNoun", label: "What word fits your place?", kind: "text", placeholder: "Village, sanctuary, farm..." },
    ],
  },
  {
    title: "Coordination today",
    intro: "The honest picture. Your game's quests get designed from what hurts.",
    fields: [
      { key: "decisionsToday", label: "How do decisions get made today?", kind: "longtext", required: true },
      { key: "moneyFlowsToday", label: "How does money flow through the project?", kind: "longtext" },
      { key: "recognitionToday", label: "How does contribution get recognized?", kind: "longtext" },
      { key: "biggestPain", label: "What hurts most about coordination right now?", kind: "longtext", required: true },
    ],
  },
  {
    title: "What the game must accomplish",
    fields: [
      { key: "gameGoals", label: "Rank what matters most", kind: "longtext", required: true, placeholder: "Governance, economics and tokenomics, legal structure, onboarding, contribution and recognition, resource transparency. In your order." },
    ],
  },
  {
    title: "Economy and exchange",
    fields: [
      { key: "currencyName", label: "Your currency's name", kind: "text", placeholder: "Amora calls theirs Gratitude" },
      { key: "dues", label: "Dues, rents, or regular contributions", kind: "longtext" },
      { key: "rewardInstincts", label: "When someone contributes, what feels right as the reward?", kind: "longtext", placeholder: "Recognition, currency, standing, access..." },
      { key: "exchangeTypes", label: "Kinds of exchange your community uses or wants", kind: "longtext", placeholder: "Cash, tokens, work trade, joint ventures, agreements, your own kinds" },
    ],
  },
  {
    title: "Name your guide",
    intro: "Every custom game gets a guide like Sylva, with its own name and voice.",
    fields: [
      { key: "guideName", label: "Your guide's name", kind: "text", required: true },
      { key: "guideVoice", label: "How should your guide sound?", kind: "longtext", placeholder: "Warm, playful, elder, practical..." },
    ],
  },
  {
    title: "Team capacity",
    intro: "This drives the honest 3 to 6 month delivery estimate.",
    fields: [
      { key: "adminName", label: "Who will run the game day to day?", kind: "text" },
      { key: "teamSize", label: "Core team size", kind: "number" },
      { key: "hoursPerWeek", label: "Team hours per week for the build", kind: "number", required: true },
      { key: "communityExperience", label: "Experience running a community", kind: "longtext" },
      {
        key: "technicalComfort", label: "Technical comfort", kind: "select",
        options: [
          { value: "low", label: "Low: handle everything for us" },
          { value: "medium", label: "Medium: we can run web tools" },
          { value: "high", label: "High: we have builders" },
        ],
      },
    ],
  },
  {
    title: "Brand and materials",
    fields: [
      { key: "brandColors", label: "Colors", kind: "text", placeholder: "Name them or describe the palette" },
      { key: "brandFonts", label: "Fonts or visual style", kind: "text" },
      { key: "toneWords", label: "Three or four words for how the game should feel", kind: "text" },
      { key: "materialLinks", label: "Links to existing materials", kind: "longtext", hint: "Vision docs, master plans, photos, logo. Paste links; we draw from them so you never retype your life's work. File uploads come later in the process.", placeholder: "https://..." },
    ],
  },
  {
    title: "Operations",
    fields: [
      { key: "domain", label: "Domain for your game", kind: "text", placeholder: "game.yourproject.org" },
      {
        key: "hosting", label: "Hosting", kind: "select", required: true,
        options: [
          { value: "self-hosted", label: "Self hosted: our accounts, our servers, we own the ops" },
          { value: "regen-full-service", label: "Full service: ReGen Civics runs it, one fixed monthly price" },
        ],
        hint: "Either way you own the game completely: code, data, keys.",
      },
      { key: "timelineHopes", label: "When are you hoping to be live?", kind: "text" },
      { key: "budgetConfirmed", label: "I understand a custom game is a $20,000 investment, paid in milestones: half at kickoff, a quarter at first playable draft, a quarter at handoff.", kind: "checkbox", required: true },
      { key: "referralSource", label: "How did you find us?", kind: "text" },
    ],
  },
  {
    title: "Integrations",
    intro: "Provider names only. Keys get entered into your own game after handoff and never touch our systems.",
    fields: [
      { key: "llmProvider", label: "Preferred AI provider", kind: "text", placeholder: "Anthropic, OpenAI..." },
      { key: "emailProvider", label: "Preferred email provider", kind: "text", placeholder: "Resend, Postmark..." },
    ],
  },
];

/** Required fields, for the live progress chips and the submit gate. */
const REQUIRED_FIELDS: Array<{ key: keyof FormData; label: string }> = [
  { key: "applicantRole", label: "Role" },
  { key: "applicantName", label: "Name" },
  { key: "applicantEmail", label: "Email" },
  { key: "projectName", label: "Project" },
  { key: "location", label: "Location" },
  { key: "landStatus", label: "Land status" },
  { key: "vision", label: "Vision" },
  { key: "personasApply", label: "Personas" },
  { key: "decisionsToday", label: "Decisions today" },
  { key: "biggestPain", label: "Biggest pain" },
  { key: "gameGoals", label: "Game goals" },
  { key: "guideName", label: "Guide name" },
  { key: "hoursPerWeek", label: "Team hours" },
  { key: "hosting", label: "Hosting" },
  { key: "budgetConfirmed", label: "Budget" },
];

/** Every key Sylva's conversation can fill (matches the form spec in shared/companions.ts). */
const SYLVA_FIELD_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

/** Trusted grounding so Sylva can answer product questions with real facts. */
const SYLVA_CONTEXT = [
  "This is the Custom Games application on regencivics.earth. A land project gets its own coordination game: a web app on their domain, in their brand, holding their data, guiding their personas through journeys.",
  "Facts you can share if asked: the investment is $20,000, paid in milestones (50% kickoff, 25% first playable draft, 25% handoff). They own the finished game completely: code, data, keys, no subscription required.",
  "Delivery takes 3 to 6 months depending on their team's availability; a firm estimate comes at contract. Optional full service: ReGen Civics runs hosting and AI credits for one fixed monthly price scoped at contract.",
  "After they submit: we review, then an intro call, then they receive their Blueprint doc, the rendered design of their game, and from there contract and kickoff.",
  "Amora (amora.regencivics.earth) is the first custom game and the living example.",
  "Never ask for or record API keys, passwords, or credentials. Provider names only; keys are set up inside their own game later and never touch our systems.",
].join(" ");

function isFilled(v: FormData[keyof FormData]): boolean {
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return v > 0;
  if (typeof v === "boolean") return v;
  return false;
}

// ── Blueprint assembly ────────────────────────────────────────────────────────

function splitList(text: string, maxItems: number, maxLen: number): string[] {
  return text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((s) => s.slice(0, maxLen));
}

function extractUrls(text: string): string[] {
  return (text.match(/https?:\/\/[^\s,]+/g) ?? []).slice(0, 40).map((u) => u.slice(0, 1000));
}

/** Looks like a credential rather than a provider name; never send these. */
function looksLikeKey(v: string): boolean {
  return /(sk-|sk_|pk_|api[_-]?key|secret|token|bearer\s|[A-Za-z0-9_-]{40,})/i.test(v);
}

const PERSONA_MATCHERS: Array<{ id: string; label: string; re: RegExp }> = [
  { id: "resident", label: "Residents", re: /resident|villager|member|inhabitant|live here|living here/i },
  { id: "business-builder", label: "Business builders", re: /business|entrepreneur|builder|vendor|enterprise|maker/i },
  { id: "core-team", label: "Core team", re: /core team|core-team|staff|steward|organizer/i },
  { id: "investor", label: "Investors", re: /investor|capital|funder|backer/i },
];

/**
 * Fold the answers into a blueprint.json v0.3 draft. Free-text stays lossy on
 * purpose: the transcript carries the full voice, the draft carries structure.
 * Empty answers are omitted so gaps stay visible as gaps.
 */
function buildBlueprintDraft(f: FormData): BlueprintDraft {
  const draft: BlueprintDraft = { blueprintVersion: BLUEPRINT_VERSION };

  const applicant: NonNullable<BlueprintDraft["applicant"]> = {};
  if (f.applicantRole) applicant.role = f.applicantRole;
  if (f.applicantName.trim()) applicant.name = f.applicantName.trim().slice(0, 255);
  if (f.applicantEmail.trim()) applicant.email = f.applicantEmail.trim().slice(0, 255);
  if (f.investorGoals.trim()) applicant.investorGoals = f.investorGoals.trim().slice(0, 4000);
  if (Object.keys(applicant).length) draft.applicant = applicant;

  const identity: NonNullable<BlueprintDraft["identity"]> = {};
  if (f.projectName.trim()) identity.projectName = f.projectName.trim().slice(0, 255);
  if (f.location.trim()) identity.location = f.location.trim().slice(0, 255);
  if (f.landStatus) identity.landStatus = f.landStatus;
  if (f.acreage && f.acreage > 0) identity.acreage = f.acreage;
  if (f.stage.trim()) identity.stage = f.stage.trim().slice(0, 255);
  if (f.website.trim()) identity.website = f.website.trim().slice(0, 500);
  if (Object.keys(identity).length) draft.identity = identity;

  const team: NonNullable<BlueprintDraft["team"]> = {};
  if (f.adminName.trim()) team.adminName = f.adminName.trim().slice(0, 255);
  if (f.teamSize && f.teamSize > 0) team.size = Math.round(f.teamSize);
  if (f.hoursPerWeek && f.hoursPerWeek > 0) team.hoursPerWeek = f.hoursPerWeek;
  if (f.communityExperience.trim()) team.communityExperience = f.communityExperience.trim().slice(0, 4000);
  if (f.technicalComfort) team.technicalComfort = f.technicalComfort;
  if (Object.keys(team).length) draft.team = team;

  const language: NonNullable<BlueprintDraft["language"]> = {};
  if (f.memberName.trim()) language.memberName = f.memberName.trim().slice(0, 100);
  if (f.currencyName.trim()) language.currencyName = f.currencyName.trim().slice(0, 100);
  if (f.communityNoun.trim()) language.communityNoun = f.communityNoun.trim().slice(0, 100);
  if (f.guideName.trim()) language.guideName = f.guideName.trim().slice(0, 100);
  if (f.guideVoice.trim()) language.guideVoice = f.guideVoice.trim().slice(0, 2000);
  if (Object.keys(language).length) draft.language = language;

  const theme: NonNullable<BlueprintDraft["theme"]> = {};
  if (f.brandColors.trim()) theme.colors = { primary: f.brandColors.trim().slice(0, 60) };
  if (f.brandFonts.trim()) theme.fonts = { display: f.brandFonts.trim().slice(0, 120) };
  const toneWords = splitList(f.toneWords, 12, 60);
  if (toneWords.length) theme.toneWords = toneWords;
  if (Object.keys(theme).length) draft.theme = theme;

  if (f.personasApply.trim()) {
    const matched = PERSONA_MATCHERS
      .filter((m) => m.re.test(f.personasApply))
      .map((m) => ({ id: m.id, label: m.label, enabled: true }));
    draft.personas = matched.length
      ? matched
      : [{ id: "custom", label: f.personasApply.trim().slice(0, 120), enabled: true }];
  }

  const economy: NonNullable<BlueprintDraft["economy"]> = {};
  if (f.dues.trim()) economy.dues = { notes: f.dues.trim().slice(0, 500) };
  if (f.rewardInstincts.trim()) economy.rewardInstincts = f.rewardInstincts.trim().slice(0, 4000);
  const exchangeTypes = splitList(f.exchangeTypes, 24, 120);
  if (exchangeTypes.length) economy.exchangeTypes = exchangeTypes;
  if (f.applicantRole === "investor" || f.investorGoals.trim()) {
    const investor: NonNullable<NonNullable<BlueprintDraft["economy"]>["investor"]> = { enabled: true };
    if (f.investorGoals.trim()) investor.summary = { goals: f.investorGoals.trim().slice(0, 2000) };
    economy.investor = investor;
  }
  if (Object.keys(economy).length) draft.economy = economy;

  const content: NonNullable<BlueprintDraft["content"]> = {};
  if (f.vision.trim()) content.vision = f.vision.trim().slice(0, 8000);
  if (f.originStory.trim()) content.story = f.originStory.trim().slice(0, 8000);
  const values = splitList(f.values, 24, 300);
  if (values.length) content.values = values;
  const problems = [
    f.decisionsToday.trim() && `Decisions today: ${f.decisionsToday.trim()}`,
    f.moneyFlowsToday.trim() && `Money flow today: ${f.moneyFlowsToday.trim()}`,
    f.recognitionToday.trim() && `Recognition today: ${f.recognitionToday.trim()}`,
    f.biggestPain.trim() && `Biggest pain: ${f.biggestPain.trim()}`,
  ].filter((p): p is string => Boolean(p)).map((p) => p.slice(0, 2000));
  if (problems.length) content.problems = problems;
  const goals = splitList(f.gameGoals, 24, 300);
  if (goals.length) content.goals = goals;
  if (Object.keys(content).length) draft.content = content;

  const integrations: NonNullable<BlueprintDraft["integrations"]> = {};
  const llm = f.llmProvider.trim().slice(0, 100);
  if (llm && !looksLikeKey(llm)) integrations.llmProvider = llm;
  const email = f.emailProvider.trim().slice(0, 100);
  if (email && !looksLikeKey(email)) integrations.emailProvider = email;
  if (Object.keys(integrations).length) draft.integrations = integrations;

  const deployment: NonNullable<BlueprintDraft["deployment"]> = {};
  if (f.domain.trim()) deployment.domain = f.domain.trim().slice(0, 255);
  if (f.hosting) deployment.hosting = f.hosting;
  if (f.timelineHopes.trim()) deployment.timelineEstimate = f.timelineHopes.trim().slice(0, 255);
  deployment.budgetConfirmed = f.budgetConfirmed;
  if (f.referralSource.trim()) deployment.referralSource = f.referralSource.trim().slice(0, 255);
  draft.deployment = deployment;

  const uploads = extractUrls(f.materialLinks);
  if (uploads.length) draft.generationInputs = { uploads };

  return draft;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomGamesApply() {
  const [formData, setFormData] = useState<FormData>(() => {
    const draft = loadDraft();
    return draft ? { ...INITIAL_FORM_DATA, ...draft } : INITIAL_FORM_DATA;
  });
  const [draftRestored, setDraftRestored] = useState(() => {
    const draft = loadDraft();
    return draft !== null && hasAnyContent(draft);
  });
  const [mode, setMode] = useState<"talk" | "review">("talk");
  const [fromSylva, setFromSylva] = useState(false);
  const [transcript, setTranscript] = useState<CompanionTurn[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // If the companion is not configured (no LLM key), the plain form leads.
  const companionFlags = trpc.companion.flags.useQuery(undefined, { staleTime: 60_000 });
  useEffect(() => {
    if (companionFlags.data && !companionFlags.data.companion) setMode("review");
  }, [companionFlags.data]);

  const submitMutation = trpc.customGameApplications.submit.useMutation();

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Autosave to localStorage (debounced 800ms), same pattern as /apply.
  const lsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (lsTimerRef.current) clearTimeout(lsTimerRef.current);
    lsTimerRef.current = setTimeout(() => {
      try {
        // Only persist a draft that holds something. Clearing every field also
        // clears the draft, so a wiped form does not come back on the next visit.
        if (hasAnyContent(formData)) localStorage.setItem(LS_KEY, JSON.stringify(formData));
        else localStorage.removeItem(LS_KEY);
      } catch { /* quota; ignore */ }
    }, 800);
    return () => { if (lsTimerRef.current) clearTimeout(lsTimerRef.current); };
  }, [formData]);

  /** Values the conversation already holds, so Sylva never re-asks. */
  const companionCollected = useMemo(() => {
    const out: Record<string, string> = {};
    for (const key of SYLVA_FIELD_KEYS) {
      const v = formData[key];
      if (typeof v === "string" && v.trim()) out[key] = v;
      else if (typeof v === "number" && v > 0) out[key] = String(v);
      else if (typeof v === "boolean" && v) out[key] = "yes";
    }
    return out;
  }, [formData]);

  const filledCount = REQUIRED_FIELDS.filter(({ key }) => isFilled(formData[key])).length;

  /** Map a value Sylva heard into typed form state. Enums normalized, numbers
   *  parsed, commitments only on an explicit yes, unknown keys ignored. */
  const handleSylvaField = useCallback((key: string, value: string) => {
    const v = value.trim();
    if (!v) return;
    switch (key) {
      case "applicantRole": {
        const low = v.toLowerCase();
        if (low.includes("found")) updateField("applicantRole", "founder");
        else if (low.includes("invest")) updateField("applicantRole", "investor");
        else if (low.includes("core") || low.includes("team")) updateField("applicantRole", "core-team");
        return;
      }
      case "landStatus": {
        const low = v.toLowerCase();
        const match = (["owned", "leased", "committed", "seeking"] as const).find((s) => low.includes(s.slice(0, 4)));
        if (match) updateField("landStatus", match);
        return;
      }
      case "technicalComfort": {
        const low = v.toLowerCase();
        const match = (["low", "medium", "high"] as const).find((s) => low.includes(s));
        if (match) updateField("technicalComfort", match);
        return;
      }
      case "hosting": {
        const low = v.toLowerCase();
        if (low.includes("self")) updateField("hosting", "self-hosted");
        else if (low.includes("full") || low.includes("regen") || low.includes("service")) updateField("hosting", "regen-full-service");
        return;
      }
      case "acreage": case "hoursPerWeek": {
        const n = parseFloat(v);
        if (Number.isFinite(n) && n > 0) updateField(key as keyof FormData, n);
        return;
      }
      case "teamSize": {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n > 0) updateField("teamSize", n);
        return;
      }
      case "budgetConfirmed": {
        // Only an explicit yes counts; never inferred (AI-AUTOMATION-RISKS).
        if (companionBool(v)) updateField("budgetConfirmed", true);
        return;
      }
      default: {
        if ((SYLVA_FIELD_KEYS as string[]).includes(key)) updateField(key as keyof FormData, v);
      }
    }
  }, []);

  const goToReview = useCallback((viaSylva: boolean) => {
    setFromSylva(viaSylva);
    setMode("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubmit = async () => {
    setSubmitError(null);
    const missing = REQUIRED_FIELDS.filter(({ key }) => !isFilled(formData[key]));
    if (missing.length > 0) {
      setSubmitError(`Still needed: ${missing.map((m) => m.label).join(", ")}.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicantEmail.trim())) {
      setSubmitError("That email doesn't look right. Check it and try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    try {
      await submitMutation.mutateAsync({
        applicantName: formData.applicantName.trim(),
        applicantEmail: formData.applicantEmail.trim(),
        applicantRole: formData.applicantRole as "founder" | "investor" | "core-team",
        projectName: formData.projectName.trim(),
        budgetConfirmed: formData.budgetConfirmed,
        blueprintDraft: buildBlueprintDraft(formData),
        transcript: transcript.slice(-80).map((t) => ({ ...t, content: t.content.slice(0, 4000) })),
      });
      analytics.ctaClick("custom_games_application_submitted", "/custom-games/apply");
      try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setSubmitError(err?.message || "Submission failed. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ── Success state ───────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <PageWrapper>
        <SEO
          title="Application Received: Custom Games"
          description="Your custom game application is in. We review, set an intro call, and send your Blueprint doc."
          url="/custom-games/apply"
          noIndex
        />
        <div className="min-h-screen bg-[#f0ebe3] py-16 px-4">
          <div className="container max-w-2xl">
            <Card className="p-8 sm:p-10 bg-white text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#7dd87d]/20 flex items-center justify-center mb-4">
                <Sprout className="w-7 h-7 text-[#2f5d3a]" />
              </div>
              <h1 className="text-3xl font-bold text-[#1a472a] mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Your game design is in
              </h1>
              <p className="text-[#1a472a]/80 leading-relaxed mb-6">
                Thank you{formData.applicantName ? `, ${formData.applicantName.split(" ")[0]}` : ""}. Here's what happens next.
              </p>
              <ol className="text-left space-y-4 mb-8">
                <li className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#1a472a] text-white text-sm font-bold flex items-center justify-center">1</span>
                  <p className="text-[#1a472a]/90 text-sm leading-relaxed"><strong>We review your design.</strong> We read the whole conversation, so nothing you told Sylva gets lost.</p>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#1a472a] text-white text-sm font-bold flex items-center justify-center">2</span>
                  <p className="text-[#1a472a]/90 text-sm leading-relaxed"><strong>Intro call.</strong> We reach out at {formData.applicantEmail || "your email"} to set a call and meet the people behind the project.</p>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[#1a472a] text-white text-sm font-bold flex items-center justify-center">3</span>
                  <p className="text-[#1a472a]/90 text-sm leading-relaxed"><strong>Your Blueprint doc.</strong> The rendered design of your game: personas, journeys, economy, your guide. From there, contract and kickoff.</p>
                </li>
              </ol>
              <Link href="/custom-games">
                <Button className="bg-[#1a472a] hover:bg-[#2f5d3a] text-white">Back to Custom Games</Button>
              </Link>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const isLoading = submitMutation.isPending;

  return (
    <PageWrapper>
      <SEO
        title="Design Your Game: Custom Games Application"
        description="Talk your land project's coordination game into being with Sylva, ReGen's Game Guide. About 20 minutes, voice or chat."
        url="/custom-games/apply"
      />
      <div className="min-h-screen bg-[#f0ebe3] py-12">
        <BackButton />
        <div className="container max-w-4xl min-w-0">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#1a472a] mb-2" style={{ fontFamily: "var(--font-display)" }}>
              Design your game
            </h1>
            <p className="text-[#1a472a]/80 max-w-2xl mx-auto">
              About 20 minutes with Sylva, ReGen's Game Guide. This talk is the raw material
              your game gets built from, and it's also a taste of the guide your community will get.
            </p>
          </div>

          {/* Chat-first: Sylva leads; the form below is the live record. */}
          {mode === "talk" && (
            <Card className="p-6 sm:p-8 bg-white apply-form-dark mb-8">
              {draftRestored && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#4a7c59]/30 bg-[#f0f7f0] px-4 py-3 text-sm text-[#1a472a]">
                  <span>Draft restored from your last session. Sylva can pick up where you left off.</span>
                  <button
                    type="button"
                    className="text-xs underline opacity-70 hover:opacity-100"
                    onClick={() => {
                      setFormData(INITIAL_FORM_DATA);
                      try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
                      setDraftRestored(false);
                    }}
                  >
                    Clear &amp; start over
                  </button>
                </div>
              )}

              <FormCompanion
                formId="custom-game-application"
                context={SYLVA_CONTEXT}
                collected={companionCollected}
                onField={handleSylvaField}
                onTranscript={setTranscript}
                onReadyForReview={() => goToReview(true)}
              />

              {/* Live progress: what she has written down so far. */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-[#1a472a]">What she's written down</p>
                  <span className="text-xs text-[#1a472a]/70">{filledCount} of {REQUIRED_FIELDS.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {REQUIRED_FIELDS.map(({ key, label }) => {
                    const filled = isFilled(formData[key]);
                    return (
                      <span
                        key={key}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                          filled
                            ? "border-[#7dd87d] bg-[#7dd87d]/15 text-[#1a472a]"
                            : "border-[#1a472a]/15 text-[#1a472a]/50"
                        }`}
                      >
                        {filled && <CheckCircle2 className="w-3 h-3 text-[#4a7c59]" />}
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 pt-5 border-t border-[#1a472a]/10">
                <Button
                  onClick={() => goToReview(filledCount > 0)}
                  className="bg-[#7dd87d] hover:bg-[#9de89d] text-[#1a472a] font-semibold"
                >
                  Review and submit
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <button
                  type="button"
                  onClick={() => { setFromSylva(false); setMode("review"); }}
                  className="text-sm text-[#4a7c59] underline underline-offset-2 hover:text-[#1a472a]"
                >
                  I'd rather fill out the form myself
                </button>
              </div>
            </Card>
          )}

          {mode === "review" && fromSylva && (
            <div className="mb-6 rounded-lg border-2 border-[#7dd87d]/60 bg-[#f0f7f0] px-4 py-3 text-sm text-[#1a472a]">
              Sylva wrote this down with you. Look everything over, fix anything she misheard,
              then submit at the bottom. Nothing sends until you send it.
            </div>
          )}

          {mode === "review" && companionFlags.data?.companion !== false && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setMode("talk")}
                className="text-sm text-[#4a7c59] underline underline-offset-2 hover:text-[#1a472a]"
              >
                Talk it out with Sylva instead
              </button>
            </div>
          )}

          {/* The full design, all 12 sections on one page. */}
          {mode === "review" && (
            <Card className="p-6 sm:p-8 bg-white apply-form-dark">
              {draftRestored && !fromSylva && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#4a7c59]/30 bg-[#f0f7f0] px-4 py-3 text-sm text-[#1a472a]">
                  <span>Draft restored from your last session.</span>
                  <button
                    type="button"
                    className="text-xs underline opacity-70 hover:opacity-100"
                    onClick={() => {
                      setFormData(INITIAL_FORM_DATA);
                      try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
                      setDraftRestored(false);
                    }}
                  >
                    Clear &amp; start over
                  </button>
                </div>
              )}

              {submitError && (
                <div className="mb-6 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <div className="space-y-10">
                {SECTIONS.map((section, si) => (
                  <section key={section.title}>
                    <h2 className="text-xl font-bold text-[#1a472a] mb-1" style={{ fontFamily: "var(--font-display)" }}>
                      {si + 1}. {section.title}
                    </h2>
                    {section.intro && (
                      <p className="text-sm text-[#1a472a]/70 mb-4">{section.intro}</p>
                    )}
                    <div className="space-y-5 mt-4">
                      {section.fields.map((field) => {
                        const value = formData[field.key];
                        if (field.kind === "checkbox") {
                          return (
                            <label key={field.key} className="flex items-start gap-3 cursor-pointer rounded-lg border border-[#1a472a]/15 bg-[#f8f5f0] p-4">
                              <input
                                type="checkbox"
                                checked={Boolean(value)}
                                onChange={(e) => updateField(field.key, e.target.checked)}
                                className="mt-0.5 w-4 h-4 accent-[#4a7c59]"
                              />
                              <span className="text-sm text-[#1a472a] leading-relaxed">
                                {field.label} {field.required && "*"}
                              </span>
                            </label>
                          );
                        }
                        if (field.kind === "select") {
                          return (
                            <div key={field.key}>
                              <Label htmlFor={field.key}>{field.label}{field.required ? " *" : ""}</Label>
                              <Select
                                value={String(value ?? "")}
                                onValueChange={(v) => updateField(field.key, v)}
                              >
                                <SelectTrigger id={field.key} className="mt-1">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(field.options ?? []).map((o) => (
                                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {field.hint && <p className="text-xs text-[#1a472a]/70 mt-1">{field.hint}</p>}
                            </div>
                          );
                        }
                        if (field.kind === "number") {
                          return (
                            <div key={field.key}>
                              <Label htmlFor={field.key}>{field.label}{field.required ? " *" : ""}</Label>
                              <Input
                                id={field.key}
                                type="number"
                                min="0"
                                value={typeof value === "number" ? value : ""}
                                onChange={(e) => updateField(field.key, e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder={field.placeholder}
                                className="mt-1"
                              />
                              {field.hint && <p className="text-xs text-[#1a472a]/70 mt-1">{field.hint}</p>}
                            </div>
                          );
                        }
                        if (field.kind === "longtext") {
                          return (
                            <div key={field.key}>
                              <Label htmlFor={field.key}>{field.label}{field.required ? " *" : ""}</Label>
                              <Textarea
                                id={field.key}
                                value={String(value ?? "")}
                                onChange={(e) => updateField(field.key, e.target.value)}
                                placeholder={field.placeholder}
                                rows={4}
                                className="mt-1"
                              />
                              {field.hint && <p className="text-xs text-[#1a472a]/70 mt-1">{field.hint}</p>}
                            </div>
                          );
                        }
                        return (
                          <div key={field.key}>
                            <Label htmlFor={field.key}>{field.label}{field.required ? " *" : ""}</Label>
                            <Input
                              id={field.key}
                              value={String(value ?? "")}
                              onChange={(e) => updateField(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="mt-1"
                            />
                            {field.hint && <p className="text-xs text-[#1a472a]/70 mt-1">{field.hint}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-10 pt-6 border-t border-[#1a472a]/10">
                <div className="bg-[#f0f7f0] border-2 border-[#7dd87d]/50 rounded-lg p-4 mb-6">
                  <p className="text-[#1a472a] font-medium mb-1">Ready to send it?</p>
                  <p className="text-[#1a472a]/80 text-sm leading-relaxed">
                    Submitting starts the review. We read everything, reach out for an intro call,
                    and you receive your Blueprint doc, the rendered design of your game. No payment
                    happens until contract.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <span className="text-xs text-[#1a472a]/60">
                    {filledCount} of {REQUIRED_FIELDS.length} required answers in place
                  </span>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-[#ffd700] to-[#7dd87d] hover:from-[#ffed4e] hover:to-[#9de89d] text-[#1a472a] font-semibold"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Submit my game design
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
