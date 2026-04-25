import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import { BRAND } from "@/lib/config/brand";
import { getPublishedGalleryDetail } from "@/lib/queries/public-galleries";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const gallery = await getPublishedGalleryDetail(slug);
  if (!gallery) return {};

  const description =
    gallery.description ||
    `Published BRIGHTLINE gallery with ${gallery.imageCount} selected images.`;

  return {
    title: `${gallery.title} · Galleries · ${BRAND.name}`,
    description,
    alternates: { canonical: `/galleries/${gallery.slug}` },
    openGraph: {
      title: `${gallery.title} · ${BRAND.name}`,
      description,
      url: `/galleries/${gallery.slug}`,
      images: gallery.coverUrl ? [{ url: gallery.coverUrl }] : undefined,
    },
  };
}

function galleryMeta(type: string | null, count: number) {
  return [
    type ? type.replace(/_/g, " ").toLowerCase() : "gallery",
    `${count} image${count === 1 ? "" : "s"}`,
  ].join(" · ");
}

export default async function GalleryDetailPage({ params }: Props) {
  const { slug } = await params;
  const gallery = await getPublishedGalleryDetail(slug);
  if (!gallery) notFound();

  return (
    <main className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal className="max-w-3xl">
        <Link href="/galleries" className="text-xs uppercase tracking-[0.28em] text-white/50 hover:text-white">
          Galleries
        </Link>
        <p className="section-kicker mt-8">
          {galleryMeta(gallery.galleryType, gallery.imageCount)}
        </p>
        <h1 className="section-title">{gallery.title}</h1>
        {gallery.description ? (
          <p className="section-subtitle">{gallery.description}</p>
        ) : null}
      </Reveal>

      {gallery.images.length === 0 ? (
        <Reveal className="mt-12 rounded-2xl border border-white/10 bg-black/40 p-12 text-center">
          <p className="text-white/70">This gallery does not have public images yet.</p>
        </Reveal>
      ) : (
        <div className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {gallery.images.map((image, index) => (
            <Reveal key={image.id} delay={index * 0.03} className="mb-5 break-inside-avoid">
              <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                {/* Public showcase uses the gallery image's stored public URL only. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.alt}
                  className="h-auto w-full"
                  loading="lazy"
                />
                {image.filename ? (
                  <figcaption className="px-4 py-3 text-[0.62rem] uppercase tracking-[0.22em] text-white/40">
                    {image.filename}
                  </figcaption>
                ) : null}
              </figure>
            </Reveal>
          ))}
        </div>
      )}
    </main>
  );
}
