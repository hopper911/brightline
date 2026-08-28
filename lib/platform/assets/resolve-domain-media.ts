/**
 * Transitional domain media resolver (Phase 4C).
 * Asset-first when PLATFORM_ASSET_READ_ENABLED; legacy fallback always available.
 */

import { findPlatformAssetById } from "@/lib/platform/assets/repository";
import type { PlatformAssetRecord } from "@/lib/platform/assets/types";
import { resolveStorageReferenceFromStoredValue } from "@/lib/platform/assets/backfill/resolve-candidate-key";
import type { PlatformContext } from "@/lib/platform/context/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import type { MediaObjectRef } from "@/lib/platform/media/types";

export type DomainMediaInput = {
  assetId?: string | null;
  legacyReference?: string | null;
  /** Vault expectation for legacy refs (portfolio → brightline). */
  expectVault?: MediaObjectRef["vault"];
};

export type DomainMediaConflict = {
  assetId: string;
  assetObjectKey: string;
  legacyObjectKey: string;
  message: string;
};

export type ResolveDomainMediaResult = {
  objectRef: MediaObjectRef | null;
  source: "legacy" | "asset" | null;
  conflict?: DomainMediaConflict;
};

export type ResolveDomainMediaDeps = {
  lookupAssetById?: (assetId: string) => Promise<PlatformAssetRecord | null>;
};

function logDomainMediaConflict(conflict: DomainMediaConflict): void {
  console.warn(`[resolveDomainMedia] ${conflict.message}`);
}

function legacyObjectRef(
  legacyReference: string | null | undefined,
  expectVault: MediaObjectRef["vault"]
): MediaObjectRef | null {
  const resolved = resolveStorageReferenceFromStoredValue(legacyReference, {
    expectVault,
    publishedPublic: false,
  });
  if (!resolved.ok) return null;
  return { vault: resolved.vault, objectKey: resolved.objectKey };
}

function storageRefsMatch(a: MediaObjectRef, b: MediaObjectRef): boolean {
  return a.vault === b.vault && a.objectKey === b.objectKey;
}

/**
 * Resolve a domain row's media to a storage object ref.
 * Flag off → legacy only. Flag on → asset when present; legacy fallback; conflict prefers legacy.
 */
export async function resolveDomainMedia(
  input: DomainMediaInput,
  _context: PlatformContext,
  deps?: ResolveDomainMediaDeps
): Promise<ResolveDomainMediaResult> {
  const expectVault = input.expectVault ?? "brightline";
  const lookup = deps?.lookupAssetById ?? findPlatformAssetById;
  const legacyRef = legacyObjectRef(input.legacyReference, expectVault);

  if (!isPlatformFeatureEnabled("assetRead")) {
    return legacyRef
      ? { objectRef: legacyRef, source: "legacy" }
      : { objectRef: null, source: null };
  }

  const assetId = input.assetId?.trim() || null;
  if (!assetId) {
    return legacyRef
      ? { objectRef: legacyRef, source: "legacy" }
      : { objectRef: null, source: null };
  }

  const asset = await lookup(assetId);
  if (!asset) {
    return legacyRef
      ? { objectRef: legacyRef, source: "legacy" }
      : { objectRef: null, source: null };
  }

  const assetRef: MediaObjectRef = { vault: asset.vault, objectKey: asset.objectKey };

  if (!legacyRef) {
    return { objectRef: assetRef, source: "asset" };
  }

  if (!storageRefsMatch(assetRef, legacyRef)) {
    const conflict: DomainMediaConflict = {
      assetId,
      assetObjectKey: asset.objectKey,
      legacyObjectKey: legacyRef.objectKey,
      message: `Asset ${assetId} (${asset.objectKey}) disagrees with legacy (${legacyRef.objectKey}); using legacy.`,
    };
    logDomainMediaConflict(conflict);
    return { objectRef: legacyRef, source: "legacy", conflict };
  }

  return { objectRef: assetRef, source: "asset" };
}

/** Pick legacy url/storageKey/fullUrl for portfolio images. */
export function portfolioImageLegacyReference(image: {
  storageKey?: string | null;
  fullUrl?: string | null;
  url?: string | null;
}): string | null {
  return image.storageKey?.trim() || image.fullUrl?.trim() || image.url?.trim() || null;
}
