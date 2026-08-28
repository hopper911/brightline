import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DefaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import { PublishingUnsupportedError } from "@/lib/platform/publishing/errors";
import type { PublishingProvider } from "@/lib/platform/publishing/publishing-provider";
import { DefaultPublishingProviderRegistry } from "@/lib/platform/publishing/publishing-provider-registry";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";

describe("DefaultPublishingService", () => {
  it("routes publish to target provider", async () => {
    const provider: PublishingProvider = {
      tenant: "mirotech",
      kind: "mirotech",
      supports: () => true,
      publish: vi.fn().mockResolvedValue({
        outcome: "completed",
        request: {
          source: { tenant: "brightline", type: "blog-post", id: "post-1" },
          target: "mirotech-site",
          operation: "sync",
        },
        resourceId: "journal-1",
      }),
    };
    const registry = new DefaultPublishingProviderRegistry({ "mirotech-site": provider });
    const service = new DefaultPublishingService(registry);
    const request = {
      source: { tenant: "brightline" as const, type: "blog-post" as const, id: "post-1" },
      target: "mirotech-site" as const,
      operation: "sync" as const,
    };
    const result = await service.publish(createPlatformContextForTenant("brightline"), request);
    expect(result.resourceId).toBe("journal-1");
    expect(provider.publish).toHaveBeenCalled();
  });

  it("throws when no provider supports request", async () => {
    const registry = new DefaultPublishingProviderRegistry({ "mirotech-site": undefined });
    const service = new DefaultPublishingService(registry);
    await expect(
      service.publish(createPlatformContextForTenant("brightline"), {
        source: { tenant: "brightline", type: "blog-post", id: "post-1" },
        target: "mirotech-site",
        operation: "sync",
      })
    ).rejects.toBeInstanceOf(PublishingUnsupportedError);
  });
});
