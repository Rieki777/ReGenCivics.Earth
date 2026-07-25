import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
  /**
   * Optional image URLs attached to this message (user turns only). Each becomes
   * an image block ahead of the text, so vision-capable models actually see the
   * picture. URLs must be publicly reachable (our R2 asset domain qualifies);
   * callers are responsible for only passing our own asset URLs.
   */
  imageUrls?: string[];
};

/**
 * Task tiers for cheapest-model-for-the-job routing (ADR-43). Call sites tag
 * each call with the kind of work it is; the OpenRouter path picks the least
 * expensive model that handles that tier well. Untagged calls get "standard".
 *
 * - "light": classification, routing, tagging, alt text, translation, small
 *   JSON extraction. Quality bar is modest; volume can be high.
 * - "standard": persona chat, guides, companions, writing in voice, transcript
 *   summaries, structured form turns. The default.
 * - "complex": governance synthesis, decision drafting, executive briefings.
 *   Low volume, reasoning-heavy, worth a frontier model.
 */
export type LLMTask = "light" | "standard" | "complex";

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  /** Cheapest-model routing tier; defaults to "standard". See LLMTask. */
  task?: LLMTask;
};

// OpenAI-compatible result shape maintained for backwards compatibility
export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason: string | null;
  }>;
};

// OpenRouter serves the Anthropic Messages protocol at /api/v1/messages, so the
// SDK works unchanged: baseURL swaps the host, authToken sends the OpenRouter
// key as a Bearer header (OpenRouter rejects x-api-key auth). OpenRouter is the
// PRIMARY provider (ADR-43): every call routes there with the cheapest model
// for its task tier, and first-party Anthropic is the failover.
const OPENROUTER_BASE_URL = "https://openrouter.ai/api";

// Anthropic model for the direct (failover) path. Fast and inexpensive, and it
// supports the tool-forced structured output the companion relies on. Override
// with AI_MODEL set to any bare `claude-*` id.
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

export function isLLMConfigured(): boolean {
  return Boolean(ENV.openrouterApiKey || ENV.anthropicApiKey);
}

// ── Global cost circuit-breaker ──────────────────────────────────────────────
// Site-wide daily ceilings across EVERY invokeLLM/streamLLM call, so a runaway
// feature, a retry loop, or a bot hammering a public AI surface cannot burn
// unbounded spend. This closes the "no global cost circuit-breaker" gap flagged
// in .ai/docs/security/AI-AUTOMATION-RISKS.md.
//
// Counters live in memory and reset at midnight UTC (same trade-off as the
// videoSummary rate limiter: a restart resets them, which is acceptable for a
// safety net whose ceilings are far above normal daily use). Tokens are
// estimated at ~4 chars per token on both input and output; the estimate only
// needs to be right within 2x for a ceiling to do its job.

export class LLMBudgetExceededError extends Error {
  constructor(which: "calls" | "tokens", used: number, budget: number) {
    super(
      `LLM daily ${which} budget exceeded (${used} >= ${budget}). ` +
        `Resets at midnight UTC. Raise LLM_DAILY_${which === "calls" ? "CALL" : "TOKEN"}_BUDGET if intentional.`
    );
    this.name = "LLMBudgetExceededError";
  }
}

const budget = {
  day: new Date().toISOString().slice(0, 10),
  calls: 0,
  estTokens: 0,
  trippedAt: null as string | null,
};

function rollBudgetDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (budget.day !== today) {
    budget.day = today;
    budget.calls = 0;
    budget.estTokens = 0;
    budget.trippedAt = null;
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}

