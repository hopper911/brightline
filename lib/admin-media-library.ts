/**
 * Unified admin Media Library — Brightline WorkProject media + Mirotech CMS refs.
 */

import type { MediaKind, WorkSection } from "@prisma/client";
import {
  fetchMirotechCmsMediaRefs,
  inferVaultForMediaKey,
  type MirotechCmsMediaRef,
} from "@/lib/admin-r2-mirotech-cms-keys";
import { detectR2Kind, previewUrlForKey } from "@/lib/admin-r2-manager";
import { fetchMirotechSiteJournal, fetchMirotechSiteWork } from "@/lib/dual-brand/content-api";
import { prisma } from "@/lib/prisma";
import { getSectionToPillarSlugMap } from "@/lib/work-pillar-settings";
import { WORK_SECTIONS } from "@/lib/portfolioPillars";
import type { R2VaultId } from "@/lib/r2-vaults-shared";

export type MediaLibrarySource = "brightline-work" | "mirotech-work" | "mirotech-journal";

export type MediaLibraryProjectOption = {
  id: string;
  title: string;
  slug: string;
  pillarSlug: string;
  source: "brightline-work" | "mirotech";
};

export type MediaLibraryItem = {
  id: string;
  source: MediaLibrarySource;
  kind: MediaKind | "OTHER";
  keyFull: string | null;
  keyThumb: string | null;
  posterKey: string | null;
  providerId: string | null;
  alt: string | null;
  previewUrl: string;
  vault: R2VaultId;
  projectId: string;
  projectTitle: string;
  projectSlug: string;
  pillarSlug: string;
  contextLabel: string;
  editHref: string;
  reviewHref: string | null;
  isHero: boolean;
};

function kindFromKey(key: string | null | undefined): MediaKind | "OTHER" {
  if (!key) return "OTHER";
  const detected = detectR2Kind(key);
  if (detected === "video") return "VIDEO";
  if (detected === "image") return "IMAGE";
  return "OTHER";
}

function previewForKey(key: string | null | undefined, vault: R2VaultId): string {
  if (!key?.trim()) return "";
  return previewUrlForKey(key.trim(), vault);
}

function matchesTypeFilter(kind: MediaKind | "OTHER", typeParam: string): boolean {
  if (!typeParam) return true;
  if (typeParam === "video") return kind === "VIDEO";
  if (typeParam === "image") return kind === "IMAGE";
  return true;
}

function matchesSearch(
  item: Pick<MediaLibraryItem, "keyFull" | "keyThumb" | "projectTitle" | "projectSlug" | "contextLabel">,
  search: string
): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  const key = item.keyFull ?? item.keyThumb ?? "";
  const filename = key.split("/").pop() ?? "";
  return (
    key.toLowerCase().includes(q) ||
    filename.toLowerCase().includes(q) ||
    item.projectTitle.toLowerCase().includes(q) ||
    item.projectSlug.toLowerCase().includes(q) ||
    item.contextLabel.toLowerCase().includes(q)
  );
}

function mirotechPillarSlug(project: {
  brightlineSection?: string | null;
  categories?: string[];
}): string {
  const section = (project.brightlineSection ?? "").trim().toLowerCase();
  if (section) return section;
  const cat = project.categories?.[0]?.trim().toLowerCase();
  return cat || "mirotech";
}

function mirotechEditHref(project: { brightlineExternalId?: string; slug: string }): string {
  if (project.brightlineExternalId?.trim()) {
    return `/admin/studio-cms/${encodeURIComponent(project.brightlineExternalId.trim())}`;
  }
  return `https://mirotech.solutions/work/${encodeURIComponent(project.slug)}`;
}

function journalEditHref(post: { slug: string }): string {
  return `https://mirotech.solutions/journal/${encodeURIComponent(post.slug)}`;
}

function pushMirotechRefItem(
  items: MediaLibraryItem[],
  seen: Set<string>,
  ref: MirotechCmsMediaRef,
  project: {
    id: string;
    title: string;
    slug: string;
    brightlineSection?: string | null;
    categories?: string[];
    brightlineExternalId?: string;
  },
  editHref: string
) {
  const dedupe = `${ref.context}:${ref.key}`;
  if (seen.has(dedupe)) return;
  seen.add(dedupe);

  const vault = ref.vault ?? inferVaultForMediaKey(ref.key);
  const kind = kindFromKey(ref.key);
  const id = `mirotech:${ref.context}:${project.slug}:${ref.field}:${ref.key}`;

  items.push({
    id,
    source: ref.context === "journal" ? "mirotech-journal" : "mirotech-work",
    kind,
    keyFull: ref.key,
    keyThumb: null,
    posterKey: null,
    providerId: null,
    alt: null,
    previewUrl: previewForKey(ref.key, vault),
    vault,
    projectId: project.id,
    projectTitle: project.title,
    projectSlug: project.slug,
    pillarSlug: mirotechPillarSlug(project),
    contextLabel: ref.sourceLabel,
    editHref,
    reviewHref: null,
    isHero: ref.field === "heroImage" || ref.field.includes("hero"),
  });
}

