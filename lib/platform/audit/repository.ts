import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeAuditMetadata } from "@/lib/platform/audit/sanitize-metadata";
import type {
  PlatformAuditActorType,
  PlatformAuditEventRecord,
} from "@/lib/platform/audit/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export type InsertPlatformAuditEventInput = {
  tenantId?: string | null;
  tenantSlug: TenantSlug;
  actorType: PlatformAuditActorType;
  actorId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function insertPlatformAuditEvent(
  input: InsertPlatformAuditEventInput,
  client: PrismaClient = prisma
): Promise<PlatformAuditEventRecord> {
  const row = await client.platformAuditEvent.create({
    data: {
      tenantId: input.tenantId ?? null,
      tenantSlug: input.tenantSlug,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      action: input.action,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      metadata: sanitizeAuditMetadata(input.metadata ?? undefined),
    },
  });

  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantSlug: row.tenantSlug as TenantSlug,
    actorType: row.actorType as PlatformAuditActorType,
    actorId: row.actorId,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    createdAt: row.createdAt,
  };
}
