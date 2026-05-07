import OpenAI, { APIError } from "openai";

export function requireOpenAiApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error("AI generation is not configured."), { status: 500 });
  }
  return apiKey;
}

export function createOpenAiClient(apiKey?: string): OpenAI {
  return new OpenAI({ apiKey: apiKey ?? requireOpenAiApiKey() });
}

export function resolveOpenAiChatModel(
  visionEnv = process.env.OPENAI_VISION_MODEL,
  defaultEnv = process.env.OPENAI_MODEL,
  fallback = "gpt-4o-mini"
): string {
  return (visionEnv?.trim() || defaultEnv?.trim() || fallback).trim() || fallback;
}

export type ChatCompletionBody = Parameters<OpenAI["chat"]["completions"]["create"]>[0];

/**
 * Single choke point for chat completions: normalizes OpenAI APIError into HTTP-friendly errors.
 */
export async function runChatCompletion(
  client: OpenAI,
  params: ChatCompletionBody
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await client.chat.completions.create(params);
  } catch (err: unknown) {
    if (err instanceof APIError) {
      const status = err.status === 429 ? 429 : err.status === 408 ? 504 : 502;
      const message =
        err.status === 429
          ? "Rate limited by the model provider. Try again shortly."
          : err.status === 401 || err.status === 403
            ? "Model provider rejected credentials."
            : "AI request failed.";
      throw Object.assign(new Error(message), { status });
    }
    throw err;
  }
}
