import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    platformJob: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { listPlatformPublishingJobs } from "@/lib/platform/jobs/publishing-jobs-query";

describe("listPlatformPublishingJobs", () => {
  beforeEach(() => {
    vi.mocked(prisma.platformJob.findMany).mockResolvedValue([
      {
        id: "job-2",
        tenantSlug: "brightline",
        type: "publishing.mirotech.journal.sync",
        status: "PENDING",
        payload: {},
        attempts: 0,
        idempotencyKey: null,
        errorSummary: null,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        failedAt: null,
        tenantId: null,
      },
    ] as never);
    vi.mocked(prisma.platformJob.groupBy).mockResolvedValue([
      { status: "PENDING", _count: { _all: 2 } },
      { status: "FAILED", _count: { _all: 1 } },
    ] as never);
  });

  it("filters by tenant and publishing prefix", async () => {
    const result = await listPlatformPublishingJobs({ tenantSlugs: ["brightline"] });
    expect(result.items).toHaveLength(1);
    expect(result.counts.pending).toBe(2);
    expect(result.counts.failed).toBe(1);
  });
});
