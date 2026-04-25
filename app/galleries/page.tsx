import Link from "next/link";
import Reveal from "@/components/Reveal";
import { BRAND } from "@/lib/config/brand";
import { getPublishedGalleryCards } from "@/lib/queries/public-galleries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Galleries · ${BRAND.name}`,
  description:
    "Selected BRIGHTLINE photography galleries and delivered image sets for architecture, advertising, and corporate projects.",
  alternates: { canonical: "/galleries" },
  openGraph: {
    title: `Galleries · ${BRAND.name}`,
    description:
      "Selected BRIGHTLINE photography galleries and delivered image sets.",
    url: "/galleries",
  },
};

function galleryMeta(type: string | null, count: number) {
  return [
    type ? type.replace(/_/g, " ").toLowerCase() : "gallery",
    count > 0 ? `${count} image${count === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function GalleriesPage() {
  const galleries = await getPublishedGalleryCards(24);

  return (
    <main className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-kicker">Galleries</p>
          <h1 className="section-title">Selected delivered image sets</h1>
          <p className="section-subtitle">
            Published galleries from client work, proofing rounds, and final delivery sets.
          </p>
        </div>
        <Link href="/work" className="btn btn-ghost">
          View work
        </Link>
      </Reveal>

      {galleries.length === 0 ? (
        <Reveal className="mt-12 rounded-2xl border border-white/10 bg-black/40 p-12 text-center">
          <p className="text-white/70">No public galleries are published yet.</p>
          <Link href="/work" className="btn btn-primary mt-6">
            Browse work
          </Link>
        </Reveal>
      ) : (
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {galleries.map((gallery, index) => (
            <Reveal key={gallery.id} delay={index * 0.05}>
              <Link
                href={`/galleries/${gallery.slug}`}
                className="group block h-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 lift-card"
              >
                <div className="relative h-64 overflow-hidden bg-black/60">
                  {gallery.coverUrl ? (
                    // Public gallery cards intentionally use the stored public cover/thumb URL.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gallery.coverUrl}
                      alt={gallery.title}
                      className="h-full w-full object-cover image-zoom"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-xs uppercase tracking-[0.24em] text-white/40">
                      {gallery.title}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-[0.62rem] uppercase tracking-[0.28em] text-white/45">
                    {galleryMeta(gallery.galleryType, gallery.imageCount)}
                  </p>
                  <h2 className="mt-2 font-display text-lg text-white group-hover:underline">
                    {gallery.title}
                  </h2>
                  {gallery.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/65">
                      {gallery.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </main>
  );
}
