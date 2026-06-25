import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import { BRAND, getUrl } from "@/lib/config/brand";
import { formatBlogDate, getPublishedBlogPostBySlug, getPublishedBlogPosts } from "@/lib/blog-posts";

export const dynamic = "force-dynamic";

function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) {
    return { title: `Journal · ${BRAND.name}` };
  }

  const title = post.seoTitle || `${post.title} · ${BRAND.name}`;
  const description = post.seoDescription || post.excerpt || post.title;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      url: `/blog/${post.slug}`,
      ...(post.coverImageUrl ? { images: [{ url: post.coverImageUrl, alt: post.coverImageAlt || post.title }] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  const allPosts = await getPublishedBlogPosts();
  const index = allPosts.findIndex((item) => item.id === post.id);
  const previous = index > 0 ? allPosts[index - 1] : null;
  const next = index >= 0 && index < allPosts.length - 1 ? allPosts[index + 1] : null;

  return (
    <article className="section-pad mx-auto max-w-3xl px-6 lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt || post.seoDescription,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            author: { "@type": "Organization", name: post.author || BRAND.name },
            publisher: { "@type": "Organization", name: BRAND.name, url: getUrl() },
            ...(post.coverImageUrl ? { image: [post.coverImageUrl] } : {}),
            mainEntityOfPage: getUrl(`/blog/${post.slug}`),
          }),
        }}
      />

      <Reveal>
        <Link href="/blog" className="text-xs uppercase tracking-[0.28em] text-white/55 hover:text-white">
          ← Back to journal
        </Link>
        <p className="mt-6 text-[0.65rem] uppercase tracking-[0.28em] text-white/50">
          {formatBlogDate(post.publishedAt ?? post.updatedAt)}
          {post.author ? ` · ${post.author}` : ""}
        </p>
        <h1 className="mt-4 font-display text-4xl leading-tight text-white md:text-5xl">{post.title}</h1>
        {post.excerpt ? <p className="mt-5 text-lg leading-relaxed text-white/78">{post.excerpt}</p> : null}
      </Reveal>

      {post.coverImageUrl ? (
        <Reveal className="mt-10" delay={0.05}>
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 image-guard-overlay">
            <Image
              src={post.coverImageUrl}
              alt={post.coverImageAlt || post.title}
              fill
              priority
              draggable={false}
              sizes="(min-width: 1024px) 768px, 100vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      ) : null}

      <Reveal className="mt-10 space-y-5" delay={0.08}>
        {paragraphs(post.body).map((block) => (
          <p key={block.slice(0, 40)} className="text-base leading-relaxed text-white/82">
            {block}
          </p>
        ))}
      </Reveal>

      {post.tags.length ? (
        <Reveal className="mt-10 flex flex-wrap gap-2" delay={0.1}>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 px-3 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-white/50"
            >
              {tag}
            </span>
          ))}
        </Reveal>
      ) : null}

      {(previous || next) && (
        <Reveal className="mt-16 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-2" delay={0.12}>
          {previous ? (
            <Link href={`/blog/${previous.slug}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.06]">
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/45">Previous</p>
              <p className="mt-2 text-sm text-white/85">{previous.title}</p>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link href={`/blog/${next.slug}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-right hover:bg-white/[0.06]">
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/45">Next</p>
              <p className="mt-2 text-sm text-white/85">{next.title}</p>
            </Link>
          ) : null}
        </Reveal>
      )}
    </article>
  );
}
