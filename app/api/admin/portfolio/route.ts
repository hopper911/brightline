import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { normalizeProjectSlug } from "@/lib/slugify";
import { createStudioProjectRecord } from "@/lib/studio/studio-project-cms";
import { getPublicR2Url } from "@/lib/r2";
import { lookupPlatformAssetIdsForBrightlineKeys } from "@/lib/platform/assets/integrations/portfolio-image-asset-link";
import { getWorkPillarList } from "@/lib/work-pillar-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const ROUTE = "api/admin/portfolio";
const DEFAULT_STUDIO_LOCATION = "New Jersey / New York";
const DEFAULT_STUDIO_CLIENT = "Client";

function parseYearFromPortfolio(input: unknown): number {
  const raw = typeof input === "string" ? input.trim() : input == null ? "" : String(input).trim();
  const n = parseInt(raw, 10);
  if (Number.isFinite(n) && n >= 1900 && n <= 2100) return n;
  return new Date().getFullYear();
}

function buildStudioPlaceholders(params: {
  title: string;
  category: string;
  location: string;
  year: number;
  description?: string | null;
}) {
  const desc = params.description?.trim();
  const opening = desc
    ? desc.length > 220
      ? `${desc.slice(0, 217).trim()}…`
      : desc
    : `${params.title} — ${params.category}.`;

  return {
    opening,
    context:
      desc ??
      `A studio project created from Portfolio. Refine copy, credits, and the gallery in Studio CMS.`,
    approach:
      "Light, composition, and production choices are refined in Studio CMS once selects and usage are finalized.",
    highlight: `${params.category} photography · ${params.location} · ${params.year}`,
    closing: "For licensing, usage, or project details, contact BRIGHTLINE Photography.",
  };
}

async function inferDefaultWorkPillar(categorySlug: string, categoryName: string): Promise<string | null> {
  const raw = `${categorySlug} ${categoryName}`.toLowerCase();
  const preferred = raw.includes("corporate")
    ? "corporate"
    : raw.includes("architecture") || raw.includes("real-estate") || raw.includes("real estate")
      ? "architecture"
      : "advertising";

  const pillars = await getWorkPillarList();
  return (
    pillars.find((p) => p.slug === preferred)?.slug ??
    pillars.find((p) => p.visible)?.slug ??
    pillars[0]?.slug ??
    null
  );
}

function noStoreJson(body: unknown, init?: { status?: number }) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  return res;
}

