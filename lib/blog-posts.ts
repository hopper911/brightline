import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  normalizePosts,
  type BlogPost,
} from "@/lib/blog-post-model";

export type {
  BlogPostStatus,
  BlogGalleryImage,
  BlogBeforeAfterPlacement,
  BlogBeforeAfter,
  BlogCaseStudySections,
  BlogPostVideo,
  BlogPostVideoProvider,
  BlogSectionId,
  BlogSocialImages,
  BlogCanvaDesigns,
  BlogShareCaptions,
  BlogMediaKitAsset,
  BlogPostFormat,
  BlogTravelItineraryDay,
  BlogTravelMapStop,
  BlogTravelSections,
  BlogGoogleReview,
  BlogPost,
} from "@/lib/blog-post-model";

export {
  blankBeforeAfter,
  cleanBeforeAfter,
  hasBeforeAfter,
  blankCaseStudy,
  cleanCaseStudy,
  blankSocialImages,
  blankCanvaDesigns,
  blankShareCaptions,
  cleanSocialImages,
  cleanCanvaDesigns,
  cleanShareCaptions,
  cleanMediaKitAssets,
  blankTravel,
  cleanTravel,
  cleanTravelMapStops,
  blankGoogleReview,
  cleanGoogleReview,
  hasGoogleReview,
  hasTravelMap,
  cleanBlogPostFormat,
  isTravelPost,
  extractYouTubeId,
  extractInstagramPermalink,
  getCaseStudyVideoProvider,
  hasCaseStudyBrief,
  hasCaseStudyProblem,
  hasCaseStudySolution,
  hasCaseStudyVideo,
  hasCaseStudyAiVideo,
  blankBlogPostVideo,
  cleanBlogPostVideos,
  migrateLegacyCaseStudyVideos,
  isRenderableBlogVideo,
  hasBlogVideos,
  youtubeWatchUrl,
  detectBlogVideoProviderFromUrl,
  defaultSectionOrder,
  cleanSectionOrder,
  resolveSectionOrder,
  JOURNAL_SECTION_ORDER,
  TRAVEL_SECTION_ORDER,
  BLOG_SECTION_LABELS,
  blankBlogPost,
  blankTravelPost,
  normalizeBlogPost,
  normalizePosts,
  formatBlogDate,
  slugifyBlog,
} from "@/lib/blog-post-model";

const BLOG_POSTS_SETTING_KEY = "blog_posts:v1";

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

function isJournalFormat(post: BlogPost) {
  return post.format !== "travel";
}

function isTravelFormat(post: BlogPost) {
  return post.format === "travel";
}

/** Published journal posts for /blog (excludes travel format). */
export const getPublishedBlogPosts = cache(async () => {
  const posts = await getBlogPosts();
  return posts.filter(
    (post) =>
      post.status === "PUBLISHED" &&
      post.showInJournal !== false &&
      isJournalFormat(post)
  );
});

/** Published travel posts for /travel. */
export const getPublishedTravelPosts = cache(async () => {
  const posts = await getBlogPosts();
  return posts.filter(
    (post) =>
      post.status === "PUBLISHED" &&
      post.showInTravel !== false &&
      isTravelFormat(post)
  );
});

export const getHomepageJournalPosts = cache(async (limit = 3) => {
  const posts = await getBlogPosts();
  return posts
    .filter(
      (post) =>
        post.status === "PUBLISHED" && post.featureOnHome && isJournalFormat(post)
    )
    .slice(0, Math.max(1, limit));
});

export const getCaseStudyJournalPosts = cache(async () => {
  const posts = await getBlogPosts();
  return posts.filter(
    (post) =>
      post.status === "PUBLISHED" &&
      post.featureInCaseStudies &&
      isJournalFormat(post)
  );
});

/** Any published post by slug (journal or travel) — for redirects / lookup. */
export const getPublishedBlogPostBySlug = cache(async (slug: string) => {
  const { slugifyBlog } = await import("@/lib/blog-post-model");
  const normalized = slugifyBlog(slug);
  const posts = await getBlogPosts();
  return posts.find((post) => post.status === "PUBLISHED" && post.slug === normalized) ?? null;
});

export const getPublishedTravelPostBySlug = cache(async (slug: string) => {
  const { slugifyBlog } = await import("@/lib/blog-post-model");
  const normalized = slugifyBlog(slug);
  const posts = await getPublishedTravelPosts();
  return posts.find((post) => post.slug === normalized) ?? null;
});

/** Any post by id (draft or published) — admin preview. */
export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const posts = await getBlogPosts();
  return posts.find((post) => post.id === id) ?? null;
}

export async function saveBlogPosts(input: unknown): Promise<BlogPost[]> {
  const posts = normalizePosts(input);
  await prisma.siteSetting.upsert({
    where: { key: BLOG_POSTS_SETTING_KEY },
    update: { value: JSON.stringify(posts) },
    create: { key: BLOG_POSTS_SETTING_KEY, value: JSON.stringify(posts) },
  });
  return posts;
}
