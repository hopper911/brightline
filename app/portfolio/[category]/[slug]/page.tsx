import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import GalleryLightbox from "./GalleryLightbox";
import Reveal from "@/components/Reveal";
import { getPortfolioByCategoryAndSlug, getPortfolioBySlug } from "@/lib/portfolio";

export async function generateMetadata({
  params,
}: {
  params: { category: string; slug: string };
}): Promise<Metadata> {
  const cookieStore = await cookies();
  const includeDrafts = cookieStore.get("admin_access")?.value === "true";
  const work =
    (await getPortfolioByCategoryAndSlug(params.category, params.slug, { includeDrafts })) ??
    (await getPortfolioBySlug(params.slug, { includeDrafts }));
  if (!work) {
    return {
      title: "Case Study | Bright Line Photography",
      description: "Commercial photography case study.",
    };
  }

  return {
    title: work.seoTitle || `${work.title} | Bright Line Photography`,
    description: work.seoDescription || work.description,
    openGraph: work.ogImageUrl
      ? {
          images: [{ url: work.ogImageUrl }],
        }
      : undefined,
  };
}

export default async function PortfolioProjectPage({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const cookieStore = await cookies();
  const includeDrafts = cookieStore.get("admin_access")?.value === "true";
  const work =
    (await getPortfolioByCategoryAndSlug(params.category, params.slug, { includeDrafts })) ??
    (await getPortfolioBySlug(params.slug, { includeDrafts }));
  if (!work) {
    const slugLabel =
      typeof params.slug === "string"
        ? params.slug.replace(/-/g, " ")
        : "Project";
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Portfolio Project
        </p>
        <h1 className="font-display text-4xl text-black">
          {slugLabel}
        </h1>
        <p className="mt-4 text-sm text-black/60">
          This project is being updated. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-black/50">
            {work.category} Case Study
          </p>
          <h1 className="font-display text-4xl text-black">{work.title}</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-black/50">
            {work.location} · {work.year}
          </p>
        </div>
        <Link
          href={`/portfolio/${work.categorySlug}`}
          className="rounded-full border border-black/20 px-5 py-2 text-xs uppercase tracking-[0.32em] text-black/70"
        >
          Back to {work.category}
        </Link>
      </Reveal>

      <div className="mt-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Reveal className="relative h-[420px] w-full overflow-hidden rounded-[28px] border border-black/10 bg-white/80 shadow-[0_24px_60px_rgba(27,26,23,0.12)]">
            <Image
              src={work.cover}
              alt={work.coverAlt || work.title}
              fill
              className="object-cover image-fade"
            />
          </Reveal>
          <Reveal>
            <p className="text-base text-black/70">{work.description}</p>
          </Reveal>
          <Reveal>
            <h2 className="font-display text-2xl text-black">Gallery</h2>
          </Reveal>
          <Reveal>
            <GalleryLightbox images={work.gallery} title={work.title} />
          </Reveal>
        </div>
        <Reveal>
          <aside className="rounded-[24px] border border-black/10 bg-white/80 p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-black/50">
            Project stats
          </p>
          <ul className="mt-4 space-y-4">
            {work.stats.map((stat) => (
              <li key={stat.label}>
                <p className="text-xs uppercase tracking-[0.3em] text-black/50">
                  {stat.label}
                </p>
                <p className="text-lg text-black">{stat.value}</p>
              </li>
            ))}
          </ul>
          </aside>
        </Reveal>
      </div>
    </div>
  );
}
