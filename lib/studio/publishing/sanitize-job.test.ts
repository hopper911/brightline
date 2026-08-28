import { describe, expect, it } from "vitest";
import { toStudioPublishingJobView } from "@/lib/studio/publishing/sanitize-job";
import type { JobRecord } from "@/lib/platform/jobs/types";

const baseJob: JobRecord = {
  id: "job-1",
  tenantSlug: "brightline",
  type: "publishing.mirotech.journal.sync",
  status: "FAILED",
  payload: {
    source: { tenant: "brightline", type: "blog-post", id: "post-1" },
    target: "mirotech-site",
    operation: "sync",
    result: { ok: false, error: "remote failed" },
  },
  attempts: 1,
  idempotencyKey: "k1",
  createdAt: "2024-01-01T00:00:00.000Z",
  startedAt: null,
  completedAt: null,
  failedAt: "2024-01-01T00:01:00.000Z",
  errorSummary: "remote failed",
};

describe("toStudioPublishingJobView", () => {
  it("extracts safe fields without payload secrets", () => {
    const view = toStudioPublishingJobView(baseJob);
    expect(view.source?.id).toBe("post-1");
    expect(view.target).toBe("mirotech-site");
    expect(view.result?.error).toBe("remote failed");
    expect(view.retryable).toBe(true);
    expect(JSON.stringify(view)).not.toContain("hubPatch");
  });

  it("marks non-retryable when attempts exhausted", () => {
    const view = toStudioPublishingJobView({ ...baseJob, attempts: 3 });
    expect(view.retryable).toBe(false);
  });
});
