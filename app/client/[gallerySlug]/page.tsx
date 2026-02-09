import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getImageModeForUrl } from "@/lib/image-utils";
import { getPublicUrl } from "@/lib/storage";

export const metadata = {
  title: "Client Gallery · Bright Line Photography",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ClientGalleryPage({
  params,
}: {
  params: Promise<{ gallerySlug: string }>;
}) {
  const { gallerySlug } = await params;
  const jar = await cookies();
  const accessFlag = jar.get("client_access")?.value;
  const allowedSlug = jar.get("client_gallery")?.value;
  const accessId = jar.get("client_access_id")?.value;

  if (accessFlag !== "true" || !allowedSlug || allowedSlug !== gallerySlug) {
    redirect("/client");
  }

  if (!accessId) {
    redirect("/client");
  }

  const access = await prisma.galleryAccessToken.findUnique({
    where: { id: accessId },
    include: {
      gallery: {
        include: {
          images: { orderBy: { sortOrder: "asc" } },
          client: true,
          project: true,
        },
      },
    },
  });

  if (!access || !access.gallery || !access.isActive) {
    redirect("/client");
  }

  if (access.expiresAt && access.expiresAt.getTime() < Date.now()) {
    redirect("/client");
  }

  if (access.gallery.slug !== gallerySlug) {
    redirect(`/client/${access.gallery.slug}`);
  }

  const images = access.gallery.images.map((img) => ({
    id: img.id,
    url: img.storageKey ? getPublicUrl(img.storageKey) : img.url,
    alt: img.alt || access.gallery.title,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p className="section-kicker">Client Gallery</p>
      <h1 className="section-title">{access.gallery.title}</h1>
      {access.gallery.description ? (
        <p className="section-subtitle">{access.gallery.description}</p>
      ) : null}
      {(access.gallery.client?.name || access.gallery.project?.title) && (
        <p className="mt-2 text-sm text-mute">
          {access.gallery.client?.name || "Client"}
          {access.gallery.project?.title ? ` · ${access.gallery.project.title}` : ""}
        </p>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => (
          <div
            key={image.id}
            className="overflow-hidden rounded-2xl border border-black/10 bg-white/70"
          >
            <Image
              src={image.url}
              alt={image.alt}
              width={1200}
              height={900}
              data-image-mode={getImageModeForUrl(image.url)}
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="h-auto w-full object-cover aspect-[4/3]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