/** Throws LLMBudgetExceededError when a daily ceiling is hit. Call before dispatch. */
function checkLLMBudget(inputChars: number): void {
  rollBudgetDay();
  const callCap = ENV.llmDailyCallBudget;
  const tokenCap = ENV.llmDailyTokenBudget;
  if (callCap > 0 && budget.calls >= callCap) {
    if (!budget.trippedAt) {
      budget.trippedAt = new Date().toISOString();
      console.error(`[llm] DAILY CALL BUDGET TRIPPED at ${budget.trippedAt} (${budget.calls}/${callCap})`);
    }
    throw new LLMBudgetExceededError("calls", budget.calls, callCap);
  }
  const incoming = Math.ceil(inputChars / 4);
  if (tokenCap > 0 && budget.estTokens + incoming >= tokenCap) {
    if (!budget.trippedAt) {
      budget.trippedAt = new Date().toISOString();
      console.error(`[llm] DAILY TOKEN BUDGET TRIPPED at ${budget.trippedAt} (~${budget.estTokens}/${tokenCap})`);
    }
    throw new LLMBudgetExceededError("tokens", budget.estTokens + incoming, tokenCap);
  }
}

function recordLLMUsage(inputChars: number, outputChars: number): void {
  rollBudgetDay();
  budget.calls += 1;
  budget.estTokens += Math.ceil((inputChars + outputChars) / 4);
}

/** Read-only budget snapshot for admin surfaces and tests. */
export function getLLMBudgetStatus() {
  rollBudgetDay();
  return {
    day: budget.day,
    calls: budget.calls,
    callBudget: ENV.llmDailyCallBudget,
    estTokens: budget.estTokens,
    tokenBudget: ENV.llmDailyTokenBudget,
    trippedAt: budget.trippedAt,
  };
}

/** Test-only reset. */
export function _resetLLMBudgetForTests(): void {
  budget.day = new Date().toISOString().slice(0, 10);
  budget.calls = 0;
  budget.estTokens = 0;
  budget.trippedAt = null;
}

// Exported for tests only: exercise the breaker without a network call.
export const _llmBudgetInternals = { checkLLMBudget, recordLLMUsage };

function totalInputChars(messages: Message[]): number {
  let n = 0;
  for (const m of messages) n += m.content?.length ?? 0;
  return n;
}

/**
 * Convert one of our messages to the Anthropic wire shape. Text-only messages
 * pass the string straight through; messages carrying imageUrls become a block
 * array (images first, then the text) so the model sees the pictures.
 */
function toAnthropicMessage(m: Message): { role: "user" | "assistant"; content: string | Anthropic.ContentBlockParam[] } {
  const role = m.role as "user" | "assistant";
  if (!m.imageUrls?.length) return { role, content: m.content };
  const blocks: Anthropic.ContentBlockParam[] = m.imageUrls
    .slice(0, 4)
    .map((url) => ({ type: "image" as const, source: { type: "url" as const, url } }));
  blocks.push({ type: "text" as const, text: m.content });
  return { role, content: blocks };
}

type Provider = "anthropic" | "openrouter";
interface ProviderEntry {
  provider: Provider;
  client: Anthropic;
  model: string;
}

let _anthropic: Anthropic | null = null;
let _openrouter: Anthropic | null = null;

function anthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: ENV.anthropicApiKey });
  return _anthropic;
}

function openrouterClient(): Anthropic {
  if (!_openrouter) {
    _openrouter = new Anthropic({
      // apiKey MUST be null, not merely omitted. The SDK falls back to
      // process.env.ANTHROPIC_API_KEY when apiKey is undefined and sends it as
      // an x-api-key header alongside our Bearer token. OpenRouter reads that
      // header as an Anthropic BYOK credential and pins routing to the
      // anthropic provider, so every non-Anthropic model then 404s with "No
      // allowed providers are available for the selected model"
      // (available_providers: google-vertex/google-ai-studio,
      // requested_providers: anthropic).
      //
      // That silently disabled OpenRouter for ALL THREE tiers on production:
      // light, standard and complex each 404'd and failed over to first-party
      // Anthropic, so every LLM call in the app ran on the failover model while
      // ADR-43's cheapest-model routing looked configured and did nothing. It
      // only reproduces when ANTHROPIC_API_KEY is present in the environment,
      // which is why local runs without that key never showed it.
      //
      // It also meant our Anthropic key was transmitted to OpenRouter on every
      // request. Verified 2026-07-24 by intercepting the outbound request.
      apiKey: null,
      authToken: ENV.openrouterApiKey,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": "https://regencivics.earth",
        "X-Title": "ReGen Civics",
      },
    });
  }
  return _openrouter;
}

