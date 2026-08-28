import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTenantConfig } from "@/lib/platform/tenants/registry";
import type { TenantSlug } from "@/lib/platform/tenants/types";

/**
 * Persistent platform tenant row — identity for future FKs and audit.
 * Static TenantConfig remains the source for runtime domain/origin metadata.
 */
export type PlatformTenantRecord = {
  id: string;
  slug: TenantSlug;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function findPlatformTenantBySlug(
  slug: TenantSlug,
  client: PrismaClient = prisma
): Promise<PlatformTenantRecord | null> {
  const row = await client.platformTenant.findUnique({ where: { slug } });
  if (!row || (row.slug !== "brightline" && row.slug !== "mirotech")) return null;
  return row as PlatformTenantRecord;
}

export async function ensurePlatformTenant(
  slug: TenantSlug,
  client: PrismaClient = prisma
): Promise<PlatformTenantRecord> {
  const config = getTenantConfig(slug);
  const row = await client.platformTenant.upsert({
    where: { slug: config.slug },
    create: { slug: config.slug, name: config.displayName },
    update: { name: config.displayName },
  });
  return row as PlatformTenantRecord;
}
