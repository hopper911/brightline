/**
 * Minimal structured logging for API / automation. Avoid PII and secrets in production output.
 * @deprecated Prefer platformLog — apiLog wraps it for backward compatibility.
 */
import { platformLog } from "@/lib/observability/platform-log";

type Level = "info" | "warn" | "error";

export function apiLog(scope: string, level: Level, message: string, meta?: Record<string, unknown>) {
  platformLog({
    severity: level,
    service: "platform",
    action: scope,
    message,
    meta,
  });
}
