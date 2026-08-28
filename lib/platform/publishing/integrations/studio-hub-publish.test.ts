import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/dual-brand/studio-hub", () => ({
  updateHubProject: vi.fn(),
  updateHubBlog: vi.fn(),
}));

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: vi.fn().mockResolvedValue({ ok: true, skipped: true }),
}));

import { updateHubBlog, updateHubProject } from "@/lib/dual-brand/studio-hub";
import {
  legacyPatchStudioHubBlog,
  legacyPatchStudioHubProject,
  resolveStudioHubProjectPatch,
} from "@/lib/platform/publishing/integrations/studio-hub-publish";
import type { DefaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";

const hubProject = { id: "hub-1", title: "Case Study", slug: "case-study" };

describe("studio hub publish integration", () => {
  const savedFlag = process.env.PLATFORM_PUBLISHING_ENABLED;

  beforeEach(() => {
    vi.mocked(updateHubProject).mockReset();
    vi.mocked(updateHubBlog).mockReset();
  });

  afterEach(() => {
    if (savedFlag === undefined) delete process.env.PLATFORM_PUBLISHING_ENABLED;
    else process.env.PLATFORM_PUBLISHING_ENABLED = savedFlag;
  });

  it("legacy project patch delegates to updateHubProject", async () => {
    vi.mocked(updateHubProject).mockResolvedValue(hubProject as never);
    const result = await legacyPatchStudioHubProject("hub-1", { status: "PUBLISHED" });
    expect(updateHubProject).toHaveBeenCalledWith("hub-1", { status: "PUBLISHED" });
    expect(result.id).toBe("hub-1");
  });

  it("resolveStudioHubProjectPatch uses legacy when flag off", async () => {
    delete process.env.PLATFORM_PUBLISHING_ENABLED;
    vi.mocked(updateHubProject).mockResolvedValue(hubProject as never);
    await resolveStudioHubProjectPatch("hub-1", { status: "PUBLISHED" });
    expect(updateHubProject).toHaveBeenCalled();
  });

  it("resolveStudioHubProjectPatch uses platform when flag on", async () => {
    process.env.PLATFORM_PUBLISHING_ENABLED = "true";
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
    expect(result.id).toBe("hub-1");
  });

  it("legacy blog patch delegates to updateHubBlog", async () => {
    vi.mocked(updateHubBlog).mockResolvedValue({
      post: { id: "j-1" },
      summary: { id: "j-1" },
    } as never);
    await legacyPatchStudioHubBlog("hub-1", { status: "PUBLISHED" });
    expect(updateHubBlog).toHaveBeenCalled();
  });
});
