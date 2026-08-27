/**
 * Extract R2 keys referenced in the Brightline Prisma database with source labels.
 */

import { prisma } from "@/lib/prisma";
import { collectKeysFromUnknown, looksLikeR2Key } from "@/lib/admin-r2-hygiene";
import { inferVaultFromPrefix, type R2VaultId } from "@/lib/r2-vaults-shared";

export type BrightlineMediaRef = {
  key: string;
  vault: R2VaultId;
  sourceLabel: string;
  field: string;
};

function normalizeKey(value: string | null | undefined): string | null {
  if (!looksLikeR2Key(value)) return null;
  return value!.trim().replace(/^\/+/, "");
}

function pushRef(
  refs: BrightlineMediaRef[],
  seen: Set<string>,
  key: string | null | undefined,
  sourceLabel: string,
  field: string
) {
  const normalized = normalizeKey(key);
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  refs.push({
    key: normalized,
    vault: inferVaultFromPrefix(normalized) ?? "brightline",
    sourceLabel,
    field,
  });
}

function pushFromUnknown(
  refs: BrightlineMediaRef[],
  seen: Set<string>,
  value: unknown,
  sourceLabel: string,
  field: string
) {
  const keys = new Set<string>();
  collectKeysFromUnknown(value, keys);
  for (const key of keys) {
    pushRef(refs, seen, key, sourceLabel, field);
  }
}

/** Collect all R2 keys referenced in Brightline DB with human-readable source labels. */
export async function collectBrightlineMediaRefs(): Promise<BrightlineMediaRef[]> {
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
    workProjects,
    settings,
  ] = await Promise.all([
    prisma.mediaAsset.findMany({
      select: { id: true, keyFull: true, keyThumb: true, posterKey: true },
    }),
    prisma.galleryImage.findMany({
      select: { id: true, storageKey: true, lowResStorageKey: true, gallery: { select: { title: true } } },
    }),
    prisma.galleryVideo.findMany({
      select: {
        id: true,
        storageKey: true,
        posterKey: true,
        gallery: { select: { title: true } },
      },
    }),
    prisma.deliveryPackageItem.findMany({ select: { id: true, storageKey: true } }),
    prisma.portfolioProject.findMany({ select: { id: true, slug: true, coverStorageKey: true } }),
    prisma.portfolioImage.findMany({
      select: { id: true, storageKey: true, project: { select: { slug: true } } },
    }),
    prisma.studioMedia.findMany({ select: { id: true, r2KeyFull: true, r2KeyThumb: true } }),
    prisma.siteBackgroundVideo.findMany({
      select: { id: true, title: true, storageKey: true, webStorageKey: true, posterKey: true },
    }),
    prisma.designProject.findMany({ select: { id: true, slug: true, ogImageKey: true, specimenBlocks: true } }),
    prisma.workProject.findMany({
      select: { slug: true, title: true, backgroundMediaUrl: true, backgroundPosterUrl: true },
    }),
    prisma.siteSetting.findMany({ select: { key: true, value: true } }),
  ]);

  const refs: BrightlineMediaRef[] = [];
  const seen = new Set<string>();

  for (const a of assets) {
    pushRef(refs, seen, a.keyFull, "Media asset · full", "mediaAsset.keyFull");
    pushRef(refs, seen, a.keyThumb, "Media asset · thumb", "mediaAsset.keyThumb");
    pushRef(refs, seen, a.posterKey, "Media asset · poster", "mediaAsset.posterKey");
  }
  for (const g of galleryImages) {
    const title = g.gallery?.title ?? "Gallery";
    pushRef(refs, seen, g.storageKey, `Client gallery · ${title}`, "galleryImage.storageKey");
    pushRef(refs, seen, g.lowResStorageKey, `Client gallery · ${title} (low-res)`, "galleryImage.lowResStorageKey");
  }
  for (const v of galleryVideos) {
    const title = v.gallery?.title ?? "Gallery";
    pushRef(refs, seen, v.storageKey, `Client gallery video · ${title}`, "galleryVideo.storageKey");
    pushRef(refs, seen, v.posterKey, `Client gallery poster · ${title}`, "galleryVideo.posterKey");
  }
  for (const d of deliveryItems) {
    pushRef(refs, seen, d.storageKey, "Delivery package", "deliveryPackageItem.storageKey");
  }
  for (const p of portfolioProjects) {
    pushRef(refs, seen, p.coverStorageKey, `Portfolio · ${p.slug ?? "project"}`, "portfolioProject.coverStorageKey");
  }
  for (const p of portfolioImages) {
    const slug = p.project?.slug ?? "project";
    pushRef(refs, seen, p.storageKey, `Portfolio image · ${slug}`, "portfolioImage.storageKey");
  }
  for (const m of studioMedia) {
    pushRef(refs, seen, m.r2KeyFull, "Studio media · full", "studioMedia.r2KeyFull");
    pushRef(refs, seen, m.r2KeyThumb, "Studio media · thumb", "studioMedia.r2KeyThumb");
  }
  for (const b of siteBg) {
    const label = b.title ?? "Background";
    pushRef(refs, seen, b.storageKey, `Site background · ${label}`, "siteBackgroundVideo.storageKey");
    pushRef(refs, seen, b.webStorageKey, `Site background · ${label} (web)`, "siteBackgroundVideo.webStorageKey");
    pushRef(refs, seen, b.posterKey, `Site background · ${label} (poster)`, "siteBackgroundVideo.posterKey");
  }
  for (const d of designProjects) {
    pushRef(refs, seen, d.ogImageKey, `Design · ${d.slug ?? "project"}`, "designProject.ogImageKey");
    pushFromUnknown(refs, seen, d.specimenBlocks, `Design · ${d.slug ?? "project"}`, "designProject.specimenBlocks");
  }
  for (const w of workProjects) {
    const label = w.title ?? w.slug ?? "Work";
    pushRef(refs, seen, w.backgroundMediaUrl, `Work · ${label}`, "workProject.backgroundMediaUrl");
    pushRef(refs, seen, w.backgroundPosterUrl, `Work · ${label} (poster)`, "workProject.backgroundPosterUrl");
  }
  for (const s of settings) {
    if (!s.value) continue;
    try {
      pushFromUnknown(refs, seen, JSON.parse(s.value), `Site setting · ${s.key}`, "siteSetting.value");
    } catch {
      pushRef(refs, seen, s.value, `Site setting · ${s.key}`, "siteSetting.value");
    }
  }

  return refs;
}
