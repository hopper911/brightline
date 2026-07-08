/**
 * Publish imported journal posts and enable Journal nav.
 *   npx tsx scripts/launch-journal.ts
 */
import "./load-cli-env";
import { getBlogPosts, saveBlogPosts } from "@/lib/blog-posts";
import { getSiteNav, saveSiteNav } from "@/lib/site-nav";

const IMPORTED_SLUGS = new Set([
  "waldo-ux-ui-case-study",
  "eshave-ux-ui-case-study",
  "about-kiril-mironyuk",
  "photo-retouching",
  "graphic-design",
  "food-photography",
  "photography",
  "erny",
]);

async function main() {
  const posts = await getBlogPosts();
  const updatedPosts = posts.map((post) =>
    IMPORTED_SLUGS.has(post.slug)
      ? {
          ...post,
          status: "PUBLISHED" as const,
          publishedAt: post.publishedAt ?? new Date().toISOString(),
        }
      : post
  );
  await saveBlogPosts(updatedPosts);

  const nav = await getSiteNav();
  await saveSiteNav(
    nav.map((item) => (item.id === "blog" ? { ...item, visible: true, label: "Journal" } : item))
  );

  const published = updatedPosts.filter((post) => IMPORTED_SLUGS.has(post.slug));
  console.log(`Published ${published.length} journal posts.`);
  console.log('Enabled "Journal" in site navigation.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
