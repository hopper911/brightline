const FORBIDDEN_KEY =
  /password|secret|token|authorization|api[_-]?key|cookie|session|handoff|signed|bearer|credential/i;

const SENSITIVE_VALUE =
  /^(Bearer\s+|ho1\.|sso1\.|ps1\.|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|https?:\/\/[^\s]*[?&](X-Amz-Signature|sig|token|handoff)=)/i;

/** Redact secrets from log/telemetry metadata — never log raw tokens or signed URLs. */
export function redactLogMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (FORBIDDEN_KEY.test(key)) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redactLogMeta(value as Record<string, unknown>);
      continue;
    }
    if (typeof value === "string" && SENSITIVE_VALUE.test(value.trim())) {
      out[key] = "[REDACTED]";
      continue;
    }
    out[key] = value;
  }
  return out;
}
