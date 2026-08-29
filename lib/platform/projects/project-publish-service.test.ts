import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockGate = vi.fn();
const mockMedia = vi.fn();
const mockAudit = vi.fn();
const mockEnqueueBrightline = vi.fn();
const mockEnqueueHub = vi.fn();
const mockPublish = vi.fn();
const mockFinalizeSuccess = vi.fn();
const mockFinalizeFailure = vi.fn();
const mockAsync = vi.fn();
const mockPrismaFind = vi.fn();

vi.mock("@/lib/platform/projects/publish-gate", () => ({
  assertProjectPublishAllowed: (...args: unknown[]) => mockGate(...args),
}));

vi.mock("@/lib/platform/projects/validate-publish-media", () => ({
  assertProjectPublishMediaValid: (...args: unknown[]) => mockMedia(...args),
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: (...args: unknown[]) => mockAudit(...args),
}));

vi.mock("@/lib/platform/jobs/publishing-enqueue", () => ({
  enqueueBrightlineWorkProjectPublishJob: (...args: unknown[]) => mockEnqueueBrightline(...args),
  enqueueMirotechHubPatchJob: (...args: unknown[]) => mockEnqueueHub(...args),
}));

vi.mock("@/lib/platform/publishing/default-publishing-service", () => ({
  defaultPublishingService: {
    publish: (...args: unknown[]) => mockPublish(...args),
  },
}));

vi.mock("@/lib/platform/publishing/is-async-publishing-jobs", () => ({
  isPlatformPublishingJobsAsync: (...args: unknown[]) => mockAsync(...args),
}));

vi.mock("@/lib/platform/projects/finalize-project-publish", () => ({
  finalizeProjectPublishSuccess: (...args: unknown[]) => mockFinalizeSuccess(...args),
  finalizeProjectPublishFailure: (...args: unknown[]) => mockFinalizeFailure(...args),
}));

vi.mock("@/lib/platform/projects/workflow-snapshot", () => ({
  loadProjectWorkflowSnapshot: vi.fn().mockResolvedValue({
    tenant: "brightline",
    kind: "work-project",
    published: false,
    snapshot: {
      title: "Tower",
      slug: "tower",
      section: "ACD",
      summary: "Summary",
      heroKeyFull: "media/hero.webp",
    },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workProject: {
      findUnique: (...args: unknown[]) => mockPrismaFind(...args),
    },
  },
}));

import { publishApprovedProject } from "@/lib/platform/projects/project-publish-service";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { ProjectWorkflowValidationError } from "@/lib/platform/projects/errors";

describe("publishApprovedProject", () => {
  const context = createPlatformContextForTenant("brightline");
  const ref = { tenant: "brightline" as const, type: "work-project" as const, id: "wp-1" };
  const subject = { kind: "user" as const, userId: "u1" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGate.mockResolvedValue(undefined);
    mockMedia.mockResolvedValue(undefined);
    mockAudit.mockResolvedValue({ ok: true, skipped: false, id: "audit-1" });
    mockAsync.mockReturnValue(false);
    mockPrismaFind.mockResolvedValue({ slug: "tower", section: "ACD", updatedAt: new Date() });
    mockPublish.mockResolvedValue({
      outcome: "completed",
      resourceId: "wp-1",
    });
    mockFinalizeSuccess.mockResolvedValue(undefined);
  });

  it("rejects when publish gate fails", async () => {
    mockGate.mockRejectedValue(new ProjectWorkflowValidationError("Not approved."));
    await expect(publishApprovedProject(context, subject, ref)).rejects.toThrow(
      ProjectWorkflowValidationError
    );
  });

  it("sync publishes brightline work project", async () => {
    const outcome = await publishApprovedProject(context, subject, ref);
    expect(outcome.ok).toBe(true);
    expect(outcome.lifecycle).toBe("PUBLISHED");
    expect(mockPublish).toHaveBeenCalled();
    expect(mockFinalizeSuccess).toHaveBeenCalled();
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "project.publish_requested" })
    );
  });

  it("queues async brightline publish job", async () => {
    mockAsync.mockReturnValue(true);
    mockEnqueueBrightline.mockResolvedValue({ jobId: "job-1", accepted: true });
    const outcome = await publishApprovedProject(context, subject, ref);
    expect(outcome.async).toBe(true);
    expect(outcome.jobId).toBe("job-1");
    expect(outcome.lifecycle).toBe("APPROVED");
    expect(mockPublish).not.toHaveBeenCalled();
  });
});
