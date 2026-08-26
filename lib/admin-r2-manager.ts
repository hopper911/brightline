import { prisma } from "@/lib/prisma";
import { collectKeysFromUnknown, looksLikeR2Key } from "@/lib/admin-r2-hygiene";
import {
  ADMIN_SIGNABLE_EXTRA_PREFIXES,
  isPrivateMediaKey,
  isPublicMediaKey,
  PRIVATE_MEDIA_PREFIXES,
  PUBLIC_MEDIA_PREFIXES,
} from "@/lib/media-key-access";
import {
  MIROTECH_SITE_ALLOWED_PREFIXES,
  MIROTECH_SITE_ROOTS,
  mirotechSitePublicObjectUrl,
  type R2VaultId,
  type R2VaultRoot,
} from "@/lib/r2-vaults";
import { listObjectsDelimited } from "@/lib/storage-r2";

/** Roots shown in the R2 manager sidebar (Brightline vault). */
export const R2_MANAGER_ROOTS: readonly R2VaultRoot[] = [
  { id: "portfolio", label: "Portfolio", prefix: "portfolio/" },
  { id: "mirotech", label: "Mirotech media", prefix: "mirotech/" },
  { id: "client-galleries", label: "Client galleries", prefix: "client-galleries/" },
  { id: "work", label: "Work", prefix: "work/" },
  { id: "studio", label: "Studio", prefix: "studio/" },
  { id: "site", label: "Site", prefix: "site/" },
  { id: "delivery", label: "Delivery", prefix: "delivery/" },
  { id: "journal", label: "Journal", prefix: "journal/" },
  { id: "accounting", label: "Accounting", prefix: "accounting/" },
  { id: "tmp", label: "Temp uploads", prefix: "tmp/" },
] as const;

/** Allowed prefixes for list/upload/delete/move (Brightline vault security boundary). */
export const R2_MANAGER_ALLOWED_PREFIXES = [
  ...PUBLIC_MEDIA_PREFIXES,
  ...PRIVATE_MEDIA_PREFIXES,
  ...ADMIN_SIGNABLE_EXTRA_PREFIXES,
] as const;

export function rootsForVault(vault: R2VaultId): readonly R2VaultRoot[] {
  return vault === "mirotech-site" ? MIROTECH_SITE_ROOTS : R2_MANAGER_ROOTS;
}

export function allowedPrefixesForVault(vault: R2VaultId): readonly string[] {
  return vault === "mirotech-site" ? MIROTECH_SITE_ALLOWED_PREFIXES : R2_MANAGER_ALLOWED_PREFIXES;
}

export function cleanR2Key(key: string): string {
  return key.trim().replace(/^\/+/, "");
}

export function normalizePrefix(prefix: string): string {
  const clean = cleanR2Key(prefix);
  if (!clean) return "";
  return clean.endsWith("/") ? clean : `${clean}/`;
}

/**
 * Keys must live under an allowlisted product prefix (no bucket-wide mutate).
 */
export function isR2ManagerKeyAllowed(key: string, vault: R2VaultId = "brightline"): boolean {
  const clean = cleanR2Key(key).toLowerCase();
  if (!clean) return false;
  if (clean.includes("..") || clean.includes("\0") || clean.includes("\\")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(clean)) return false;
  return allowedPrefixesForVault(vault).some(
    (prefix) => clean.startsWith(prefix) || clean === prefix.replace(/\/$/, "")
  );
}

export function assertR2ManagerKeyAllowed(
  key: string,
  vault: R2VaultId = "brightline"
): string {
  const clean = cleanR2Key(key);
  if (!isR2ManagerKeyAllowed(clean, vault)) {
    throw Object.assign(new Error(`Key not allowed for R2 manager: ${clean || "(empty)"}`), {
      status: 400,
    });
  }
  return clean;
}

export type R2Quality =
  | "full"
  | "thumb"
  | "low_res"
  | "derivative"
  | "unclassified";

