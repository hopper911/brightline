"use client";

import ClientGalleryView from "../access/[token]/view";

export default function ClientGalleryPage({
  params,
}: {
  params: { gallerySlug: string };
}) {
  return <ClientGalleryView token="" />;
}
