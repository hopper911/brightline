/**
 * Reformat imported myportfolio journal posts to BRIGHTLINE Journal editorial style.
 *
 * Usage:
 *   npx tsx scripts/format-imported-journal.ts
 *   BRIGHTLINE_ENV=production npx tsx scripts/format-imported-journal.ts
 *
 * Optional:
 *   SLUG=food-photography npx tsx scripts/format-imported-journal.ts
 *   DRY_RUN=1 BRIGHTLINE_ENV=production npx tsx scripts/format-imported-journal.ts
 */
import "./load-cli-env";
import { generateBlogPostAssist } from "@/lib/ai/generateBlogPostAssist";
import { IMPORTED_JOURNAL_SLUGS, normalizeImportedBlogBody } from "@/lib/blog-imported";
import { getBlogPosts, saveBlogPosts, type BlogPost } from "@/lib/blog-posts";

const DRY_RUN = process.env.DRY_RUN === "1";
const ONLY_SLUG = process.env.SLUG?.trim();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function formatPost(post: BlogPost): Promise<BlogPost> {
  const normalizedBody = normalizeImportedBlogBody(post.body);
  const result = await generateBlogPostAssist("format", {
    title: post.title,
    excerpt: post.excerpt,
    body: normalizedBody || post.excerpt || post.title,
    tags: post.tags,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    galleryImageCount: post.galleryImages.length,
  });

  const excerpt = typeof result.excerpt === "string" ? result.excerpt : post.excerpt;
  const body = typeof result.body === "string" ? result.body : normalizedBody;
  const seoTitle = typeof result.seoTitle === "string" ? result.seoTitle : post.seoTitle;
  const seoDescription =
    typeof result.seoDescription === "string" ? result.seoDescription : post.seoDescription;
  const tags = Array.isArray(result.tags) ? (result.tags as string[]) : post.tags;
  const title = typeof result.title === "string" && result.title.trim() ? result.title : post.title;

  return {
    ...post,
    title,
    excerpt,
    body,
    tags,
    seoTitle,
    seoDescription,
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  const posts = await getBlogPosts();
  const targets = posts.filter((post) => {
    if (ONLY_SLUG) return post.slug === ONLY_SLUG;
    return IMPORTED_JOURNAL_SLUGS.includes(post.slug as (typeof IMPORTED_JOURNAL_SLUGS)[number]);
  });

  if (targets.length === 0) {
    console.log("No imported journal posts found to format.");
    return;
  }

  console.log(`Formatting ${targets.length} post(s)${DRY_RUN ? " (dry run)" : ""}…`);

  const updatedById = new Map<string, BlogPost>();
  for (const post of targets) {
    console.log(`→ ${post.slug}`);
    if (DRY_RUN) {
      console.log(`  body before: ${post.body.length} chars, gallery: ${post.galleryImages.length}`);
      continue;
    }

    try {
      const next = await formatPost(post);
      updatedById.set(post.id, next);
      console.log(`  done — body: ${next.body.length} chars, excerpt: ${next.excerpt.slice(0, 80)}…`);
    } catch (err) {
      console.error(`  failed:`, err instanceof Error ? err.message : err);
    }

    await sleep(1200);
  }

  if (DRY_RUN || updatedById.size === 0) return;

  const merged = posts.map((post) => updatedById.get(post.id) ?? post);
  await saveBlogPosts(merged);
  console.log(`Saved ${updatedById.size} formatted post(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