/** Test hook: the OpenRouter client must never carry an Anthropic api key. */
export function _openrouterClientForTests(): { apiKey: unknown; authToken: unknown } {
  const c = openrouterClient() as unknown as { apiKey: unknown; authToken: unknown };
  return { apiKey: c.apiKey, authToken: c.authToken };
}

function anthropicModel(): string {
  // Bare claude-* id. Respect AI_MODEL only when it names one (AI_MODEL is often
  // "openrouter/auto", which is not valid against the first-party API).
  return ENV.aiModel.startsWith("claude-") ? ENV.aiModel : DEFAULT_ANTHROPIC_MODEL;
}

// ── Reasoning-aware plumbing (ADR-45 part 3) ─────────────────────────────────
// Reasoning/thinking models break the classic call shapes: they reject forced
// tool_choice ("tool_choice 'specified' is incompatible with thinking
// enabled"), and their reasoning tokens consume small max_tokens budgets
// before any visible text emerges. For models matching the pattern in env.ts
// we: (1) request structured output as schema-in-prompt JSON instead of a
// forced tool, (2) floor max_tokens so the answer survives the thinking,
// (3) ask OpenRouter to exclude reasoning from the returned content, and
// (4) join every text block rather than reading only the first.

/** Floor for reasoning-model calls; thinking can eat thousands of tokens. */
const REASONING_MIN_TOKENS = 4096;

/** True when this model needs the reasoning-aware call shapes. Exported for tests. */
export function isReasoningModel(model: string): boolean {
  try {
    return new RegExp(ENV.llmReasoningModelPattern, "i").test(model);
  } catch {
    return false;
  }
}

/** OpenRouter-only extra body: reason internally, return clean text blocks. */
const REASONING_BODY = { reasoning: { exclude: true } };

function joinTextBlocks(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((b): b is { type: "text"; text: string } => b.type === "text" && typeof (b as any).text === "string")
    .map((b) => b.text)
    .join("");
}

/**
 * Pull the first JSON object out of model text (reasoning models answer
 * schema-in-prompt requests as text, sometimes fenced). Returns null when
 * nothing parseable is found. Exported for tests.
 */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  // Try progressively shorter suffixes from the last closing brace inward.
  for (let end = cleaned.lastIndexOf("}"); end > start; end = cleaned.lastIndexOf("}", end - 1)) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // keep shrinking
    }
  }
  return null;
}

/**
 * Cheapest OpenRouter model that handles the tier well (ADR-43). Defaults live
 * in env.ts and are overridable per tier with LLM_MODEL_LIGHT / _STANDARD /
 * _COMPLEX Railway vars. Exported for tests.
 */
export function pickOpenRouterModel(task: LLMTask): string {
  switch (task) {
    case "light":
      return ENV.llmModelLight;
    case "complex":
      return ENV.llmModelComplex;
    default:
      return ENV.llmModelStandard;
  }
}

/**
 * The ordered provider chain (ADR-43). OpenRouter runs FIRST when its key is
 * set, with the per-task cheapest model; first-party Anthropic is the
 * automatic fallback when OpenRouter errors on credit/quota/rate limits or
 * model routing (see isFailoverError). If only one key is present, the chain
 * has a single entry.
 */
