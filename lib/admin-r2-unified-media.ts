import type { R2VaultId } from "@/lib/r2-vaults-shared";

export type UnifiedMediaKindFilter = "all" | "image" | "video";

export type UnifiedMediaItem = {
  key: string;
  name: string;
  size: number;
  sizeLabel: string;
  lastModified: string | null;
  quality: string;
  qualityLabel: string;
  kind: "image" | "video" | "other";
  previewUrl: string;
  pairKey: null;
  pairPresent: false;
  sourceVault: R2VaultId;
  sourceLabel: string;
  /** True when key came from CMS/DB reference pass (not bucket scan only). */
  dbReferenced?: boolean;
};

export type UnifiedMediaCollectResult = {
  objects: UnifiedMediaItem[];
  scanned: number;
  truncated: boolean;
  dbReferenced: number;
  bucketScanAdded: number;
};
