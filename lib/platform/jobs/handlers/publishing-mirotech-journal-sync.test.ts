import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: vi.fn().mockResolvedValue({ ok: true, skipped: true }),
}));

vi.mock("@/lib/platform/publishing/default-publishing-service", () => ({
  defaultPublishingService: {
    publish: vi.fn(),
  },
}));

import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { createPublishingMirotechJournalSyncHandler } from "@/lib/platform/jobs/handlers/publishing-mirotech-journal-sync";
import { publishingJobPayload } from "@/lib/platform/jobs/publishing-payload";
import { PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB } from "@/lib/platform/jobs/types";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { MemoryJobProvider } from "@/lib/platform/jobs/memory-job-provider";
import type { DefaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";

describe("publishing.mirotech.journal.sync handler", () => {
  beforeEach(() => {
    vi.mocked(recordAuditSafely).mockClear();
  });

  it("records publishing lifecycle audit events on success", async () => {
    const provider = new MemoryJobProvider();
    const publishingService = {
      publish: vi.fn().mockResolvedValue({
        outcome: "completed",
        resourceId: "journal-42",
      }),
    } as unknown as DefaultPublishingService;
    const handler = createPublishingMirotechJournalSyncHandler(publishingService, provider);
    const context = createPlatformContextForTenant("brightline");
    const job = await provider.create({
      tenantSlug: "brightline",
      type: PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB,
      status: "PENDING",
      payload: publishingJobPayload({
        source: { tenant: "brightline", type: "blog-post", id: "post-1" },
        target: "mirotech-site",
        operation: "sync",
        contentVersion: "v1",
        actor: { type: "USER" },
      }),
      attempts: 0,
      idempotencyKey: "key-1",
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      failedAt: null,
      errorSummary: null,
    });

    await handler(context, job);

    const actions = vi.mocked(recordAuditSafely).mock.calls.map((c) => c[0].action);
    expect(actions).toEqual(["publishing.started", "publishing.completed"]);
    const updated = await provider.getById(job.id);
    expect(updated?.payload.result).toMatchObject({ ok: true, resourceId: "journal-42" });
  });

  it("records publishing.failed and stores error result", async () => {
    const provider = new MemoryJobProvider();
    const publishingService = {
      publish: vi.fn().mockResolvedValue({
        outcome: "failed",
        message: "Ingest rejected",
      }),
    } as unknown as DefaultPublishingService;
    const handler = createPublishingMirotechJournalSyncHandler(publishingService, provider);
    const context = createPlatformContextForTenant("brightline");
    const job = await provider.create({
      tenantSlug: "brightline",
      type: PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB,
      status: "PENDING",
      payload: publishingJobPayload({
        source: { tenant: "brightline", type: "blog-post", id: "post-1" },
        target: "mirotech-site",
        operation: "sync",
        contentVersion: "v1",
        actor: { type: "USER" },
      }),
      attempts: 0,
      idempotencyKey: "key-2",
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      failedAt: null,
      errorSummary: null,
    });

    await expect(handler(context, job)).rejects.toThrow("Ingest rejected");
    const actions = vi.mocked(recordAuditSafely).mock.calls.map((c) => c[0].action);
    expect(actions).toContain("publishing.failed");
  });
});
