import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/dual-brand/studio-hub", () => ({
  updateHubProject: vi.fn(),
  updateHubBlog: vi.fn(),
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: vi.fn().mockResolvedValue({ ok: true, skipped: true }),
}));

vi.mock("@/lib/platform/publishing/integrations/studio-hub-async-publish", () => ({
  enqueueStudioHubProjectPatchJob: vi.fn(),
  enqueueStudioHubBlogPatchJob: vi.fn(),
}));

vi.mock("@/lib/platform/projects/publish-gate", () => ({
  assertProjectPublishAllowed: vi.fn().mockResolvedValue(undefined),
}));

import { updateHubBlog, updateHubProject } from "@/lib/dual-brand/studio-hub";
import {
  enqueueStudioHubBlogPatchJob,
  enqueueStudioHubProjectPatchJob,
} from "@/lib/platform/publishing/integrations/studio-hub-async-publish";
import {
  legacyPatchStudioHubBlog,
  legacyPatchStudioHubProject,
  resolveStudioHubBlogPatch,
  resolveStudioHubProjectPatch,
} from "@/lib/platform/publishing/integrations/studio-hub-publish";
import type { DefaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";

const hubProject = { id: "hub-1", title: "Case Study", slug: "case-study" };

describe("studio hub publish integration", () => {
  const savedPublishing = process.env.PLATFORM_PUBLISHING_ENABLED;
  const savedJobs = process.env.PLATFORM_JOBS_ENABLED;

  beforeEach(() => {
    vi.mocked(updateHubProject).mockReset();
    vi.mocked(updateHubBlog).mockReset();
    vi.mocked(enqueueStudioHubProjectPatchJob).mockReset();
    vi.mocked(enqueueStudioHubBlogPatchJob).mockReset();
  });

  afterEach(() => {
    if (savedPublishing === undefined) delete process.env.PLATFORM_PUBLISHING_ENABLED;
    else process.env.PLATFORM_PUBLISHING_ENABLED = savedPublishing;
    if (savedJobs === undefined) delete process.env.PLATFORM_JOBS_ENABLED;
    else process.env.PLATFORM_JOBS_ENABLED = savedJobs;
  });

  it("legacy project patch delegates to updateHubProject", async () => {
    vi.mocked(updateHubProject).mockResolvedValue(hubProject as never);
    const result = await legacyPatchStudioHubProject("hub-1", { status: "PUBLISHED" });
    expect(updateHubProject).toHaveBeenCalledWith("hub-1", { status: "PUBLISHED" });
    expect("id" in result && result.id).toBe("hub-1");
  });

  it("resolveStudioHubProjectPatch uses legacy when flag off", async () => {
    delete process.env.PLATFORM_PUBLISHING_ENABLED;
    vi.mocked(updateHubProject).mockResolvedValue(hubProject as never);
    await resolveStudioHubProjectPatch("hub-1", { status: "PUBLISHED" });
    expect(updateHubProject).toHaveBeenCalled();
  });

  it("resolveStudioHubProjectPatch uses platform when flag on", async () => {
    process.env.PLATFORM_PUBLISHING_ENABLED = "true";
    delete process.env.PLATFORM_JOBS_ENABLED;
    const publishingService = {
      publish: vi.fn().mockResolvedValue({
        outcome: "completed",
        resourceId: "hub-1",
        hubProject: hubProject,
      }),
    } as unknown as DefaultPublishingService;

    const result = await resolveStudioHubProjectPatch(
      "hub-1",
      { status: "PUBLISHED" },
      { publishingService }
    );
    expect(publishingService.publish).toHaveBeenCalled();
    expect(updateHubProject).not.toHaveBeenCalled();
    expect("id" in result && result.id).toBe("hub-1");
  });

  it("resolveStudioHubProjectPatch uses enqueue path when publishing and jobs enabled", async () => {
    process.env.PLATFORM_PUBLISHING_ENABLED = "true";
    process.env.PLATFORM_JOBS_ENABLED = "true";
    vi.mocked(enqueueStudioHubProjectPatchJob).mockResolvedValue({
      accepted: true,
      jobId: "job-1",
    });

    const result = await resolveStudioHubProjectPatch("hub-1", { status: "PUBLISHED" });
    expect(enqueueStudioHubProjectPatchJob).toHaveBeenCalledWith("hub-1", { status: "PUBLISHED" }, {
      actor: undefined,
    });
    expect(result).toEqual({ accepted: true, jobId: "job-1" });
  });

  it("legacy blog patch delegates to updateHubBlog", async () => {
    vi.mocked(updateHubBlog).mockResolvedValue({
      post: { id: "j-1" },
      summary: { id: "j-1" },
    } as never);
    await legacyPatchStudioHubBlog("hub-1", { status: "PUBLISHED" });
    expect(updateHubBlog).toHaveBeenCalled();
  });

  it("resolveStudioHubBlogPatch uses enqueue path when publishing and jobs enabled", async () => {
    process.env.PLATFORM_PUBLISHING_ENABLED = "true";
    process.env.PLATFORM_JOBS_ENABLED = "true";
    vi.mocked(enqueueStudioHubBlogPatchJob).mockResolvedValue({
      accepted: true,
      jobId: "job-blog-1",
    });

    const result = await resolveStudioHubBlogPatch("hub-1", { title: "Blog" });
    expect(enqueueStudioHubBlogPatchJob).toHaveBeenCalled();
    expect(result).toEqual({ accepted: true, jobId: "job-blog-1" });
  });
});
