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

let _client: Anthropic | null = null;

// OpenRouter serves the Anthropic Messages protocol at /api/v1/messages, so the
// SDK works unchanged: baseURL swaps the host, authToken sends the OpenRouter
// key as a Bearer header (OpenRouter rejects x-api-key auth).
const OPENROUTER_BASE_URL = "https://openrouter.ai/api";

export function isLLMConfigured(): boolean {
  return Boolean(ENV.openrouterApiKey || ENV.anthropicApiKey);
}

function getModel(): string {
  return ENV.openrouterApiKey ? ENV.aiModel : "claude-sonnet-4-6";
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

function getClient(): Anthropic {
  if (!_client) {
    if (ENV.openrouterApiKey) {
      _client = new Anthropic({
        authToken: ENV.openrouterApiKey,
        baseURL: OPENROUTER_BASE_URL,
        defaultHeaders: {
          "HTTP-Referer": "https://regencivics.earth",
          "X-Title": "ReGen Civics",
        },
      });
    } else if (ENV.anthropicApiKey) {
      _client = new Anthropic({ apiKey: ENV.anthropicApiKey });
    } else {
      throw new Error("Neither OPENROUTER_API_KEY nor ANTHROPIC_API_KEY is configured");
    }
  }
  return _client;
}

export async function streamLLM(
  params: Pick<InvokeParams, "messages" | "maxTokens" | "max_tokens">,
  onChunk: (text: string) => void
): Promise<void> {
  const client = getClient();
  const maxTokens = params.maxTokens ?? params.max_tokens ?? 8096;

  const systemMessage = params.messages.find((m) => m.role === "system")?.content;
  const conversationMessages = params.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const stream = await withRetry(() => Promise.resolve(client.messages.stream({
    model: getModel(),
    max_tokens: maxTokens,
    ...(systemMessage ? { system: systemMessage } : {}),
    messages: conversationMessages,
  })));

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onChunk(event.delta.text);
    }
  }
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getClient();

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

  let responseText: string;

  if (jsonSchema) {
    // Use tool forcing to get structured JSON output
    const tool: Anthropic.Tool = {
      name: jsonSchema.name,
      description: "Return the structured response as specified",
      input_schema: jsonSchema.schema as Anthropic.Tool["input_schema"],
    };

    const response = await withRetry(() => client.messages.create({
      model: getModel(),
      max_tokens: maxTokens,
      ...(systemMessage ? { system: systemMessage } : {}),
      messages: conversationMessages,
      tools: [tool],
      tool_choice: { type: "tool", name: jsonSchema.name },
    }));

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Expected tool_use block in structured output response");
    }
    responseText = JSON.stringify(toolUse.input);
  } else {
    const response = await withRetry(() => client.messages.create({
      model: getModel(),
      max_tokens: maxTokens,
      ...(systemMessage ? { system: systemMessage } : {}),
      messages: conversationMessages,
    }));

    const textBlock = response.content.find((b) => b.type === "text");
    responseText = textBlock?.type === "text" ? textBlock.text : "";
  }

  return {
    id: `msg_${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: getModel(),
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: responseText },
        finish_reason: "stop",
      },
    ],
  };
}
