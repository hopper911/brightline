import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type BlogPostStatus = "DRAFT" | "PUBLISHED";

export type BlogGalleryImage = {
  url: string;
  alt: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  coverImageAlt: string;
  galleryImages: BlogGalleryImage[];
  author: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const BLOG_POSTS_SETTING_KEY = "blog_posts:v1";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function newId() {
  return `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === "string") {
      return value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12);
    }
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
}

function cleanGalleryImages(value: unknown): BlogGalleryImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const url = cleanString(row.url);
      if (!url) return null;
      return {
        url,
        alt: cleanString(row.alt),
      };
    })
    .filter((item): item is BlogGalleryImage => Boolean(item))
    .slice(0, 120);
}

export function blankBlogPost(title = "Untitled post"): BlogPost {
  const now = new Date().toISOString();
  const slug = slugify(title) || "untitled-post";
  return {
    id: newId(),
    slug,
    title,
    excerpt: "",
    body: "",
    coverImageUrl: "",
    coverImageAlt: "",
    galleryImages: [],
    author: "BRIGHTLINE",
    tags: [],
    seoTitle: "",
    seoDescription: "",
    status: "DRAFT",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeBlogPost(input: unknown): BlogPost | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const title = cleanString(row.title) || "Untitled post";
  const slug = slugify(cleanString(row.slug) || title);
  if (!slug) return null;

  const status = row.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const createdAt =
    typeof row.createdAt === "string" && row.createdAt.trim()
      ? row.createdAt.trim()
      : new Date().toISOString();
  const publishedAt =
    typeof row.publishedAt === "string" && row.publishedAt.trim() ? row.publishedAt.trim() : null;

  return {
    id: cleanString(row.id) || newId(),
    slug,
    title,
    excerpt: cleanString(row.excerpt),
    body: cleanString(row.body),
    coverImageUrl: cleanString(row.coverImageUrl),
    coverImageAlt: cleanString(row.coverImageAlt),
    galleryImages: cleanGalleryImages(row.galleryImages),
    author: cleanString(row.author) || "BRIGHTLINE",
    tags: cleanTags(row.tags),
    seoTitle: cleanString(row.seoTitle),
    seoDescription: cleanString(row.seoDescription),
    status,
    publishedAt: status === "PUBLISHED" ? publishedAt ?? createdAt : publishedAt,
    createdAt,
    updatedAt:
      typeof row.updatedAt === "string" && row.updatedAt.trim() ? row.updatedAt.trim() : createdAt,
  };
}

function normalizePosts(input: unknown): BlogPost[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input
    .map(normalizeBlogPost)
    .filter((post): post is BlogPost => {
      if (!post || seen.has(post.slug)) return false;
      seen.add(post.slug);
      return true;
    })
    .sort((a, b) => {
      const aTime = Date.parse(a.publishedAt ?? a.updatedAt);
      const bTime = Date.parse(b.publishedAt ?? b.updatedAt);
      return bTime - aTime;
    });
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: BLOG_POSTS_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value) return [];
    return normalizePosts(JSON.parse(setting.value));
  } catch {
    return [];
  }
}

export const getPublishedBlogPosts = cache(async () => {
  const posts = await getBlogPosts();
  return posts.filter((post) => post.status === "PUBLISHED");
});

export const getPublishedBlogPostBySlug = cache(async (slug: string) => {
  const normalized = slugify(slug);
  const posts = await getPublishedBlogPosts();
  return posts.find((post) => post.slug === normalized) ?? null;
});

export async function saveBlogPosts(input: unknown): Promise<BlogPost[]> {
  const posts = normalizePosts(input);
  await prisma.siteSetting.upsert({
    where: { key: BLOG_POSTS_SETTING_KEY },
    update: { value: JSON.stringify(posts) },
    create: { key: BLOG_POSTS_SETTING_KEY, value: JSON.stringify(posts) },
  });
  return posts;
}

export function formatBlogDate(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
