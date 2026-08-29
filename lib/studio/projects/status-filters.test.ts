import { describe, expect, it } from "vitest";
import {
  lifecycleDisplayLabel,
  lifecycleToStatusBucket,
  matchesStudioProjectStatusFilter,
  studioProjectEmptyMessage,
} from "@/lib/studio/projects/status-filters";

describe("studio project status filters", () => {
  it("maps lifecycle to filter buckets", () => {
    expect(lifecycleToStatusBucket("DRAFT")).toBe("draft");
    expect(lifecycleToStatusBucket("CONTENT_READY")).toBe("needs-media");
    expect(lifecycleToStatusBucket("IN_REVIEW")).toBe("review");
    expect(lifecycleToStatusBucket("PUBLISHED")).toBe("published");
  });

  it("filters needs-content to draft only", () => {
    expect(matchesStudioProjectStatusFilter("DRAFT", "needs-content")).toBe(true);
    expect(matchesStudioProjectStatusFilter("CONTENT_READY", "needs-content")).toBe(false);
  });

  it("filters needs-media to content-ready only", () => {
    expect(matchesStudioProjectStatusFilter("CONTENT_READY", "needs-media")).toBe(true);
    expect(matchesStudioProjectStatusFilter("MEDIA_READY", "needs-media")).toBe(false);
  });

  it("builds contextual empty messages", () => {
    expect(studioProjectEmptyMessage("review", "mirotech")).toContain("MiroTech");
    expect(studioProjectEmptyMessage("review", "mirotech")).toContain("Review");
  });

  it("labels lifecycle for display", () => {
    expect(lifecycleDisplayLabel("IN_REVIEW")).toBe("In review");
    expect(lifecycleDisplayLabel("CONTENT_READY")).toBe("Needs media");
  });
});
