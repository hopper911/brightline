import type { JobRecord } from "@/lib/platform/jobs/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import { canRetryPublishingJob, canViewStudioPublishing } from "@/lib/studio/access";
import type { StudioOpsContext, StudioOpsMembership } from "@/lib/studio/ops/types";

export function parseTenantSlugParam(raw: string | null | undefined): TenantSlug | null {
  const v = raw?.trim().toLowerCase();
  if (v === "brightline" || v === "mirotech") return v;
  return null;
}

function tenantAllowedForMemberships(
  tenant: TenantSlug,
  memberships: StudioOpsMembership[]
): boolean {
  return memberships.some((m) => m.tenantSlug === tenant);
}

/**
 * Tenant-scoped read gate for platform publishing jobs.
 * Authorizes against the job record's tenant — never a client-supplied tenant alone.
 */
export function canReadPlatformPublishingJob(
  context: StudioOpsContext,
  record: JobRecord
): boolean {
  const tenant = record.tenantSlug;
  const legacyAdmin = context.subjectKind === "legacy_admin";

  if (!tenantAllowedForMemberships(tenant, context.memberships)) {
    return false;
  }
  if (!canViewStudioPublishing(context.permissions, legacyAdmin)) {
    return false;
  }
  return canRetryPublishingJob(tenant, context.permissions, legacyAdmin);
}
