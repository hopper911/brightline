import { redactLogMeta } from "@/lib/observability/redact";
import type { LogSeverity, PlatformLogInput } from "@/lib/observability/types";

function emit(severity: LogSeverity, payload: Record<string, unknown>): void {
  const line = JSON.stringify(payload);
  if (severity === "error") console.error(line);
  else if (severity === "warn") console.warn(line);
  else if (severity === "debug" && process.env.NODE_ENV === "production") return;
  else console.log(line);
}

/**
 * Structured platform log — single JSON line per event.
 * Use for operational signals; avoid high-volume debug in production.
 */
export function platformLog(input: PlatformLogInput): void {
  const { severity, service, action, message, tenant, resourceId, requestId, jobId, meta } = input;
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    severity,
    service,
    action,
  };
  if (message) payload.message = message;
  if (tenant) payload.tenant = tenant;
  if (resourceId) payload.resourceId = resourceId;
  if (requestId) payload.requestId = requestId;
  if (jobId) payload.jobId = jobId;
  if (meta && Object.keys(meta).length) {
    Object.assign(payload, redactLogMeta(meta));
  }
  emit(severity, payload);
}
