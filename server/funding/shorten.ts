/**
 * "Shorten to fit" (funding engine Phase 3, plan v1.3 section 9): an answer
 * over its portal limit comes back within the limit, with G4 and G5 re-run,
 * and nothing saves until Rye approves it.
 *
 * One light-tier call, up to three tries, each told how far over the last one
 * landed. The model is told to keep every fact and number and add nothing; the
 * code checks anyway: a proposal that states a number the draft did not is
 * marked with an error, as is any G5 phrase, retired claim, dash or leftover
 * placeholder (shared/applicationLint.mjs). The proposal is returned, never
 * stored; accepting it saves a version marked as model-written, so the record
 * of what Rye wrote and what a model shortened stays honest (plan 4.8: some
 * funders reject applications substantially written by AI).
 *
 * The input is Rye's own draft, not public text, so the prompt-injection
 * surface is the author's own words (.ai/docs/security/AI-AUTOMATION-RISKS.md).
 */
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { appQuestions } from "../../drizzle/schema";
import { invokeLLM, isLLMConfigured } from "../_core/llm";
import { charCount, extractNumbers, lintAnswer, normalizeNumber, wordCount, type LintResult } from "../../shared/applicationLint.mjs";
import { stripBannedDashes } from "@shared/funding";
import { confirmedNumbers, normalizeBody } from "./kit";
import type { getDb } from "../db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export const MAX_TRIES = 3;
/** Aim a little under the limit, so a portal that counts slightly differently still takes it. */
const TARGET_SHARE = 0.95;

export interface Limit {
  chars: number | null;
  words: number | null;
}

export function measure(text: string, limit: Limit): { used: number; max: number; unit: "characters" | "words" } {
  if (limit.chars) return { used: charCount(text), max: limit.chars, unit: "characters" };
  return { used: wordCount(text), max: limit.words ?? 0, unit: "words" };
}

export function fits(text: string, limit: Limit): boolean {
  const m = measure(text, limit);
  return m.max > 0 && m.used <= m.max;
}

/** The instructions for one try. Pure. */
export function shortenMessages(questionText: string, answer: string, limit: Limit, lastTry?: { text: string; used: number }) {
  const m = measure(answer, limit);
  const target = Math.floor(m.max * TARGET_SHARE);
  const system = [
    "You shorten one answer on a funding application so it fits the application portal's limit.",
    "Keep every fact, number, name and commitment exactly as written. Never add a claim, a number, a name or a promise that is not in the answer.",
    "Keep the author's voice: first person, plain words, short sentences. Cut repetition, qualifiers and the least important detail first.",
    "Never use an em-dash or an en-dash. Never describe returns, yield, profit, investing or an offer.",
    "Return only the shortened answer, with no preamble, quotes or notes.",
  ].join("\n");
  const user = [
    `Question: ${questionText}`,
    `Limit: ${m.max} ${m.unit}. Aim for about ${target} ${m.unit}.`,
    "",
    "Answer to shorten:",
    answer,
    ...(lastTry ? ["", `Your last version was ${lastTry.used} ${m.unit}, still over ${m.max}. Cut ${lastTry.used - target} more ${m.unit}. Your last version:`, lastTry.text] : []),
  ].join("\n");
  return { system, user };
}

/** Numbers the proposal states that the draft did not. Pure. */
export function addedNumbers(original: string, proposal: string): string[] {
  const had = new Set(extractNumbers(original).map((n) => normalizeNumber(n)).filter(Boolean));
  return extractNumbers(proposal).filter((n) => !had.has(normalizeNumber(n)));
}

function cleanReply(text: string): string {
  // Models sometimes wrap the answer in quotes or a code fence despite the instruction.
  const unfenced = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "");
  const unquoted = unfenced.trim().replace(/^"([\s\S]*)"$/, "$1");
  return normalizeBody(stripBannedDashes(unquoted));
}

export interface ShortenResult {
  alreadyFits: boolean;
  proposal: string | null;
  fits: boolean;
  tries: number;
  used: number;
  max: number;
  unit: "characters" | "words";
  lint: LintResult | null;
}

export interface ShortenDeps {
  invoke: (system: string, user: string) => Promise<string>;
}

async function defaultInvoke(system: string, user: string): Promise<string> {
  const result = await invokeLLM({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    maxTokens: 2000,
    task: "light",
  });
  return result.choices[0]?.message?.content ?? "";
}

/** Propose a version of a question's draft that fits its limit. Stores nothing. */
export async function shortenToFit(db: Db, questionId: number, deps?: Partial<ShortenDeps>): Promise<ShortenResult> {
  const [q] = await db.select().from(appQuestions).where(eq(appQuestions.id, questionId)).limit(1);
  if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
  const draft = q.answerDraft ?? "";
  const limit: Limit = { chars: q.charLimit, words: q.wordLimit };
  if (!limit.chars && !limit.words) throw new TRPCError({ code: "BAD_REQUEST", message: "This question has no limit to fit." });
  if (!draft.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "There is no draft to shorten yet." });
  const start = measure(draft, limit);
  if (fits(draft, limit)) {
    return { alreadyFits: true, proposal: null, fits: true, tries: 0, used: start.used, max: start.max, unit: start.unit, lint: null };
  }
  const invoke = deps?.invoke ?? defaultInvoke;
  if (!deps?.invoke && !isLLMConfigured()) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No LLM provider is configured, so this cannot shorten an answer." });
  }

  let best: string | null = null;
  let tries = 0;
  let last: { text: string; used: number } | undefined;
  while (tries < MAX_TRIES) {
    tries++;
    const { system, user } = shortenMessages(q.questionText, draft, limit, last);
    const proposal = cleanReply(await invoke(system, user));
    if (!proposal) continue;
    const m = measure(proposal, limit);
    if (!best || m.used < measure(best, limit).used) best = proposal;
    if (m.used <= m.max) break;
    last = { text: proposal, used: m.used };
  }
  if (!best) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The model returned nothing. Try again." });

  const lint = lintAnswer({ charLimit: q.charLimit, wordLimit: q.wordLimit }, best, await confirmedNumbers(db));
  for (const n of addedNumbers(draft, best)) lint.errors.push(`added a number that is not in your draft: ${n}`);
  const end = measure(best, limit);
  return { alreadyFits: false, proposal: best, fits: end.used <= end.max, tries, used: end.used, max: end.max, unit: end.unit, lint };
}