export async function fetchBrightlineWorkMediaItems(options: {
  sectionSlug?: string;
  projectId?: string;
}): Promise<{ items: MediaLibraryItem[]; projects: MediaLibraryProjectOption[] }> {
  const sectionMap = await getSectionToPillarSlugMap();

  const whereSection: { section?: WorkSection | { in: WorkSection[] } } = {};
  if (options.sectionSlug?.trim()) {
    const slug = options.sectionSlug.trim().toLowerCase();
    const sections = WORK_SECTIONS.filter((s) => sectionMap[s] === slug);
    if (sections.length > 0) {
      whereSection.section = { in: sections };
    }
  }

  const projectWhere = {
    ...(Object.keys(whereSection).length > 0 ? whereSection : {}),
    ...(options.projectId?.trim() ? { id: options.projectId.trim() } : {}),
  };

  const projects = await prisma.workProject.findMany({
    where: Object.keys(projectWhere).length > 0 ? projectWhere : undefined,
    select: {
      id: true,
      title: true,
      slug: true,
      section: true,
      heroMediaId: true,
      backgroundMediaUrl: true,
      backgroundPosterUrl: true,
      heroMedia: {
        select: {
          id: true,
          kind: true,
          alt: true,
          keyFull: true,
          keyThumb: true,
          posterKey: true,
          providerId: true,
        },
      },
      media: {
        include: {
          media: {
            select: {
              id: true,
              kind: true,
              alt: true,
              keyFull: true,
              keyThumb: true,
              posterKey: true,
              providerId: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  const projectOptions: MediaLibraryProjectOption[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    pillarSlug: sectionMap[p.section],
    source: "brightline-work",
  }));

  const items: MediaLibraryItem[] = [];
  const seenAssetIds = new Set<string>();

  for (const project of projects) {
    const pillarSlug = sectionMap[project.section];
    const editHref = `/admin/work/${project.id}`;

    const pushAsset = (
      media: {
        id: string;
        kind: MediaKind;
        alt: string | null;
        keyFull: string | null;
        keyThumb: string | null;
        posterKey: string | null;
        providerId: string | null;
      },
      contextLabel: string,
      isHero: boolean
    ) => {
      if (seenAssetIds.has(media.id)) return;
      seenAssetIds.add(media.id);
      const vault = inferVaultForMediaKey(media.keyFull ?? media.keyThumb ?? "") ?? "brightline";
      const previewKey = media.keyThumb ?? media.keyFull ?? media.posterKey;
      items.push({
        id: media.id,
        source: "brightline-work",
        kind: media.kind,
        keyFull: media.keyFull,
        keyThumb: media.keyThumb,
        posterKey: media.posterKey,
        providerId: media.providerId,
        alt: media.alt,
        previewUrl: media.providerId
          ? `https://img.youtube.com/vi/${media.providerId}/hqdefault.jpg`
          : previewKey
            ? previewForKey(previewKey, vault)
            : "",
        vault,
        projectId: project.id,
        projectTitle: project.title,
        projectSlug: project.slug,
        pillarSlug,
        contextLabel,
        editHref,
        reviewHref: `/admin/media/${media.id}`,
        isHero,
      });
    };

    if (project.heroMedia) {
      pushAsset(project.heroMedia, "Hero", true);
    }

    for (const pm of project.media) {
      if (pm.media.id === project.heroMediaId) {
        pushAsset(pm.media, "Hero (gallery)", true);
      } else {
        pushAsset(pm.media, "Gallery", false);
      }
    }

    const pushBackgroundKey = (key: string | null | undefined, label: string) => {
      const normalized = key?.trim();
      if (!normalized) return;
      const vault = inferVaultForMediaKey(normalized);
      const kind = kindFromKey(normalized);
      const syntheticId = `brightline-work:bg:${project.id}:${label}`;
      if (seenAssetIds.has(syntheticId)) return;
      seenAssetIds.add(syntheticId);
      items.push({
        id: syntheticId,
        source: "brightline-work",
        kind,
        keyFull: normalized,
        keyThumb: null,
        posterKey: null,
        providerId: null,
        alt: null,
        previewUrl: previewForKey(normalized, vault),
        vault,
        projectId: project.id,
        projectTitle: project.title,
        projectSlug: project.slug,
        pillarSlug,
        contextLabel: label,
        editHref,
        reviewHref: null,
        isHero: false,
      });
    };

    pushBackgroundKey(project.backgroundMediaUrl, "Background media");
    pushBackgroundKey(project.backgroundPosterUrl, "Background poster");
  }

  return { items, projects: projectOptions };
}

export async function fetchMirotechCmsMediaItems(options: {
  sectionSlug?: string;
  projectSlug?: string;
}): Promise<{ items: MediaLibraryItem[]; projects: MediaLibraryProjectOption[] }> {
  const workList = await fetchMirotechSiteWork();
  const journalList = await fetchMirotechSiteJournal();
  const workBySlug = new Map(workList.map((p) => [p.slug, p]));
  const journalBySlug = new Map(journalList.map((p) => [p.slug, p]));

  const projectOptions: MediaLibraryProjectOption[] = [
    ...workList.map((p) => ({
      id: `mirotech-work:${p.slug}`,
      title: p.title,
      slug: p.slug,
      pillarSlug: mirotechPillarSlug(p),
      source: "mirotech" as const,
    })),
    ...journalList.map((p) => ({
      id: `mirotech-journal:${p.slug}`,
      title: p.title,
      slug: p.slug,
      pillarSlug: "journal",
      source: "mirotech" as const,
    })),
  ];

  const sectionSlug = options.sectionSlug?.trim().toLowerCase();
  const projectSlugFilter = options.projectSlug?.trim().toLowerCase();

  const items: MediaLibraryItem[] = [];
  const seen = new Set<string>();
  const refs = await fetchMirotechCmsMediaRefs();

  for (const ref of refs) {
    if (ref.context === "work") {
      const project = workBySlug.get(ref.slug);
      if (!project) continue;
      if (sectionSlug && mirotechPillarSlug(project) !== sectionSlug) continue;
      if (projectSlugFilter && project.slug.toLowerCase() !== projectSlugFilter) continue;
      pushMirotechRefItem(items, seen, ref, project, mirotechEditHref(project));
    } else {
      const post = journalBySlug.get(ref.slug);
      if (!post) continue;
      if (projectSlugFilter && post.slug.toLowerCase() !== projectSlugFilter) continue;
      if (sectionSlug && sectionSlug !== "journal") continue;
      pushMirotechRefItem(
        items,
        seen,
        ref,
        { id: post.id, title: post.title, slug: post.slug, categories: post.categories },
        journalEditHref(post)
      );
    }
  }

  return { items, projects: projectOptions };
}

export async function listMediaLibrary(options: {
  source?: "all" | "brightline" | "mirotech";
  sectionSlug?: string;
  type?: string;
  projectId?: string;
  search?: string;
}): Promise<{
  items: MediaLibraryItem[];
  projects: MediaLibraryProjectOption[];
}> {
  const source = options.source ?? "all";
  const typeParam = options.type?.trim().toLowerCase() ?? "";
  const search = options.search?.trim().toLowerCase() ?? "";

  let brightlineProjectId = options.projectId?.trim() ?? "";
  let mirotechProjectSlug = "";
  if (brightlineProjectId.startsWith("mirotech-work:")) {
    mirotechProjectSlug = brightlineProjectId.replace(/^mirotech-work:/, "");
    brightlineProjectId = "";
  } else if (brightlineProjectId.startsWith("mirotech-journal:")) {
    mirotechProjectSlug = brightlineProjectId.replace(/^mirotech-journal:/, "");
    brightlineProjectId = "";
  }

  const brightline =
    source === "all" || source === "brightline"
      ? await fetchBrightlineWorkMediaItems({
          sectionSlug: options.sectionSlug,
          projectId: brightlineProjectId || undefined,
        })
      : { items: [], projects: [] };

  const mirotech =
    source === "all" || source === "mirotech"
      ? await fetchMirotechCmsMediaItems({
          sectionSlug: options.sectionSlug,
          projectSlug: mirotechProjectSlug || undefined,
        })
      : { items: [], projects: [] };

  let items = [...brightline.items, ...mirotech.items];
  const projects = [...brightline.projects, ...mirotech.projects];

  if (typeParam) {
    items = items.filter((item) => matchesTypeFilter(item.kind, typeParam));
  }
  if (search) {
    items = items.filter((item) => matchesSearch(item, search));
  }

  items.sort(
    (a, b) =>
      a.pillarSlug.localeCompare(b.pillarSlug) ||
      a.projectTitle.localeCompare(b.projectTitle) ||
      (a.isHero === b.isHero ? 0 : a.isHero ? -1 : 1) ||
      a.contextLabel.localeCompare(b.contextLabel)
  );

  return { items, projects };
}
