import type { PrismaClient } from "@prisma/client";
import { TENANT_REGISTRY } from "@/lib/platform/tenants/registry";
import type { TenantSlug } from "@/lib/platform/tenants/types";

/**
 * Idempotent platform tenant rows (brightline, mirotech).
 * Safe to call from prisma seed; does not duplicate on re-run.
 */
export async function ensurePlatformTenants(prisma: PrismaClient): Promise<void> {
  for (const slug of Object.keys(TENANT_REGISTRY) as TenantSlug[]) {
    const config = TENANT_REGISTRY[slug];
    await prisma.platformTenant.upsert({
      where: { slug: config.slug },
      create: { slug: config.slug, name: config.name },
      update: { name: config.name },
    });
  }
}
