import { platformLog } from "@/lib/observability/platform-log";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { insertPlatformAuditEvent } from "@/lib/platform/audit/repository";
import type {
  RecordPlatformAuditInput,
  RecordPlatformAuditResult,
} from "@/lib/platform/audit/types";
import {
  isPlatformAuditActorType,
  isValidPlatformAuditAction,
} from "@/lib/platform/audit/types";
import { findPlatformTenantBySlug } from "@/lib/platform/tenants/repository";

function logAuditFailure(action: string, message: string, tenantSlug?: string): void {
  platformLog({
    severity: "warn",
    service: "platform",
    action: "audit.record.failed",
    message,
    tenant: tenantSlug === "brightline" || tenantSlug === "mirotech" ? tenantSlug : undefined,
    meta: { auditAction: action },
  });
}

/**
 * Platform operational audit trail writer.
 * Writes are gated by PLATFORM_AUDIT_ENABLED (default off).
 * Failures are swallowed unless `strict: true`.
 */
export class PlatformAuditService {
  async record(input: RecordPlatformAuditInput): Promise<RecordPlatformAuditResult> {
    if (!isPlatformFeatureEnabled("audit")) {
      return { ok: true, skipped: true, reason: "disabled" };
    }

    const action = input.action.trim();
    if (!isValidPlatformAuditAction(action)) {
      const message = `Invalid audit action: ${action}`;
      if (input.strict) throw new Error(message);
      logAuditFailure(action, message, input.context.tenant.slug);
      return { ok: false, error: message };
    }

    const actorType = input.actor.type;
    if (!isPlatformAuditActorType(actorType)) {
      const message = `Invalid audit actor type: ${actorType}`;
      if (input.strict) throw new Error(message);
      logAuditFailure(action, message, input.context.tenant.slug);
      return { ok: false, error: message };
    }

    try {
      const tenantSlug = input.context.tenant.slug;
      const tenantRow = await findPlatformTenantBySlug(tenantSlug);

      const row = await insertPlatformAuditEvent({
        tenantId: tenantRow?.id ?? null,
        tenantSlug,
        actorType,
        actorId: input.actor.id ?? null,
        action,
        resourceType: input.resource?.type ?? null,
        resourceId: input.resource?.id ?? null,
        metadata: input.metadata ?? null,
      });

      return { ok: true, skipped: false, id: row.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown audit write error";
      if (input.strict) throw error;
      logAuditFailure(action, message, input.context.tenant.slug);
      return { ok: false, error: message };
    }
  }
}

export const platformAuditService = new PlatformAuditService();

/** Convenience alias matching migration program naming. */
export const auditService = platformAuditService;
