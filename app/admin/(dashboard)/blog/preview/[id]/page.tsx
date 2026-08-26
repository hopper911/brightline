import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BlogArticleSections from "@/components/blog/BlogArticleSections";
import { hasAdminAccess } from "@/lib/admin-auth";
import { blankTravel, formatBlogDate, getBlogPostById } from "@/lib/blog-posts";
import { cleanStoryChapters } from "@/lib/story-chapters";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Post preview · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminBlogPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const { id } = await params;
  const post = await getBlogPostById(id);
  if (!post) notFound();

  const travel = post.travel ?? blankTravel();
  const useStories = cleanStoryChapters(post.storyChapters).length > 0;
  const liveHref =
    post.status === "PUBLISHED"
      ? post.format === "travel"
        ? `/travel/${post.slug}`
        : `/blog/${post.slug}`
      : null;

  const metaBits =
    post.format === "travel"
      ? [
          travel.destination,
          travel.region,
          travel.datesLabel || formatBlogDate(post.publishedAt ?? post.updatedAt),
        ].filter(Boolean)
      : [formatBlogDate(post.publishedAt ?? post.updatedAt), post.author].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-5 py-4">
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-amber-100/80">
          Admin preview · {post.status} · {post.format === "travel" ? "Travel" : "Journal"}
        </p>
        <p className="mt-2 text-sm text-white/75">
          This layout mirrors the public post. Drafts are only visible here until you publish.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/admin/blog" className="btn btn-ghost text-xs">
            ← Back to editor
          </Link>
          {liveHref ? (
            <Link href={liveHref} className="btn btn-ghost text-xs">
              Open live
            </Link>
          ) : null}
        </div>
      </div>

      <article className="space-y-2">
        <header>
          <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/50">
            {metaBits.join(" · ")}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-white md:text-5xl">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="mt-5 text-lg leading-relaxed text-white/78">{post.excerpt}</p>
          ) : null}
          {!useStories && post.pullQuote ? (
            <blockquote className="mt-8 border-l border-white/25 pl-5 font-display text-xl leading-snug text-white/88">
              {post.pullQuote}
            </blockquote>
          ) : null}
        </header>

        <BlogArticleSections post={post} reveal={false} />
      </article>
    </div>
  );
}