function providerChain(task: LLMTask): ProviderEntry[] {
  const chain: ProviderEntry[] = [];
  if (ENV.openrouterApiKey) {
    // Opt-in free lane for the light tier: try the $0 variant first and fall
    // through to the paid light model when the free endpoint rate-limits (429)
    // or has no allowed provider under the account's data policy. Off unless
    // LLM_MODEL_LIGHT_FREE is set (see env.ts privacy gate).
    if (task === "light" && ENV.llmModelLightFree) {
      chain.push({ provider: "openrouter", client: openrouterClient(), model: ENV.llmModelLightFree });
    }
    chain.push({ provider: "openrouter", client: openrouterClient(), model: pickOpenRouterModel(task) });
  }
  if (ENV.anthropicApiKey) {
    chain.push({ provider: "anthropic", client: anthropicClient(), model: anthropicModel() });
  }
  if (chain.length === 0) {
    throw new Error("Neither ANTHROPIC_API_KEY nor OPENROUTER_API_KEY is configured");
  }
  return chain;
}

/** Test-only view of the resolved chain (provider + model per hop). */
export function _providerChainForTests(task: LLMTask): Array<{ provider: string; model: string }> {
  return providerChain(task).map((e) => ({ provider: e.provider, model: e.model }));
}

/**
 * True when an error means the current provider is out of credits, over quota,
 * rate limited, overloaded, or cannot route the requested model, so trying the
 * next provider in the chain is worth it. Anthropic returns a 400 with a
 * "credit balance is too low" message when a workspace runs out of credits;
 * rate limits are 429 and overload is 529. With OpenRouter primary (ADR-43),
 * model-routing failures (a deprecated slug 404, or OpenRouter's "No allowed
 * providers are available for the selected model") also fail over: they took
 * every AI feature down at once on 2026-07-14, and the direct Anthropic path
 * still works when they happen. Other ordinary errors (bad request, 401) do
 * NOT fail over, so real bugs still surface. Exported for testing.
 */
