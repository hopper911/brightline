import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import GalleryLightbox from "./GalleryLightbox";
import Reveal from "@/components/Reveal";
import PrimaryCTA from "@/components/PrimaryCTA";
import { getAdminSession } from "@/lib/admin-auth";
import { getPortfolioByCategoryAndSlug, getPortfolioBySlug } from "@/lib/portfolio";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

export async function generateMetadata({
  params,
}: {
  params: { category: string; slug: string };
}): Promise<Metadata> {
  const session = await getAdminSession();
  const includeDrafts = Boolean(session);
  const work =
    (await getPortfolioByCategoryAndSlug(params.category, params.slug, { includeDrafts })) ??
    (await getPortfolioBySlug(params.slug, { includeDrafts }));
  if (!work) {
    return {
      title: "Case Study · Bright Line Photography",
      description: "Commercial photography case study.",
    };
  }

  const title = work.seoTitle || `${work.title} · Bright Line Photography`;
  const description = work.seoDescription || work.description || `${work.category} photography case study.`;
  const canonicalUrl = `/portfolio/${params.category}/${params.slug}`;
  
  // Use custom OG image, cover image, or dynamic OG
  const ogImageUrl = work.ogImageUrl || work.cover || 
    `/api/og?title=${encodeURIComponent(work.title)}&subtitle=${encodeURIComponent(`${work.location} · ${work.year}`)}&category=${encodeURIComponent(work.category)}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: work.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PortfolioProjectPage({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const session = await getAdminSession();
  const includeDrafts = Boolean(session);
  const work =
    (await getPortfolioByCategoryAndSlug(params.category, params.slug, { includeDrafts })) ??
    (await getPortfolioBySlug(params.slug, { includeDrafts }));
  if (!work) {
    redirect("/portfolio");
  }

  const goalsByCategory: Record<string, string[]> = {
    hospitality: [
      "Elevate booking conversions with immersive room sets.",
      "Capture guest journey moments for web + social.",
      "Deliver a hero suite story with consistent light.",
    ],
    "commercial-real-estate": [
      "Showcase scale, light, and leasing potential.",
      "Provide investor-ready hero imagery.",
      "Create clean, architectural compositions.",
    ],
    fashion: [
      "Deliver editorial imagery with campaign polish.",
      "Build a cohesive lookbook narrative.",
      "Capture movement and texture for social.",
    ],
  };

  const deliverablesByCategory: Record<string, string[]> = {
    hospitality: [
      "Hero room suites",
      "Amenities + lifestyle moments",
      "F&B editorial set",
      "Social-ready crops",
    ],
    "commercial-real-estate": [
      "Exterior hero frames",
      "Interiors + amenity sets",
      "Detail vignettes",
      "Investor deck selects",
    ],
    fashion: [
      "Lookbook hero sets",
      "Campaign close-ups",
      "Studio + location sets",
      "Ecommerce crops",
    ],
  };

  const categoryKey = work.categorySlug;
  const goals = goalsByCategory[categoryKey] || [
    "Define a consistent visual system.",
    "Capture the brand story across key spaces.",
    "Deliver assets optimized for campaigns.",
  ];
  const deliverables = deliverablesByCategory[categoryKey] || [
    "Hero campaign selects",
    "Supporting detail frames",
    "Cutdowns for social + web",
  ];

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
        <div className="space-y-10">
          <Reveal className="relative h-[420px] w-full overflow-hidden rounded-[28px] border border-black/10 bg-white/80 shadow-[0_24px_60px_rgba(27,26,23,0.12)]">
            <Image
              src={work.cover}
              alt={work.coverAlt || work.title}
              fill
              sizes="(min-width: 1024px) 640px, 100vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA}
              className="object-cover image-fade"
            />
          </Reveal>
          <Reveal>
            <div className="space-y-3">
              <p className="section-kicker">Overview</p>
              <p className="text-base text-black/70">{work.description}</p>
            </div>
          </Reveal>
          <Reveal>
            <div className="space-y-3">
              <p className="section-kicker">Goals</p>
              <ul className="space-y-2 text-sm text-black/70">
                {goals.map((goal) => (
                  <li key={goal} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/60" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal>
            <div className="space-y-3">
              <p className="section-kicker">Deliverables</p>
              <ul className="space-y-2 text-sm text-black/70">
                {deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          {work.gallery.length > 0 && (
            <>
              <Reveal>
                <h2 className="font-display text-2xl text-black">Gallery</h2>
              </Reveal>
              <Reveal>
                <GalleryLightbox images={work.gallery} title={work.title} />
              </Reveal>
            </>
          )}
          {work.externalGalleryUrl && (
            <Reveal>
              <Link
                href={work.externalGalleryUrl}
                className="btn btn-ghost mt-2"
              >
                View full gallery
              </Link>
            </Reveal>
          )}
          <Reveal>
            <div className="rounded-[24px] border border-white/10 bg-black/60 px-6 py-8">
              <p className="section-kicker">Next step</p>
              <h2 className="font-display text-2xl text-white">
                Ready to build your visual story?
              </h2>
              <p className="mt-3 text-sm text-white/70">
                Share timeline, scope, and usage needs and we’ll craft a tailored proposal.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <PrimaryCTA service={work.categorySlug} className="btn btn-solid" location="case-study" />
                <Link
                  href={`/services/${work.categorySlug === "hospitality" ? "hospitality-photography" : work.categorySlug === "commercial-real-estate" ? "commercial-real-estate-photography" : "fashion-campaign-photography"}`}
                  className="btn btn-ghost text-white/80 hover:text-white"
                >
                  View services
                </Link>
              </div>
            </div>
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
