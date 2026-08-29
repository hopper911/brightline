import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockUpdate = vi.fn();
const mockFind = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRevalidateChrome = vi.fn();
const mockSectionMap = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workProject: {
      findUnique: (...args: unknown[]) => mockFind(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/revalidate-public-chrome", () => ({
  revalidatePublicChrome: (...args: unknown[]) => mockRevalidateChrome(...args),
}));

vi.mock("@/lib/work-pillar-settings", () => ({
  getSectionToPillarSlugMap: (...args: unknown[]) => mockSectionMap(...args),
}));

vi.mock("@/lib/platform/projects/validate-publish-media", () => ({
  assertProjectPublishMediaValid: vi.fn().mockResolvedValue(undefined),
}));

import { BrightlinePublishingAdapter } from "@/lib/platform/publishing/adapters/brightline-publishing-adapter";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";

describe("BrightlinePublishingAdapter", () => {
  const adapter = new BrightlinePublishingAdapter();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSectionMap.mockResolvedValue({ ACD: "architecture" });
    mockFind
      .mockResolvedValueOnce({
        id: "wp-1",
        slug: "tower",
        section: "ACD",
        published: false,
        publishedAt: null,
        heroMediaId: "m1",
        heroMedia: { keyFull: "media/hero.webp", keyThumb: null },
        media: [{ media: { keyFull: "media/a.webp", keyThumb: null } }],
      })
      .mockResolvedValueOnce({ published: true, slug: "tower", section: "ACD" });
    mockUpdate.mockResolvedValue({});
  });

  it("supports brightline work-project publish", () => {
    expect(
      adapter.supports({
        source: { tenant: "brightline", type: "work-project", id: "wp-1" },
        target: "brightline-site",
        operation: "publish",
      })
    ).toBe(true);
  });

  it("publishes work project and revalidates paths", async () => {
    const request = {
      source: { tenant: "brightline" as const, type: "work-project" as const, id: "wp-1" },
      target: "brightline-site" as const,
      operation: "publish" as const,
    };
    const result = await adapter.publish(createPlatformContextForTenant("brightline"), request);
    expect(result.outcome).toBe("completed");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wp-1" },
        data: expect.objectContaining({ published: true }),
      })
    );
    expect(mockRevalidatePath).toHaveBeenCalled();
    expect(mockRevalidateChrome).toHaveBeenCalled();
  });
});
