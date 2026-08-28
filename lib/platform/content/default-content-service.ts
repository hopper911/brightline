import "server-only";

import type { PlatformContext } from "@/lib/platform/context/types";
import type { ContentProvider } from "@/lib/platform/content/content-provider";
import {
  DefaultContentProviderRegistry,
  defaultContentProviderRegistry,
} from "@/lib/platform/content/content-provider-registry";
import type { ContentService } from "@/lib/platform/content/content-service";
import {
  ContentUnsupportedTypeError,
} from "@/lib/platform/content/errors";
import type {
  ContentDistributionSnapshot,
  ContentListResult,
  ContentPublishedSnapshot,
  ContentRef,
  ContentReferenceSummary,
  ContentType,
} from "@/lib/platform/content/types";
import { assertValidContentRef } from "@/lib/platform/content/types";

export class DefaultContentService implements ContentService {
  constructor(
    private readonly registry: DefaultContentProviderRegistry = defaultContentProviderRegistry
  ) {}

  async resolveReference(
    context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentReferenceSummary | null> {
    return this.providerFor(ref).resolveReference(context, ref);
  }

  async getPublished(
    context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentPublishedSnapshot | null> {
    return this.providerFor(ref).getPublished(context, ref);
  }

  async getDistribution(
    context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentDistributionSnapshot | null> {
    const provider = this.providerFor(ref);
    if (!provider.getDistribution) return null;
    return provider.getDistribution(context, ref);
  }

  async listPublished(
    context: PlatformContext,
    type: ContentType,
    options?: { limit?: number; cursor?: string }
  ): Promise<ContentListResult> {
    const tenant = context.tenant.slug;
    const provider = this.registry.getProvider(tenant);
    if (!provider?.listPublished) {
      throw new ContentUnsupportedTypeError(
        `No listPublished provider for tenant "${tenant}" and type "${type}".`
      );
    }
    return provider.listPublished(context, type, options);
  }

  private providerFor(ref: ContentRef): ContentProvider {
    const valid = assertValidContentRef(ref);
    const provider = this.registry.getProvider(valid.tenant);
    if (!provider || !provider.supports(valid)) {
      throw new ContentUnsupportedTypeError(
        `No content provider registered for tenant "${valid.tenant}" and type "${valid.type}".`
      );
    }
    return provider;
  }
}

export const defaultContentService = new DefaultContentService();
