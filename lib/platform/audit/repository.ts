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

export type ListPlatformAuditEventsInput = {
  tenantSlugs: TenantSlug[];
  action?: string;
  actorType?: PlatformAuditActorType;
  resourceType?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  cursor?: string;
};

export type ListPlatformAuditEventsResult = {
  items: PlatformAuditEventRecord[];
  nextCursor?: string;
};

function clampAuditLimit(limit?: number): number {
  return Math.min(Math.max(limit ?? 40, 1), 100);
}

export async function findPlatformAuditEventById(
  id: string,
  client: PrismaClient = prisma
): Promise<PlatformAuditEventRecord | null> {
  const row = await client.platformAuditEvent.findUnique({ where: { id } });
  if (!row) return null;
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

/** Paginated audit listing for Studio / admin activity views. */
export async function listPlatformAuditEvents(
  input: ListPlatformAuditEventsInput,
  client: PrismaClient = prisma
): Promise<ListPlatformAuditEventsResult> {
  if (!input.tenantSlugs.length) {
    return { items: [] };
  }

  const limit = clampAuditLimit(input.limit);
  const tenantFilter =
    input.tenantSlugs.length === 1
      ? { tenantSlug: input.tenantSlugs[0] }
      : { tenantSlug: { in: input.tenantSlugs } };

  const createdAtFilter: { gte?: Date; lte?: Date } = {};
  if (input.since) createdAtFilter.gte = input.since;
  if (input.until) createdAtFilter.lte = input.until;

  const rows = await client.platformAuditEvent.findMany({
    where: {
      ...tenantFilter,
      ...(input.action?.trim() ? { action: { contains: input.action.trim(), mode: "insensitive" } } : {}),
      ...(input.actorType ? { actorType: input.actorType } : {}),
      ...(input.resourceType?.trim() ? { resourceType: input.resourceType.trim() } : {}),
      ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}),
      ...(input.cursor ? { id: { lt: input.cursor } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const slice = rows.slice(0, limit);
  const items = slice.map((row) => ({
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
  }));

  return {
    items,
    nextCursor: rows.length > limit ? slice[slice.length - 1]?.id : undefined,
  };
}
