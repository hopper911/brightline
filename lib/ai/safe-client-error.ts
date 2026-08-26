/**
 * Map provider / internal AI errors to stable client-facing messages.
 * Log the full error server-side; never return raw SDK / stack text.
 */

export type SafeAiClientError = {
  status: number;
  error: string;
  code?: string;
};

export function safeAiClientError(err: unknown, fallback = "AI generation failed."): SafeAiClientError {
  const statusFromErr =
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof (err as { status?: unknown }).status === "number"
      ? (err as { status: number }).status
      : undefined;

  const message = err instanceof Error ? err.message : "";

  if (
    statusFromErr === 401 ||
    statusFromErr === 403 ||
    /^401\b/i.test(message) ||
    /^unauthorized\.?$/i.test(message.trim())
  ) {
    return {
      status: 502,
      error:
        "OpenAI rejected the API key. Check OPENAI_API_KEY under Vercel → Settings → Environment Variables, then redeploy.",
      code: "openai_credentials",
    };
  }

  if (statusFromErr === 429 || /\brate limit/i.test(message) || /\b429\b/.test(message)) {
    return {
      status: 429,
      error: "Too many AI requests. Try again shortly.",
      code: "rate_limited",
    };
  }

  if (statusFromErr === 408 || /timed?\s*out/i.test(message)) {
    return {
      status: 504,
      error: "The AI request timed out. Try again with shorter input.",
      code: "ai_timeout",
    };
  }

  if (statusFromErr === 400 || /invalid (field|action|JSON|body|request)/i.test(message)) {
    return {
      status: 400,
      error: message && message.length < 180 ? message : "Invalid AI request.",
      code: "ai_bad_request",
    };
  }

  const status =
    statusFromErr && statusFromErr >= 400 && statusFromErr < 600 ? statusFromErr : 502;

  return {
    status: status === 401 || status === 403 ? 502 : status,
    error: fallback,
    code: "ai_unavailable",
  };
}
