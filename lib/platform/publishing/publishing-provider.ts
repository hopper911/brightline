/**
 * Tenant-scoped publishing adapter contract (Phase 6A — no implementations).
 */

import type { PlatformContext } from "@/lib/platform/context/types";
import type { PublishRequest, PublishResult, PublishTargetId } from "@/lib/platform/publishing/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export type PublishingProviderKind = "brightline" | "mirotech";

export interface PublishingProvider {
  readonly tenant: TenantSlug;
  readonly kind: PublishingProviderKind;

  /** Whether this adapter handles the request (source type + target + operation). */
  supports(request: PublishRequest): boolean;

  /**
   * Execute publish intent against legacy stores/APIs.
   * Phase 6B+ implementations wrap existing admin routes and hub clients — no new behavior in 6A.
   */
  publish(context: PlatformContext, request: PublishRequest): Promise<PublishResult>;
}

export interface PublishingProviderRegistry {
  getProviderForTarget(target: PublishTargetId): PublishingProvider | null;
  getProviderForTenant(tenant: TenantSlug): PublishingProvider | null;
  listProviders(): PublishingProvider[];
}
