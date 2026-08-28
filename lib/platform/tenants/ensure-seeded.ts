import type { PrismaClient } from "@prisma/client";
import { TENANT_SLUGS } from "@/lib/platform/tenants/types";
import { ensurePlatformTenant } from "@/lib/platform/tenants/repository";

/**
 * Idempotent platform tenant rows (brightline, mirotech).
 * Safe to call from prisma seed; does not duplicate on re-run.
 */
export async function ensurePlatformTenants(prisma: PrismaClient): Promise<void> {
  for (const slug of TENANT_SLUGS) {
    await ensurePlatformTenant(slug, prisma);
  }
}
