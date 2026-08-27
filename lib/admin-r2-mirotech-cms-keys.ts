/**
 * Extract R2 keys referenced by published mirotech.solutions CMS content.
 * Case studies often use Brightline portfolio/ pillars, not Mirotech CMS bucket keys.
 */

import type { DualBrandJournalPost, DualBrandWorkProject } from "@/lib/dual-brand/content-api";
import {
  fetchMirotechSiteJournal,
  fetchMirotechSiteWork,
  fetchMirotechSiteWorkBySlug,
} from "@/lib/dual-brand/content-api";
import { extractPublicMediaKey } from "@/lib/r2";
import { inferVaultFromPrefix, type R2VaultId } from "@/lib/r2-vaults-shared";

export type MirotechCmsMediaRef = {
  key: string;
  vault: R2VaultId;
  sourceLabel: string;
  context: "work" | "journal";
  slug: string;
  field: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/** R2 object key — accepts raw keys, `/api/media/public?key=`, and Mirotech CDN URLs. */
export function normalizeCmsMediaKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("/api/media/public")) return null;
  if (/^https?:\/\//i.test(raw)) {
    return extractPublicMediaKey(raw);
  }
  const key = extractPublicMediaKey(raw) ?? raw.replace(/^\/+/, "");
  if (!key || key.includes("..")) return null;
  return key;
}

export function inferVaultForMediaKey(key: string): R2VaultId {
  return inferVaultFromPrefix(key) ?? "brightline";
}

function pushKey(
  out: MirotechCmsMediaRef[],
  seen: Set<string>,
  key: string | null,
  opts: { context: "work" | "journal"; slug: string; field: string }
) {
  if (!key) return;
  const dedupe = `${opts.context}:${key}`;
  if (seen.has(dedupe)) return;
  seen.add(dedupe);
  const vault = inferVaultForMediaKey(key);
  out.push({
    key,
    vault,
    sourceLabel: `CMS · ${opts.slug} · ${opts.field}`,
    context: opts.context,
    slug: opts.slug,
    field: opts.field,
  });
}

function extractFromSectionData(
  out: MirotechCmsMediaRef[],
  seen: Set<string>,
  slug: string,
  sectionType: string,
  sectionTitle: string | undefined,
  data: unknown
) {
  const row = asRecord(data);
  const label = sectionTitle?.trim() || sectionType || "section";
  const fieldBase = `section:${label}`;

  pushKey(out, seen, normalizeCmsMediaKey(row.src), {
    context: "work",
    slug,
    field: `${fieldBase}:src`,
  });
  pushKey(out, seen, normalizeCmsMediaKey(row.url), {
    context: "work",
    slug,
    field: `${fieldBase}:url`,
  });
  pushKey(out, seen, normalizeCmsMediaKey(row.key), {
    context: "work",
    slug,
    field: `${fieldBase}:key`,
  });
  pushKey(out, seen, normalizeCmsMediaKey(row.poster), {
    context: "work",
    slug,
    field: `${fieldBase}:poster`,
  });
  pushKey(out, seen, normalizeCmsMediaKey(row.posterKey), {
    context: "work",
    slug,
    field: `${fieldBase}:posterKey`,
  });

  const images = row.images;
  if (Array.isArray(images)) {
    images.forEach((item, i) => {
      if (typeof item === "string") {
        pushKey(out, seen, normalizeCmsMediaKey(item), {
          context: "work",
          slug,
          field: `${fieldBase}:gallery[${i}]`,
        });
        return;
      }
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const img = item as Record<string, unknown>;
        pushKey(out, seen, normalizeCmsMediaKey(img.src), {
          context: "work",
          slug,
          field: `${fieldBase}:gallery[${i}]`,
        });
        pushKey(out, seen, normalizeCmsMediaKey(img.url), {
          context: "work",
          slug,
          field: `${fieldBase}:gallery[${i}]`,
        });
        pushKey(out, seen, normalizeCmsMediaKey(img.key), {
          context: "work",
          slug,
          field: `${fieldBase}:gallery[${i}]`,
        });
      }
    });
  }
}

/** Extract R2 keys from a work project (hero + sections). Pure for tests. */
export function extractMediaRefsFromWorkProject(project: DualBrandWorkProject): MirotechCmsMediaRef[] {
  const out: MirotechCmsMediaRef[] = [];
  const seen = new Set<string>();
  const slug = project.slug || project.id;

  pushKey(out, seen, normalizeCmsMediaKey(project.heroImage), {
    context: "work",
    slug,
    field: "heroImage",
  });
  pushKey(out, seen, normalizeCmsMediaKey(project.thumbnailImage), {
    context: "work",
    slug,
    field: "thumbnailImage",
  });
  pushKey(out, seen, normalizeCmsMediaKey(project.backgroundMedia), {
    context: "work",
    slug,
    field: "backgroundMedia",
  });
  pushKey(out, seen, normalizeCmsMediaKey(project.backgroundPoster), {
    context: "work",
    slug,
    field: "backgroundPoster",
  });

  for (const section of project.sections ?? []) {
    extractFromSectionData(out, seen, slug, section.type, section.title, section.data);
  }

  return out;
}

/** Extract R2 keys from a journal post. Pure for tests. */
export function extractMediaRefsFromJournalPost(post: DualBrandJournalPost): MirotechCmsMediaRef[] {
  const out: MirotechCmsMediaRef[] = [];
  const seen = new Set<string>();
  const slug = post.slug || post.id;

  pushKey(out, seen, normalizeCmsMediaKey(post.heroImage), {
    context: "journal",
    slug,
    field: "heroImage",
  });
  pushKey(out, seen, normalizeCmsMediaKey(post.backgroundMedia), {
    context: "journal",
    slug,
    field: "backgroundMedia",
  });
  pushKey(out, seen, normalizeCmsMediaKey(post.backgroundPoster), {
    context: "journal",
    slug,
    field: "backgroundPoster",
  });

  const payload = post.articlePayload;
  if (payload?.galleryImages) {
    payload.galleryImages.forEach((img, i) => {
      pushKey(out, seen, normalizeCmsMediaKey(img.url), {
        context: "journal",
        slug,
        field: `galleryImages[${i}]`,
      });
    });
  }
  if (payload?.galleryBlocks) {
    payload.galleryBlocks.forEach((block, bi) => {
      (block.urls ?? []).forEach((url, ui) => {
        pushKey(out, seen, normalizeCmsMediaKey(url), {
          context: "journal",
          slug,
          field: `galleryBlocks[${bi}][${ui}]`,
        });
      });
    });
  }

  return out;
}

/** Fetch live MIROTECH CMS and return deduped R2 key references. */
export async function fetchMirotechCmsMediaRefs(): Promise<MirotechCmsMediaRef[]> {
  const out: MirotechCmsMediaRef[] = [];
  const seen = new Set<string>();

  const workList = await fetchMirotechSiteWork();
  const detailResults = await Promise.all(
    workList.map((p) => fetchMirotechSiteWorkBySlug(p.slug))
  );

  for (const project of detailResults) {
    if (!project) continue;
    for (const ref of extractMediaRefsFromWorkProject(project)) {
      const dedupe = `${ref.context}:${ref.key}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push(ref);
    }
  }

  const journalPosts = await fetchMirotechSiteJournal();
  for (const post of journalPosts) {
    for (const ref of extractMediaRefsFromJournalPost(post)) {
      const dedupe = `${ref.context}:${ref.key}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push(ref);
    }
  }

  return out;
}
