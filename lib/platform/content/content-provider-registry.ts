import type { ContentProvider } from "@/lib/platform/content/content-provider";
import { brightlineContentAdapter } from "@/lib/platform/content/adapters/brightline-content-adapter";
import { mirotechContentAdapter } from "@/lib/platform/content/adapters/mirotech-content-adapter";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export class DefaultContentProviderRegistry {
  private readonly providers: Readonly<Partial<Record<TenantSlug, ContentProvider>>>;

  constructor(providers?: Partial<Record<TenantSlug, ContentProvider>>) {
    this.providers = Object.freeze({
      brightline: brightlineContentAdapter,
      mirotech: mirotechContentAdapter,
      ...providers,
    });
  }

  getProvider(tenant: TenantSlug): ContentProvider | null {
    return this.providers[tenant] ?? null;
  }

  listProviders(): ContentProvider[] {
    return Object.values(this.providers).filter((provider): provider is ContentProvider =>
      Boolean(provider)
    );
  }
}

export const defaultContentProviderRegistry = new DefaultContentProviderRegistry();
