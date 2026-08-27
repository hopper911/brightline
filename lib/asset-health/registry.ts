/**
 * Unified asset reference registry — single source for "live" (referenced) keys.
 */

import { prisma } from "@/lib/prisma";
import { collectKeysFromUnknown, looksLikeR2Key } from "@/lib/admin-r2-hygiene";
import {
  fetchMirotechCmsMediaRefs,
  inferVaultForMediaKey,
  type MirotechCmsMediaRef,
} from "@/lib/admin-r2-mirotech-cms-keys";
import { inferVaultFromPrefix, type R2VaultId } from "@/lib/r2-vaults-shared";

export type AssetRefSource = "brightline-db" | "mirotech-cms";

export type AssetRef = {
  key: string;
  vault: R2VaultId;
  source: AssetRefSource;
  entityType: string;
  entityId: string;
  field: string;
  label: string;
  editHref?: string;
};

function normalizeKey(value: string | null | undefined): string | null {
  if (!looksLikeR2Key(value)) return null;
  return value!.trim().replace(/^\/+/, "");
}

function vaultForKey(key: string): R2VaultId {
  return inferVaultFromPrefix(key) ?? inferVaultForMediaKey(key);
}

function pushRef(
  refs: AssetRef[],
  key: string | null | undefined,
  opts: Omit<AssetRef, "key" | "vault" | "source">
) {
  const normalized = normalizeKey(key);
  if (!normalized) return;
  refs.push({
    key: normalized,
    vault: vaultForKey(normalized),
    source: "brightline-db",
    ...opts,
  });
}

function pushFromUnknown(
  refs: AssetRef[],
  value: unknown,
  opts: Omit<AssetRef, "key" | "vault" | "source" | "field"> & { field: string }
) {
  const keys = new Set<string>();
  collectKeysFromUnknown(value, keys);
  for (const key of keys) {
    pushRef(refs, key, { ...opts, field: opts.field });
  }
}

function mirotechRefToAssetRef(ref: MirotechCmsMediaRef): AssetRef {
  const editHref =
    ref.context === "journal"
      ? `https://mirotech.solutions/journal/${encodeURIComponent(ref.slug)}`
      : `https://mirotech.solutions/work/${encodeURIComponent(ref.slug)}`;
  return {
    key: ref.key,
    vault: ref.vault,
    source: "mirotech-cms",
    entityType: ref.context === "journal" ? "MirotechJournal" : "MirotechCaseStudy",
    entityId: ref.slug,
    field: ref.field,
    label: ref.sourceLabel,
    editHref,
  };
}