export async function GET(req: Request) {
  try {
    if (!(await authorizeAdminRequest(req))) {
      return noStoreJson({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const projects = await prisma.portfolioProject.findMany({
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categoryRef: true,
        StudioProject: {
          select: { id: true, slug: true, published: true, pillar: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return noStoreJson({ ok: true, projects });
  } catch (err: unknown) {
    console.error("PORTFOLIO_GET_ERROR", { route: ROUTE, err });
    const message = err instanceof Error ? err.message : "Failed to load projects.";
    return noStoreJson({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await authorizeAdminRequest(req))) {
      return noStoreJson({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: {
      title?: string;
      slug?: string;
      category?: string;
      categorySlug?: string;
      categoryId?: string;
      location?: string;
      year?: string;
      description?: string;
      coverUrl?: string;
      coverStorageKey?: string;
      coverAlt?: string;
      seoTitle?: string;
      seoDescription?: string;
      ogImageUrl?: string;
      externalGalleryUrl?: string;
      published?: boolean;
      images?: {
        url?: string;
        storageKey?: string;
        alt?: string;
        sortOrder?: number;
      }[];
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (!body.title || !body.slug || !body.category || !body.categorySlug) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const category =
      body.categoryId
        ? await prisma.portfolioCategory.findUnique({
            where: { id: body.categoryId },
          })
        : null;

    const coverUrl = body.coverStorageKey
      ? getPublicR2Url(body.coverStorageKey)
      : body.coverUrl;

    const project = await prisma.portfolioProject.create({
      data: {
        title: body.title,
        slug: normalizeProjectSlug(body.slug),
        category: category?.name || body.category,
        categorySlug: category?.slug || body.categorySlug,
        categoryId: category?.id || null,
        location: body.location || null,
        year: body.year || null,
        description: body.description || null,
        coverUrl: coverUrl || null,
        coverStorageKey: body.coverStorageKey || null,
        coverAlt: body.coverAlt || null,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        ogImageUrl: body.ogImageUrl || null,
        externalGalleryUrl: body.externalGalleryUrl || null,
        published: Boolean(body.published),
        images: body.images?.length
          ? {
              create: body.images.map((img, index) => {
                const imageUrl = img.storageKey
                  ? getPublicR2Url(img.storageKey)
                  : img.url || "";
                return {
                  url: imageUrl,
                  storageKey: img.storageKey || null,
                  alt: img.alt || null,
                  sortOrder:
                    typeof img.sortOrder === "number" ? img.sortOrder : index,
                };
              }),
            }
          : undefined,
      },
      include: { images: true },
    });

    const studioSlug = normalizeProjectSlug(project.slug);
    const studioExisting = await prisma.studioProject.findUnique({ where: { slug: studioSlug } });
    const defaultPillar = await inferDefaultWorkPillar(project.categorySlug, project.category);

    const studioProject =
      studioExisting ??
      (await createStudioProjectRecord({
        title: project.title,
        slug: studioSlug,
        client: DEFAULT_STUDIO_CLIENT,
        category: project.category,
        location: project.location?.trim() || DEFAULT_STUDIO_LOCATION,
        year: parseYearFromPortfolio(project.year),
        published: project.published,
        pillar: defaultPillar,
        ...buildStudioPlaceholders({
          title: project.title,
          category: project.category,
          location: project.location?.trim() || DEFAULT_STUDIO_LOCATION,
          year: parseYearFromPortfolio(project.year),
          description: project.description,
        }),
      }));

    if (!project.studioProjectId || project.studioProjectId !== studioProject.id) {
      await prisma.portfolioProject.update({
        where: { id: project.id },
        data: { studioProjectId: studioProject.id },
      });
      project.studioProjectId = studioProject.id;
    }

    if (studioExisting) {
      const desiredPublished = project.published;
      if (studioExisting.published !== desiredPublished || (desiredPublished && !studioExisting.pillar)) {
        await prisma.studioProject.update({
          where: { id: studioExisting.id },
          data: {
            published: desiredPublished,
            publishedAt: desiredPublished ? new Date() : null,
            ...(desiredPublished && !studioExisting.pillar ? { pillar: defaultPillar } : {}),
          },
        });
      }
    }

    return noStoreJson({
      ok: true,
      project,
      studioProject: { id: studioProject.id, slug: studioProject.slug, published: studioProject.published },
    });
  } catch (err: unknown) {
    console.error("PORTFOLIO_POST_ERROR", { route: ROUTE, err });
    const message = err instanceof Error ? err.message : "Failed to create project.";
    return noStoreJson({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await authorizeAdminRequest(req))) {
      return noStoreJson({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: {
      id?: string;
      title?: string;
      slug?: string;
      category?: string;
      categorySlug?: string;
      categoryId?: string | null;
      location?: string | null;
      year?: string | null;
      description?: string | null;
      coverUrl?: string | null;
      coverStorageKey?: string | null;
      coverAlt?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      ogImageUrl?: string | null;
      externalGalleryUrl?: string | null;
      published?: boolean;
      images?: {
        id: string;
        alt?: string | null;
        sortOrder?: number;
        storageKey?: string | null;
      }[];
      newImages?: {
        url?: string;
        storageKey?: string | null;
        alt?: string | null;
        sortOrder?: number;
      }[];
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (!body.id) {
      return NextResponse.json(
        { ok: false, error: "Missing project id." },
        { status: 400 }
      );
    }

    const category =
      body.categoryId
        ? await prisma.portfolioCategory.findUnique({
            where: { id: body.categoryId },
          })
        : null;

    const coverUrl = body.coverStorageKey
      ? getPublicR2Url(body.coverStorageKey)
      : body.coverUrl;

    const project = await prisma.portfolioProject.update({
      where: { id: body.id },
      data: {
        title: body.title ?? undefined,
        slug: body.slug != null ? normalizeProjectSlug(body.slug) : undefined,
        category: category?.name || body.category || undefined,
        categorySlug: category?.slug || body.categorySlug || undefined,
        categoryId:
          body.categoryId === null ? null : category?.id || undefined,
        location: body.location ?? undefined,
        year: body.year ?? undefined,
        description: body.description ?? undefined,
        coverUrl: coverUrl ?? undefined,
        coverStorageKey: body.coverStorageKey ?? undefined,
        coverAlt: body.coverAlt ?? undefined,
        seoTitle: body.seoTitle ?? undefined,
        seoDescription: body.seoDescription ?? undefined,
        ogImageUrl: body.ogImageUrl ?? undefined,
        externalGalleryUrl: body.externalGalleryUrl ?? undefined,
        published: typeof body.published === "boolean" ? body.published : undefined,
      },
      include: { images: true, categoryRef: true },
    });

    if (body.images?.length) {
      const updateKeys = body.images
        .map((img) => img.storageKey?.trim())
        .filter((k): k is string => Boolean(k));
      const assetIdsByKey = await lookupPlatformAssetIdsForBrightlineKeys(updateKeys);

      await Promise.all(
        body.images.map((img) => {
          const storageKey = img.storageKey?.trim() || undefined;
          const assetId = storageKey ? assetIdsByKey.get(storageKey) ?? undefined : undefined;
          return prisma.portfolioImage.update({
            where: { id: img.id },
            data: {
              alt: img.alt ?? undefined,
              sortOrder:
                typeof img.sortOrder === "number" ? img.sortOrder : undefined,
              storageKey,
              ...(assetId ? { assetId } : {}),
            },
          });
        })
      );
    }

    if (body.newImages?.length) {
      const newKeys = body.newImages
        .map((img) => img.storageKey?.trim())
        .filter((k): k is string => Boolean(k));
      const assetIdsByKey = await lookupPlatformAssetIdsForBrightlineKeys(newKeys);

      await prisma.portfolioImage.createMany({
        data: body.newImages.map((img, index) => {
          const storageKey = img.storageKey?.trim() || null;
          const imageUrl = storageKey
            ? getPublicR2Url(storageKey)
            : img.url || "";
          const assetId = storageKey ? assetIdsByKey.get(storageKey) ?? null : null;
          return {
            projectId: project.id,
            url: imageUrl,
            storageKey,
            assetId,
            alt: img.alt ?? null,
            sortOrder:
              typeof img.sortOrder === "number" ? img.sortOrder : index,
          };
        }),
      });
    }

    const desiredStudioSlug = normalizeProjectSlug(project.slug);
    const desiredLocation = project.location?.trim() || DEFAULT_STUDIO_LOCATION;
    const desiredYear = parseYearFromPortfolio(project.year);
    const defaultPillar = await inferDefaultWorkPillar(project.categorySlug, project.category);

    let studio =
      project.studioProjectId != null
        ? await prisma.studioProject.findUnique({ where: { id: project.studioProjectId } })
        : null;

    if (!studio) {
      studio = await prisma.studioProject.findUnique({ where: { slug: desiredStudioSlug } });
      if (studio) {
        await prisma.portfolioProject.update({
          where: { id: project.id },
          data: { studioProjectId: studio.id },
        });
        project.studioProjectId = studio.id;
      }
    }

    if (!studio) {
      studio = await createStudioProjectRecord({
        title: project.title,
        slug: desiredStudioSlug,
        client: DEFAULT_STUDIO_CLIENT,
        category: project.category,
        location: desiredLocation,
        year: desiredYear,
        published: project.published,
        pillar: defaultPillar,
        ...buildStudioPlaceholders({
          title: project.title,
          category: project.category,
          location: desiredLocation,
          year: desiredYear,
          description: project.description,
        }),
      });
      await prisma.portfolioProject.update({
        where: { id: project.id },
        data: { studioProjectId: studio.id },
      });
      project.studioProjectId = studio.id;
    }

    if (studio.slug !== desiredStudioSlug) {
      const clash = await prisma.studioProject.findUnique({ where: { slug: desiredStudioSlug } });
      if (clash && clash.id !== studio.id) {
        return noStoreJson(
          {
            ok: false,
            error: `StudioProject slug already exists: ${desiredStudioSlug}`,
          },
          { status: 409 }
        );
      }
    }

    const desiredPublished = project.published;
    await prisma.studioProject.update({
      where: { id: studio.id },
      data: {
        title: project.title,
        slug: desiredStudioSlug,
        category: project.category,
        location: desiredLocation,
        year: desiredYear,
        published: desiredPublished,
        publishedAt: desiredPublished ? new Date() : null,
        ...(desiredPublished && !studio.pillar ? { pillar: defaultPillar } : {}),
      },
    });

    return noStoreJson({
      ok: true,
      project,
      studioProject: { id: studio.id, slug: desiredStudioSlug, published: desiredPublished },
    });
  } catch (err: unknown) {
    console.error("PORTFOLIO_PATCH_ERROR", { route: ROUTE, err });
    const message = err instanceof Error ? err.message : "Failed to update project.";
    return noStoreJson({ ok: false, error: message }, { status: 500 });
  }
}
