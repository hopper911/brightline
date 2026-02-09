import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/lib/storage";
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
  const projects = await prisma.portfolioProject.findMany({
    where: includeDrafts ? undefined : { published: true },
    include: { images: { orderBy: { sortOrder: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  if (!projects.length) {
    return workItems;
  }

  const normalized = projects.map((project) => {
    const description =
      project.description?.trim() ||
      `${project.title} case study for ${project.category} photography.`;
    const gallery = project.images.map((img) =>
      img.storageKey ? getPublicUrl(img.storageKey) : img.url
    );
    return {
      slug: project.slug,
      title: project.title,
      category: project.category,
      categorySlug: project.categorySlug,
      location: project.location || "",
      year: project.year || "",
      description,
      cover:
        (project.coverStorageKey
          ? getPublicUrl(project.coverStorageKey)
          : project.coverUrl) ||
        (project.images[0]?.storageKey
          ? getPublicUrl(project.images[0].storageKey)
          : project.images[0]?.url) ||
        "",
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
