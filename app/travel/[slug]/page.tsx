import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AssignedPageBackground from "@/components/AssignedPageBackground";
import Reveal from "@/components/Reveal";
import BlogArticleSections from "@/components/blog/BlogArticleSections";
import BlogPostFooter from "@/components/blog/BlogPostFooter";
import { BRAND, getUrl } from "@/lib/config/brand";
import { safeJsonLdScript } from "@/lib/safe-json-ld";
import {
  blankTravel,
  formatBlogDate,
  getPublishedBlogPostBySlug,
  getPublishedTravelPosts,
} from "@/lib/blog-posts";
import { pageKeyTravelPost } from "@/lib/page-backgrounds";
import { cleanStoryChapters } from "@/lib/story-chapters";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post || post.format !== "travel") {
    return { title: `Travel · ${BRAND.name}` };
  }

  const title = post.seoTitle || `${post.title} · ${BRAND.name}`;
  const description = post.seoDescription || post.excerpt || post.title;

  return {
    title,
    description,
    alternates: { canonical: `/travel/${post.slug}` },
    openGraph: {
      title,
      description,
      url: `/travel/${post.slug}`,
      ...(post.coverImageUrl
        ? { images: [{ url: post.coverImageUrl, alt: post.coverImageAlt || post.title }] }
        : {}),
    },
  };
}

export default async function TravelPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();
  if (post.format !== "travel") {
    redirect(`/blog/${post.slug}`);
  }

  const allPosts = await getPublishedTravelPosts();
  const index = allPosts.findIndex((item) => item.id === post.id);
  const previous = index > 0 ? allPosts[index - 1] : null;
  const next = index >= 0 && index < allPosts.length - 1 ? allPosts[index + 1] : null;
  const travel = post.travel ?? blankTravel();
  const useStories = cleanStoryChapters(post.storyChapters).length > 0;

  const metaBits = [
    travel.destination,
    travel.region,
    travel.datesLabel || formatBlogDate(post.publishedAt ?? post.updatedAt),
    travel.tripStyle,
  ].filter(Boolean);

  const tripFacts = [
    travel.season,
    travel.tripStyle,
    travel.travelers ? `With ${travel.travelers}` : "",
    travel.routeSummary,
  ].filter(Boolean);

  return (
    <>
      <AssignedPageBackground
        pageKey={pageKeyTravelPost(post.slug)}
        fallbackMedia={post.coverImageUrl}
      />
      <article className="section-pad relative z-[2] mx-auto max-w-3xl px-6 lg:px-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLdScript({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: post.excerpt || post.seoDescription,
              datePublished: post.publishedAt,
              dateModified: post.updatedAt,
              author: { "@type": "Organization", name: post.author || BRAND.name },
              publisher: { "@type": "Organization", name: BRAND.name, url: getUrl() },
              ...(post.coverImageUrl ? { image: [post.coverImageUrl] } : {}),
              ...(travel.destination ? { contentLocation: travel.destination } : {}),
              mainEntityOfPage: getUrl(`/travel/${post.slug}`),
            }),
          }}
        />

        <Reveal>
          <Link
            href="/travel"
            className="text-xs uppercase tracking-[0.28em] text-white/55 hover:text-white"
          >
            ← Back to travel
          </Link>
          <p className="mt-6 text-[0.65rem] uppercase tracking-[0.28em] text-white/50">
            {metaBits.join(" · ")}
            {post.author ? ` · ${post.author}` : ""}
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight text-white md:text-5xl">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="mt-5 text-lg leading-relaxed text-white/78">{post.excerpt}</p>
          ) : null}
          {tripFacts.length > 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-white/55">{tripFacts.join(" · ")}</p>
          ) : travel.travelers ? (
            <p className="mt-3 text-sm text-white/55">With {travel.travelers}</p>
          ) : null}
          {post.pullQuote && !useStories ? (
            <blockquote className="mt-8 border-l border-white/25 pl-5 font-display text-xl leading-snug text-white/88">
              {post.pullQuote}
            </blockquote>
          ) : null}
        </Reveal>

        <BlogArticleSections post={post} />

        <BlogPostFooter tags={post.tags} previous={previous} next={next} />
      </article>
    </>
  );
}
