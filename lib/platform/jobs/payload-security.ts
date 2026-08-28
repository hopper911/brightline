/**
 * Job payload security — reject secrets and unsafe values before enqueue.
 * Handlers must still treat execution as at-least-once (see ADR-008).
 */

import { JobPayloadError } from "@/lib/platform/jobs/errors";
import type { JobPayload } from "@/lib/platform/jobs/types";

const FORBIDDEN_KEY_PATTERN =
  /(?:password|passwd|secret|token|api[_-]?key|authorization|bearer|session|cookie|credential|private[_-]?key|signed[_-]?url|r2[_-]?(?:secret|key|token)|access[_-]?key)/i;

const SUSPICIOUS_VALUE_PATTERN =
  /^(?:sk_[a-z0-9_]+|Bearer\s+\S+|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)$/;

const MAX_PAYLOAD_DEPTH = 8;
const MAX_PAYLOAD_KEYS = 64;

export function assertSafeJobPayload(payload: JobPayload, path = "payload"): void {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new JobPayloadError(`${path} must be a plain object.`);
  }
  validateObject(payload as Record<string, unknown>, path, 0, { keyCount: 0 });
}

function validateObject(
  obj: Record<string, unknown>,
  path: string,
  depth: number,
  state: { keyCount: number }
): void {
  if (depth > MAX_PAYLOAD_DEPTH) {
    throw new JobPayloadError(`${path} exceeds maximum nesting depth.`);
  }

  for (const [key, value] of Object.entries(obj)) {
    state.keyCount += 1;
    if (state.keyCount > MAX_PAYLOAD_KEYS) {
      throw new JobPayloadError(`${path} exceeds maximum key count.`);
    }

    const childPath = `${path}.${key}`;
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      throw new JobPayloadError(`Forbidden key "${key}" in job payload.`);
    }

    if (typeof value === "string") {
      if (SUSPICIOUS_VALUE_PATTERN.test(value.trim())) {
        throw new JobPayloadError(`Suspicious secret-like value at ${childPath}.`);
      }
      continue;
    }

    if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean") {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        validateValue(item, `${childPath}[${index}]`, depth + 1, state);
      });
      continue;
    }

    if (typeof value === "object") {
      validateObject(value as Record<string, unknown>, childPath, depth + 1, state);
      continue;
    }

    throw new JobPayloadError(`Unsupported value type at ${childPath}.`);
  }
}

function validateValue(
  value: unknown,
  path: string,
  depth: number,
  state: { keyCount: number }
): void {
  if (typeof value === "string") {
    if (SUSPICIOUS_VALUE_PATTERN.test(value.trim())) {
      throw new JobPayloadError(`Suspicious secret-like value at ${path}.`);
    }
    return;
  }

  if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => validateValue(item, `${path}[${index}]`, depth + 1, state));
    return;
  }

  if (typeof value === "object") {
    validateObject(value as Record<string, unknown>, path, depth + 1, state);
    return;
  }

  throw new JobPayloadError(`Unsupported value type at ${path}.`);
}
