import type { MediaAsset } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeProjectSlug, slugify } from "@/lib/slugify";

const STUDIO_PROJECT_INCLUDE = {
  heroImage: true,
} as const;

export type StudioProjectWithHero = Prisma.StudioProjectGetPayload<{
  include: typeof STUDIO_PROJECT_INCLUDE;
}>;

export type StudioGalleryMediaRow = {
  mediaId: string;
  sortOrder: number;
  media: MediaAsset;
};

export type StudioProjectWithHeroAndGallery = StudioProjectWithHero & {
  galleryMedia: StudioGalleryMediaRow[];
};

/** Admin list row (lightweight). */
export type StudioProjectListRow = {
  id: string;
  title: string;
  slug: string;
  client: string;
  category: string;
  location: string;
  year: number;
  published: boolean;
  featured: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
};

export async function listStudioProjectsForAdmin(filters: {
  category?: string;
  published?: boolean | null;
}): Promise<StudioProjectListRow[]> {
  const where: Prisma.StudioProjectWhereInput = {};
  const cat = filters.category?.trim();
  if (cat) {
    where.category = { contains: cat, mode: "insensitive" };
  }
  if (filters.published === true) where.published = true;
  if (filters.published === false) where.published = false;
  return prisma.studioProject.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      client: true,
      category: true,
      location: true,
      year: true,
      published: true,
      featured: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
}

/** Resolve `gallery` JSON into ordered `MediaAsset` rows for admin UI. */
export async function enrichStudioProjectWithGalleryMedia(
  project: StudioProjectWithHero
): Promise<StudioProjectWithHeroAndGallery> {
  const raw = project.gallery;
  if (!raw || !Array.isArray(raw)) {
    return { ...project, galleryMedia: [] };
  }
  const order: { mediaId: string; sortOrder: number }[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      order.push({ mediaId: entry, sortOrder: order.length });
    } else if (entry && typeof entry === "object" && "mediaId" in entry) {
      const mediaId = String((entry as { mediaId: unknown }).mediaId ?? "").trim();
      if (mediaId) {
        const so = (entry as { sortOrder?: number }).sortOrder;
        order.push({
          mediaId,
          sortOrder: typeof so === "number" && Number.isFinite(so) ? so : order.length,
        });
      }
    }
  }
  if (order.length === 0) {
    return { ...project, galleryMedia: [] };
  }
  const ids = [...new Set(order.map((o) => o.mediaId))];
  const assets = await prisma.mediaAsset.findMany({ where: { id: { in: ids } } });
  const map = new Map(assets.map((a) => [a.id, a]));
  const galleryMedia = order
    .map((o) => {
      const m = map.get(o.mediaId);
      if (!m) return null;
      return { mediaId: o.mediaId, sortOrder: o.sortOrder, media: m };
    })
    .filter((x): x is StudioGalleryMediaRow => x != null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return { ...project, galleryMedia };
}

function optTrim(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function requireNonEmpty(name: string, v: unknown): string {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
  if (!s) throw new Error(`${name} is required.`);
  return s;
}

function requireYear(name: string, v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new Error(`${name} must be a finite number.`);
  }
  return Math.trunc(v);
}

function toGalleryJson(input: unknown): Prisma.InputJsonValue {
  if (input === undefined || input === null) return [];
  if (Array.isArray(input)) return input as Prisma.InputJsonValue;
  if (typeof input === "object") return input as Prisma.InputJsonValue;
  throw new Error("gallery must be a JSON array or object.");
}

function parseTags(input: unknown): string[] {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) throw new Error("tags must be an array of strings.");
  return input.map((t) => String(t).trim()).filter(Boolean);
}

