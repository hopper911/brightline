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
 */
export class DefaultPublishingService implements PublishingService {
  constructor(
    private readonly registry: DefaultPublishingProviderRegistry = defaultPublishingProviderRegistry
  ) {}

  async publish(context: PlatformContext, request: PublishRequest): Promise<PublishResult> {
    const valid = assertValidPublishRequest(request);
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

export const defaultPublishingService = new DefaultPublishingService();
