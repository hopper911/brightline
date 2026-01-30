import ClientGalleryView from "./view";

export const metadata = {
  title: "Client Gallery · Bright Line Photography",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ClientGalleryPage({
  params,
}: {
  params: { token: string };
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <ClientGalleryView token={params.token} />
    </div>
  );
}
