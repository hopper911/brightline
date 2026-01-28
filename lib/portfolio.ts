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

  return projects.map((project) => ({
    slug: project.slug,
    title: project.title,
    category: project.category,
    categorySlug: project.categorySlug,
    location: project.location || "",
    year: project.year || "",
    description: project.description || "",
    cover: project.coverUrl || project.images[0]?.url || "",
    coverAlt: project.coverAlt || undefined,
    seoTitle: project.seoTitle || undefined,
    seoDescription: project.seoDescription || undefined,
    ogImageUrl: project.ogImageUrl || undefined,
    gallery: project.images.map((img) => img.url),
    stats: [
      { label: "Deliverables", value: `${project.images.length} images` },
      { label: "Category", value: project.category },
      { label: "Location", value: project.location || "—" },
    ],
  }));
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