/** Collect all Brightline Prisma-backed references with labels and edit links. */
export async function collectBrightlineDbAssetRefs(): Promise<AssetRef[]> {
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
    studioProjects,
    invoices,
    expenses,
    documents,
    settings,
  ] = await Promise.all([
    prisma.mediaAsset.findMany({
      select: {
        id: true,
        keyFull: true,
        keyThumb: true,
        posterKey: true,
        projectMedia: { select: { projectId: true } },
        heroFor: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.galleryImage.findMany({
      select: {
        id: true,
        storageKey: true,
        lowResStorageKey: true,
        gallery: { select: { id: true, title: true } },
      },
    }),
    prisma.galleryVideo.findMany({
      select: {
        id: true,
        storageKey: true,
        posterKey: true,
        gallery: { select: { id: true, title: true } },
      },
    }),
    prisma.deliveryPackageItem.findMany({
      select: { id: true, storageKey: true, deliveryPackageId: true },
    }),
    prisma.portfolioProject.findMany({ select: { id: true, slug: true, coverStorageKey: true } }),
    prisma.portfolioImage.findMany({
      select: { id: true, storageKey: true, project: { select: { slug: true } } },
    }),
    prisma.studioMedia.findMany({ select: { id: true, r2KeyFull: true, r2KeyThumb: true } }),
    prisma.siteBackgroundVideo.findMany({
      select: { id: true, title: true, storageKey: true, webStorageKey: true, posterKey: true },
    }),
    prisma.designProject.findMany({
      select: { id: true, slug: true, ogImageKey: true, specimenBlocks: true },
    }),
    prisma.workProject.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        backgroundMediaUrl: true,
        backgroundPosterUrl: true,
        galleryBlocks: true,
        storyChapters: true,
      },
    }),
    prisma.studioProject.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        backgroundMediaUrl: true,
        gallery: true,
        galleryBlocks: true,
        storyChapters: true,
      },
    }),
    prisma.studioInvoice.findMany({ select: { id: true, pdfStorageKey: true } }),
    prisma.studioExpense.findMany({ select: { id: true, receiptKey: true } }),
    prisma.generatedDocument.findMany({
      select: { id: true, draftPdfKey: true, signedPdfKey: true },
    }),
    prisma.siteSetting.findMany({ select: { key: true, value: true } }),
  ]);

  const refs: AssetRef[] = [];

  for (const a of assets) {
    const workId = a.heroFor[0]?.id ?? a.projectMedia[0]?.projectId;
    const editHref = workId ? `/admin/work/${workId}` : `/admin/media/${a.id}`;
    const label = a.heroFor[0]?.title ?? "Media asset";
    pushRef(refs, a.keyFull, {
      entityType: "MediaAsset",
      entityId: a.id,
      field: "keyFull",
      label: `${label} · full`,
      editHref,
    });
    pushRef(refs, a.keyThumb, {
      entityType: "MediaAsset",
      entityId: a.id,
      field: "keyThumb",
      label: `${label} · thumb`,
      editHref,
    });
    pushRef(refs, a.posterKey, {
      entityType: "MediaAsset",
      entityId: a.id,
      field: "posterKey",
      label: `${label} · poster`,
      editHref,
    });
  }

  for (const g of galleryImages) {
    const title = g.gallery?.title ?? "Gallery";
    const editHref = g.gallery ? `/admin/galleries/${g.gallery.id}` : undefined;
    pushRef(refs, g.storageKey, {
      entityType: "GalleryImage",
      entityId: g.id,
      field: "storageKey",
      label: `Client gallery · ${title}`,
      editHref,
    });
    pushRef(refs, g.lowResStorageKey, {
      entityType: "GalleryImage",
      entityId: g.id,
      field: "lowResStorageKey",
      label: `Client gallery · ${title} (low-res)`,
      editHref,
    });
  }

  for (const v of galleryVideos) {
    const title = v.gallery?.title ?? "Gallery";
    const editHref = v.gallery ? `/admin/galleries/${v.gallery.id}` : undefined;
    pushRef(refs, v.storageKey, {
      entityType: "GalleryVideo",
      entityId: v.id,
      field: "storageKey",
      label: `Client gallery video · ${title}`,
      editHref,
    });
    pushRef(refs, v.posterKey, {
      entityType: "GalleryVideo",
      entityId: v.id,
      field: "posterKey",
      label: `Client gallery poster · ${title}`,
      editHref,
    });
  }

  for (const d of deliveryItems) {
    pushRef(refs, d.storageKey, {
      entityType: "DeliveryPackageItem",
      entityId: d.id,
      field: "storageKey",
      label: "Delivery package",
    });
  }

  for (const p of portfolioProjects) {
    pushRef(refs, p.coverStorageKey, {
      entityType: "PortfolioProject",
      entityId: p.id,
      field: "coverStorageKey",
      label: `Portfolio · ${p.slug ?? "project"}`,
    });
  }

  for (const p of portfolioImages) {
    const slug = p.project?.slug ?? "project";
    pushRef(refs, p.storageKey, {
      entityType: "PortfolioImage",
      entityId: p.id,
      field: "storageKey",
      label: `Portfolio image · ${slug}`,
    });
  }

  for (const m of studioMedia) {
    pushRef(refs, m.r2KeyFull, {
      entityType: "StudioMedia",
      entityId: m.id,
      field: "r2KeyFull",
      label: "Studio media · full",
    });
    pushRef(refs, m.r2KeyThumb, {
      entityType: "StudioMedia",
      entityId: m.id,
      field: "r2KeyThumb",
      label: "Studio media · thumb",
    });
  }

  for (const b of siteBg) {
    const label = b.title ?? "Background";
    pushRef(refs, b.storageKey, {
      entityType: "SiteBackgroundVideo",
      entityId: b.id,
      field: "storageKey",
      label: `Site background · ${label}`,
      editHref: "/admin/background-videos",
    });
    pushRef(refs, b.webStorageKey, {
      entityType: "SiteBackgroundVideo",
      entityId: b.id,
      field: "webStorageKey",
      label: `Site background · ${label} (web)`,
      editHref: "/admin/background-videos",
    });
    pushRef(refs, b.posterKey, {
      entityType: "SiteBackgroundVideo",
      entityId: b.id,
      field: "posterKey",
      label: `Site background · ${label} (poster)`,
      editHref: "/admin/background-videos",
    });
  }

  for (const d of designProjects) {
    pushRef(refs, d.ogImageKey, {
      entityType: "DesignProject",
      entityId: d.id,
      field: "ogImageKey",
      label: `Design · ${d.slug ?? "project"}`,
      editHref: `/admin/design/${d.id}`,
    });
    pushFromUnknown(refs, d.specimenBlocks, {
      entityType: "DesignProject",
      entityId: d.id,
      field: "specimenBlocks",
      label: `Design · ${d.slug ?? "project"}`,
      editHref: `/admin/design/${d.id}`,
    });
  }

  for (const w of workProjects) {
    const label = w.title ?? w.slug ?? "Work";
    const editHref = `/admin/work/${w.id}`;
    pushRef(refs, w.backgroundMediaUrl, {
      entityType: "WorkProject",
      entityId: w.id,
      field: "backgroundMediaUrl",
      label: `Work · ${label} · background`,
      editHref,
    });
    pushRef(refs, w.backgroundPosterUrl, {
      entityType: "WorkProject",
      entityId: w.id,
      field: "backgroundPosterUrl",
      label: `Work · ${label} · background poster`,
      editHref,
    });
    pushFromUnknown(refs, w.galleryBlocks, {
      entityType: "WorkProject",
      entityId: w.id,
      field: "galleryBlocks",
      label: `Work · ${label} · gallery`,
      editHref,
    });
    pushFromUnknown(refs, w.storyChapters, {
      entityType: "WorkProject",
      entityId: w.id,
      field: "storyChapters",
      label: `Work · ${label} · story`,
      editHref,
    });
  }

  for (const s of studioProjects) {
    const label = s.title ?? s.slug ?? "Studio";
    const editHref = `/admin/studio/projects/${s.id}`;
    pushRef(refs, s.backgroundMediaUrl, {
      entityType: "StudioProject",
      entityId: s.id,
      field: "backgroundMediaUrl",
      label: `Studio · ${label} · background`,
      editHref,
    });
    pushFromUnknown(refs, s.gallery, {
      entityType: "StudioProject",
      entityId: s.id,
      field: "gallery",
      label: `Studio · ${label} · gallery`,
      editHref,
    });
    pushFromUnknown(refs, s.galleryBlocks, {
      entityType: "StudioProject",
      entityId: s.id,
      field: "galleryBlocks",
      label: `Studio · ${label} · gallery blocks`,
      editHref,
    });
    pushFromUnknown(refs, s.storyChapters, {
      entityType: "StudioProject",
      entityId: s.id,
      field: "storyChapters",
      label: `Studio · ${label} · story`,
      editHref,
    });
  }

  for (const i of invoices) {
    pushRef(refs, i.pdfStorageKey, {
      entityType: "StudioInvoice",
      entityId: i.id,
      field: "pdfStorageKey",
      label: "Studio invoice PDF",
    });
  }

  for (const e of expenses) {
    pushRef(refs, e.receiptKey, {
      entityType: "StudioExpense",
      entityId: e.id,
      field: "receiptKey",
      label: "Studio expense receipt",
    });
  }

  for (const d of documents) {
    pushRef(refs, d.draftPdfKey, {
      entityType: "GeneratedDocument",
      entityId: d.id,
      field: "draftPdfKey",
      label: "Generated document · draft",
    });
    pushRef(refs, d.signedPdfKey, {
      entityType: "GeneratedDocument",
      entityId: d.id,
      field: "signedPdfKey",
      label: "Generated document · signed",
    });
  }

  for (const s of settings) {
    if (!s.value) continue;
    try {
      pushFromUnknown(refs, JSON.parse(s.value), {
        entityType: "SiteSetting",
        entityId: s.key,
        field: "value",
        label: `Site setting · ${s.key}`,
        editHref: "/admin/settings",
      });
    } catch {
      pushRef(refs, s.value, {
        entityType: "SiteSetting",
        entityId: s.key,
        field: "value",
        label: `Site setting · ${s.key}`,
        editHref: "/admin/settings",
      });
    }
  }

  return refs;
}

