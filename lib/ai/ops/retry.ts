import { APIError } from "openai";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetriableOpenAiError(err: unknown): boolean {
  if (err instanceof APIError) {
    const s = err.status;
    return s === 429 || s === 500 || s === 502 || s === 503 || s === 408;
  }
  return false;
}

type RetryOpts = {
  maxAttempts?: number;
  baseDelayMs?: number;
};

/**
 * Retries transient OpenAI failures (rate limits, server errors).
 */
export async function withChatRetry<T>(fn: () => Promise<T>, opts?: RetryOpts): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  const baseDelayMs = opts?.baseDelayMs ?? 400;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= maxAttempts || !isRetriableOpenAiError(err)) {
        throw err;
      }
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }
  throw lastErr;
}
