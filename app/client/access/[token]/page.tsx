import ClientGalleryView from "./view";

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
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <ClientGalleryView token={token} />
    </div>
  );
}
