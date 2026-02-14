import { prisma } from "@/lib/prisma";
import { workItems } from "@/app/lib/work";

type PortfolioItem = {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  location: string;
  year: string;
  description: string;
  cover: string;
  coverAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  externalGalleryUrl?: string;
  gallery: string[];
  stats: { label: string; value: string }[];
};

export async function getPublishedPortfolio(
  options?: { includeDrafts?: boolean }
): Promise<PortfolioItem[]> {
  const includeDrafts = options?.includeDrafts ?? false;
  let projects;
  try {
    // Explicit select omits coverStorageKey / storageKey so build works even if those columns don't exist yet.
    projects = await prisma.portfolioProject.findMany({
      where: includeDrafts ? undefined : { published: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        categorySlug: true,
        location: true,
        year: true,
        description: true,
        coverUrl: true,
        coverAlt: true,
        seoTitle: true,
        seoDescription: true,
        ogImageUrl: true,
        externalGalleryUrl: true,
        updatedAt: true,
        images: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            projectId: true,
            url: true,
            sortOrder: true,
            alt: true,
          },
        },
      },
    });
  } catch {
    return workItems;
  }

  if (!projects.length) {
    return workItems;
  }

  const workBySlug = new Map(workItems.map((w) => [w.slug, w]));

  const normalized = projects.map((project) => {
    const description =
      project.description?.trim() ||
      `${project.title} case study for ${project.category} photography.`;
    const gallery = project.images.map((img) => img.url);
    const dbCover =
      project.coverUrl ||
      project.images[0]?.url ||
      "";
    const workItem = workBySlug.get(project.slug);
    const cover =
      workItem?.cover?.startsWith("http")
        ? workItem.cover
        : dbCover;
    return {
      slug: project.slug,
      title: project.title,
      category: project.category,
      categorySlug: project.categorySlug,
      location: project.location || "",
      year: project.year || "",
      description,
      cover,
      coverAlt: project.coverAlt || undefined,
      seoTitle: project.seoTitle || undefined,
      seoDescription: project.seoDescription || undefined,
      ogImageUrl: project.ogImageUrl || undefined,
      externalGalleryUrl: project.externalGalleryUrl || undefined,
      gallery,
      stats: [
        { label: "Deliverables", value: `${project.images.length} images` },
        { label: "Category", value: project.category },
        { label: "Location", value: project.location || "—" },
      ],
    };
  });

  return normalized.filter((item) => {
    const hasCover = Boolean(item.cover);
    const hasGallery = item.gallery.length > 0;
    const hasExternal = Boolean(item.externalGalleryUrl);
    return hasCover && (hasGallery || hasExternal);
  });
}

/** Commercial-first category order for display */
const CATEGORY_ORDER = [
  "commercial-real-estate",
  "hospitality",
  "fashion",
  "culinary",
];

export function sortByCommercialFirst<T extends { categorySlug: string; year?: string }>(
  items: T[]
): T[] {
  const orderMap = new Map(CATEGORY_ORDER.map((s, i) => [s, i]));
  return [...items].sort((a, b) => {
    const ia = orderMap.get(a.categorySlug) ?? 999;
    const ib = orderMap.get(b.categorySlug) ?? 999;
    if (ia !== ib) return ia - ib;
    return (b.year || "").localeCompare(a.year || "");
  });
}

export async function getPortfolioByCategory(
  categorySlug: string,
  options?: { includeDrafts?: boolean }
) {
  const items = await getPublishedPortfolio(options);
  return items.filter((item) => item.categorySlug === categorySlug);
}

export async function getPortfolioBySlug(
  slug: string,
  options?: { includeDrafts?: boolean }
) {
  const items = await getPublishedPortfolio(options);
  return items.find((item) => item.slug === slug);
}

export async function getPortfolioByCategoryAndSlug(
  categorySlug: string,
  slug: string,
  options?: { includeDrafts?: boolean }
) {
  const items = await getPublishedPortfolio(options);
  return items.find(
    (item) => item.categorySlug === categorySlug && item.slug === slug
  );
}
