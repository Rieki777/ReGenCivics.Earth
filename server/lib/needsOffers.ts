/**
 * Needs and Offers matching: the pure, deterministic core (Phase B2, zero LLM).
 *
 * Rule-level matching only: shared tags + compatible bioregion. Time windows
 * are free text and ride along as context in the introduction email rather
 * than gating the match. The LLM warm-intro writer from the proposal waits
 * until volume justifies it (per the build prompt); nothing here calls a model.
 *
 * The matcher's hard guarantees, enforced by the planner + the
 * needs_offers_matches unique pair ledger:
 *   - one introduction email per (need, offer) pair, ever
 *   - a per-party daily cap on introductions
 *
 * Spec: CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md.
 */

export const INTRO_DAILY_CAP_PER_PARTY = 3;

/** Lowercase, kebab-case, deduplicated tags; the contactTags convention. */
export function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const tag = item.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9:-]/g, "");
    if (tag.length >= 2 && tag.length <= 100) out.add(tag);
  }
  return [...out];
}

export function sharedTags(a: string[], b: string[]): string[] {
  const set = new Set(a);
  return b.filter((t) => set.has(t));
}

/** Null bioregion means "anywhere"; otherwise both sides must agree. */
export function bioregionCompatible(a: number | null, b: number | null): boolean {
  return a === null || b === null || a === b;
}

export type MatchableRow = {
  id: number;
  tags: string[];
  bioregionId: number | null;
  /** The party's email, already resolved (owner's account email or contactEmail). */
  partyEmail: string | null;
};

export type PlannedMatch = {
  needId: number;
  offerId: number;
  tags: string[];
};

/**
 * Plan introductions for one run. `existingPairs` holds "needId:offerId" keys
 * already in the ledger (never re-introduced). `sentTodayByEmail` seeds the
 * per-party daily counts from matches already emailed today; the planner
 * increments as it assigns so a single run can't blow past the cap either.
 */
export function planMatches(
  needs: MatchableRow[],
  offers: MatchableRow[],
  existingPairs: Set<string>,
  sentTodayByEmail: Map<string, number>,
  dailyCap: number = INTRO_DAILY_CAP_PER_PARTY,
): PlannedMatch[] {
  const planned: PlannedMatch[] = [];
  const counts = new Map(sentTodayByEmail);
  const countOf = (email: string) => counts.get(email) ?? 0;

  for (const need of needs) {
    if (!need.partyEmail || need.tags.length === 0) continue;
    for (const offer of offers) {
      if (!offer.partyEmail || offer.tags.length === 0) continue;
      if (need.partyEmail === offer.partyEmail) continue; // never introduce someone to themselves
      if (existingPairs.has(`${need.id}:${offer.id}`)) continue;
      if (!bioregionCompatible(need.bioregionId, offer.bioregionId)) continue;
      const tags = sharedTags(need.tags, offer.tags);
      if (tags.length === 0) continue;
      if (countOf(need.partyEmail) >= dailyCap || countOf(offer.partyEmail) >= dailyCap) continue;

      planned.push({ needId: need.id, offerId: offer.id, tags });
      counts.set(need.partyEmail, countOf(need.partyEmail) + 1);
      counts.set(offer.partyEmail, countOf(offer.partyEmail) + 1);
    }
  }
  return planned;
}

// ── Introduction email copy (writing rules: STEERING.md section 1) ───────────

export type IntroEmailContext = {
  recipientName: string;
  otherName: string;
  otherEmail: string;
  needTitle: string;
  offerTitle: string;
  tags: string[];
  bioregionName: string | null;
  needTimeWindow: string | null;
  offerTimeWindow: string | null;
  boardUrl: string;
};

/** One introduction email. Clearly automated; the reply path is each other. */
export function introEmail(ctx: IntroEmailContext): { subject: string; html: string } {
  const where = ctx.bioregionName ? ` in ${ctx.bioregionName}` : "";
  const windows = [
    ctx.needTimeWindow ? `Need's time window: ${ctx.needTimeWindow}.` : null,
    ctx.offerTimeWindow ? `Offer's availability: ${ctx.offerTimeWindow}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    subject: `A match on the ReGen board: ${ctx.needTitle}`,
    html: [
      `<h2>You two should talk</h2>`,
      `<p>Hi ${esc(ctx.recipientName)},</p>`,
      `<p>The ReGen Civics needs and offers board matched a need and an offer${esc(where)}: <strong>${esc(ctx.needTitle)}</strong> met <strong>${esc(ctx.offerTitle)}</strong>, on ${esc(ctx.tags.join(", "))}.</p>`,
      `<p>This introduction is automated; the next step is human. Reach ${esc(ctx.otherName)} directly at <a href="mailto:${esc(ctx.otherEmail)}">${esc(ctx.otherEmail)}</a>.${windows ? " " + esc(windows) : ""}</p>`,
      `<p style="font-size:14px;color:#555;">Close your post on <a href="${ctx.boardUrl}">the board</a> when it's fulfilled and the matches stop.</p>`,
    ].join("\n"),
  };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