/** Globally unique slug; appends -2, -3, … on collision. */
export async function ensureUniqueStudioSlug(baseRaw: string, excludeId?: string): Promise<string> {
  const base = (baseRaw || "project").replace(/^-+|-+$/g, "") || "project";
  let candidate = base;
  let n = 2;
  for (;;) {
    const found = await prisma.studioProject.findUnique({ where: { slug: candidate } });
    if (!found || found.id === excludeId) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

async function assertHeroImageExists(heroImageId: string | null | undefined) {
  if (!heroImageId?.trim()) return;
  const m = await prisma.mediaAsset.findUnique({ where: { id: heroImageId.trim() } });
  if (!m) throw new Error("heroImageId does not reference an existing MediaAsset.");
}

/**
 * After R2 upload: append a `MediaAsset` to `StudioProject.gallery` and optionally set `heroImageId`.
 * Re-reads gallery inside a transaction so concurrent uploads append correctly.
 */
export async function attachMediaToStudioProject(params: {
  studioProjectId: string;
  mediaId: string;
  keyFull: string;
  alt: string | null;
  setAsHero: boolean;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const studio = await tx.studioProject.findUnique({ where: { id: params.studioProjectId } });
    if (!studio) throw new Error("Studio project not found.");
    const gallery: unknown[] = Array.isArray(studio.gallery) ? [...studio.gallery] : [];
    const sortOrder = gallery.length;
    gallery.push({
      mediaId: params.mediaId,
      key: params.keyFull,
      sortOrder,
      alt: params.alt ?? undefined,
    });
    const data: Prisma.StudioProjectUpdateInput = {
      gallery: gallery as Prisma.InputJsonValue,
    };
    if (params.setAsHero) {
      data.heroImage = { connect: { id: params.mediaId } };
    } else if (!studio.heroImageId) {
      data.heroImage = { connect: { id: params.mediaId } };
    }
    await tx.studioProject.update({
      where: { id: params.studioProjectId },
      data,
    });
  });
}

export async function createStudioProjectRecord(body: unknown): Promise<StudioProjectWithHero> {
  if (body === null || typeof body !== "object") {
    throw new Error("Request body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;

  const title = requireNonEmpty("title", b.title);
  const client = requireNonEmpty("client", b.client);
  const category = requireNonEmpty("category", b.category);
  const location = requireNonEmpty("location", b.location);
  const year = requireYear("year", b.year);
  const opening = requireNonEmpty("opening", b.opening);
  const context = requireNonEmpty("context", b.context);
  const approach = requireNonEmpty("approach", b.approach);
  const highlight = requireNonEmpty("highlight", b.highlight);
  const closing = requireNonEmpty("closing", b.closing);

  const slugInput = typeof b.slug === "string" ? b.slug.trim() : "";
  const baseSlug = slugInput || slugify(title);
  const slug = await ensureUniqueStudioSlug(baseSlug);

  const execution = optTrim(b.execution as string | null | undefined) ?? null;
  const subcategory = optTrim(b.subcategory as string | null | undefined) ?? null;
  const credits = optTrim(b.credits as string | null | undefined) ?? null;
  const heroImageId =
    typeof b.heroImageId === "string" && b.heroImageId.trim()
      ? b.heroImageId.trim()
      : null;

  await assertHeroImageExists(heroImageId);

  const gallery = toGalleryJson(b.gallery);
  const tags = parseTags(b.tags);

  const published = Boolean(b.published);
  let publishedAt: Date | null = null;
  if (b.publishedAt != null && String(b.publishedAt).trim() !== "") {
    publishedAt = new Date(String(b.publishedAt));
    if (Number.isNaN(publishedAt.getTime())) {
      throw new Error("publishedAt must be a valid date string.");
    }
  } else if (published) {
    publishedAt = new Date();
  }

  return prisma.studioProject.create({
    data: {
      title,
      slug,
      client,
      category,
      subcategory,
      location,
      year,
      opening,
      context,
      approach,
      highlight,
      execution,
      closing,
      seoTitle: optTrim(b.seoTitle as string | null) ?? null,
      seoDescription: optTrim(b.seoDescription as string | null) ?? null,
      tags,
      credits,
      featured: typeof b.featured === "boolean" ? b.featured : false,
      contentStatus:
        b.contentStatus === "CAPTION_DRAFTED" ||
        b.contentStatus === "WEBSITE_COPY_DRAFTED" ||
        b.contentStatus === "READY_TO_POST" ||
        b.contentStatus === "POSTED" ||
        b.contentStatus === "REUSABLE"
          ? b.contentStatus
          : "NONE",
      captionDrafted: typeof b.captionDrafted === "boolean" ? b.captionDrafted : false,
      websiteCopyDrafted:
        typeof b.websiteCopyDrafted === "boolean" ? b.websiteCopyDrafted : false,
      contentPosted: typeof b.contentPosted === "boolean" ? b.contentPosted : false,
      reusableLater: typeof b.reusableLater === "boolean" ? b.reusableLater : false,
      published,
      publishedAt,
      heroImageId,
      gallery,
    },
    include: STUDIO_PROJECT_INCLUDE,
  });
}

export type UpdateStudioProjectRecordBody = {
  title?: string;
  slug?: string | null;
  client?: string | null;
  category?: string | null;
  location?: string | null;
  year?: number | null;
  opening?: string | null;
  context?: string | null;
  approach?: string | null;
  highlight?: string | null;
  execution?: string | null;
  closing?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  tags?: string[];
  subcategory?: string | null;
  credits?: string | null;
  featured?: boolean;
  published?: boolean;
  publishedAt?: string | null;
  contentStatus?: string | null;
  captionDrafted?: boolean;
  websiteCopyDrafted?: boolean;
  contentPosted?: boolean;
  reusableLater?: boolean;
  heroImageId?: string | null;
  gallery?: unknown;
};

export async function updateStudioProjectRecord(
  id: string,
  body: unknown
): Promise<StudioProjectWithHero> {
  const existing = await prisma.studioProject.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Project not found.");
  }

  if (body === null || typeof body !== "object") {
    throw new Error("Request body must be a JSON object.");
  }
  const b = body as UpdateStudioProjectRecordBody;

  if (b.heroImageId !== undefined) {
    await assertHeroImageExists(b.heroImageId ?? null);
  }

  let nextSlug = existing.slug;
  if (b.slug !== undefined) {
    const raw = b.slug == null ? "" : String(b.slug).trim();
    const base = (raw || slugify(existing.title)).replace(/^-+|-+$/g, "") || "project";
    nextSlug = await ensureUniqueStudioSlug(base, id);
  }

  const data: Prisma.StudioProjectUpdateInput = {};

  if (b.title !== undefined) {
    data.title = requireNonEmpty("title", b.title);
  }
  if (b.slug !== undefined) {
    data.slug = nextSlug;
  }
  if (b.client !== undefined) {
    data.client = requireNonEmpty("client", b.client);
  }
  if (b.category !== undefined) {
    data.category = requireNonEmpty("category", b.category);
  }
  if (b.subcategory !== undefined) {
    data.subcategory = optTrim(b.subcategory) ?? null;
  }
  if (b.location !== undefined) {
    data.location = requireNonEmpty("location", b.location);
  }
  if (b.year !== undefined) {
    if (b.year === null) {
      throw new Error("year cannot be null.");
    }
    data.year = requireYear("year", b.year);
  }
  if (b.opening !== undefined) {
    data.opening = requireNonEmpty("opening", b.opening);
  }
  if (b.context !== undefined) {
    data.context = requireNonEmpty("context", b.context);
  }
  if (b.approach !== undefined) {
    data.approach = requireNonEmpty("approach", b.approach);
  }
  if (b.highlight !== undefined) {
    data.highlight = requireNonEmpty("highlight", b.highlight);
  }
  if (b.execution !== undefined) {
    data.execution = optTrim(b.execution) ?? null;
  }
  if (b.closing !== undefined) {
    data.closing = requireNonEmpty("closing", b.closing);
  }
  if (b.seoTitle !== undefined) {
    data.seoTitle = optTrim(b.seoTitle) ?? null;
  }
  if (b.seoDescription !== undefined) {
    data.seoDescription = optTrim(b.seoDescription) ?? null;
  }
  if (b.tags !== undefined) {
    data.tags = parseTags(b.tags);
  }
  if (b.credits !== undefined) {
    data.credits = optTrim(b.credits) ?? null;
  }
  if (typeof b.featured === "boolean") {
    data.featured = b.featured;
  }
  if (typeof b.published === "boolean") {
    data.published = b.published;
  }
  if (b.publishedAt !== undefined) {
    data.publishedAt =
      b.publishedAt == null || b.publishedAt === ""
        ? null
        : new Date(String(b.publishedAt));
  }
  if (typeof b.published === "boolean" && b.published === false) {
    data.publishedAt = null;
  }
  if (b.contentStatus !== undefined) {
    const status = b.contentStatus?.trim() || "NONE";
    if (
      status === "NONE" ||
      status === "CAPTION_DRAFTED" ||
      status === "WEBSITE_COPY_DRAFTED" ||
      status === "READY_TO_POST" ||
      status === "POSTED" ||
      status === "REUSABLE"
    ) {
      data.contentStatus = status;
    }
  }
  if (typeof b.captionDrafted === "boolean") {
    data.captionDrafted = b.captionDrafted;
  }
  if (typeof b.websiteCopyDrafted === "boolean") {
    data.websiteCopyDrafted = b.websiteCopyDrafted;
  }
  if (typeof b.contentPosted === "boolean") {
    data.contentPosted = b.contentPosted;
  }
  if (typeof b.reusableLater === "boolean") {
    data.reusableLater = b.reusableLater;
  }
  if (b.heroImageId !== undefined) {
    const hid = b.heroImageId?.trim() || null;
    if (hid) {
      data.heroImage = { connect: { id: hid } };
    } else {
      data.heroImage = { disconnect: true };
    }
  }
  if (b.gallery !== undefined) {
    data.gallery = toGalleryJson(b.gallery);
  }

  if (Object.keys(data).length === 0) {
    const row = await prisma.studioProject.findUnique({
      where: { id },
      include: STUDIO_PROJECT_INCLUDE,
    });
    if (!row) throw new Error("Project not found.");
    return row;
  }

  return prisma.studioProject.update({
    where: { id },
    data,
    include: STUDIO_PROJECT_INCLUDE,
  });
}

export async function publishStudioProjectRecord(body: unknown): Promise<StudioProjectWithHero> {
  if (body === null || typeof body !== "object") {
    throw new Error("Request body must be a JSON object.");
  }
  const b = body as { id?: string; slug?: string; published?: boolean };
  const idRaw = typeof b.id === "string" ? b.id.trim() : "";
  const slugRaw = typeof b.slug === "string" ? b.slug.trim() : "";

  let existing: StudioProjectWithHero | null = null;
  if (idRaw) {
    existing = await prisma.studioProject.findUnique({
      where: { id: idRaw },
      include: STUDIO_PROJECT_INCLUDE,
    });
  } else if (slugRaw) {
    existing = await getStudioProjectRecordBySlug(slugRaw);
  } else {
    throw new Error("id or slug is required.");
  }

  if (!existing) {
    throw new Error("Project not found.");
  }

  const wantPublish = b.published !== false;

  return prisma.studioProject.update({
    where: { id: existing.id },
    data: {
      published: wantPublish,
      publishedAt: wantPublish ? new Date() : null,
    },
    include: STUDIO_PROJECT_INCLUDE,
  });
}

export async function getStudioProjectRecordById(id: string): Promise<StudioProjectWithHero | null> {
  return prisma.studioProject.findUnique({
    where: { id },
    include: STUDIO_PROJECT_INCLUDE,
  });
}

export async function getStudioProjectRecordBySlug(
  slugParam: string
): Promise<StudioProjectWithHero | null> {
  const slug = normalizeProjectSlug(slugParam);
  return prisma.studioProject.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" } },
    include: STUDIO_PROJECT_INCLUDE,
  });
}

