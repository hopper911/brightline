import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DefaultContentService } from "@/lib/platform/content/default-content-service";
import type { ContentProvider } from "@/lib/platform/content/content-provider";
import { ContentUnsupportedTypeError } from "@/lib/platform/content/errors";
import { DefaultContentProviderRegistry } from "@/lib/platform/content/content-provider-registry";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";

describe("DefaultContentService", () => {
  it("routes resolveReference to tenant provider", async () => {
    const provider: ContentProvider = {
      tenant: "brightline",
      supports: () => true,
      resolveReference: vi.fn().mockResolvedValue({
        ref: { tenant: "brightline", type: "work-project", id: "wp-1" },
        title: "Glass Tower",
        slug: "glass-tower",
        lifecycle: "draft",
        publicPath: null,
        updatedAt: null,
        publishedAt: null,
      }),
      getPublished: vi.fn(),
    };
    const registry = new DefaultContentProviderRegistry({ brightline: provider });
    const service = new DefaultContentService(registry);
    const context = createPlatformContextForTenant("brightline");
    const ref = { tenant: "brightline" as const, type: "work-project" as const, id: "wp-1" };
    const summary = await service.resolveReference(context, ref);
    expect(summary?.title).toBe("Glass Tower");
    expect(provider.resolveReference).toHaveBeenCalledWith(context, ref);
  });

  it("throws when provider missing for tenant", async () => {
    const registry = new DefaultContentProviderRegistry({ brightline: undefined });
    const service = new DefaultContentService(registry);
    await expect(
      service.resolveReference(createPlatformContextForTenant("brightline"), {
        tenant: "brightline",
        type: "work-project",
        id: "wp-1",
      })
    ).rejects.toThrow(ContentUnsupportedTypeError);
  });
});
