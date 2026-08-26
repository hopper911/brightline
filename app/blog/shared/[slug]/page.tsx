import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AssignedPageBackground from "@/components/AssignedPageBackground";
import SharedJournalArticleView, {
  resolveSharedMediaSrc,
} from "@/components/blog/SharedJournalArticleView";
import { BRAND } from "@/lib/config/brand";
import { fetchDualBrandJournalBySlug } from "@/lib/dual-brand/content-api";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchDualBrandJournalBySlug(slug);
  if (!post) return { title: "Journal" };
  return {
    title: `${post.seoTitle || post.title} · ${BRAND.name}`,
    description: post.seoDescription || post.excerpt,
    alternates: { canonical: `/blog/shared/${post.slug}` },
  };
}

export default async function SharedBlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await fetchDualBrandJournalBySlug(slug);
  if (!post) notFound();

  const bg =
    resolveSharedMediaSrc(post.backgroundMedia) ||
    resolveSharedMediaSrc(post.heroImage) ||
    null;

  return (
    <>
      <AssignedPageBackground
        pageKey="blog"
        fallbackMedia={bg}
        fallbackPoster={resolveSharedMediaSrc(post.backgroundPoster) || null}
      />
      <SharedJournalArticleView
        post={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          body: post.body,
          heroImage: post.heroImage,
          author: post.author,
          publishedAt: post.publishedAt,
          categories: post.categories,
          articlePayload: post.articlePayload ?? null,
        }}
      />
    </>
  );
}