let refsCache: { at: number; refs: AssetRef[]; byKey: Map<string, AssetRef[]> } | null = null;

/** All references from Brightline DB + Mirotech CMS. */
export async function collectAllAssetRefs(options?: { ttlMs?: number }): Promise<AssetRef[]> {
  const ttl = options?.ttlMs ?? 30_000;
  if (refsCache && Date.now() - refsCache.at < ttl) {
    return refsCache.refs;
  }

  const [brightline, cmsRefs] = await Promise.all([
    collectBrightlineDbAssetRefs(),
    fetchMirotechCmsMediaRefs(),
  ]);

  const refs: AssetRef[] = [...brightline, ...cmsRefs.map(mirotechRefToAssetRef)];
  const byKey = new Map<string, AssetRef[]>();
  for (const ref of refs) {
    const list = byKey.get(ref.key) ?? [];
    list.push(ref);
    byKey.set(ref.key, list);
  }

  refsCache = { at: Date.now(), refs, byKey };
  return refs;
}

export function invalidateAssetRefCache() {
  refsCache = null;
}

export async function collectReferencedKeySet(ttlMs = 30_000): Promise<Set<string>> {
  const refs = await collectAllAssetRefs({ ttlMs });
  return new Set(refs.map((r) => r.key));
}

export async function refsByKey(ttlMs = 30_000): Promise<Map<string, AssetRef[]>> {
  await collectAllAssetRefs({ ttlMs });
  return refsCache?.byKey ?? new Map();
}

export async function findAssetRefsForKey(key: string): Promise<AssetRef[]> {
  const clean = key.trim().replace(/^\/+/, "");
  const map = await refsByKey();
  return map.get(clean) ?? [];
}

export function groupRefsByKey(refs: AssetRef[]): Map<string, AssetRef[]> {
  const map = new Map<string, AssetRef[]>();
  for (const ref of refs) {
    const list = map.get(ref.key) ?? [];
    list.push(ref);
    map.set(ref.key, list);
  }
  return map;
}
