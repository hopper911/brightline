/**
 * Minimal structured logging for API / automation. Avoid PII and secrets in production output.
 */

type Level = "info" | "warn" | "error";

const SENSITIVE_KEY = /^(authorization|cookie|set-cookie|x-api-key|password|accessToken|access_token|code|token|secret|apikey)$/i;

function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEY.test(k)) {
      out[k] = "[redacted]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redactMeta(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function apiLog(scope: string, level: Level, message: string, meta?: Record<string, unknown>) {
  const safe = meta ? redactMeta(meta) : undefined;
  const payload = safe ? { scope, message, ...safe } : { scope, message };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
