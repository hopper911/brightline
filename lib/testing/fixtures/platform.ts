import type { PlatformAssetRecord } from "@/lib/platform/assets/types";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import type { JobRecord } from "@/lib/platform/jobs/types";
import type { PlatformMembershipRecord, PlatformUserRecord } from "@/lib/platform/identity/types";

/** Synthetic IDs — never use production client or operator identifiers in tests. */
export const TEST_USER_ID = "test-user-0001";
export const TEST_MEMBERSHIP_ID = "test-membership-0001";
export const TEST_ASSET_ID = "test-asset-0001";
export const TEST_JOB_ID = "test-job-0001";

export function testPlatformContext(tenant: TenantSlug = "brightline") {
  return createPlatformContextForTenant(tenant);
}

export function testPlatformUser(
  overrides: Partial<PlatformUserRecord> = {}
): PlatformUserRecord {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: TEST_USER_ID,
    email: "operator@example.test",
    name: "Test Operator",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function testPlatformMembership(
  overrides: Partial<PlatformMembershipRecord> = {}
): PlatformMembershipRecord {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: TEST_MEMBERSHIP_ID,
    userId: TEST_USER_ID,
    tenantSlug: "brightline",
    role: "EDITOR",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function testPlatformAsset(
  overrides: Partial<PlatformAssetRecord> = {}
): PlatformAssetRecord {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: TEST_ASSET_ID,
    tenantId: "tenant-brightline",
    tenantSlug: "brightline",
    provider: "R2",
    vault: "brightline",
    bucket: "brightline-test",
    objectKey: "portfolio/test-fixture/photo.webp",
    filename: "photo.webp",
    mimeType: "image/webp",
    visibility: "PRIVATE",
    metadata: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function testJobRecord(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    id: TEST_JOB_ID,
    tenantSlug: "brightline",
    type: "platform.health.test",
    status: "PENDING",
    attempts: 0,
    payload: {},
    idempotencyKey: null,
    errorSummary: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    startedAt: null,
    completedAt: null,
    failedAt: null,
    ...overrides,
  };
}
