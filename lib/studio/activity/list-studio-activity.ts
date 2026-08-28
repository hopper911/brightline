import "server-only";

import {
  findPlatformAuditEventById,
  listPlatformAuditEvents,
} from "@/lib/platform/audit/repository";
import { sanitizeAuditMetadataForDisplay } from "@/lib/platform/audit/sanitize-metadata";
import type { PlatformAuditActorType } from "@/lib/platform/audit/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export type StudioAuditEventView = {
  id: string;
  tenantSlug: TenantSlug;
  actorType: PlatformAuditActorType;
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  succeeded: boolean | null;
};

export type StudioActivityFilters = {
  tenant?: TenantSlug | "all";
  action?: string;
  actorType?: PlatformAuditActorType;
  resourceType?: string;
  since?: string;
  until?: string;
  cursor?: string;
};

function inferSuccess(action: string, metadata: Record<string, unknown> | null): boolean | null {
  if (action.endsWith(".failed")) return false;
  if (action.endsWith(".completed") || action.endsWith(".registered")) return true;
  if (metadata && typeof metadata.error === "string" && metadata.error.trim()) return false;
  if (metadata && metadata.ok === false) return false;
  if (metadata && metadata.ok === true) return true;
  return null;
}

function toView(record: {
  id: string;
  tenantSlug: TenantSlug;
  actorType: PlatformAuditActorType;
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}): StudioAuditEventView {
  const metadata = sanitizeAuditMetadataForDisplay(record.metadata);
  return {
    id: record.id,
    tenantSlug: record.tenantSlug,
    actorType: record.actorType,
    actorId: record.actorId,
    action: record.action,
    resourceType: record.resourceType,
    resourceId: record.resourceId,
    createdAt: record.createdAt.toISOString(),
    metadata,
    succeeded: inferSuccess(record.action, metadata),
  };
}

function parseDate(raw: string | undefined): Date | undefined {
  if (!raw?.trim()) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function listStudioAuditActivity(input: {
  allowedTenants: TenantSlug[];
  filters: StudioActivityFilters;
}): Promise<{
  enabled: boolean;
  events: StudioAuditEventView[];
  nextCursor?: string;
}> {
  const enabled = isPlatformFeatureEnabled("audit");
  const tenantSlugs =
    input.filters.tenant && input.filters.tenant !== "all"
      ? input.allowedTenants.includes(input.filters.tenant)
        ? [input.filters.tenant]
        : []
      : input.allowedTenants;

  if (!tenantSlugs.length) {
    return { enabled, events: [], nextCursor: undefined };
  }

  const listed = await listPlatformAuditEvents({
    tenantSlugs,
    action: input.filters.action,
    actorType: input.filters.actorType,
    resourceType: input.filters.resourceType,
    since: parseDate(input.filters.since),
    until: parseDate(input.filters.until),
    cursor: input.filters.cursor,
    limit: 40,
  });

  return {
    enabled,
    events: listed.items.map(toView),
    nextCursor: listed.nextCursor,
  };
}

export async function getStudioAuditEventDetail(input: {
  allowedTenants: TenantSlug[];
  eventId: string;
}): Promise<StudioAuditEventView | null> {
  const record = await findPlatformAuditEventById(input.eventId.trim());
  if (!record) return null;
  if (!input.allowedTenants.includes(record.tenantSlug as TenantSlug)) return null;
  return toView({ ...record, tenantSlug: record.tenantSlug as TenantSlug });
}
