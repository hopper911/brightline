import ClientAccessLanding from "@/components/ClientAccessLanding";
import PageBackground from "@/components/PageBackground";
import { getBackgroundMediaFromPage, getPublishedWebsitePageBySlug } from "@/lib/website-pages";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Client Access · BRIGHTLINE Photography",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ClientAccessPage() {
  const page = await getPublishedWebsitePageBySlug("galleries");
  const { media, poster } = getBackgroundMediaFromPage(page);

  return (
    <>
      <PageBackground media={media} poster={poster} />
      <ClientAccessLanding page={page} />
    </>
  );
}
