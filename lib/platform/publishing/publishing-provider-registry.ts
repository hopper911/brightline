import { mirotechPublishingAdapter } from "@/lib/platform/publishing/adapters/mirotech-publishing-adapter";
import type { PublishingProvider } from "@/lib/platform/publishing/publishing-provider";
import type { PublishTargetId } from "@/lib/platform/publishing/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export class DefaultPublishingProviderRegistry {
  private readonly byTarget: Readonly<Partial<Record<PublishTargetId, PublishingProvider>>>;
  private readonly byTenant: Readonly<Partial<Record<TenantSlug, PublishingProvider>>>;

  constructor(providers?: Partial<Record<PublishTargetId, PublishingProvider>>) {
    const mirotech = providers?.["mirotech-site"] ?? mirotechPublishingAdapter;
    this.byTarget = Object.freeze({
      "mirotech-site": mirotech,
      ...providers,
    });
    this.byTenant = Object.freeze({
      mirotech,
      brightline: providers?.["brightline-site"] ?? undefined,
    });
  }

  getProviderForTarget(target: PublishTargetId): PublishingProvider | null {
    return this.byTarget[target] ?? null;
  }

  getProviderForTenant(tenant: TenantSlug): PublishingProvider | null {
    return this.byTenant[tenant] ?? null;
  }

  listProviders(): PublishingProvider[] {
    return Object.values(this.byTarget).filter((provider): provider is PublishingProvider =>
      Boolean(provider)
    );
  }
}

export const defaultPublishingProviderRegistry = new DefaultPublishingProviderRegistry();