export function isFailoverError(err: any): boolean {
  const status = err?.status ?? err?.statusCode;
  if (status === 402 || status === 429 || status === 529) return true;
  const msg = String(err?.error?.message ?? err?.message ?? "").toLowerCase();
  if (status === 404) return /model|provider/.test(msg);
  if (/no allowed providers|not a valid model/.test(msg)) return true;
  return /credit|billing|quota|insufficient|balance|payment required|rate limit|over.?loaded/.test(msg);
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isOverloaded = err?.status === 529 || err?.error?.type === "overloaded_error";
      if (isOverloaded && attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("withRetry: exhausted retries");
}

/**
 * Run a non-streaming request against the provider chain, failing over to the
 * next provider when the current one signals credit/quota/rate limits.
 */
async function withProviderFailover<T>(task: LLMTask, run: (entry: ProviderEntry) => Promise<T>): Promise<T> {
  const chain = providerChain(task);
  let lastErr: unknown;
  for (let i = 0; i < chain.length; i++) {
    try {
      return await withRetry(() => run(chain[i]));
    } catch (err) {
      lastErr = err;
      if (i < chain.length - 1 && isFailoverError(err)) {
        console.warn(`[llm] ${chain[i].provider} unavailable (${(err as any)?.status ?? "err"}); failing over to ${chain[i + 1].provider}`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function streamLLM(
  params: Pick<InvokeParams, "messages" | "maxTokens" | "max_tokens" | "task">,
  onChunk: (text: string) => void
): Promise<void> {
  const maxTokens = params.maxTokens ?? params.max_tokens ?? 8096;
  const inputChars = totalInputChars(params.messages);
  checkLLMBudget(inputChars);
  let outputChars = 0;

  const systemMessage = params.messages.find((m) => m.role === "system")?.content;
  const conversationMessages = params.messages
    .filter((m) => m.role !== "system")
    .map(toAnthropicMessage);

  const chain = providerChain(params.task ?? "standard");
  let lastErr: unknown;
  for (let i = 0; i < chain.length; i++) {
    const { provider, client, model } = chain[i];
    const reasoning = provider === "openrouter" && isReasoningModel(model);
    let emitted = false;
    try {
      const stream = client.messages.stream({
        model,
        max_tokens: reasoning ? Math.max(maxTokens, REASONING_MIN_TOKENS) : maxTokens,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages: conversationMessages,
        ...(reasoning ? REASONING_BODY : {}),
      } as Anthropic.MessageStreamParams);
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          emitted = true;
          outputChars += event.delta.text.length;
          onChunk(event.delta.text);
        }
      }
      recordLLMUsage(inputChars, outputChars);
      return;
    } catch (err) {
      lastErr = err;
      // Only fail over before any text reached the client. Credit/quota errors
      // happen at request time (before the first chunk), so the case we care
      // about still fails over; failing over mid-stream would double the answer.
      if (!emitted && i < chain.length - 1 && isFailoverError(err)) {
        console.warn(`[llm] stream ${provider} unavailable; failing over to ${chain[i + 1].provider}`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const {
    messages,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;
  const maxTokens = params.maxTokens ?? params.max_tokens ?? 8096;
  const inputChars = totalInputChars(messages);
  checkLLMBudget(inputChars);

  // Extract system message (Anthropic takes it as a separate param)
  const systemMessage = messages.find((m) => m.role === "system")?.content;
  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map(toAnthropicMessage);

  // Determine if structured JSON output is needed
  const schema = outputSchema ?? output_schema;
  const format = responseFormat ?? response_format;
  const jsonSchema =
    schema ??
    (format?.type === "json_schema" ? format.json_schema : undefined);

  const { responseText, usedModel } = await withProviderFailover(params.task ?? "standard", async ({ provider, client, model }) => {
    const reasoning = provider === "openrouter" && isReasoningModel(model);
    const effectiveMax = reasoning ? Math.max(maxTokens, REASONING_MIN_TOKENS) : maxTokens;
    const extraBody = reasoning ? REASONING_BODY : {};

    if (jsonSchema) {
      if (reasoning) {
        // Reasoning endpoints reject forced tool_choice, so ask for the JSON
        // in the prompt and parse it out of the text answer.
        const schemaInstruction =
          `Respond with ONLY a single JSON object that matches this JSON Schema (no prose, no code fences):\n` +
          JSON.stringify(jsonSchema.schema);
        const system = systemMessage ? `${systemMessage}\n\n${schemaInstruction}` : schemaInstruction;
        const response = await client.messages.create({
          model,
          max_tokens: effectiveMax,
          system,
          messages: conversationMessages,
          ...extraBody,
        } as Anthropic.MessageCreateParamsNonStreaming);
        const parsed = extractJsonObject(joinTextBlocks(response.content));
        if (!parsed) throw new Error("Expected a JSON object in reasoning-model structured response");
        return { responseText: JSON.stringify(parsed), usedModel: model };
      }

      // Non-reasoning models: tool forcing stays the most reliable shape.
      const tool: Anthropic.Tool = {
        name: jsonSchema.name,
        description: "Return the structured response as specified",
        input_schema: jsonSchema.schema as Anthropic.Tool["input_schema"],
      };

      const response = await client.messages.create({
        model,
        max_tokens: effectiveMax,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages: conversationMessages,
        tools: [tool],
        tool_choice: { type: "tool", name: jsonSchema.name },
      });

      const toolUse = response.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error("Expected tool_use block in structured output response");
      }
      return { responseText: JSON.stringify(toolUse.input), usedModel: model };
    }

    const response = await client.messages.create({
      model,
      max_tokens: effectiveMax,
      ...(systemMessage ? { system: systemMessage } : {}),
      messages: conversationMessages,
      ...extraBody,
    } as Anthropic.MessageCreateParamsNonStreaming);
    const text = joinTextBlocks(response.content);
    return { responseText: text, usedModel: model };
  });

  recordLLMUsage(inputChars, responseText.length);

  return {
    id: `msg_${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: usedModel,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: responseText },
        finish_reason: "stop",
      },
    ],
  };
}