export function detectR2Quality(key: string): R2Quality {
  const k = cleanR2Key(key).toLowerCase();
  if (k.includes("/low-res/") || k.includes("/low_res/")) return "low_res";
  if (k.startsWith("delivery/")) return "derivative";
  if (k.includes("web_thumb") || k.includes("/thumb/") || /(^|\/)thumbs?\//.test(k)) return "thumb";
  if (k.includes("web_full") || k.includes("/full/") || k.includes("/originals/")) return "full";
  // Gallery originals under client-galleries (not low-res)
  if (k.startsWith("client-galleries/") && !k.includes("/low-res/")) return "full";
  return "unclassified";
}

export function detectR2Kind(key: string): "image" | "video" | "other" {
  const lower = cleanR2Key(key).toLowerCase();
  if (/\.(jpe?g|png|webp|gif|avif|heic|tiff?)$/i.test(lower)) return "image";
  if (/\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(lower)) return "video";
  return "other";
}

export function fileNameFromKey(key: string): string {
  const clean = cleanR2Key(key);
  const parts = clean.split("/");
  return parts[parts.length - 1] || clean;
}

export function parentPrefixFromKey(key: string): string {
  const clean = cleanR2Key(key);
  const idx = clean.lastIndexOf("/");
  if (idx <= 0) return "";
  return clean.slice(0, idx + 1);
}

export type R2PairKind = "full_thumb" | "video_poster" | null;

/** Map web_full ↔ web_thumb or web_video MP4 ↔ poster sibling when convention matches. */
export function pairKeyCandidate(key: string): string | null {
  const clean = cleanR2Key(key);
  if (clean.includes("web_full")) return clean.replace(/web_full/g, "web_thumb");
  if (clean.includes("web_thumb")) return clean.replace(/web_thumb/g, "web_full");
  if (clean.includes("/full/")) return clean.replace(/\/full\//g, "/thumb/");
  if (clean.includes("/thumb/")) return clean.replace(/\/thumb\//g, "/full/");
  if (/\/web_video\/.+\.mp4$/i.test(clean)) {
    return clean.replace(/\.mp4$/i, "-poster.webp");
  }
  if (/\/web_video\/.+-poster\.webp$/i.test(clean)) {
    return clean.replace(/-poster\.webp$/i, ".mp4");
  }
  if (/\/web_video\/.+-poster\.png$/i.test(clean)) {
    return clean.replace(/-poster\.png$/i, ".mp4");
  }
  return null;
}

export function pairKindForKey(key: string): R2PairKind {
  const clean = cleanR2Key(key).toLowerCase();
  if (clean.includes("web_video/")) {
    if (/\.mp4$/i.test(clean) || /-poster\.(webp|png)$/i.test(clean)) return "video_poster";
    return null;
  }
  const q = detectR2Quality(key);
  if (q === "full" || q === "thumb") return "full_thumb";
  return null;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function previewUrlForKey(key: string, vault: R2VaultId = "brightline"): string {
  const clean = cleanR2Key(key);
  if (vault === "mirotech-site") {
    const pub = mirotechSitePublicObjectUrl(clean);
    if (pub) return pub;
    return `/api/admin/r2/sign?vault=mirotech-site&key=${encodeURIComponent(clean)}`;
  }
  if (isPrivateMediaKey(clean)) {
    return `/api/admin/media/sign?key=${encodeURIComponent(clean)}`;
  }
  if (isPublicMediaKey(clean)) {
    return `/api/media/public?key=${encodeURIComponent(clean)}`;
  }
  // Full-bucket browse: fall back to admin sign for any other key
  return `/api/admin/media/sign?key=${encodeURIComponent(clean)}`;
}

export type FolderPreview = {
  prefix: string;
  previewUrls: string[];
  previewKind: "image" | "video" | "empty";
};

/**
 * Sample up to 4 representative images (prefer thumbs) under a folder for grid previews.
 * Flat-lists without delimiter so nested assets (e.g. portfolio/arc/web_thumb/…) are found.
 */
export async function sampleFolderPreview(
  prefix: string,
  vault: R2VaultId = "brightline"
): Promise<FolderPreview> {
  const normalized = normalizePrefix(prefix);
  if (!normalized) {
    return { prefix: "", previewUrls: [], previewKind: "empty" };
  }

  try {
    const listed = await listObjectsDelimited({
      prefix: normalized,
      delimiter: null,
      maxKeys: 80,
      vault,
    });

    const images = listed.objects.filter((o) => detectR2Kind(o.key) === "image");
    const thumbs = images.filter((o) => detectR2Quality(o.key) === "thumb" || detectR2Quality(o.key) === "low_res");
    const preferred = thumbs.length > 0 ? thumbs : images;
    // Prefer smaller files for snappy previews when mixing qualities
    const ranked = [...preferred].sort((a, b) => a.size - b.size).slice(0, 4);

    if (ranked.length > 0) {
      return {
        prefix: normalized,
        previewUrls: ranked.map((o) => previewUrlForKey(o.key, vault)),
        previewKind: "image",
      };
    }

    const video = listed.objects.find((o) => detectR2Kind(o.key) === "video");
    if (video) {
      return {
        prefix: normalized,
        previewUrls: [previewUrlForKey(video.key, vault)],
        previewKind: "video",
      };
    }

    return { prefix: normalized, previewUrls: [], previewKind: "empty" };
  } catch {
    return { prefix: normalized, previewUrls: [], previewKind: "empty" };
  }
}

/** Sample previews for many folders with limited concurrency. */
export async function sampleFolderPreviews(
  prefixes: string[],
  concurrency = 4,
  vault: R2VaultId = "brightline"
): Promise<FolderPreview[]> {
  const out: FolderPreview[] = new Array(prefixes.length);
  let cursor = 0;

  async function worker() {
    while (cursor < prefixes.length) {
      const i = cursor;
      cursor += 1;
      out[i] = await sampleFolderPreview(prefixes[i]!, vault);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, Math.max(prefixes.length, 1)) }, () =>
    worker()
  );
  await Promise.all(workers);
  return out;
}

export type R2KeyOtherRef = {
  source: string;
  id: string;
  field: string;
};

export type R2KeyUsage = {
  key: string;
  mediaAssets: Array<{ id: string; field: "keyFull" | "keyThumb" | "posterKey"; projectIds: string[] }>;
  galleryImages: Array<{
    id: string;
    galleryId: string;
    field: "storageKey" | "lowResStorageKey";
    galleryTitle: string | null;
  }>;
  galleryVideos: Array<{ id: string; galleryId: string; galleryTitle: string | null; field: "storageKey" | "posterKey" }>;
  deliveryItems: Array<{ id: string; deliveryPackageId: string }>;
  other: R2KeyOtherRef[];
  totalRefs: number;
};

export async function findR2KeyUsage(key: string): Promise<R2KeyUsage> {
  const clean = cleanR2Key(key);

  const [
    fullAssets,
    thumbAssets,
    posterAssets,
    galleryHigh,
    galleryLow,
    galleryVideos,
    galleryVideoPosters,
    deliveryItems,
    portfolioCovers,
    portfolioImages,
    studioMediaFull,
    studioMediaThumb,
    siteBg,
    designOg,
    invoices,
    expenses,
    documents,
  ] = await Promise.all([
      prisma.mediaAsset.findMany({
        where: { keyFull: clean },
        select: {
          id: true,
          projectMedia: { select: { projectId: true } },
          heroFor: { select: { id: true } },
        },
      }),
      prisma.mediaAsset.findMany({
        where: { keyThumb: clean },
        select: {
          id: true,
          projectMedia: { select: { projectId: true } },
          heroFor: { select: { id: true } },
        },
      }),
      prisma.mediaAsset.findMany({
        where: { posterKey: clean },
        select: {
          id: true,
          projectMedia: { select: { projectId: true } },
          heroFor: { select: { id: true } },
        },
      }),
      prisma.galleryImage.findMany({
        where: { storageKey: clean },
        select: { id: true, galleryId: true, gallery: { select: { title: true } } },
      }),
      prisma.galleryImage.findMany({
        where: { lowResStorageKey: clean },
        select: { id: true, galleryId: true, gallery: { select: { title: true } } },
      }),
      prisma.galleryVideo.findMany({
        where: { storageKey: clean },
        select: { id: true, galleryId: true, gallery: { select: { title: true } } },
      }),
      prisma.galleryVideo.findMany({
        where: { posterKey: clean },
        select: { id: true, galleryId: true, gallery: { select: { title: true } } },
      }),
      prisma.deliveryPackageItem.findMany({
        where: { storageKey: clean },
        select: { id: true, deliveryPackageId: true },
      }),
      prisma.portfolioProject.findMany({
        where: { coverStorageKey: clean },
        select: { id: true },
      }),
      prisma.portfolioImage.findMany({
        where: { storageKey: clean },
        select: { id: true },
      }),
      prisma.studioMedia.findMany({
        where: { r2KeyFull: clean },
        select: { id: true },
      }),
      prisma.studioMedia.findMany({
        where: { r2KeyThumb: clean },
        select: { id: true },
      }),
      prisma.siteBackgroundVideo.findMany({
        where: { OR: [{ storageKey: clean }, { webStorageKey: clean }, { posterKey: clean }] },
        select: { id: true, storageKey: true, webStorageKey: true, posterKey: true },
      }),
      prisma.designProject.findMany({
        where: { ogImageKey: clean },
        select: { id: true },
      }),
      prisma.studioInvoice.findMany({
        where: { pdfStorageKey: clean },
        select: { id: true },
      }),
      prisma.studioExpense.findMany({
        where: { receiptKey: clean },
        select: { id: true },
      }),
      prisma.generatedDocument.findMany({
        where: { OR: [{ draftPdfKey: clean }, { signedPdfKey: clean }] },
        select: { id: true, draftPdfKey: true, signedPdfKey: true },
      }),
    ]);

  const mediaAssets: R2KeyUsage["mediaAssets"] = [];
  for (const a of fullAssets) {
    const projectIds = [
      ...a.projectMedia.map((p) => p.projectId),
      ...a.heroFor.map((h) => h.id),
    ];
    mediaAssets.push({
      id: a.id,
      field: "keyFull",
      projectIds: [...new Set(projectIds)],
    });
  }
  for (const a of thumbAssets) {
    const projectIds = [
      ...a.projectMedia.map((p) => p.projectId),
      ...a.heroFor.map((h) => h.id),
    ];
    mediaAssets.push({
      id: a.id,
      field: "keyThumb",
      projectIds: [...new Set(projectIds)],
    });
  }
  for (const a of posterAssets) {
    const projectIds = [
      ...a.projectMedia.map((p) => p.projectId),
      ...a.heroFor.map((h) => h.id),
    ];
    mediaAssets.push({
      id: a.id,
      field: "posterKey",
      projectIds: [...new Set(projectIds)],
    });
  }

  const galleryImages: R2KeyUsage["galleryImages"] = [
    ...galleryHigh.map((g) => ({
      id: g.id,
      galleryId: g.galleryId,
      field: "storageKey" as const,
      galleryTitle: g.gallery?.title ?? null,
    })),
    ...galleryLow.map((g) => ({
      id: g.id,
      galleryId: g.galleryId,
      field: "lowResStorageKey" as const,
      galleryTitle: g.gallery?.title ?? null,
    })),
  ];

  const galleryVideosMapped: R2KeyUsage["galleryVideos"] = [
    ...galleryVideos.map((g) => ({
      id: g.id,
      galleryId: g.galleryId,
      galleryTitle: g.gallery?.title ?? null,
      field: "storageKey" as const,
    })),
    ...galleryVideoPosters.map((g) => ({
      id: g.id,
      galleryId: g.galleryId,
      galleryTitle: g.gallery?.title ?? null,
      field: "posterKey" as const,
    })),
  ];

  const other: R2KeyOtherRef[] = [
    ...portfolioCovers.map((r) => ({ source: "PortfolioProject", id: r.id, field: "coverStorageKey" })),
    ...portfolioImages.map((r) => ({ source: "PortfolioImage", id: r.id, field: "storageKey" })),
    ...studioMediaFull.map((r) => ({ source: "StudioMedia", id: r.id, field: "r2KeyFull" })),
    ...studioMediaThumb.map((r) => ({ source: "StudioMedia", id: r.id, field: "r2KeyThumb" })),
    ...siteBg.flatMap((r) => {
      const fields: R2KeyOtherRef[] = [];
      if (r.storageKey === clean) fields.push({ source: "SiteBackgroundVideo", id: r.id, field: "storageKey" });
      if (r.webStorageKey === clean) fields.push({ source: "SiteBackgroundVideo", id: r.id, field: "webStorageKey" });
      if (r.posterKey === clean) fields.push({ source: "SiteBackgroundVideo", id: r.id, field: "posterKey" });
      return fields;
    }),
    ...designOg.map((r) => ({ source: "DesignProject", id: r.id, field: "ogImageKey" })),
    ...invoices.map((r) => ({ source: "StudioInvoice", id: r.id, field: "pdfStorageKey" })),
    ...expenses.map((r) => ({ source: "StudioExpense", id: r.id, field: "receiptKey" })),
    ...documents.flatMap((r) => {
      const fields: R2KeyOtherRef[] = [];
      if (r.draftPdfKey === clean) fields.push({ source: "GeneratedDocument", id: r.id, field: "draftPdfKey" });
      if (r.signedPdfKey === clean) fields.push({ source: "GeneratedDocument", id: r.id, field: "signedPdfKey" });
      return fields;
    }),
  ];

  return {
    key: clean,
    mediaAssets,
    galleryImages,
    galleryVideos: galleryVideosMapped,
    deliveryItems,
    other,
    totalRefs:
      mediaAssets.length +
      galleryImages.length +
      galleryVideosMapped.length +
      deliveryItems.length +
      other.length,
  };
}

/** Rewrite all DB references from oldKey → newKey. */
export async function rewriteR2KeyReferences(oldKey: string, newKey: string): Promise<number> {
  const from = cleanR2Key(oldKey);
  const to = cleanR2Key(newKey);
  if (from === to) return 0;

  const results = await prisma.$transaction([
    prisma.mediaAsset.updateMany({ where: { keyFull: from }, data: { keyFull: to } }),
    prisma.mediaAsset.updateMany({ where: { keyThumb: from }, data: { keyThumb: to } }),
    prisma.mediaAsset.updateMany({ where: { posterKey: from }, data: { posterKey: to } }),
    prisma.galleryImage.updateMany({ where: { storageKey: from }, data: { storageKey: to } }),
    prisma.galleryImage.updateMany({
      where: { lowResStorageKey: from },
      data: { lowResStorageKey: to },
    }),
    prisma.galleryVideo.updateMany({ where: { storageKey: from }, data: { storageKey: to } }),
    prisma.galleryVideo.updateMany({ where: { posterKey: from }, data: { posterKey: to } }),
    prisma.deliveryPackageItem.updateMany({ where: { storageKey: from }, data: { storageKey: to } }),
    prisma.portfolioProject.updateMany({ where: { coverStorageKey: from }, data: { coverStorageKey: to } }),
    prisma.portfolioImage.updateMany({ where: { storageKey: from }, data: { storageKey: to } }),
    prisma.studioMedia.updateMany({ where: { r2KeyFull: from }, data: { r2KeyFull: to } }),
    prisma.studioMedia.updateMany({ where: { r2KeyThumb: from }, data: { r2KeyThumb: to } }),
    prisma.siteBackgroundVideo.updateMany({ where: { storageKey: from }, data: { storageKey: to } }),
    prisma.siteBackgroundVideo.updateMany({ where: { webStorageKey: from }, data: { webStorageKey: to } }),
    prisma.siteBackgroundVideo.updateMany({ where: { posterKey: from }, data: { posterKey: to } }),
    prisma.designProject.updateMany({ where: { ogImageKey: from }, data: { ogImageKey: to } }),
    prisma.studioInvoice.updateMany({ where: { pdfStorageKey: from }, data: { pdfStorageKey: to } }),
    prisma.studioExpense.updateMany({ where: { receiptKey: from }, data: { receiptKey: to } }),
    prisma.generatedDocument.updateMany({ where: { draftPdfKey: from }, data: { draftPdfKey: to } }),
    prisma.generatedDocument.updateMany({ where: { signedPdfKey: from }, data: { signedPdfKey: to } }),
    prisma.workProject.updateMany({
      where: { backgroundMediaUrl: from },
      data: { backgroundMediaUrl: to },
    }),
    prisma.workProject.updateMany({
      where: { backgroundPosterUrl: from },
      data: { backgroundPosterUrl: to },
    }),
  ]);

  referencedCache = null;
  return results.reduce((sum, r) => sum + r.count, 0);
}

let referencedCache: { at: number; set: Set<string> } | null = null;

function addKey(set: Set<string>, value: string | null | undefined) {
  if (looksLikeR2Key(value)) set.add(value.trim().replace(/^\/+/, ""));
}

/** Collect all known R2 keys referenced in the database (for orphan scan). */
export async function collectReferencedR2Keys(): Promise<Set<string>> {
  const [
    assets,
    galleryImages,
    galleryVideos,
    deliveryItems,
    portfolioProjects,
    portfolioImages,
    studioMedia,
    siteBg,
    designProjects,
    invoices,
    expenses,
    documents,
    workProjects,
    settings,
  ] = await Promise.all([
    prisma.mediaAsset.findMany({
      select: { keyFull: true, keyThumb: true, posterKey: true },
    }),
    prisma.galleryImage.findMany({
      select: { storageKey: true, lowResStorageKey: true },
    }),
    prisma.galleryVideo.findMany({
      select: { storageKey: true, posterKey: true },
    }),
    prisma.deliveryPackageItem.findMany({
      select: { storageKey: true },
    }),
    prisma.portfolioProject.findMany({ select: { coverStorageKey: true } }),
    prisma.portfolioImage.findMany({ select: { storageKey: true } }),
    prisma.studioMedia.findMany({ select: { r2KeyFull: true, r2KeyThumb: true } }),
    prisma.siteBackgroundVideo.findMany({
      select: { storageKey: true, webStorageKey: true, posterKey: true },
    }),
    prisma.designProject.findMany({ select: { ogImageKey: true, specimenBlocks: true } }),
    prisma.studioInvoice.findMany({ select: { pdfStorageKey: true } }),
    prisma.studioExpense.findMany({ select: { receiptKey: true } }),
    prisma.generatedDocument.findMany({ select: { draftPdfKey: true, signedPdfKey: true } }),
    prisma.workProject.findMany({
      select: { backgroundMediaUrl: true, backgroundPosterUrl: true },
    }),
    prisma.siteSetting.findMany({ select: { value: true } }),
  ]);

  const set = new Set<string>();
  for (const a of assets) {
    addKey(set, a.keyFull);
    addKey(set, a.keyThumb);
    addKey(set, a.posterKey);
  }
  for (const g of galleryImages) {
    addKey(set, g.storageKey);
    addKey(set, g.lowResStorageKey);
  }
  for (const v of galleryVideos) {
    addKey(set, v.storageKey);
    addKey(set, v.posterKey);
  }
  for (const d of deliveryItems) addKey(set, d.storageKey);
  for (const p of portfolioProjects) addKey(set, p.coverStorageKey);
  for (const p of portfolioImages) addKey(set, p.storageKey);
  for (const m of studioMedia) {
    addKey(set, m.r2KeyFull);
    addKey(set, m.r2KeyThumb);
  }
  for (const b of siteBg) {
    addKey(set, b.storageKey);
    addKey(set, b.webStorageKey);
    addKey(set, b.posterKey);
  }
  for (const d of designProjects) {
    addKey(set, d.ogImageKey);
    collectKeysFromUnknown(d.specimenBlocks, set);
  }
  for (const i of invoices) addKey(set, i.pdfStorageKey);
  for (const e of expenses) addKey(set, e.receiptKey);
  for (const d of documents) {
    addKey(set, d.draftPdfKey);
    addKey(set, d.signedPdfKey);
  }
  for (const w of workProjects) {
    addKey(set, w.backgroundMediaUrl);
    addKey(set, w.backgroundPosterUrl);
  }
  for (const s of settings) {
    if (!s.value) continue;
    try {
      collectKeysFromUnknown(JSON.parse(s.value), set);
    } catch {
      addKey(set, s.value);
    }
  }
  return set;
}

export async function collectReferencedR2KeysCached(ttlMs = 30_000): Promise<Set<string>> {
  if (referencedCache && Date.now() - referencedCache.at < ttlMs) return referencedCache.set;
  const set = await collectReferencedR2Keys();
  referencedCache = { at: Date.now(), set };
  return set;
}

export function invalidateReferencedR2KeyCache() {
  referencedCache = null;
}

export function qualityLabel(q: R2Quality): string {
  switch (q) {
    case "full":
      return "Full";
    case "thumb":
      return "Thumb";
    case "low_res":
      return "Low-res";
    case "derivative":
      return "Derivative";
    default:
      return "Other";
  }
}
