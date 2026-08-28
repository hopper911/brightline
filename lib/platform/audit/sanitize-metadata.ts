import type { Prisma } from "@prisma/client";

/** Keys matching these patterns are redacted from audit metadata. */
const FORBIDDEN_METADATA_KEY =
  /password|secret|token|authorization|api[_-]?key|cookie|session|handoff|signed|bearer|credential/i;

/** Values resembling secrets or signed URLs are redacted. */
const SENSITIVE_VALUE_PATTERN =
  /^(Bearer\s+|ho1\.|sso1\.|ps1\.|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|https?:\/\/[^\s]*[?&](X-Amz-Signature|sig|token|handoff)=)/i;

function redactValue(value: unknown): unknown {
  if (typeof value === "string" && SENSITIVE_VALUE_PATTERN.test(value.trim())) {
    return "[REDACTED]";
  }
  return value;
}

function sanitizeEntry(key: string, value: unknown): unknown {
  if (FORBIDDEN_METADATA_KEY.test(key)) {
    return "[REDACTED]";
  }
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return sanitizeAuditMetadata(value as Record<string, unknown>);
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      item != null && typeof item === "object" && !Array.isArray(item)
        ? sanitizeAuditMetadata(item as Record<string, unknown>)
        : redactValue(item)
    );
  }
  return redactValue(value);
}

/**
 * Strip secrets from audit metadata before persistence.
 * Never store passwords, tokens, API keys, signed URLs, or handoff payloads.
 */
export function sanitizeAuditMetadata(
  input: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | undefined {
  if (!input || typeof input !== "object") return undefined;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = sanitizeEntry(key, value);
  }
  return out as Prisma.InputJsonValue;
}
