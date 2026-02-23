import ClientGalleryView from "./ClientGalleryView";

export const metadata = {
  title: "Client Gallery · Bright Line Photography",
  robots: { index: false, follow: false },
};

export default async function ClientGalleryPage({
  params,
}: {
  params: Promise<{ gallerySlug: string }>;
}) {
  const { gallerySlug } = await params;
  return (
    <div className="section-pad mx-auto max-w-6xl px-6 py-16 lg:px-10">
      <ClientGalleryView gallerySlug={gallerySlug} />
    </div>
  );
}