/** Public case study page — published Studio projects only. */
export async function getPublishedStudioProjectForPublicBySlug(
  slugParam: string
): Promise<StudioProjectWithHeroAndGallery | null> {
  const slug = normalizeProjectSlug(slugParam);
  const row = await prisma.studioProject.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" } },
    include: STUDIO_PROJECT_INCLUDE,
  });
  if (!row?.published) return null;
  return enrichStudioProjectWithGalleryMedia(row);
}

/** Metadata + OG — published only; no gallery enrichment. */
export async function getPublishedStudioProjectMetaBySlug(slugParam: string) {
  const slug = normalizeProjectSlug(slugParam);
  return prisma.studioProject.findFirst({
    where: { slug: { equals: slug, mode: "insensitive" }, published: true },
    select: {
      title: true,
      slug: true,
      seoTitle: true,
      seoDescription: true,
      opening: true,
      category: true,
      subcategory: true,
      location: true,
      year: true,
      heroImage: true,
    },
  });
}

/** Prev/next among published studio projects (order: publishedAt desc, title asc). */
export async function getAdjacentPublishedStudioProjects(currentSlug: string): Promise<{
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}> {
  const slug = normalizeProjectSlug(currentSlug);
  const rows = await prisma.studioProject.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
    select: { slug: true, title: true },
  });
  const idx = rows.findIndex((r) => normalizeProjectSlug(r.slug) === slug);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? rows[idx - 1]! : null,
    next: idx < rows.length - 1 ? rows[idx + 1]! : null,
  };
}

export async function deleteStudioProjectRecord(id: string): Promise<void> {
  const existing = await prisma.studioProject.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Project not found.");
  }
  await prisma.studioProject.delete({ where: { id } });
}
