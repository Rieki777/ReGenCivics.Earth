import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

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
// key as a Bearer header (OpenRouter rejects x-api-key auth).
const OPENROUTER_BASE_URL = "https://openrouter.ai/api";

// Default first-party Anthropic model for the site chat + companion + concierge.
// Fast and inexpensive, and it supports the tool-forced structured output the
// companion relies on. Override with AI_MODEL set to any bare `claude-*` id.
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

export function isLLMConfigured(): boolean {
  return Boolean(ENV.openrouterApiKey || ENV.anthropicApiKey);
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

function anthropicModel(): string {
  // Bare claude-* id. Respect AI_MODEL only when it names one (AI_MODEL is often
  // "openrouter/auto", which is not valid against the first-party API).
  return ENV.aiModel.startsWith("claude-") ? ENV.aiModel : DEFAULT_ANTHROPIC_MODEL;
}

/**
 * The ordered provider chain. First-party Anthropic runs first when its key is
 * set; OpenRouter is the automatic fallback that comes online when Anthropic
 * errors on credit/quota/rate limits (see isFailoverError). If only one key is
 * present, the chain has a single entry.
 */
function providerChain(): ProviderEntry[] {
  const chain: ProviderEntry[] = [];
  if (ENV.anthropicApiKey) {
    chain.push({ provider: "anthropic", client: anthropicClient(), model: anthropicModel() });
  }
  if (ENV.openrouterApiKey) {
    chain.push({ provider: "openrouter", client: openrouterClient(), model: ENV.openrouterModel });
  }
  if (chain.length === 0) {
    throw new Error("Neither ANTHROPIC_API_KEY nor OPENROUTER_API_KEY is configured");
  }
  return chain;
}

/**
 * True when an error means the current provider is out of credits, over quota,
 * rate limited, or overloaded, so trying the next provider in the chain is worth
 * it. Anthropic returns a 400 with a "credit balance is too low" message when a
 * workspace runs out of credits; rate limits are 429 and overload is 529.
 * Exported for testing.
 */
export function isFailoverError(err: any): boolean {
  const status = err?.status ?? err?.statusCode;
  if (status === 402 || status === 429 || status === 529) return true;
  const msg = String(err?.error?.message ?? err?.message ?? "").toLowerCase();
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
async function withProviderFailover<T>(run: (entry: ProviderEntry) => Promise<T>): Promise<T> {
  const chain = providerChain();
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
  params: Pick<InvokeParams, "messages" | "maxTokens" | "max_tokens">,
  onChunk: (text: string) => void
): Promise<void> {
  const maxTokens = params.maxTokens ?? params.max_tokens ?? 8096;

  const systemMessage = params.messages.find((m) => m.role === "system")?.content;
  const conversationMessages = params.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const chain = providerChain();
  let lastErr: unknown;
  for (let i = 0; i < chain.length; i++) {
    const { provider, client, model } = chain[i];
    let emitted = false;
    try {
      const stream = client.messages.stream({
        model,
        max_tokens: maxTokens,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages: conversationMessages,
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          emitted = true;
          onChunk(event.delta.text);
        }
      }
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

  // Extract system message (Anthropic takes it as a separate param)
  const systemMessage = messages.find((m) => m.role === "system")?.content;
  const conversationMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Determine if structured JSON output is needed
  const schema = outputSchema ?? output_schema;
  const format = responseFormat ?? response_format;
  const jsonSchema =
    schema ??
    (format?.type === "json_schema" ? format.json_schema : undefined);

  const { responseText, usedModel } = await withProviderFailover(async ({ client, model }) => {
    if (jsonSchema) {
      // Use tool forcing to get structured JSON output
      const tool: Anthropic.Tool = {
        name: jsonSchema.name,
        description: "Return the structured response as specified",
        input_schema: jsonSchema.schema as Anthropic.Tool["input_schema"],
      };

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
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
      max_tokens: maxTokens,
      ...(systemMessage ? { system: systemMessage } : {}),
      messages: conversationMessages,
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return { responseText: textBlock?.type === "text" ? textBlock.text : "", usedModel: model };
  });

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
