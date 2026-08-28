import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    platformJob: { groupBy: vi.fn() },
    platformAuditEvent: { groupBy: vi.fn() },
  },
}));

vi.mock("@/lib/platform/assets/read-observability", () => ({
  getAssetReadMetrics: vi.fn(() => ({
    assetReadSuccess: 10,
    assetFallbackLegacy: 2,
    assetMissing: 1,
    assetTenantMismatch: 0,
  })),
}));

import { prisma } from "@/lib/prisma";
import { getPlatformMetricsSnapshot } from "@/lib/platform/observability/metrics-snapshot";

describe("getPlatformMetricsSnapshot", () => {
  beforeEach(() => {
    vi.mocked(prisma.platformJob.groupBy).mockResolvedValue([
      { status: "COMPLETED", type: "publishing.mirotech.journal.sync", _count: { _all: 3 } },
      { status: "FAILED", type: "publishing.mirotech.journal.sync", _count: { _all: 1 } },
      { status: "PENDING", type: "health.test", _count: { _all: 2 } },
    ] as never);
    vi.mocked(prisma.platformAuditEvent.groupBy).mockResolvedValue([
      { action: "identity.sso.failed", _count: { _all: 4 } },
      { action: "identity.sso.completed", _count: { _all: 7 } },
    ] as never);
  });

  it("aggregates job and audit counts", async () => {
    const snapshot = await getPlatformMetricsSnapshot();
    expect(snapshot.jobs.completed).toBe(3);
    expect(snapshot.jobs.failed).toBe(1);
    expect(snapshot.jobs.pending).toBe(2);
    expect(snapshot.jobs.publishingCompleted).toBe(3);
    expect(snapshot.jobs.publishingFailed).toBe(1);
    expect(snapshot.audit.ssoFailed).toBe(4);
    expect(snapshot.audit.ssoCompleted).toBe(7);
    expect(snapshot.assetRead.success).toBe(10);
    expect(snapshot.assetRead.fallbackLegacy).toBe(2);
  });
});
