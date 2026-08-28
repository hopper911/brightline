import type { TenantSlug } from "@/lib/platform/tenants/types";

export type LogSeverity = "debug" | "info" | "warn" | "error";

/** Operational service namespace for structured logs. */
export type ObservabilityService =
  | "brightline"
  | "mirotech"
  | "platform"
  | "studio"
  | "identity"
  | "jobs"
  | "publishing"
  | "content"
  | "media";

export type PlatformLogInput = {
  severity: LogSeverity;
  service: ObservabilityService;
  action: string;
  message?: string;
  tenant?: TenantSlug;
  resourceId?: string;
  requestId?: string;
  jobId?: string;
  meta?: Record<string, unknown>;
};

export const CORRELATION_HEADER = "x-brightline-correlation-id";
