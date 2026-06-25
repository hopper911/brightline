import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { BRAND } from "@/lib/config/brand";
import { formatBlogDate, getPublishedBlogPosts } from "@/lib/blog-posts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Journal · ${BRAND.name}`,
  description: "Notes, project stories, and production guidance from BRIGHTLINE Photography.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `Journal · ${BRAND.name}`,
    description: "Notes, project stories, and production guidance.",
    url: "/blog",
  },
};

export default async function BlogIndexPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal>
        <p className="section-kicker">Journal</p>
        <h1 className="section-title">BRIGHTLINE Journal</h1>
        <p className="section-subtitle max-w-2xl">
          Notes, project stories, and production guidance from the studio.
        </p>
      </Reveal>

      {posts.length === 0 ? (
        <Reveal className="mt-12" delay={0.06}>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-12 text-center">
            <p className="text-sm text-white/70">New posts are on the way.</p>
          </div>
        </Reveal>
      ) : (
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {posts.map((post, index) => (
            <Reveal key={post.id} delay={index * 0.06}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] lift-card"
              >
                {post.coverImageUrl ? (
                  <div className="relative aspect-[16/10] w-full image-guard-overlay">
                    <Image
                      src={post.coverImageUrl}
                      alt={post.coverImageAlt || post.title}
                      fill
                      draggable={false}
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover image-zoom"
                    />
                  </div>
                ) : null}
                <div className="p-6">
                  <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/50">
                    {formatBlogDate(post.publishedAt ?? post.updatedAt)}
                  </p>
                  <h2 className="mt-3 font-display text-2xl text-white group-hover:text-white/90">{post.title}</h2>
                  {post.excerpt ? (
                    <p className="mt-3 text-sm leading-relaxed text-white/75">{post.excerpt}</p>
                  ) : null}
                  {post.tags.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-white/50"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
