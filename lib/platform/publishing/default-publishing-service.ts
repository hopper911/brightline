import "server-only";

import type { PlatformContext } from "@/lib/platform/context/types";
import { PublishingUnsupportedError } from "@/lib/platform/publishing/errors";
import type { PublishingProvider } from "@/lib/platform/publishing/publishing-provider";
import {
  DefaultPublishingProviderRegistry,
  defaultPublishingProviderRegistry,
} from "@/lib/platform/publishing/publishing-provider-registry";
import type { PublishingService } from "@/lib/platform/publishing/publishing-service";
import type { PublishRequest, PublishResult } from "@/lib/platform/publishing/types";
import { assertValidPublishRequest } from "@/lib/platform/publishing/types";

/**
 * Default PublishingService — routes to target adapters (Phase 6B).
 *
 * **Authorization boundary:** assumes the caller (admin route, automation handler)
 * has already verified operator identity. This service does NOT call authorizeAdminRequest.
 *
 * Legacy blog sync routes use `blog-mirotech-sync` integration (journal-ingest under the hood).
 *
 * Publish-gate is loaded lazily so this module can initialize without the
 * workflow → jobs → publishing cycle (webpack TDZ during Next page collect).
 */
export class DefaultPublishingService implements PublishingService {
  constructor(
    private readonly registry: DefaultPublishingProviderRegistry = defaultPublishingProviderRegistry
  ) {}

  async publish(context: PlatformContext, request: PublishRequest): Promise<PublishResult> {
    const valid = assertValidPublishRequest(request);
    if (
      valid.source.type === "dual-brand-work" &&
      String(valid.hubPatch?.status ?? "").toUpperCase() === "PUBLISHED"
    ) {
      const { assertProjectPublishAllowed } = await import("@/lib/platform/projects/publish-gate");
      await assertProjectPublishAllowed({
        tenant: "mirotech",
        type: "mirotech-case-study",
        id: valid.source.id,
      });
    }
    if (
      valid.source.type === "work-project" &&
      valid.source.tenant === "brightline" &&
      valid.operation === "publish"
    ) {
      const { assertProjectPublishAllowed } = await import("@/lib/platform/projects/publish-gate");
      await assertProjectPublishAllowed(valid.source);
    }
    const provider = this.providerFor(valid);
    return provider.publish(context, valid);
  }

  private providerFor(request: PublishRequest): PublishingProvider {
    const provider = this.registry.getProviderForTarget(request.target);
    if (!provider || !provider.supports(request)) {
      throw new PublishingUnsupportedError(
        `No publishing provider for target "${request.target}" and source ${request.source.tenant}/${request.source.type}.`
      );
    }
    return provider;
  }
}

let defaultPublishingServiceInstance: DefaultPublishingService | undefined;

/** Safe across circular imports — function exports are initialized before module evaluation. */
export function getDefaultPublishingService(): DefaultPublishingService {
  defaultPublishingServiceInstance ??= new DefaultPublishingService();
  return defaultPublishingServiceInstance;
}

export const defaultPublishingService: DefaultPublishingService = {
  publish: (context, request) => getDefaultPublishingService().publish(context, request),
} as DefaultPublishingService;
